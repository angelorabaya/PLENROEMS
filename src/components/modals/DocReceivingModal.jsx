import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiUpload, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

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

const DocReceivingModal = ({ isOpen, onClose, onSave, record }) => {
    const uploadInputRef = useRef(null);
    const [formData, setFormData] = useState({
        dms_control: '',
        dms_source: '',
        dms_empid: '',
        dms_type: '',
        dms_purpose: '',
        dms_desc: '',
    });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attachmentExists, setAttachmentExists] = useState(false);
    const [attachmentBusy, setAttachmentBusy] = useState(false);
    const [attachmentMessage, setAttachmentMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAttachmentMessage('');
            loadEmployees();
            if (record) {
                // Editing existing record
                setFormData({
                    dms_control: record.dms_control || '',
                    dms_source: record.dms_source || '',
                    dms_empid: record.dms_empid || '',
                    dms_type: record.dms_type || '',
                    dms_purpose: record.dms_purpose || '',
                    dms_desc: record.dms_desc || '',
                });
                checkAttachment(record.dms_control || '');
            } else {
                // New record - get next control number
                loadNextControl();
            }
        }
    }, [isOpen, record]);

    const checkAttachment = async (controlNo) => {
        const trimmedControlNo = (controlNo || '').trim();
        if (!trimmedControlNo) {
            setAttachmentExists(false);
            return;
        }

        try {
            await api.checkNewApplicationAttachment(`${trimmedControlNo}.pdf`);
            setAttachmentExists(true);
        } catch {
            setAttachmentExists(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const data = await api.getDocReceivingEmployees();
            setEmployees(data || []);
        } catch (err) {
            console.error('Failed to load employees:', err);
        }
    };

    const loadNextControl = async () => {
        try {
            const data = await api.getDocReceivingNextControl();
            const nextControl = data.nextControl || '';
            setFormData((prev) => ({
                ...prev,
                dms_control: nextControl,
                dms_source: '',
                dms_empid: '',
                dms_type: '',
                dms_purpose: '',
                dms_desc: '',
            }));
            checkAttachment(nextControl);
        } catch (err) {
            console.error('Failed to load next control:', err);
        }
    };

    const handleUploadButtonClick = () => {
        if (!formData.dms_control?.trim() || attachmentBusy) return;
        uploadInputRef.current?.click();
    };

    const handleUploadChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setAttachmentMessage('Only PDF files are allowed.');
            return;
        }

        const controlNo = (formData.dms_control || '').trim();
        if (!controlNo) {
            setAttachmentMessage('Control number is required before uploading.');
            return;
        }

        try {
            setAttachmentBusy(true);
            setAttachmentMessage('');

            const contentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read PDF file'));
                reader.readAsDataURL(file);
            });

            await api.uploadNewApplicationAttachment({
                filename: `${controlNo}.pdf`,
                contentBase64,
            });

            setAttachmentExists(true);
            setAttachmentMessage('PDF uploaded successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to upload PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleRemoveAttachment = async () => {
        const controlNo = (formData.dms_control || '').trim();
        if (!controlNo || attachmentBusy) return;

        try {
            setAttachmentBusy(true);
            setAttachmentMessage('');
            await api.removeNewApplicationAttachment({ filename: `${controlNo}.pdf` });
            setAttachmentExists(false);
            setAttachmentMessage('PDF removed successfully.');
        } catch (err) {
            setAttachmentMessage(err.message || 'Failed to remove PDF.');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert source and description to uppercase
            const dataToSave = {
                ...formData,
                dms_source: (formData.dms_source || '').toUpperCase(),
                dms_desc: (formData.dms_desc || '').toUpperCase(),
            };
            await onSave(dataToSave);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content
                    className="dialog-content dialog-content-lg"
                    aria-describedby={undefined}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {record ? 'Edit Document' : 'Add Document'}
                            </Dialog.Title>
                            <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>
                                <FiX size={16} />
                            </button>
                        </div>

                        <div className="dialog-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Control No.</label>
                                    <input
                                        type="text"
                                        name="dms_control"
                                        className="form-input"
                                        value={formData.dms_control}
                                        readOnly
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Source</label>
                                    <input
                                        type="text"
                                        name="dms_source"
                                        className="form-input"
                                        value={formData.dms_source}
                                        onChange={handleChange}
                                        placeholder="Enter source..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Recipient
                                    </label>
                                    <select
                                        name="dms_empid"
                                        className="form-select"
                                        value={formData.dms_empid}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">-- Select --</option>
                                        {employees.map((emp) => (
                                            <option key={emp.emp_ctrlno} value={emp.emp_ctrlno}>
                                                {emp.emp_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Type</label>
                                    <select
                                        name="dms_type"
                                        className="form-select"
                                        value={formData.dms_type}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">-- Select --</option>
                                        {TYPE_OPTIONS.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Purpose</label>
                                <select
                                    name="dms_purpose"
                                    className="form-select"
                                    value={formData.dms_purpose}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Select Purpose --</option>
                                    {PURPOSE_OPTIONS.map((purpose) => (
                                        <option key={purpose} value={purpose}>
                                            {purpose}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    name="dms_desc"
                                    className="form-textarea"
                                    value={formData.dms_desc}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Enter description..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">PDF Attachment</label>
                                <div className="attachment-box">
                                    <div className="attachment-box-header">
                                        <span className="attachment-box-title">
                                            {formData.dms_control
                                                ? `${formData.dms_control}.pdf`
                                                : 'No control number'}
                                        </span>
                                        <span
                                            className={`attachment-status ${attachmentExists ? 'is-success' : 'is-muted'}`}
                                        >
                                            {attachmentExists ? 'Attached' : 'No PDF uploaded'}
                                        </span>
                                    </div>
                                    <div className="attachment-actions">
                                        <button
                                            type="button"
                                            className="attachment-icon-button"
                                            title="Upload PDF"
                                            onClick={handleUploadButtonClick}
                                            disabled={!formData.dms_control || attachmentBusy}
                                        >
                                            <FiUpload size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="attachment-icon-button attachment-icon-button-danger"
                                            title="Remove PDF"
                                            onClick={handleRemoveAttachment}
                                            disabled={
                                                !formData.dms_control ||
                                                !attachmentExists ||
                                                attachmentBusy
                                            }
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                {attachmentMessage ? (
                                    <div className="attachment-message">{attachmentMessage}</div>
                                ) : null}
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleUploadChange}
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DocReceivingModal;
