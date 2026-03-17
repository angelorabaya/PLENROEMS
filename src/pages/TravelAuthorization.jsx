import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiEye, FiEdit2, FiTrash2, FiUserPlus, FiUserMinus, FiChevronDown, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';

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
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    // Format in Manila timezone to avoid UTC date shifting
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d); // returns YYYY-MM-DD in en-CA locale
    return parts;
};

const todayInput = () => {
    return formatDateInput(new Date());
};

const TravelAuthorization = () => {
    const navigate = useNavigate();
    const { currentUser } = useOutletContext();

    const isAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;
        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

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
    });

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

    // Calculate how many rows fit in the available viewport space.
    // Uses a fixed row height for consistency across pages.
    const ROW_HEIGHT = 42;

    useEffect(() => {
        const calculatePageSize = () => {
            const wrapper = tableContainerRef.current;
            if (!wrapper) return;

            // Use viewport-based calculation so pagination is never clipped
            const tableTop = wrapper.getBoundingClientRect().top;
            const theadH = 37;
            const paginationH = 45;
            const bottomPad = 24;

            const totalAvailable = window.innerHeight - tableTop - bottomPad;
            const availableForRows = totalAvailable - theadH - paginationH;
            // Subtract 1 row as safety buffer to guarantee pagination visibility
            const fittingRows = Math.floor(availableForRows / ROW_HEIGHT) - 1;
            const newSize = Math.max(3, Math.min(10, fittingRows));

            setPageSize((prev) => (prev !== newSize ? newSize : prev));
        };

        const timer = setTimeout(calculatePageSize, 150);

        const handleResize = () => setTimeout(calculatePageSize, 50);
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [orders]);

    // Dynamic row calculation for the detail employee table
    useEffect(() => {
        const calculateDetailPageSize = () => {
            const container = detailContainerRef.current;
            if (!container) return;

            const containerTop = container.getBoundingClientRect().top;
            const theadH = 37;
            const paginationH = 45;
            const bottomPad = 24;

            const totalAvailable = window.innerHeight - containerTop - bottomPad;
            const availableForRows = totalAvailable - theadH - paginationH;
            const fittingRows = Math.floor(availableForRows / ROW_HEIGHT) - 1;
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
            return updated;
        });
    };

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
        });
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
        });
        setIsModalOpen(false);
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

        const fileName = `TO${toNumber}.pdf`;
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

    const handleRemoveEmployeeClick = (emp) => {
        setEmpToDelete(emp);
        setIsEmpDeleteModalOpen(true);
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

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="hstack hstack-3">
                    <h1 className="page-title">Travel Authorization</h1>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
                    + Add Travel Order
                </button>
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
            <div className="table-wrapper" ref={tableContainerRef} style={{ marginBottom: selectedOrderId ? '0' : undefined }}>
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <span className="loading-text">Loading travel orders...</span>
                    </div>
                ) : (() => {
                    const q = searchQuery.trim().toLowerCase();
                    const filteredOrders = q
                        ? orders.filter((row) =>
                            (row.to_number || '').toLowerCase().includes(q) ||
                            formatDate(row.to_dateprepared).toLowerCase().includes(q) ||
                            (row.to_destination || '').toLowerCase().includes(q) ||
                            formatDate(row.to_startdate).toLowerCase().includes(q) ||
                            formatDate(row.to_enddate).toLowerCase().includes(q) ||
                            (row.to_purpose || '').toLowerCase().includes(q) ||
                            (row.to_duration || '').toLowerCase().includes(q) ||
                            (row.to_control || '').toLowerCase().includes(q)
                        )
                        : orders;

                    // Pagination calculations
                    const totalRows = filteredOrders.length;
                    const totalPages = Math.ceil(totalRows / pageSize);
                    const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));
                    const startIndex = safePage * pageSize;
                    const endIndex = Math.min(startIndex + pageSize, totalRows);
                    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
                    const canPrevious = safePage > 0;
                    const canNext = safePage < totalPages - 1;

                    return filteredOrders.length > 0 ? (
                        <>
                            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                            <table className="data-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--secondary)' }}>
                                    <tr>
                                        <th style={{ width: '3%' }}></th>
                                        <th style={{ width: '10%' }}>T.O. Number</th>
                                        <th style={{ width: '11%' }}>Date Prepared</th>
                                        <th style={{ width: '16%' }}>Destination</th>
                                        <th style={{ width: '10%' }}>Start Date</th>
                                        <th style={{ width: '10%' }}>End Date</th>
                                        <th style={{ width: '18%' }}>Purpose</th>
                                        <th style={{ width: '7%' }}>Duration</th>
                                        <th style={{ width: '8%' }}>Control</th>
                                        <th style={{ width: '7%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map((row) => {
                                        const isSelected = selectedOrderId === row.to_ctrlno;
                                        const isCancelled = row.to_status === 'CANCELLED';
                                        return (
                                            <React.Fragment key={row.to_ctrlno}>
                                                <tr
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: isSelected
                                                            ? 'var(--accent)'
                                                            : isCancelled 
                                                                ? 'rgba(239, 68, 68, 0.05)'
                                                                : undefined,
                                                        opacity: isCancelled ? 0.7 : 1,
                                                    }}
                                                    onClick={() => toggleRowSelect(row.to_ctrlno)}
                                                >
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isSelected ? (
                                                            <FiChevronDown size={14} />
                                                        ) : (
                                                            <FiChevronRight size={14} />
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="cell-text" title={row.to_number}>
                                                            {row.to_number || ''}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(row.to_dateprepared)}</td>
                                                    <td>
                                                        <span
                                                            className="cell-text"
                                                            title={row.to_destination}
                                                        >
                                                            {row.to_destination || ''}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(row.to_startdate)}</td>
                                                    <td>{formatDate(row.to_enddate)}</td>
                                                    <td>
                                                        <span
                                                            style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                whiteSpace: 'normal',
                                                                wordBreak: 'break-word',
                                                                lineHeight: '1.4',
                                                            }}
                                                            title={row.to_purpose}
                                                        >
                                                            {row.to_purpose || ''}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="cell-text"
                                                            title={row.to_duration}
                                                        >
                                                            {row.to_duration || ''}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="cell-text" title={row.to_control}>
                                                            {row.to_control || ''}
                                                        </span>
                                                        {isCancelled && (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                marginTop: '4px',
                                                                padding: '2px 6px',
                                                                backgroundColor: 'var(--destructive)',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                fontWeight: 'bold',
                                                                borderRadius: '4px'
                                                            }}>
                                                                CANCELLED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div
                                                            className="action-buttons"
                                                            style={{ gap: '0.125rem' }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                className="btn-icon btn-icon-sm"
                                                                onClick={() => handlePreviewClick(row)}
                                                                title="Preview"
                                                            >
                                                                <FiEye size={14} />
                                                            </button>
                                                            <button
                                                                className="btn-icon btn-icon-sm"
                                                                onClick={() => handleEditClick(row)}
                                                                title="Edit"
                                                            >
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            {isAdmin && !isCancelled && (
                                                                <button
                                                                    className="btn-icon btn-icon-sm btn-icon-warning"
                                                                    style={{ color: 'var(--warning, #f59e0b)' }}
                                                                    onClick={() => handleCancelClick(row)}
                                                                    title="Cancel"
                                                                >
                                                                    <FiX size={14} />
                                                                </button>
                                                            )}
                                                            {isAdmin && (
                                                                <button
                                                                    className="btn-icon btn-icon-sm btn-icon-danger"
                                                                    onClick={() =>
                                                                        handleDeleteClick(row)
                                                                    }
                                                                    title="Delete"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>

                            {/* Pagination */}
                            <div className="pagination" style={{ flexShrink: 0 }}>
                                <span className="pagination-info">
                                    {totalRows > 0
                                        ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRows} entries`
                                        : 'No entries found'}
                                </span>
                                <div className="pagination-buttons">
                                    <button
                                        className="btn btn-outline btn-sm"
                                        disabled={!canPrevious}
                                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        disabled={!canNext}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
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
                            <p>{searchQuery.trim() ? 'No matching travel orders found.' : 'No travel orders found.'}</p>
                        </div>
                    );
                })()}
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
                                style={{ minWidth: '300px', fontSize: '13px', height: 'auto', padding: '0.5rem 2.5rem 0.5rem 0.75rem' }}
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map((emp) => (
                                    <option key={emp.emp_ctrlno} value={emp.emp_ctrlno}>
                                        {emp.emp_name}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleAddEmployee}
                                disabled={!selectedEmpId || addingEmployee}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                <FiUserPlus size={14} />
                                {addingEmployee ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>

                    <div ref={detailContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {loadingDetail ? (
                            <div className="loading-container" style={{ padding: '24px' }}>
                                <div className="spinner spinner-sm"></div>
                                <span className="loading-text">Loading employees...</span>
                            </div>
                        ) : detailEmployees.length > 0 ? (
                            <>
                                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                    <table className="data-table">
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--secondary)' }}>
                                            <tr>
                                                <th style={{ width: '80%' }}>Employee Name</th>
                                                <th style={{ width: '20%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailEmployees
                                                .slice(detailPage * detailPageSize, (detailPage + 1) * detailPageSize)
                                                .map((emp) => (
                                                    <tr key={emp.toe_ctrlno}>
                                                        <td>{emp.emp_name || ''}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button
                                                                    className="btn-icon btn-icon-sm btn-icon-danger"
                                                                    onClick={() =>
                                                                        handleRemoveEmployeeClick(emp)
                                                                    }
                                                                    title="Remove employee"
                                                                >
                                                                    <FiUserMinus size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pagination" style={{ flexShrink: 0 }}>
                                    <span className="pagination-info">
                                        {(() => {
                                            const total = detailEmployees.length;
                                            const start = total === 0 ? 0 : detailPage * detailPageSize + 1;
                                            const end = Math.min((detailPage + 1) * detailPageSize, total);
                                            return total > 0
                                                ? `Showing ${start} to ${end} of ${total} employees`
                                                : 'No employees';
                                        })()}
                                    </span>
                                    <div className="pagination-buttons">
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={detailPage === 0}
                                            onClick={() => setDetailPage((p) => p - 1)}
                                        >
                                            <FiChevronLeft size={14} />
                                        </button>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={(detailPage + 1) * detailPageSize >= detailEmployees.length}
                                            onClick={() => setDetailPage((p) => p + 1)}
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
                    <Dialog.Content className="dialog-content">
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {editingId ? 'Edit Travel Order' : 'Add Travel Order'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="dialog-close"
                                    aria-label="Close"
                                >
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="dialog-body">
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
                                    <div
                                        className="form-group"
                                        style={{ gridColumn: '1 / -1' }}
                                    >
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
                                    <div
                                        className="form-group"
                                        style={{ gridColumn: '1 / -1' }}
                                    >
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
                                            <option value="8:00 AM to 12 Noon">8:00 AM to 12 Noon</option>
                                            <option value="8:00 AM to 5:00 PM">8:00 AM to 5:00 PM</option>
                                            <option value="1:00 PM to 5:00 PM">1:00 PM to 5:00 PM</option>
                                            <option value="5:00 PM to 6:00 PM">5:00 PM to 6:00 PM</option>
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
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'Saving...'
                                        : editingId
                                            ? 'Update'
                                            : 'Save'}
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
                message={<>Are you sure you want to <strong>CANCEL</strong> travel order {rowToCancel?.to_number}?</>}
                onConfirm={handleCancelConfirm}
                onCancel={handleCancelClose}
                confirmText="Yes, Cancel"
                cancelText="No, Keep It"
            />
        </div>
    );
};

export default TravelAuthorization;
