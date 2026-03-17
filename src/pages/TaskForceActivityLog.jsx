import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';

const TaskForceActivityLog = () => {
    const [names, setNames] = useState([]);
    const [selectedName, setSelectedName] = useState('');
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    useEffect(() => {
        fetchNames();
    }, []);

    const fetchNames = async () => {
        try {
            const data = await api.getTaskForceActivityLogNames();
            setNames(data);
        } catch (err) {
            setError('Failed to fetch client names: ' + err.message);
        }
    };

    const handleSelectClient = async (name) => {
        setSelectedName(name);
        setDetails([]);
        setError('');
        setSearchQuery('');
        setSelectedMonth('');

        if (!name) return;

        setLoading(true);
        try {
            const data = await api.getTaskForceActivityLogDetails(name);
            setDetails(data);
        } catch (err) {
            setError('Failed to fetch activity log details: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        'DATE',
        'AREA',
        'DELIVERY RECEIPT',
        'DESTINATION',
        'PLATE NO.',
        'DESCRIPTION',
        'VOLUME',
        'REMARKS',
    ];

    // Derive distinct months from the activity details (based on DATE)
    const availableMonths = useMemo(() => {
        const monthSet = new Map();
        details.forEach((row) => {
            const d = new Date(row['DATE']);
            if (isNaN(d.getTime())) return;
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Manila',
                year: 'numeric',
                month: 'long',
            }).formatToParts(d);
            const month = parts.find((p) => p.type === 'month')?.value || '';
            const year = parts.find((p) => p.type === 'year')?.value || '';
            const key = `${year}-${String(d.toLocaleString('en-US', { timeZone: 'Asia/Manila', month: '2-digit' }))}`;
            const label = `${month} ${year}`;
            if (!monthSet.has(key)) monthSet.set(key, label);
        });
        return [...monthSet.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, label]) => ({ key, label }));
    }, [details]);

    const filteredDetails = useMemo(() => {
        let filtered = details;

        // Apply month filter
        if (selectedMonth) {
            filtered = filtered.filter((row) => {
                const d = new Date(row['DATE']);
                if (isNaN(d.getTime())) return false;
                const m = d.toLocaleString('en-US', { timeZone: 'Asia/Manila', month: '2-digit' });
                const y = d.toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric' });
                return `${y}-${m}` === selectedMonth;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter((row) => {
                const dateObj = new Date(row['DATE']);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                });
                return (
                    dateStr.toLowerCase().includes(q) ||
                    (row['AREA'] || '').toLowerCase().includes(q) ||
                    String(row['DELIVERY RECEIPT'] || '').toLowerCase().includes(q) ||
                    (row['DESTINATION'] || '').toLowerCase().includes(q) ||
                    (row['PLATE NO.'] || '').toLowerCase().includes(q) ||
                    (row['DESCRIPTION'] || '').toLowerCase().includes(q) ||
                    String(row['VOLUME'] || '').toLowerCase().includes(q) ||
                    (row['REMARKS'] || '').toLowerCase().includes(q)
                );
            });
        }

        return filtered;
    }, [details, selectedMonth, searchQuery]);

    const stickyHeaderStyle = {
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--secondary)',
    };

    return (
        <div className="transactions-page">
            <div className="page-header">
                <div className="page-title-section">
                    <img
                        src={plenroLogo}
                        alt="PLENRO Logo"
                        className="page-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h2 className="page-title">Task Force Activity Log</h2>
                </div>
            </div>

            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div
                    className="transactions-compact-form"
                    style={{ gridTemplateColumns: selectedName && details.length > 0 ? '1fr 1fr 1fr' : '1fr' }}
                >
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Client</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedName}
                            onChange={(e) => handleSelectClient(e.target.value)}
                        >
                            <option value="">-- Select Client --</option>
                            {names.map((item) => (
                                <option key={item.tf_name} value={item.tf_name}>
                                    {item.tf_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedName && details.length > 0 && (
                        <>
                            <div className="transactions-compact-group">
                                <label className="transactions-compact-label">Month</label>
                                <select
                                    className="transactions-compact-input"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    <option value="">-- All Months --</option>
                                    {availableMonths.map((m) => (
                                        <option key={m.key} value={m.key}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="transactions-compact-group">
                                <label className="transactions-compact-label">Search</label>
                                <input
                                    type="text"
                                    className="transactions-compact-input"
                                    placeholder="Search across all columns..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <div className="transactions-grid-section">
                {selectedName ? (
                    loading ? (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center' }}
                        >
                            <div className="spinner"></div> Loading details...
                        </div>
                    ) : filteredDetails.length > 0 ? (
                        <div
                            className="table-container"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                maxHeight: 'none',
                                overflowY: 'auto',
                            }}
                        >
                            <table>
                                <thead>
                                    <tr>
                                        {columns.map((col) => (
                                            <th key={col} style={stickyHeaderStyle}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDetails.map((row, index) => {
                                        const dateObj = new Date(row['DATE']);
                                        const dateStr = dateObj.toLocaleDateString('en-US', {
                                            timeZone: 'Asia/Manila',
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        });

                                        return (
                                            <tr key={index}>
                                                <td>{dateStr}</td>
                                                <td>{row['AREA']}</td>
                                                <td>{row['DELIVERY RECEIPT']}</td>
                                                <td>{row['DESTINATION']}</td>
                                                <td>{row['PLATE NO.']}</td>
                                                <td>{row['DESCRIPTION']}</td>
                                                <td>{row['VOLUME']}</td>
                                                <td>{row['REMARKS']}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                        >
                            <p>No activity log details found for this client</p>
                        </div>
                    )
                ) : (
                    <div
                        className="table-container"
                        style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                    >
                        <p>Select a client to view activity log details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskForceActivityLog;
