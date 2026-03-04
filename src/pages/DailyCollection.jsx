import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
} from '@tanstack/react-table';
import { FiCalendar, FiDownload, FiSearch, FiPrinter, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
// Using the same date formatting utility if available, or just standard JS date
import { format } from 'date-fns'; // Assumption: date-fns might be used, if not we fall back to native

const DailyCollection = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Format current date as YYYY-MM-DD for the input default
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [globalFilter, setGlobalFilter] = useState('');

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const fetchData = async () => {
        if (!selectedDate) return;
        setLoading(true);
        setError(null);
        try {
            const result = await api.getDailyCollection(selectedDate);
            setData(result);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch daily collection data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Total Amount
    const totalAmount = useMemo(() => {
        return data.reduce((sum, item) => sum + (Number(item.aop_total) || 0), 0);
    }, [data]);

    // Table Configuration
    const columnHelper = createColumnHelper();

    const columns = useMemo(
        () => [
            columnHelper.accessor('aop_control', {
                header: 'Control No.',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('ph_cname', {
                header: 'Name',
                cell: (info) => (
                    <span className="font-medium">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor('aop_ordate', {
                header: 'Date',
                cell: (info) => {
                    const dateVal = info.getValue();
                    return dateVal ? new Date(dateVal).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : '';
                },
            }),
            columnHelper.accessor('aop_orno', {
                header: 'OR No.',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('aop_nature', {
                header: 'Nature',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('aop_total', {
                header: 'Amount',
                cell: (info) => {
                    const val = Number(info.getValue()) || 0;
                    return (
                        <div className="text-right font-medium">
                            {val.toLocaleString('en-PH', {
                                style: 'currency',
                                currency: 'PHP',
                            })}
                        </div>
                    );
                },
            }),
        ],
        []
    );

    const table = useReactTable({
        data,
        columns,
        initialState: {
            pagination: {
                pageSize: 8,
            },
        },
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const { pageIndex, pageSize } = table.getState().pagination;
    const filteredRowCount = table.getFilteredRowModel().rows.length;
    const canPaginate = filteredRowCount > pageSize;
    const canPreviousPage = canPaginate && table.getCanPreviousPage();
    const canNextPage = canPaginate && table.getCanNextPage();
    const rangeStart = filteredRowCount === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = filteredRowCount === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, filteredRowCount);

    return (
        <div className={`min-h-full p-8 ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="w-full mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                            <FiCalendar className="text-violet-500" />
                            Daily Collection Report
                        </h1>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            View collection details for a specific date
                        </p>
                    </div>

                    {/* Date Picker and Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <label className="text-sm font-medium whitespace-nowrap px-2 text-gray-700 dark:text-gray-300">Date:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''
                                    }`}
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className={`p-2.5 rounded-lg shadow-sm border transition-all duration-200 ${isDark
                                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:text-violet-600 hover:bg-gray-50'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Refresh Data"
                        >
                            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Content Card */}
                <div className="w-full overflow-x-auto">
                    <div
                        className={`rounded-xl shadow-lg overflow-hidden border min-w-max ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                    >

                        {/* Toolbar */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search records..."
                                    value={globalFilter ?? ''}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm transition duration-150 ease-in-out ${isDark
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Summary for Total Rows */}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                    <span className="text-sm font-medium">ROWS:</span>
                                    <span className="text-lg font-bold">{data.length}</span>
                                </div>

                                {/* Summary for Total Amount */}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-violet-900/20 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
                                    <span className="text-sm font-medium">TOTAL:</span>
                                    <span className="text-lg font-bold">
                                        {totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-visible">
                            <table className="w-max min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'
                                                        }`}
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-12 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
                                                    <span className="text-gray-500">Loading data...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                                                No records found for this date.
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'
                                                            }`}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'
                            }`}>
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!canPreviousPage}
                                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${!canPreviousPage
                                            ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
                                            : 'text-gray-700 bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!canNextPage}
                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${!canNextPage
                                            ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
                                            : 'text-gray-700 bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                                        Showing <span className="font-medium">{rangeStart}</span> to{' '}
                                        <span className="font-medium">{rangeEnd}</span> of{' '}
                                        <span className="font-medium">{filteredRowCount}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!canPreviousPage}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium ${!canPreviousPage ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!canNextPage}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium ${!canNextPage ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyCollection;
