import { useEffect, useState, useMemo, useCallback, type ChangeEvent } from 'react';
import Layout from '../base/BaseLayout';
import api from '../../api';
import TagTree from '../Aux/TagTree';
import { useNavigate } from 'react-router-dom';
import '../../css/BrowseCommands.css';
import { toast } from 'react-toastify';

import ExportCommandsModal from '../modals/ExportCommandsModal';

// Interfaces and types import
import type {
  Command,
  DropdownItem,
  TagTreeItem,
  PagedResponse,
  filter_input_values,
  FilterName
} from '../../types/index';
import { exportCommandsToFile } from '../../utils/exportUtils'; 


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


const useDebounceSearch = (search_term: string, delay: number = 500): string => {
  const [debounced_value, set_debounce_value] = useState<string>(search_term);
  
  useEffect(()=> {
    const handler = setTimeout(() => {
      set_debounce_value(search_term);
    }, delay);

    return () => clearTimeout(handler);
  }, [search_term, delay]);

  return debounced_value
};

const useSearchParams = (filter_input_values: filter_input_values, debounced_search_term: string): Record<string, string> => {
  return useMemo(() => {
    const params: Record<string, string> = {};

    if(debounced_search_term.trim()) {
      params.search = debounced_search_term.trim();
    }

    Object.entries(filter_input_values).forEach(([key, value]) => {
      if(value && value.trim()) {
        params[key] = value.trim();
      }
    });

    return params;
  }, [filter_input_values, debounced_search_term]);
};

