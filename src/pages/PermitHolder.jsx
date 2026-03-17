import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import { FiEye, FiList, FiSearch, FiRefreshCw } from 'react-icons/fi';

const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
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

const PermitHolder = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const restoreState = location.state?.restoreState;
    const restored = useRef(false);

    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [permits, setPermits] = useState([]);
    const [fileExists, setFileExists] = useState({});
    const [loadingPermits, setLoadingPermits] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal states

    // Prerequisites state
    const [selectedPermitForPrereqs, setSelectedPermitForPrereqs] = useState(null);
    const [prerequisites, setPrerequisites] = useState([]);
    const [loadingPrereqs, setLoadingPrereqs] = useState(false);
    const [prereqFileExists, setPrereqFileExists] = useState({});
    const [refreshingAttachments, setRefreshingAttachments] = useState(false);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

    useEffect(() => {
        loadClients();
    }, []);

    // Restore state when returning from preview
    useEffect(() => {
        if (!restored.current && clients.length > 0 && restoreState?.selectedClientId) {
            const client = clients.find(
                (c) => String(c.ph_ctrlno) === String(restoreState.selectedClientId)
            );
            setSelectedClientId(String(restoreState.selectedClientId));
            setSelectedClient(client || restoreState.selectedClient || null);
            setClientSearch(client?.ph_cname || restoreState.selectedClient?.ph_cname || '');
            setPermits(restoreState.permits || []);
            // Restore fileExists or re-check
            if (restoreState.fileExists) {
                setFileExists(restoreState.fileExists);
            } else if (restoreState.permits?.length) {
                checkFileExistence(restoreState.permits);
            }
            // Restore selected permit for prereqs
            if (restoreState.selectedPermitForPrereqs) {
                setSelectedPermitForPrereqs(restoreState.selectedPermitForPrereqs);
            } else if (restoreState.permits?.length) {
                // Auto-select first permit
                setSelectedPermitForPrereqs(restoreState.permits[0]);
            }
            restored.current = true;
        }
    }, [clients, restoreState]);

    // Load prerequisites when selectedPermitForPrereqs changes
    useEffect(() => {
        if (selectedPermitForPrereqs?.ph_permitno) {
            loadPrerequisites(selectedPermitForPrereqs.ph_permitno);
        } else {
            setPrerequisites([]);
            setPrereqFileExists({});
        }
    }, [selectedPermitForPrereqs]);

    const loadClients = async () => {
        try {
            const data = await api.getProductionAuditClients();
            setClients(data);
        } catch (err) {
            setError('Failed to fetch clients: ' + err.message);
        }
    };

    const checkFileExistence = async (permitsData) => {
        // Build list of filenames to check
        const permitMap = {};
        const filenames = [];
        permitsData.forEach((permit) => {
            const permitNo = (permit.ph_permitno || '').trim();
            if (permitNo) {
                const fileName = `${permitNo}.pdf`;
                filenames.push(fileName);
                permitMap[fileName] = permit.ph_ctrlno;
            }
        });

        if (filenames.length === 0) {
            setFileExists({});
            return;
        }

        try {
            // Single batch request instead of N individual requests
            const results = await api.checkAttachmentsBatch(filenames);
            const existsMap = {};
            permitsData.forEach((permit) => {
                const permitNo = (permit.ph_permitno || '').trim();
                if (permitNo) {
                    existsMap[permit.ph_ctrlno] = results[`${permitNo}.pdf`] || false;
                } else {
                    existsMap[permit.ph_ctrlno] = false;
                }
            });
            setFileExists(existsMap);
        } catch (err) {
            console.error('Batch file check failed:', err);
            setFileExists({});
        }
    };

    const loadPermits = async (clientId) => {
        if (!clientId) {
            setPermits([]);
            setFileExists({});
            setSelectedPermitForPrereqs(null);
            setPrerequisites([]);
            return;
        }
        setLoadingPermits(true);
        try {
            const data = await api.getPermitHolderPermits(clientId);
            setPermits(data || []);
            // Check file existence for each permit
            checkFileExistence(data || []);
            // Auto-select first permit for prerequisites
            if (data && data.length > 0) {
                setSelectedPermitForPrereqs(data[0]);
            } else {
                setSelectedPermitForPrereqs(null);
                setPrerequisites([]);
            }
        } catch (err) {
            setError('Failed to fetch permits: ' + err.message);
            setPermits([]);
            setFileExists({});
            setSelectedPermitForPrereqs(null);
            setPrerequisites([]);
        } finally {
            setLoadingPermits(false);
        }
    };

    const loadPrerequisites = async (permitNo) => {
        if (!permitNo) {
            setPrerequisites([]);
            setPrereqFileExists({});
            return;
        }
        setLoadingPrereqs(true);
        try {
            const data = await api.getNewApplicationRequirements(permitNo);
            setPrerequisites(data || []);
            // Check file existence for each prerequisite
            checkPrereqFileExistence(data || [], permitNo);
        } catch (err) {
            console.error('Failed to load prerequisites:', err);
            setPrerequisites([]);
            setPrereqFileExists({});
        } finally {
            setLoadingPrereqs(false);
        }
    };

    // Helper to generate filename for prerequisite
    const getPrereqFilename = (req, permitNo) => {
        const cleanPermitNo = (permitNo || '').trim();
        const suffix = (req.pr_desc || '').substring(0, 2);
        if (cleanPermitNo) {
            if (suffix) {
                return `${cleanPermitNo}-${suffix}.pdf`;
            }
            return `${cleanPermitNo}.pdf`;
        }
        const sourceFile = (req.pr_source || '').trim();
        return sourceFile || '';
    };

    const checkPrereqFileExistence = async (reqs, permitNo) => {
        // Build list of filenames to check
        const filenames = [];
        const filenameToIndex = {};

        reqs.forEach((req, index) => {
            const filename = getPrereqFilename(req, permitNo);
            filenames.push(filename);
            filenameToIndex[filename] = index;
        });

        if (filenames.length === 0) {
            setPrereqFileExists({});
            return;
        }

        try {
            // Single batch request instead of N individual requests
            const results = await api.checkAttachmentsBatch(filenames);
            const existsMap = {};
            reqs.forEach((req, index) => {
                const filename = getPrereqFilename(req, permitNo);
                existsMap[index] = results[filename] || false;
            });
            setPrereqFileExists(existsMap);
        } catch (err) {
            console.error('Batch prereq file check failed:', err);
            setPrereqFileExists({});
        }
    };

    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const selectClient = (clientId) => {
        setSelectedClientId(clientId);
        setError('');
        setSuccessMessage('');
        setPermits([]);
        setSelectedPermitForPrereqs(null);
        setPrerequisites([]);
        setShowClientSuggestions(false);

        if (!clientId) {
            setSelectedClient(null);
            setClientSearch('');
            return;
        }

        const client = clients.find((c) => String(c.ph_ctrlno) === String(clientId));
        setSelectedClient(client);
        setClientSearch(client?.ph_cname || '');
        loadPermits(clientId);
    };

    const clearClient = () => {
        setSelectedClientId('');
        setSelectedClient(null);
        setClientSearch('');
        setError('');
        setSuccessMessage('');
        setPermits([]);
        setSelectedPermitForPrereqs(null);
        setPrerequisites([]);
        setShowClientSuggestions(false);
    };

    const getFullAddress = (client) => {
        if (!client) return '';
        return [client.ph_address1, client.ph_address2].filter(Boolean).join(', ');
    };

    const getBarangay = (permit) => {
        if (!permit) return '';
        const brgy1 = (permit.ph_brgy ?? '').trim();
        const brgy2 = (permit.ph_brgy2 ?? '').trim();
        if (brgy1 && brgy2) {
            return `${brgy1}/${brgy2}`;
        }
        if (brgy1) return brgy1;
        if (brgy2) return brgy2;
        return '';
    };

    // Refresh attachment existence checks without reloading data
    const refreshAttachments = async () => {
        if (permits.length === 0) return;
        setRefreshingAttachments(true);
        try {
            await checkFileExistence(permits);
            if (prerequisites.length > 0 && selectedPermitForPrereqs?.ph_permitno) {
                await checkPrereqFileExistence(prerequisites, selectedPermitForPrereqs.ph_permitno);
            }
        } finally {
            setRefreshingAttachments(false);
        }
    };

    // CRUD Handlers

    const handlePreviewClick = async (permit) => {
        const permitNo = (permit.ph_permitno || '').trim();
        if (!permitNo) {
            setError('Permit number is missing');
            return;
        }

        // Skip redundant file check - we already verified existence with batch check
        const fileName = `${permitNo}.pdf`;
        const fullPath = `${ATTACHMENTS_BASE_PATH}${fileName}`;
        const webPath = api.getNewApplicationAttachmentUrl(fileName);

        navigate('/newapp/preview', {
            state: {
                filePath: webPath,
                displayPath: fullPath,
                source: fileName,
                safeName: fileName,
                returnPath: '/holder',
                restoreState: {
                    selectedClientId,
                    selectedClient,
                    permits,
                    fileExists,
                    selectedPermitForPrereqs,
                },
            },
        });
    };

    const handlePrereqPreviewClick = async (req, index) => {
        if (!selectedPermitForPrereqs?.ph_permitno) {
            setError('No permit selected');
            return;
        }

        const sourceFile = getPrereqFilename(req, selectedPermitForPrereqs.ph_permitno);

        // Skip redundant file check - we already verified existence with batch check
        const fullPath = `${ATTACHMENTS_BASE_PATH}${sourceFile}`;
        const webPath = api.getNewApplicationAttachmentUrl(sourceFile);

        navigate('/newapp/preview', {
            state: {
                filePath: webPath,
                displayPath: fullPath,
                source: sourceFile,
                safeName: sourceFile,
                returnPath: '/holder',
                restoreState: {
                    selectedClientId,
                    selectedClient,
                    permits,
                    fileExists,
                    selectedPermitForPrereqs,
                },
            },
        });
    };

    const handlePrerequisitesClick = (permit) => {
        setSelectedPermitForPrereqs(permit);
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
                    <h2 className="page-title">Permit Holder</h2>
                </div>
            </div>

            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div className="transactions-compact-form">
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Client</label>
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="transactions-compact-input"
                                value={clientSearch}
                                placeholder="Type to search client..."
                                onFocus={() => {
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!clientSearch);
                                }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setClientSearch(val);
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!val);
                                    if (!val) clearClient();
                                }}
                            />
                            {selectedClientId && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        height: '100%',
                                        aspectRatio: '1',
                                    }}
                                    onClick={clearClient}
                                    title="Clear selection"
                                >
                                    ✕
                                </button>
                            )}
                            {clientSuggestions.length > 0 &&
                                showClientSuggestions &&
                                createPortal(
                                    <ul
                                        style={{
                                            position: 'absolute',
                                            top: dropdownPosition.top,
                                            left: dropdownPosition.left,
                                            width: dropdownPosition.width,
                                            zIndex: 9999,
                                            background: theme === 'light' ? '#ffffff' : '#1c1c1e',
                                            border:
                                                theme === 'light'
                                                    ? '1px solid #e4e4e7'
                                                    : '1px solid #27272a',
                                            color: theme === 'light' ? '#09090b' : '#fafafa',
                                            borderRadius: '6px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            margin: '4px 0 0 0',
                                            padding: 0,
                                            listStyle: 'none',
                                            boxShadow:
                                                theme === 'light'
                                                    ? '0 4px 12px rgba(0,0,0,0.1)'
                                                    : '0 4px 12px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        {clientSuggestions.map((c) => (
                                            <li
                                                key={c.ph_ctrlno}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    borderBottom: '1px solid var(--border)',
                                                    color:
                                                        theme === 'light' ? '#09090b' : '#fafafa',
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.target.style.background =
                                                        theme === 'light' ? '#f4f4f5' : '#27272a')
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.target.style.background = 'transparent')
                                                }
                                                onClick={() => selectClient(c.ph_ctrlno)}
                                            >
                                                {c.ph_cname}
                                            </li>
                                        ))}
                                    </ul>,
                                    document.body
                                )}
                        </div>
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Address</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={getFullAddress(selectedClient)}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">TIN</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_TIN || ''}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Contact</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_contact || ''}
                            readOnly
                        />
                    </div>
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {successMessage && <div className="success-alert">{successMessage}</div>}

            <div className="transactions-grid-section">
                {selectedClientId ? (
                    loadingPermits ? (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center' }}
                        >
                            <div className="spinner"></div> Loading permits...
                        </div>
                    ) : (
                        <>
                            {/* Permits Table */}
                            <div
                                className="table-container"
                                style={{
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                }}
                            >
                                {permits.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Permit No.</th>
                                                <th>Barangay</th>
                                                <th>Municipality</th>
                                                <th>Volume</th>
                                                <th>Area</th>
                                                <th>From</th>
                                                <th>To</th>
                                                <th style={{ textAlign: 'center' }}>Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permits.map((permit) => {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const dto = permit.ph_dto
                                                    ? new Date(permit.ph_dto)
                                                    : null;
                                                const isActive = dto && dto >= today;
                                                const isSelected =
                                                    selectedPermitForPrereqs?.ph_ctrlno ===
                                                    permit.ph_ctrlno;
                                                return (
                                                    <tr
                                                        key={permit.ph_ctrlno}
                                                        style={{
                                                            backgroundColor: isSelected
                                                                ? 'rgba(59, 130, 246, 0.1)'
                                                                : undefined,
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() =>
                                                            handlePrerequisitesClick(permit)
                                                        }
                                                    >
                                                        <td>{permit.ph_permitno || ''}</td>
                                                        <td>{getBarangay(permit)}</td>
                                                        <td>{permit.ph_mun || ''}</td>
                                                        <td>{permit.ph_volume ?? ''}</td>
                                                        <td>{permit.ph_area ?? ''}</td>
                                                        <td>{formatDate(permit.ph_dfrom)}</td>
                                                        <td>{formatDate(permit.ph_dto)}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span
                                                                style={{
                                                                    color: isActive
                                                                        ? '#22c55e'
                                                                        : '#ef4444',
                                                                    fontWeight: 'bold',
                                                                }}
                                                            >
                                                                {isActive ? 'Active' : 'Expired'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div
                                                                className="action-buttons"
                                                                style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <button
                                                                    className="btn btn-ghost btn-sm"
                                                                    title={
                                                                        fileExists[permit.ph_ctrlno]
                                                                            ? 'Preview Attachment'
                                                                            : 'Attachment Missing'
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePreviewClick(permit);
                                                                    }}
                                                                    disabled={
                                                                        !fileExists[
                                                                            permit.ph_ctrlno
                                                                        ]
                                                                    }
                                                                    style={{ padding: '4px 8px' }}
                                                                >
                                                                    <FiEye
                                                                        size={16}
                                                                        color={
                                                                            fileExists[
                                                                                permit.ph_ctrlno
                                                                            ]
                                                                                ? '#22c55e'
                                                                                : '#ef4444'
                                                                        }
                                                                    />
                                                                </button>
                                                                <button
                                                                    className="btn btn-ghost btn-sm"
                                                                    title="Prerequisites"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePrerequisitesClick(
                                                                            permit
                                                                        );
                                                                    }}
                                                                    style={{ padding: '4px 8px' }}
                                                                >
                                                                    <FiList size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div
                                        style={{
                                            padding: '24px',
                                            textAlign: 'center',
                                            color: '#999',
                                        }}
                                    >
                                        <p>No permits found for this client.</p>
                                    </div>
                                )}
                            </div>

                            {/* Prerequisites Table */}
                            {selectedPermitForPrereqs && (
                                <div
                                    className="table-container"
                                    style={{
                                        marginTop: '16px',
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                    }}
                                >
                                    {loadingPrereqs ? (
                                        <div style={{ padding: '24px', textAlign: 'center' }}>
                                            <div className="spinner"></div> Loading prerequisites...
                                        </div>
                                    ) : prerequisites.length > 0 ? (
                                        <table>
                                            <thead
                                                style={{ position: 'sticky', top: 0, zIndex: 1 }}
                                            >
                                                <tr>
                                                    <th
                                                        style={{
                                                            textAlign: 'left',
                                                            position: 'sticky',
                                                            top: 0,
                                                            background: 'var(--muted)',
                                                        }}
                                                    >
                                                        Description (
                                                        {selectedPermitForPrereqs.ph_permitno})
                                                    </th>
                                                    <th
                                                        style={{
                                                            textAlign: 'left',
                                                            position: 'sticky',
                                                            top: 0,
                                                            background: 'var(--muted)',
                                                        }}
                                                    >
                                                        Filename
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: '120px',
                                                            textAlign: 'center',
                                                            position: 'sticky',
                                                            top: 0,
                                                            background: 'var(--muted)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                            }}
                                                        >
                                                            <span>Actions</span>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                title="Refresh Attachments"
                                                                onClick={refreshAttachments}
                                                                disabled={refreshingAttachments}
                                                                style={{
                                                                    padding: '4px',
                                                                    opacity: refreshingAttachments
                                                                        ? 0.5
                                                                        : 1,
                                                                    minWidth: 'auto',
                                                                }}
                                                            >
                                                                <FiRefreshCw
                                                                    size={14}
                                                                    className={
                                                                        refreshingAttachments
                                                                            ? 'spin'
                                                                            : ''
                                                                    }
                                                                />
                                                            </button>
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prerequisites.map((req, index) => {
                                                    const generatedFilename = getPrereqFilename(
                                                        req,
                                                        selectedPermitForPrereqs.ph_permitno
                                                    );
                                                    return (
                                                        <tr key={index}>
                                                            <td>{req.pr_desc || ''}</td>
                                                            <td
                                                                style={{
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '11px',
                                                                    color: 'var(--muted-foreground)',
                                                                }}
                                                            >
                                                                {generatedFilename}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    className="btn"
                                                                    style={{
                                                                        backgroundColor:
                                                                            prereqFileExists[index]
                                                                                ? '#22c55e'
                                                                                : '#ef4444',
                                                                        color: 'var(--primary-foreground)',
                                                                        border: 'none',
                                                                        padding: '4px 12px',
                                                                        fontSize: '12px',
                                                                    }}
                                                                    onClick={() =>
                                                                        handlePrereqPreviewClick(
                                                                            req,
                                                                            index
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !prereqFileExists[index]
                                                                    }
                                                                >
                                                                    Preview
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div
                                            style={{
                                                padding: '24px',
                                                textAlign: 'center',
                                                color: '#999',
                                            }}
                                        >
                                            No prerequisites found for this permit.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <div
                        className="table-container"
                        style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                    >
                        <p>Select a client to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PermitHolder;
