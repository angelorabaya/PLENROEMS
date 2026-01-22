import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const PermitTypeModal = ({ isOpen, onClose, onSave, permitType }) => {
    const [formData, setFormData] = useState({
        tp_code: '',
        tp_desc: '',
        tp_expyear: '',
    });

    useEffect(() => {
        if (permitType) {
            setFormData({
                tp_code: permitType.tp_code || '',
                tp_desc: permitType.tp_desc || '',
                tp_expyear: permitType.tp_expyear || '',
            });
        } else {
            setFormData({
                tp_code: '',
                tp_desc: '',
                tp_expyear: '',
            });
        }
    }, [permitType, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
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
                <Dialog.Content className="dialog-content dialog-content-md">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {permitType ? 'Edit Permit Type' : 'Add Permit Type'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">Code</label>
                                <input
                                    type="text"
                                    name="tp_code"
                                    className="form-input"
                                    value={formData.tp_code}
                                    onChange={handleChange}
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                    maxLength={10}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    name="tp_desc"
                                    className="form-input"
                                    value={formData.tp_desc}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Expiration (months)</label>
                                <input
                                    type="number"
                                    name="tp_expyear"
                                    className="form-input"
                                    value={formData.tp_expyear}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="Enter months (e.g., 12 for 1 year)"
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                {permitType ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default PermitTypeModal;
