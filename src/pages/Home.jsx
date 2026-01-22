import React, { useState, useEffect } from 'react';
import {
    Card,
    Metric,
    Text,
    Flex,
    BadgeDelta,
    Grid,
    Title,
    AreaChart,
    Subtitle,
    ProgressBar,
} from '@tremor/react';
import { FiFileText, FiTruck, FiClipboard, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import '../styles/global.css';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const formatCurrency = (value) => {
    const formatted = new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
    return `₱${formatted}`;
};

const formatNumber = (value) => {
    return new Intl.NumberFormat('en-PH').format(value);
};

// Premium KPI Card with subtle gradient - now theme-aware
const KPICard = ({ title, value, subtitle, icon: Icon, accentColor, trend, isDark }) => {
    const colorMap = {
        emerald: {
            bg: 'from-emerald-500/10 to-emerald-500/5',
            icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            border: 'border-emerald-500/20',
        },
        blue: {
            bg: 'from-blue-500/10 to-blue-500/5',
            icon: 'bg-gradient-to-br from-blue-500 to-blue-600',
            border: 'border-blue-500/20',
        },
        amber: {
            bg: 'from-amber-500/10 to-amber-500/5',
            icon: 'bg-gradient-to-br from-amber-500 to-amber-600',
            border: 'border-amber-500/20',
        },
        violet: {
            bg: 'from-violet-500/10 to-violet-500/5',
            icon: 'bg-gradient-to-br from-violet-500 to-violet-600',
            border: 'border-violet-500/20',
        },
        teal: {
            bg: 'from-teal-500/10 to-teal-500/5',
            icon: 'bg-gradient-to-br from-teal-500 to-teal-600',
            border: 'border-teal-500/20',
        },
    };

    const colors = colorMap[accentColor] || colorMap.blue;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} 
        border ${colors.border} backdrop-blur-sm p-6
        transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? 'hover:shadow-black/20' : 'hover:shadow-gray-300/50'}`}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p
                        className={`text-sm font-medium tracking-wide uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                        {title}
                    </p>
                    <p
                        className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        {value}
                    </p>
                    {subtitle && (
                        <div className="flex items-center gap-2">
                            {trend !== undefined && trend !== null && (
                                <BadgeDelta
                                    deltaType={
                                        trend >= 10
                                            ? 'increase'
                                            : trend >= 0
                                              ? 'moderateIncrease'
                                              : trend >= -10
                                                ? 'moderateDecrease'
                                                : 'decrease'
                                    }
                                    size="sm"
                                    className="text-xs"
                                >
                                    {Math.abs(trend).toFixed(1)}%
                                </BadgeDelta>
                            )}
                            <span
                                className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}
                            >
                                {subtitle}
                            </span>
                        </div>
                    )}
                </div>
                <div
                    className={`${colors.icon} p-3.5 rounded-xl shadow-lg ${isDark ? 'shadow-black/20' : 'shadow-gray-300/50'}
          flex items-center justify-center`}
                >
                    <Icon className="text-white h-6 w-6" />
                </div>
            </div>

            {/* Subtle glow effect */}
            <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20
        ${accentColor === 'emerald' ? 'bg-emerald-500' : ''}
        ${accentColor === 'blue' ? 'bg-blue-500' : ''}
        ${accentColor === 'amber' ? 'bg-amber-500' : ''}
        ${accentColor === 'violet' ? 'bg-violet-500' : ''}
        ${accentColor === 'teal' ? 'bg-teal-500' : ''}
      `}
            />
        </div>
    );
};

// Premium Peso Icon
const PesoIcon = ({ className }) => <span className={`font-bold text-lg ${className}`}>₱</span>;

const Home = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [availableYears, setAvailableYears] = useState([]);
    const [year1, setYear1] = useState(new Date().getFullYear());
    const [year2, setYear2] = useState(new Date().getFullYear() - 1);

    useEffect(() => {
        loadAvailableYears();
        loadDashboardStats();
    }, []);

    const loadAvailableYears = async () => {
        try {
            const years = await api.getReportAvailableYears();
            setAvailableYears(years);
        } catch (error) {
            console.error('Failed to load available years:', error);
        }
    };

    const loadDashboardStats = async () => {
        try {
            setLoading(true);
            const data = await api.getDashboardStats({ year1, year2 });
            setStats(data);
            setError('');
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const calculateTrend = () => {
        if (!stats || !stats.collectionLastYear || stats.collectionLastYear === 0) return null;
        return (
            ((stats.collectionThisYear - stats.collectionLastYear) / stats.collectionLastYear) * 100
        );
    };

    if (loading) {
        return (
            <div
                className={`flex items-center justify-center h-full ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}
            >
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div
                            className={`w-16 h-16 border-4 ${isDark ? 'border-gray-800' : 'border-gray-200'} rounded-full`}
                        ></div>
                        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    const trend = calculateTrend();
    const yearProgress =
        stats?.collectionThisYear && stats?.collectionLastYear
            ? Math.min((stats.collectionThisYear / stats.collectionLastYear) * 100, 100)
            : 0;

    return (
        <div className={`min-h-full p-8 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={`p-2 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-200'}`}
                        >
                            <img
                                src={plenroLogo}
                                alt="PLENRO Logo"
                                className="w-10 h-10 object-contain"
                                onError={(e) => (e.target.style.display = 'none')}
                            />
                        </div>
                        <div>
                            <h1
                                className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
                            >
                                Dashboard
                            </h1>
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                PLENRO Environmental Management System
                            </p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                {error && (
                    <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Revenue Section */}
                <div className="space-y-4">
                    <h2
                        className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                        <span className="text-emerald-500 font-bold">₱</span>
                        Revenue Overview
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <KPICard
                            title={`Collection ${stats?.latestYear || 'This Year'}`}
                            value={formatCurrency(stats?.collectionThisYear || 0)}
                            subtitle="vs previous year"
                            icon={FiTrendingUp}
                            accentColor="emerald"
                            trend={trend}
                            isDark={isDark}
                        />
                        <KPICard
                            title={`Collection ${stats?.previousYear || 'Last Year'}`}
                            value={formatCurrency(stats?.collectionLastYear || 0)}
                            subtitle={`Year ${stats?.previousYear || ''} Total`}
                            icon={FiTrendingUp}
                            accentColor="blue"
                            isDark={isDark}
                        />
                    </div>

                    {/* Year Progress */}
                    {stats?.collectionLastYear > 0 && (
                        <Card
                            className={`ring-0 p-5 ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                        >
                            <Flex>
                                <Text className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                    Year-to-Date Progress
                                </Text>
                                <Text
                                    className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                                >
                                    {yearProgress.toFixed(1)}% of last year
                                </Text>
                            </Flex>
                            <ProgressBar value={yearProgress} color="emerald" className="mt-3" />
                        </Card>
                    )}
                </div>

                {/* Operations Section */}
                <div className="space-y-4">
                    <h2
                        className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                        <FiClipboard className="text-violet-500" />
                        Operations Summary
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard
                            title="Pending Applications"
                            value={formatNumber(stats?.pendingApplications || 0)}
                            subtitle="Awaiting processing"
                            icon={FiClipboard}
                            accentColor="amber"
                            isDark={isDark}
                        />
                        <KPICard
                            title="Active Permits"
                            value={formatNumber(stats?.activePermits || 0)}
                            subtitle="Currently valid"
                            icon={FiFileText}
                            accentColor="violet"
                            isDark={isDark}
                        />
                        <KPICard
                            title="Active Vehicles"
                            value={formatNumber(stats?.activeVehicles || 0)}
                            subtitle="Registered & valid"
                            icon={FiTruck}
                            accentColor="teal"
                            isDark={isDark}
                        />
                    </div>
                </div>

                {/* Chart Section */}
                <div className="space-y-4">
                    <h2
                        className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                        Monthly Collection Trend
                    </h2>

                    <Card
                        className={`ring-0 p-6 ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <Title
                                    className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}
                                >
                                    Year Comparison
                                </Title>
                                <Subtitle className={isDark ? 'text-gray-500' : 'text-gray-600'}>
                                    Revenue breakdown for selected years
                                </Subtitle>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                                    <select
                                        value={year1}
                                        onChange={(e) => setYear1(Number(e.target.value))}
                                        className={`text-sm rounded-lg border-none ring-1 py-1 pl-2 pr-8 cursor-pointer focus:ring-2 focus:ring-emerald-500
                                            ${isDark ? 'bg-gray-800 text-white ring-gray-700' : 'bg-white text-gray-700 ring-gray-200'}`}
                                    >
                                        {availableYears.map((yr) => (
                                            <option key={`y1-${yr}`} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                    <select
                                        value={year2}
                                        onChange={(e) => setYear2(Number(e.target.value))}
                                        className={`text-sm rounded-lg border-none ring-1 py-1 pl-2 pr-8 cursor-pointer focus:ring-2 focus:ring-emerald-500
                                            ${isDark ? 'bg-gray-800 text-white ring-gray-700' : 'bg-white text-gray-700 ring-gray-200'}`}
                                    >
                                        {availableYears.map((yr) => (
                                            <option key={`y2-${yr}`} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={loadDashboardStats}
                                    className={`p-1.5 rounded-lg border transition-colors
                                        ${
                                            isDark
                                                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                                                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    title="Refresh Chart"
                                >
                                    <FiRefreshCw
                                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {stats?.latestYear &&
                        stats?.previousYear &&
                        stats?.monthlyCollection?.length > 0 ? (
                            <AreaChart
                                className="h-80 chart-small-font"
                                data={stats.monthlyCollection}
                                index="month"
                                categories={[String(stats.latestYear), String(stats.previousYear)]}
                                colors={['cyan', 'rose']}
                                valueFormatter={(value) => formatCurrency(value)}
                                yAxisWidth={95}
                                showAnimation={true}
                                showGridLines={false}
                            />
                        ) : (
                            <div
                                className={`h-80 flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                            >
                                Loading chart data...
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Home;
