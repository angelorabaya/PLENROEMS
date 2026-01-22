import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/active-permittees-print.css';

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
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatValidity = (fromDate, toDate) => {
    const from = formatDate(fromDate);
    const to = formatDate(toDate);
    if (from && to) return `${from} - ${to}`;
    if (from) return from;
    return '';
};

/* ============================================
   COMPONENT
   ============================================ */
const ActivePermitteesReport = () => {
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReportData();
    }, []);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching active permittees');
            const result = await api.getActivePermittees();
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

    const shouldShowReport = !loading && !error && data.length > 0;

    return (
        <div className="active-permittees-report">
            {/* ========== TOOLBAR (Hidden on Print) ========== */}
            <div className="permittees-print-toolbar">
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
                <div className="toolbar-meta">Active Permittees Report — {data.length} records</div>
            </div>

            {/* ========== REPORT CONTAINER ========== */}
            <div className="permittees-report-container">
                {loading ? (
                    <div className="permittees-report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="permittees-report-error">
                        <span>Error: {error}</span>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/reports-hub')}
                        >
                            Go Back
                        </button>
                    </div>
                ) : shouldShowReport ? (
                    <div className="permittees-report-paper">
                        {/* ===== HEADER ===== */}
                        <header className="permittees-report-header">
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
                        <section className="permittees-report-title">
                            <h1>ACTIVE PERMITTEES</h1>
                            <p className="report-count">Total: {data.length} permit holders</p>
                        </section>

                        {/* ===== DATA TABLE ===== */}
                        <table className="permittees-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>NAME</th>
                                    <th style={{ width: '12%' }}>MUNICIPALITY</th>
                                    <th style={{ width: '12%' }}>BARANGAY</th>
                                    <th style={{ width: '8%' }}>VOLUME</th>
                                    <th style={{ width: '28%' }}>VALIDITY</th>
                                    <th style={{ width: '15%' }}>PERMIT NO.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr key={row.num_row || idx}>
                                        <td className="name-cell">{row.ph_cname}</td>
                                        <td className="center-cell">{row.ph_mun}</td>
                                        <td className="center-cell">{row.ph_brgy}</td>
                                        <td className="center-cell">{row.ph_volume}</td>
                                        <td className="center-cell">
                                            {formatValidity(row.ph_dfrom, row.ph_dto)}
                                        </td>
                                        <td className="center-cell">{row.ph_permitno}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ===== SIGNATURE SECTION ===== */}
                        <section className="permittees-signature-section">
                            <p>Prepared by:</p>
                            <p className="signature-name">{PREPARED_BY_NAME}</p>
                            <p className="signature-title">{PREPARED_BY_TITLE}</p>
                        </section>
                    </div>
                ) : (
                    <div className="permittees-report-error">
                        <span>No active permittees found.</span>
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

export default ActivePermitteesReport;
