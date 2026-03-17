import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

const PermitApprovedModal = ({ isOpen, onClose, onSave, clientId, currentPermitNo }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [formData, setFormData] = useState({
        permitNo: '',
        municipality: '',
        barangay1: '',
        barangay2: '',
        volume: '',
        area: '',
        validFrom: '',
        validTo: '',
    });

    useEffect(() => {
        if (isOpen) {
            // Reset form when opening
            setFormData({
                permitNo: '',
                municipality: '',
                barangay1: '',
                barangay2: '',
                volume: '',
                area: '',
                validFrom: '',
                validTo: '',
            });
            fetchMunicipalities();
        }
    }, [isOpen]);

    const fetchMunicipalities = async () => {
        try {
            const data = await api.getMasterMunicipalities();
            // Assuming data is array of strings or objects.
            // Based on api.js structure it seems like standard fetch.
            // Adjust mapping if needed after testing.
            setMunicipalities(data);
        } catch (err) {
            console.error('Failed to fetch municipalities', err);
        }
    };

    const fetchBarangays = async (mun) => {
        if (!mun) {
            setBarangays([]);
            return;
        }
        try {
            // Using getAssessmentBarangays(municipality) as identified for the specific query
            const data = await api.getAssessmentBarangays(mun);
            setBarangays(data);
        } catch (err) {
            console.error('Failed to fetch barangays', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Number only validation for Volume and Area
        if ((name === 'volume' || name === 'area') && value && !/^\d*\.?\d*$/.test(value)) {
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleMunicipalityChange = (value) => {
        setFormData((prev) => ({ ...prev, municipality: value, barangay1: '', barangay2: '' }));
        fetchBarangays(value);
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!clientId) {
                throw new Error('Client is required to approve the permit.');
            }
            const oldPermitNo = (currentPermitNo || '').trim();
            const newPermitNo = (formData.permitNo || '').trim();

            if (oldPermitNo && newPermitNo && oldPermitNo !== newPermitNo) {
                await api.updateNewApplicationPermitNo({
                    oldPermitNo,
                    newPermitNo,
                });
                await api.renameNewApplicationAttachments({
                    oldPermitNo,
                    newPermitNo,
                });
            }

            await api.createPermitHolderPermit({
                clientId,
                permitNo: newPermitNo,
                municipality: formData.municipality,
                barangay1: formData.barangay1,
                barangay2: formData.barangay2,
                volume: formData.volume,
                area: formData.area,
                dateFrom: formData.validFrom,
                dateTo: formData.validTo,
                source: newPermitNo,
            });
            await api.updateClientPermitHolder(clientId);
            if (onSave) {
                await onSave(formData);
            }
            onClose();
            window.location.reload();
        } catch (err) {
            console.error('Failed to approve permit', err);
            setError(err.message || 'Failed to approve permit.');
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
                        {/* Header */}
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Permit Approved</Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        {/* Body */}
                        <div className="dialog-body">
                            {error && (
                                <div className="error-alert" style={{ marginBottom: '10px' }}>
                                    {error}
                                </div>
                            )}
                            {/* Permit No */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Permit No.</label>
                                <input
                                    type="text"
                                    name="permitNo"
                                    value={formData.permitNo}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Enter Permit No."
                                    required
                                />
                            </div>

                            {/* Municipality */}
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Municipality
                                </label>
                                <Select.Root
                                    value={formData.municipality}
                                    onValueChange={handleMunicipalityChange}
                                    required
                                >
                                    <Select.Trigger className="select-trigger">
                                        <Select.Value placeholder="Select Municipality" />
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
                                                {municipalities.map((mun, idx) => {
                                                    // Handling if municipalities are strings or objects
                                                    const val =
                                                        typeof mun === 'string'
                                                            ? mun
                                                            : mun.mun_name;
                                                    return (
                                                        <Select.Item
                                                            key={idx}
                                                            value={val}
                                                            className="select-item"
                                                        >
                                                            <Select.ItemIndicator className="select-item-indicator">
                                                                <FiCheck size={12} />
                                                            </Select.ItemIndicator>
                                                            <Select.ItemText>{val}</Select.ItemText>
                                                        </Select.Item>
                                                    );
                                                })}
                                            </Select.Viewport>
                                        </Select.Content>
                                    </Select.Portal>
                                </Select.Root>
                            </div>

                            {/* Barangays */}
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Barangay 1
                                    </label>
                                    <Select.Root
                                        value={formData.barangay1}
                                        onValueChange={(val) =>
                                            handleSelectChange('barangay1', val)
                                        }
                                        required
                                        disabled={!formData.municipality}
                                    >
                                        <Select.Trigger className="select-trigger">
                                            <Select.Value placeholder="Select Barangay 1" />
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
                                                    {barangays.map((brgy, idx) => {
                                                        const val =
                                                            typeof brgy === 'string'
                                                                ? brgy
                                                                : brgy.mun_brgy;
                                                        return (
                                                            <Select.Item
                                                                key={idx}
                                                                value={val}
                                                                className="select-item"
                                                            >
                                                                <Select.ItemIndicator className="select-item-indicator">
                                                                    <FiCheck size={12} />
                                                                </Select.ItemIndicator>
                                                                <Select.ItemText>
                                                                    {val}
                                                                </Select.ItemText>
                                                            </Select.Item>
                                                        );
                                                    })}
                                                </Select.Viewport>
                                            </Select.Content>
                                        </Select.Portal>
                                    </Select.Root>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Barangay 2</label>
                                    <Select.Root
                                        value={formData.barangay2}
                                        onValueChange={(val) =>
                                            handleSelectChange('barangay2', val)
                                        }
                                        disabled={!formData.municipality}
                                    >
                                        <Select.Trigger className="select-trigger">
                                            <Select.Value placeholder="Select Barangay 2" />
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
                                                    {barangays.map((brgy, idx) => {
                                                        const val =
                                                            typeof brgy === 'string'
                                                                ? brgy
                                                                : brgy.mun_brgy;
                                                        return (
                                                            <Select.Item
                                                                key={idx}
                                                                value={val}
                                                                className="select-item"
                                                            >
                                                                <Select.ItemIndicator className="select-item-indicator">
                                                                    <FiCheck size={12} />
                                                                </Select.ItemIndicator>
                                                                <Select.ItemText>
                                                                    {val}
                                                                </Select.ItemText>
                                                            </Select.Item>
                                                        );
                                                    })}
                                                </Select.Viewport>
                                            </Select.Content>
                                        </Select.Portal>
                                    </Select.Root>
                                </div>
                            </div>

                            {/* Volume & Area */}
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Volume (Input numbers only)
                                    </label>
                                    <input
                                        type="text"
                                        name="volume"
                                        value={formData.volume}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Area (Input numbers only)
                                    </label>
                                    <input
                                        type="text"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Validity */}
                            <div className="form-group">
                                <label
                                    className="form-label form-label-required"
                                    style={{ marginBottom: '0.5rem', display: 'block' }}
                                >
                                    Permit Validity
                                </label>
                                <div className="form-grid form-grid-2">
                                    <div>
                                        <label
                                            className="form-label"
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--muted-foreground)',
                                            }}
                                        >
                                            From
                                        </label>
                                        <input
                                            type="date"
                                            name="validFrom"
                                            value={formData.validFrom}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="form-label"
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--muted-foreground)',
                                            }}
                                        >
                                            To
                                        </label>
                                        <input
                                            type="date"
                                            name="validTo"
                                            value={formData.validTo}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary btn-sm ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? '' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default PermitApprovedModal;
