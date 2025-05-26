import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../base/BaseLayout';
import api from '../../api';
import { useNavigate } from 'react-router-dom';
import AddCommandForm from '../forms/AddCommandForm'; // Your existing form component
import { toast } from 'react-toastify';

// Import the new modal components
import AddVendorModal from '../modals/AddVendorModal';
import AddOSModal from '../modals/AddOSModal';
import AddCategoryModal from '../modals/AddCategoryModal';

import '../../css/AddCommandPage.css'; // Your page-specific CSS
import '../../css/Modal.css'; // Make sure this CSS file exists and has your modal styles

// Interfaces for dropdown data
interface DropdownItem {
  id: number;
  name: string;
}

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

// Utility for error messages
function printErrors(err: any) {
  console.error('Error:', err);
  if (err.response) {
    // If the error is a 400 Bad Request with serializer errors
    if (err.response.status === 400 && err.response.data) {
      const errorMessages = Object.entries(err.response.data)
        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
        .join('\n');
      toast.error(`Validation Failed:\n${errorMessages}`);
    } else {
      toast.error(`API Error: ${err.response.status} - ${err.response.data.detail || JSON.stringify(err.response.data)}`);
    }
  } else if (err.request) {
    toast.error('Network Error: No response from server. Check your connection.');
  } else {
    toast.error(`An unexpected error occurred: ${err.message}`);
  }
}

