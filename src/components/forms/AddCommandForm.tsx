import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import TagTree from '../Aux/TagTree';
import { toast } from 'react-toastify';

import api from '../../api';

// Imports for interfaces and types
import type {
  DropdownItem,
  TagTreeItem
} from '../../types/index';

import ConfirmationModal from '../modals/ConfirmationModal';


// Props for the AddCommandForm component
interface AddCommandFormProps {
  vendors: DropdownItem[];
  oss: DropdownItem[]; // These will be the currently filtered Platform options
  tagsTree: TagTreeItem[]; // These will be the currently filtered tag tree
  loadingDropdowns: boolean; // Indicates if initial dropdown data is loading
  onVendorChange: (vendorId: number | '') => void; // Callback when vendor selection changes
  onFormSubmit: (payload: any) => Promise<void>; // Callback for form submission (called after successful API call)
  initialSelectedVendorId: number | ''; // Pass the initially selected vendor ID from parent
  initialSelectedOsId: number | '' | null; // Allow null for Platform ID
  initialSelectedTagId: number | null; // Pass the initially selected Tag ID from parent
  initialSelectedTagName: string; // Pass the initially selected Tag Name from parent

  // New props for button clicks and disabled states
  onAddVendorClick: () => void;
  onAddOSClick: () => void;
  onAddTagClick: () => void;
  canAddOS: boolean;
  canAddTag: boolean;
}

