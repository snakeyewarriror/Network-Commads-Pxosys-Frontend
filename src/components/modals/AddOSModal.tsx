import React, { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import api from '../../api';
import '../../css/Modal.css';

interface DropdownItem {
  id: number;
  name: string;
}

interface AddOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOSAdded: (newOS: { id: number; name: string; vendor: number }) => void;
  vendors: DropdownItem[]; // List of existing vendors to select from
  selectedVendorId: number | ''; // Pre-selected vendor from the main form
}

const AddOSModal: React.FC<AddOSModalProps> = ({ isOpen, onClose, onOSAdded, vendors, selectedVendorId }) => {
  const [osName, setOsName] = useState('');
  const [internalSelectedVendorId, setInternalSelectedVendorId] = useState<number | ''>(selectedVendorId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update internal vendor selection if the prop changes
  useEffect(() => {
    setInternalSelectedVendorId(selectedVendorId);
  }, [selectedVendorId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!osName.trim()) {
      setError('OS name cannot be empty.');
      return;
    }
    if (!internalSelectedVendorId) {
      setError('Vendor must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/os/create/', {
        name: osName.trim(),
        vendor: internalSelectedVendorId,
      });

      if (response.status === 201) {
        onOSAdded(response.data); // Notify parent
        setOsName(''); // Clear input
        // Keep internalSelectedVendorId for convenience if adding multiple OSes for the same vendor
        onClose();
      } else {
        setError('Failed to add OS. Please try again.');
      }
    } catch (err: any) {
      console.error('Error adding OS:', err);
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOsName('');
    setError(null);
    setIsSubmitting(false);
    // Optionally reset vendor selection on close
    // setInternalSelectedVendorId('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New OS</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="osName" className="form-label">OS Name:</label>
            <input
              type="text"
              id="osName"
              className="form-control"
              value={osName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setOsName(e.target.value)}
              disabled={isSubmitting}
              required
              aria-label="OS Name"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="osVendor" className="form-label">Vendor:</label>
            <select
              id="osVendor"
              className="form-select"
              value={internalSelectedVendorId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setInternalSelectedVendorId(Number(e.target.value))}
              disabled={isSubmitting}
              required
              aria-label="OS Vendor"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
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
                'Add OS'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOSModal;