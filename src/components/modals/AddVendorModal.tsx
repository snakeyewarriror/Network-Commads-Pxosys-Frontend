import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import api from '../../api';
import '../../css/Modal.css'; // Ensure you have this CSS file

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorAdded: (newVendor: { id: number; name: string }) => void;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({ isOpen, onClose, onVendorAdded }) => {
  const [vendorName, setVendorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (!vendorName.trim()) {
      setError('Vendor name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/vendors/create/', { name: vendorName.trim() });

      if (response.status === 201) {
        onVendorAdded(response.data); // Notify parent of the new vendor
        setVendorName(''); // Clear input
        onClose(); // Close the modal
      } else {
        setError('Failed to add vendor. Please try again.');
      }
    } catch (err: any) {
      console.error('Error adding vendor:', err);
      // More specific error message from backend
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setVendorName(''); // Clear input on close
    setError(null);    // Clear any errors
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Vendor</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="vendorName" className="form-label">Vendor Name:</label>
            <input
              type="text"
              id="vendorName"
              className="form-control"
              value={vendorName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setVendorName(e.target.value)}
              disabled={isSubmitting}
              required
              aria-label="Vendor Name"
            />
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
                'Add Vendor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVendorModal;