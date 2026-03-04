import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/comparative-income-print.css';

const DEFAULT_PREPARED_BY_NAME = 'GERAN JOHN T. FLORES';
const DEFAULT_PREPARED_BY_TITLE = 'PLENRO';

const getEnvValue = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return fallback;
};

const PREPARED_BY_NAME = getEnvValue(import.meta.env.VITE_NOTED_BY_NAME, DEFAULT_PREPARED_BY_NAME);
const PREPARED_BY_TITLE = getEnvValue(
    import.meta.env.VITE_NOTED_BY_TITLE,
    DEFAULT_PREPARED_BY_TITLE
);

const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatVolume = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateFull = () => {
    return new Date().toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const ComparativeIncomeReport = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialYear = searchParams.get('year') || new Date().getFullYear();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(Number(initialYear));
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        loadAvailableYears();
    }, []);

    useEffect(() => {
        if (selectedYear) {
            loadReportData(selectedYear);
        }
    }, [selectedYear]);

    const loadAvailableYears = async () => {
        try {
            const years = await api.getReportAvailableYears();
            setAvailableYears(years);
        } catch (err) {
            console.error('Failed to load years:', err);
        }
    };

    const loadReportData = async (year) => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.getComparativeIncome(year);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        return data.reduce(
            (acc, row) => ({
                Share_Prov_30: acc.Share_Prov_30 + (Number(row.Share_Prov_30) || 0),
                Share_Mun_30: acc.Share_Mun_30 + (Number(row.Share_Mun_30) || 0),
                Share_Brgy_40: acc.Share_Brgy_40 + (Number(row.Share_Brgy_40) || 0),
                Share_Volume: acc.Share_Volume + (Number(row.Share_Volume) || 0),
                MGB_Prov_30: acc.MGB_Prov_30 + (Number(row.MGB_Prov_30) || 0),
                MGB_Volume: acc.MGB_Volume + (Number(row.MGB_Volume) || 0),
                Outbound_Fee: acc.Outbound_Fee + (Number(row.Outbound_Fee) || 0),
                Inbound_Fee: acc.Inbound_Fee + (Number(row.Inbound_Fee) || 0),
                Admin_Fee: acc.Admin_Fee + (Number(row.Admin_Fee) || 0),
                Ecosystem_Fee: acc.Ecosystem_Fee + (Number(row.Ecosystem_Fee) || 0),
                Admin_Ecosystem_Fee:
                    acc.Admin_Ecosystem_Fee + (Number(row.Admin_Ecosystem_Fee) || 0),
                Other_Misc_Fee: acc.Other_Misc_Fee + (Number(row.Other_Misc_Fee) || 0),
                Sticker_Fee: acc.Sticker_Fee + (Number(row.Sticker_Fee) || 0),
                Reg_Conveyances_Fee:
                    acc.Reg_Conveyances_Fee + (Number(row.Reg_Conveyances_Fee) || 0),
                Penalties_Fee: acc.Penalties_Fee + (Number(row.Penalties_Fee) || 0),
                Net_Share: acc.Net_Share + (Number(row.Net_Share) || 0),
                Gross_Total: acc.Gross_Total + (Number(row.Gross_Total) || 0),
            }),
            {
                Share_Prov_30: 0,
                Share_Mun_30: 0,
                Share_Brgy_40: 0,
                Share_Volume: 0,
                MGB_Prov_30: 0,
                MGB_Volume: 0,
                Outbound_Fee: 0,
                Inbound_Fee: 0,
                Admin_Fee: 0,
                Ecosystem_Fee: 0,
                Admin_Ecosystem_Fee: 0,
                Other_Misc_Fee: 0,
                Sticker_Fee: 0,
                Reg_Conveyances_Fee: 0,
                Penalties_Fee: 0,
                Net_Share: 0,
                Gross_Total: 0,
            }
        );
    }, [data]);

    const handlePrint = () => {
        window.print();
    };

    const handleYearChange = (e) => {
        const year = Number(e.target.value);
        setSelectedYear(year);
    };

    return (
        <div className="comparative-income-report" id="comparative-income-report-root">
            {/* Toolbar - Hidden when printing */}
            <div className="comparative-print-toolbar">
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/reports-hub')}>
                        Back
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print
                    </button>
                </div>
                <div className="toolbar-meta">
                    <div className="year-selector-inline">
                        <label>Year:</label>
                        <select value={selectedYear} onChange={handleYearChange}>
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span>Comparative Income Report</span>
                </div>
            </div>

            {/* Report Container */}
            <div className="report-container">
                {loading ? (
                    <div className="report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="report-error">
                        <span>Error: {error}</span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => loadReportData(selectedYear)}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="report-paper">
                        {/* Header */}
                        <div className="report-header">
                            <div className="report-header-left">
                                <div className="report-date">{formatDateFull()}</div>
                                <div className="report-recipient">TO: HONORABLE JULIETTE T. UY</div>
                                <div className="report-recipient-title">Provincial Governor</div>
                                <div className="report-title-section">
                                    <h1 className="report-main-title">
                                        COMPARATIVE INCOME - PLENRO
                                        <span className="year-badge">{selectedYear}</span>
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    {/* Group Header Row */}
                                    <tr>
                                        <th rowSpan="2" className="group-header col-month">
                                            {selectedYear}
                                            <br />
                                            MONTH
                                        </th>
                                        <th colSpan="4" className="group-header">
                                            SHARE
                                        </th>
                                        <th colSpan="2" className="group-header">
                                            MGB
                                        </th>
                                        <th colSpan="2" className="group-header">
                                            (ENRO)
                                        </th>
                                        <th colSpan="2" className="group-header">
                                            (MISOR)
                                        </th>
                                        <th colSpan="2" className="group-header">
                                            (ENRO)
                                        </th>
                                        <th colSpan="2" className="group-header">
                                            (ENRO)
                                        </th>
                                        <th rowSpan="2" className="group-header">
                                            (MISOR)
                                            <br />
                                            Penalties
                                        </th>
                                        <th rowSpan="2" className="group-header col-total">
                                            Net Share
                                        </th>
                                        <th rowSpan="2" className="group-header col-total">
                                            GROSS TOTAL
                                        </th>
                                    </tr>
                                    {/* Sub Header Row */}
                                    <tr>
                                        <th className="sub-header">30% (PROVINCE)</th>
                                        <th className="sub-header">30% (MUNIC.)</th>
                                        <th className="sub-header">40% (BRGY)</th>
                                        <th className="sub-header">Volume</th>
                                        <th className="sub-header">30% (PROV)</th>
                                        <th className="sub-header">Volume</th>
                                        <th className="sub-header">Outbound Fee</th>
                                        <th className="sub-header">Inbound Fee</th>
                                        <th className="sub-header">ADMIN Fee</th>
                                        <th className="sub-header">Ecosystem Fee</th>
                                        <th className="sub-header">Admin & Eco Fee</th>
                                        <th className="sub-header">Other Misc.</th>
                                        <th className="sub-header">STICKER</th>
                                        <th className="sub-header">Reg. Conv.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, idx) => (
                                        <tr key={`${row.Month_Name}-${idx}`}>
                                            <td className="month-cell">{row.Month_Name}</td>
                                            <td>{formatCurrency(row.Share_Prov_30)}</td>
                                            <td>{formatCurrency(row.Share_Mun_30)}</td>
                                            <td>{formatCurrency(row.Share_Brgy_40)}</td>
                                            <td>{formatVolume(row.Share_Volume)}</td>
                                            <td>{formatCurrency(row.MGB_Prov_30)}</td>
                                            <td>{formatVolume(row.MGB_Volume)}</td>
                                            <td>{formatCurrency(row.Outbound_Fee)}</td>
                                            <td>{formatCurrency(row.Inbound_Fee)}</td>
                                            <td>{formatCurrency(row.Admin_Fee)}</td>
                                            <td>{formatCurrency(row.Ecosystem_Fee)}</td>
                                            <td>{formatCurrency(row.Admin_Ecosystem_Fee)}</td>
                                            <td>{formatCurrency(row.Other_Misc_Fee)}</td>
                                            <td>{formatCurrency(row.Sticker_Fee)}</td>
                                            <td>{formatCurrency(row.Reg_Conveyances_Fee)}</td>
                                            <td>{formatCurrency(row.Penalties_Fee)}</td>
                                            <td>{formatCurrency(row.Net_Share)}</td>
                                            <td style={{ fontWeight: 600 }}>
                                                {formatCurrency(row.Gross_Total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals Row */}
                                    <tr className="totals-row">
                                        <td
                                            className="month-cell"
                                            style={{ color: 'white', background: 'transparent' }}
                                        >
                                            TOTAL
                                        </td>
                                        <td>{formatCurrency(totals.Share_Prov_30)}</td>
                                        <td>{formatCurrency(totals.Share_Mun_30)}</td>
                                        <td>{formatCurrency(totals.Share_Brgy_40)}</td>
                                        <td>{formatVolume(totals.Share_Volume)}</td>
                                        <td>{formatCurrency(totals.MGB_Prov_30)}</td>
                                        <td>{formatVolume(totals.MGB_Volume)}</td>
                                        <td>{formatCurrency(totals.Outbound_Fee)}</td>
                                        <td>{formatCurrency(totals.Inbound_Fee)}</td>
                                        <td>{formatCurrency(totals.Admin_Fee)}</td>
                                        <td>{formatCurrency(totals.Ecosystem_Fee)}</td>
                                        <td>{formatCurrency(totals.Admin_Ecosystem_Fee)}</td>
                                        <td>{formatCurrency(totals.Other_Misc_Fee)}</td>
                                        <td>{formatCurrency(totals.Sticker_Fee)}</td>
                                        <td>{formatCurrency(totals.Reg_Conveyances_Fee)}</td>
                                        <td>{formatCurrency(totals.Penalties_Fee)}</td>
                                        <td>{formatCurrency(totals.Net_Share)}</td>
                                        <td>{formatCurrency(totals.Gross_Total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="report-footer">
                            <div className="report-notes">
                                <p>
                                    <strong>Note: Old Rate:</strong> Extraction Fee: 40.00,
                                    Ecosystem Fee: 5.00
                                </p>
                                <p>
                                    <strong>New Rate:</strong> Extraction Fee: 50.00, Admin Fee:
                                    50.00, Ecosystem Fee: 50.00, Admin/Ecosystem Fee: 50.00 (Filling
                                    Materials) and Inbound Fee: 8.50 per cu.
                                </p>
                            </div>
                            <div className="report-prepared-by">
                                <div className="prepared-label">Prepared by:</div>
                                <div className="prepared-name">{PREPARED_BY_NAME}</div>
                                <div className="prepared-title">{PREPARED_BY_TITLE}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparativeIncomeReport;
