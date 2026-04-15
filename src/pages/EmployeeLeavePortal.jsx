import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
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
    FiEye as EyeIcon,
    FiPlus as PlusIcon,
    FiEdit2 as Pencil2Icon,
    FiTrash2 as TrashIcon,
    FiUpload as UploadIcon,
    FiX as Cross2Icon,
    FiAlertTriangle as ExclamationTriangleIcon,
    FiCheckCircle as CheckCircledIcon,
    FiCalendar as CalendarIcon,
    FiUser as PersonIcon,
} from 'react-icons/fi';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import '../components/modals/Modal.css';
import { getUserPermissions } from '../utils/permissions';
import { dateInputToUTCDate, formatDateInputPHT, getTodayPHT } from '../utils/dateUtils';

const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
    const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
    const sanitized = base.replace(/[\\/]*$/, '');
    return `${sanitized}\\`;
};

const EmployeeLeavePortal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useOutletContext();
    const { isDarkMode } = useTheme();
    const restoreState = location.state?.restoreState;
    const previewError = location.state?.previewError;
    const restoredRef = useRef(false);
    const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
        import.meta.env.VITE_ATTACHMENTS_BASE_PATH
    );

    const permissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);

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
    const isAnyDialogOpen = isModalOpen || isDeleteModalOpen || isDetailModalOpen;

    // Combobox State
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
    const [employeeHighlightIndex, setEmployeeHighlightIndex] = useState(0);

    // Pagination & Layout State
    const tableContainerRef = useRef(null);
    const tableHeadRef = useRef(null);
    const [pageSize, setPageSize] = useState(10);
    const [{ pageIndex }, setPagination] = useState({ pageIndex: 0 });
    const [tableWidth, setTableWidth] = useState(0);

    const [formData, setFormData] = useState({
        la_controlno: '',
        la_employeeid: '',
        la_leavetypeid: '',
        la_dateoffiling: getTodayPHT(),
        la_attachment: '',
        dates: [],
    });
    const uploadInputRef = useRef(null);
    const [attachmentExists, setAttachmentExists] = useState(false);
    const [attachmentBusy, setAttachmentBusy] = useState(false);
    const [attachmentMessage, setAttachmentMessage] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [apps, emps, types] = await Promise.all([
                api.getLeaveApplications(),
                api.getLeaveEmployees(),
                api.getLeaveTypes(),
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

    useEffect(() => {
        if (restoredRef.current || !restoreState || loading) return;

        if (typeof restoreState.globalFilter === 'string') {
            setGlobalFilter(restoreState.globalFilter);
        }
        if (Array.isArray(restoreState.sorting)) {
            setSorting(restoreState.sorting);
        }
        if (typeof restoreState.pageSize === 'number') {
            setPageSize(restoreState.pageSize);
        }
        if (typeof restoreState.pageIndex === 'number') {
            setPagination((prev) => ({ ...prev, pageIndex: restoreState.pageIndex }));
        }

        restoredRef.current = true;
    }, [loading, restoreState]);

    useEffect(() => {
        if (!previewError) return;

        setError(previewError);
        const timer = window.setTimeout(() => {
            setError(null);
            navigate(location.pathname, { replace: true, state: { restoreState } });
        }, 3000);

        return () => window.clearTimeout(timer);
    }, [location.pathname, navigate, previewError, restoreState]);

    useEffect(() => {
        if (!error) return undefined;

        const timer = window.setTimeout(() => {
            setError(null);
        }, 3000);

        return () => window.clearTimeout(timer);
    }, [error]);

    // Update rows based on container height
    useEffect(() => {
        if (isAnyDialogOpen) {
            return undefined;
        }

        const calculateRows = () => {
            if (!tableContainerRef.current) return;

            const nextWidth = Math.floor(tableContainerRef.current.clientWidth || 0);
            setTableWidth((prev) => (prev === nextWidth ? prev : nextWidth));

            const containerHeight = tableContainerRef.current.clientHeight;
            const headerHeight = tableHeadRef.current?.getBoundingClientRect().height || 48;
            const firstBodyRow = tableContainerRef.current.querySelector('tbody tr');
            const measuredRowHeight = firstBodyRow?.getBoundingClientRect().height || 56;
            const rowHeight = Math.max(44, measuredRowHeight);

            if (containerHeight <= 0 || rowHeight <= 0) return;

            const availableHeight = Math.max(containerHeight - headerHeight - 8, rowHeight);
            const nextPageSize = Math.max(1, Math.floor(availableHeight / rowHeight));

            setPageSize((prev) => (prev === nextPageSize ? prev : nextPageSize));
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
    }, [isDarkMode, data.length, globalFilter, sorting, isAnyDialogOpen]); // Re-calculate after layout-affecting changes

    // Helper Functions
    const filteredEmployees = useMemo(() => {
        if (!employeeSearch) return employees;
        return employees.filter((emp) =>
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

    const getLeaveAttachmentFilename = (value) => {
        const controlNo = (value?.la_controlno || '').trim();
        if (!controlNo) return '';
        return `LF${controlNo}.pdf`;
    };

    const checkAttachment = async (value) => {
        const filename = getLeaveAttachmentFilename(value);
        if (!filename) {
            setAttachmentExists(false);
            return;
        }

        try {
            await api.checkNewApplicationAttachment(filename);
            setAttachmentExists(true);
        } catch {
            setAttachmentExists(false);
        }
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setCurrentRecord(record);
            setFormData({
                la_controlno: record.la_controlno || '',
                la_employeeid: record.la_employeeid,
                la_leavetypeid: record.la_leavetypeid,
                la_dateoffiling: record.la_dateoffiling
                    ? formatDateInputPHT(record.la_dateoffiling)
                    : getTodayPHT(),
                la_attachment: record.la_controlno
                    ? `LF${String(record.la_controlno).trim()}.pdf`
                    : '',
                dates: record.dates?.length
                    ? record.dates.map((dateObj) => ({
                          ...dateObj,
                          lad_specificdate: formatDateInputPHT(dateObj.lad_specificdate),
                      }))
                    : [],
            });
            checkAttachment({ la_controlno: record.la_controlno || '' });
        } else {
            setCurrentRecord(null);
            setFormData({
                la_controlno: '',
                la_employeeid: '',
                la_leavetypeid: '',
                la_dateoffiling: getTodayPHT(),
                la_attachment: '',
                dates: [
                    {
                        lad_specificdate: getTodayPHT(),
                        lad_ishalfday: false,
                    },
                ],
            });
            setAttachmentExists(false);
        }
        setIsModalOpen(true);
        setFormError(null);
        setAttachmentBusy(false);
        setAttachmentMessage(null);
    };

    // Add more dynamic date row
    const handleAddDateRow = () => {
        setFormData((prev) => ({
            ...prev,
            dates: [...prev.dates, { lad_specificdate: getTodayPHT(), lad_ishalfday: false }],
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
                throw new Error('At least one leave date must be specified.');
            }

            const totalDays = calculateTotalDays(formData.dates);

            const payload = {
                la_controlno: formData.la_controlno,
                la_employeeid: parseInt(formData.la_employeeid),
                la_leavetypeid: parseInt(formData.la_leavetypeid),
                la_dateoffiling: formData.la_dateoffiling,
                la_totaldaysapplied: totalDays,
                la_attachment: getLeaveAttachmentFilename(formData),
                dates: formData.dates,
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

    const handlePreview = async (record) => {
        const controlNo = (record?.la_controlno || '').trim();
        if (!controlNo) {
            setError('Control No. is missing, cannot preview the leave application PDF.');
            return;
        }

        const fileName = `LF${controlNo}.pdf`;
        const fullPath = `${ATTACHMENTS_BASE_PATH}${fileName}`;
        const webPath = api.getNewApplicationAttachmentUrl(fileName);

        try {
            await api.checkNewApplicationAttachment(fileName);
            navigate('/newapp/preview', {
                state: {
                    filePath: webPath,
                    displayPath: fullPath,
                    source: fileName,
                    safeName: fileName,
                    returnPath: '/leave-management',
                    restoreState: {
                        globalFilter,
                        sorting,
                        pageIndex,
                        pageSize,
                    },
                },
            });
        } catch (err) {
            setError(`Attachment not found: ${fullPath}`);
        }
    };

    const handleUploadButtonClick = () => {
        if (!formData.la_controlno?.trim() || attachmentBusy) return;
        uploadInputRef.current?.click();
    };

    const handleUploadChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setAttachmentMessage('Only PDF files are allowed.');
            return;
        }

        const filename = getLeaveAttachmentFilename(formData);
        if (!filename) {
            setAttachmentMessage('Control No. is required before uploading.');
            return;
        }

        try {
            setAttachmentBusy(true);
            setAttachmentMessage('');

            const contentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read PDF file'));
                reader.readAsDataURL(file);
            });

            await api.uploadNewApplicationAttachment({ filename, contentBase64 });
            setFormData((prev) => ({ ...prev, la_attachment: filename }));
            setAttachmentExists(true);
            setAttachmentMessage('PDF uploaded successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to upload PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleRemoveAttachment = async () => {
        const filename = getLeaveAttachmentFilename(formData);
        if (!filename || attachmentBusy) return;

        try {
            setAttachmentBusy(true);
            setAttachmentMessage('');
            await api.removeNewApplicationAttachment({ filename });
            setFormData((prev) => ({ ...prev, la_attachment: '' }));
            setAttachmentExists(false);
            setAttachmentMessage('PDF removed successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to remove PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    // Table Columns Setup
    const showDateRangeColumn = tableWidth >= 1320;
    const compactLeaveTable = tableWidth > 0 && tableWidth < 1180;

    const columns = useMemo(
        () =>
            [
                {
                    accessorKey: 'la_controlno',
                    header: 'Control No.',
                    size: compactLeaveTable ? 110 : 130,
                    cell: (info) => (
                        <span className="font-mono text-gray-600 dark:text-gray-300">
                            {info.getValue() || '-'}
                        </span>
                    ),
                },
                {
                    accessorKey: 'emp_name',
                    header: 'Employee Name',
                    size: compactLeaveTable ? 180 : 230,
                    cell: (info) => (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                            {info.getValue()}
                        </span>
                    ),
                },
                {
                    accessorKey: 'lt_typename',
                    header: 'Leave Type',
                    size: compactLeaveTable ? 130 : 160,
                },
                {
                    accessorKey: 'la_dateoffiling',
                    header: 'Date of Filing',
                    size: 130,
                    cell: (info) =>
                        new Date(info.getValue()).toLocaleDateString('en-US', {
                            timeZone: 'Asia/Manila',
                        }),
                },
                {
                    accessorKey: 'la_totaldaysapplied',
                    header: 'Total Days',
                    size: 100,
                    cell: (info) => (
                        <span className="font-semibold">{Number(info.getValue())}</span>
                    ),
                },
                showDateRangeColumn
                    ? {
                          id: 'date_range',
                          header: 'Applied Dates',
                          size: compactLeaveTable ? 260 : 360,
                          cell: (info) => {
                              const dates = info.row.original.dates;
                              if (!dates || dates.length === 0)
                                  return <span className="text-gray-400 italic">No dates</span>;

                              // Sort dates chronologically
                              const sorted = [...dates].sort((a, b) =>
                                  formatDateInputPHT(a.lad_specificdate).localeCompare(
                                      formatDateInputPHT(b.lad_specificdate)
                                  )
                              );

                              // Create an object with the formatted date and halfday status
                              const formattedDates = sorted.map((d) => ({
                                  dateStr:
                                      dateInputToUTCDate(d.lad_specificdate)?.toLocaleDateString(
                                          'en-US',
                                          {
                                              timeZone: 'Asia/Manila',
                                          }
                                      ) || '',
                                  isHalfDay: d.lad_ishalfday,
                              }));

                              const summaryText = formattedDates
                                  .map(
                                      (item) => `${item.dateStr}${item.isHalfDay ? ' (Half)' : ''}`
                                  )
                                  .join(', ');

                              return (
                                  <span
                                      title={summaryText}
                                      style={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          whiteSpace: 'normal',
                                          wordBreak: 'break-word',
                                          lineHeight: '1.35',
                                          maxWidth: '100%',
                                          color: 'var(--muted-foreground)',
                                      }}
                                  >
                                      {summaryText}
                                  </span>
                              );
                          },
                      }
                    : null,
                {
                    id: 'actions',
                    header: 'Actions',
                    size: permissions.canDelete ? 170 : 130,
                    cell: ({ row }) => (
                        <div className="flex items-center gap-2" style={{ flexWrap: 'nowrap' }}>
                            <button
                                onClick={() => handlePreview(row.original)}
                                className="action-button view"
                                title="Preview PDF"
                            >
                                <EyeIcon />
                            </button>
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
                            {permissions.canUpdate && (
                                <button
                                    onClick={() => handleOpenModal(row.original)}
                                    className="action-button edit"
                                    title="Edit"
                                >
                                    <Pencil2Icon />
                                </button>
                            )}
                            {permissions.canDelete && (
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
                            )}
                        </div>
                    ),
                },
            ].filter(Boolean),
        [
            compactLeaveTable,
            handlePreview,
            permissions.canDelete,
            permissions.canUpdate,
            showDateRangeColumn,
        ]
    );

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter, sorting, pagination: { pageIndex, pageSize } },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        autoResetPageIndex: false,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Employee Leave Portal</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <MagnifyingGlassIcon className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Search applications..."
                        />
                    </div>
                    {permissions.canCreate && (
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">
                            <PlusIcon /> New Leave Application
                        </button>
                    )}
                </div>
            </div>

            <div className="table-wrapper">
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
                    <div
                        ref={tableContainerRef}
                        className="table-scroll-container"
                        style={{ overflowX: 'auto', overflowY: 'hidden', minHeight: 0 }}
                    >
                        <table
                            className="data-table"
                            style={{ minWidth: `${table.getTotalSize()}px` }}
                        >
                            <thead ref={tableHeadRef}>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={
                                                    header.column.getCanSort()
                                                        ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-[#343e5a]'
                                                        : ''
                                                }
                                                style={{
                                                    width: header.getSize(),
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 1,
                                                    background: 'var(--card)',
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: (
                                                            <span className="text-blue-500">↑</span>
                                                        ),
                                                        desc: (
                                                            <span className="text-blue-500">↓</span>
                                                        ),
                                                    }[header.column.getIsSorted()] ?? null}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
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
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && !error && table.getFilteredRowModel().rows.length > 0 && (
                <div className="pagination">
                    <span className="pagination-info">
                        {table.getFilteredRowModel().rows.length > 0
                            ? `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of ${table.getFilteredRowModel().rows.length} entries`
                            : 'No entries found'}
                    </span>
                    <div className="pagination-buttons">
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={!table.getCanPreviousPage()}
                            onClick={() => table.previousPage()}
                        >
                            Previous
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={!table.getCanNextPage()}
                            onClick={() => table.nextPage()}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content
                        className="dialog-content max-w-2xl"
                        style={{ maxHeight: '90vh' }}
                    >
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {currentRecord ? 'Edit Leave Application' : 'New Leave Application'}
                            </Dialog.Title>
                            <Dialog.Close className="dialog-close">
                                <Cross2Icon />
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="dialog-body">
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleUploadChange}
                                />
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
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const trimmedValue = value.trim();
                                                setFormData({
                                                    ...formData,
                                                    la_controlno: value,
                                                    la_attachment: trimmedValue
                                                        ? `LF${trimmedValue}.pdf`
                                                        : '',
                                                });
                                            }}
                                            placeholder="Enter control number (optional)"
                                            style={{
                                                padding: '8px 12px',
                                                height: '42px',
                                                lineHeight: '1.5',
                                            }}
                                        />
                                    </div>

                                    <div className="form-group col-span-2 sm:col-span-1 relative">
                                        <label>
                                            Employee <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                                            value={
                                                showEmployeeSuggestions
                                                    ? employeeSearch
                                                    : employees.find(
                                                          (e) =>
                                                              String(e.emp_ctrlno) ===
                                                              String(formData.la_employeeid)
                                                      )?.emp_name || ''
                                            }
                                            onChange={(e) => {
                                                setEmployeeSearch(e.target.value);
                                                setShowEmployeeSuggestions(true);
                                                setEmployeeHighlightIndex(0);
                                                if (!e.target.value) {
                                                    setFormData({ ...formData, la_employeeid: '' });
                                                }
                                            }}
                                            onFocus={() => {
                                                setEmployeeSearch('');
                                                setShowEmployeeSuggestions(true);
                                                setEmployeeHighlightIndex(0);
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setShowEmployeeSuggestions(false);
                                                    if (!formData.la_employeeid) {
                                                        setEmployeeSearch('');
                                                    }
                                                }, 200);
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    !showEmployeeSuggestions ||
                                                    filteredEmployees.length === 0
                                                )
                                                    return;
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setEmployeeHighlightIndex((prev) =>
                                                        prev < filteredEmployees.length - 1
                                                            ? prev + 1
                                                            : 0
                                                    );
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setEmployeeHighlightIndex((prev) =>
                                                        prev > 0
                                                            ? prev - 1
                                                            : filteredEmployees.length - 1
                                                    );
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (
                                                        employeeHighlightIndex >= 0 &&
                                                        employeeHighlightIndex <
                                                            filteredEmployees.length
                                                    ) {
                                                        handleSelectEmployee(
                                                            filteredEmployees[
                                                                employeeHighlightIndex
                                                            ]
                                                        );
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
                                                lineHeight: '1.5',
                                            }}
                                        />
                                        {showEmployeeSuggestions && (
                                            <ul
                                                className="absolute z-[9999] w-full bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-[#374151] rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
                                                style={{ top: '100%', left: 0 }}
                                            >
                                                {filteredEmployees.length > 0 ? (
                                                    filteredEmployees.map((emp, idx) => (
                                                        <li
                                                            key={emp.emp_ctrlno}
                                                            className={`px-3 py-2 cursor-pointer text-sm ${idx === employeeHighlightIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-[#374151]`}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectEmployee(emp);
                                                            }}
                                                            onMouseEnter={() =>
                                                                setEmployeeHighlightIndex(idx)
                                                            }
                                                        >
                                                            {emp.emp_name}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="px-3 py-2 text-sm text-gray-500 italic">
                                                        No employees found
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="form-group col-span-2 sm:col-span-1">
                                        <label>
                                            Leave Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="form-input w-full text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                                            value={formData.la_leavetypeid}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    la_leavetypeid: e.target.value,
                                                })
                                            }
                                            required
                                            style={{
                                                padding: '8px 12px',
                                                height: '42px',
                                                lineHeight: '1.5',
                                            }}
                                        >
                                            <option
                                                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                                                value=""
                                            >
                                                Select Leave Type...
                                            </option>
                                            {leaveTypes.map((type) => (
                                                <option
                                                    className="text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1f2937]"
                                                    key={type.lt_leavetypeid}
                                                    value={type.lt_leavetypeid}
                                                >
                                                    {type.lt_typename}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group col-span-2 sm:col-span-1">
                                        <label>
                                            Date of Filing <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.la_dateoffiling}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    la_dateoffiling: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="form-group col-span-2 sm:col-span-1 flex flex-col justify-end">
                                        <div className="bg-gray-50 dark:bg-[#1a2235] rounded-md p-3 border border-gray-200 dark:border-[#2a3441] flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Total Calculated Days:
                                            </span>
                                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                {calculateTotalDays(formData.dates)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="form-group col-span-2">
                                        <label>PDF Attachment</label>
                                        <div className="attachment-box">
                                            <div className="attachment-box-header">
                                                <span className="attachment-box-title">
                                                    {getLeaveAttachmentFilename(formData) ||
                                                        'No control number'}
                                                </span>
                                                <span
                                                    className={`attachment-status ${attachmentExists ? 'is-success' : 'is-muted'}`}
                                                >
                                                    {attachmentExists
                                                        ? 'Attached'
                                                        : 'No PDF uploaded'}
                                                </span>
                                            </div>
                                            <div className="attachment-actions">
                                                <button
                                                    type="button"
                                                    className="attachment-icon-button"
                                                    title="Upload PDF"
                                                    onClick={handleUploadButtonClick}
                                                    disabled={
                                                        !formData.la_controlno || attachmentBusy
                                                    }
                                                >
                                                    <UploadIcon size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="attachment-icon-button attachment-icon-button-danger"
                                                    title="Remove PDF"
                                                    onClick={handleRemoveAttachment}
                                                    disabled={
                                                        !formData.la_controlno ||
                                                        !attachmentExists ||
                                                        attachmentBusy
                                                    }
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {attachmentMessage ? (
                                            <div className="attachment-message">
                                                {attachmentMessage}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-6 border-t border-gray-200 dark:border-[#2a3441] pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Specific Dates Applied
                                        </h3>
                                        {(
                                            currentRecord
                                                ? permissions.canUpdate
                                                : permissions.canCreate
                                        ) ? (
                                            <button
                                                type="button"
                                                onClick={handleAddDateRow}
                                                className="btn btn-secondary text-xs py-1"
                                            >
                                                <PlusIcon className="w-3 h-3" /> Add Date
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                        {formData.dates.map((dateObj, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-gray-50 dark:bg-[#1a2235] p-3 rounded-md border border-gray-200 dark:border-[#2a3441]"
                                            >
                                                <div className="flex-1 w-full sm:w-auto">
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={formatDateInputPHT(
                                                            dateObj.lad_specificdate
                                                        )}
                                                        onChange={(e) =>
                                                            handleUpdateDateRow(
                                                                index,
                                                                'lad_specificdate',
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-[#20293a] px-3 py-2 rounded border border-gray-300 dark:border-[#374151]">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#1a2235] dark:border-[#4b5563]"
                                                            checked={dateObj.lad_ishalfday}
                                                            onChange={(e) =>
                                                                handleUpdateDateRow(
                                                                    index,
                                                                    'lad_ishalfday',
                                                                    e.target.checked
                                                                )
                                                            }
                                                        />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                                            Half Day
                                                        </span>
                                                    </label>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDateRow(index)}
                                                    disabled={
                                                        formData.dates.length === 1 ||
                                                        (currentRecord
                                                            ? !permissions.canUpdate
                                                            : !permissions.canCreate)
                                                    }
                                                    className={`p-2 rounded flex-shrink-0 ${formData.dates.length === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div
                                className="dialog-footer"
                                style={{
                                    position: 'sticky',
                                    bottom: 0,
                                    zIndex: 2,
                                    backgroundColor: 'var(--card)',
                                    borderTop: '1px solid var(--border)',
                                    boxShadow: '0 -8px 20px rgba(0, 0, 0, 0.08)',
                                }}
                            >
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
                                    disabled={
                                        isSaving ||
                                        (currentRecord
                                            ? !permissions.canUpdate
                                            : !permissions.canCreate)
                                    }
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
                                Are you sure you want to delete the leave application for{' '}
                                <strong className="text-gray-900 dark:text-white">
                                    {currentRecord?.emp_name}
                                </strong>
                                ?
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                This will also delete the {currentRecord?.dates?.length} specific
                                valid dates attached to this application. This action cannot be
                                undone.
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
                    <Dialog.Content
                        className="dialog-content max-w-2xl"
                        style={{ maxHeight: '90vh' }}
                    >
                        <div className="dialog-header border-b pb-4 mb-4 border-gray-200 dark:border-[#2a3441]">
                            <Dialog.Title className="dialog-title flex items-center gap-2">
                                <PersonIcon className="w-5 h-5 text-blue-500" />
                                Leave Application Details
                            </Dialog.Title>
                            <Dialog.Close className="dialog-close">
                                <Cross2Icon />
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body" style={{ minHeight: 0, overflowY: 'auto' }}>
                            {currentRecord && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 dark:bg-[#1a2235] dark:border-[#2a3441] p-4 rounded-lg">
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                                Control No.
                                            </span>
                                            <span className="text-gray-900 dark:text-gray-100 font-mono">
                                                {currentRecord.la_controlno || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                                Employee Name
                                            </span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                                                {currentRecord.emp_name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                                Leave Type
                                            </span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                                                {currentRecord.lt_typename}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                                Date OF Filing
                                            </span>
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {new Date(
                                                    currentRecord.la_dateoffiling
                                                ).toLocaleDateString('en-US', {
                                                    timeZone: 'Asia/Manila',
                                                })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                                Total Days
                                            </span>
                                            <span className="text-gray-900 dark:text-gray-100 font-semibold text-blue-600 dark:text-blue-400 text-lg">
                                                {Number(currentRecord.la_totaldaysapplied)}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-[#2a3441] pb-2">
                                            <CalendarIcon /> Specifically Applied Dates
                                        </h4>

                                        {currentRecord.dates && currentRecord.dates.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                                                {currentRecord.dates.map((dateObj, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex justify-between items-center bg-gray-50 dark:bg-[#20293a] border border-gray-200 dark:border-[#374151] p-2 rounded"
                                                    >
                                                        <span className="text-gray-800 dark:text-gray-200">
                                                            {new Date(
                                                                dateObj.lad_specificdate
                                                            ).toLocaleDateString('en-US', {
                                                                timeZone: 'Asia/Manila',
                                                            })}
                                                        </span>
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded-full ${dateObj.lad_ishalfday ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
                                                        >
                                                            {dateObj.lad_ishalfday
                                                                ? 'Half Day'
                                                                : 'Full Day'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">
                                                No specific dates recorded.
                                            </p>
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
