import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
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

    useEffect(() => {
        if (isOpen) {
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
            } else {
                // New record - get next control number
                loadNextControl();
            }
        }
    }, [isOpen, record]);

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
            setFormData((prev) => ({
                ...prev,
                dms_control: data.nextControl || '',
                dms_source: '',
                dms_empid: '',
                dms_type: '',
                dms_purpose: '',
                dms_desc: '',
            }));
        } catch (err) {
            console.error('Failed to load next control:', err);
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
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {record ? 'Edit Document' : 'Add Document'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
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
