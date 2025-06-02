import React, { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../../css/Modal.css';

import type { Command, DropdownItem } from '../../types'; // Import for the interfaces
import { exportCommandsToFile } from '../../utils/exportUtils';

interface ExportCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[]; // All commands from the page
  selectedCommandIds: Set<number>; // Selected command IDs
  vendors: DropdownItem[]; // Pass the list of available vendors
}

const ExportCommandsModal: React.FC<ExportCommandsModalProps> = ({ 
  isOpen, 
  onClose, 
  commands, 
  selectedCommandIds, 
  vendors 
}) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (selectedCommandIds.size === 0) {
        toast.error('No commands selected for export.');
        onClose(); // Close modal if no commands are selected
        return;
      }

      let commandsToExport: Command[] = Array.from(selectedCommandIds)
        .map(id => commands.find(cmd => cmd.id === id))
        .filter((cmd): cmd is Command => cmd !== undefined);

      let fileName = 'selected_commands.txt';
      let vendorNameForHeader: string | undefined; // This will be passed to the helper

      if (selectedVendorId !== null) {
        const selectedVendor = vendors.find(v => v.id === selectedVendorId);

        if (selectedVendor) {
          // Filter commands specific to the selected vendor
          commandsToExport = commandsToExport.filter(cmd => cmd.vendor === selectedVendor.name);
          
          fileName = `${selectedVendor.name.replace(/\s/g, '_')}_commands.txt`;
          vendorNameForHeader = selectedVendor.name; // Set for helper
        }
        else {
          // This case should ideally not happen if vendors array is accurate
          toast.error('Selected vendor not found.');
          return;
        }
      }

      if (commandsToExport.length === 0) {
        toast.warn('No commands found for export with the selected filter.');
        return; // Don't proceed if no commands after filtering
      }

      // Call the centralized export helper
      const success = await exportCommandsToFile({
        commandsToExport,
        fileName,
        vendorNameForHeader, // Pass the vendor name for header logic
        allVendors: vendors, // Pass all vendors for lookup in helper
      });

      if (success) {
        onClose(); // Close modal on successful export
      }
    }
    catch (error) {
      toast.error('An unexpected error occurred during export.');
      console.error('Export error:', error);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleVendorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedVendorId(value === '' ? null : Number(value));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Export Options</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="vendorSelectExport" className="form-label">
              Select Vendor (Optional):
            </label>
            <select
              id="vendorSelectExport"
              className="form-control"
              value={selectedVendorId === null ? '' : selectedVendorId}
              onChange={handleVendorChange}
              disabled={isSubmitting}
            >
              <option value="">-- Export All Selected Commands --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <small className="form-text text-muted">
              The commands you selected have different vendors, make sure you want to export the commands. Select a main vendor if needed.
            </small>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
            >
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