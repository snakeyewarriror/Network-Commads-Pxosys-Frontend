import { useEffect, useState, type ChangeEvent, useCallback } from 'react';
import Layout from '../base/BaseLayout';
import api from '../../api';
import CategoryTree from '../Aux/CategoryTree';
import { useNavigate } from 'react-router-dom';
import '../../css/BrowseCommands.css';
import { toast } from 'react-toastify';

interface Command {
  id: number;
  command: string;
  description: string | null;
  example: string | null;
  version: string | null;
  vendor: string;
  os: string | null;
  category: string | null;
}

interface DropdownItem {
  id: number;
  name: string;
}

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function printErrors(err: any) {
  console.error('Error fetching data:', err);
  if (err.response) {
    toast.error(`Failed to fetch data: ${err.response.status} - ${err.response.data.detail || JSON.stringify(err.response.data)}`);
  } else if (err.request) {
    toast.error('Network Error: No response from server. Check network connection.');
  } else {
    toast.error(`An unexpected error occurred: ${err.message}`);
  }
}

const BrowseCommands = () => {
  const navigate = useNavigate();

  const [commands, setCommands] = useState<Command[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState<boolean>(true);
  const [loadingCommands, setLoadingCommands] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false); // NEW

  // States for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCommands, setTotalCommands] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // States for dropdown data
  const [vendors, setVendors] = useState<DropdownItem[]>([]);
  const [oss, setOss] = useState<DropdownItem[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeItem[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // States for selected commands
  const [selectedCommandIds, setSelectedCommandIds] = useState<Set<number>>(new Set());

  // States for individual filter checkboxes and their input values
  const [activeFilters, setActiveFilters] = useState({
    vendor__name: false,
    os__name: false,
    category__name: false,
    version: false,
  });

  const [filterInputValues, setFilterInputValues] = useState({
    vendor__name: '',
    os__name: '',
    version: '',
  });

  // FIXED: Removed dependencies that cause frequent re-creation
  const fetchCommands = useCallback(async (page: number = 1, size: number = 10, params: Record<string, string | number> = {}) => {
    setLoadingCommands(true);

    const queryParams: Record<string, string | number> = {
      page: page.toString(),
      page_size: size.toString(),
      ...params // Accept external params to avoid dependency issues
    };

    try {
      const response = await api.get<PagedResponse<Command>>('/commands/get-filtered/', { params: queryParams });
      setCommands(response.data.results);
      setTotalCommands(response.data.count);
      setTotalPages(Math.ceil(response.data.count / size));
      setCurrentPage(page);
    } catch (err: any) {
      printErrors(err);
      setCommands([]);
      setTotalCommands(0);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoadingCommands(false);
    }
  }, []); // Minimal dependencies

  // Helper function to build current filter params
  const getCurrentFilterParams = useCallback(() => {
    const params: Record<string, string | number> = {};

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (activeFilters.vendor__name && filterInputValues.vendor__name.trim()) {
      params.vendor__name = filterInputValues.vendor__name.trim();
    }
    if (activeFilters.os__name && filterInputValues.os__name.trim()) {
      params.os__name = filterInputValues.os__name.trim();
    }
    if (activeFilters.category__name && selectedCategoryName.trim() && selectedCategoryId !== null) {
      params.category__name = selectedCategoryName.trim();
    }
    if (activeFilters.version && filterInputValues.version.trim()) {
      params.version = filterInputValues.version.trim();
    }

    return params;
  }, [searchTerm, activeFilters, filterInputValues, selectedCategoryName, selectedCategoryId]);

  const fetchDependentDropdowns = useCallback(async (vendorId: number | '') => {
    if (vendorId !== '') {
      setDropdownLoading(true);
    }
    try {
      const osUrl = vendorId ? `/os/get-all/?vendor_id=${vendorId}` : '/os/get-all/';
      const categoryUrl = vendorId ? `/categories/get-all-tree/?vendor_id=${vendorId}` : '/categories/get-all-tree/';

      const [osRes, categoriesRes] = await Promise.all([
        api.get<DropdownItem[]>(osUrl),
        api.get<CategoryTreeItem[]>(categoryUrl),
      ]);

      setOss(osRes.data);
      setCategoryTree(categoriesRes.data);

      const selectedOsExists = osRes.data.some(os => os.name === filterInputValues.os__name);
      if (filterInputValues.os__name && !selectedOsExists) {
        setFilterInputValues(prev => ({ ...prev, os__name: '' }));
      }
      const selectedCategoryExists = categoriesRes.data.some(cat => cat.id === selectedCategoryId);
      if (selectedCategoryId !== null && !selectedCategoryExists) {
        setSelectedCategoryId(null);
        setSelectedCategoryName('');
      }

    } catch (err) {
      printErrors(err);
      setOss([]);
      setCategoryTree([]);
    } finally {
      if (vendorId !== '') {
        setDropdownLoading(false);
      }
    }
  }, [filterInputValues.os__name, selectedCategoryId]);

  // FIXED: Single initial fetch effect
  useEffect(() => {
    const fetchInitialData = async () => {
      setDropdownLoading(true);
      setLoadingCommands(true);

      try {
        const vendorRes = await api.get<DropdownItem[]>('/vendors/get-all/');
        setVendors(vendorRes.data);

        await fetchDependentDropdowns('');
        await fetchCommands(1, pageSize);
        setInitialLoadComplete(true); // Mark initial load as complete

      } catch (err) {
        printErrors(err);
      } finally {
        setDropdownLoading(false);
        setLoadingCommands(false);
      }
    };
    fetchInitialData();
  }, []); // Only run once on mount

  // FIXED: Separate effect for pagination that only runs after initial load
  useEffect(() => {
    if (!initialLoadComplete) return; // Don't run until initial load is complete
    
    const params = getCurrentFilterParams();
    fetchCommands(currentPage, pageSize, params);
  }, [currentPage, pageSize, initialLoadComplete, fetchCommands, getCurrentFilterParams]);

  const handleSearchTermChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCheckboxChange = (filterName: keyof typeof activeFilters) => (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: checked,
    }));

    if (!checked) {
      if (filterName === 'category__name') {
        setSelectedCategoryId(null);
        setSelectedCategoryName('');
        setCategoryDropdownOpen(false);
      } else {
        setFilterInputValues(prev => ({
          ...prev,
          [filterName]: '',
        }));
        if (filterName === 'vendor__name') {
          fetchDependentDropdowns('');
        }
      }
    }
  };

  const handleSelectAllChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAllSelected(checked);

    if (checked) {
      const allIds = commands.map(cmd => cmd.id);
      setSelectedCommandIds(new Set(allIds));
    } else {
      setSelectedCommandIds(new Set());
    }
  };

  const handleSingleCommandSelect = (commandId: number, e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSelectedCommandIds(prevSelected => {
      const newSet = new Set(prevSelected);
      if (isChecked) {
        newSet.add(commandId);
      } else {
        newSet.delete(commandId);
      }
      setAllSelected(newSet.size === commands.length && commands.length > 0 && commands.every(cmd => newSet.has(cmd.id)));
      return newSet;
    });
  };

  const handleExportCommands = () => {
    if (selectedCommandIds.size === 0) {
      toast.error('Please select at least one command to export.');
      return;
    }

    const selectedCommandsText = commands
      .filter(cmd => selectedCommandIds.has(cmd.id))
      .map(cmd => cmd.command)
      .join('\n');

    const blob = new Blob([selectedCommandsText], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'selected_commands.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleFilterValueChange = (filterName: 'vendor__name' | 'os__name' | 'version') => (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.value;
    setFilterInputValues(prev => ({
      ...prev,
      [filterName]: value,
    }));

    if (filterName === 'vendor__name') {
      const selectedVendor = vendors.find(v => v.name === value);
      fetchDependentDropdowns(selectedVendor ? selectedVendor.id : '');
    }
  };

  const handleCategorySelect = (id: number, name: string) => {
    setSelectedCategoryId(id);
    setSelectedCategoryName(name);
    setActiveFilters(prev => ({ ...prev, category__name: true }));
    setCategoryDropdownOpen(false);
  };

  const handleSearchButtonClick = () => {
    setCurrentPage(1);
    const params = getCurrentFilterParams();
    fetchCommands(1, pageSize, params);
  };

  const handleToggleAdvancedFilters = () => {
    setShowAdvancedFilters(prev => !prev);
  };

  const handleUploadCommandsCSVClick = () => {
    navigate('/upload-commands-csv');
  };

  const handleAddNewCommand = () => {
    navigate('/add-command');
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <Layout title="Pxosys">
      <div className="browse-commands-container">
        <h2 className="text-center">Browse Commands</h2>

        <div className="search-filter-card">
          <div className="input-group search-input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search command..."
              value={searchTerm}
              onChange={handleSearchTermChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchButtonClick();
                }
              }}
            />
            <button className="btn btn-primary" type="button" onClick={handleSearchButtonClick}>
              Search
            </button>
            <button
              className={`btn btn-secondary ms-2 toggle-filters-btn ${showAdvancedFilters ? 'active' : ''}`}
              type="button"
              onClick={handleToggleAdvancedFilters}
              title="Toggle Advanced Filters"
            >
              <i className={"bi bi-list"}></i>
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="advanced-filters-section row g-2">
              {/* Vendor Filter (Dropdown) */}
              <div className="col-md-6 col-lg-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="filterVendor"
                    checked={activeFilters.vendor__name}
                    onChange={handleCheckboxChange('vendor__name')}
                  />
                  <label className="form-check-label" htmlFor="filterVendor">
                    Vendor:
                  </label>
                </div>
                {dropdownLoading ? (
                  <select className="form-select form-select-sm" disabled>
                    <option>Loading Vendors...</option>
                  </select>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value={filterInputValues.vendor__name}
                    onChange={handleFilterValueChange('vendor__name')}
                    disabled={!activeFilters.vendor__name}
                  >
                    <option value="">--Select Vendor--</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.name}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* OS Filter (Dropdown) */}
              <div className="col-md-6 col-lg-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="filterOS"
                    checked={activeFilters.os__name}
                    onChange={handleCheckboxChange('os__name')}
                  />
                  <label className="form-check-label" htmlFor="filterOS">
                    OS:
                  </label>
                </div>
                {dropdownLoading ? (
                  <select className="form-select form-select-sm" disabled>
                    <option>Loading OSes...</option>
                  </select>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value={filterInputValues.os__name}
                    onChange={handleFilterValueChange('os__name')}
                    disabled={!activeFilters.os__name}
                  >
                    <option value="">--Select OS--</option>
                    {oss.length === 0 && activeFilters.vendor__name && filterInputValues.vendor__name !== '' ? (
                      <option disabled>No OS found for selected vendor</option>
                    ) : (
                      oss.map(os => (
                        <option key={os.id} value={os.name}>
                          {os.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Category Filter (Dropdown using CategoryTree) */}
              <div className="col-md-6 col-lg-3">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="filterCategory"
                    checked={activeFilters.category__name}
                    onChange={handleCheckboxChange('category__name')}
                  />
                  <label className="form-check-label" htmlFor="filterCategory">
                    Filter by Category
                  </label>
                </div>

                <div className="position-relative">
                  <button
                    className="form-select form-select-sm text-start"
                    style={{ cursor: activeFilters.category__name ? 'pointer' : 'not-allowed' }}
                    type="button"
                    onClick={() => {
                      if (activeFilters.category__name) setCategoryDropdownOpen(prev => !prev);
                    }}
                    disabled={!activeFilters.category__name || dropdownLoading}
                  >
                    {selectedCategoryName || '--Select Category--'}
                  </button>

                  {categoryDropdownOpen && (
                    <div
                      className="dropdown-menu show w-100 mt-1 p-2"
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        zIndex: 1050,
                        pointerEvents: activeFilters.category__name ? 'auto' : 'none',
                        opacity: activeFilters.category__name ? 1 : 0.5,
                      }}
                    >
                      {dropdownLoading ? (
                        <div>Loading Categories...</div>
                      ) : (
                        categoryTree.length === 0 && activeFilters.vendor__name && filterInputValues.vendor__name !== '' ? (
                          <div>No categories found for selected vendor.</div>
                        ) : (
                          <CategoryTree
                            nodes={categoryTree}
                            selectedId={selectedCategoryId}
                            onSelect={handleCategorySelect}
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Version Filter */}
              <div className="col-md-6 col-lg-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="filterVersion"
                    checked={activeFilters.version}
                    onChange={handleCheckboxChange('version')}
                  />
                  <label className="form-check-label" htmlFor="filterVersion">
                    Version:
                  </label>
                </div>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g., 15.5.6"
                  value={filterInputValues.version}
                  onChange={handleFilterValueChange('version')}
                  disabled={!activeFilters.version}
                />
              </div>
            </div>
          )}
        </div>

        {/* --- Export Button Section --- */}
        <div className="d-flex align-items-center mb-3 gap-2">
          {commands.length > 0 && (
            <button
              className="btn btn-success"
              onClick={handleExportCommands}
              disabled={selectedCommandIds.size === 0}
            >
              Export Selected Commands({selectedCommandIds.size}) to .txt
              <i className="bi bi-download ms-2"></i>
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleAddNewCommand}
            title="Add new command"
          >
            Add new command
          </button>

          <button
            className="btn btn-primary"
            onClick={handleUploadCommandsCSVClick}
            title="Upload Commands from CSV"
          >
            Upload Commands from CSV
          </button>
        </div>

        {/* Display Commands Table */}
        <div className="table-responsive">
          <table className="table table-hover table-bordered">
            <thead className="thead-dark">
              <tr>
                <th>Vendor</th>
                <th>Command</th>
                <th>Description</th>
                <th>Example</th>
                <th>Version</th>
                <th>OS</th>
                <th>Category</th>
                <th>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="select-all-commands"
                      checked={allSelected}
                      onChange={handleSelectAllChange}
                      aria-label="Select all commands"
                    />
                    <label className="form-check-label" htmlFor="select-all-commands">
                      Add All
                    </label>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingCommands ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading commands...</span>
                    </div>
                    <p className="mt-2">Loading commands...</p>
                  </td>
                </tr>
              ) : commands.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">No commands found.</td>
                </tr>
              ) : (
                commands.map((command) => (
                  <tr key={command.id}>
                    <td>{command.vendor}</td>
                    <td>{command.command}</td>
                    <td>{command.description || 'N/A'}</td>
                    <td>{command.example || 'N/A'}</td>
                    <td>{command.version || 'N/A'}</td>
                    <td>{command.os || 'N/A'}</td>
                    <td>{command.category || 'N/A'}</td>
                    <td>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedCommandIds.has(command.id)}
                          onChange={(e) => handleSingleCommandSelect(command.id, e)}
                        />
                        <label className="form-check-label" htmlFor={`select-command-${command.id}`}>
                          Add to export
                        </label>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            Total Commands: {totalCommands}
          </div>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) &&
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
          <div className="d-flex align-items-center">
            <label htmlFor="pageSizeSelect" className="form-label mb-0 me-2">Per Page:</label>
            <select
              id="pageSizeSelect"
              className="form-select form-select-sm"
              value={pageSize}
              onChange={handlePageSizeChange}
              style={{ width: 'auto' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BrowseCommands;