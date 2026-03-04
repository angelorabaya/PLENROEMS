import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import { getTodayPHT, getDateOffsetYearsPHT } from '../../utils/dateUtils';
import './Modal.css';

const VehicleModal = ({ isOpen, onClose, onSave, vehicle }) => {
    const [formData, setFormData] = useState({
        vr_plateno: '',
        vr_trucktype: '',
        vr_cname: '',
        vr_controlno: '',
        vr_code: '',
        vr_datereg: '',
        vr_expiry: '',
    });

    useEffect(() => {
        if (vehicle) {
            setFormData({
                vr_plateno: vehicle.vr_plateno || '',
                vr_trucktype: vehicle.vr_trucktype || '',
                vr_cname: vehicle.vr_cname || '',
                vr_controlno: vehicle.vr_controlno || '',
                vr_code: vehicle.vr_code || '',
                vr_datereg: vehicle.vr_datereg ? vehicle.vr_datereg.split('T')[0] : '',
                vr_expiry: vehicle.vr_expiry ? vehicle.vr_expiry.split('T')[0] : '',
            });
        } else {
            setFormData({
                vr_plateno: '',
                vr_trucktype: '',
                vr_cname: '',
                vr_controlno: '',
                vr_code: '',
                vr_datereg: getTodayPHT(),
                vr_expiry: getDateOffsetYearsPHT(1),
            });
        }
    }, [vehicle, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'vr_datereg' && value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const expiry = new Date(date);
                expiry.setFullYear(date.getFullYear() + 1);
                const expiryString = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`;
                setFormData((prev) => ({
                    ...prev,
                    [name]: value,
                    vr_expiry: expiryString,
                }));
                return;
            }
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
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
                                {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
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
                                    <label className="form-label form-label-required">
                                        Owner Name
                                    </label>
                                    <input
                                        type="text"
                                        name="vr_cname"
                                        className="form-input"
                                        value={formData.vr_cname}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter owner name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Plate No.
                                    </label>
                                    <input
                                        type="text"
                                        name="vr_plateno"
                                        className="form-input"
                                        value={formData.vr_plateno}
                                        onChange={handleChange}
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                        placeholder="ABC 1234"
                                    />
                                </div>
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Truck Type
                                    </label>
                                    <input
                                        type="text"
                                        name="vr_trucktype"
                                        className="form-input"
                                        value={formData.vr_trucktype}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter truck type"
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Control No.</label>
                                    <input
                                        type="number"
                                        name="vr_controlno"
                                        className="form-input"
                                        value={formData.vr_controlno}
                                        onChange={handleChange}
                                        placeholder="e.g. 2023001"
                                    />
                                </div>
                            </div>

                            <div className="form-grid form-grid-3">
                                <div className="form-group">
                                    <label className="form-label">Code</label>
                                    <input
                                        type="text"
                                        name="vr_code"
                                        className="form-input"
                                        value={formData.vr_code}
                                        onChange={handleChange}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date Registered</label>
                                    <input
                                        type="date"
                                        name="vr_datereg"
                                        className="form-input"
                                        value={formData.vr_datereg}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expiry Date</label>
                                    <input
                                        type="date"
                                        name="vr_expiry"
                                        className="form-input"
                                        value={formData.vr_expiry}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                {vehicle ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default VehicleModal;
