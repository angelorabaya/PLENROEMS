import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiPrinter } from 'react-icons/fi';
import QRCode from 'react-qr-code';
import CryptoJS from 'crypto-js';
import { formatDateTimePHT } from '../../utils/dateUtils';
import './Modal.css';

const DocOutgoingPrintModal = ({ isOpen, onClose, printData }) => {
    const handlePrint = () => {
        window.print();
    };

    if (!printData) return null;

    const params = new URLSearchParams({
        control: printData.dms_control || '',
        date: printData.dms_date || formatDateTimePHT(new Date()),
        dest: printData.dms_destination || '',
        rel: printData.emp_name || '',
        desc: printData.dms_desc || '',
    });

    // Generate cryptographic signature
    const secretKey = import.meta.env.VITE_QR_SECRET_KEY || 'default_plenro_secret_key_123!';
    const dataToSign = params.toString();
    const signature = CryptoJS.HmacSHA256(dataToSign, secretKey).toString(CryptoJS.enc.Hex);

    params.append('sig', signature);

    // You can set VITE_PUBLIC_VERIFY_URL in your .env file to point to your hosted HTML page
    // Example: VITE_PUBLIC_VERIFY_URL=https://my-plenro.vercel.app/verify-doc.html
    const baseUrl =
        import.meta.env.VITE_PUBLIC_VERIFY_URL || 'https://your-public-site.com/verify-doc.html';
    const qrValue = `${baseUrl}?${params.toString()}`;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay hide-on-print" />
                <Dialog.Content
                    className="dialog-content hide-on-print"
                    aria-describedby={undefined}
                >
                    <div className="dialog-header">
                        <Dialog.Title className="dialog-title">Print QR Code</Dialog.Title>
                        <Dialog.Close asChild>
                            <button type="button" className="dialog-close" aria-label="Close">
                                <FiX size={16} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div
                        className="dialog-body"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem',
                            padding: '2rem 1rem',
                        }}
                    >
                        <div
                            style={{
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <div
                                style={{
                                    background: '#fff',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                }}
                            >
                                <QRCode value={qrValue} size={150} />
                            </div>
                        </div>
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--muted-foreground)',
                                textAlign: 'center',
                                maxWidth: '350px',
                            }}
                        >
                            Click Print to open the browser's print dialog. The QR code containing
                            all document details will be printed on the bottom right of the page.
                        </p>
                    </div>

                    <div className="dialog-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Close
                        </button>
                        <button type="button" className="btn-primary" onClick={handlePrint}>
                            <FiPrinter /> Print
                        </button>
                    </div>
                </Dialog.Content>

                {/* The actual printable area */}
                <div className="print-only-container">
                    <div className="qr-print-layout">
                        <div className="qr-wrapper">
                            <QRCode value={qrValue} size={100} />
                        </div>
                    </div>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DocOutgoingPrintModal;
