import React, { useState, useEffect, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import { FiSearch, FiChevronUp, FiChevronDown, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import NatureOfPaymentDetailModal from '../components/modals/NatureOfPaymentDetailModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';

const NatureOfPayment = () => {
    const [natures, setNatures] = useState([]);
    const [selectedNature, setSelectedNature] = useState('');
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pageSize, setPageSize] = useState(9);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingDetail, setDeletingDetail] = useState(null);

    // Check admin status
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin =
        currentUser.log_user === 'admin' ||
        currentUser.log_access === 1 ||
        currentUser.log_access === '1';

    const tableContainerRef = React.useRef(null);

    // Fetch nature of payments list on mount
    useEffect(() => {
        fetchNatures();
    }, []);

    // Fetch details when nature is selected
    useEffect(() => {
        if (selectedNature) {
            fetchDetails(selectedNature);
        } else {
            setDetails([]);
        }
    }, [selectedNature]);

    const fetchNatures = async () => {
        setLoading(true);
        try {
            const data = await api.getNatureOfPaymentList();
            setNatures(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (npCtrlno) => {
        setDetailsLoading(true);
        try {
            const data = await api.getNatureOfPaymentDetailsByNature(npCtrlno);
            setDetails(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleAddDetail = () => {
        setEditingDetail(null);
        setIsModalOpen(true);
    };

    const handleEditDetail = (detail) => {
        setEditingDetail(detail);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (detail) => {
        setDeletingDetail(detail);
        setIsDeleteModalOpen(true);
    };

    const handleSaveDetail = async (formData) => {
        try {
            if (editingDetail) {
                await api.updateNatureOfPaymentDetail(editingDetail.np_ctrlno, formData);
                setSuccessMessage('Detail updated successfully');
            } else {
                await api.createNatureOfPaymentDetail(formData);
                setSuccessMessage('Detail added successfully');
            }
            setIsModalOpen(false);
            fetchDetails(selectedNature);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await api.deleteNatureOfPaymentDetail(deletingDetail.np_ctrlno);
            setSuccessMessage('Detail deleted successfully');
            setIsDeleteModalOpen(false);
            setDeletingDetail(null);
            fetchDetails(selectedNature);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'np_desc',
                header: 'Description',
                size: 220,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorKey: 'np_unitcharge',
                header: 'Charge',
                size: 100,
                cell: ({ getValue }) => {
                    const value = getValue();
                    return (
                        <span className="cell-text">
                            {value != null
                                ? `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                : '-'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'np_ucsecond',
                header: '2nd Violation',
                size: 110,
                cell: ({ getValue }) => {
                    const value = getValue();
                    return (
                        <span className="cell-text">
                            {value != null
                                ? `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                : '-'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'np_ucthird',
                header: '3rd Violation',
                size: 110,
                cell: ({ getValue }) => {
                    const value = getValue();
                    return (
                        <span className="cell-text">
                            {value != null
                                ? `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                : '-'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'np_measure',
                header: 'Measure',
                size: 100,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || '-'}</span>,
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 100,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        <button
                            className="btn-edit"
                            onClick={() => handleEditDetail(row.original)}
                            title="Edit"
                        >
                            <FiEdit2 className="icon-sm" />
                        </button>
                        {isAdmin && (
                            <button
                                className="btn-delete"
                                onClick={() => handleDeleteClick(row.original)}
                                title="Delete"
                            >
                                <FiTrash2 className="icon-sm" />
                            </button>
                        )}
                    </div>
                ),
            },
        ],
        [isAdmin]
    );

    // Initialize TanStack Table
    const table = useReactTable({
        data: details,
        columns,
        state: {
            globalFilter,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: pageSize,
            },
        },
    });

    // Update page size when it changes
    useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize, table]);

    return (
        <div className="page-container">
            {/* Header Section */}
            <div className="page-header">
                <h1 className="page-title">Nature of Payment</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search details..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            disabled={!selectedNature}
                        />
                    </div>
                    {selectedNature && (
                        <button className="btn btn-primary" onClick={handleAddDetail}>
                            <FiPlus size={16} />
                            Add Detail
                        </button>
                    )}
                </div>
            </div>

            {/* Nature Selector */}
            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div className="transactions-compact-form">
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Nature</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedNature}
                            onChange={(e) => setSelectedNature(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">-- Select Nature of Payment --</option>
                            {natures.map((nature) => (
                                <option key={nature.np_ctrlno} value={nature.np_ctrlno}>
                                    {nature.np_desc}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="alert alert-error">
                    <svg
                        className="alert-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="alert alert-success">
                    <svg
                        className="alert-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {successMessage}
                </div>
            )}

            {/* Loading */}
            {(loading || detailsLoading) && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">
                        {loading ? 'Loading nature of payments...' : 'Loading details...'}
                    </span>
                </div>
            )}

            {/* Details Table */}
            {!loading && !detailsLoading && selectedNature && (
                <div className="table-wrapper">
                    <div className="table-scroll-container" ref={tableContainerRef}>
                        <table className="table">
                            <thead className="table-header">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id} className="table-row">
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={header.id}
                                                className={`table-head ${header.column.getCanSort() ? 'table-head-sortable' : ''}`}
                                                onClick={
                                                    header.column.getCanSort()
                                                        ? header.column.getToggleSortingHandler()
                                                        : undefined
                                                }
                                                style={{
                                                    textAlign: 'left',
                                                    width: header.column.getSize(),
                                                }}
                                            >
                                                <div
                                                    className="sort-header"
                                                    style={{ justifyContent: 'flex-start' }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <span className="sort-icon">
                                                            {header.column.getIsSorted() ===
                                                            'asc' ? (
                                                                <FiChevronUp className="sort-icon-active" />
                                                            ) : header.column.getIsSorted() ===
                                                              'desc' ? (
                                                                <FiChevronDown className="sort-icon-active" />
                                                            ) : (
                                                                <FiChevronUp className="sort-icon-inactive" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id} className="table-row">
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="table-cell"
                                                    style={{ textAlign: 'left' }}
                                                >
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
                                        <td colSpan={columns.length} className="table-empty">
                                            No details found for the selected nature of payment
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        {(() => {
                            const totalRows = table.getFilteredRowModel().rows.length;
                            const { pageIndex, pageSize } = table.getState().pagination;
                            const startIndex = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
                            const endIndex = Math.min((pageIndex + 1) * pageSize, totalRows);

                            return (
                                <span className="pagination-info">
                                    {totalRows > 0
                                        ? `Showing ${startIndex} to ${endIndex} of ${totalRows} entries`
                                        : 'No entries found'}
                                </span>
                            );
                        })()}
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
                </div>
            )}

            {/* Empty State when no nature selected */}
            {!loading && !detailsLoading && !selectedNature && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Please select a Nature of Payment to view its details
                    </p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <NatureOfPaymentDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveDetail}
                detail={editingDetail}
                natureId={selectedNature}
            />

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingDetail(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Payment Detail"
                message={`Are you sure you want to delete "${deletingDetail?.np_desc}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default NatureOfPayment;
