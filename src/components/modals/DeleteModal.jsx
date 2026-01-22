import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import './Modal.css';

const DeleteModal = ({ isOpen, onClose, onConfirm, onCancel, title, message }) => {
    const handleClose = () => {
        if (onCancel) onCancel();
        if (onClose) onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-sm">
                    <div className="dialog-header">
                        <Dialog.Title className="dialog-title">
                            {title || 'Confirm Delete'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button type="button" className="dialog-close" aria-label="Close">
                                <FiX size={16} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="dialog-body">
                        <div className="delete-modal-content">
                            <div className="delete-modal-icon">
                                <FiAlertTriangle size={24} />
                            </div>
                            <p className="delete-modal-message">
                                {message ||
                                    'Are you sure you want to delete this item? This action cannot be undone.'}
                            </p>
                        </div>
                    </div>

                    <div className="dialog-footer">
                        <button type="button" className="btn-secondary" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="button" className="btn-destructive" onClick={onConfirm}>
                            Delete
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DeleteModal;
