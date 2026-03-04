import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiSearch,
    FiEye,
    FiInbox,
    FiSend,
    FiX,
    FiChevronDown,
    FiChevronUp,
    FiFilter,
} from 'react-icons/fi';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import '../styles/global.css';

const TYPE_OPTIONS = [
    'Mining Documents',
    'Communications (Letters etc.)',
    'Authority to Travel',
    'Liquidation / Reimbursement',
    'Personnel Record',
    'Procurements',
    'Issuances',
    'Reports',
    'Travel Order',
    'Others',
];

const PURPOSE_OPTIONS = [
    'For Submission of Documents',
    'For Approval / Signature',
    'For Monitoring',
    'For Comment / Justification',
    'For Consolidation',
    'For Confirmation',
    'For Printing',
    'For Dissemination',
    'For Evaluation',
    'For Other Appropriate Actions',
];

const formatDateTime = (value) => {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (e) {
        return value;
    }
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

const STORAGE_KEY = 'documentProbingState';

const DocumentProbing = () => {
    // Probing is primarily a search/view page.
    // If you want to restrict viewing details, we could use canCreate (as read?) or just rely on sidebar access.
    // For now, I'll add the hook but not enforce specific button hiding as there are no Add/Edit/Delete buttons.
    const navigate = useNavigate();

    // Load saved state from sessionStorage on mount
    const getSavedState = () => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
        return null;
    };

    const savedState = getSavedState();

    const [results, setResults] = useState(savedState?.results || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [employees, setEmployees] = useState([]);
    const [hasSearched, setHasSearched] = useState(savedState?.hasSearched || false);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(
        savedState?.isFiltersExpanded ?? true
    );

    // Search filters
    const [filters, setFilters] = useState(
        savedState?.filters || {
            control: '',
            dateFrom: '',
            dateTo: '',
            docType: 'all',
            empId: '',
            type: '',
            purpose: '',
            sourceOrDest: '',
            description: '',
        }
    );

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            filters,
            results,
            hasSearched,
            isFiltersExpanded,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [filters, results, hasSearched, isFiltersExpanded]);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await api.getDocReceivingEmployees();
            setEmployees(data || []);
        } catch (err) {
            console.error('Failed to load employees:', err);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleSearch = async (e) => {
        e?.preventDefault();
        setLoading(true);
        setError('');
        setHasSearched(true);
        setIsFiltersExpanded(false); // Collapse filters after search
        try {
            const data = await api.searchDocuments(filters);
            setResults(data || []);
        } catch (err) {
            setError('Search failed: ' + err.message);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFilters({
            control: '',
            dateFrom: '',
            dateTo: '',
            docType: 'all',
            empId: '',
            type: '',
            purpose: '',
            sourceOrDest: '',
            description: '',
        });
        setResults([]);
        setHasSearched(false);
        setError('');
        setIsFiltersExpanded(true); // Expand filters when cleared
        sessionStorage.removeItem(STORAGE_KEY); // Clear saved state
    };

    const handlePreviewClick = async (record) => {
        const controlNo = (record.dms_control || '').trim();
        if (!controlNo) {
            setError('Control number is missing');
            return;
        }

        const fileName = `${controlNo}.pdf`;
        const fullPath = `${ATTACHMENTS_BASE_PATH}${fileName}`;
        const webPath = api.getNewApplicationAttachmentUrl(fileName);

        try {
            await api.checkNewApplicationAttachment(fileName);
            navigate('/newapp/preview', {
                state: {
                    filePath: webPath,
                    displayPath: fullPath,
                    source: fileName,
                    safeName: fileName,
                    returnPath: '/doc-probing',
                },
            });
        } catch (err) {
            setError(`Attachment not found: ${fullPath}`);
            setTimeout(() => setError(''), 3000);
        }
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
                    <h2 className="page-title">Document Probing</h2>
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}

            {/* Search Filters - Collapsible Section */}
            <div style={{ marginBottom: '1rem' }}>
                {/* Collapsible Header - Always visible */}
                <div
                    className="table-container"
                    style={{
                        marginBottom: isFiltersExpanded ? 0 : 0,
                        borderRadius: isFiltersExpanded ? '8px 8px 0 0' : '8px',
                        overflow: 'hidden',
                    }}
                >
                    {/* Collapsible Header */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: isFiltersExpanded ? '0.75rem 1rem' : '1.25rem 1rem',
                            minHeight: isFiltersExpanded ? 'auto' : '56px',
                            borderBottom: isFiltersExpanded
                                ? '1px solid var(--border-color)'
                                : 'none',
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: !isFiltersExpanded
                                ? 'rgba(59, 130, 246, 0.08)'
                                : 'transparent',
                            borderRadius: !isFiltersExpanded ? '8px' : '8px 8px 0 0',
                            transition: 'all 0.2s ease',
                            border: !isFiltersExpanded
                                ? '1px solid rgba(59, 130, 246, 0.2)'
                                : 'none',
                        }}
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FiFilter size={20} style={{ color: '#3b82f6' }} />
                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                Search Filters
                            </span>
                            {!isFiltersExpanded && hasSearched && (
                                <span
                                    style={{
                                        fontSize: '0.8rem',
                                        marginLeft: '0.5rem',
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        borderRadius: '4px',
                                        fontWeight: 500,
                                    }}
                                >
                                    Click to modify search
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFiltersExpanded(!isFiltersExpanded);
                            }}
                        >
                            {isFiltersExpanded ? 'Collapse' : 'Expand Filters'}
                            {isFiltersExpanded ? (
                                <FiChevronUp size={16} />
                            ) : (
                                <FiChevronDown size={16} />
                            )}
                        </button>
                    </div>

                    {/* Collapsible Content */}
                    {isFiltersExpanded && (
                        <form onSubmit={handleSearch} style={{ padding: '1rem' }}>
                            <div
                                className="form-grid form-grid-3"
                                style={{ marginBottom: '0.75rem' }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Control No.</label>
                                    <input
                                        type="text"
                                        name="control"
                                        className="form-input"
                                        value={filters.control}
                                        onChange={handleFilterChange}
                                        placeholder="Search control number..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date From</label>
                                    <input
                                        type="date"
                                        name="dateFrom"
                                        className="form-input"
                                        value={filters.dateFrom}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date To</label>
                                    <input
                                        type="date"
                                        name="dateTo"
                                        className="form-input"
                                        value={filters.dateTo}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                            </div>

                            <div
                                className="form-grid form-grid-3"
                                style={{ marginBottom: '0.75rem' }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Document Type</label>
                                    <select
                                        name="docType"
                                        className="form-select"
                                        value={filters.docType}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="all">All Documents</option>
                                        <option value="receiving">📥 Receiving Only</option>
                                        <option value="outgoing">📤 Outgoing Only</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Employee</label>
                                    <select
                                        name="empId"
                                        className="form-select"
                                        value={filters.empId}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">-- All Employees --</option>
                                        {employees.map((emp) => (
                                            <option key={emp.emp_ctrlno} value={emp.emp_ctrlno}>
                                                {emp.emp_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Source / Destination</label>
                                    <input
                                        type="text"
                                        name="sourceOrDest"
                                        className="form-input"
                                        value={filters.sourceOrDest}
                                        onChange={handleFilterChange}
                                        placeholder="Search source or destination..."
                                    />
                                </div>
                            </div>

                            <div
                                className="form-grid form-grid-3"
                                style={{ marginBottom: '0.75rem' }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select
                                        name="type"
                                        className="form-select"
                                        value={filters.type}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">-- All Types --</option>
                                        {TYPE_OPTIONS.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Purpose</label>
                                    <select
                                        name="purpose"
                                        className="form-select"
                                        value={filters.purpose}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">-- All Purposes --</option>
                                        {PURPOSE_OPTIONS.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input
                                        type="text"
                                        name="description"
                                        className="form-input"
                                        value={filters.description}
                                        onChange={handleFilterChange}
                                        placeholder="Search in description..."
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleClear}
                                >
                                    <FiX size={14} style={{ marginRight: '0.25rem' }} /> Clear
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    <FiSearch size={14} style={{ marginRight: '0.25rem' }} />
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Results - Separate section */}
            <div className="table-container">
                {loading ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                        <div className="spinner"></div> Searching documents...
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <div
                            style={{
                                padding: '0.5rem 1rem',
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                            }}
                        >
                            Found {results.length} record{results.length !== 1 ? 's' : ''}
                        </div>
                        <table style={{ width: '100%', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}></th>
                                    <th style={{ width: '12%' }}>Date</th>
                                    <th style={{ width: '10%' }}>Control No.</th>
                                    <th style={{ width: '14%' }}>Source/Dest</th>
                                    <th style={{ width: '12%' }}>Employee</th>
                                    <th style={{ width: '17%' }}>Description</th>
                                    <th style={{ width: '12%' }}>Type</th>
                                    <th style={{ width: '13%' }}>Purpose</th>
                                    <th style={{ width: '5%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((record, idx) => (
                                    <tr key={`${record.doc_type}-${record.dms_ctrlno}-${idx}`}>
                                        <td style={{ textAlign: 'center' }}>
                                            {record.doc_type === 'receiving' ? (
                                                <span
                                                    title="Receiving"
                                                    style={{
                                                        color: '#3b82f6',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem',
                                                    }}
                                                >
                                                    <FiInbox size={14} />
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        IN
                                                    </span>
                                                </span>
                                            ) : (
                                                <span
                                                    title="Outgoing"
                                                    style={{
                                                        color: '#10b981',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem',
                                                    }}
                                                >
                                                    <FiSend size={14} />
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        OUT
                                                    </span>
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className="cell-text"
                                                title={formatDateTime(record.dms_date)}
                                            >
                                                {formatDateTime(record.dms_date)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-text" title={record.dms_control}>
                                                {record.dms_control || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="cell-text"
                                                title={record.source_or_dest}
                                            >
                                                {record.source_or_dest || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-text" title={record.emp_name}>
                                                {record.emp_name || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-text" title={record.dms_desc}>
                                                {record.dms_desc || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-text" title={record.dms_type}>
                                                {record.dms_type || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-text" title={record.dms_purpose}>
                                                {record.dms_purpose || ''}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon btn-icon-sm"
                                                onClick={() => handlePreviewClick(record)}
                                                title="Preview Attachment"
                                            >
                                                <FiEye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : hasSearched ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                        <p>No documents found matching your search criteria.</p>
                    </div>
                ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                        <FiSearch size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>Enter search criteria above and click Search to find documents.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentProbing;
