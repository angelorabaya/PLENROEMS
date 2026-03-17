import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Dialog from '@radix-ui/react-dialog';
import {
  FiSearch as MagnifyingGlassIcon,
  FiPlus as PlusIcon,
  FiEdit2 as Pencil2Icon,
  FiTrash2 as TrashIcon,
  FiX as Cross2Icon,
  FiAlertTriangle as ExclamationTriangleIcon,
  FiCheckCircle as CheckCircledIcon,
  FiCalendar as CalendarIcon,
  FiUser as PersonIcon
} from 'react-icons/fi';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const EmployeeLeavePortal = () => {
  const { isDarkMode } = useTheme();

  // State Declarations
  const [data, setData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  
  // Modals & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Combobox State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [employeeHighlightIndex, setEmployeeHighlightIndex] = useState(0);

  // Pagination & Layout State
  const tableContainerRef = useRef(null);
  const [pageSize, setPageSize] = useState(10);
  const [{ pageIndex }, setPagination] = useState({ pageIndex: 0 });

  const [formData, setFormData] = useState({
    la_controlno: '',
    la_employeeid: '',
    la_leavetypeid: '',
    la_dateoffiling: new Date().toISOString().split('T')[0],
    dates: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [apps, emps, types] = await Promise.all([
        api.getLeaveApplications(),
        api.getLeaveEmployees(),
        api.getLeaveTypes()
      ]);
      setData(apps || []);
      setEmployees(emps || []);
      setLeaveTypes(types || []);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError('Failed to load leave data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update rows based on container height
  useEffect(() => {
    const calculateRows = () => {
      if (tableContainerRef.current) {
        const containerHeight = tableContainerRef.current.clientHeight;
        const headerHeight = 40; 
        const rowHeight = 44; 
        const paginationHeight = 52; 
        
        const availableHeight = containerHeight - headerHeight - paginationHeight - 8;
        const calculatedRows = Math.max(5, Math.floor(availableHeight / rowHeight));
        
        // Safety adjustments to prevent clipping
        const safeRows = calculatedRows - 1;
        setPageSize(Math.max(5, safeRows));
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateRows);
    });

    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }

    // Initial delay to ensure DOM is ready
    const timer = setTimeout(calculateRows, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [isDarkMode]); // Re-calculate if theme changes, just in case borders change

  // Helper Functions
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    return employees.filter(emp =>
      emp.emp_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const handleSelectEmployee = (emp) => {
    setFormData({ ...formData, la_employeeid: emp.emp_ctrlno });
    setEmployeeSearch('');
    setShowEmployeeSuggestions(false);
  };

  const calculateTotalDays = (dates) => {
    return dates.reduce((total, date) => total + (date.lad_ishalfday ? 0.5 : 1), 0);
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setCurrentRecord(record);
      setFormData({
        la_controlno: record.la_controlno || '',
        la_employeeid: record.la_employeeid,
        la_leavetypeid: record.la_leavetypeid,
        la_dateoffiling: record.la_dateoffiling ? new Date(record.la_dateoffiling).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dates: record.dates?.length ? [...record.dates] : []
      });
    } else {
      setCurrentRecord(null);
      setFormData({
        la_controlno: '',
        la_employeeid: '',
        la_leavetypeid: '',
        la_dateoffiling: new Date().toISOString().split('T')[0],
        dates: [{ lad_specificdate: new Date().toISOString().split('T')[0], lad_ishalfday: false }]
      });
    }
    setIsModalOpen(true);
    setFormError(null);
  };

  // Add more dynamic date row
  const handleAddDateRow = () => {
    setFormData(prev => ({
      ...prev,
      dates: [...prev.dates, { lad_specificdate: new Date().toISOString().split('T')[0], lad_ishalfday: false }]
    }));
  };

  const handleUpdateDateRow = (index, field, value) => {
    const newDates = [...formData.dates];
    newDates[index] = { ...newDates[index], [field]: value };
    setFormData({ ...formData, dates: newDates });
  };

  const handleRemoveDateRow = (index) => {
    const newDates = [...formData.dates];
    newDates.splice(index, 1);
    setFormData({ ...formData, dates: newDates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFormError(null);

      // Validate dates
      if (!formData.dates || formData.dates.length === 0) {
        throw new Error("At least one leave date must be specified.");
      }

      const totalDays = calculateTotalDays(formData.dates);
      
      const payload = {
        la_controlno: formData.la_controlno,
        la_employeeid: parseInt(formData.la_employeeid),
        la_leavetypeid: parseInt(formData.la_leavetypeid),
        la_dateoffiling: formData.la_dateoffiling,
        la_totaldaysapplied: totalDays,
        dates: formData.dates
      };

      if (currentRecord) {
        await api.updateLeaveApplication(currentRecord.la_ctrlno, payload);
      } else {
        await api.createLeaveApplication(payload);
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save Error:', err);
      setFormError(err.message || 'Failed to save leave application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSaving(true);
      setFormError(null);
      await api.deleteLeaveApplication(currentRecord.la_ctrlno);
      await fetchData();
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Delete Error:', err);
      setFormError(err.message || 'Failed to delete leave application.');
    } finally {
      setIsSaving(false);
    }
  };

  // Table Columns Setup
  const columns = useMemo(() => [
    {
      accessorKey: 'la_controlno',
      header: 'Control No.',
      cell: info => <span className="font-mono text-gray-600 dark:text-gray-300">{info.getValue() || '-'}</span>
    },
    {
      accessorKey: 'emp_name',
      header: 'Employee Name',
      cell: info => <span className="font-medium text-blue-600 dark:text-blue-400">{info.getValue()}</span>
    },
    {
      accessorKey: 'lt_typename',
      header: 'Leave Type'
    },
    {
      accessorKey: 'la_dateoffiling',
      header: 'Date of Filing',
      cell: info => new Date(info.getValue()).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })
    },
    {
      accessorKey: 'la_totaldaysapplied',
      header: 'Total Days',
      cell: info => <span className="font-semibold">{Number(info.getValue())}</span>
    },
    {
        id: 'date_range',
        header: 'Applied Dates',
        cell: info => {
            const dates = info.row.original.dates;
            if(!dates || dates.length === 0) return <span className="text-gray-400 italic">No dates</span>;
            
            // Sort dates chronologically
            const sorted = [...dates].sort((a,b) => new Date(a.lad_specificdate) - new Date(b.lad_specificdate));
            
            // Create an object with the formatted date and halfday status
            const formattedDates = sorted.map(d => ({
                dateStr: new Date(d.lad_specificdate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }),
                isHalfDay: d.lad_ishalfday
            }));
            
            return (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {formattedDates.map((item, index) => (
                        <span 
                            key={index} 
                            className={`px-2 py-0.5 rounded text-xs border ${
                                item.isHalfDay 
                                ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' 
                                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#2a3441] dark:text-gray-300 dark:border-gray-700'
                            }`}
                        >
                            {item.dateStr} {item.isHalfDay && <span className="text-[10px] font-semibold opacity-80">(Half)</span>}
                        </span>
                    ))}
                </div>
            );
        }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <button
            onClick={() => {
                setCurrentRecord(row.original);
                setIsDetailModalOpen(true);
            }}
            className="action-button view"
            title="View Details"
            >
            <MagnifyingGlassIcon />
            </button>
          <button
            onClick={() => handleOpenModal(row.original)}
            className="action-button edit"
            title="Edit"
          >
            <Pencil2Icon />
          </button>
          <button
            onClick={() => {
              setCurrentRecord(row.original);
              setFormError(null);
              setIsDeleteModalOpen(true);
            }}
            className="action-button delete"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          Employee Leave Portal
        </h1>
        <div className="page-actions">
          <div className="search-container">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search applications..."
            />
          </div>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <PlusIcon /> New Leave Application
          </button>
        </div>
      </div>

      <div className="table-wrapper" ref={tableContainerRef}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading leave applications...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 m-4 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon />
            {error}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-[#343e5a]' : ''}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <span className="text-blue-500">↑</span>,
                          desc: <span className="text-blue-500">↓</span>,
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="empty-state">
                    No leave applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && data.length > 0 && (
        <div className="pagination">
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary text-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
            <button
              className="btn btn-secondary text-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </button>
            <button
              className="btn btn-secondary text-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </button>
            <button
              className="btn btn-secondary text-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </button>
          </div>
          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <div>Page</div>
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </span>
        </div>
      )}

      {/* Form Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content max-w-2xl">
            <div className="dialog-header">
              <Dialog.Title className="dialog-title">
                {currentRecord ? 'Edit Leave Application' : 'New Leave Application'}
              </Dialog.Title>
              <Dialog.Close className="dialog-close">
                <Cross2Icon />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="dialog-body">
              {formError && (
                <div className="alert alert-error mb-4">
                  <ExclamationTriangleIcon />
                  <p>{formError}</p>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label>Control No.</label>
                  <input
                    type="text"
                    className="form-input w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                    value={formData.la_controlno}
                    onChange={(e) => setFormData({ ...formData, la_controlno: e.target.value })}
                    placeholder="Enter control number (optional)"
                    style={{
                        padding: '8px 12px',
                        height: '42px',
                        lineHeight: '1.5'
                    }}
                  />
                </div>

                <div className="form-group col-span-2 sm:col-span-1 relative">
                  <label>Employee <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="form-input w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                    value={showEmployeeSuggestions ? employeeSearch : (employees.find(e => String(e.emp_ctrlno) === String(formData.la_employeeid))?.emp_name || '')}
                    onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setShowEmployeeSuggestions(true);
                        setEmployeeHighlightIndex(0);
                        if (!e.target.value) {
                             setFormData({...formData, la_employeeid: ''});
                        }
                    }}
                    onFocus={() => {
                        setEmployeeSearch('');
                        setShowEmployeeSuggestions(true);
                        setEmployeeHighlightIndex(0);
                    }}
                    onBlur={() => {
                        // Delay hide to allow click to register
                        setTimeout(() => {
                            setShowEmployeeSuggestions(false);
                            if (!formData.la_employeeid) {
                                setEmployeeSearch('');
                            }
                        }, 200);
                    }}
                    onKeyDown={(e) => {
                         if (!showEmployeeSuggestions || filteredEmployees.length === 0) return;
                         if (e.key === 'ArrowDown') {
                             e.preventDefault();
                             setEmployeeHighlightIndex(prev => prev < filteredEmployees.length - 1 ? prev + 1 : 0);
                         } else if (e.key === 'ArrowUp') {
                             e.preventDefault();
                             setEmployeeHighlightIndex(prev => prev > 0 ? prev - 1 : filteredEmployees.length - 1);
                         } else if (e.key === 'Enter') {
                             e.preventDefault();
                             if (employeeHighlightIndex >= 0 && employeeHighlightIndex < filteredEmployees.length) {
                                  handleSelectEmployee(filteredEmployees[employeeHighlightIndex]);
                             }
                         } else if (e.key === 'Escape') {
                             setShowEmployeeSuggestions(false);
                         }
                    }}
                    placeholder="Search employee..."
                    required={!formData.la_employeeid}
                    style={{
                        padding: '8px 12px',
                        height: '42px',
                        lineHeight: '1.5'
                    }}
                  />
                  {showEmployeeSuggestions && (
                      <ul className="absolute z-[9999] w-full bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-[#374151] rounded-md shadow-lg max-h-60 overflow-y-auto mt-1" style={{ top: '100%', left: 0 }}>
                          {filteredEmployees.length > 0 ? (
                              filteredEmployees.map((emp, idx) => (
                                  <li 
                                    key={emp.emp_ctrlno}
                                    className={`px-3 py-2 cursor-pointer text-sm ${idx === employeeHighlightIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-[#374151]`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); 
                                        handleSelectEmployee(emp);
                                    }}
                                    onMouseEnter={() => setEmployeeHighlightIndex(idx)}
                                  >
                                      {emp.emp_name}
                                  </li>
                              ))
                          ) : (
                              <li className="px-3 py-2 text-sm text-gray-500 italic">No employees found</li>
                          )}
                      </ul>
                  )}
                </div>

                <div className="form-group col-span-2 sm:col-span-1">
                  <label>Leave Type <span className="text-red-500">*</span></label>
                  <select
                    className="form-input w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                    value={formData.la_leavetypeid}
                    onChange={(e) => setFormData({ ...formData, la_leavetypeid: e.target.value })}
                    required
                    style={{
                        padding: '8px 12px',
                        height: '42px',
                        lineHeight: '1.5'
                    }}
                  >
                    <option className="text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]" value="">Select Leave Type...</option>
                    {leaveTypes.map(type => (
                      <option className="text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]" key={type.lt_leavetypeid} value={type.lt_leavetypeid}>
                        {type.lt_typename}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group col-span-2 sm:col-span-1">
                  <label>Date of Filing <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.la_dateoffiling}
                    onChange={(e) => setFormData({ ...formData, la_dateoffiling: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group col-span-2 sm:col-span-1 flex flex-col justify-end">
                  <div className="bg-gray-50 dark:bg-[#1a2235] rounded-md p-3 border border-gray-200 dark:border-[#2a3441] flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Calculated Days:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{calculateTotalDays(formData.dates)}</span>
                  </div>
                </div>

              </div>

              {/* Dates Section */}
              <div className="mt-6 border-t border-gray-200 dark:border-[#2a3441] pt-4">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Specific Dates Applied</h3>
                     <button 
                       type="button" 
                       onClick={handleAddDateRow}
                       className="btn btn-secondary text-xs py-1"
                     >
                         <PlusIcon className="w-3 h-3"/> Add Date
                     </button>
                 </div>
                 
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                     {formData.dates.map((dateObj, index) => (
                         <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-gray-50 dark:bg-[#1a2235] p-3 rounded-md border border-gray-200 dark:border-[#2a3441]">
                             <div className="flex-1 w-full sm:w-auto">
                                 <input
                                    type="date"
                                    className="form-input"
                                    value={dateObj.lad_specificdate.split('T')[0]} // Handle potential datetime strings from API vs simple 'yyyy-MM-dd' strings
                                    onChange={(e) => handleUpdateDateRow(index, 'lad_specificdate', e.target.value)}
                                    required
                                 />
                             </div>
                             <div className="flex items-center gap-2">
                                 <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-[#20293a] px-3 py-2 rounded border border-gray-300 dark:border-[#374151]">
                                     <input 
                                       type="checkbox" 
                                       className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#1a2235] dark:border-[#4b5563]"
                                       checked={dateObj.lad_ishalfday}
                                       onChange={(e) => handleUpdateDateRow(index, 'lad_ishalfday', e.target.checked)}
                                     />
                                     <span className="text-sm text-gray-600 dark:text-gray-300">Half Day</span>
                                 </label>
                             </div>
                             <button
                               type="button"
                               onClick={() => handleRemoveDateRow(index)}
                               disabled={formData.dates.length === 1}
                               className={`p-2 rounded flex-shrink-0 ${formData.dates.length === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                             >
                                 <TrashIcon className="w-5 h-5"/>
                             </button>
                         </div>
                     ))}
                 </div>
              </div>


              <div className="dialog-footer mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Application'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content max-w-md">
            <div className="dialog-header">
              <Dialog.Title className="dialog-title text-red-600 dark:text-red-400 flex items-center gap-2">
                <ExclamationTriangleIcon width={20} height={20} />
                Confirm Deletion
              </Dialog.Title>
              <Dialog.Close className="dialog-close">
                <Cross2Icon />
              </Dialog.Close>
            </div>
            
            <div className="dialog-body">
              {formError && (
                <div className="alert alert-error mb-4">
                  <ExclamationTriangleIcon />
                  <p>{formError}</p>
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete the leave application for <strong className="text-gray-900 dark:text-white">{currentRecord?.emp_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This will also delete the {currentRecord?.dates?.length} specific valid dates attached to this application. This action cannot be undone.
              </p>
            </div>

            <div className="dialog-footer">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Detail View Modal */}
       <Dialog.Root open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content max-w-2xl">
            <div className="dialog-header border-b pb-4 mb-4 border-gray-200 dark:border-[#2a3441]">
              <Dialog.Title className="dialog-title flex items-center gap-2">
                <PersonIcon className="w-5 h-5 text-blue-500" />
                Leave Application Details
              </Dialog.Title>
              <Dialog.Close className="dialog-close">
                <Cross2Icon />
              </Dialog.Close>
            </div>
            
            <div className="dialog-body">
              {currentRecord && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 dark:bg-[#1a2235] dark:border-[#2a3441] p-4 rounded-lg">
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Control No.</span>
                            <span className="text-gray-900 dark:text-gray-100 font-mono">{currentRecord.la_controlno || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Employee Name</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{currentRecord.emp_name}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Leave Type</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{currentRecord.lt_typename}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Date OF Filing</span>
                            <span className="text-gray-900 dark:text-gray-100">{new Date(currentRecord.la_dateoffiling).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Total Days</span>
                            <span className="text-gray-900 dark:text-gray-100 font-semibold text-blue-600 dark:text-blue-400 text-lg">{Number(currentRecord.la_totaldaysapplied)}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-[#2a3441] pb-2">
                           <CalendarIcon /> Specifically Applied Dates
                        </h4>
                        
                        {currentRecord.dates && currentRecord.dates.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                                {currentRecord.dates.map((dateObj, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-[#20293a] border border-gray-200 dark:border-[#374151] p-2 rounded">
                                        <span className="text-gray-800 dark:text-gray-200">{new Date(dateObj.lad_specificdate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${dateObj.lad_ishalfday ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                            {dateObj.lad_ishalfday ? 'Half Day' : 'Full Day'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No specific dates recorded.</p>
                        )}
                    </div>
                </div>
              )}
            </div>
            
            <div className="dialog-footer pt-4 mt-4 border-t border-gray-200 dark:border-[#2a3441]">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
};

export default EmployeeLeavePortal;
