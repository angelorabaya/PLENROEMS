import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table';
import {
    FiAlertCircle,
    FiCheckCircle,
    FiChevronDown,
    FiChevronUp,
    FiEdit2,
    FiLoader,
    FiPlus,
    FiSearch,
    FiTrash2,
} from 'react-icons/fi';
import { api } from '../services/api';
import DivisionModal from '../components/modals/DivisionModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';
import { getUserPermissions } from '../utils/permissions';

const Divisions = () => {
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pageSize, setPageSize] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDivision, setEditingDivision] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [divisionToDelete, setDivisionToDelete] = useState(null);

    const tableContainerRef = React.useRef(null);
    const { currentUser } = useOutletContext();

    const permissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);

    useEffect(() => {
        const calculateRows = () => {
            if (!tableContainerRef.current) return;

            const containerHeight = tableContainerRef.current.clientHeight;
            const availableHeight = containerHeight - 49;
            const rowHeight = 56;
            const calculatedRows = Math.floor(availableHeight / rowHeight);
            setPageSize(Math.max(5, Math.min(10, calculatedRows)));
        };

        calculateRows();

        const observer = new ResizeObserver(() => {
            calculateRows();
        });

        if (tableContainerRef.current) {
            observer.observe(tableContainerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        fetchDivisions();
    }, []);

    const fetchDivisions = async () => {
        setLoading(true);
        setError('');

        try {
            const data = await api.getDivisions();
            setDivisions(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingDivision) {
                await api.updateDivision(editingDivision.div_ctrlno, data);
                setSuccess('Division updated successfully');
            } else {
                await api.createDivision(data);
                setSuccess('Division added successfully');
            }

            await fetchDivisions();
            setIsModalOpen(false);
            setEditingDivision(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDelete = async () => {
        if (!divisionToDelete) return;

        try {
            await api.deleteDivision(divisionToDelete.div_ctrlno);
            setSuccess('Division deleted successfully');
            await fetchDivisions();
            setIsDeleteModalOpen(false);
            setDivisionToDelete(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'div_ctrlno',
                header: 'Division ID',
                size: 140,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'div_name',
                header: 'Division Name',
                size: 360,
                cell: ({ getValue }) => (
                    <span className="cell-text cell-name" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 96,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="actions-container">
                        {permissions.canUpdate && (
                            <button
                                className="btn-edit"
                                title="Edit"
                                onClick={() => {
                                    setEditingDivision(row.original);
                                    setIsModalOpen(true);
                                }}
                            >
                                <FiEdit2 className="icon-sm" />
                            </button>
                        )}
                        {permissions.canDelete && (
                            <button
                                className="btn-delete"
                                title="Delete"
                                onClick={() => {
                                    setDivisionToDelete(row.original);
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
        [permissions.canDelete, permissions.canUpdate]
    );

    const table = useReactTable({
        data: divisions,
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
                pageSize,
            },
        },
    });

    useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize, table]);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Divisions</h1>

                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search divisions..."
                            value={globalFilter ?? ''}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                        />
                    </div>
                    {permissions.canCreate && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditingDivision(null);
                                setIsModalOpen(true);
                            }}
                        >
                            <FiPlus />
                            Add Division
                        </button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="loading-container">
                    <FiLoader className="loading-spinner" />
                    <span className="loading-text">Loading divisions...</span>
                </div>
            )}

            {error && (
                <div className="alert alert-error">
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
                                                    width: header.column.getSize(),
                                                    textAlign:
                                                        header.id === 'actions' ? 'center' : 'left',
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
                                            No divisions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        {(() => {
                            const totalRows = table.getFilteredRowModel().rows.length;
                            const { pageIndex, pageSize: activePageSize } =
                                table.getState().pagination;
                            const startIndex = totalRows === 0 ? 0 : pageIndex * activePageSize + 1;
                            const endIndex = Math.min((pageIndex + 1) * activePageSize, totalRows);

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

            <DivisionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingDivision(null);
                }}
                onSave={handleSave}
                division={editingDivision}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDivisionToDelete(null);
                }}
                onConfirm={handleDelete}
                message={
                    divisionToDelete
                        ? `Are you sure you want to delete ${divisionToDelete.div_name}?`
                        : 'Are you sure you want to delete this division?'
                }
            />
        </div>
    );
};

export default Divisions;
