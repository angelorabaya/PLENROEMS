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
    FiChevronLeft,
    FiChevronRight,
    FiChevronUp,
    FiChevronDown,
    FiEye,
    FiTrash2,
} from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';

const AssessmentHistory = () => {
    const navigate = useNavigate();
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

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sorting, setSorting] = useState([{ id: 'aop_date', desc: true }]);
    const [pageSize, setPageSize] = useState(10);

    // Use localStorage for persistent search filter
    const [globalFilter, setGlobalFilterState] = useState(() => {
        const saved = localStorage.getItem('paymentSearchFilter');
        return saved || '';
    });

    const setGlobalFilter = (value) => {
        localStorage.setItem('paymentSearchFilter', value || '');
        setGlobalFilterState(value);
    };

    // Use localStorage for persistent page index
    const [pageIndex, setPageIndexState] = useState(() => {
        const saved = localStorage.getItem('paymentPageIndex');
        return saved ? parseInt(saved, 10) : 0;
    });

    const [previewLoading, setPreviewLoading] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

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
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const data = await api.getPaymentRegistrations();
            setPayments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!paymentToDelete) return;
        try {
            await api.deletePaymentRegistration(paymentToDelete.aop_ctrlno);
            // Optimistically remove the deleted record from local state immediately
            setPayments((prev) =>
                prev.filter((p) => p.aop_ctrlno !== paymentToDelete.aop_ctrlno)
            );
            setIsDeleteModalOpen(false);
            setPaymentToDelete(null);
            setSuccess('Payment registration deleted successfully');
            setTimeout(() => setSuccess(''), 3000);
            // Also refresh from server to ensure consistency
            await fetchPayments();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const buildPreviewData = (header, details) => {
        const address = [header.ph_address1, header.ph_address2].filter(Boolean).join(', ');
        const barangayText =
            header.aop_brgycombo != null && header.aop_brgycombo !== ''
                ? header.aop_brgycombo
                : header.aop_brgy || '';
        const location = [barangayText, header.aop_mun].filter(Boolean).join(', ');
        const totalAmount = Number(header.aop_total) || 0;
        const preparedBy = (
            currentUser?.log_cname ||
            currentUser?.log_name ||
            'ADMINISTRATOR'
        ).toUpperCase();
        const shareBreakdown = (() => {
            const isGovShare = (header.aop_nature || '').toLowerCase().includes('government share');
            if (!isGovShare) return null;
            const shares = [
                { label: 'Prov. of Misamis Oriental', percent: 0.3 },
                {
                    label: header.aop_mun ? `Mun. of ${header.aop_mun}` : 'Municipality',
                    percent: 0.3,
                },
                { label: barangayText ? `Brgy. of ${barangayText}` : 'Barangay', percent: 0.4 },
            ];
            return {
                total: totalAmount,
                shares: shares.map((s) => ({
                    ...s,
                    amount: +(totalAmount * s.percent).toFixed(2),
                })),
            };
        })();

        return {
            clientName: header.ph_cname || '',
            tin: header.ph_TIN || 'N/A',
            address: address || 'N/A',
            projectLocation: location || 'N/A',
            natureOfPayment: header.aop_nature || '',
            assessmentDate: header.aop_date,
            controlNo: header.aop_control,
            totalAmount,
            remarks: header.aop_remarks || '',
            preparedBy,
            shareBreakdown,
            items: (details || []).map((item) => ({
                item: item.aop_item,
                volume: item.aop_volume,
                measurement: item.aop_measure,
                charge: item.aop_charge,
                total: item.aop_total,
                volumeLocked: (item.aop_measure || '').toLowerCase() === 'n/a',
            })),
        };
    };

    const handlePreview = async (payment) => {
        try {
            setPreviewLoading(payment.aop_control);
            const data = await api.getAssessmentByControl(payment.aop_control);
            const previewData = buildPreviewData(data.header, data.details);
            const isGovShare = (previewData.natureOfPayment || '')
                .toLowerCase()
                .includes('government share');
            navigate(isGovShare ? '/assessment/share' : '/assessment/preview', {
                state: { previewData },
            });
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        } finally {
            setPreviewLoading('');
        }
    };

    // Define columns for TanStack Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'aop_control',
                header: 'Control No.',
                size: 140,
                cell: ({ getValue }) => <span className="cell-text">{getValue()}</span>,
            },
            {
                accessorKey: 'ph_cname',
                header: 'Name',
                size: 200,
                cell: ({ getValue }) => (
                    <span className="cell-text cell-name" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorKey: 'aop_date',
                header: 'Date',
                size: 120,
                cell: ({ getValue }) => {
                    const dateObj = new Date(getValue());
                    const dateStr = dateObj.toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    });
                    return <span className="cell-text">{dateStr}</span>;
                },
            },
            {
                accessorKey: 'aop_nature',
                header: 'Nature',
                size: 180,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue()}
                    </span>
                ),
            },
            {
                accessorKey: 'aop_total',
                header: 'Total',
                size: 140,
                cell: ({ getValue }) => {
                    const total = parseFloat(getValue() || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                    return <span className="cell-text">{total}</span>;
                },
            },
            {
                accessorKey: 'aop_remarks',
                header: 'Remarks',
                size: 150,
                cell: ({ getValue }) => (
                    <span className="cell-text" title={getValue()}>
                        {getValue() || '-'}
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
                            className="btn-view"
                            onClick={() => handlePreview(row.original)}
                            disabled={previewLoading === row.original.aop_control}
                            title="Preview"
                        >
                            {previewLoading === row.original.aop_control ? (
                                <div className="spinner spinner-sm"></div>
                            ) : (
                                <FiEye className="icon-sm" />
                            )}
                        </button>
                        {isAdmin && (
                            <button
                                className="btn-delete"
                                onClick={() => {
                                    setPaymentToDelete(row.original);
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
        [previewLoading, isAdmin]
    );

    // Initialize TanStack Table
    const table = useReactTable({
        data: payments,
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
            localStorage.setItem('paymentPageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    const goToPreviousPage = () => {
        if (table.getCanPreviousPage()) {
            const newIndex = pageIndex - 1;
            localStorage.setItem('paymentPageIndex', newIndex.toString());
            setPageIndexState(newIndex);
        }
    };

    // Update page size when it changes - but don't reset page index
    useEffect(() => {
        const maxPage = Math.ceil(payments.length / pageSize) - 1;
        if (pageIndex > maxPage && maxPage >= 0) {
            setPageIndexState(maxPage);
            localStorage.setItem('paymentPageIndex', maxPage.toString());
        }
    }, [pageSize, payments.length, pageIndex]);

    return (
        <div className="page-container">
            {/* Header Section */}
            <div className="page-header">
                <h1 className="page-title">Assessment History</h1>
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
                    <span className="loading-text">Loading assessment history...</span>
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
                                                            : header.id === 'aop_total'
                                                              ? 'right'
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
                                                                : header.id === 'aop_total'
                                                                  ? 'flex-end'
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
                                                                : cell.column.id === 'aop_total'
                                                                  ? 'right'
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
                                            No payment records found
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

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                message="Are you sure you want to delete this payment registration?"
            />
        </div>
    );
};

export default AssessmentHistory;
