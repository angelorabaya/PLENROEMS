import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

const EMPTY_FORM = {
    applicantId: '',
    address: '',
    tin: '',
    contact: '',
    tempPermitNo: '',
    requirementType: '',
};

const ProcessApplicantModal = ({ isOpen, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [applicants, setApplicants] = useState([]);
    const [requirementTypes, setRequirementTypes] = useState([]);
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(EMPTY_FORM);
        setError('');
        loadApplicants();
        loadRequirementTypes();
    }, [isOpen]);

    const selectedApplicant = useMemo(
        () => applicants.find((applicant) => String(applicant.ph_ctrlno) === formData.applicantId),
        [applicants, formData.applicantId]
    );

    const loadApplicants = async () => {
        try {
            setLoading(true);
            const data = await api.getApplicantClients();
            setApplicants(data || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch applicants.');
        } finally {
            setLoading(false);
        }
    };

    const loadRequirementTypes = async () => {
        try {
            const data = await api.getPermitReqStatuses();
            setRequirementTypes((data || []).map((item) => item.pr_status).filter(Boolean));
        } catch (err) {
            setError(err.message || 'Failed to fetch requirement types.');
        }
    };

    const handleApplicantChange = (value) => {
        const applicant = applicants.find((item) => String(item.ph_ctrlno) === value);
        setFormData({
            applicantId: value,
            address: applicant?.caddress || '',
            tin: applicant?.ph_TIN || '',
            contact: applicant?.ph_contact || '',
            tempPermitNo: '',
            requirementType: '',
        });
        setError('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedApplicant) {
            setError('Please select an applicant.');
            return;
        }
        if (!formData.tempPermitNo.trim()) {
            setError('Temporary Permit No. is required.');
            return;
        }
        if (!formData.requirementType) {
            setError('Requirement Type is required.');
            return;
        }

        try {
            setSaving(true);
            const result = await api.processNewApplicationApplicant({
                clientId: selectedApplicant.ph_ctrlno,
                applicantName: selectedApplicant.ph_cname,
                tempPermitNo: formData.tempPermitNo.trim(),
                requirementType: formData.requirementType,
            });
            if (onSave) {
                await onSave({
                    applicant: selectedApplicant,
                    tempPermitNo: formData.tempPermitNo.trim(),
                    requirementType: formData.requirementType,
                    result,
                });
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to process applicant.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Process Applicant</Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            {error && (
                                <div className="error-alert" style={{ marginBottom: '10px' }}>
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label form-label-required">Applicant</label>
                                <Select.Root
                                    value={formData.applicantId}
                                    onValueChange={handleApplicantChange}
                                >
                                    <Select.Trigger className="select-trigger" disabled={loading}>
                                        <Select.Value
                                            placeholder={
                                                loading ? 'Loading applicants...' : 'Select applicant'
                                            }
                                        />
                                        <Select.Icon className="select-icon">
                                            <FiChevronDown size={16} />
                                        </Select.Icon>
                                    </Select.Trigger>
                                    <Select.Portal>
                                        <Select.Content
                                            className="select-content"
                                            position="popper"
                                            sideOffset={4}
                                        >
                                            <Select.Viewport className="select-viewport">
                                                {applicants.map((applicant) => (
                                                    <Select.Item
                                                        key={applicant.ph_ctrlno}
                                                        value={String(applicant.ph_ctrlno)}
                                                        className="select-item"
                                                    >
                                                        <Select.ItemIndicator className="select-item-indicator">
                                                            <FiCheck size={12} />
                                                        </Select.ItemIndicator>
                                                        <Select.ItemText>
                                                            {applicant.ph_cname}
                                                        </Select.ItemText>
                                                    </Select.Item>
                                                ))}
                                            </Select.Viewport>
                                        </Select.Content>
                                    </Select.Portal>
                                </Select.Root>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input type="text" className="form-input" value={formData.address} readOnly />
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">TIN</label>
                                    <input type="text" className="form-input" value={formData.tin} readOnly />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact</label>
                                    <input type="text" className="form-input" value={formData.contact} readOnly />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Applicant Type</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={selectedApplicant?.ph_ctype || ''}
                                    readOnly
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Temporary Permit No.
                                </label>
                                <input
                                    type="text"
                                    name="tempPermitNo"
                                    value={formData.tempPermitNo}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Enter temporary permit number"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Requirement Type
                                </label>
                                <Select.Root
                                    value={formData.requirementType}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            requirementType: value,
                                        }))
                                    }
                                >
                                    <Select.Trigger className="select-trigger">
                                        <Select.Value placeholder="Select requirement type" />
                                        <Select.Icon className="select-icon">
                                            <FiChevronDown size={16} />
                                        </Select.Icon>
                                    </Select.Trigger>
                                    <Select.Portal>
                                        <Select.Content
                                            className="select-content"
                                            position="popper"
                                            sideOffset={4}
                                        >
                                            <Select.Viewport className="select-viewport">
                                                {requirementTypes.map((status) => (
                                                    <Select.Item
                                                        key={status}
                                                        value={status}
                                                        className="select-item"
                                                    >
                                                        <Select.ItemIndicator className="select-item-indicator">
                                                            <FiCheck size={12} />
                                                        </Select.ItemIndicator>
                                                        <Select.ItemText>{status}</Select.ItemText>
                                                    </Select.Item>
                                                ))}
                                            </Select.Viewport>
                                        </Select.Content>
                                    </Select.Portal>
                                </Select.Root>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary btn-sm ${saving ? 'btn-loading' : ''}`}
                                disabled={
                                    saving ||
                                    !formData.applicantId ||
                                    !formData.tempPermitNo.trim() ||
                                    !formData.requirementType
                                }
                            >
                                {saving ? '' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ProcessApplicantModal;
