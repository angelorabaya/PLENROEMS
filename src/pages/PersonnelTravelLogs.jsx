import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiEye } from 'react-icons/fi';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';

const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
    const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
    const sanitized = base.replace(/[\\/]*$/, '');
    return `${sanitized}\\`;
};
const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
    import.meta.env.VITE_ATTACHMENTS_BASE_PATH
);

const PersonnelTravelLogs = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [names, setNames] = useState([]);
    const [selectedName, setSelectedName] = useState('');
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    useEffect(() => {
        const init = async () => {
            await fetchNames();
            // Restore state from navigation (returning from preview)
            const saved = location.state?.restoreState;
            if (saved?.selectedName) {
                setSelectedName(saved.selectedName);
                setSelectedMonth(saved.selectedMonth || '');
                setSearchQuery(saved.searchQuery || '');
                try {
                    setLoading(true);
                    const data = await api.getPersonnelTravelLogDetails(saved.selectedName);
                    setDetails(data || []);
                } catch (err) {
                    setError('Failed to fetch travel log details: ' + err.message);
                } finally {
                    setLoading(false);
                }
            }
        };
        init();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchNames = async () => {
        try {
            const data = await api.getPersonnelTravelLogNames();
            setNames(data);
        } catch (err) {
            setError('Failed to fetch personnel names: ' + err.message);
        }
    };

    const handleSelectPersonnel = async (name) => {
        setSelectedName(name);
        setDetails([]);
        setError('');
        setSearchQuery('');
        setSelectedMonth('');

        if (!name) return;

        setLoading(true);
        try {
            const data = await api.getPersonnelTravelLogDetails(name);
            setDetails(data);
        } catch (err) {
            setError('Failed to fetch travel log details: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        'T.O. NUMBER',
        'DATE PREPARED',
        'DESTINATION',
        'START DATE',
        'END DATE',
        'PURPOSE',
        'DURATION',
        'CONTROL',
    ];

    // Derive distinct months from the travel details (based on START DATE)
    const availableMonths = useMemo(() => {
        const monthSet = new Map();
        details.forEach((row) => {
            const d = new Date(row['START DATE']);
            if (isNaN(d.getTime())) return;
            // Use Manila timezone to get correct month/year
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
        // Sort descending (newest first)
        return [...monthSet.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, label]) => ({ key, label }));
    }, [details]);

    const filteredDetails = useMemo(() => {
        let filtered = details;

        // Apply month filter
        if (selectedMonth) {
            filtered = filtered.filter((row) => {
                const d = new Date(row['START DATE']);
                if (isNaN(d.getTime())) return false;
                const m = d.toLocaleString('en-US', { timeZone: 'Asia/Manila', month: '2-digit' });
                const y = d.toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric' });
                return `${y}-${m}` === selectedMonth;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter((row) =>
                (row['T.O. NUMBER'] || '').toLowerCase().includes(q) ||
                formatDate(row['DATE PREPARED']).toLowerCase().includes(q) ||
                (row['DESTINATION'] || '').toLowerCase().includes(q) ||
                formatDate(row['START DATE']).toLowerCase().includes(q) ||
                formatDate(row['END DATE']).toLowerCase().includes(q) ||
                (row['PURPOSE'] || '').toLowerCase().includes(q) ||
                (row['DURATION'] || '').toLowerCase().includes(q) ||
                (row['CONTROL'] || '').toLowerCase().includes(q)
            );
        }

        // Sort by START DATE descending (newest first)
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a['START DATE']).getTime();
            const dateB = new Date(b['START DATE']).getTime();
            
            const isAValid = !isNaN(dateA);
            const isBValid = !isNaN(dateB);
            
            if (isAValid && isBValid) {
                return dateB - dateA;
            } else if (isAValid) {
                return -1;
            } else if (isBValid) {
                return 1;
            }
            return 0;
        });
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
                    <h2 className="page-title">Personnel Travel Logs</h2>
                </div>
            </div>

            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div
                    className="transactions-compact-form"
                    style={{ gridTemplateColumns: selectedName && details.length > 0 ? '1fr 1fr 1fr' : '1fr' }}
                >
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Personnel</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedName}
                            onChange={(e) => handleSelectPersonnel(e.target.value)}
                        >
                            <option value="">-- Select Personnel --</option>
                            {names.map((item) => (
                                <option key={item.emp_name} value={item.emp_name}>
                                    {item.emp_name}
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
                                        <th style={{ ...stickyHeaderStyle, width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDetails.map((row, index) => {
                                        const isCancelled = row['STATUS'] === 'CANCELLED';
                                        return (
                                        <tr 
                                            key={index}
                                            style={{
                                                opacity: isCancelled ? 0.7 : 1,
                                                backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                            }}
                                        >
                                            <td>{row['T.O. NUMBER'] || ''}</td>
                                            <td>{formatDate(row['DATE PREPARED'])}</td>
                                            <td>{row['DESTINATION'] || ''}</td>
                                            <td>{formatDate(row['START DATE'])}</td>
                                            <td>{formatDate(row['END DATE'])}</td>
                                            <td>
                                                <span
                                                    style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'normal',
                                                        wordBreak: 'break-word',
                                                        lineHeight: '1.4',
                                                    }}
                                                    title={row['PURPOSE']}
                                                >
                                                    {row['PURPOSE'] || ''}
                                                </span>
                                            </td>
                                            <td>{row['DURATION'] || ''}</td>
                                            <td>
                                                {row['CONTROL'] || ''}
                                                {isCancelled && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        padding: '2px 6px',
                                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                                        color: '#ef4444',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '600'
                                                    }}>
                                                        CANCELLED
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-icon btn-icon-sm"
                                                    title="Preview"
                                                    onClick={() => {
                                                        const toNumber = (row['T.O. NUMBER'] || '').trim();
                                                        if (!toNumber) return;
                                                        const fileName = `TO${toNumber}.pdf`;
                                                        const fullPath = `${ATTACHMENTS_BASE_PATH}${fileName}`;
                                                        const webPath = api.getNewApplicationAttachmentUrl(fileName);
                                                        api.checkNewApplicationAttachment(fileName)
                                                            .then(() => {
                                                                navigate('/newapp/preview', {
                                                                    state: {
                                                                        filePath: webPath,
                                                                        displayPath: fullPath,
                                                                        source: fileName,
                                                                        safeName: fileName,
                                                                        returnPath: '/personnel-travel-logs',
                                                                        restoreState: {
                                                                            selectedName,
                                                                            selectedMonth,
                                                                            searchQuery,
                                                                        },
                                                                    },
                                                                });
                                                            })
                                                            .catch(() => {
                                                                setError(`Attachment not found: ${fullPath}`);
                                                            });
                                                    }}
                                                >
                                                    <FiEye size={14} />
                                                </button>
                                            </td>
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
                            <p>No travel log details found for this personnel</p>
                        </div>
                    )
                ) : (
                    <div
                        className="table-container"
                        style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                    >
                        <p>Select a personnel to view travel log details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonnelTravelLogs;
