import React, { useState, useEffect, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import {
    FiSearch,
    FiChevronUp,
    FiChevronDown,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiImage,
    FiDownload,
} from 'react-icons/fi';
import { api } from '../services/api';
import { API_BASE } from '../services/apiBase';
import AccomplishmentDetailModal from '../components/modals/AccomplishmentDetailModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';
import { getUserPermissions } from '../utils/permissions';
import { formatDatePHT, formatDateInputPHT } from '../utils/dateUtils';

const AccomplishmentReport = () => {
    const [divisions, setDivisions] = useState([]);
    const [selectedDivision, setSelectedDivision] = useState('');
    const [details, setDetails] = useState([]);
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pageSize] = useState(9);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingDetail, setDeletingDetail] = useState(null);

    // Check user permissions
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const permissions = getUserPermissions(currentUser);

    const tableContainerRef = React.useRef(null);

    // Fetch divisions list on mount
    useEffect(() => {
        fetchDivisions();
    }, []);

    // Fetch accomplishment details when division is selected
    useEffect(() => {
        if (selectedDivision) {
            fetchDetails(selectedDivision);
        } else {
            setDetails([]);
        }
    }, [selectedDivision]);

    const fetchDivisions = async () => {
        setLoading(true);
        try {
            const data = await api.getDivisions();
            setDivisions(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (divCtrlno) => {
        setDetailsLoading(true);
        try {
            const data = await api.getAccomplishmentsByDivision(divCtrlno);
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
                await api.updateAccomplishment(editingDetail.ar_ctrlno, formData);
                setSuccessMessage('Accomplishment updated successfully');
            } else {
                await api.createAccomplishment(formData);
                setSuccessMessage('Accomplishment added successfully');
            }
            setIsModalOpen(false);
            fetchDetails(selectedDivision);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
            throw err;
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await api.deleteAccomplishment(deletingDetail.ar_ctrlno);
            setSuccessMessage('Accomplishment deleted successfully');
            setIsDeleteModalOpen(false);
            setDeletingDetail(null);
            fetchDetails(selectedDivision);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleOpenImage = (filename) => {
        if (!filename) return;
        const url = api.getAccomplishmentImageUrl(filename);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const filteredDetails = useMemo(() => {
        return details.filter((row) => {
            const rowFrom = formatDateInputPHT(row.ar_datefrom);
            if (dateFromFilter && rowFrom && rowFrom < dateFromFilter) {
                return false;
            }
            if (dateToFilter && rowFrom && rowFrom > dateToFilter) {
                return false;
            }
            return true;
        });
    }, [details, dateFromFilter, dateToFilter]);

    const handleExportExcel = async () => {
        if (!selectedDivision) return;
        setExporting(true);
        try {
            let blob;
            if (typeof api.exportAccomplishments === 'function') {
                blob = await api.exportAccomplishments(
                    selectedDivision,
                    dateFromFilter,
                    dateToFilter
                );
            } else {
                const params = new URLSearchParams();
                if (dateFromFilter) params.append('fromDate', dateFromFilter);
                if (dateToFilter) params.append('toDate', dateToFilter);
                const query = params.toString() ? `?${params.toString()}` : '';
                const response = await fetch(
                    `${API_BASE}/api/accomplishments/${encodeURIComponent(selectedDivision)}/export${query}`
                );
                if (!response.ok) throw new Error('Failed to export accomplishments');
                blob = await response.blob();
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const divObj = divisions.find(
                (d) => String(d.div_ctrlno) === String(selectedDivision)
            );
            const safeDivName = (divObj?.div_name || 'division')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_|_$/g, '');
            link.download = `accomplishment_report_${safeDivName}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to export accomplishments');
            setTimeout(() => setError(''), 3000);
        } finally {
            setExporting(false);
        }
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'ar_datefrom',
                header: 'Date From',
                size: 110,
                cell: ({ getValue }) => {
                    const formatted = formatDatePHT(getValue());
                    return <span className="cell-text">{formatted || '-'}</span>;
                },
            },
            {
                accessorKey: 'ar_dateto',
                header: 'Date To',
                size: 110,
                cell: ({ getValue }) => {
                    const formatted = formatDatePHT(getValue());
                    return <span className="cell-text">{formatted || '-'}</span>;
                },
            },
            {
                accessorKey: 'ar_place',
                header: 'Place',
                size: 150,
                cell: ({ getValue }) => (
                    <span
                        className="cell-text"
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            overflow: 'visible',
                            textOverflow: 'clip',
                        }}
                    >
                        {getValue() || '-'}
                    </span>
                ),
            },
            {
                accessorKey: 'ar_program',
                header: 'Program',
                size: 200,
                cell: ({ getValue }) => (
                    <span
                        className="cell-text"
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            overflow: 'visible',
                            textOverflow: 'clip',
                        }}
                    >
                        {getValue() || '-'}
                    </span>
                ),
            },
            {
                accessorKey: 'ar_target',
                header: 'Target',
                size: 180,
                cell: ({ getValue }) => (
                    <span
                        className="cell-text"
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            overflow: 'visible',
                            textOverflow: 'clip',
                        }}
                    >
                        {getValue() || '-'}
                    </span>
                ),
            },
            {
                accessorKey: 'ar_remarks',
                header: 'Remarks',
                size: 180,
                cell: ({ getValue }) => (
                    <span
                        className="cell-text"
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            overflow: 'visible',
                            textOverflow: 'clip',
                        }}
                    >
                        {getValue() || '-'}
                    </span>
                ),
            },
            {
                id: 'images',
                header: 'Images',
                size: 160,
                enableSorting: false,
                cell: ({ row }) => {
                    const item = row.original;
                    const imgs = [
                        { slot: 1, name: item.ar_image1 },
                        { slot: 2, name: item.ar_image2 },
                        { slot: 3, name: item.ar_image3 },
                        { slot: 4, name: item.ar_image4 },
                        { slot: 5, name: item.ar_image5 },
                    ].filter((img) => img.name);

                    if (imgs.length === 0) {
                        return <span className="cell-text">-</span>;
                    }

                    return (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {imgs.map((img) => (
                                <button
                                    key={img.slot}
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    style={{
                                        padding: '2px 6px',
                                        height: '24px',
                                        fontSize: '0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                    }}
                                    title={img.name}
                                    onClick={() => handleOpenImage(img.name)}
                                >
                                    <FiImage size={12} />
                                    {img.slot}
                                </button>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 100,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        {permissions.canUpdate && (
                            <button
                                className="btn-edit"
                                onClick={() => handleEditDetail(row.original)}
                                title="Edit"
                            >
                                <FiEdit2 className="icon-sm" />
                            </button>
                        )}
                        {permissions.canDelete && (
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
        [permissions.canDelete, permissions.canUpdate]
    );

    // Initialize TanStack Table
    const table = useReactTable({
        data: filteredDetails,
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
                <h1 className="page-title">Accomplishment Report</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search accomplishments..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            disabled={!selectedDivision}
                        />
                    </div>
                    {selectedDivision && (
                        <button
                            className="btn btn-export-excel"
                            type="button"
                            onClick={handleExportExcel}
                            disabled={exporting || filteredDetails.length === 0}
                        >
                            <FiDownload size={16} />
                            {exporting ? 'Exporting...' : 'Export to Excel'}
                        </button>
                    )}
                    {selectedDivision && permissions.canCreate && (
                        <button className="btn btn-primary" onClick={handleAddDetail}>
                            <FiPlus size={16} />
                            Add Accomplishment
                        </button>
                    )}
                </div>
            </div>

            {/* Division & Date Filters */}
            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div
                    className="transactions-compact-form"
                    style={{
                        gridTemplateColumns: selectedDivision ? '2fr 1fr 1fr auto' : '1fr',
                        alignItems: 'end',
                    }}
                >
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Division</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedDivision}
                            onChange={(e) => {
                                setSelectedDivision(e.target.value);
                                setDateFromFilter('');
                                setDateToFilter('');
                            }}
                            disabled={loading}
                        >
                            <option value="">-- Select Division --</option>
                            {divisions.map((div) => (
                                <option key={div.div_ctrlno} value={div.div_ctrlno}>
                                    {div.div_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDivision && (
                        <>
                            <div className="transactions-compact-group">
                                <label className="transactions-compact-label">Date From</label>
                                <input
                                    type="date"
                                    className="transactions-compact-input"
                                    value={dateFromFilter}
                                    onChange={(e) => setDateFromFilter(e.target.value)}
                                />
                            </div>
                            <div className="transactions-compact-group">
                                <label className="transactions-compact-label">Date To</label>
                                <input
                                    type="date"
                                    className="transactions-compact-input"
                                    value={dateToFilter}
                                    onChange={(e) => setDateToFilter(e.target.value)}
                                />
                            </div>
                            {(dateFromFilter || dateToFilter) && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ height: '36px' }}
                                    onClick={() => {
                                        setDateFromFilter('');
                                        setDateToFilter('');
                                    }}
                                >
                                    Clear Dates
                                </button>
                            )}
                        </>
                    )}
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
                        {loading ? 'Loading divisions...' : 'Loading accomplishments...'}
                    </span>
                </div>
            )}

            {/* Details Table */}
            {!loading && !detailsLoading && selectedDivision && (
                <div className="table-wrapper">
                    <div
                        className="table-scroll-container"
                        ref={tableContainerRef}
                        style={{ overflowY: 'auto' }}
                    >
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
                                            No accomplishments found for the selected division
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

            {/* Empty State when no division selected */}
            {!loading && !detailsLoading && !selectedDivision && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Please select a Division to view its accomplishments
                    </p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <AccomplishmentDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveDetail}
                detail={editingDetail}
                divisionId={selectedDivision}
            />

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingDetail(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Accomplishment"
                message={`Are you sure you want to delete "${deletingDetail?.ar_program}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default AccomplishmentReport;