const BrowseCommands = () => {
  const navigate = useNavigate();

  const [commands, setCommands] = useState<Command[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState<boolean>(true);
  const [loadingCommands, setLoadingCommands] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);

  // States for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCommands, setTotalCommands] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // States for dropdown data
  const [vendors, setVendors] = useState<DropdownItem[]>([]);
  const [platforms, setPlatforms] = useState<DropdownItem[]>([]);
  const [tagTree, setTagTree] = useState<TagTreeItem[]>([]);

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  // State for search and filter
  const [search_term, set_search_term] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // States for selected commands
  const [selectedCommandIds, setSelectedCommandIds] = useState<Set<number>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  
  const [filter_input_values, set_filter_input_values] = useState({
    vendor__name: '',
    platform__name: '',
    tag__name: '',
    version: '',
  });



  const debounced_search_term = useDebounceSearch(search_term);
  const searchParams = useSearchParams(filter_input_values, debounced_search_term);

  const fetchCommands = useCallback(async (page: number = 1, size: number = 10, params: Record<string, string | number> = {}) => {
    setLoadingCommands(true);

    const queryParams: Record<string, string | number> = {
      page: page.toString(),
      page_size: size.toString(),
      ...params
    };

    try {
      const response = await api.get<PagedResponse<Command>>('/commands/get-filtered/', { params: queryParams });
      setCommands(response.data.results);
      setTotalCommands(response.data.count);
      setTotalPages(Math.ceil(response.data.count / size));
      setCurrentPage(page);
    }
    catch (err: any) {
      printErrors(err);
      setCommands([]);
      setTotalCommands(0);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoadingCommands(false);
    }
  }, []);

  // Helper function to build current filter params
  const getCurrentFilterParams = useCallback(() => {
    const params: Record<string, string | number> = {};

    if (debounced_search_term.trim()) {
      params.search = debounced_search_term.trim();
    }

    if (filter_input_values.vendor__name.trim()) {
      params.vendor__name = filter_input_values.vendor__name.trim();
    }
    if (filter_input_values.platform__name.trim()) {
      params.platform__name = filter_input_values.platform__name.trim();
    }
    if (filter_input_values.tag__name.trim()) {
      params.tag__name = filter_input_values.tag__name.trim();
    }
    if (filter_input_values.version.trim()) {
      params.version = filter_input_values.version.trim();
    }

    return params;
  }, [debounced_search_term, filter_input_values]);

  const fetchDependentDropdowns = useCallback(async (vendorId: number | '') => {
    setDropdownLoading(true); // Always set loading for dependent dropdowns
    try {
      const platform_url = vendorId ? `/platform/get-all/?vendor_id=${vendorId}` : '/platform/get-all/';
      const TagUrl = vendorId ? `/tags/get-all-tree/?vendor_id=${vendorId}` : '/tags/get-all-tree/';

      const [platformRes, tagsRes] = await Promise.all([
        api.get<DropdownItem[]>(platform_url),
        api.get<TagTreeItem[]>(TagUrl),
      ]);

      setPlatforms(platformRes.data);
      setTagTree(tagsRes.data);

      // Keep selected platform if it exists in the new list, otherwise clear
      const currentPlatformName = filter_input_values.platform__name;
      const selectedPlatformExists = platformRes.data.some(platform => platform.name === currentPlatformName);
      if (currentPlatformName && !selectedPlatformExists) {
        set_filter_input_values(prev => ({ ...prev, platform__name: '' }));
      }

      // Keep selected tag if it exists in the new list, otherwise clear
      const selectedTagExists = tagsRes.data.some(cat => cat.name === filter_input_values.tag__name); // Check by name
      if (filter_input_values.tag__name && !selectedTagExists) {
        set_filter_input_values(prev => ({ ...prev, tag__name: '' })); // Clear tag__name
      }

    }
    catch (err) {
      printErrors(err);
      setPlatforms([]); // Clear platforms on error
      setTagTree([]); // Clear tags on error
    }
    finally {
      setDropdownLoading(false);
    }
  }, [filter_input_values.platform__name, filter_input_values.tag__name]); // Depend on relevant filter input values


  const performSearch = useCallback(async(): Promise<void> => {
    setLoadingCommands(true);
    const queryParams: Record<string, string | number> = {
      page: currentPage.toString(),
      page_size: pageSize.toString(),
      ...searchParams
    };

    try{
      const response = await api.get<PagedResponse<Command>>('/commands/get-filtered/', {
        params: queryParams 
      });

      setCommands(response.data.results)
      setTotalCommands(response.data.count);
      setTotalPages(Math.ceil(response.data.count / pageSize));
    }

    catch(err: any){
      printErrors(err);
      setCommands([]);
      setTotalCommands(0);
      setTotalPages(1);
      setCurrentPage(1);
    }

    finally{
      setLoadingCommands(false);
    }
  }, [ currentPage, pageSize, searchParams]);

   const handleSearchTermChange = (e: ChangeEvent<HTMLInputElement>): void => {
    set_search_term(e.target.value);

    // Auto-reset to first page when search changes
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const handleManualSearch = (): void => {
    setCurrentPage(1);
    performSearch();
  };

  const handleFilterChange = (filterName: FilterName) => 
    (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
      const value = e.target.value;
      
      set_filter_input_values(prev => ({
        ...prev,
        [filterName]: value,
      }));

      // Reset to first page when filters change
      if (currentPage !== 1) {
        setCurrentPage(1);
      }

      // Special handling for vendor change
      if (filterName === 'vendor__name') {
        const selectedVendor = vendors.find(v => v.name === value);
        fetchDependentDropdowns(selectedVendor ? selectedVendor.id : '');
        
        // Clear dependent filters
        set_filter_input_values(prev => ({ 
          ...prev, 
          [filterName]: value,
          platform__name: '', 
          tag__name: '' 
        }));
      }
      
      if (tagDropdownOpen) {
        setTagDropdownOpen(false);
      }
    };



  const clearAllFilters = (): void => {
    set_search_term('');
    set_filter_input_values({
      vendor__name: '',
      platform__name: '',
      tag__name: '',
      version: '',
    });
    setCurrentPage(1);
  };

  // Search status component
  const SearchStatus: React.FC = () => {
    const hasActiveSearch = search_term.trim() || 
      Object.values(filter_input_values).some((v: string) => v.trim());
    
    if (!hasActiveSearch) return null;
    
    return (
      <div className="search-status mb-2">
        <small className="text-muted">
          {loadingCommands ? (
            <>Searching...</>
          ) : (
            <>Found {totalCommands} results</>
          )}
          {hasActiveSearch && (
            <button 
              className="btn btn-link btn-sm p-0 ms-2" 
              onClick={clearAllFilters}
              type="button"
            >
              Clear all filters
            </button>
          )}
        </small>
      </div>
    );
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setDropdownLoading(true);
      setLoadingCommands(true);

      try {
        const vendorRes = await api.get<DropdownItem[]>('/vendors/get-all/');
        setVendors(vendorRes.data);

        await fetchDependentDropdowns(''); // Fetch platforms and tags without initial vendor filter
        await fetchCommands(1, pageSize);
        setInitialLoadComplete(true);

      } catch (err) {
        printErrors(err);
      } finally {
        setDropdownLoading(false);
        setLoadingCommands(false);
      }
    };
    fetchInitialData();
  }, []);

  // Use effect for when the user writes or chooses one of the filters
  useEffect(() => {
    if (!initialLoadComplete) return;

    const params = getCurrentFilterParams();
    fetchCommands(currentPage, pageSize, params);
  }, [currentPage, pageSize, initialLoadComplete, fetchCommands, getCurrentFilterParams, debounced_search_term]);

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

  // -------------- Export functions --------------

  const closeExportModal = () => {
    setIsExportModalOpen(false);
  };

  // Function to determine if all selected commands share the same vendor
  const getSingleVendorInfo = useCallback((): string | null => {
    if (selectedCommandIds.size === 0) {
      return null; // No commands selected
    }

    let firstVendor: string | null = null;
    let allSameVendor = true;

    for (const cmdId of selectedCommandIds) {
      const command = commands.find(c => c.id === cmdId);

      if (command) {

        if (firstVendor === null) {
          firstVendor = command.vendor;
        }
        else if (command.vendor !== firstVendor) {
          allSameVendor = false;
          break; // Found different vendor, no need to check further
        }
      }
    }
    return allSameVendor ? firstVendor : null;
  }, [selectedCommandIds, commands]);

  // Function to handle the export decision
  const handleExportClick = useCallback(async () => {
    if (selectedCommandIds.size === 0) {
      toast.error('Please select at least one command to export.');
      return;
    }

    const singleVendorName = getSingleVendorInfo();

    if (singleVendorName !== null) {
      // All selected commands are from the same vendor - bypass modal
      const commandsToExport = Array.from(selectedCommandIds)
        .map(id => commands.find(cmd => cmd.id === id))
        .filter((cmd): cmd is Command => cmd !== undefined);

      const fileName = `${singleVendorName.replace(/\s/g, '_')}_commands.txt`;

      await exportCommandsToFile({
        commandsToExport,
        fileName,
        vendorNameForHeader: singleVendorName, // Pass the vendor name for header logic
        allVendors: vendors, // Pass all vendors
      });

      // Optionally, clear selection after direct export
      setSelectedCommandIds(new Set());
      setAllSelected(false);
    }
    else {
      // Multiple vendors or no commands selected - open modal
      setIsExportModalOpen(true);
    }
  }, [selectedCommandIds, commands, vendors, getSingleVendorInfo]);


  // -------------- Handle functions --------------

  const handleFilterValueChange = (filterName: 'vendor__name' | 'platform__name' | 'version' | 'tag__name') => 
  (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.value;
    set_filter_input_values(prev => ({
      ...prev,
      [filterName]: value,
    }));

    if (filterName === 'vendor__name') {
      const selectedVendor = vendors.find(v => v.name === value);
      fetchDependentDropdowns(selectedVendor ? selectedVendor.id : '');

      // Clear platform and tag selections when vendor changes
      set_filter_input_values(prev => ({ ...prev, platform__name: '', tag__name: '' }));
    }
    
    if (tagDropdownOpen) {
      setTagDropdownOpen(false);
    }
  };

  const handleToggleAdvancedFilters = () => {
    setShowAdvancedFilters(prev => !prev);
    if (showAdvancedFilters) {
      set_filter_input_values({
        vendor__name: '',
        platform__name: '',
        tag__name: '',
        version: '',
      });
    }
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

          <SearchStatus />

          <div className="input-group search-input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search command..."
              value={search_term}
              onChange={handleSearchTermChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualSearch();
                }
              }}
            />

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
                <label htmlFor="vendorSelect" className="form-label mb-0">Vendor:</label>

                {dropdownLoading ? (
                  <select className="form-select form-select-sm" disabled>
                    <option>Loading Vendors...</option>
                  </select>

                ) : (

                  <select
                    id="vendorSelect"
                    className="form-select form-select-sm"
                    value={filter_input_values.vendor__name}
                    onChange={handleFilterChange('vendor__name')}
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

              {/* Platform Filter (Dropdown) */}
              <div className="col-md-6 col-lg-3">
                <label htmlFor="platformSelect" className="form-label mb-0">Platform:</label>
                {dropdownLoading ? (
                  <select className="form-select form-select-sm" disabled>
                    <option>Loading Platforms...</option>
                  </select>
                ) : (
                  <select
                    id="platformSelect"
                    className="form-select form-select-sm"
                    value={filter_input_values.platform__name}
                    onChange={handleFilterChange('platform__name')}
                    disabled={dropdownLoading}
                  >
                    <option value="">--Select Platform--</option>
                    {platforms.length === 0 && filter_input_values.vendor__name !== '' ? (
                      <option disabled>No Platform found for selected vendor</option>
                    ) : (
                      platforms.map(platform => (
                        <option key={platform.id} value={platform.name}>
                          {platform.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Tag Filter (Dropdown using tagTree) */}
              <div className="col-md-6 col-lg-3">
                <label htmlFor="tagFilterDropdown" className="form-label mb-0">Filter by Tag:</label>

                <div className="position-relative">

                  <button
                    id="tagFilterDropdown"
                    className="form-select form-select-sm text-start"
                    type="button"
                    onClick={() => setTagDropdownOpen(prev => !prev)}
                    disabled={dropdownLoading}
                  >
                    {filter_input_values.tag__name || '--Select Tag--'} {/* Display current value */}
                  </button>

                  {tagDropdownOpen && (
                    <div
                      className="dropdown-menu show w-100 mt-1 p-2"
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        zIndex: 1050,
                      }}
                    >
                      {dropdownLoading ? (
                        <div className="dropdown-item text-muted">Loading tags...</div>
                      ) : (
                        <>
                          {/* Default option to clear tag filter */}
                          <button
                            className="dropdown-item"
                            onClick={() => handleFilterValueChange('tag__name')({ target: { value: '' } } as ChangeEvent<HTMLSelectElement>)}
                            style={{ fontWeight: filter_input_values.tag__name === '' ? 'bold' : 'normal' }}
                          >
                            -- Select Tag --
                          </button>
                          {tagTree.length === 0 && filter_input_values.vendor__name !== '' ? (
                            <div className="dropdown-item text-muted">No tags found for selected vendor.</div>
                          ) : (
                            <TagTree
                              nodes={tagTree}
                              // Instead of selectedId, you might need to pass the selectedName for styling
                              selectedId={tagTree.find(tag => tag.name === filter_input_values.tag__name)?.id || null}
                              onSelect={(_id, name) => {
                                handleFilterValueChange('tag__name')({ target: { value: name } } as ChangeEvent<HTMLSelectElement>);
                                setTagDropdownOpen(false); // Close after selection
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Version Filter */}
              <div className="col-md-6 col-lg-3">

                <label htmlFor="versionInput" className="form-label mb-0">Version:</label>
                <input
                  id="versionInput"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g., 15.5.6"
                  value={filter_input_values.version}
                  onChange={handleFilterChange('version')}
                />
              </div>
            </div>
          )}
        </div>

        {/* --- Export Button Section --- */}
        <div className="d-flex align-items-center mb-3 gap-2">
          <button
            className="btn btn-success"
            onClick={handleExportClick}
            disabled={selectedCommandIds.size === 0}
          >
            Export Selected Commands({selectedCommandIds.size}) to .txt
            <i className="bi bi-download ms-2"></i>
          </button>

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
                <th>Version</th>
                <th>Tag</th>
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
                    <td>{command.version || 'N/A'}</td>
                    <td>{command.tag || 'N/A'}</td>
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

        {/* Export modal */}
        <ExportCommandsModal
          isOpen={isExportModalOpen}
          onClose={closeExportModal}
          commands={commands}
          selectedCommandIds={selectedCommandIds}
          vendors={vendors}
        />
      </div>
    </Layout>
  )
}

export default BrowseCommands;