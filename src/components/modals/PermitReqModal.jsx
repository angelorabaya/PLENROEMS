import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const PermitReqModal = ({ isOpen, onClose, onSave, permitReq }) => {
    const [formData, setFormData] = useState({
        pr_desc: '',
        pr_status: 'Active',
    });

    useEffect(() => {
        if (permitReq) {
            setFormData({
                pr_desc: permitReq.pr_desc || '',
                pr_status: permitReq.pr_status || 'Active',
            });
        } else {
            setFormData({
                pr_desc: '',
                pr_status: 'Active',
            });
        }
    }, [permitReq, isOpen]);

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
                                {permitReq ? 'Edit Requirement' : 'Add Requirement'}
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
                                <textarea
                                    name="pr_desc"
                                    className="form-textarea"
                                    value={formData.pr_desc}
                                    onChange={handleChange}
                                    required
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    name="pr_status"
                                    className="form-select"
                                    value={formData.pr_status}
                                    onChange={handleChange}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                {permitReq ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default PermitReqModal;
