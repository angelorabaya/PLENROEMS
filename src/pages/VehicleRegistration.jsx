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
import { FiSearch, FiChevronUp, FiChevronDown, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import VehicleModal from '../components/modals/VehicleModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';

const VehicleRegistration = () => {
    const { currentUser } = useOutletContext() || {};

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

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sorting, setSorting] = useState([{ id: 'vr_datereg', desc: true }]);
    const [pageSize, setPageSize] = useState(10);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);

    // Use localStorage for persistent search filter
    const [globalFilter, setGlobalFilterState] = useState(() => {
        const saved = localStorage.getItem('vehicleSearchFilter');
        return saved || '';
    });

    const setGlobalFilter = (value) => {
        localStorage.setItem('vehicleSearchFilter', value || '');
        setGlobalFilterState(value);
        setPageIndexState(0);
        localStorage.setItem('vehiclePageIndex', '0');
    };

    // Use localStorage for persistent page index
    const [pageIndex, setPageIndexState] = useState(() => {
        const saved = localStorage.getItem('vehiclePageIndex');
        return saved ? parseInt(saved, 10) : 0;
    });

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
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const data = await api.getVehicleRegistrations();
            setVehicles(data);
        } catch (err) {
            setError('Failed to load vehicles');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentVehicle(null);
        setIsModalOpen(true);
    };

    const handleEdit = (vehicle) => {
        setCurrentVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (vehicle) => {
        setVehicleToDelete(vehicle);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async (vehicleData) => {
        try {
            if (currentVehicle) {
                await api.updateVehicleRegistration(currentVehicle.vr_ctrlno, vehicleData);
                setSuccess('Vehicle updated successfully');
            } else {
                await api.createVehicleRegistration(vehicleData);
                setSuccess('Vehicle added successfully');
            }
            setIsModalOpen(false);
            fetchVehicles();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Operation failed: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            await api.deleteVehicleRegistration(vehicleToDelete.vr_ctrlno);
            setSuccess('Vehicle deleted successfully');
            setIsDeleteModalOpen(false);
            fetchVehicles();
            setVehicleToDelete(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete vehicle');
            setTimeout(() => setError(''), 3000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const getStatus = (expiryDate) => {
        if (!expiryDate) return <span className="status-badge inactive">No Expiry</span>;

        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        const isActive = expiry >= today;

        return (
            <span className={`status-badge ${isActive ? 'status-active' : 'status-expired'}`}>
                {isActive ? 'Active' : 'Expired'}
            </span>
        );
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'vr_cname',
                header: 'Name',
                size: 200,
                cell: ({ getValue }) => (
                    <span className="cell-text cell-name" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorKey: 'vr_trucktype',
                header: 'Truck Type',
                size: 150,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'vr_plateno',
                header: 'Plate No.',
                size: 130,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'vr_controlno',
                header: 'Control',
                size: 130,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'vr_code',
                header: 'Code',
                size: 100,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'vr_expiry',
                header: 'Status',
                size: 120,
                cell: ({ getValue }) => getStatus(getValue()),
            },
            {
                accessorKey: 'vr_datereg',
                header: 'Date Reg.',
                size: 120,
                cell: ({ getValue }) => <span className="cell-text">{formatDate(getValue())}</span>,
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 100,
                cell: ({ row }) => (
                    <div className="actions-container">
                        <button
                            className="btn-edit"
                            onClick={() => handleEdit(row.original)}
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
        data: vehicles,
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

    const goToNextPage = () => {
        if (table.getCanNextPage()) {
            const newIndex = pageIndex + 1;
            localStorage.setItem('vehiclePageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    const goToPreviousPage = () => {
        if (table.getCanPreviousPage()) {
            const newIndex = pageIndex - 1;
            localStorage.setItem('vehiclePageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    // Update page size logic to prevent index out of bounds
    useEffect(() => {
        const maxPage = Math.ceil(vehicles.length / pageSize) - 1;
        if (pageIndex > maxPage && maxPage >= 0) {
            setPageIndexState(maxPage);
            localStorage.setItem('vehiclePageIndex', maxPage.toString());
        }
    }, [pageSize, vehicles.length, pageIndex]);

    return (
        <div className="page-container">
            {/* Header Section */}
            <div className="page-header">
                <h1 className="page-title">Vehicle Registration</h1>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search vehicles..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        + Add Vehicle
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

            {/* Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading vehicles...</span>
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
                                            No vehicles found
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

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                vehicle={currentVehicle}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Vehicle"
                message={`Are you sure you want to delete vehicle ${vehicleToDelete?.vr_plateno}?`}
            />
        </div>
    );
};

export default VehicleRegistration;
