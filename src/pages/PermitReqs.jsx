import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
    FiChevronUp,
    FiChevronDown,
    FiFileText,
} from 'react-icons/fi';
import { api } from '../services/api';
import PermitReqModal from '../components/modals/PermitReqModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';

const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
    const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
    const sanitized = base.replace(/[\\/]*$/, '');
    return `${sanitized}\\`;
};
const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
    import.meta.env.VITE_ATTACHMENTS_BASE_PATH
);

const PermitReqs = () => {
    const navigate = useNavigate();
    const [permitReqs, setPermitReqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pageSize, setPageSize] = useState(10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPermitReq, setEditingPermitReq] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [permitReqToDelete, setPermitReqToDelete] = useState(null);

    const tableContainerRef = React.useRef(null);

    // Calculate rows per page based on available container height
    useEffect(() => {
        const calculateRows = () => {
            if (!tableContainerRef.current) return;

            const containerHeight = tableContainerRef.current.clientHeight;
            // Subtract header height (~49px for thead)
            const availableHeight = containerHeight - 49;
            const rowHeight = 49;
            const calculatedRows = Math.floor(availableHeight / rowHeight);
            setPageSize(Math.max(5, Math.min(10, calculatedRows)));
        };

        // Initial calculation
        calculateRows();

        // Observe container resize
        const observer = new ResizeObserver(() => {
            calculateRows();
        });

        if (tableContainerRef.current) {
            observer.observe(tableContainerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        fetchPermitReqs();
    }, []);

    const fetchPermitReqs = async () => {
        setLoading(true);
        try {
            const data = await api.getPermitReqs();
            setPermitReqs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingPermitReq) {
                await api.updatePermitReq(editingPermitReq.pr_ctrlno, data);
                setSuccess('Requirement updated successfully');
            } else {
                await api.createPermitReq(data);
                setSuccess('Requirement added successfully');
            }
            fetchPermitReqs();
            setIsModalOpen(false);
            setEditingPermitReq(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDelete = async () => {
        if (!permitReqToDelete) return;
        try {
            await api.deletePermitReq(permitReqToDelete.pr_ctrlno);
            setSuccess('Requirement deleted successfully');
            fetchPermitReqs();
            setIsDeleteModalOpen(false);
            setPermitReqToDelete(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const { currentUser } = useOutletContext();

    const isAdmin = useMemo(() => {
        if (!currentUser) return false;

        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;

        // Check various admin conditions
        // 1. role is 'admin' (legacy/default)
        // 2. username is 'admin'
        // 3. log_access is 1 (standard admin flag) or '1'
        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

    const handleViewRequirements = (fileName) => {
        navigate('/newapp/preview', {
            state: {
                filePath: `${ATTACHMENTS_BASE_PATH}${fileName}`,
                displayPath: `${ATTACHMENTS_BASE_PATH}${fileName}`,
                source: fileName,
                safeName: fileName,
                returnPath: '/permitreqs',
            },
        });
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'pr_status',
                header: 'Status',
                size: 100,
                cell: ({ getValue }) => {
                    const status = getValue();
                    return <span className="cell-text">{status}</span>;
                },
            },
            {
                accessorKey: 'pr_desc',
                header: 'Description',
                size: 400,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue()}
                    </span>
                ),
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
                            onClick={() => {
                                setEditingPermitReq(row.original);
                                setIsModalOpen(true);
                            }}
                            title="Edit"
                        >
                            <FiEdit2 className="icon-sm" />
                        </button>
                        {isAdmin && (
                            <button
                                className="btn-delete"
                                onClick={() => {
                                    setPermitReqToDelete(row.original);
                                    setIsDeleteModalOpen(true);
                                }}
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
        data: permitReqs,
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
                <h1 className="page-title">Permit Requirements Management</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search all columns..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingPermitReq(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <FiPlus size={16} />
                        Add Requirement
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
            {success && (
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
                    {success}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading permit requirements...</span>
                </div>
            )}

            {/* Table */}
            {!loading && (
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
                                            No permit requirements found
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

            {/* Requirement Type Buttons */}
            <div className="hstack hstack-3" style={{ marginTop: '1.5rem' }}>
                <button
                    className="btn btn-outline"
                    onClick={() => handleViewRequirements('SAGnewapplication.pdf')}
                >
                    <FiFileText size={16} />
                    SAG Requirements
                </button>
                <button
                    className="btn btn-outline"
                    onClick={() => handleViewRequirements('QUARRYnewapplication.pdf')}
                >
                    <FiFileText size={16} />
                    Quarry Requirements
                </button>
                <button
                    className="btn btn-outline"
                    onClick={() => handleViewRequirements('RENEWAL.pdf')}
                >
                    <FiFileText size={16} />
                    Renewal Requirements
                </button>
            </div>

            <PermitReqModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                permitReq={editingPermitReq}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                message="Are you sure you want to delete this requirement?"
            />
        </div>
    );
};

export default PermitReqs;
