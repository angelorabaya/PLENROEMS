import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';
import { FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import './Modal.css';

const ClientModal = ({ isOpen, onClose, onSave, client }) => {
    const [isCorporate, setIsCorporate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        ph_lname: '',
        ph_fname: '',
        ph_minitial: '',
        ph_suffix: '',
        ph_cname: '',
        ph_address1: '',
        ph_address2: '',
        ph_TIN: '',
        ph_contact: '',
        ph_ctype: '',
        ph_corporate: 0,
    });

    useEffect(() => {
        if (client) {
            const corporate =
                client.ph_corporate === 1 ||
                (!client.ph_lname && !client.ph_fname && client.ph_cname);
            setIsCorporate(corporate);

            setFormData({
                ph_lname: client.ph_lname || '',
                ph_fname: client.ph_fname || '',
                ph_minitial: client.ph_minitial || '',
                ph_suffix: client.ph_suffix || '',
                ph_cname: client.ph_cname || '',
                ph_address1: client.ph_address1 || '',
                ph_address2: client.ph_address2 || '',
                ph_TIN: client.ph_TIN || '',
                ph_contact: client.ph_contact || '',
                ph_ctype: client.ph_ctype || '',
                ph_corporate: corporate ? 1 : 0,
            });
        } else {
            setIsCorporate(false);
            setFormData({
                ph_lname: '',
                ph_fname: '',
                ph_minitial: '',
                ph_suffix: '',
                ph_cname: '',
                ph_address1: '',
                ph_address2: '',
                ph_TIN: '',
                ph_contact: '',
                ph_ctype: '',
                ph_corporate: 0,
            });
        }
    }, [client, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCorporateChange = (checked) => {
        setIsCorporate(checked);
        setFormData((prev) => ({
            ...prev,
            ph_corporate: checked ? 1 : 0,
            ph_lname: checked ? '' : prev.ph_lname,
            ph_fname: checked ? '' : prev.ph_fname,
            ph_cname: !checked ? '' : prev.ph_cname,
        }));
    };

    const handleClientTypeChange = (value) => {
        setFormData((prev) => ({ ...prev, ph_ctype: value }));
    };

    const updateDisplayName = () => {
        let displayName = '';
        if (formData.ph_lname) displayName += formData.ph_lname.toUpperCase();
        if (formData.ph_fname)
            displayName += (displayName ? ', ' : '') + formData.ph_fname.toUpperCase();
        if (formData.ph_minitial)
            displayName += (displayName ? ' ' : '') + formData.ph_minitial.toUpperCase() + '.';
        if (formData.ph_suffix)
            displayName += (displayName ? ' ' : '') + formData.ph_suffix.toUpperCase();
        return displayName;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalData = {
                ...formData,
                ph_lname: isCorporate ? null : formData.ph_lname.toUpperCase(),
                ph_fname: isCorporate ? null : formData.ph_fname.toUpperCase(),
                ph_minitial: isCorporate ? null : formData.ph_minitial.toUpperCase(),
                ph_suffix: isCorporate ? null : formData.ph_suffix.toUpperCase(),
                ph_cname: isCorporate ? formData.ph_cname : updateDisplayName(),
                ph_corporate: isCorporate ? 1 : 0,
            };

            await onSave(finalData);
        } finally {
            setLoading(false);
        }
    };

    const clientTypes = [
        { value: 'Permit Holder', label: 'Permit Holder' },
        { value: 'Permit Holder - Applicant', label: 'Permit Holder - Applicant' },
        { value: 'New Applicant', label: 'New Applicant' },
        { value: 'Hauler', label: 'Hauler' },
        { value: 'Trader', label: 'Trader' },
    ];

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-lg">
                    <form onSubmit={handleSubmit}>
                        {/* Header */}
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {client ? 'Edit Client' : 'Add New Client'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        {/* Body */}
                        <div className="dialog-body">
                            {/* Corporate Toggle */}
                            <div className="checkbox-wrapper">
                                <Checkbox.Root
                                    className="checkbox-root"
                                    checked={isCorporate}
                                    onCheckedChange={handleCorporateChange}
                                    id="corporate-check"
                                >
                                    <Checkbox.Indicator className="checkbox-indicator">
                                        <FiCheck size={12} />
                                    </Checkbox.Indicator>
                                </Checkbox.Root>
                                <label className="checkbox-label" htmlFor="corporate-check">
                                    Corporate Client
                                </label>
                            </div>

                            {/* Name Section */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    {isCorporate ? 'Company Information' : 'Personal Information'}
                                </div>

                                {isCorporate ? (
                                    <div className="form-group">
                                        <label className="form-label form-label-required">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="ph_cname"
                                            value={formData.ph_cname}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Enter company name..."
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="form-grid form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label form-label-required">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                name="ph_lname"
                                                value={formData.ph_lname}
                                                onChange={handleChange}
                                                className="form-input"
                                                placeholder="Last name"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label form-label-required">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                name="ph_fname"
                                                value={formData.ph_fname}
                                                onChange={handleChange}
                                                className="form-input"
                                                placeholder="First name"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">M.I.</label>
                                            <input
                                                type="text"
                                                name="ph_minitial"
                                                value={formData.ph_minitial}
                                                onChange={handleChange}
                                                maxLength={1}
                                                className="form-input"
                                                placeholder="M"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Suffix</label>
                                            <input
                                                type="text"
                                                name="ph_suffix"
                                                value={formData.ph_suffix}
                                                onChange={handleChange}
                                                className="form-input"
                                                placeholder="Jr., Sr., III"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Address Section */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Address 1</label>
                                <input
                                    type="text"
                                    name="ph_address1"
                                    value={formData.ph_address1}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Street, Barangay"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address 2</label>
                                <input
                                    type="text"
                                    name="ph_address2"
                                    value={formData.ph_address2}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="City, Province (optional)"
                                />
                            </div>

                            {/* Contact & TIN */}
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">TIN</label>
                                    <input
                                        type="text"
                                        name="ph_TIN"
                                        value={formData.ph_TIN}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="000-000-000-000"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact</label>
                                    <input
                                        type="text"
                                        name="ph_contact"
                                        value={formData.ph_contact}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="Phone number"
                                    />
                                </div>
                            </div>

                            {/* Client Type */}
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Client Type
                                </label>
                                <Select.Root
                                    value={formData.ph_ctype}
                                    onValueChange={handleClientTypeChange}
                                    required
                                >
                                    <Select.Trigger className="select-trigger">
                                        <Select.Value placeholder="-- Select Client Type --" />
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
                                                {clientTypes.map((type) => (
                                                    <Select.Item
                                                        key={type.value}
                                                        value={type.value}
                                                        className="select-item"
                                                    >
                                                        <Select.ItemIndicator className="select-item-indicator">
                                                            <FiCheck size={12} />
                                                        </Select.ItemIndicator>
                                                        <Select.ItemText>
                                                            {type.label}
                                                        </Select.ItemText>
                                                    </Select.Item>
                                                ))}
                                            </Select.Viewport>
                                        </Select.Content>
                                    </Select.Portal>
                                </Select.Root>
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

export default ClientModal;
