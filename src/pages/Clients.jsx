import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
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
    FiLoader,
    FiAlertCircle,
    FiCheckCircle,
} from 'react-icons/fi';
import { api } from '../services/api';
import ClientModal from '../components/modals/ClientModal';
import DeleteModal from '../components/modals/DeleteModal';

import '../styles/global.css';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pageSize, setPageSize] = useState(10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);

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
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const data = await api.getClients();
            data.sort((a, b) => (a.ph_cname || '').localeCompare(b.ph_cname || ''));
            setClients(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (clientData) => {
        try {
            if (editingClient) {
                await api.updateClient(editingClient.ph_ctrlno, clientData);
                setSuccess('Client updated successfully');
            } else {
                await api.createClient(clientData);
                setSuccess('Client added successfully');
            }
            fetchClients();
            setIsModalOpen(false);
            setEditingClient(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDelete = async () => {
        if (!clientToDelete) return;
        try {
            await api.deleteClient(clientToDelete.ph_ctrlno);
            setSuccess('Client deleted successfully');
            fetchClients();
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
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

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'ph_cname',
                header: 'Name',
                size: 180,
                cell: ({ getValue }) => (
                    <span className="cell-text cell-name" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorFn: (row) =>
                    `${row.ph_address1 || ''}${row.ph_address2 ? ', ' + row.ph_address2 : ''}`,
                id: 'address',
                header: 'Address',
                size: 220,
                cell: ({ getValue }) => (
                    <span className="cell-text cell-address" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorKey: 'ph_TIN',
                header: 'TIN',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'ph_ctype',
                header: 'Type',
                size: 100,
                cell: ({ getValue }) => <span className="badge-secondary">{getValue()}</span>,
            },
            {
                accessorKey: 'ph_contact',
                header: 'Contact',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 80,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        <button
                            className="btn-edit"
                            title="Edit"
                            onClick={() => {
                                setEditingClient(row.original);
                                setIsModalOpen(true);
                            }}
                        >
                            <FiEdit2 className="icon-sm" />
                        </button>
                        {isAdmin && (
                            <button
                                className="btn-delete"
                                title="Delete"
                                onClick={() => {
                                    setClientToDelete(row.original);
                                    setIsDeleteModalOpen(true);
                                }}
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
        data: clients,
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
                <h1 className="page-title">Clients Management</h1>

                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" />
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
                            setEditingClient(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <FiPlus /> Add Client
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {loading && (
                <div className="loading-container">
                    <FiLoader className="loading-spinner" />
                    <span className="loading-text">Loading clients...</span>
                </div>
            )}
            {error && (
                <div className="alert alert-destructive">
                    <FiAlertCircle className="alert-icon" />
                    {error}
                </div>
            )}
            {success && (
                <div className="alert alert-success">
                    <FiCheckCircle className="alert-icon" />
                    {success}
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
                                            No clients found
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

            <ClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                client={editingClient}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                message="Are you sure you want to delete this client?"
            />
        </div>
    );
};

export default Clients;
