import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import { FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
    const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
    const sanitized = base.replace(/[\\/]*$/, '');
    return `${sanitized}\\`;
};
const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
    import.meta.env.VITE_ATTACHMENTS_BASE_PATH
);

import PermitApprovedModal from '../components/modals/PermitApprovedModal';

const NewApplication = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const restoreState = location.state?.restoreState;
    const restored = useRef(false);
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [fileExists, setFileExists] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attachMessage, setAttachMessage] = useState('');
    const [refreshingAttachments, setRefreshingAttachments] = useState(false);
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const data = await api.getNewApplicationClients();
            setClients(data);
        } catch (err) {
            setError('Failed to fetch clients: ' + err.message);
        }
    };

    // Helper to generate filename for requirement
    const getRequirementFilename = (req, permitNo) => {
        const descPrefix = (req.pr_desc || '').substring(0, 2);
        return `${permitNo}-${descPrefix}.pdf`;
    };

    // Refresh attachment existence checks
    const refreshAttachments = async () => {
        if (!selectedClient?.ph_tpermit || requirements.length === 0) return;
        setRefreshingAttachments(true);
        try {
            await checkFileExistence(requirements, selectedClient.ph_tpermit.trim());
        } finally {
            setRefreshingAttachments(false);
        }
    };

    const checkFileExistence = async (reqs, permitNo) => {
        // Build list of filenames to check
        const filenames = [];
        reqs.forEach((req) => {
            const descPrefix = (req.pr_desc || '').substring(0, 2);
            const fileName = `${permitNo}-${descPrefix}.pdf`;
            filenames.push(fileName);
        });

        if (filenames.length === 0) {
            setFileExists({});
            return;
        }

        try {
            // Single batch request instead of N individual requests
            const results = await api.checkAttachmentsBatch(filenames);
            const existsMap = {};
            reqs.forEach((req, index) => {
                const descPrefix = (req.pr_desc || '').substring(0, 2);
                const fileName = `${permitNo}-${descPrefix}.pdf`;
                existsMap[index] = results[fileName] || false;
            });
            setFileExists(existsMap);
        } catch (err) {
            console.error('Batch file check failed:', err);
            setFileExists({});
        }
    };

    useEffect(() => {
        if (!restored.current && clients.length > 0 && restoreState?.selectedClientId) {
            const client = clients.find(
                (c) => String(c.ph_ctrlno) === String(restoreState.selectedClientId)
            );
            setSelectedClientId(String(restoreState.selectedClientId));
            setSelectedClient(client || restoreState.selectedClient || null);
            setRequirements(restoreState.requirements || []);
            // Restore fileExists or re-check
            if (restoreState.fileExists) {
                setFileExists(restoreState.fileExists);
            } else if (restoreState.requirements?.length && client?.ph_tpermit) {
                checkFileExistence(restoreState.requirements, client.ph_tpermit.trim());
            }
            restored.current = true;
        }
    }, [clients, restoreState]);

    const handleClientSelect = async (e) => {
        const clientId = e.target.value;
        setSelectedClientId(clientId);
        setRequirements([]);
        setFileExists({});
        setError('');

        if (!clientId) {
            setSelectedClient(null);
            return;
        }

        const client = clients.find((c) => String(c.ph_ctrlno) === clientId);
        setSelectedClient(client);

        setLoading(true);
        try {
            const res = await api.getNewApplicationRequirements(client.ph_tpermit);
            setRequirements(res);
            // Check file existence for each requirement
            checkFileExistence(res, client.ph_tpermit.trim());
        } catch (err) {
            setError('Failed to fetch permit requirements: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviewAttachment = (req) => {
        // Skip redundant file check - we already verified existence with batch check
        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        const descPrefix = (req.pr_desc || '').substring(0, 2);
        const safeName = `${permitNo}-${descPrefix}.pdf`;
        const fullPath = `${ATTACHMENTS_BASE_PATH}${safeName}`;
        const webPath = api.getNewApplicationAttachmentUrl(safeName);

        navigate('/newapp/preview', {
            state: {
                filePath: webPath,
                displayPath: fullPath,
                source: req.pr_source,
                safeName,
                restoreState: {
                    selectedClientId,
                    selectedClient,
                    requirements,
                    fileExists,
                },
            },
        });
    };

    const handleAttachClick = async (req, index) => {
        setAttachMessage('');
        setError('');

        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        if (!permitNo) {
            setError('Please select a client with a permit number before checking attachments.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const prefix = ((req?.pr_desc || '').trim().replace(/\s+/g, '') || 'NA').slice(0, 2);
        const fileName = `${permitNo}-${prefix}.pdf`;
        const displayPath = `${ATTACHMENTS_BASE_PATH}${fileName}`;

        try {
            await api.checkNewApplicationAttachment(fileName);
            await api.updateNewApplicationRequirementAttachment({
                permitNo,
                description: req?.pr_desc || '',
                fileName,
                attached: true,
            });
            setAttachMessage(`Attachment exists: ${displayPath}`);
            setRequirements((prev) =>
                prev.map((item, idx) =>
                    idx === index
                        ? {
                              ...item,
                              pr_source: fileName,
                              pr_wsource: 1,
                          }
                        : item
                )
            );
        } catch (err) {
            setError(`Attachment not found: ${displayPath}`);
        } finally {
            setTimeout(() => {
                setAttachMessage('');
                setError('');
            }, 3000);
        }
    };

    const getFullAddress = (client) => {
        if (!client) return '';
        return [client.ph_address1, client.ph_address2].filter(Boolean).join(', ');
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
                    <h2 className="page-title">New Application</h2>
                </div>
                <div className="page-actions">
                    {currentUser?.log_access === 1 && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsPermitModalOpen(true)}
                            disabled={requirements.length === 0}
                        >
                            <FiCheckCircle /> Permit Approved
                        </button>
                    )}
                </div>
            </div>

            <PermitApprovedModal
                isOpen={isPermitModalOpen}
                onClose={() => setIsPermitModalOpen(false)}
                clientId={selectedClientId}
                currentPermitNo={selectedClient?.ph_tpermit || ''}
                onSave={(data) => {
                    console.log('Permit Approved Data:', data);
                }}
            />

            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div className="transactions-compact-form">
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Client</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedClientId}
                            onChange={handleClientSelect}
                        >
                            <option value="">-- Select Client --</option>
                            {clients.map((client) => (
                                <option key={client.ph_ctrlno} value={client.ph_ctrlno}>
                                    {client.ph_cname}
                                </option>
                            ))}
                        </select>
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
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Permit No.</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_tpermit || ''}
                            readOnly
                        />
                    </div>
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {attachMessage && <div className="success-alert">{attachMessage}</div>}

            <div className="transactions-grid-section">
                {selectedClientId ? (
                    loading ? (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center' }}
                        >
                            <div className="spinner"></div> Loading requirements...
                        </div>
                    ) : requirements.length > 0 ? (
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
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                background: 'var(--muted)',
                                                textAlign: 'left',
                                            }}
                                        >
                                            Description
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                background: 'var(--muted)',
                                                textAlign: 'left',
                                            }}
                                        >
                                            Filename
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                background: 'var(--muted)',
                                                width: '120px',
                                                textAlign: 'center',
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
                                                        opacity: refreshingAttachments ? 0.5 : 1,
                                                        minWidth: 'auto',
                                                    }}
                                                >
                                                    <FiRefreshCw
                                                        size={14}
                                                        className={
                                                            refreshingAttachments ? 'spin' : ''
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requirements.map((req, index) => {
                                        const permitNo = (selectedClient?.ph_tpermit || '').trim();
                                        const filename = getRequirementFilename(req, permitNo);
                                        return (
                                            <tr key={`${req.pr_desc}-${index}`}>
                                                <td>{req.pr_desc}</td>
                                                <td
                                                    style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '11px',
                                                        color: 'var(--muted-foreground)',
                                                    }}
                                                >
                                                    {filename}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            backgroundColor: fileExists[index]
                                                                ? '#22c55e'
                                                                : '#ef4444',
                                                            color: 'var(--primary-foreground)',
                                                            border: 'none',
                                                            padding: '4px 12px',
                                                            fontSize: '12px',
                                                        }}
                                                        onClick={() => handlePreviewAttachment(req)}
                                                        disabled={!fileExists[index]}
                                                    >
                                                        Preview
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
                            <p>No requirements found for this permit</p>
                        </div>
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

export default NewApplication;
