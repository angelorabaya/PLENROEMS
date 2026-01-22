import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const CommodityModal = ({ isOpen, onClose, onSave, commodity }) => {
    const [formData, setFormData] = useState({
        cm_desc: '',
        cm_kind: '',
    });

    useEffect(() => {
        if (commodity) {
            setFormData({
                cm_desc: commodity.cm_desc || '',
                cm_kind: commodity.cm_kind || '',
            });
        } else {
            setFormData({
                cm_desc: '',
                cm_kind: '',
            });
        }
    }, [commodity, isOpen]);

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
                                {commodity ? 'Edit Commodity' : 'Add Commodity'}
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
                                    name="cm_desc"
                                    className="form-input"
                                    value={formData.cm_desc}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter commodity description"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kind</label>
                                <input
                                    type="text"
                                    name="cm_kind"
                                    className="form-input"
                                    value={formData.cm_kind}
                                    onChange={handleChange}
                                    placeholder="Enter commodity kind"
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                {commodity ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default CommodityModal;
