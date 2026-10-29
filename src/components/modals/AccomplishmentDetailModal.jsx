import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiUpload, FiTrash2, FiEye } from 'react-icons/fi';
import { api } from '../../services/api';
import { formatDateInputPHT, getTodayPHT, getEffectiveNow } from '../../utils/dateUtils';
import './Modal.css';

/**
 * Generates a unique base name for accomplishment report images.
 * Example: AR_20261029082215_A1B2_
 * Image 1 becomes: AR_20261029082215_A1B2_1.jpg
 * Image 2 becomes: AR_20261029082215_A1B2_2.jpg
 */
const createUniqueAccomplishmentBaseName = () => {
    const now = getEffectiveNow();
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);

    const get = (type) => parts.find((p) => p.type === type)?.value || '00';
    const timestamp = `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AR_${timestamp}_${randomSuffix}_`;
};

const extractExistingBaseName = (detail) => {
    if (!detail) return null;
    for (let i = 1; i <= 5; i++) {
        const val = String(detail[`ar_image${i}`] || '').trim();
        if (val) {
            const match = val.match(/^(.*)[1-5]\.jpe?g$/i);
            if (match && match[1]) {
                return match[1];
            }
        }
    }
    return null;
};

const AccomplishmentDetailModal = ({ isOpen, onClose, onSave, detail, divisionId }) => {
    const [formData, setFormData] = useState({
        ar_datefrom: '',
        ar_dateto: '',
        ar_place: '',
        ar_program: '',
        ar_target: '',
        ar_remarks: '',
        ar_image1: '',
        ar_image2: '',
        ar_image3: '',
        ar_image4: '',
        ar_image5: '',
    });

    const [uniqueBaseName, setUniqueBaseName] = useState('');
    const [pendingFiles, setPendingFiles] = useState({});
    const [removedExistingFiles, setRemovedExistingFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    const fileInputRefs = useRef({});

    useEffect(() => {
        if (!isOpen) return;

        setModalError('');
        setPendingFiles({});
        setRemovedExistingFiles([]);

        if (detail) {
            const existingBase =
                extractExistingBaseName(detail) || createUniqueAccomplishmentBaseName();
            setUniqueBaseName(existingBase);
            setFormData({
                ar_datefrom: detail.ar_datefrom
                    ? formatDateInputPHT(detail.ar_datefrom)
                    : getTodayPHT(),
                ar_dateto: detail.ar_dateto ? formatDateInputPHT(detail.ar_dateto) : getTodayPHT(),
                ar_place: detail.ar_place || '',
                ar_program: detail.ar_program || '',
                ar_target: detail.ar_target || '',
                ar_remarks: detail.ar_remarks || '',
                ar_image1: detail.ar_image1 || '',
                ar_image2: detail.ar_image2 || '',
                ar_image3: detail.ar_image3 || '',
                ar_image4: detail.ar_image4 || '',
                ar_image5: detail.ar_image5 || '',
            });
        } else {
            const today = getTodayPHT();
            const newBase = createUniqueAccomplishmentBaseName();
            setUniqueBaseName(newBase);
            setFormData({
                ar_datefrom: today,
                ar_dateto: today,
                ar_place: '',
                ar_program: '',
                ar_target: '',
                ar_remarks: '',
                ar_image1: '',
                ar_image2: '',
                ar_image3: '',
                ar_image4: '',
                ar_image5: '',
            });
        }
    }, [detail, isOpen]);

    const handleChange = (e) => {
        const { name, value, maxLength } = e.target;
        const nextValue =
            typeof maxLength === 'number' && maxLength > 0 ? value.slice(0, maxLength) : value;
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
    };

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });

    const handleFileSelect = async (slotIndex, e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const isJpg =
            file.type === 'image/jpeg' ||
            file.name.toLowerCase().endsWith('.jpg') ||
            file.name.toLowerCase().endsWith('.jpeg');

        if (!isJpg) {
            setModalError('Only JPG/JPEG image files are allowed.');
            return;
        }

        try {
            setModalError('');
            const dataUrl = await readFileAsDataUrl(file);
            const generatedFileName = `${uniqueBaseName}${slotIndex}.jpg`;
            const fieldKey = `ar_image${slotIndex}`;

            setPendingFiles((prev) => ({
                ...prev,
                [slotIndex]: {
                    filename: generatedFileName,
                    contentBase64: dataUrl,
                },
            }));

            setFormData((prev) => ({
                ...prev,
                [fieldKey]: generatedFileName,
            }));
        } catch (err) {
            setModalError(err.message || 'Failed to read selected image.');
        }
    };

    const handleClearSlot = (slotIndex) => {
        const fieldKey = `ar_image${slotIndex}`;
        const currentFileName = formData[fieldKey];

        if (detail && detail[fieldKey] && currentFileName === detail[fieldKey]) {
            setRemovedExistingFiles((prev) =>
                prev.includes(currentFileName) ? prev : [...prev, currentFileName]
            );
        }

        setPendingFiles((prev) => {
            const next = { ...prev };
            delete next[slotIndex];
            return next;
        });

        setFormData((prev) => ({
            ...prev,
            [fieldKey]: '',
        }));
    };

    const handlePreviewSlot = (slotIndex) => {
        const pending = pendingFiles[slotIndex];
        if (pending?.contentBase64) {
            const win = window.open();
            if (win) {
                win.document.write(
                    `<title>${pending.filename}</title><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#111;"><img src="${pending.contentBase64}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body>`
                );
            }
            return;
        }

        const fieldKey = `ar_image${slotIndex}`;
        const filename = formData[fieldKey];
        if (filename) {
            const url = api.getAccomplishmentImageUrl(filename);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setSaving(true);

        try {
            // Remove any existing files that were cleared during edit
            for (const filename of removedExistingFiles) {
                try {
                    await api.removeAccomplishmentImage(filename);
                } catch {
                    // Ignore if file already missing on disk
                }
            }

            // Upload newly selected images
            const slots = Object.keys(pendingFiles);
            for (const slot of slots) {
                const { filename, contentBase64 } = pendingFiles[slot];
                await api.uploadAccomplishmentImage({ filename, contentBase64 });
            }

            await onSave({
                ...formData,
                ar_divid: Number(divisionId),
            });
        } catch (err) {
            setModalError(err.message || 'Failed to save accomplishment detail');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content
                    className="dialog-content dialog-content-lg"
                    aria-describedby={undefined}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {detail ? 'Edit Accomplishment Detail' : 'Add Accomplishment Detail'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="dialog-close"
                                    aria-label="Close"
                                    disabled={saving}
                                >
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            {modalError && (
                                <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                                    {modalError}
                                </div>
                            )}

                            <div
                                className="form-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.75rem',
                                }}
                            >
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Date From
                                    </label>
                                    <input
                                        type="date"
                                        name="ar_datefrom"
                                        className="form-input"
                                        value={formData.ar_datefrom}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Date To
                                    </label>
                                    <input
                                        type="date"
                                        name="ar_dateto"
                                        className="form-input"
                                        value={formData.ar_dateto}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label form-label-required"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Place (Max 150)</span>
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        {formData.ar_place.length}/150
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="ar_place"
                                    className="form-input"
                                    value={formData.ar_place}
                                    onChange={handleChange}
                                    required
                                    maxLength={150}
                                    placeholder="Enter place / venue (max 150 characters)"
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label form-label-required"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Program (Max 200)</span>
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        {formData.ar_program.length}/200
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="ar_program"
                                    className="form-input"
                                    value={formData.ar_program}
                                    onChange={handleChange}
                                    required
                                    maxLength={200}
                                    placeholder="Enter program / activity (max 200 characters)"
                                />
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label form-label-required"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Target (Max 200)</span>
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        {formData.ar_target.length}/200
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="ar_target"
                                    className="form-input"
                                    value={formData.ar_target}
                                    onChange={handleChange}
                                    required
                                    maxLength={200}
                                    placeholder="Enter target (max 200 characters)"
                                />
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Remarks (Max 500)</span>
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        {formData.ar_remarks.length}/500
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="ar_remarks"
                                    className="form-input"
                                    value={formData.ar_remarks}
                                    onChange={handleChange}
                                    maxLength={500}
                                    placeholder="Enter remarks (optional, max 500 characters)"
                                />
                            </div>

                            <div className="form-section" style={{ marginTop: '0.5rem' }}>
                                <div className="form-section-title">
                                    Images (Base Name: {uniqueBaseName}[1-5].jpg)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map((slot) => {
                                        const fieldKey = `ar_image${slot}`;
                                        const currentName = formData[fieldKey];
                                        const expectedName = `${uniqueBaseName}${slot}.jpg`;

                                        return (
                                            <div key={slot} className="attachment-box" style={{ padding: '0.5rem 0.75rem' }}>
                                                <div className="attachment-box-header">
                                                    <span className="attachment-box-title" style={{ fontSize: '0.8rem' }}>
                                                        Image {slot}:{' '}
                                                        <span style={{ fontWeight: 400 }}>
                                                            {currentName || 'None'}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={`attachment-status ${currentName ? 'is-success' : 'is-muted'}`}
                                                    >
                                                        {currentName
                                                            ? pendingFiles[slot]
                                                                ? 'Ready to save'
                                                                : 'Saved'
                                                            : `Will be named ${expectedName}`}
                                                    </span>
                                                </div>

                                                <div className="attachment-actions">
                                                    <input
                                                        type="file"
                                                        accept=".jpg,.jpeg,image/jpeg"
                                                        style={{ display: 'none' }}
                                                        ref={(el) => {
                                                            fileInputRefs.current[slot] = el;
                                                        }}
                                                        onChange={(e) => handleFileSelect(slot, e)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="attachment-icon-button"
                                                        title={`Upload Image ${slot} (${expectedName})`}
                                                        onClick={() =>
                                                            fileInputRefs.current[slot]?.click()
                                                        }
                                                        disabled={saving}
                                                    >
                                                        <FiUpload size={14} />
                                                    </button>
                                                    {currentName && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="attachment-icon-button"
                                                                title={`View ${currentName}`}
                                                                onClick={() =>
                                                                    handlePreviewSlot(slot)
                                                                }
                                                                disabled={saving}
                                                            >
                                                                <FiEye size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="attachment-icon-button attachment-icon-button-danger"
                                                                title={`Remove Image ${slot}`}
                                                                onClick={() => handleClearSlot(slot)}
                                                                disabled={saving}
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary ${saving ? 'btn-loading' : ''}`}
                                disabled={saving}
                            >
                                {detail ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default AccomplishmentDetailModal;
