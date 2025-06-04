import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../base/BaseLayout';
import api from '../../api'; // Still needed for initial dropdown fetches
import { useNavigate } from 'react-router-dom';
import AddCommandForm from '../forms/AddCommandForm';
import { toast } from 'react-toastify';

import AddVendorModal from '../modals/AddVendorModal';
import AddOSModal from '../modals/AddOSModal';
import AddTagModal from '../modals/AddtagModal';

import '../../css/AddCommandPage.css';
import '../../css/Modal.css';

// Imports for interfaces and types
import type {
  DropdownItem,
  TagTreeItem
} from '../../types/index';

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
    }
    else {
      toast.error(`API Error: ${err.response.status} - ${err.response.data.detail || JSON.stringify(err.response.data)}`);
    }
  }
  else if (err.request) {
    toast.error('Network Error: No response from server. Check your connection.');
  }
  else {
    toast.error(`An unexpected error occurred: ${err.message}`);
  }
}

const AddCommandPage: React.FC = () => {
  const navigate = useNavigate();

  // States for dropdown data
  const [allVendors, setAllVendors] = useState<DropdownItem[]>([]); // All vendors
  const [filteredOss, setFilteredOss] = useState<DropdownItem[]>([]); // Filtered Platforms based on selected vendor
  const [filteredTagsTree, setFilteredTagsTree] = useState<TagTreeItem[]>([]); // Filtered Tag tree based on selected vendor

  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(true);

  // States for the *currently selected* values in the main AddCommandForm
  const [currentSelectedVendorId, setCurrentSelectedVendorId] = useState<number | ''>('');
  const [currentSelectedOsId, setCurrentSelectedOsId] = useState<number | ''>('');
  const [currentSelectedTagId, setCurrentSelectedTagId] = useState<number | null>(null);
  const [currentSelectedTagName, setCurrentSelectedTagName] = useState<string>(''); // For displaying Tag name

  // States for modal visibility
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isAddOSModalOpen, setIsAddOSModalOpen] = useState(false);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);


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

  // Fetches Platform and Tags, optionally filtered by vendorId
  const fetchDependentDropdowns = useCallback(async (vendorId: number | '') => {
    setLoadingDropdowns(true);
    try {
      const platform_url = vendorId ? `/platform/get-all/?vendor_id=${vendorId}` : '/platform/get-all/';
      const TagUrl = vendorId ? `/tags/get-all-tree/?vendor_id=${vendorId}` : '/tags/get-all-tree/';

      const [osRes, tagsRes] = await Promise.all([
        api.get<DropdownItem[]>(platform_url),
        api.get<TagTreeItem[]>(TagUrl),
      ]);

      setFilteredOss(osRes.data);
      setFilteredTagsTree(tagsRes.data);

      // Reset selected Platform and Tag if the new vendor caused them to become invalid
      const selectedOsExists = osRes.data.some(platform => platform.id === currentSelectedOsId);
      if (currentSelectedOsId !== '' && !selectedOsExists) {
        setCurrentSelectedOsId('');
      }

      // Helper to check if a Tag ID exists in the tree
      const isTagIdInTree = (id: number | null, tree: TagTreeItem[]): boolean => {
        if (id === null) return true;
        for (const item of tree) {
          if (item.id === id) return true;
          if (item.children && isTagIdInTree(id, item.children)) return true;
        }
        return false;
      };

      if (currentSelectedTagId !== null && !isTagIdInTree(currentSelectedTagId, tagsRes.data)) {
        setCurrentSelectedTagId(null);
        setCurrentSelectedTagName('');
      }

    } catch (err) {
      printErrors(err);
      setFilteredOss([]);
      setFilteredTagsTree([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [currentSelectedOsId, currentSelectedTagId]); // Dependencies for useCallback


  // --- Initial Data Load on Mount ---
  useEffect(() => {
    const loadAllInitialData = async () => {
      setLoadingDropdowns(true);
      await fetchAllVendors(); // Fetch all vendors initially
      await fetchDependentDropdowns(''); // Fetch all Platform/Tags initially
      setLoadingDropdowns(false);
    };
    loadAllInitialData();
  }, [fetchAllVendors, fetchDependentDropdowns]);


  // --- Handlers for AddCommandForm (propagated from its props) ---

  // Called when the vendor selection changes in the AddCommandForm
  const handleVendorChangeInForm = (newVendorId: number | '') => {
    setCurrentSelectedVendorId(newVendorId);
    setCurrentSelectedOsId(''); // Reset Platform selection
    setCurrentSelectedTagId(null); // Reset Tag selection
    setCurrentSelectedTagName('');
    fetchDependentDropdowns(newVendorId); // Fetch new filtered lists for Platform and Tag
  };

  // Called when the main command form is submitted and the API call within the form is successful
  const handleFormSubmit = async () => {
    try {
      navigate('/commands'); // Redirect after success
    }
    catch (err: any) {
      printErrors(err);
    }
  };


  // --- Callbacks for Modals ---

  // Called when a new vendor is successfully added via AddVendorModal
  const handleVendorAdded = useCallback((newVendor: { id: number; name: string }) => {
    setAllVendors(prevVendors => [...prevVendors, newVendor]); // Add to the main vendor list
    setCurrentSelectedVendorId(newVendor.id); // Auto-select the newly added vendor in the form
    fetchDependentDropdowns(newVendor.id); // Re-fetch Platform/Tags for the new vendor (likely empty initially)
    setIsAddVendorModalOpen(false); // Close the modal
  }, [fetchDependentDropdowns]);

  // Called when a new Platform is successfully added via AddOSModal
  const handleOSAdded = useCallback((newOS: { id: number; name: string; vendor: number }) => {
    // If the newly added Platform belongs to the currently selected vendor, update the filtered Platform list
    if (currentSelectedVendorId === newOS.vendor) {
      setFilteredOss(prevOs => [...prevOs, newOS]);
      setCurrentSelectedOsId(newOS.id); // Auto-select the new Platform in the form
    }
    setIsAddOSModalOpen(false); // Close the modal
  }, [currentSelectedVendorId]);

  // Called when a new Tag is successfully added via AddTagModal
  const handleTagAdded = useCallback((newTag: { id: number; name: string; vendor: number; parent: number | null }) => {

    fetchDependentDropdowns(currentSelectedVendorId);

    if (currentSelectedVendorId === newTag.vendor) {
      setCurrentSelectedTagId(newTag.id); // Auto-select the new Tag in the form
      setCurrentSelectedTagName(newTag.name); // Set its name for display
    }
    setIsAddTagModalOpen(false); // Close the modal
  }, [currentSelectedVendorId, fetchDependentDropdowns]);


  return (
    <Layout title="Add New Command">
      <div className="add-command-container">
        <h2 className="text-center mb-4">Add New Command</h2>

        {/* The main AddCommandForm */}
        <AddCommandForm
          vendors={allVendors} // Pass all vendors
          oss={filteredOss} // Pass filtered Platforms
          tagsTree={filteredTagsTree} // Pass filtered Tag tree
          loadingDropdowns={loadingDropdowns}
          onVendorChange={handleVendorChangeInForm}
          onFormSubmit={handleFormSubmit}
          initialSelectedVendorId={currentSelectedVendorId}
          initialSelectedOsId={currentSelectedOsId}
          initialSelectedTagId={currentSelectedTagId}
          initialSelectedTagName={currentSelectedTagName}
          // Pass down the modal open handlers
          onAddVendorClick={() => setIsAddVendorModalOpen(true)}
          onAddOSClick={() => setIsAddOSModalOpen(true)}
          onAddTagClick={() => setIsAddTagModalOpen(true)}
          // Pass down state needed for disabling buttons
          canAddOS={allVendors.length > 0}
          canAddTag={allVendors.length > 0}
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
          vendors={allVendors} // Pass all vendors to the Platform modal for its vendor dropdown
          selectedVendorId={currentSelectedVendorId} // Pass currently selected vendor for pre-filling
        />
        <AddTagModal
          isOpen={isAddTagModalOpen}
          onClose={() => setIsAddTagModalOpen(false)}
          onTagAdded={handleTagAdded}
          vendors={allVendors} // Pass all vendors to the Tag modal for its vendor dropdown
          selectedVendorId={currentSelectedVendorId} // Pass currently selected vendor for pre-filling
          parentTags={filteredTagsTree} // Pass currently filtered tags for parent selection
        />
      </div>
    </Layout>
  );
};

export default AddCommandPage;