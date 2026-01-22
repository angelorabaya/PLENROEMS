import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

const NatureOfPaymentDetailModal = ({ isOpen, onClose, onSave, detail, natureId }) => {
    const [formData, setFormData] = useState({
        np_desc: '',
        np_unitcharge: '',
        np_ucsecond: '',
        np_ucthird: '',
        np_measure: '',
    });
    const [measures, setMeasures] = useState([]);

    // Fetch measures on mount
    useEffect(() => {
        fetchMeasures();
    }, []);

    const fetchMeasures = async () => {
        try {
            const data = await api.getNatureOfPaymentMeasures();
            setMeasures(data);
        } catch (err) {
            console.error('Failed to fetch measures:', err);
        }
    };

    useEffect(() => {
        if (detail) {
            setFormData({
                np_desc: detail.np_desc || '',
                np_unitcharge: detail.np_unitcharge || '',
                np_ucsecond: detail.np_ucsecond || '',
                np_ucthird: detail.np_ucthird || '',
                np_measure: detail.np_measure || '',
            });
        } else {
            setFormData({
                np_desc: '',
                np_unitcharge: '',
                np_ucsecond: '',
                np_ucthird: '',
                np_measure: '',
            });
        }
    }, [detail, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            np_lnkctrl: natureId,
        });
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-md">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {detail ? 'Edit Payment Detail' : 'Add Payment Detail'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    name="np_desc"
                                    className="form-input"
                                    value={formData.np_desc}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter description"
                                    autoFocus
                                />
                            </div>

                            <div
                                className="form-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Charge (₱)</label>
                                    <input
                                        type="number"
                                        name="np_unitcharge"
                                        className="form-input"
                                        value={formData.np_unitcharge}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Second Violation (₱)</label>
                                    <input
                                        type="number"
                                        name="np_ucsecond"
                                        className="form-input"
                                        value={formData.np_ucsecond}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div
                                className="form-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Third Violation (₱)</label>
                                    <input
                                        type="number"
                                        name="np_ucthird"
                                        className="form-input"
                                        value={formData.np_ucthird}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Measure</label>
                                    <select
                                        name="np_measure"
                                        className="form-select"
                                        value={formData.np_measure}
                                        onChange={handleChange}
                                    >
                                        <option value="">-- Select Measure --</option>
                                        {measures.map((measure) => (
                                            <option key={measure} value={measure}>
                                                {measure}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                {detail ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default NatureOfPaymentDetailModal;
