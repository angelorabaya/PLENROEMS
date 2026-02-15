import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiBarChart2,
    FiActivity,
    FiTrendingUp,
    FiCalendar,
    FiUsers,
    FiMapPin,
    FiTruck,
    FiCheckCircle,
    FiXCircle,
    FiArrowRight,
    FiPieChart,
    FiFileText,
} from 'react-icons/fi';
import { api } from '../services/api';
import '../styles/global.css';
import { useTheme } from '../context/ThemeContext';

// Premium category card with gradient header - now theme-aware
const CategorySection = ({ category, onReportClick, yearSelector, isDark }) => {
    const colorMap = {
        emerald: {
            gradient: 'from-emerald-500 to-emerald-600',
            bg: 'from-emerald-500/10 to-emerald-500/5',
            border: 'border-emerald-500/20',
            glow: 'bg-emerald-500',
        },
        violet: {
            gradient: 'from-violet-500 to-violet-600',
            bg: 'from-violet-500/10 to-violet-500/5',
            border: 'border-violet-500/20',
            glow: 'bg-violet-500',
        },
        blue: {
            gradient: 'from-blue-500 to-blue-600',
            bg: 'from-blue-500/10 to-blue-500/5',
            border: 'border-blue-500/20',
            glow: 'bg-blue-500',
        },
        amber: {
            gradient: 'from-amber-500 to-amber-600',
            bg: 'from-amber-500/10 to-amber-500/5',
            border: 'border-amber-500/20',
            glow: 'bg-amber-500',
        },
    };

    const colors = colorMap[category.accentColor] || colorMap.blue;

    return (
        <div className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-xl shadow-lg ${isDark ? 'shadow-black/20' : 'shadow-gray-300/50'}`}
                    >
                        <category.icon className="text-white h-6 w-6" />
                    </div>
                    <div>
                        <h2
                            className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                            {category.title}
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            {category.description}
                        </p>
                    </div>
                </div>
                {yearSelector && yearSelector}
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                    <button
                        key={report.id}
                        onClick={() => onReportClick(report.path)}
                        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg}
              border ${colors.border} backdrop-blur-sm p-5 text-left
              transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? 'hover:shadow-black/20' : 'hover:shadow-gray-300/50'}
              focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-gray-950' : 'focus:ring-offset-white'}`}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className={`bg-gradient-to-br ${colors.gradient} p-2.5 rounded-lg shadow-md ${isDark ? 'shadow-black/20' : 'shadow-gray-300/50'}`}
                            >
                                <report.icon className="text-white h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3
                                        className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                                    >
                                        {report.name}
                                    </h3>
                                    <FiArrowRight
                                        className={`h-4 w-4 transform transition-transform 
                    group-hover:translate-x-1 ${isDark ? 'text-gray-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-900'}`}
                                    />
                                </div>
                                <p
                                    className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`}
                                >
                                    {report.description}
                                </p>
                            </div>
                        </div>

                        {/* Subtle glow effect */}
                        <div
                            className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20
              ${colors.glow} group-hover:opacity-40 transition-opacity`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

const ReportsHub = () => {
    const navigate = useNavigate();
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem('reportsHub_selectedYear');
        return saved ? Number(saved) : '';
    });
    const [selectedMonth, setSelectedMonth] = useState(() => {
        return localStorage.getItem('reportsHub_selectedMonth') || '';
    });
    const [loadingYears, setLoadingYears] = useState(false);

    // Municipality and Barangay state for Shares Reports
    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [selectedMunicipality, setSelectedMunicipality] = useState(() => {
        return localStorage.getItem('reportsHub_selectedMunicipality') || '';
    });
    const [selectedBarangay, setSelectedBarangay] = useState(() => {
        return localStorage.getItem('reportsHub_selectedBarangay') || '';
    });
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    // Persist selections to localStorage
    useEffect(() => {
        if (selectedYear) localStorage.setItem('reportsHub_selectedYear', selectedYear);
    }, [selectedYear]);

    useEffect(() => {
        if (selectedMonth) localStorage.setItem('reportsHub_selectedMonth', selectedMonth);
    }, [selectedMonth]);

    useEffect(() => {
        localStorage.setItem('reportsHub_selectedMunicipality', selectedMunicipality);
    }, [selectedMunicipality]);

    useEffect(() => {
        localStorage.setItem('reportsHub_selectedBarangay', selectedBarangay);
    }, [selectedBarangay]);

    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];

    useEffect(() => {
        loadAvailableYears();
        loadMunicipalities();
        // Set default month to current month only if not already set from localStorage
        if (!selectedMonth) {
            const currentMonthIndex = new Date().getMonth();
            setSelectedMonth(months[currentMonthIndex]);
        }
    }, []);

    // Load barangays when municipality changes
    useEffect(() => {
        if (selectedMunicipality) {
            loadBarangays(selectedMunicipality);
        } else {
            setBarangays([]);
            setSelectedBarangay('');
        }
    }, [selectedMunicipality]);

    const loadAvailableYears = async () => {
        setLoadingYears(true);
        try {
            const years = await api.getReportAvailableYears();
            setAvailableYears(years);
            // Only set default if no value from localStorage
            if (years.length > 0 && !selectedYear) {
                setSelectedYear(years[0]); // Default to latest year
            }
        } catch (err) {
            console.error('Failed to load available years:', err);
        } finally {
            setLoadingYears(false);
        }
    };

    const loadMunicipalities = async () => {
        setLoadingMunicipalities(true);
        try {
            const data = await api.getMunicipalities();
            setMunicipalities(data || []);
        } catch (err) {
            console.error('Failed to load municipalities:', err);
        } finally {
            setLoadingMunicipalities(false);
        }
    };

    const loadBarangays = async (municipality) => {
        setLoadingBarangays(true);
        try {
            const data = await api.getBarangays(municipality);
            setBarangays(data || []);
            setSelectedBarangay(''); // Reset barangay when municipality changes
        } catch (err) {
            console.error('Failed to load barangays:', err);
        } finally {
            setLoadingBarangays(false);
        }
    };

    const reportCategories = [
        {
            id: 'income',
            title: 'Income Reports',
            description: 'Financial performance and revenue analytics',
            icon: FiActivity,
            accentColor: 'emerald',
            hasYearSelector: true,
            reports: [
                {
                    id: 'comparative-income',
                    name: 'Comparative Income',
                    description: 'Year-over-year income comparison and trends',
                    icon: FiTrendingUp,
                    path: '/reports/comparative-income',
                },
                {
                    id: 'revenue-collection',
                    name: 'Revenue Collection',
                    description: 'Detailed revenue breakdown by category',
                    icon: FiBarChart2,
                    path: '/reports/revenue-collection',
                },
            ],
        },
        {
            id: 'shares',
            title: 'Shares Reports (Monthly)',
            description: 'Distribution and allocation analytics',
            icon: FiPieChart,
            accentColor: 'violet',
            hasSharesSelector: true,
            reports: [
                {
                    id: 'barangay-share',
                    name: 'Barangay Share',
                    description: 'Revenue share allocation per barangay',
                    icon: FiMapPin,
                    path: '/reports/barangay-share',
                },
                {
                    id: 'barangay-share-breakdown',
                    name: 'Barangay Share Breakdown',
                    description: 'Detailed breakdown of barangay share allocation',
                    icon: FiBarChart2,
                    path: '/reports/barangay-share-breakdown',
                },
                {
                    id: 'municipal-share',
                    name: 'Municipal Share',
                    description: 'Municipal government revenue allocation',
                    icon: FiUsers,
                    path: '/reports/municipal-share',
                },
            ],
        },
        {
            id: 'permittees',
            title: 'Permittees Reports',
            description: 'Permit holder status and analytics',
            icon: FiFileText,
            accentColor: 'blue',
            reports: [
                {
                    id: 'active-permittees',
                    name: 'Active Permittees',
                    description: 'Currently active permit holders list',
                    icon: FiCheckCircle,
                    path: '/reports/active-permittees',
                },
                {
                    id: 'active-permittees-by-municipality',
                    name: 'Active Permittees by Municipality',
                    description: 'Active permit holders grouped by municipality',
                    icon: FiCalendar,
                    path: '/reports/active-permittees-by-municipality',
                },
            ],
        },
        {
            id: 'vehicle-registration',
            title: 'Vehicle Registration Reports',
            description: 'Vehicle registration status and monitoring',
            icon: FiTruck,
            accentColor: 'amber',
            reports: [
                {
                    id: 'active-registered-vehicle-records',
                    name: 'Active Registered Vehicle Records',
                    description: 'List of currently active registered vehicles',
                    icon: FiTruck,
                    path: '/reports/active-registered-vehicle-records',
                },
            ],
        },
    ];

    const handleReportClick = async (path) => {
        // Append selected year to income reports
        if (path.includes('/reports/comparative-income')) {
            navigate(`${path}?year=${selectedYear}`);
        } else if (path.includes('/reports/revenue-collection')) {
            // Include month for revenue collection
            navigate(`${path}?year=${selectedYear}&month=${selectedMonth}`);
        } else if (path.includes('/reports/active-registered-vehicle-records')) {
            try {
                const blob = await api.exportActiveRegisteredVehicleRecords();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'active_registered_vehicles.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Export active registered vehicle records failed:', err);
                alert('Failed to export active registered vehicle records.');
            }
        } else if (
            path.includes('/reports/barangay-share') ||
            path.includes('/reports/municipal-share')
        ) {
            // Include municipality and barangay for shares reports
            const params = new URLSearchParams();
            if (selectedYear) params.set('year', selectedYear);
            if (selectedMunicipality) params.set('municipality', selectedMunicipality);
            if (selectedBarangay) params.set('barangay', selectedBarangay);
            navigate(`${path}${params.toString() ? '?' + params.toString() : ''}`);
        } else {
            navigate(path);
        }
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Filter selector component for Income Reports - now theme-aware
    const IncomeFilters = () => (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Year:
                </label>
                <select
                    className={`form-select text-sm rounded-lg px-3 py-1.5 min-w-[80px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={loadingYears}
                >
                    {loadingYears ? (
                        <option>Loading...</option>
                    ) : (
                        availableYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))
                    )}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Month:
                </label>
                <select
                    className={`form-select text-sm rounded-lg px-3 py-1.5 min-w-[100px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    {months.map((month) => (
                        <option key={month} value={month}>
                            {month}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    // Filter selector component for Shares Reports - Year/Municipality/Barangay
    const SharesFilters = () => (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Year:
                </label>
                <select
                    className={`form-select text-sm rounded-lg px-3 py-1.5 min-w-[80px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={loadingYears}
                >
                    {loadingYears ? (
                        <option>Loading...</option>
                    ) : (
                        availableYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))
                    )}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Municipality:
                </label>
                <select
                    className={`form-select text-sm rounded-lg px-3 py-1.5 min-w-[140px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    disabled={loadingMunicipalities}
                >
                    <option value="">-- All --</option>
                    {loadingMunicipalities ? (
                        <option>Loading...</option>
                    ) : (
                        municipalities.map((mun) => (
                            <option key={mun.mun_name} value={mun.mun_name}>
                                {mun.mun_name}
                            </option>
                        ))
                    )}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Barangay:
                </label>
                <select
                    className={`form-select text-sm rounded-lg px-3 py-1.5 min-w-[140px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={selectedBarangay}
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    disabled={!selectedMunicipality || loadingBarangays}
                >
                    <option value="">-- All --</option>
                    {loadingBarangays ? (
                        <option>Loading...</option>
                    ) : (
                        barangays.map((brgy) => (
                            <option key={brgy.mun_brgy} value={brgy.mun_brgy}>
                                {brgy.mun_brgy}
                            </option>
                        ))
                    )}
                </select>
            </div>
        </div>
    );

    return (
        <div className={`min-h-full p-8 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <div
                    className={`sticky top-4 z-20 flex items-center gap-4 rounded-xl px-3 py-2 backdrop-blur-sm ${
                        isDark ? 'bg-gray-950/85' : 'bg-gray-50/85'
                    }`}
                >
                    <div
                        className={`bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg ${isDark ? 'shadow-black/30' : 'shadow-gray-300/50'}`}
                    >
                        <FiPieChart className="text-white h-7 w-7" />
                    </div>
                    <div>
                        <h1
                            className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                            Reports Hub
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            Analytics, insights, and comprehensive reporting
                        </p>
                    </div>
                </div>

                {/* Report Categories */}
                <div className="space-y-10">
                    {reportCategories.map((category) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            onReportClick={handleReportClick}
                            yearSelector={
                                category.hasYearSelector ? (
                                    <IncomeFilters />
                                ) : category.hasSharesSelector ? (
                                    <SharesFilters />
                                ) : null
                            }
                            isDark={isDark}
                        />
                    ))}
                </div>

                {/* Footer Info */}
                <div
                    className={`text-center pt-6 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}
                >
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        Select a report to generate detailed analytics and exportable data
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportsHub;
