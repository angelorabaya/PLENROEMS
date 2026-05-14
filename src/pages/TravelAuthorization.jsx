import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    FiX,
    FiEye,
    FiEdit2,
    FiTrash2,
    FiUpload,
    FiUserPlus,
    FiUserMinus,
    FiChevronDown,
    FiChevronRight,
    FiChevronLeft,
} from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import { getUserPermissions } from '../utils/permissions';
import { formatDateInputPHT, getTodayPHT } from '../utils/dateUtils';

import '../styles/global.css';
import '../components/modals/Modal.css';

const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
    const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
    const sanitized = base.replace(/[\\/]*$/, '');
    return `${sanitized}\\`;
};
const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
    import.meta.env.VITE_ATTACHMENTS_BASE_PATH
);

const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const formatDateInput = (value) => {
    return formatDateInputPHT(value);
};

const todayInput = () => {
    return getTodayPHT();
};

const TravelAuthorization = () => {
    const navigate = useNavigate();
    const { currentUser } = useOutletContext();

    const permissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);

    // Master state
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(0);
    const tableContainerRef = useRef(null);
    const [tableWidth, setTableWidth] = useState(0);

    // Selected order for detail
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    // Modal state for travel order
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        to_number: '',
        to_dateprepared: todayInput(),
        to_destination: '',
        to_startdate: '',
        to_enddate: '',
        to_purpose: '',
        to_duration: '',
        to_control: '',
        to_attachment: '',
    });
    const uploadInputRef = useRef(null);
    const [attachmentExists, setAttachmentExists] = useState(false);
    const [attachmentBusy, setAttachmentBusy] = useState(false);
    const [attachmentMessage, setAttachmentMessage] = useState('');

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);

    // Cancel modal state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [rowToCancel, setRowToCancel] = useState(null);

    // Detail state – employees
    const [detailEmployees, setDetailEmployees] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [addingEmployee, setAddingEmployee] = useState(false);

    // Detail pagination
    const [detailPageSize, setDetailPageSize] = useState(5);
    const [detailPage, setDetailPage] = useState(0);
    const detailContainerRef = useRef(null);

    // Employee delete modal
    const [isEmpDeleteModalOpen, setIsEmpDeleteModalOpen] = useState(false);
    const [empToDelete, setEmpToDelete] = useState(null);

    // Auto-hide notifications
    useEffect(() => {
        if (!info) return;
        const timer = setTimeout(() => setInfo(''), 3000);
        return () => clearTimeout(timer);
    }, [info]);

    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    useEffect(() => {
        const calculatePageSize = () => {
            const wrapper = tableContainerRef.current;
            if (!wrapper) return;

            const nextWidth = Math.floor(wrapper.clientWidth || 0);
            setTableWidth((prev) => (prev !== nextWidth ? nextWidth : prev));

            const tableTop = wrapper.getBoundingClientRect().top;
            const headerEl = wrapper.querySelector('thead');
            const firstBodyRow = wrapper.querySelector('tbody tr');
            const measuredHeaderHeight = headerEl?.getBoundingClientRect().height || 48;
            const measuredRowHeight = firstBodyRow?.getBoundingClientRect().height || 56;
            const rowHeight = Math.max(44, Math.ceil(measuredRowHeight));
            const paginationH = 56;
            const bottomPad = 24;

            const totalAvailable = window.innerHeight - tableTop - bottomPad;
            const availableForRows = totalAvailable - measuredHeaderHeight - paginationH;
            const fittingRows = Math.floor(availableForRows / rowHeight);
            const newSize = Math.max(3, Math.min(10, fittingRows));

            setPageSize((prev) => (prev !== newSize ? newSize : prev));
        };

        const timer = setTimeout(calculatePageSize, 150);
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(calculatePageSize);
        });

        if (tableContainerRef.current) {
            resizeObserver.observe(tableContainerRef.current);
        }

        const handleResize = () => setTimeout(calculatePageSize, 50);
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [orders, error, info, searchQuery, selectedOrderId]);

    // Dynamic row calculation for the detail employee table
    useEffect(() => {
        const calculateDetailPageSize = () => {
            const container = detailContainerRef.current;
            if (!container) return;

            const containerTop = container.getBoundingClientRect().top;
            const headerEl = container.querySelector('thead');
            const firstBodyRow = container.querySelector('tbody tr');
            const measuredHeaderHeight = headerEl?.getBoundingClientRect().height || 48;
            const measuredRowHeight = firstBodyRow?.getBoundingClientRect().height || 56;
            const rowHeight = Math.max(44, Math.ceil(measuredRowHeight));
            const paginationH = 56;
            const bottomPad = 24;

            const totalAvailable = window.innerHeight - containerTop - bottomPad;
            const availableForRows = totalAvailable - measuredHeaderHeight - paginationH;
            const fittingRows = Math.floor(availableForRows / rowHeight);
            const newSize = Math.max(3, fittingRows);

            setDetailPageSize((prev) => (prev !== newSize ? newSize : prev));
        };

        const timer = setTimeout(calculateDetailPageSize, 150);

        const handleResize = () => setTimeout(calculateDetailPageSize, 50);
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [selectedOrderId, detailEmployees]);

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(0);
    }, [searchQuery]);

    // Reset detail page when selecting a new order or when employees change
    useEffect(() => {
        setDetailPage(0);
    }, [selectedOrderId, detailEmployees.length]);

    const handleRemoveEmployeeClick = useCallback((emp) => {
        setEmpToDelete(emp);
        setIsEmpDeleteModalOpen(true);
    }, []);

    const detailColumns = useMemo(
        () => [
            {
                accessorKey: 'emp_name',
                header: 'Employee Name',
                size: 560,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || ''}</span>,
            },
            {
                id: 'actions',
                header: '',
                size: 140,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        {permissions.canDelete && (
                            <button
                                className="btn-delete"
                                onClick={() => handleRemoveEmployeeClick(row.original)}
                                title="Remove employee"
                            >
                                <FiUserMinus className="icon-sm" />
                            </button>
                        )}
                    </div>
                ),
            },
        ],
        [handleRemoveEmployeeClick]
    );

    const detailTable = useReactTable({
        data: detailEmployees,
        columns: detailColumns,
        state: {
            pagination: {
                pageIndex: detailPage,
                pageSize: detailPageSize,
            },
        },
        onPaginationChange: (updater) => {
            const nextPagination =
                typeof updater === 'function'
                    ? updater({ pageIndex: detailPage, pageSize: detailPageSize })
                    : updater;

            setDetailPage(nextPagination.pageIndex);
            setDetailPageSize(nextPagination.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // Fetch travel orders
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.getTravelOrders();
            setOrders(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load travel orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Fetch employees list for dropdown
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const data = await api.getEmployees();
                setEmployees(data || []);
            } catch (err) {
                console.error('Failed to load employees:', err);
            }
        };
        loadEmployees();
    }, []);

    // Fetch detail employees when an order is selected
    const fetchDetailEmployees = useCallback(async (orderId) => {
        if (!orderId) {
            setDetailEmployees([]);
            return;
        }
        try {
            setLoadingDetail(true);
            const data = await api.getTravelOrderEmployees(orderId);
            setDetailEmployees(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load employees for this travel order');
            setDetailEmployees([]);
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    useEffect(() => {
        fetchDetailEmployees(selectedOrderId);
    }, [selectedOrderId, fetchDetailEmployees]);

    // Form handlers
    const handleFormChange = (field) => (e) => {
        const value = e.target.value;
        setForm((prev) => {
            const updated = { ...prev, [field]: value };
            // Auto-populate End Date when Start Date is selected
            if (field === 'to_startdate' && value) {
                if (!prev.to_enddate || prev.to_enddate < value) {
                    updated.to_enddate = value;
                }
            }
            if (field === 'to_number') {
                const trimmedValue = value.trim();
                updated.to_attachment = trimmedValue ? `TO${trimmedValue}.pdf` : '';
            }
            return updated;
        });
    };

    const getTravelOrderAttachmentFilename = useCallback((value) => {
        const toNumber = (value?.to_number || '').trim();
        if (!toNumber) return '';

        return `TO${toNumber}.pdf`;
    }, []);

    const checkAttachment = useCallback(
        async (value) => {
            const filename = getTravelOrderAttachmentFilename(value);
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
        },
        [getTravelOrderAttachmentFilename]
    );

    const handleAddClick = () => {
        setEditingId(null);
        setForm({
            to_number: '',
            to_dateprepared: todayInput(),
            to_destination: '',
            to_startdate: '',
            to_enddate: '',
            to_purpose: '',
            to_duration: '',
            to_control: '',
            to_attachment: '',
        });
        setAttachmentExists(false);
        setAttachmentBusy(false);
        setAttachmentMessage('');
        setIsModalOpen(true);
    };

    const handleEditClick = (row) => {
        setEditingId(row.to_ctrlno);
        setForm({
            to_number: row.to_number || '',
            to_dateprepared: formatDateInput(row.to_dateprepared),
            to_destination: row.to_destination || '',
            to_startdate: formatDateInput(row.to_startdate),
            to_enddate: formatDateInput(row.to_enddate),
            to_purpose: row.to_purpose || '',
            to_duration: row.to_duration || '',
            to_control: row.to_control || '',
            to_attachment: row.to_number ? `TO${String(row.to_number).trim()}.pdf` : '',
        });
        setAttachmentMessage('');
        setAttachmentBusy(false);
        checkAttachment({
            to_number: row.to_number || '',
            to_attachment: row.to_number ? `TO${String(row.to_number).trim()}.pdf` : '',
        });
        setIsModalOpen(true);
    };

    const handleCancelModal = () => {
        setEditingId(null);
        setForm({
            to_number: '',
            to_dateprepared: todayInput(),
            to_destination: '',
            to_startdate: '',
            to_enddate: '',
            to_purpose: '',
            to_duration: '',
            to_control: '',
            to_attachment: '',
        });
        setAttachmentExists(false);
        setAttachmentBusy(false);
        setAttachmentMessage('');
        setIsModalOpen(false);
    };

    const handleUploadButtonClick = () => {
        if (!form.to_number?.trim() || attachmentBusy) return;
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

        const filename = getTravelOrderAttachmentFilename(form);
        if (!filename) {
            setAttachmentMessage('T.O. Number is required before uploading.');
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

            await api.uploadNewApplicationAttachment({
                filename,
                contentBase64,
            });

            setForm((prev) => ({ ...prev, to_attachment: filename }));
            setAttachmentExists(true);
            setAttachmentMessage('PDF uploaded successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to upload PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleRemoveAttachment = async () => {
        const filename = getTravelOrderAttachmentFilename(form);
        if (!filename || attachmentBusy) return;

        try {
            setAttachmentBusy(true);
            setAttachmentMessage('');
            await api.removeNewApplicationAttachment({ filename });
            setForm((prev) => ({ ...prev, to_attachment: '' }));
            setAttachmentExists(false);
            setAttachmentMessage('PDF removed successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to remove PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        try {
            setSaving(true);

            if (editingId) {
                await api.updateTravelOrder(editingId, form);
                setInfo('Travel order updated successfully.');
            } else {
                await api.createTravelOrder(form);
                setInfo('Travel order created successfully.');
            }
            handleCancelModal();
            fetchOrders();
        } catch (err) {
            setError(err.message || 'Failed to save travel order');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (row) => {
        setRowToDelete(row);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!rowToDelete) return;
        try {
            setError('');
            await api.deleteTravelOrder(rowToDelete.to_ctrlno);
            setInfo('Travel order deleted successfully.');
            setIsDeleteModalOpen(false);
            setRowToDelete(null);
            if (selectedOrderId === rowToDelete.to_ctrlno) {
                setSelectedOrderId(null);
                setDetailEmployees([]);
            }
            fetchOrders();
        } catch (err) {
            setError(err.message || 'Failed to delete travel order');
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setRowToDelete(null);
    };

    // Cancel handlers
    const handleCancelClick = (row) => {
        setRowToCancel(row);
        setIsCancelModalOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!rowToCancel) return;
        try {
            setError('');
            await api.cancelTravelOrder(rowToCancel.to_ctrlno);
            setInfo('Travel order cancelled successfully.');
            setIsCancelModalOpen(false);
            setRowToCancel(null);
            fetchOrders();
        } catch (err) {
            setError(err.message || 'Failed to cancel travel order');
        }
    };

    const handleCancelClose = () => {
        setIsCancelModalOpen(false);
        setRowToCancel(null);
    };

    // Preview handler
    const handlePreviewClick = async (row) => {
        const toNumber = (row.to_number || '').trim();
        if (!toNumber) {
            setError('T.O. Number is missing, cannot preview.');
            return;
        }

        const fileName = getTravelOrderAttachmentFilename(row);
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
                    returnPath: '/travel-authorization',
                },
            });
        } catch (err) {
            setError(`Attachment not found: ${fullPath}`);
        }
    };

    // Detail – employee handlers
    const handleAddEmployee = async () => {
        if (!selectedEmpId || !selectedOrderId) return;
        try {
            setAddingEmployee(true);
            await api.addTravelOrderEmployee(selectedOrderId, selectedEmpId);
            setInfo('Employee added to travel order.');
            setSelectedEmpId('');
            fetchDetailEmployees(selectedOrderId);
        } catch (err) {
            setError(err.message || 'Failed to add employee');
        } finally {
            setAddingEmployee(false);
        }
    };

    const handleRemoveEmployeeConfirm = async () => {
        if (!empToDelete) return;
        try {
            await api.removeTravelOrderEmployee(empToDelete.toe_ctrlno);
            setInfo('Employee removed from travel order.');
            setIsEmpDeleteModalOpen(false);
            setEmpToDelete(null);
            fetchDetailEmployees(selectedOrderId);
        } catch (err) {
            setError(err.message || 'Failed to remove employee');
        }
    };

    const handleRemoveEmployeeCancel = () => {
        setIsEmpDeleteModalOpen(false);
        setEmpToDelete(null);
    };

    const toggleRowSelect = (orderId) => {
        setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
    };

    const filteredOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return orders;

        return orders.filter(
            (row) =>
                (row.to_number || '').toLowerCase().includes(q) ||
                formatDate(row.to_dateprepared).toLowerCase().includes(q) ||
                (row.to_destination || '').toLowerCase().includes(q) ||
                formatDate(row.to_startdate).toLowerCase().includes(q) ||
                formatDate(row.to_enddate).toLowerCase().includes(q) ||
                (row.to_purpose || '').toLowerCase().includes(q) ||
                (row.to_duration || '').toLowerCase().includes(q) ||
                (row.to_control || '').toLowerCase().includes(q)
        );
    }, [orders, searchQuery]);

    useEffect(() => {
        const totalPages = Math.ceil(filteredOrders.length / pageSize);
        const maxPage = Math.max(0, totalPages - 1);
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [filteredOrders.length, currentPage, pageSize]);

    const showDateRangeColumns = tableWidth >= 1180;
    const showDurationColumn = tableWidth >= 1340;
    const showControlColumn = tableWidth >= 1500;
    const compactActionColumn = tableWidth > 0 && tableWidth < 1180;

    const masterColumns = useMemo(() => {
        const columns = [
            {
                id: 'expander',
                header: '',
                size: 44,
                cell: ({ row }) => {
                    const original = row.original;
                    const isSelected = selectedOrderId === original.to_ctrlno;

                    return isSelected ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />;
                },
            },
            {
                accessorKey: 'to_number',
                header: 'T.O. Number',
                size: compactActionColumn ? 118 : 130,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue() || ''}
                    </span>
                ),
            },
            {
                accessorKey: 'to_dateprepared',
                header: 'Date Prepared',
                size: compactActionColumn ? 118 : 140,
                cell: ({ getValue }) => <span className="cell-text">{formatDate(getValue())}</span>,
            },
            {
                accessorKey: 'to_destination',
                header: 'Destination',
                size: showControlColumn ? 210 : compactActionColumn ? 180 : 195,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue() || ''}
                    </span>
                ),
            },
        ];

        if (showDateRangeColumns) {
            columns.push(
                {
                    accessorKey: 'to_startdate',
                    header: 'Start Date',
                    size: 120,
                    cell: ({ getValue }) => (
                        <span className="cell-text">{formatDate(getValue())}</span>
                    ),
                },
                {
                    accessorKey: 'to_enddate',
                    header: 'End Date',
                    size: 120,
                    cell: ({ getValue }) => (
                        <span className="cell-text">{formatDate(getValue())}</span>
                    ),
                }
            );
        }

        columns.push({
            accessorKey: 'to_purpose',
            header: 'Purpose',
            size: showControlColumn ? 260 : showDurationColumn ? 240 : 220,
            cell: ({ getValue }) => (
                <span
                    style={{
                        display: '-webkit-box',
                        WebkitLineClamp: compactActionColumn ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                    }}
                    title={getValue()}
                >
                    {getValue() || ''}
                </span>
            ),
        });

        if (showDurationColumn) {
            columns.push({
                accessorKey: 'to_duration',
                header: 'Duration',
                size: 120,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue() || ''}
                    </span>
                ),
            });
        }

        if (showControlColumn) {
            columns.push({
                accessorKey: 'to_control',
                header: 'Control',
                size: 120,
                cell: ({ getValue, row }) => {
                    const isCancelled = row.original.to_status === 'CANCELLED';
                    return (
                        <>
                            <span className="cell-text" title={getValue()}>
                                {getValue() || ''}
                            </span>
                            {isCancelled && (
                                <span
                                    style={{
                                        display: 'inline-block',
                                        marginTop: '4px',
                                        padding: '2px 6px',
                                        backgroundColor: 'var(--destructive)',
                                        color: 'white',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                    }}
                                >
                                    CANCELLED
                                </span>
                            )}
                        </>
                    );
                },
            });
        }

        columns.push({
            id: 'actions',
            header: '',
            size: permissions.canDelete ? 144 : 84,
            cell: ({ row }) => {
                const original = row.original;
                const isCancelled = original.to_status === 'CANCELLED';

                return (
                    <div
                        className="action-buttons"
                        style={{ gap: '0.125rem', flexWrap: 'nowrap' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="btn-icon btn-icon-sm"
                            onClick={() => handlePreviewClick(original)}
                            title="Preview"
                        >
                            <FiEye size={14} />
                        </button>
                        {permissions.canUpdate && (
                            <button
                                className="btn-icon btn-icon-sm"
                                onClick={() => handleEditClick(original)}
                                title="Edit"
                            >
                                <FiEdit2 size={14} />
                            </button>
                        )}
                        {permissions.canDelete && !isCancelled && (
                            <button
                                className="btn-icon btn-icon-sm btn-icon-warning"
                                style={{ color: 'var(--warning, #f59e0b)' }}
                                onClick={() => handleCancelClick(original)}
                                title="Cancel"
                            >
                                <FiX size={14} />
                            </button>
                        )}
                        {permissions.canDelete && (
                            <button
                                className="btn-icon btn-icon-sm btn-icon-danger"
                                onClick={() => handleDeleteClick(original)}
                                title="Delete"
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                    </div>
                );
            },
        });

        return columns;
    }, [
        compactActionColumn,
        handleCancelClick,
        handleDeleteClick,
        handleEditClick,
        handlePreviewClick,
        permissions.canDelete,
        permissions.canUpdate,
        selectedOrderId,
        showControlColumn,
        showDateRangeColumns,
        showDurationColumn,
    ]);

    const masterTable = useReactTable({
        data: filteredOrders,
        columns: masterColumns,
        state: {
            pagination: {
                pageIndex: currentPage,
                pageSize,
            },
        },
        onPaginationChange: (updater) => {
            const nextPagination =
                typeof updater === 'function'
                    ? updater({ pageIndex: currentPage, pageSize })
                    : updater;

            setCurrentPage(nextPagination.pageIndex);
            setPageSize(nextPagination.pageSize);
        },
        autoResetPageIndex: false,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="hstack hstack-3">
                    <h1 className="page-title">Travel Authorization</h1>
                </div>
                {permissions.canCreate && (
                    <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
                        + Add Travel Order
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                    {error}
                </div>
            )}
            {info && (
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                    {info}
                </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: '12px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search travel orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '350px' }}
                />
            </div>

            {/* Master Table */}
            <div
                className="table-wrapper"
                ref={tableContainerRef}
                style={{ marginBottom: selectedOrderId ? '0' : undefined }}
            >
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <span className="loading-text">Loading travel orders...</span>
                    </div>
                ) : filteredOrders.length > 0 ? (
                    <>
                        <div
                            style={{
                                flex: 1,
                                minHeight: 0,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                            }}
                        >
                            <table
                                className="table"
                                style={{
                                    width: 'max(100%, var(--travel-table-min-width, 100%))',
                                    minWidth: `${masterTable.getTotalSize()}px`,
                                }}
                            >
                                <thead className="table-header">
                                    {masterTable.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id} className="table-row">
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="table-head"
                                                    style={{
                                                        width: header.column.getSize(),
                                                        textAlign:
                                                            header.id === 'actions' ||
                                                            header.id === 'expander'
                                                                ? 'center'
                                                                : 'left',
                                                    }}
                                                >
                                                    <div
                                                        className="sort-header"
                                                        style={{
                                                            justifyContent:
                                                                header.id === 'actions' ||
                                                                header.id === 'expander'
                                                                    ? 'center'
                                                                    : 'flex-start',
                                                        }}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {masterTable.getRowModel().rows.map((row) => {
                                        const original = row.original;
                                        const isSelected = selectedOrderId === original.to_ctrlno;
                                        const isCancelled = original.to_status === 'CANCELLED';

                                        return (
                                            <tr
                                                key={row.id}
                                                className="table-row"
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected
                                                        ? 'var(--accent)'
                                                        : isCancelled
                                                          ? 'rgba(239, 68, 68, 0.05)'
                                                          : undefined,
                                                    opacity: isCancelled ? 0.7 : 1,
                                                }}
                                                onClick={() => toggleRowSelect(original.to_ctrlno)}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        className="table-cell"
                                                        style={{
                                                            textAlign:
                                                                cell.column.id === 'actions' ||
                                                                cell.column.id === 'expander'
                                                                    ? 'center'
                                                                    : 'left',
                                                        }}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="pagination" style={{ flexShrink: 0 }}>
                            <span className="pagination-info">
                                {filteredOrders.length > 0
                                    ? `Showing ${masterTable.getState().pagination.pageIndex * masterTable.getState().pagination.pageSize + 1} to ${Math.min((masterTable.getState().pagination.pageIndex + 1) * masterTable.getState().pagination.pageSize, filteredOrders.length)} of ${filteredOrders.length} entries`
                                    : 'No entries found'}
                            </span>
                            <div className="pagination-buttons">
                                <button
                                    className="btn btn-outline btn-sm"
                                    disabled={!masterTable.getCanPreviousPage()}
                                    onClick={() => masterTable.previousPage()}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    disabled={!masterTable.getCanNextPage()}
                                    onClick={() => masterTable.nextPage()}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        <p>
                            {searchQuery.trim()
                                ? 'No matching travel orders found.'
                                : 'No travel orders found.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Detail Section – Employees */}
            {selectedOrderId && (
                <div
                    style={{
                        marginTop: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        backgroundColor: 'var(--card)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}
                    >
                        <h3
                            style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--foreground)',
                                margin: 0,
                            }}
                        >
                            Assigned Employees — T.O.{' '}
                            {orders.find((o) => o.to_ctrlno === selectedOrderId)?.to_number ||
                                selectedOrderId}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                className="form-select"
                                value={selectedEmpId}
                                onChange={(e) => setSelectedEmpId(e.target.value)}
                                style={{
                                    minWidth: '300px',
                                    fontSize: '13px',
                                    height: 'auto',
                                    padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                                }}
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map((emp) => (
                                    <option key={emp.emp_ctrlno} value={emp.emp_ctrlno}>
                                        {emp.emp_name}
                                    </option>
                                ))}
                            </select>
                            {permissions.canUpdate && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAddEmployee}
                                    disabled={!selectedEmpId || addingEmployee}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    <FiUserPlus size={14} />
                                    {addingEmployee ? 'Adding...' : 'Add'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={detailContainerRef}
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {loadingDetail ? (
                            <div className="loading-container" style={{ padding: '24px' }}>
                                <div className="spinner spinner-sm"></div>
                                <span className="loading-text">Loading employees...</span>
                            </div>
                        ) : detailEmployees.length > 0 ? (
                            <>
                                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                    <table className="table">
                                        <thead className="table-header">
                                            {detailTable.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id} className="table-row">
                                                    {headerGroup.headers.map((header) => (
                                                        <th
                                                            key={header.id}
                                                            className="table-head"
                                                            style={{
                                                                width: header.column.getSize(),
                                                                textAlign:
                                                                    header.id === 'actions'
                                                                        ? 'center'
                                                                        : 'left',
                                                            }}
                                                        >
                                                            <div
                                                                className="sort-header"
                                                                style={{
                                                                    justifyContent:
                                                                        header.id === 'actions'
                                                                            ? 'center'
                                                                            : 'flex-start',
                                                                }}
                                                            >
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext()
                                                                )}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {detailTable.getRowModel().rows.map((row) => (
                                                <tr key={row.id} className="table-row">
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td
                                                            key={cell.id}
                                                            className="table-cell"
                                                            style={{
                                                                textAlign:
                                                                    cell.column.id === 'actions'
                                                                        ? 'center'
                                                                        : 'left',
                                                            }}
                                                        >
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pagination" style={{ flexShrink: 0 }}>
                                    <span className="pagination-info">
                                        {(() => {
                                            const total = detailEmployees.length;
                                            const { pageIndex, pageSize } =
                                                detailTable.getState().pagination;
                                            const start =
                                                total === 0 ? 0 : pageIndex * pageSize + 1;
                                            const end = Math.min((pageIndex + 1) * pageSize, total);
                                            return total > 0
                                                ? `Showing ${start} to ${end} of ${total} employees`
                                                : 'No employees';
                                        })()}
                                    </span>
                                    <div className="pagination-buttons">
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={!detailTable.getCanPreviousPage()}
                                            onClick={() => detailTable.previousPage()}
                                        >
                                            <FiChevronLeft size={14} />
                                        </button>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={!detailTable.getCanNextPage()}
                                            onClick={() => detailTable.nextPage()}
                                        >
                                            <FiChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div
                                style={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    color: 'var(--muted-foreground)',
                                    fontSize: '13px',
                                }}
                            >
                                No employees assigned to this travel order.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Travel Order Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={(open) => !open && handleCancelModal()}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content" aria-describedby={undefined}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {editingId ? 'Edit Travel Order' : 'Add Travel Order'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
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
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                    }}
                                >
                                    <div className="form-group">
                                        <label className="form-label">T.O. Number</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={form.to_number}
                                            onChange={handleFormChange('to_number')}
                                            placeholder="Travel order number"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date Prepared</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={form.to_dateprepared}
                                            onChange={handleFormChange('to_dateprepared')}
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Destination</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={form.to_destination}
                                            onChange={handleFormChange('to_destination')}
                                            placeholder="Travel destination"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Start Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={form.to_startdate}
                                            onChange={handleFormChange('to_startdate')}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={form.to_enddate}
                                            onChange={handleFormChange('to_enddate')}
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Purpose</label>
                                        <textarea
                                            className="form-input"
                                            value={form.to_purpose}
                                            onChange={handleFormChange('to_purpose')}
                                            placeholder="Purpose of travel"
                                            rows={3}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Travel Time Duration</label>
                                        <select
                                            className="form-select"
                                            value={form.to_duration}
                                            onChange={handleFormChange('to_duration')}
                                        >
                                            <option value="">-- Select Duration --</option>
                                            <option value="8:00 AM to 12 Noon">
                                                8:00 AM to 12 Noon
                                            </option>
                                            <option value="8:00 AM to 5:00 PM">
                                                8:00 AM to 5:00 PM
                                            </option>
                                            <option value="8:00 AM to 7:00 PM">
                                                8:00 AM to 7:00 PM
                                            </option>
                                            <option value="1:00 PM to 5:00 PM">
                                                1:00 PM to 5:00 PM
                                            </option>
                                            <option value="5:00 PM to 6:00 PM">
                                                5:00 PM to 6:00 PM
                                            </option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Control</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={form.to_control}
                                            onChange={handleFormChange('to_control')}
                                            placeholder="Control number"
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">PDF Attachment</label>
                                        <div className="attachment-box">
                                            <div className="attachment-box-header">
                                                <span className="attachment-box-title">
                                                    {getTravelOrderAttachmentFilename(form) ||
                                                        'No T.O. number'}
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
                                                    disabled={!form.to_number || attachmentBusy}
                                                >
                                                    <FiUpload size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="attachment-icon-button attachment-icon-button-danger"
                                                    title="Remove PDF"
                                                    onClick={handleRemoveAttachment}
                                                    disabled={
                                                        !form.to_number ||
                                                        !attachmentExists ||
                                                        attachmentBusy
                                                    }
                                                >
                                                    <FiTrash2 size={16} />
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
                            </div>

                            <div className="dialog-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCancelModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        saving ||
                                        (editingId
                                            ? !permissions.canUpdate
                                            : !permissions.canCreate)
                                    }
                                >
                                    {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Travel Order Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Travel Order"
                message={`Are you sure you want to delete travel order "${rowToDelete?.to_number || ''}"? This will also remove all assigned employees. This action cannot be undone.`}
            />

            {/* Remove Employee Modal */}
            <DeleteModal
                isOpen={isEmpDeleteModalOpen}
                onClose={handleRemoveEmployeeCancel}
                onConfirm={handleRemoveEmployeeConfirm}
                title="Remove Employee"
                message={`Are you sure you want to remove "${empToDelete?.emp_name || ''}" from this travel order?`}
            />

            {/* Cancel Modal */}
            <DeleteModal
                isOpen={isCancelModalOpen}
                title="Cancel Travel Order"
                message={
                    <>
                        Are you sure you want to <strong>CANCEL</strong> travel order{' '}
                        {rowToCancel?.to_number}?
                    </>
                }
                onConfirm={handleCancelConfirm}
                onCancel={handleCancelClose}
                confirmText="Yes, Cancel"
                cancelText="No, Keep It"
            />
        </div>
    );
};

export default TravelAuthorization;
