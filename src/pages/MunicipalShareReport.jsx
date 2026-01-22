import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/barangay-share-print.css';

/* ============================================
   CONFIGURATION
   ============================================ */
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
const MunicipalShareReport = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const municipality = searchParams.get('municipality') || '';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (municipality) {
            loadReportData();
        } else {
            setError('Municipality is required');
            setLoading(false);
        }
    }, [year, municipality]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching municipal share for ${municipality} - ${year}`);
            const result = await api.getMunicipalShare(year, municipality);
            console.log('Report data received:', result);
            setData(result || []);
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

    // Calculate total
    const totalAmount = data.reduce((sum, row) => sum + (Number(row.share) || 0), 0);

    const shouldShowReport = !loading && !error && data.length > 0;

    return (
        <div className="barangay-share-report">
            {/* ========== TOOLBAR (Hidden on Print) ========== */}
            <div className="barangay-print-toolbar">
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/reports-hub')}>
                        Back
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handlePrint}
                        disabled={!shouldShowReport}
                    >
                        Print
                    </button>
                </div>
                <div className="toolbar-meta">
                    Municipal Share Report — {municipality} ({year})
                </div>
            </div>

            {/* ========== REPORT CONTAINER ========== */}
            <div className="barangay-report-container">
                {loading ? (
                    <div className="barangay-report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="barangay-report-error">
                        <span>Error: {error}</span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/reports-hub')}
                        >
                            Go Back
                        </button>
                    </div>
                ) : shouldShowReport ? (
                    <div className="barangay-report-paper">
                        {/* ===== HEADER ===== */}
                        <header className="barangay-report-header">
                            <h3>REPUBLIC OF THE PHILIPPINES</h3>
                            <h4>Province of Misamis Oriental</h4>
                            <h4 className="office-name">
                                PROVINCIAL LOCAL ENVIRONMENT AND NATURAL RESOURCES OFFICE
                            </h4>
                            <p className="office-address">
                                Misortel Building, A. Luna St., Cagayan de Oro City
                            </p>
                        </header>

                        {/* ===== TITLE ===== */}
                        <section className="barangay-report-title">
                            <h1>MUNICIPAL 30% REVENUE SHARE REPORT (MONTHLY)</h1>
                            <p className="location-subtitle">
                                {municipality} - {year}
                            </p>
                        </section>

                        {/* ===== DATA TABLE ===== */}
                        <table className="barangay-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50%' }}>MONTH</th>
                                    <th style={{ width: '50%' }}>AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr key={`${row.mo}-${idx}`}>
                                        <td className="month-cell">{row.mo}</td>
                                        <td className="amount-cell">{formatCurrency(row.share)}</td>
                                    </tr>
                                ))}
                                <tr className="total-row">
                                    <td className="month-cell">
                                        <strong>TOTAL</strong>
                                    </td>
                                    <td className="amount-cell">
                                        <strong>{formatCurrency(totalAmount)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ===== SIGNATURE SECTION ===== */}
                        <section className="barangay-signature-section">
                            <p
                                style={{
                                    margin: 0,
                                    marginBottom: '1rem',
                                    border: 'none',
                                    textDecoration: 'none',
                                }}
                            >
                                Prepared by:
                            </p>
                            <p className="signature-name">{PREPARED_BY_NAME}</p>
                            <p className="signature-title">{PREPARED_BY_TITLE}</p>
                        </section>

                        {/* ===== FOOTER ===== */}
                        <footer className="barangay-report-footer">
                            <p>Provincial Local Environment and Natural Resources Office</p>
                            <p>Misortel Building, A. Luna St., Cagayan de Oro City</p>
                        </footer>
                    </div>
                ) : (
                    <div className="barangay-report-error">
                        <span>No data found for the selected criteria.</span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/reports-hub')}
                        >
                            Go Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MunicipalShareReport;
