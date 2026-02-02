import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/revenue-collection-print.css';

/* ============================================
   CONFIGURATION
   ============================================ */
const DEFAULT_PREPARED_BY_NAME = 'GERAN JOHN T. FLORES';
const DEFAULT_PREPARED_BY_TITLE = 'PLENRO';
const DEFAULT_VERIFIED_BY_NAME = 'RONALD JAME D. VIOLON, CPA';
const DEFAULT_VERIFIED_BY_TITLE = 'PROVINCIAL TREASURER';

const getEnvValue = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return fallback;
};

const PREPARED_BY_NAME = getEnvValue(import.meta.env.VITE_NOTED_BY_NAME, DEFAULT_PREPARED_BY_NAME);
const PREPARED_BY_TITLE = getEnvValue(
    import.meta.env.VITE_NOTED_BY_TITLE,
    DEFAULT_PREPARED_BY_TITLE
);
const VERIFIED_BY_NAME = getEnvValue(
    import.meta.env.VITE_VERIFIED_BY_NAME,
    DEFAULT_VERIFIED_BY_NAME
);
const VERIFIED_BY_TITLE = getEnvValue(
    import.meta.env.VITE_VERIFIED_BY_TITLE,
    DEFAULT_VERIFIED_BY_TITLE
);

/* ============================================
   UTILITIES
   ============================================ */
const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/* ============================================
   COMPONENT
   ============================================ */
const RevenueCollectionReport = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const month = searchParams.get('month') || 'January';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReportData();
    }, [year, month]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching report for ${month} ${year}`);
            const result = await api.getRevenueCollection(year, month);
            console.log('Report data received:', result);
            setData(result || {});
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate extraction fee (sum of Province, Municipal, Barangay shares)
    const extractionFee = data
        ? (Number(data.Share_Prov_30) || 0) +
        (Number(data.Share_Mun_30) || 0) +
        (Number(data.Share_Brgy_40) || 0)
        : 0;

    // Calculate MGB Extraction Fee
    const extractionFeeMGB = data ? Number(data.MGB_Prov_30) || 0 : 0;

    // Calculate total
    const totalAmount = data
        ? extractionFee +
        extractionFeeMGB +
        (Number(data.Admin_Fee) || 0) +
        (Number(data.Ecosystem_Fee) || 0) +
        (Number(data.Admin_Ecosystem_Fee) || 0) +
        (Number(data.Other_Misc_Fee) || 0) +
        (Number(data.Outbound_Fee) || 0) +
        (Number(data.Inbound_Fee) || 0) +
        (Number(data.Sticker_Fee) || 0) +
        (Number(data.Reg_Conveyances_Fee) || 0) +
        (Number(data.Penalties_Fee) || 0)
        : 0;

    const shouldShowReport = !loading && !error && data !== null;

    return (
        <div className="revenue-collection-report">
            {/* ========== TOOLBAR (Hidden on Print) ========== */}
            <div className="revenue-print-toolbar">
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/reports-hub')}>
                        Back
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print
                    </button>
                </div>
                <div className="toolbar-meta">
                    Revenue Collection Report — {month} {year}
                </div>
            </div>

            {/* ========== REPORT CONTAINER ========== */}
            <div className="revenue-report-container">
                {loading ? (
                    <div className="report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="report-error">
                        <span>Error: {error}</span>
                        <button className="btn btn-secondary" onClick={loadReportData}>
                            Retry
                        </button>
                    </div>
                ) : shouldShowReport ? (
                    <div className="revenue-report-paper">
                        {/* ===== HEADER ===== */}
                        <header className="revenue-report-header">
                            <div className="header-text">
                                <h3>REPUBLIC OF THE PHILIPPINES</h3>
                                <h4>Province of Misamis Oriental</h4>
                                <h4 className="office-name">
                                    Provincial Local Environment and Natural Resources Office
                                </h4>
                                <p className="office-address">
                                    Misortel Building, A. Luna St., Cagayan de Oro City
                                </p>
                            </div>
                        </header>

                        {/* ===== TITLE ===== */}
                        <section className="revenue-report-title">
                            <h1>Revenue Collection Report</h1>
                            <p className="report-date">
                                For the Month of {month}, {year}
                            </p>
                        </section>

                        {/* ===== FEES TABLE ===== */}
                        <table className="revenue-table">
                            <thead>
                                <tr className="table-header">
                                    <th style={{ width: '65%' }}>Particulars</th>
                                    <th style={{ width: '35%' }}>Amount (₱)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Extraction Fee</td>
                                    <td className="amount">{formatCurrency(extractionFee)}</td>
                                </tr>
                                <tr>
                                    <td>Extraction Fee (MGB)</td>
                                    <td className="amount">{formatCurrency(extractionFeeMGB)}</td>
                                </tr>
                                <tr>
                                    <td>Administrative Fee</td>
                                    <td className="amount">{formatCurrency(data.Admin_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Ecosystem Services Fee</td>
                                    <td className="amount">{formatCurrency(data.Ecosystem_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Admin & Ecosystem Fee</td>
                                    <td className="amount">
                                        {formatCurrency(data.Admin_Ecosystem_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Other Miscellaneous Fee</td>
                                    <td className="amount">
                                        {formatCurrency(data.Other_Misc_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Outbound Fee</td>
                                    <td className="amount">{formatCurrency(data.Outbound_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Inbound Fee</td>
                                    <td className="amount">{formatCurrency(data.Inbound_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Sticker Fee</td>
                                    <td className="amount">{formatCurrency(data.Sticker_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Registration (Conveyances)</td>
                                    <td className="amount">
                                        {formatCurrency(data.Reg_Conveyances_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Penalties</td>
                                    <td className="amount">{formatCurrency(data.Penalties_Fee)}</td>
                                </tr>
                                <tr className="total-row">
                                    <td>
                                        <strong>TOTAL COLLECTION (GROSS)</strong>
                                    </td>
                                    <td className="amount">
                                        <strong>{formatCurrency(totalAmount)}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td>LESS: Municipal Share (30% of Extraction Fee)</td>
                                    <td className="amount">{formatCurrency(data.Share_Mun_30)}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <span style={{ visibility: 'hidden' }}>LESS: </span>
                                        Barangay Share (40% of Extraction Fee)
                                    </td>
                                    <td className="amount">{formatCurrency(data.Share_Brgy_40)}</td>
                                </tr>
                                <tr className="total-row">
                                    <td>
                                        <strong>TOTAL COLLECTION (NET)</strong>
                                    </td>
                                    <td className="amount">
                                        <strong>{formatCurrency(data.Net_Share)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ===== SIGNATURE SECTION ===== */}

                        {/* ===== SIGNATURE SECTION ===== */}
                        <section className="signature-section">
                            <div className="signature-block">
                                <p className="signature-label">Prepared by:</p>
                                <p className="signature-name">{PREPARED_BY_NAME}</p>
                                <p className="signature-title">{PREPARED_BY_TITLE}</p>
                            </div>
                            <div className="signature-block">
                                <p className="signature-label">Verified by:</p>
                                <p className="signature-name">{VERIFIED_BY_NAME}</p>
                                <p className="signature-title">{VERIFIED_BY_TITLE}</p>
                            </div>
                        </section>

                        {/* ===== FOOTER ===== */}
                        <footer className="revenue-report-footer">
                            <p>Provincial Local Environment and Natural Resources Office</p>
                            <p>
                                Misortel Building, A. Luna St., Provincial Capitol Compound, Cagayan
                                de Oro City
                            </p>
                        </footer>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default RevenueCollectionReport;
