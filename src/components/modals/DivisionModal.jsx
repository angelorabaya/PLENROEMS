import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const initialFormData = {
    div_name: '',
};

const DivisionModal = ({ isOpen, onClose, onSave, division }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (division) {
            setFormData({
                div_name: division.div_name || '',
            });
            return;
        }

        setFormData(initialFormData);
    }, [division, isOpen]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            await onSave({
                div_name: formData.div_name.trim().toUpperCase(),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content
                    className="dialog-content dialog-content-md"
                    aria-describedby={undefined}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {division ? 'Edit Division' : 'Add Division'}
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
                                    Division Name
                                </label>
                                <input
                                    type="text"
                                    name="div_name"
                                    value={formData.div_name}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Enter division name"
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        </div>

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
                                {loading ? '' : division ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DivisionModal;