const AddCommandPage: React.FC = () => {
  const navigate = useNavigate();

  // States for dropdown data
  const [allVendors, setAllVendors] = useState<DropdownItem[]>([]); // All vendors
  const [filteredOss, setFilteredOss] = useState<DropdownItem[]>([]); // Filtered OSes based on selected vendor
  const [filteredCategoriesTree, setFilteredCategoriesTree] = useState<CategoryTreeItem[]>([]); // Filtered category tree based on selected vendor

  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(true);

  // States for the *currently selected* values in the main AddCommandForm
  const [currentSelectedVendorId, setCurrentSelectedVendorId] = useState<number | ''>('');
  const [currentSelectedOsId, setCurrentSelectedOsId] = useState<number | ''>('');
  const [currentSelectedCategoryId, setCurrentSelectedCategoryId] = useState<number | null>(null);
  const [currentSelectedCategoryName, setCurrentSelectedCategoryName] = useState<string>(''); // For displaying category name

  // States for modal visibility
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isAddOSModalOpen, setIsAddOSModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);


  // --- Data Fetching Functions ---

  // Fetches all vendors
  const fetchAllVendors = useCallback(async () => {
    try {
      const response = await api.get<DropdownItem[]>('/vendors/get-all/');
      setAllVendors(response.data);
    }
    catch (err: any) {
      printErrors(err);
      setAllVendors([]);
    }
  }, []);

  // Fetches OS and Categories, optionally filtered by vendorId
  const fetchDependentDropdowns = useCallback(async (vendorId: number | '') => {
    setLoadingDropdowns(true);
    try {
      const osUrl = vendorId ? `/os/get-all/?vendor_id=${vendorId}` : '/os/get-all/';
      const categoryUrl = vendorId ? `/categories/get-all-tree/?vendor_id=${vendorId}` : '/categories/get-all-tree/';

      const [osRes, categoriesRes] = await Promise.all([
        api.get<DropdownItem[]>(osUrl),
        api.get<CategoryTreeItem[]>(categoryUrl),
      ]);

      setFilteredOss(osRes.data);
      setFilteredCategoriesTree(categoriesRes.data);

      // Reset selected OS and Category if the new vendor caused them to become invalid
      const selectedOsExists = osRes.data.some(os => os.id === currentSelectedOsId);
      if (currentSelectedOsId !== '' && !selectedOsExists) {
        setCurrentSelectedOsId('');
      }

      // Helper to check if a category ID exists in the tree
      const isCategoryIdInTree = (id: number | null, tree: CategoryTreeItem[]): boolean => {
        if (id === null) return true;
        for (const item of tree) {
          if (item.id === id) return true;
          if (item.children && isCategoryIdInTree(id, item.children)) return true;
        }
        return false;
      };

      if (currentSelectedCategoryId !== null && !isCategoryIdInTree(currentSelectedCategoryId, categoriesRes.data)) {
        setCurrentSelectedCategoryId(null);
        setCurrentSelectedCategoryName('');
      }

    } catch (err) {
      printErrors(err);
      setFilteredOss([]);
      setFilteredCategoriesTree([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [currentSelectedOsId, currentSelectedCategoryId]); // Dependencies for useCallback


  // --- Initial Data Load on Mount ---
  useEffect(() => {
    const loadAllInitialData = async () => {
      setLoadingDropdowns(true);
      await fetchAllVendors(); // Fetch all vendors initially
      await fetchDependentDropdowns(''); // Fetch all OS/Categories initially
      setLoadingDropdowns(false);
    };
    loadAllInitialData();
  }, [fetchAllVendors, fetchDependentDropdowns]);


  // --- Handlers for AddCommandForm (propagated from its props) ---

  // Called when the vendor selection changes in the AddCommandForm
  const handleVendorChangeInForm = (newVendorId: number | '') => {
    setCurrentSelectedVendorId(newVendorId);
    setCurrentSelectedOsId(''); // Reset OS selection
    setCurrentSelectedCategoryId(null); // Reset Category selection
    setCurrentSelectedCategoryName('');
    fetchDependentDropdowns(newVendorId); // Fetch new filtered lists for OS and Category
  };

  // Called when the main command form is submitted
  const handleFormSubmit = async (payload: any) => {
    try {
      const response = await api.post('/commands/create/', payload);

      if (response.status === 201) {
        toast.success('Command added successfully!');
        navigate('/commands'); // Redirect after success
      } else {
        toast.error('Failed to add command.');
      }
    } catch (err: any) {
      printErrors(err);
      throw err; // Re-throw to allow the form component to handle `isSubmitting` state
    }
  };


  // --- Callbacks for Modals ---

  // Called when a new vendor is successfully added via AddVendorModal
  const handleVendorAdded = useCallback((newVendor: { id: number; name: string }) => {
    setAllVendors(prevVendors => [...prevVendors, newVendor]); // Add to the main vendor list
    setCurrentSelectedVendorId(newVendor.id); // Auto-select the newly added vendor in the form
    fetchDependentDropdowns(newVendor.id); // Re-fetch OS/Categories for the new vendor (likely empty initially)
    setIsAddVendorModalOpen(false); // Close the modal
  }, [fetchDependentDropdowns]);

  // Called when a new OS is successfully added via AddOSModal
  const handleOSAdded = useCallback((newOS: { id: number; name: string; vendor: number }) => {
    // If the newly added OS belongs to the currently selected vendor, update the filtered OS list
    if (currentSelectedVendorId === newOS.vendor) {
      setFilteredOss(prevOs => [...prevOs, newOS]);
      setCurrentSelectedOsId(newOS.id); // Auto-select the new OS in the form
    }
    setIsAddOSModalOpen(false); // Close the modal
  }, [currentSelectedVendorId]);

  // Called when a new category is successfully added via AddCategoryModal
  const handleCategoryAdded = useCallback((newCategory: { id: number; name: string; vendor: number; parent: number | null }) => {
    // Re-fetch the entire category tree for the current vendor. This is more robust
    // for nested categories than trying to insert manually.
    fetchDependentDropdowns(currentSelectedVendorId);
    if (currentSelectedVendorId === newCategory.vendor) {
      setCurrentSelectedCategoryId(newCategory.id); // Auto-select the new category in the form
      setCurrentSelectedCategoryName(newCategory.name); // Set its name for display
    }
    setIsAddCategoryModalOpen(false); // Close the modal
  }, [currentSelectedVendorId, fetchDependentDropdowns]);


  return (
    <Layout title="Add New Command">
      <div className="add-command-container">
        <h2 className="text-center mb-4">Add New Command</h2>

        {/* The main AddCommandForm */}
        <AddCommandForm
          vendors={allVendors} // Pass all vendors
          oss={filteredOss} // Pass filtered OSes
          categoriesTree={filteredCategoriesTree} // Pass filtered category tree
          loadingDropdowns={loadingDropdowns}
          onVendorChange={handleVendorChangeInForm}
          onFormSubmit={handleFormSubmit}
          initialSelectedVendorId={currentSelectedVendorId}
          initialSelectedOsId={currentSelectedOsId}
          initialSelectedCategoryId={currentSelectedCategoryId}
          initialSelectedCategoryName={currentSelectedCategoryName}
          // Pass down the modal open handlers
          onAddVendorClick={() => setIsAddVendorModalOpen(true)}
          onAddOSClick={() => setIsAddOSModalOpen(true)}
          onAddCategoryClick={() => setIsAddCategoryModalOpen(true)}
          // Pass down state needed for disabling buttons
          canAddOS={allVendors.length > 0}
          canAddCategory={allVendors.length > 0}
        />

        {/* Modals are rendered here, controlled by AddCommandPage's state */}
        <AddVendorModal
          isOpen={isAddVendorModalOpen}
          onClose={() => setIsAddVendorModalOpen(false)}
          onVendorAdded={handleVendorAdded}
        />
        <AddOSModal
          isOpen={isAddOSModalOpen}
          onClose={() => setIsAddOSModalOpen(false)}
          onOSAdded={handleOSAdded}
          vendors={allVendors} // Pass all vendors to the OS modal for its vendor dropdown
          selectedVendorId={currentSelectedVendorId} // Pass currently selected vendor for pre-filling
        />
        <AddCategoryModal
          isOpen={isAddCategoryModalOpen}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onCategoryAdded={handleCategoryAdded}
          vendors={allVendors} // Pass all vendors to the Category modal for its vendor dropdown
          selectedVendorId={currentSelectedVendorId} // Pass currently selected vendor for pre-filling
          parentCategories={filteredCategoriesTree} // Pass currently filtered categories for parent selection
        />
      </div>
    </Layout>
  );
};

export default AddCommandPage;