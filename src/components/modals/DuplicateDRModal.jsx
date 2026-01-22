import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import './Modal.css';

const DuplicateDRModal = ({ isOpen, onClose, record }) => {
    if (!record) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <div className="dialog-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiAlertTriangle size={18} color="#f59e0b" />
                            <Dialog.Title className="dialog-title">Duplicate DR Found</Dialog.Title>
                        </div>
                        <Dialog.Close asChild>
                            <button type="button" className="dialog-close" aria-label="Close">
                                <FiX size={16} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="dialog-body">
                        <p
                            style={{
                                marginTop: 0,
                                marginBottom: '16px',
                                color: 'var(--muted-foreground)',
                                fontSize: '14px',
                            }}
                        >
                            This DR Number already exists in the records.
                        </p>

                        <div
                            style={{
                                background: 'var(--secondary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                display: 'grid',
                                gap: '10px',
                                fontSize: '14px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Area
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_area || '-'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Date
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_date || '-'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Checker
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_checker || '-'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Destination
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_destination || '-'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Plate No.
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_plateno || '-'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr',
                                    gap: '8px',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Name
                                </span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {record.tf_name || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="dialog-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            style={{ width: '100%' }}
                        >
                            Close
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DuplicateDRModal;
