import React, { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import '../../css/Modal.css';


interface DropdownItem {
  id: number;
  name: string;
}

interface ExportCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: DropdownItem[]; // Pass the list of available vendors
  onConfirmExport: (selectedVendorId: number | null) => void; // Callback with selected vendor ID
}

const ExportCommandsModal: React.FC<ExportCommandsModalProps> = ({ isOpen, onClose, vendors, onConfirmExport }) => {
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedVendorId(null); // No vendor pre-selected
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // You might want to add a small delay or a toast here if actions are asynchronous
    // For now, we'll just call onConfirmExport and let the parent handle the actual export
    onConfirmExport(selectedVendorId);
    // No need to set isSubmitting to false immediately here if parent is handling async export
    // The parent should close the modal when export is done.
  };

  const handleVendorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedVendorId(value === '' ? null : Number(value));
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Export Options</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="vendorSelectExport" className="form-label">Select Vendor (Optional):</label>
            <select
              id="vendorSelectExport"
              className="form-control"
              value={selectedVendorId === null ? '' : selectedVendorId}
              onChange={handleVendorChange}
              disabled={isSubmitting}
            >
              <option value="">-- No Specific Vendor --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span className="ms-2">Exporting...</span>
                </>
              ) : (
                'Export Commands'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportCommandsModal;