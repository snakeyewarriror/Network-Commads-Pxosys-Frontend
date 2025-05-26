import React, { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import api from '../../api';
import '../../css/BrowseCommands.css'; // Assuming this has relevant styling
import '../../css/Modal.css'; // Ensure modal styles are available

// Import the new modal components
import AddVendorModal from '../modals/AddVendorModal';
import AddCategoryModal from '../modals/AddCategoryModal';

// Interfaces for dropdown data (already defined, but good to ensure they're here)
interface DropdownItem {
  id: number;
  name: string;
}

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

interface CommandUploadFormProps {
  onUploadSuccess: (message: string) => void;
}

const CommandCSVUploadForm: React.FC<CommandUploadFormProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  // Change from string to number | null for ID
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for dropdown data
  const [allVendors, setAllVendors] = useState<DropdownItem[]>([]);
  const [filteredCategoriesTree, setFilteredCategoriesTree] = useState<CategoryTreeItem[]>([]);

  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(true); // For initial load of vendors/categories

  // States for modal visibility
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  // Helper to extract category name for display from a tree
  const getCategoryNameById = useCallback((id: number | null, tree: CategoryTreeItem[]): string => {
    if (id === null) return '';
    for (const item of tree) {
      if (item.id === id) return item.name;
      if (item.children) {
        const found = getCategoryNameById(id, item.children);
        if (found) return found;
      }
    }
    return '';
  }, []);

  // --- Data Fetching Functions ---

  const fetchAllVendors = useCallback(async () => {
    try {
      const response = await api.get<DropdownItem[]>('/vendors/get-all/');
      setAllVendors(response.data);
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors. Please try again.');
      setAllVendors([]);
    }
  }, []);

  const fetchCategories = useCallback(async (vendorId: number | '') => {
    setLoadingDropdowns(true); // Indicate categories are loading
    try {
      const categoryUrl = vendorId ? `/categories/get-all-tree/?vendor_id=${vendorId}` : '/categories/get-all-tree/';
      const categoriesRes = await api.get<CategoryTreeItem[]>(categoryUrl);
      setFilteredCategoriesTree(categoriesRes.data);

      // Reset selected main category if the new vendor caused it to become invalid
      const isCategoryIdInTree = (id: number | null, tree: CategoryTreeItem[]): boolean => {
        if (id === null) return true; // Null is always valid (no selection)
        for (const item of tree) {
          if (item.id === id) return true;
          if (item.children && isCategoryIdInTree(id, item.children)) return true;
        }
        return false;
      };

      if (selectedMainCategoryId !== null && !isCategoryIdInTree(selectedMainCategoryId, categoriesRes.data)) {
        setSelectedMainCategoryId(null);
      }

    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again.');
      setFilteredCategoriesTree([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [selectedMainCategoryId]); // Dependency on selectedMainCategoryId for reset logic


  // --- Initial Data Load on Mount ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDropdowns(true);
      await fetchAllVendors();
      await fetchCategories(''); // Fetch all categories initially (no vendor filter)
      setLoadingDropdowns(false);
    };
    loadInitialData();
  }, [fetchAllVendors, fetchCategories]);


  // --- Handlers for Form Inputs ---

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleVendorChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const newVendorId = value === '' ? '' : Number(value);
    setSelectedVendorId(newVendorId);
    setSelectedMainCategoryId(null); // Reset category when vendor changes
    fetchCategories(newVendorId); // Fetch categories for the newly selected vendor
  };

  const handleMainCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedMainCategoryId(value === '' ? null : Number(value));
  };


  // --- Callbacks for Modals ---

  const handleVendorAdded = useCallback((newVendor: { id: number; name: string }) => {
    setAllVendors(prevVendors => [...prevVendors, newVendor]);
    setSelectedVendorId(newVendor.id); // Auto-select the newly added vendor
    fetchCategories(newVendor.id); // Re-fetch categories for the new vendor
    setIsAddVendorModalOpen(false);
  }, [fetchCategories]);

  const handleCategoryAdded = useCallback((newCategory: { id: number; name: string; vendor: number; parent: number | null }) => {
    // If the newly added category belongs to the currently selected vendor, update the filtered list
    // Re-fetch the entire tree to handle nested categories correctly
    if (selectedVendorId === newCategory.vendor) {
        fetchCategories(selectedVendorId);
        setSelectedMainCategoryId(newCategory.id); // Auto-select the new category
    } else {
        // If the new category is for a different vendor, just re-fetch all vendors/categories
        // or just the categories for the *currently selected* vendor, depending on desired UX
        fetchCategories(selectedVendorId);
    }
    setIsAddCategoryModalOpen(false);
  }, [selectedVendorId, fetchCategories]);


  // --- Form Submission ---

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (!selectedFile) {
      setError('Please select a CSV file to upload.');
      setLoading(false);
      return;
    }
    if (selectedVendorId === '') {
      setError('Please select a Vendor.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('csv_file', selectedFile);
    formData.append('vendor', String(selectedVendorId)); // Send ID
    if (selectedMainCategoryId !== null) { // Only append if a category is selected
      formData.append('main_category', String(selectedMainCategoryId)); // Send ID
    }

    try {
      const response = await api.post('/commands/csv-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data.data;
      let successMsg = response.data.message || 'File uploaded and processed successfully!';
      if (responseData) {
        successMsg += `\n\nDetails:
          Vendor: ${responseData.vendor_name || 'N/A'}
          Main Category: ${responseData.main_category_name || 'N/A'}
          Categories Created: ${responseData.categories_created || 0}
          Commands Created: ${responseData.commands_created || 0}
          Total Commands Processed: ${responseData.total_commands_processed || 0}
          Total Categories Processed: ${responseData.total_categories_processed || 0}`;
      }

      setMessage(successMsg);
      setSelectedFile(null);
      setSelectedVendorId('');
      setSelectedMainCategoryId(null); // Reset category selection
      onUploadSuccess(successMsg);

    } catch (err: any) {
      console.error('Upload error:', err);
      let errorMessage = 'An error occurred during upload.';
      if (err.response) {
        errorMessage = `Upload failed: ${err.response.status} - ${err.response.data.detail || JSON.stringify(err.response.data)}`;
        if (err.response.data.csv_file) {
          errorMessage += ` File error: ${err.response.data.csv_file.join(', ')}`;
        }
        if (err.response.data.vendor_id) { // Updated to vendor_id
            errorMessage += ` Vendor error: ${err.response.data.vendor_id.join(', ')}`;
        }
        if (err.response.data.main_category_id) { // New error handling for category ID
            errorMessage += ` Main Category error: ${err.response.data.main_category_id.join(', ')}`;
        }
        if (err.response.data.error) {
            errorMessage = err.response.data.error;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Check network connection.';
      } else {
        errorMessage = `Error setting up request: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to render category options (recursive for tree structure)
  const renderCategoryOptions = (categories: CategoryTreeItem[], level: number = 0) => {
    return categories.map(category => (
      <React.Fragment key={category.id}>
        <option value={category.id}>
          {'\u00A0\u00A0'.repeat(level) + category.name}
        </option>
        {category.children && category.children.length > 0 &&
          renderCategoryOptions(category.children, level + 1)}
      </React.Fragment>
    ));
  };


  return (
    <div className="upload-form-card card p-4 mb-4">
      <h4 className="card-title text-center mb-3">Upload Commands CSV</h4>
      <form onSubmit={handleSubmit}>
        {message && <div className="alert alert-success" style={{ whiteSpace: 'pre-wrap' }}>{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label htmlFor="csvFile" className="form-label">Select CSV File:</label>
          <input
            type="file"
            className="form-control"
            id="csvFile"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>

        {/* Vendor Dropdown with Add Vendor Button */}
        <div className="mb-3">
          <div className="d-flex align-items-center mb-2">
            <label htmlFor="vendorSelect" className="form-label mb-0 me-2">Select Vendor:</label>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setIsAddVendorModalOpen(true)}
              disabled={loading}
              title="Add New Vendor"
            >
              + Add New
            </button>
          </div>
          <select
            id="vendorSelect"
            className="form-select"
            value={selectedVendorId}
            onChange={handleVendorChange}
            required
            disabled={loading || loadingDropdowns}
          >
            <option value="">-- Select Vendor --</option>
            {loadingDropdowns && allVendors.length === 0 ? (
              <option disabled>Loading vendors...</option>
            ) : (
              allVendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))
            )}
          </select>
          {loadingDropdowns && allVendors.length === 0 && <small className="text-muted">Loading vendors...</small>}
        </div>

        {/* Main Category Dropdown with Add Category Button */}
        <div className="mb-3">
          <div className="d-flex align-items-center mb-2">
            <label htmlFor="mainCategorySelect" className="form-label mb-0 me-2">Main Category (Optional):</label>
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={() => setIsAddCategoryModalOpen(true)}
              disabled={loading || selectedVendorId === ''}
              title={selectedVendorId === '' ? "Select a Vendor first" : "Add New Category"}
            >
              + Add New
            </button>
          </div>
          <select
            id="mainCategorySelect"
            className="form-select"
            value={selectedMainCategoryId === null ? '' : selectedMainCategoryId}
            onChange={handleMainCategoryChange}
            disabled={loading || loadingDropdowns || selectedVendorId === ''}
          >
            <option value="">-- No Main Category --</option>
            {loadingDropdowns && filteredCategoriesTree.length === 0 ? (
                <option disabled>Loading categories...</option>
            ) : (
                renderCategoryOptions(filteredCategoriesTree)
            )}
          </select>
          {loadingDropdowns && filteredCategoriesTree.length === 0 && <small className="text-muted">Loading categories...</small>}
          <div className="form-text">
            All categories found in the CSV will be placed under this main category for the selected vendor.
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-100" disabled={loading || loadingDropdowns}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Uploading...
            </>
          ) : (
            'Upload and Import'
          )}
        </button>
      </form>

      {/* Modals are rendered here */}
      <AddVendorModal
        isOpen={isAddVendorModalOpen}
        onClose={() => setIsAddVendorModalOpen(false)}
        onVendorAdded={handleVendorAdded}
      />
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onCategoryAdded={handleCategoryAdded}
        vendors={allVendors} // Pass all vendors to the Category modal
        selectedVendorId={selectedVendorId} // Pre-fill selected vendor in modal
        parentCategories={filteredCategoriesTree} // Pass currently filtered categories for parent selection
      />
    </div>
  );
};

export default CommandCSVUploadForm;