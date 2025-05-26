import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import CategoryTree from '../Aux/CategoryTree';
import { toast } from 'react-toastify';

// Interfaces for dropdown data (reused from AddCommandPage)
interface DropdownItem {
  id: number;
  name: string;
}

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

// Props for the AddCommandForm component
interface AddCommandFormProps {
  vendors: DropdownItem[];
  oss: DropdownItem[]; // These will be the currently filtered OS options
  categoriesTree: CategoryTreeItem[]; // These will be the currently filtered category tree
  loadingDropdowns: boolean; // Indicates if initial dropdown data is loading
  onVendorChange: (vendorId: number | '') => void; // Callback when vendor selection changes
  onFormSubmit: (payload: any) => Promise<void>; // Callback for form submission
  initialSelectedVendorId: number | ''; // Pass the initially selected vendor ID from parent
  initialSelectedOsId: number | '' | null; // MODIFIED: Allow null for OS ID
  initialSelectedCategoryId: number | null; // Pass the initially selected Category ID from parent
  initialSelectedCategoryName: string; // Pass the initially selected Category Name from parent
  // New props for button clicks and disabled states
  onAddVendorClick: () => void;
  onAddOSClick: () => void;
  onAddCategoryClick: () => void;
  canAddOS: boolean;
  canAddCategory: boolean;
}

const AddCommandForm: React.FC<AddCommandFormProps> = ({
  vendors,
  oss,
  categoriesTree,
  loadingDropdowns,
  onVendorChange,
  onFormSubmit,
  initialSelectedVendorId,
  initialSelectedOsId,
  initialSelectedCategoryId,
  initialSelectedCategoryName,
  // Destructure new props
  onAddVendorClick,
  onAddOSClick,
  onAddCategoryClick,
  canAddOS,
  canAddCategory,
}) => {
  // Form states - managed within the form component
  const [command, setCommand] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>(initialSelectedVendorId);
  // MODIFIED: Allow null for selectedOsId
  const [selectedOsId, setSelectedOsId] = useState<number | '' | null>(initialSelectedOsId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialSelectedCategoryId);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialSelectedCategoryName);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


  // Update internal states when parent props change (e.g., initial load or vendor change)
  useEffect(() => {
    setSelectedVendorId(initialSelectedVendorId);
  }, [initialSelectedVendorId]);

  useEffect(() => {
    setSelectedOsId(initialSelectedOsId);
  }, [initialSelectedOsId]);

  useEffect(() => {
    setSelectedCategoryId(initialSelectedCategoryId);
  }, [initialSelectedCategoryId]);

  useEffect(() => {
    setSelectedCategoryName(initialSelectedCategoryName);
  }, [initialSelectedCategoryName]);


  const handleInternalVendorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newVendorId = Number(e.target.value);
    setSelectedVendorId(newVendorId);
    // Notify parent about vendor change for filtering
    onVendorChange(newVendorId);
    // Reset OS and Category selections when vendor changes
    // MODIFIED: Reset OS to null, not ''
    setSelectedOsId(null);
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
  };

  const handleCategorySelect = (id: number, name: string) => {
    setSelectedCategoryId(id);
    setSelectedCategoryName(name);
    setCategoryDropdownOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // MODIFIED: Removed selectedOsId from required validation
    if (!command.trim() || !selectedVendorId) {
      toast.error('Command and Vendor are required fields.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      command: command.trim(),
      description: description.trim() || null,
      example: example.trim() || null,
      version: version.trim() || null,
      vendor: selectedVendorId,
      // MODIFIED: Send selectedOsId directly, it can be null
      os: selectedOsId || null,
      category: selectedCategoryId || null,
    };

    try {
      await onFormSubmit(payload); // Call the parent's submit handler
      setCommand('');
      setDescription('');
      setExample('');
      setVersion('');
    } finally {
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
          required // Command is still required
          aria-label="Command"
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
            required // Vendor is still required
            aria-label="Vendor"
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

      {/* OS Dropdown with inline button */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-1">
          {/* MODIFIED: Removed the '*' from the label */}
          <label htmlFor="os" className="form-label me-2 mb-0">OS</label>
          <button
            type="button"
            className="btn btn-outline-info btn-sm ms-auto"
            onClick={onAddOSClick}
            disabled={!canAddOS}
            title={!canAddOS ? "Add a Vendor first" : "Add New OS"}
          >
            +
          </button>
        </div>
        {loadingDropdowns ? (
          <select className="form-select" disabled>
            <option>Loading OSes...</option>
          </select>
        ) : (
          <select
            className="form-select"
            id="os"
            value={selectedOsId === null ? '' : selectedOsId} // MODIFIED: Handle null state for display
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              // MODIFIED: Set to null if the empty option is selected
              const value = e.target.value === '' ? null : Number(e.target.value);
              setSelectedOsId(value);
            }}
            // MODIFIED: Removed required attribute
            aria-label="OS"
          >
            {/* MODIFIED: Added an option for "None" or "Optional" */}
            <option value="">-- Select OS (Optional) --</option>
            {oss.length === 0 && selectedVendorId !== '' ? (
              <option disabled>No OS found for this vendor</option>
            ) : (
              oss.map(os => (
                <option key={os.id} value={os.id}>
                  {os.name}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Category Dropdown (using CategoryTree) with inline button */}
      <div className="mb-3">
        <div className="d-flex align-items-center mb-1">
          <label htmlFor="category" className="form-label me-2 mb-0">Category</label>
          <button
            type="button"
            className="btn btn-outline-success btn-sm ms-auto"
            onClick={onAddCategoryClick}
            disabled={!canAddCategory}
            title={!canAddCategory ? "Add a Vendor first" : "Add New Category"}
          >
            +
          </button>
        </div>
        <div className="position-relative">
          <button
            className="form-select text-start"
            type="button"
            onClick={() => setCategoryDropdownOpen(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={categoryDropdownOpen}
          >
            {selectedCategoryName || '-- Select Category (Optional) --'}
          </button>

          {categoryDropdownOpen && (
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
                <div>Loading Categories...</div>
              ) : (
                categoriesTree.length === 0 && selectedVendorId !== '' ? (
                  <div>No categories found for this vendor.</div>
                ) : (
                  <CategoryTree
                    nodes={categoriesTree}
                    selectedId={selectedCategoryId}
                    onSelect={handleCategorySelect}
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
        />
      </div>

      <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span className="ms-2">Adding Command...</span>
          </>
        ) : (
          'Add Command'
        )}
      </button>
    </form>
  );
};

export default AddCommandForm;