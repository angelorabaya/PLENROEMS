import React, { useState, useEffect, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import * as Dialog from '@radix-ui/react-dialog';
import { FiSearch, FiRefreshCw, FiChevronUp, FiChevronDown, FiEye, FiX } from 'react-icons/fi';
import { api } from '../services/api';
import '../styles/global.css';
import '../components/modals/Modal.css';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([{ id: 'CreatedAt', desc: true }]);
    const [pageSize, setPageSize] = useState(10);

    // Use localStorage for persistent page index
    const [pageIndex, setPageIndexState] = useState(() => {
        const saved = localStorage.getItem('activityLogsPageIndex');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Calculate rows per page based on window height
    useEffect(() => {
        const calculateRows = () => {
            const offset = 320; // Standard offset matching AssessmentHistory
            const minRowHeight = 56;
            const availableHeight = window.innerHeight - offset;
            const calculatedRows = Math.floor(availableHeight / minRowHeight);
            setPageSize(Math.max(5, calculatedRows));
        };

        calculateRows();
        window.addEventListener('resize', calculateRows);
        return () => window.removeEventListener('resize', calculateRows);
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getActivityLogs();
            setLogs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const formatJSON = (jsonString) => {
        try {
            if (!jsonString) return 'N/A';
            const obj = JSON.parse(jsonString);
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return jsonString;
        }
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'CreatedAt',
                header: 'Date & Time',
                size: 180,
                cell: ({ getValue }) => (
                    <span className="cell-text">{new Date(getValue()).toLocaleString()}</span>
                ),
            },
            {
                accessorKey: 'UserName',
                header: 'User',
                size: 200,
                cell: ({ row }) => (
                    <div className="vstack vstack-0">
                        <span className="cell-text font-medium">
                            {row.original.UserName || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted">
                            @{row.original.UserID || 'System'}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: 'ActionType',
                header: 'Action',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'TableName',
                header: 'Table',
                size: 150,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'RecordID',
                header: 'Record ID',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || '-'}</span>,
            },
            {
                accessorKey: 'IPAddress',
                header: 'IP Address',
                size: 140,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                id: 'actions',
                header: 'Details',
                size: 80,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        <button
                            className="btn-view"
                            onClick={() => handleViewDetails(row.original)}
                            title="View Details"
                        >
                            <FiEye className="icon-sm" />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    // Initialize TanStack Table
    const table = useReactTable({
        data: logs,
        columns,
        state: {
            globalFilter,
            sorting,
            pagination: {
                pageIndex,
                pageSize,
            },
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: false,
    });

    // Custom pagination handlers that save to localStorage
    const goToNextPage = () => {
        if (table.getCanNextPage()) {
            const newIndex = pageIndex + 1;
            localStorage.setItem('activityLogsPageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    const goToPreviousPage = () => {
        if (table.getCanPreviousPage()) {
            const newIndex = pageIndex - 1;
            localStorage.setItem('activityLogsPageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    // Update page size and reset index if needed
    useEffect(() => {
        // table.setPageSize(pageSize); // Not needed as it's passed in state
        const maxPage = Math.ceil(logs.length / pageSize) - 1;
        if (pageIndex > maxPage && maxPage >= 0) {
            setPageIndexState(maxPage);
            localStorage.setItem('activityLogsPageIndex', maxPage.toString());
        }
    }, [pageSize, logs.length, pageIndex]);

    return (
        <div className="page-container activity-page-container">
            {/* Header Section */}
            <div className="page-header">
                <h1 className="page-title">Audit Logs</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Filter logs..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-ghost"
                        onClick={fetchLogs}
                        disabled={loading}
                        title="Refresh Logs"
                    >
                        <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
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

            {/* Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading audit logs...</span>
                </div>
            ) : (
                <div className="table-wrapper activity-table-wrapper">
                    <div className="activity-table-scroll">
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
                                                    textAlign:
                                                        header.id === 'actions' ? 'center' : 'left',
                                                    width: header.column.getSize(),
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className="table-empty">
                                            No audit logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        <span className="pagination-info">
                            {table.getFilteredRowModel().rows.length} row(s)
                        </span>
                        <div className="pagination-buttons">
                            <button
                                className="btn btn-outline btn-sm"
                                disabled={!table.getCanPreviousPage()}
                                onClick={goToPreviousPage}
                            >
                                Previous
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                disabled={!table.getCanNextPage()}
                                onClick={goToNextPage}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content
                        className="dialog-content"
                        style={{ maxWidth: '90vw', width: '900px' }}
                    >
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Audit Log Details</Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div
                            className="dialog-body"
                            style={{ maxHeight: '60vh', overflow: 'auto' }}
                        >
                            {selectedLog && (
                                <div className="vstack vstack-4">
                                    <div>
                                        <label className="form-label font-semibold">Changes:</label>
                                        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                <span className="text-xs text-muted">
                                                    OLD VALUES
                                                </span>
                                                <div
                                                    className="code-block"
                                                    style={{
                                                        maxHeight: '300px',
                                                        marginTop: '0.5rem',
                                                    }}
                                                >
                                                    {formatJSON(selectedLog.OldValues)}
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                <span className="text-xs text-muted">
                                                    NEW VALUES
                                                </span>
                                                <div
                                                    className="code-block"
                                                    style={{
                                                        maxHeight: '300px',
                                                        marginTop: '0.5rem',
                                                        color: 'var(--foreground)',
                                                    }}
                                                >
                                                    {formatJSON(selectedLog.NewValues)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label font-semibold">
                                            User Agent:
                                        </label>
                                        <p
                                            className="text-xs text-muted"
                                            style={{ wordBreak: 'break-word' }}
                                        >
                                            {selectedLog.UserAgent || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="dialog-footer">
                            <Dialog.Close asChild>
                                <button type="button" className="btn btn-ghost">
                                    Close
                                </button>
                            </Dialog.Close>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }

                /* Layout Fixes for Activity Logs */
                .activity-page-container {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden !important; /* Override global page-container overflow */
                }

                .activity-table-wrapper {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    overflow: hidden;
                    min-height: 0;
                }

                .activity-table-scroll {
                    flex: 1;
                    overflow: auto;
                    position: relative;
                }

                /* Sticky Header */
                .activity-table-wrapper .table-head {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background-color: var(--secondary); /* Ensure background is opaque */
                }
            `}</style>
        </div>
    );
};

export default ActivityLogs;
