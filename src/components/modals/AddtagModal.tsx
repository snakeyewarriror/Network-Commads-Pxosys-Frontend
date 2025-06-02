import React, { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import api from '../../api';
import '../../css/Modal.css';

// Imports for interfaces and types
import type {
  DropdownItem,
  TagTreeItem
} from '../../types/index';


interface AddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagAdded: (newTag: { id: number; name: string; vendor: number; parent: number | null }) => void;
  vendors: DropdownItem[]; // List of existing vendors to select from
  selectedVendorId: number | ''; // Pre-selected vendor from the main form
  parentTags: TagTreeItem[]; // Tags to select as parent (filtered by selectedVendorId)
}

const AddTagModal: React.FC<AddTagModalProps> = ({
  isOpen,
  onClose,
  onTagAdded,
  vendors,
  selectedVendorId,
  parentTags,
}) => {
  const [TagName, setTagName] = useState('');
  const [internalSelectedVendorId, setInternalSelectedVendorId] = useState<number | ''>(selectedVendorId);
  const [selectedParentTagId, setSelectedParentTagId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update internal vendor selection if the prop changes
  useEffect(() => {
    setInternalSelectedVendorId(selectedVendorId);
  }, [selectedVendorId]);

  // Reset parent Tag selection if the vendor or parent Tags list changes
  useEffect(() => {
    setSelectedParentTagId(null);
  }, [selectedVendorId, parentTags]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!TagName.trim()) {
      setError('Tag name cannot be empty.');
      return;
    }
    if (!internalSelectedVendorId) {
      setError('Vendor must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: TagName.trim(),
        vendor: internalSelectedVendorId,
        parent: selectedParentTagId, // null if not selected
      };

      const response = await api.post('/tags/create/', payload);

      if (response.status === 201) {
        onTagAdded(response.data); // Notify parent
        setTagName(''); // Clear input
        setSelectedParentTagId(null); // Clear parent selection
        onClose();
      } else {
        setError('Failed to add tag. Please try again.');
      }
    } catch (err: any) {
      console.error('Error adding tag:', err);
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTagName('');
    setSelectedParentTagId(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  // Helper function to render nested tags as flat options with indentation
  const renderTagOptions = (tags: TagTreeItem[], level: number = 0): React.ReactNode[] => {
    return tags.flatMap(tag => [
      <option key={tag.id} value={tag.id}>
        {'--'.repeat(level)} {tag.name}
      </option>,
      ...renderTagOptions(tag.children, level + 1)
    ]);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Tag</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="tag" className="form-label">Tag Name:</label>
            <input
              type="text"
              id="TagName"
              className="form-control"
              value={TagName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTagName(e.target.value)}
              disabled={isSubmitting}
              required
              aria-label="Tag Name"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="TagVendor" className="form-label">Vendor:</label>
            <select
              id="TagVendor"
              className="form-select"
              value={internalSelectedVendorId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setInternalSelectedVendorId(Number(e.target.value))}
              disabled={isSubmitting}
              required
              aria-label="Tag Vendor"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="parentTag" className="form-label">Parent Tag (Optional):</label>
            <select
              id="parentTag"
              className="form-select"
              value={selectedParentTagId || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedParentTagId(Number(e.target.value) || null)}
              disabled={isSubmitting}
              aria-label="Parent Tag"
            >
              <option value="">-- No Parent Tag --</option>
              {parentTags.length === 0 && internalSelectedVendorId !== '' ? (
                <option disabled>No tags for this vendor to be a parent</option>
              ) : (
                renderTagOptions(parentTags)
              )}
            </select>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span className="ms-2">Adding...</span>
                </>
              ) : (
                'Add Tag'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTagModal;