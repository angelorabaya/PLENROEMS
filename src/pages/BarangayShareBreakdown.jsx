import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/barangay-share-breakdown-print.css';

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

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-PH');
};

/* ============================================
   COMPONENT
   ============================================ */
const BarangayShareBreakdown = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const municipality = searchParams.get('municipality') || '';
    const barangay = searchParams.get('barangay') || '';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (municipality && barangay) {
            loadReportData();
        } else {
            setError('Municipality and Barangay are required');
            setLoading(false);
        }
    }, [year, municipality, barangay]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(
                `Fetching barangay share breakdown for ${barangay}, ${municipality} - ${year}`
            );
            const result = await api.getBarangayShareBreakdown(year, municipality, barangay);
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

    const totalShare = data.reduce((sum, row) => sum + (Number(row.Share) || 0), 0);

    const shouldShowReport = !loading && !error && data.length > 0;

    return (
        <div className="barangay-share-breakdown-report">
            <div className="barangay-breakdown-print-toolbar">
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
                    Barangay Share Report Breakdown - {barangay}, {municipality} ({year})
                </div>
            </div>

            <div className="barangay-breakdown-report-container">
                {loading ? (
                    <div className="barangay-breakdown-report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="barangay-breakdown-report-error">
                        <span>Error: {error}</span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/reports-hub')}
                        >
                            Go Back
                        </button>
                    </div>
                ) : shouldShowReport ? (
                    <div className="barangay-breakdown-report-paper">
                        <header className="barangay-breakdown-report-header">
                            <h3>REPUBLIC OF THE PHILIPPINES</h3>
                            <h4>Province of Misamis Oriental</h4>
                            <h4 className="office-name">
                                PROVINCIAL LOCAL ENVIRONMENT AND NATURAL RESOURCES OFFICE
                            </h4>
                            <p className="office-address">
                                Misortel Building, A. Luna St., Cagayan de Oro City
                            </p>
                        </header>

                        <section className="barangay-breakdown-report-title">
                            <h1>BARANGAY SHARE REPORT BREAKDOWN</h1>
                            <p className="location-subtitle">
                                {barangay}, {municipality} - {year}
                            </p>
                        </section>

                        <table className="barangay-breakdown-table">
                            <colgroup>
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '9%' }} />
                                <col style={{ width: '17%' }} />
                                <col style={{ width: '29%' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '15%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Control No.</th>
                                    <th>OR Date</th>
                                    <th>OR No.</th>
                                    <th>Name</th>
                                    <th>Amount</th>
                                    <th>Percent</th>
                                    <th>Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr key={`${row['Control No.'] || idx}-${idx}`}>
                                        <td>{row['Control No.']}</td>
                                        <td>{formatDate(row['OR Date'])}</td>
                                        <td>{row['OR No.']}</td>
                                        <td>{row.Name}</td>
                                        <td className="amount-cell">
                                            {formatCurrency(row.Amount)}
                                        </td>
                                        <td className="amount-cell">{row.Percent}</td>
                                        <td className="amount-cell">{formatCurrency(row.Share)}</td>
                                    </tr>
                                ))}
                                <tr className="total-row">
                                    <td colSpan={6}>
                                        <strong>TOTAL</strong>
                                    </td>
                                    <td className="amount-cell">
                                        <strong>{formatCurrency(totalShare)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="barangay-breakdown-signature-section">
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

                        <footer className="barangay-breakdown-report-footer">
                            <p>Provincial Local Environment and Natural Resources Office</p>
                            <p>Misortel Building, A. Luna St., Cagayan de Oro City</p>
                        </footer>
                    </div>
                ) : (
                    <div className="barangay-breakdown-report-error">
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

export default BarangayShareBreakdown;
