import React, { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import api from '../../api';
import '../../css/BrowseCommands.css';
import '../../css/Modal.css';

import AddVendorModal from '../modals/AddVendorModal';
import AddTagModal from '../modals/AddtagModal';

// Imports for interfaces and types
import type {
  DropdownItem,
  TagTreeItem,
  UploadSuccessData
} from '../../types/index';


interface CommandUploadFormProps {
  onUploadSuccess: (resultData: UploadSuccessData) => void;
}


const CommandCSVUploadForm: React.FC<CommandUploadFormProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [selectedMainTagId, setSelectedMainTagId] = useState<number | null>(null);
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for dropdown data
  const [allVendors, setAllVendors] = useState<DropdownItem[]>([]);
  const [filteredTagsTree, setFilteredTagsTree] = useState<TagTreeItem[]>([]);

  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(true); // For initial load of vendors/tag

  // States for modal visibility
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);

  // Helper to extract Tag name for display from a tree
  const getTagNameById = useCallback((id: number | null, tree: TagTreeItem[]): string => {
    if (id === null) return '';
    for (const item of tree) {
      if (item.id === id) return item.name;
      if (item.children) {
        const found = getTagNameById(id, item.children);
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
    }
    catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors. Please try again.');
      setAllVendors([]);
    }
  }, []);

  const fetchTags = useCallback(async (vendorId: number | '') => {
    setLoadingDropdowns(true); // Indicate tags are loading
    try {
      const TagUrl = vendorId ? `/tags/get-all-tree/?vendor_id=${vendorId}` : '/tags/get-all-tree/';
      const tagsRes = await api.get<TagTreeItem[]>(TagUrl);
      setFilteredTagsTree(tagsRes.data);

      // Reset selected main Tag if the new vendor caused it to become invalid
      const isTagIdInTree = (id: number | null, tree: TagTreeItem[]): boolean => {
        if (id === null) return true; // Null is always valid (no selection)
        for (const item of tree) {
          if (item.id === id) return true;
          if (item.children && isTagIdInTree(id, item.children)) return true;
        }
        return false;
      };

      if (selectedMainTagId !== null && !isTagIdInTree(selectedMainTagId, tagsRes.data)) {
        setSelectedMainTagId(null);
      }

    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Failed to load tags. Please try again.');
      setFilteredTagsTree([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [selectedMainTagId]); // Dependency on selectedMainTagId for reset logic


  // --- Initial Data Load on Mount ---

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDropdowns(true);
      await fetchAllVendors();
      await fetchTags(''); // Fetch all tags initially (no vendor filter)
      setLoadingDropdowns(false);
    };
    loadInitialData();
  }, [fetchAllVendors, fetchTags]);


  // --- Handlers for Form Inputs ---

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {


    if (event.target.files && event.target.files.length > 0) {

      if( event.target.files[0].type !== 'text/csv'){

        event.target.value = '';
        setSelectedFile(null); // Clear the invalid file selection
        setFileError('File must be a CSV type (e.g., .csv extension).');
        return;
      }
      setSelectedFile(event.target.files[0]);
    }
    else {
      event.target.value = '';
      setSelectedFile(null); // Clear the invalid file selection
    }
  };

  const handleVendorChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const newVendorId = value === '' ? '' : Number(value);
    setSelectedVendorId(newVendorId);
    setSelectedMainTagId(null); // Reset Tag when vendor changes
    fetchTags(newVendorId); // Fetch tags for the newly selected vendor
  };

  const handleMainTagChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedMainTagId(value === '' ? null : Number(value));
  };

  const handleOverrideExistingChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOverrideExisting(event.target.checked);
  };


  // --- Callbacks for Modals ---

  const handleVendorAdded = useCallback((newVendor: { id: number; name: string }) => {
    setAllVendors(prevVendors => [...prevVendors, newVendor]);
    setSelectedVendorId(newVendor.id); // Auto-select the newly added vendor
    fetchTags(newVendor.id); // Re-fetch tags for the new vendor
    setIsAddVendorModalOpen(false);
  }, [fetchTags]);

  const handleTagAdded = useCallback((newTag: { id: number; name: string; vendor: number; parent: number | null }) => {
    if (selectedVendorId === newTag.vendor) {
        fetchTags(selectedVendorId);
        setSelectedMainTagId(newTag.id); // Auto-select the new Tag
    }
    else {
        fetchTags(selectedVendorId);
    }
    setIsAddTagModalOpen(false);
  }, [selectedVendorId, fetchTags]);


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
    if (selectedMainTagId !== null) { // Only append if a Tag is selected
      formData.append('main_tag', String(selectedMainTagId)); // Send ID
    }

    formData.append('override', String(overrideExisting)); // FormData expects string values
    

    try {
      const response = await api.post<UploadSuccessData>('/commands/csv-upload', formData, { // Type response data
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess(response.data);

      setMessage(response.data.message || 'File uploaded and processed successfully!');
      setSelectedFile(null);

    }
    catch (err: any) {
      console.error('Upload error:', err);
      let errorMessage = 'An error occurred during upload.';
      if (err.response) {

        if (err.response.data && typeof err.response.data === 'object') {

          // Check for 'detail' or 'error' key for general messages
          errorMessage = err.response.data.detail || err.response.data.error || 'An unexpected error occurred.';

          // Iterate over other fields for validation errors
          Object.entries(err.response.data).forEach(([key, value]) => {
            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
              errorMessage += `\n${key.replace('_', ' ')}: ${value.join(', ')}`;
            }
          });
        }
        else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data; // Raw string error
        }
        else {
          errorMessage = `Upload failed: ${err.response.status} - Unknown response format.`;
        }
      }
      else if (err.request) {
        errorMessage = 'No response from server. Check network connection.';
      }
      else {
        errorMessage = `Error setting up request: ${err.message}`;
      }
      setError(errorMessage);
    }
    finally {
      setLoading(false);
    }
  };

  // Function to render Tag options (recursive for tree structure)
  const renderTagOptions = (tags: TagTreeItem[], level: number = 0) => {
    return tags.map(tag => (
      <React.Fragment key={tag.id}>
        <option value={tag.id}>
          {'\u00A0\u00A0'.repeat(level) + tag.name}
        </option>
        {tag.children && tag.children.length > 0 &&
          renderTagOptions(tag.children, level + 1)}
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
              className={`form-control ${fileError ? 'is-invalid' : ''}`}
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
          />
          {fileError && <div className="invalid-feedback">{fileError}</div>}
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

        {/* Main Tag Dropdown with Add Tag Button */}
        <div className="mb-3">
          <div className="d-flex align-items-center mb-2">
            <label htmlFor="mainTagSelect" className="form-label mb-0 me-2">Main Tag (Optional):</label>
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={() => setIsAddTagModalOpen(true)}
              disabled={loading || selectedVendorId === ''}
              title={selectedVendorId === '' ? "Select a Vendor first" : "Add New Tag"}
            >
              + Add New
            </button>
          </div>
          <select
            id="mainTagSelect"
            className="form-select"
            value={selectedMainTagId === null ? '' : selectedMainTagId}
            onChange={handleMainTagChange}
            disabled={loading || loadingDropdowns || selectedVendorId === ''}
          >
            <option value="">-- No Main Tag --</option>
            {loadingDropdowns && filteredTagsTree.length === 0 ? (
                <option disabled>Loading tags...</option>
            ) : (
                renderTagOptions(filteredTagsTree)
            )}
          </select>
          {loadingDropdowns && filteredTagsTree.length === 0 && <small className="text-muted">Loading tags...</small>}
          <div className="form-text">
            All tags found in the CSV will be placed under this main Tag for the selected vendor.
          </div>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="overrideExisting"
            checked={overrideExisting}
            onChange={handleOverrideExistingChange}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="overrideExisting">
            Override existing commands with new data
          </label>
          <small className="form-text text-muted d-block">
            If checked, commands in the CSV that already exist for the selected vendor will be updated. If unchecked, existing commands will be skipped.
          </small>
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
      <AddTagModal
        isOpen={isAddTagModalOpen}
        onClose={() => setIsAddTagModalOpen(false)}
        onTagAdded={handleTagAdded}
        vendors={allVendors} // Pass all vendors to the Tag modal
        selectedVendorId={selectedVendorId} // Pre-fill selected vendor in modal
        parentTags={filteredTagsTree} // Pass currently filtered tags for parent selection
      />
    </div>
  );
};

export default CommandCSVUploadForm;