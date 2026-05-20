import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import { FiRefreshCw, FiCheckCircle, FiEye, FiUpload, FiTrash2, FiPlus } from 'react-icons/fi';
import ProcessApplicantModal from '../components/modals/ProcessApplicantModal';
import DeleteModal from '../components/modals/DeleteModal';

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
    const [deletingApplication, setDeletingApplication] = useState(false);
    const [uploadingRequirementIndex, setUploadingRequirementIndex] = useState(null);
    const [removingRequirementIndex, setRemovingRequirementIndex] = useState(null);
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [isProcessApplicantModalOpen, setIsProcessApplicantModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const requirementUploadInputRef = useRef(null);
    const pendingUploadRef = useRef(null);
    const isAdmin =
        (currentUser?.role || currentUser?.log_role || '').toLowerCase().trim() === 'admin';

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

    useEffect(() => {
        if (!error) return undefined;

        const timer = setTimeout(() => setError(''), 3000);
        return () => clearTimeout(timer);
    }, [error]);

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

    const getDisplayedRequirementFilename = (req, permitNo) => {
        const sourceFile = (req.pr_source || '').trim();
        if (sourceFile) return sourceFile;
        return getRequirementFilename(req, permitNo);
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
            const fileName = getDisplayedRequirementFilename(req, permitNo);
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
                const fileName = getDisplayedRequirementFilename(req, permitNo);
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

    useEffect(() => {
        if (!attachMessage) return undefined;

        const timeoutId = window.setTimeout(() => {
            setAttachMessage('');
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [attachMessage]);

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
        const safeName = getDisplayedRequirementFilename(req, permitNo);
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

    const handleRequirementUploadButtonClick = (req, index) => {
        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        if (!permitNo) {
            setError('Please select a client with a permit number before uploading attachments.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        pendingUploadRef.current = { req, index };
        requirementUploadInputRef.current?.click();
    };

    const handleRequirementUploadChange = async (event) => {
        const file = event.target.files?.[0];
        const pendingUpload = pendingUploadRef.current;
        event.target.value = '';

        if (!file || !pendingUpload) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Only PDF files are allowed');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        if (!permitNo) {
            setError('Please select a client with a permit number before uploading attachments.');
            setTimeout(() => setError(''), 3000);
            pendingUploadRef.current = null;
            return;
        }

        const { req, index } = pendingUpload;
        const fileName = getDisplayedRequirementFilename(req, permitNo);

        try {
            setAttachMessage('');
            setError('');
            setUploadingRequirementIndex(index);

            const contentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read PDF file'));
                reader.readAsDataURL(file);
            });

            await api.uploadNewApplicationAttachment({ filename: fileName, contentBase64 });
            await api.updateNewApplicationRequirementAttachment({
                permitNo,
                description: req?.pr_desc || '',
                fileName,
                attached: true,
            });

            setFileExists((prev) => ({ ...prev, [index]: true }));
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
            setAttachMessage(`Uploaded ${fileName}`);
        } catch (err) {
            setError(err.message || 'Failed to upload PDF');
        } finally {
            setUploadingRequirementIndex(null);
            pendingUploadRef.current = null;
            setTimeout(() => {
                setAttachMessage('');
                setError('');
            }, 3000);
        }
    };

    const handleRequirementRemoveClick = async (req, index) => {
        setError('');
        setAttachMessage('');

        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        if (!permitNo) {
            setError('Please select a client with a permit number before removing attachments.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const fileName = getDisplayedRequirementFilename(req, permitNo);

        try {
            setRemovingRequirementIndex(index);
            await api.removeNewApplicationAttachment({ filename: fileName });
            await api.updateNewApplicationRequirementAttachment({
                permitNo,
                description: req?.pr_desc || '',
                fileName,
                attached: false,
            });
            setAttachMessage(`Removed ${fileName}`);
            setFileExists((prev) => ({ ...prev, [index]: false }));
            setRequirements((prev) =>
                prev.map((item, idx) =>
                    idx === index
                        ? {
                              ...item,
                              pr_source: '',
                              pr_wsource: 0,
                          }
                        : item
                )
            );
        } catch (err) {
            setError(err.message || 'Failed to remove PDF');
        } finally {
            setRemovingRequirementIndex(null);
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

    const handleDeleteApplication = async () => {
        const permitNo = (selectedClient?.ph_tpermit || '').trim();
        const clientName = (selectedClient?.ph_cname || '').trim();

        if (!permitNo || !clientName) {
            setError('Please select a client with a permit number before deleting.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        try {
            setDeletingApplication(true);
            setIsDeleteModalOpen(false);
            setError('');
            setAttachMessage('');
            await api.deleteNewApplication({ permitNo, clientName });
            await loadClients();
            setSelectedClientId('');
            setSelectedClient(null);
            setRequirements([]);
            setFileExists({});
            setAttachMessage(`Deleted new application ${permitNo}`);
        } catch (err) {
            setError(err.message || 'Failed to delete new application');
        } finally {
            setDeletingApplication(false);
            setTimeout(() => {
                setAttachMessage('');
                setError('');
            }, 3000);
        }
    };

    return (
        <div className="transactions-page">
            <input
                ref={requirementUploadInputRef}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: 'none' }}
                onChange={handleRequirementUploadChange}
            />
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
                    {isAdmin && (
                        <>
                            <button
                                className="btn btn-outline"
                                type="button"
                                onClick={() => setIsProcessApplicantModalOpen(true)}
                            >
                                <FiPlus /> Process Applicant
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setIsPermitModalOpen(true)}
                                disabled={requirements.length === 0}
                            >
                                <FiCheckCircle /> Permit Approved
                            </button>
                        </>
                    )}
                </div>
            </div>

            <PermitApprovedModal
                isOpen={isPermitModalOpen}
                onClose={() => setIsPermitModalOpen(false)}
                clientId={selectedClientId}
                currentPermitNo={selectedClient?.ph_tpermit || ''}
                onSave={async (data) => {
                    console.log('Permit Approved Data:', data);
                    setSelectedClientId('');
                    setSelectedClient(null);
                    setRequirements([]);
                    setAttachMessage('Application approved successfully.');
                    await loadClients();
                }}
            />

            <ProcessApplicantModal
                isOpen={isProcessApplicantModalOpen}
                onClose={() => setIsProcessApplicantModalOpen(false)}
                onSave={async (data) => {
                    const clientId = String(
                        data?.result?.clientId || data?.applicant?.ph_ctrlno || ''
                    );
                    const permitNo = data?.result?.permitNo || data?.tempPermitNo || '';

                    await loadClients();

                    if (clientId) {
                        setSelectedClientId(clientId);
                    }

                    if (data?.applicant) {
                        setSelectedClient({
                            ...data.applicant,
                            ph_ctrlno: data.applicant.ph_ctrlno,
                            ph_tpermit: permitNo,
                            ph_address1: data.applicant.caddress || '',
                            ph_address2: '',
                        });
                    }

                    if (permitNo) {
                        const res = await api.getNewApplicationRequirements(permitNo);
                        setRequirements(res || []);
                        await checkFileExistence(res || [], permitNo);
                    }

                    setAttachMessage(`Processed applicant ${data?.applicant?.ph_cname || ''}`);
                }}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteApplication}
                title="Delete New Application"
                message={
                    selectedClient?.ph_tpermit && selectedClient?.ph_cname
                        ? `Are you sure you want to delete the new application for ${selectedClient.ph_cname} (${selectedClient.ph_tpermit})?`
                        : 'Are you sure you want to delete this new application?'
                }
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
                                                width: '160px',
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
                                                {isAdmin && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        title="Delete"
                                                        type="button"
                                                        onClick={() => setIsDeleteModalOpen(true)}
                                                        disabled={
                                                            deletingApplication ||
                                                            !selectedClient?.ph_tpermit ||
                                                            !selectedClient?.ph_cname
                                                        }
                                                        style={{
                                                            padding: '4px',
                                                            minWidth: 'auto',
                                                            opacity:
                                                                deletingApplication ||
                                                                !selectedClient?.ph_tpermit ||
                                                                !selectedClient?.ph_cname
                                                                    ? 0.5
                                                                    : 1,
                                                            color: '#ef4444',
                                                        }}
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requirements.map((req, index) => {
                                        const permitNo = (selectedClient?.ph_tpermit || '').trim();
                                        const filename = getDisplayedRequirementFilename(
                                            req,
                                            permitNo
                                        );
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
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            title="Preview PDF"
                                                            style={{
                                                                padding: '6px',
                                                                minWidth: 'auto',
                                                                color: fileExists[index]
                                                                    ? '#22c55e'
                                                                    : '#ef4444',
                                                            }}
                                                            onClick={() =>
                                                                handlePreviewAttachment(req)
                                                            }
                                                            disabled={!fileExists[index]}
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            title="Upload PDF"
                                                            style={{
                                                                padding: '6px',
                                                                minWidth: 'auto',
                                                                color:
                                                                    uploadingRequirementIndex ===
                                                                    index
                                                                        ? 'var(--muted-foreground)'
                                                                        : 'var(--foreground)',
                                                            }}
                                                            onClick={() =>
                                                                handleRequirementUploadButtonClick(
                                                                    req,
                                                                    index
                                                                )
                                                            }
                                                            disabled={
                                                                uploadingRequirementIndex ===
                                                                    index ||
                                                                removingRequirementIndex === index
                                                            }
                                                        >
                                                            <FiUpload size={16} />
                                                        </button>
                                                        {fileExists[index] && (
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                title="Remove PDF"
                                                                style={{
                                                                    padding: '6px',
                                                                    minWidth: 'auto',
                                                                    color: '#ef4444',
                                                                }}
                                                                onClick={() =>
                                                                    handleRequirementRemoveClick(
                                                                        req,
                                                                        index
                                                                    )
                                                                }
                                                                disabled={
                                                                    removingRequirementIndex ===
                                                                        index ||
                                                                    uploadingRequirementIndex ===
                                                                        index
                                                                }
                                                            >
                                                                <FiTrash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
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
