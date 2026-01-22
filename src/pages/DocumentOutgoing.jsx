import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import DocOutgoingModal from '../components/modals/DocOutgoingModal';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';

const formatDateTime = (value) => {
    if (!value) return '';
    let dateStr = String(value);

    // Clean up SQL Server datetime2/ISO string
    // Capture YYYY-MM-DD HH:mm:ss regardless of T or space separator
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);

    let dateObj;
    if (match) {
        const [, year, month, day, hours, minutes, seconds] = match;
        // Construct as UTC to ensure we have a fixed reference point before converting to target timezone
        dateObj = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
        // Fallback or if already standard format
        dateObj = new Date(value);
    }

    if (isNaN(dateObj.getTime())) return value;

    // Display formatted to Philippine Standard Time (GMT+8)
    return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
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

const DocumentOutgoing = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const { currentUser } = useOutletContext();

    const isAdmin = useMemo(() => {
        if (!currentUser) return false;

        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;

        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getDocumentOutgoing();
            setRecords(data || []);
        } catch (err) {
            setError('Failed to fetch records: ' + err.message);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingRecord(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (record) => {
        setRecordToDelete(record);
        setIsDeleteModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const handleSave = async (formData) => {
        setError('');
        setSuccess('');
        try {
            if (editingRecord) {
                await api.updateDocumentOutgoing(editingRecord.dms_ctrlno, formData);
                setSuccess('Record updated successfully');
            } else {
                await api.createDocumentOutgoing(formData);
                setSuccess('Record created successfully');
            }
            handleModalClose();
            fetchRecords();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to save record');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!recordToDelete) return;
        setError('');
        setSuccess('');
        try {
            await api.deleteDocumentOutgoing(recordToDelete.dms_ctrlno);
            setSuccess('Record deleted successfully');
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
            fetchRecords();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to delete record');
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
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
                    returnPath: '/doc-outgoing',
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
                    <h2 className="page-title">Document Outgoing</h2>
                </div>
                <button className="btn btn-primary" onClick={handleAddClick}>
                    + Add Document
                </button>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="table-container">
                {loading ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                        <div className="spinner"></div> Loading records...
                    </div>
                ) : records.length > 0 ? (
                    <table style={{ width: '100%', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '12%' }}>Date</th>
                                <th style={{ width: '10%' }}>Control No.</th>
                                <th style={{ width: '12%' }}>Destination</th>
                                <th style={{ width: '12%' }}>Released By</th>
                                <th style={{ width: '18%' }}>Description</th>
                                <th style={{ width: '12%' }}>Type</th>
                                <th style={{ width: '16%' }}>Purpose</th>
                                <th style={{ width: '8%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => (
                                <tr key={record.dms_ctrlno}>
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
                                        <span className="cell-text" title={record.dms_destination}>
                                            {record.dms_destination || ''}
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
                                        <div className="action-buttons" style={{ gap: '0.125rem' }}>
                                            <button
                                                className="btn-icon btn-icon-sm"
                                                onClick={() => handlePreviewClick(record)}
                                                title="Preview"
                                            >
                                                <FiEye size={14} />
                                            </button>
                                            <button
                                                className="btn-icon btn-icon-sm"
                                                onClick={() => handleEditClick(record)}
                                                title="Edit"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    className="btn-icon btn-icon-sm btn-icon-danger"
                                                    onClick={() => handleDeleteClick(record)}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                        <p>No outgoing document records found for today.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <DocOutgoingModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                record={editingRecord}
            />

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                itemName={recordToDelete?.dms_control || 'this record'}
            />
        </div>
    );
};

export default DocumentOutgoing;
