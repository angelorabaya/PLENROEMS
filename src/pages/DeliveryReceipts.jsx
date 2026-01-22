import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import { FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import DeliveryReceiptModal from '../components/modals/DeliveryReceiptModal';
import DeleteModal from '../components/modals/DeleteModal';

const DeliveryReceipts = () => {
    const { theme } = useTheme();
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [error, setError] = useState('');

    const [deliveryReceipts, setDeliveryReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [receiptToDelete, setReceiptToDelete] = useState(null);

    const { currentUser } = useOutletContext();

    const isAdmin = useMemo(() => {
        if (!currentUser) return false;

        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;

        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

    // Pagination state
    const [sorting, setSorting] = useState([]);
    const [pageSize, setPageSize] = useState(10);

    const tableContainerRef = useRef(null);

    // Calculate rows per page based on available container height
    useEffect(() => {
        const calculateRows = () => {
            if (!tableContainerRef.current) return;

            const containerHeight = tableContainerRef.current.clientHeight;
            // Subtract header height (~49px for thead)
            const availableHeight = containerHeight - 49;
            const rowHeight = 65;
            const calculatedRows = Math.floor(availableHeight / rowHeight);
            setPageSize(Math.max(5, Math.min(9, calculatedRows)));
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
    }, [selectedClientId, loadingReceipts]);

    // Fetch clients on mount
    useEffect(() => {
        fetchDeliveryReceiptClients();
    }, []);

    const fetchDeliveryReceiptClients = async () => {
        try {
            const data = await api.getClients();
            setClients(data);
        } catch (err) {
            setError('Failed to fetch clients: ' + err.message);
        }
    };

    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const selectClient = async (clientId) => {
        setSelectedClientId(clientId);
        setDeliveryReceipts([]);
        setError('');
        setShowClientSuggestions(false);

        if (!clientId) {
            setSelectedClient(null);
            setClientSearch('');
            return;
        }

        const client = clients.find((c) => c.ph_ctrlno == clientId);
        setSelectedClient(client);
        setClientSearch(client?.ph_cname || '');

        loadDeliveryReceipts(clientId);
    };

    const clearClient = () => {
        setSelectedClientId('');
        setSelectedClient(null);
        setClientSearch('');
        setDeliveryReceipts([]);
        setError('');
        setShowClientSuggestions(false);
    };

    const getFullAddress = (client) => {
        if (!client) return '';
        return (client.ph_address1 || '') + (client.ph_address2 ? ', ' + client.ph_address2 : '');
    };

    const loadDeliveryReceipts = async (clientId) => {
        if (!clientId) return;
        setLoadingReceipts(true);
        try {
            const data = await api.getDeliveryReceipts(clientId);
            setDeliveryReceipts(data);
        } catch (err) {
            setError('Failed to fetch delivery receipts: ' + err.message);
        } finally {
            setLoadingReceipts(false);
        }
    };

    const handleAddClick = () => {
        if (!selectedClientId) {
            setError('Please select a client first');
            return;
        }
        setEditingReceipt(null);
        setIsModalOpen(true);
        setError('');
    };

    const handleEditClick = (receipt) => {
        setEditingReceipt(receipt);
        setIsModalOpen(true);
        setError('');
    };

    const handleDeleteClick = (receipt) => {
        setReceiptToDelete(receipt);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await api.deleteDeliveryReceipt(receiptToDelete.dr_ctrlno);
            loadDeliveryReceipts(selectedClientId);
            setIsDeleteModalOpen(false);
            setReceiptToDelete(null);
        } catch (err) {
            setError('Failed to delete: ' + err.message);
        }
    };

    const handleSave = async (formData) => {
        try {
            const payload = {
                dr_clientid: selectedClientId,
                ...formData,
            };

            if (editingReceipt) {
                await api.updateDeliveryReceipt(editingReceipt.dr_ctrlno, payload);
            } else {
                await api.createDeliveryReceipt(payload);
            }

            setIsModalOpen(false);
            setEditingReceipt(null);
            loadDeliveryReceipts(selectedClientId);
        } catch (err) {
            setError('Failed to save: ' + err.message);
            throw err;
        }
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'dr_releasedate',
                header: 'Date Released',
                size: 120,
                cell: ({ getValue }) => {
                    const val = getValue();
                    return val ? new Date(val).toLocaleDateString() : '';
                },
            },
            {
                accessorKey: 'dr_stubno',
                header: 'Stub No.',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || ''}</span>,
            },
            {
                accessorKey: 'dr_stubfrom',
                header: 'Series From',
                size: 100,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || ''}</span>,
            },
            {
                accessorKey: 'dr_stubto',
                header: 'Series To',
                size: 100,
                cell: ({ getValue }) => <span className="cell-text">{getValue() || ''}</span>,
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
                            onClick={() => handleEditClick(row.original)}
                        >
                            <FiEdit2 className="icon-sm" />
                        </button>

                        {isAdmin && (
                            <button
                                className="btn-delete"
                                title="Delete"
                                onClick={() => handleDeleteClick(row.original)}
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
        data: deliveryReceipts,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
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
            <div className="page-header">
                <div className="page-title-section">
                    <img
                        src={plenroLogo}
                        alt="PLENRO Logo"
                        className="page-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h1 className="page-title">Delivery Receipts</h1>
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleAddClick}
                        disabled={!selectedClientId}
                    >
                        + Add New
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-destructive">{error}</div>}

            {/* Client Search Form */}
            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div className="transactions-compact-form">
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Client</label>
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="transactions-compact-input"
                                value={clientSearch}
                                placeholder="Type to search client..."
                                onFocus={() => {
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!clientSearch);
                                }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setClientSearch(val);
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!val);
                                    if (!val) clearClient();
                                }}
                            />
                            {selectedClientId && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        height: '100%',
                                        aspectRatio: '1',
                                    }}
                                    onClick={clearClient}
                                    title="Clear selection"
                                >
                                    ✕
                                </button>
                            )}
                            {clientSuggestions.length > 0 &&
                                showClientSuggestions &&
                                createPortal(
                                    <ul
                                        style={{
                                            position: 'absolute',
                                            top: dropdownPosition.top,
                                            left: dropdownPosition.left,
                                            width: dropdownPosition.width,
                                            zIndex: 9999,
                                            background: theme === 'light' ? '#ffffff' : '#1c1c1e',
                                            border:
                                                theme === 'light'
                                                    ? '1px solid #e4e4e7'
                                                    : '1px solid #27272a',
                                            color: theme === 'light' ? '#09090b' : '#fafafa',
                                            borderRadius: '6px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            margin: '4px 0 0 0',
                                            padding: 0,
                                            listStyle: 'none',
                                            boxShadow:
                                                theme === 'light'
                                                    ? '0 4px 12px rgba(0,0,0,0.1)'
                                                    : '0 4px 12px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        {clientSuggestions.map((c) => (
                                            <li
                                                key={c.ph_ctrlno}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    borderBottom: '1px solid var(--border)',
                                                    color:
                                                        theme === 'light' ? '#09090b' : '#fafafa',
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.target.style.background =
                                                        theme === 'light' ? '#f4f4f5' : '#27272a')
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.target.style.background = 'transparent')
                                                }
                                                onClick={() => selectClient(c.ph_ctrlno)}
                                            >
                                                {c.ph_cname}
                                            </li>
                                        ))}
                                    </ul>,
                                    document.body
                                )}
                        </div>
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Address</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={getFullAddress(selectedClient)}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">TIN</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_TIN || ''}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Contact</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_contact || ''}
                            readOnly
                        />
                    </div>
                </div>
            </div>

            {/* Table with Pagination */}
            {selectedClientId ? (
                loadingReceipts ? (
                    <div
                        className="table-container"
                        style={{ padding: '24px', textAlign: 'center' }}
                    >
                        <div className="spinner"></div> Loading records...
                    </div>
                ) : (
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
                                                            header.id === 'actions'
                                                                ? 'center'
                                                                : 'left',
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
                                                No delivery receipts found. Click "Add New" to
                                                create one.
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
                )
            ) : (
                <div
                    className="table-container"
                    style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                >
                    <p>Select a client to view or manage delivery receipts</p>
                </div>
            )}

            {/* Delivery Receipt Modal */}
            <DeliveryReceiptModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingReceipt(null);
                }}
                onSave={handleSave}
                receipt={editingReceipt}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setReceiptToDelete(null);
                }}
                onConfirm={handleDelete}
                message="Are you sure you want to delete this delivery receipt?"
            />
        </div>
    );
};

export default DeliveryReceipts;
