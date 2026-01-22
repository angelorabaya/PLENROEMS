import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

const PermitHolderModal = ({ isOpen, onClose, onSave, permitHolder }) => {
    const [formData, setFormData] = useState({
        ph_cname: '',
        ph_address1: '',
        ph_address2: '',
        ph_TIN: '',
        ph_contact: '',
        ph_mun: '',
        ph_brgy: '',
    });
    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);

    useEffect(() => {
        const fetchMunicipalities = async () => {
            try {
                const data = await api.getMunicipalities();
                setMunicipalities(data || []);
            } catch (err) {
                console.error('Failed to fetch municipalities:', err);
            }
        };
        if (isOpen) fetchMunicipalities();
    }, [isOpen]);

    useEffect(() => {
        const fetchBarangays = async () => {
            if (!formData.ph_mun) {
                setBarangays([]);
                return;
            }
            try {
                const data = await api.getBarangays(formData.ph_mun);
                setBarangays(data || []);
            } catch (err) {
                console.error('Failed to fetch barangays:', err);
            }
        };
        fetchBarangays();
    }, [formData.ph_mun]);

    useEffect(() => {
        if (permitHolder) {
            setFormData({
                ph_cname: permitHolder.ph_cname || '',
                ph_address1: permitHolder.ph_address1 || '',
                ph_address2: permitHolder.ph_address2 || '',
                ph_TIN: permitHolder.ph_TIN || '',
                ph_contact: permitHolder.ph_contact || '',
                ph_mun: permitHolder.ph_mun || '',
                ph_brgy: permitHolder.ph_brgy || '',
            });
        } else {
            setFormData({
                ph_cname: '',
                ph_address1: '',
                ph_address2: '',
                ph_TIN: '',
                ph_contact: '',
                ph_mun: '',
                ph_brgy: '',
            });
        }
    }, [permitHolder, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const newData = { ...prev, [name]: value };
            // Reset barangay when municipality changes
            if (name === 'ph_mun') {
                newData.ph_brgy = '';
            }
            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {permitHolder ? 'Edit Permit Holder' : 'Add Permit Holder'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">Name</label>
                                <input
                                    type="text"
                                    name="ph_cname"
                                    className="form-input"
                                    value={formData.ph_cname}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Address Line 1</label>
                                    <input
                                        type="text"
                                        name="ph_address1"
                                        className="form-input"
                                        value={formData.ph_address1}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address Line 2</label>
                                    <input
                                        type="text"
                                        name="ph_address2"
                                        className="form-input"
                                        value={formData.ph_address2}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">TIN</label>
                                    <input
                                        type="text"
                                        name="ph_TIN"
                                        className="form-input"
                                        value={formData.ph_TIN}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact</label>
                                    <input
                                        type="text"
                                        name="ph_contact"
                                        className="form-input"
                                        value={formData.ph_contact}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Municipality</label>
                                    <select
                                        name="ph_mun"
                                        className="form-select"
                                        value={formData.ph_mun}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select municipality</option>
                                        {municipalities.map((m) => (
                                            <option
                                                key={m.mun_code || m.mun_name}
                                                value={m.mun_name}
                                            >
                                                {m.mun_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Barangay</label>
                                    <select
                                        name="ph_brgy"
                                        className="form-select"
                                        value={formData.ph_brgy}
                                        onChange={handleChange}
                                        disabled={!formData.ph_mun}
                                    >
                                        <option value="">Select barangay</option>
                                        {barangays.map((b) => (
                                            <option
                                                key={b.brgy_code || b.brgy_name}
                                                value={b.brgy_name}
                                            >
                                                {b.brgy_name}
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
                                {permitHolder ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default PermitHolderModal;
