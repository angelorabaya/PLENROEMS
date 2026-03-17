import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const formatVolume = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const TaskForceMonthly = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || 'January';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReportData();
    }, [year, month]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.getMonthlyEnvironmentalLoadMonitoring(year, month);
            setData(result || []);
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalVolume = useMemo(
        () => data.reduce((sum, row) => sum + (Number(row.VOLUME) || 0), 0),
        [data]
    );

    const handlePrint = () => {
        window.print();
    };

    const shouldShowReport = !loading && !error && data.length > 0;

    return (
        <div className="active-permittees-report">
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
                <div className="toolbar-meta">
                    Monthly Environmental Load Monitoring - {month} {year}
                </div>
            </div>

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

                        <section className="permittees-report-title">
                            <h1>MONTHLY ENVIRONMENTAL LOAD MONITORING</h1>
                            <p className="report-count">
                                Filters: Month - {month} | Year - {year}
                            </p>
                        </section>

                        <table className="permittees-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '70%' }}>NAME</th>
                                    <th style={{ width: '30%' }}>VOLUME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr key={`${row.NAME || 'name'}-${idx}`}>
                                        <td className="name-cell">{row.NAME}</td>
                                        <td className="center-cell">{formatVolume(row.VOLUME)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                    <td className="center-cell" style={{ fontWeight: 700 }}>
                                        {formatVolume(totalVolume)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="permittees-signature-section">
                            <p>Prepared by:</p>
                            <p className="signature-name">{PREPARED_BY_NAME}</p>
                            <p className="signature-title">{PREPARED_BY_TITLE}</p>
                        </section>
                    </div>
                ) : (
                    <div className="permittees-report-error">
                        <span>
                            No records found for {month} {year}.
                        </span>
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

export default TaskForceMonthly;
