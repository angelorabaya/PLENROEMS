import React, { useState, useEffect, useMemo } from 'react';
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
   COMPONENT
   ============================================ */
const ActivePermitteesByMunicipalityReport = () => {
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
            const result = await api.getActivePermitteesByMunicipality();
            setData(result || []);
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const groupedData = useMemo(() => {
        const groups = [];
        const map = new Map();

        data.forEach((row) => {
            const municipality = row.Municipality || 'Unknown';
            const permitCount = Number(row['Permit Count'] || 0);
            if (!map.has(municipality)) {
                const group = { municipality, rows: [], subtotal: 0 };
                map.set(municipality, group);
                groups.push(group);
            }
            const group = map.get(municipality);
            group.rows.push({
                permitType: row['Permit Type'] || '',
                permitCount,
            });
            group.subtotal += permitCount;
        });

        return groups;
    }, [data]);

    const totalPermits = useMemo(
        () => groupedData.reduce((sum, group) => sum + group.subtotal, 0),
        [groupedData]
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
                    Active Permittees by Municipality Report - {data.length} grouped records
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
                            <h1>ACTIVE PERMITTEES BY MUNICIPALITY</h1>
                            <p className="report-count">Total: {totalPermits} permits</p>
                        </section>

                        <table className="permittees-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '45%' }}>MUNICIPALITY</th>
                                    <th style={{ width: '30%' }}>PERMIT TYPE</th>
                                    <th style={{ width: '25%' }}>PERMIT COUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedData.map((group) => (
                                    <React.Fragment key={group.municipality}>
                                        {group.rows.map((row, idx) => (
                                            <tr key={`${group.municipality}-${row.permitType}-${idx}`}>
                                                {idx === 0 && (
                                                    <td
                                                        rowSpan={group.rows.length}
                                                        style={{ fontWeight: 600 }}
                                                    >
                                                        {group.municipality}
                                                    </td>
                                                )}
                                                <td className="center-cell">{row.permitType}</td>
                                                <td className="center-cell">{row.permitCount}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td
                                                colSpan={2}
                                                style={{ fontWeight: 700, textAlign: 'right' }}
                                            >
                                                Subtotal ({group.municipality})
                                            </td>
                                            <td className="center-cell" style={{ fontWeight: 700 }}>
                                                {group.subtotal}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
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

export default ActivePermitteesByMunicipalityReport;