const AddCommandForm: React.FC<AddCommandFormProps> = ({
  vendors,
  oss,
  tagsTree,
  loadingDropdowns,
  onVendorChange,
  onFormSubmit,
  initialSelectedVendorId,
  initialSelectedOsId,
  initialSelectedTagId,
  initialSelectedTagName,

  // Destructure new props
  onAddVendorClick,
  onAddOSClick,
  onAddTagClick,
  canAddOS,
  canAddTag,
}) => {

  // Form states - managed within the form component
  const [command, setCommand] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);

  // Confirmation states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalAction, setConfirmModalAction] = useState<(() => Promise<void>) | null>(null);
  

  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>(initialSelectedVendorId);
  const [selectedOsId, setSelectedOsId] = useState<number | '' | null>(initialSelectedOsId);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(initialSelectedTagId);
  const [selectedTagName, setSelectedTagName] = useState<string>(initialSelectedTagName);

  const [TagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // This state controls form submission loading


  useEffect(() => {
    setSelectedVendorId(initialSelectedVendorId);
  }, [initialSelectedVendorId]);

  useEffect(() => {
    setSelectedOsId(initialSelectedOsId);
  }, [initialSelectedOsId]);

  useEffect(() => {
    setSelectedTagId(initialSelectedTagId);
  }, [initialSelectedTagId]);

  useEffect(() => {
    setSelectedTagName(initialSelectedTagName);
  }, [initialSelectedTagName]);


  const handleInternalVendorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newVendorId = Number(e.target.value);
    setSelectedVendorId(newVendorId);
    onVendorChange(newVendorId);

    setSelectedOsId(null);
    setSelectedTagId(null);
    setSelectedTagName('');
  };

  const handleTagSelect = (id: number, name: string) => {
    setSelectedTagId(id);
    setSelectedTagName(name);
    setTagDropdownOpen(false);
  };

  
  const handleOverrideExistingChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOverrideExisting(event.target.checked);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Start loading

    // Basic client-side validation
    if (!command.trim() || !selectedVendorId) {
      toast.error('Command and Vendor are required fields.');
      setIsSubmitting(false); // Stop loading on validation error
      return;
    }

    const basePayload = {
      command: command.trim(),
      description: description.trim() || null,
      example: example.trim() || null,
      version: version.trim() || null,
      vendor: selectedVendorId,
      platform: selectedOsId || null,
      tag: selectedTagId || null,
    };

    try {
      
      const checkResponse = await api.get('/commands/check-existence/', {
        params: {
          command_name: basePayload.command,
          vendor_id: basePayload.vendor,
        },
      });

      const { exists, id: existingCommandId } = checkResponse.data;
      let actionType: 'create' | 'update' | 'none' = 'none'; // To track what action is intended

      // Define the actual API call logic based on action type
      const executeApiCall = async (action: 'create' | 'update') => {
        let apiResponse;

        if (action === 'create') {
          apiResponse = await api.post('/commands/create/', basePayload);
        }

        else { // action === 'update'
          apiResponse = await api.patch(`/commands/update/${existingCommandId}/`, basePayload);
        }
        toast.success(`Command "${basePayload.command}" ${action === 'create' ? 'created' : 'updated'} successfully!`);

        await onFormSubmit(apiResponse.data);

        setCommand('');
        setDescription('');
        setExample('');
        setVersion('');
      };

      if (exists) {

        // Command exists, and override is checked -> Confirm Update
        if (overrideExisting) {
          await executeApiCall('update');
        }

        // Command exists, but override is NOT checked -> Error, no confirmation
        else {
          toast.error(
            `A command named "${basePayload.command}" already exists for this vendor. Cannot create duplicate without checking "Override existing command".`
          );
        }
      }

      else {

        // Command does not exist, but override is checked -> Confirm Creation (user might expect update)
        if (overrideExisting) {
          setConfirmModalTitle('Confirm Creation');
          setConfirmModalMessage(
            `A command named "${basePayload.command}" does not exist. Although "Override existing command" is checked, this will create a new command. Do you want to proceed with creation?`
          );
          setConfirmModalAction(() => () => executeApiCall('create')); // Pass a function that calls the API
          setIsConfirmModalOpen(true);
          
          actionType = 'create'; // Indicate pending action
        }

        // Command does not exist, and override is NOT checked
        else {
          await executeApiCall('create');
        }
      }

      // If no action was initiated (e.g., duplicate without override)
      if (actionType === 'none') {
        setIsSubmitting(false); // Manually stop submitting if no modal opened
      }

    }
    catch (error: any) {
      // Centralized error handling
      console.error("API call failed:", error);
      const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="command-form card p-4 shadow-sm">
      {/* Command Field */}
      <div className="mb-3">
        <label htmlFor="command" className="form-label">Command <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          id="command"
          value={command}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCommand(e.target.value)}
          required
          aria-label="Command"
          disabled={isSubmitting}
        />
      </div>

      {/* Description Field */}
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description</label>
        <textarea
          className="form-control"
          id="description"
          rows={3}
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          aria-label="Description"
          disabled={isSubmitting}
        ></textarea>
      </div>

      {/* Example Field */}
      <div className="mb-3">
        <label htmlFor="example" className="form-label">Example</label>
        <textarea
          className="form-control"
          id="example"
          rows={3}
          value={example}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setExample(e.target.value)}
          aria-label="Example"
          disabled={isSubmitting}
        ></textarea>
      </div>

      {/* Vendor Dropdown with inline button */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-1">
          <label htmlFor="vendor" className="form-label me-2 mb-0">Vendor <span className="text-danger">*</span></label>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm ms-auto"
            onClick={onAddVendorClick}
            title="Add New Vendor"
            disabled={isSubmitting || loadingDropdowns}
          >
            +
          </button>
        </div>
        {loadingDropdowns ? (
          <select className="form-select" disabled>
            <option>Loading Vendors...</option>
          </select>
        ) : (
          <select
            className="form-select"
            id="vendor"
            value={selectedVendorId}
            onChange={handleInternalVendorChange}
            required
            aria-label="Vendor"
            disabled={isSubmitting}
          >
            <option value="">-- Select Vendor --</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Platform Dropdown with inline button */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-1">

          <label htmlFor="platform" className="form-label me-2 mb-0">Platform</label>
          <button
            type="button"
            className="btn btn-outline-info btn-sm ms-auto"
            onClick={onAddOSClick}
            disabled={!canAddOS || isSubmitting || loadingDropdowns}
            title={!canAddOS ? "Add a Vendor first" : "Add New Platform"}
          >
            +
          </button>
        </div>
        {loadingDropdowns ? (
          <select className="form-select" disabled>
            <option>Loading Platforms...</option>
          </select>
        ) : (
          <select
            className="form-select"
            id="platform"
            value={selectedOsId === null ? '' : selectedOsId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              setSelectedOsId(value);
            }}
            aria-label="Platform"
            disabled={isSubmitting}
          >

            <option value="">-- Select Platform (Optional) --</option>
            {oss.length === 0 && selectedVendorId !== '' ? (
              <option disabled>No Platform found for this vendor</option>
            ) : (
              oss.map(platform => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Tag Dropdown (using TagTree) */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-1">
          <label htmlFor="tag" className="form-label me-2 mb-0">Tag</label>
          <button
            type="button"
            className="btn btn-outline-success btn-sm ms-auto"
            onClick={onAddTagClick}
            disabled={!canAddTag || isSubmitting || loadingDropdowns}
            title={!canAddTag ? "Add a Vendor first" : "Add New Tag"}
          >
            +
          </button>
        </div>
        <div className="position-relative">
          <button
            className="form-select text-start"
            type="button"
            onClick={() => setTagDropdownOpen(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={TagDropdownOpen}
            disabled={isSubmitting}
          >
            {selectedTagName || '-- Select Tag (Optional) --'}
          </button>

          {TagDropdownOpen && (
            <div
              className="dropdown-menu show w-100 mt-1 p-2"
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                zIndex: 1050,
              }}
            >
              {loadingDropdowns ? (
                <div>Loading Tags...</div>
              ) : (
                tagsTree.length === 0 && selectedVendorId !== '' ? (
                  <div>No tags found for this vendor.</div>
                ) : (
                  <TagTree
                    nodes={tagsTree}
                    selectedId={selectedTagId}
                    onSelect={handleTagSelect}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Version Field */}
      <div className="mb-3">
        <label htmlFor="version" className="form-label">Version</label>
        <input
          type="text"
          className="form-control"
          id="version"
          value={version}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setVersion(e.target.value)}
          aria-label="Version"
          disabled={isSubmitting}
        />
      </div>

      {/* Override Existing Checkbox */}
      <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="overrideExisting"
            checked={overrideExisting}
            onChange={handleOverrideExistingChange}
            disabled={isSubmitting}
          />
          <label className="form-check-label" htmlFor="overrideExisting">
            Override existing command with new data
          </label>
        </div>

      {/* Submit Button */}
      <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span className="ms-2">Processing...</span> {/* Changed text to be more generic */}
          </>
        ) : (
          'Add Command'
        )}
      </button>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setIsSubmitting(false); // Stop submitting if modal is closed without confirmation
        }}

        onConfirm={async () => {
          if (confirmModalAction) {
            await confirmModalAction(); // Execute the stored API call
          }
          setIsConfirmModalOpen(false); // Close modal after action
          setIsSubmitting(false); // Stop submitting after action
        }}

        title={confirmModalTitle}
        message={confirmModalMessage}
        confirmText="Yes, Proceed"
        cancelText="No, Cancel"
      />
    </form>
  );
};

export default AddCommandForm;