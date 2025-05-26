import React, { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import api from '../../api';
import '../../css/Modal.css';

interface DropdownItem {
  id: number;
  name: string;
}

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded: (newCategory: { id: number; name: string; vendor: number; parent: number | null }) => void;
  vendors: DropdownItem[]; // List of existing vendors to select from
  selectedVendorId: number | ''; // Pre-selected vendor from the main form
  parentCategories: CategoryTreeItem[]; // Categories to select as parent (filtered by selectedVendorId)
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
  vendors,
  selectedVendorId,
  parentCategories,
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [internalSelectedVendorId, setInternalSelectedVendorId] = useState<number | ''>(selectedVendorId);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update internal vendor selection if the prop changes
  useEffect(() => {
    setInternalSelectedVendorId(selectedVendorId);
  }, [selectedVendorId]);

  // Reset parent category selection if the vendor or parent categories list changes
  useEffect(() => {
    setSelectedParentCategoryId(null);
  }, [selectedVendorId, parentCategories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryName.trim()) {
      setError('Category name cannot be empty.');
      return;
    }
    if (!internalSelectedVendorId) {
      setError('Vendor must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: categoryName.trim(),
        vendor: internalSelectedVendorId,
        parent: selectedParentCategoryId, // null if not selected
      };

      const response = await api.post('/categories/create/', payload);

      if (response.status === 201) {
        onCategoryAdded(response.data); // Notify parent
        setCategoryName(''); // Clear input
        setSelectedParentCategoryId(null); // Clear parent selection
        onClose();
      } else {
        setError('Failed to add category. Please try again.');
      }
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCategoryName('');
    setSelectedParentCategoryId(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  // Helper function to render nested categories as flat options with indentation
  const renderCategoryOptions = (categories: CategoryTreeItem[], level: number = 0): React.ReactNode[] => {
    return categories.flatMap(category => [
      <option key={category.id} value={category.id}>
        {'--'.repeat(level)} {category.name}
      </option>,
      ...renderCategoryOptions(category.children, level + 1)
    ]);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Category</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="mb-3">
            <label htmlFor="categoryName" className="form-label">Category Name:</label>
            <input
              type="text"
              id="categoryName"
              className="form-control"
              value={categoryName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)}
              disabled={isSubmitting}
              required
              aria-label="Category Name"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="categoryVendor" className="form-label">Vendor:</label>
            <select
              id="categoryVendor"
              className="form-select"
              value={internalSelectedVendorId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setInternalSelectedVendorId(Number(e.target.value))}
              disabled={isSubmitting}
              required
              aria-label="Category Vendor"
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
            <label htmlFor="parentCategory" className="form-label">Parent Category (Optional):</label>
            <select
              id="parentCategory"
              className="form-select"
              value={selectedParentCategoryId || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedParentCategoryId(Number(e.target.value) || null)}
              disabled={isSubmitting}
              aria-label="Parent Category"
            >
              <option value="">-- No Parent Category --</option>
              {parentCategories.length === 0 && internalSelectedVendorId !== '' ? (
                <option disabled>No categories for this vendor to be a parent</option>
              ) : (
                renderCategoryOptions(parentCategories)
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
                'Add Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategoryModal;