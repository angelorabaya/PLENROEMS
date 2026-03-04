import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import { getTodayPHT } from '../../utils/dateUtils';
import './Modal.css';

const DeliveryReceiptModal = ({ isOpen, onClose, onSave, receipt }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        dr_releasedate: getTodayPHT(),
        dr_stubno: '',
        dr_stubfrom: '',
        dr_stubto: '',
    });

    useEffect(() => {
        if (receipt) {
            setFormData({
                dr_releasedate: receipt.dr_releasedate
                    ? new Date(receipt.dr_releasedate).toISOString().split('T')[0]
                    : getTodayPHT(),
                dr_stubno: receipt.dr_stubno || '',
                dr_stubfrom: receipt.dr_stubfrom || '',
                dr_stubto: receipt.dr_stubto || '',
            });
        } else {
            setFormData({
                dr_releasedate: getTodayPHT(),
                dr_stubno: '',
                dr_stubfrom: '',
                dr_stubto: '',
            });
        }
    }, [receipt, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await onSave(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <form onSubmit={handleSubmit}>
                        {/* Header */}
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {receipt ? 'Edit Delivery Receipt' : 'Add Delivery Receipt'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        {/* Body */}
                        <div className="dialog-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Date Released
                                </label>
                                <input
                                    type="date"
                                    name="dr_releasedate"
                                    value={formData.dr_releasedate}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Stub No.</label>
                                <input
                                    type="text"
                                    name="dr_stubno"
                                    value={formData.dr_stubno}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Enter stub number"
                                    required
                                />
                            </div>

                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Series From
                                    </label>
                                    <input
                                        type="number"
                                        name="dr_stubfrom"
                                        value={formData.dr_stubfrom}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="Start number"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Series To
                                    </label>
                                    <input
                                        type="number"
                                        name="dr_stubto"
                                        value={formData.dr_stubto}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="End number"
                                        required
                                    />
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

export default DeliveryReceiptModal;
