import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
    FiX,
    FiPrinter,
    FiMove,
    FiRotateCcw,
    FiCheck,
    FiInfo,
} from 'react-icons/fi';
import QRCode from 'react-qr-code';
import CryptoJS from 'crypto-js';
import { formatDateTimePHT } from '../../utils/dateUtils';
import './Modal.css';

// Physical Paper configurations (in inches)
const PAPER_CONFIG = {
    Letter: {
        name: 'Letter',
        description: '8.5" × 11"',
        widthInches: 8.5,
        heightInches: 11.0,
        scale: 46, // 46 px/in -> 391px wide, 506px tall in preview
        cssSize: '8.5in 11in',
    },
    A4: {
        name: 'A4',
        description: '8.27" × 11.69"',
        widthInches: 8.27,
        heightInches: 11.69,
        scale: 45, // 45 px/in -> 372px wide, 526px tall in preview
        cssSize: '8.27in 11.69in',
    },
    Legal: {
        name: 'Legal',
        description: '8.5" × 14"',
        widthInches: 8.5,
        heightInches: 14.0,
        scale: 38, // 38 px/in -> 323px wide, 532px tall in preview
        cssSize: '8.5in 14in',
    },
};

// Physical Stamp sizes (in inches)
const STAMP_SIZES = {
    small: {
        label: 'Small',
        qrInches: 0.85,
        paddingInches: 0.05,
        widthInches: 0.95,
        heightWithLabel: 1.18,
        heightNoLabel: 0.95,
    },
    medium: {
        label: 'Medium',
        qrInches: 1.05,
        paddingInches: 0.05,
        widthInches: 1.15,
        heightWithLabel: 1.38,
        heightNoLabel: 1.15,
    },
    large: {
        label: 'Large',
        qrInches: 1.25,
        paddingInches: 0.06,
        widthInches: 1.37,
        heightWithLabel: 1.62,
        heightNoLabel: 1.37,
    },
};

// Preset margin from paper edge (in inches)
const CORNER_MARGIN = 0.4;
// Minimum safe clamp margin from page edge (in inches)
const SAFE_MIN_MARGIN = 0.2;

const DocOutgoingPrintModal = ({ isOpen, onClose, printData }) => {
    const paperRef = useRef(null);

    const [paperSize, setPaperSize] = useState('Letter');
    const [stampSize, setStampSize] = useState('medium');
    const [showLabel, setShowLabel] = useState(true);
    const [activePreset, setActivePreset] = useState('bottom-right');
    const [posInches, setPosInches] = useState({ x: 6.95, y: 9.22 });
    const [isDragging, setIsDragging] = useState(false);

    const paper = PAPER_CONFIG[paperSize] || PAPER_CONFIG.Letter;
    const size = STAMP_SIZES[stampSize] || STAMP_SIZES.medium;
    const stampW = size.widthInches;
    const stampH = showLabel ? size.heightWithLabel : size.heightNoLabel;

    // Helper: calculate exact preset position in inches
    const calculatePresetPosition = useCallback(
        (preset, pKey = paperSize, sKey = stampSize, withLabel = showLabel) => {
            const p = PAPER_CONFIG[pKey] || PAPER_CONFIG.Letter;
            const s = STAMP_SIZES[sKey] || STAMP_SIZES.medium;
            const w = s.widthInches;
            const h = withLabel ? s.heightWithLabel : s.heightNoLabel;

            switch (preset) {
                case 'bottom-right':
                    return {
                        x: Math.round((p.widthInches - w - CORNER_MARGIN) * 100) / 100,
                        y: Math.round((p.heightInches - h - CORNER_MARGIN) * 100) / 100,
                    };
                case 'bottom-left':
                    return {
                        x: CORNER_MARGIN,
                        y: Math.round((p.heightInches - h - CORNER_MARGIN) * 100) / 100,
                    };
                case 'top-right':
                    return {
                        x: Math.round((p.widthInches - w - CORNER_MARGIN) * 100) / 100,
                        y: CORNER_MARGIN,
                    };
                case 'top-left':
                    return {
                        x: CORNER_MARGIN,
                        y: CORNER_MARGIN,
                    };
                case 'center':
                    return {
                        x: Math.round(((p.widthInches - w) / 2) * 100) / 100,
                        y: Math.round(((p.heightInches - h) / 2) * 100) / 100,
                    };
                default:
                    return {
                        x: Math.round((p.widthInches - w - CORNER_MARGIN) * 100) / 100,
                        y: Math.round((p.heightInches - h - CORNER_MARGIN) * 100) / 100,
                    };
            }
        },
        [paperSize, stampSize, showLabel]
    );

    // Initialize or re-evaluate position when modal opens
    useEffect(() => {
        if (isOpen) {
            setActivePreset('bottom-right');
            setPosInches(calculatePresetPosition('bottom-right', paperSize, stampSize, showLabel));
        }
    }, [isOpen, paperSize, stampSize, showLabel, calculatePresetPosition]);

    // Handle paper size change: update position if active preset exists
    const handlePaperChange = (newPaperKey) => {
        setPaperSize(newPaperKey);
        if (activePreset) {
            setPosInches(calculatePresetPosition(activePreset, newPaperKey, stampSize, showLabel));
        } else {
            // Clamp existing custom position to new paper bounds
            const newPaper = PAPER_CONFIG[newPaperKey] || PAPER_CONFIG.Letter;
            setPosInches((prev) => ({
                x: Math.min(
                    prev.x,
                    Math.round((newPaper.widthInches - stampW - SAFE_MIN_MARGIN) * 100) / 100
                ),
                y: Math.min(
                    prev.y,
                    Math.round((newPaper.heightInches - stampH - SAFE_MIN_MARGIN) * 100) / 100
                ),
            }));
        }
    };

    // Handle stamp size change
    const handleStampSizeChange = (newSizeKey) => {
        setStampSize(newSizeKey);
        if (activePreset) {
            setPosInches(calculatePresetPosition(activePreset, paperSize, newSizeKey, showLabel));
        } else {
            const newS = STAMP_SIZES[newSizeKey] || STAMP_SIZES.medium;
            const newW = newS.widthInches;
            const newH = showLabel ? newS.heightWithLabel : newS.heightNoLabel;
            setPosInches((prev) => ({
                x: Math.min(
                    prev.x,
                    Math.round((paper.widthInches - newW - SAFE_MIN_MARGIN) * 100) / 100
                ),
                y: Math.min(
                    prev.y,
                    Math.round((paper.heightInches - newH - SAFE_MIN_MARGIN) * 100) / 100
                ),
            }));
        }
    };

    // Handle label toggle
    const handleLabelToggle = (checked) => {
        setShowLabel(checked);
        if (activePreset) {
            setPosInches(calculatePresetPosition(activePreset, paperSize, stampSize, checked));
        }
    };

    // Select preset
    const handleSelectPreset = (preset) => {
        setActivePreset(preset);
        setPosInches(calculatePresetPosition(preset, paperSize, stampSize, showLabel));
    };

    // Handle drag using native pointer events
    const handlePointerDown = (e) => {
        if (!paperRef.current) return;
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = posInches.x;
        const startPosY = posInches.y;

        setIsDragging(true);
        setActivePreset(null);

        const handlePointerMove = (moveEvent) => {
            const deltaXInches = (moveEvent.clientX - startX) / paper.scale;
            const deltaYInches = (moveEvent.clientY - startY) / paper.scale;

            const minX = SAFE_MIN_MARGIN;
            const minY = SAFE_MIN_MARGIN;
            const maxX = Math.max(minX, paper.widthInches - stampW - SAFE_MIN_MARGIN);
            const maxY = Math.max(minY, paper.heightInches - stampH - SAFE_MIN_MARGIN);

            const nextX = Math.min(Math.max(minX, startPosX + deltaXInches), maxX);
            const nextY = Math.min(Math.max(minY, startPosY + deltaYInches), maxY);

            setPosInches({
                x: Math.round(nextX * 100) / 100,
                y: Math.round(nextY * 100) / 100,
            });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

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

    const baseUrl =
        import.meta.env.VITE_PUBLIC_VERIFY_URL || 'https://your-public-site.com/verify-doc.html';
    const qrValue = `${baseUrl}?${params.toString()}`;

    // Calculate preview pixel coordinates (1:1 with inches)
    const previewSheetW = Math.round(paper.widthInches * paper.scale);
    const previewSheetH = Math.round(paper.heightInches * paper.scale);
    const previewStampW = Math.round(stampW * paper.scale);
    const previewStampH = Math.round(stampH * paper.scale);
    const previewStampX = Math.round(posInches.x * paper.scale);
    const previewStampY = Math.round(posInches.y * paper.scale);
    const previewMarginInset = Math.round(CORNER_MARGIN * paper.scale);

    const distFromRight = Math.max(
        0,
        Math.round((paper.widthInches - (posInches.x + stampW)) * 100) / 100
    );
    const distFromBottom = Math.max(
        0,
        Math.round((paper.heightInches - (posInches.y + stampH)) * 100) / 100
    );

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay hide-on-print" />
                <Dialog.Content
                    className="dialog-content dialog-content-qr hide-on-print"
                    aria-describedby={undefined}
                >
                    {/* Header */}
                    <div className="dialog-header">
                        <div>
                            <Dialog.Title className="dialog-title">
                                Place QR Code & Print
                            </Dialog.Title>
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--muted-foreground)',
                                    marginTop: '2px',
                                }}
                            >
                                Control No: <strong>{printData.dms_control || 'N/A'}</strong>
                                {printData.dms_destination && ` • Destination: ${printData.dms_destination}`}
                            </div>
                        </div>
                        <Dialog.Close asChild>
                            <button type="button" className="dialog-close" aria-label="Close">
                                <FiX size={16} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Main Interactive Body */}
                    <div className="qr-placement-container">
                        {/* Left: Virtual Paper Canvas */}
                        <div className="qr-stage-wrapper">
                            <div className="qr-stage-hint">
                                <FiMove size={14} />
                                <span>
                                    Drag the QR stamp anywhere on the virtual page ({paper.name} paper)
                                </span>
                            </div>

                            <div
                                ref={paperRef}
                                className="qr-paper-sheet"
                                style={{
                                    width: `${previewSheetW}px`,
                                    height: `${previewSheetH}px`,
                                }}
                            >
                                {/* Margin Guidelines (Corner reference) */}
                                <div
                                    className="qr-paper-margins"
                                    style={{
                                        inset: `${previewMarginInset}px`,
                                    }}
                                />

                                {/* Document header simulation */}
                                <div className="qr-paper-doc-header">
                                    <span>PLENRO DMS</span>
                                    <span>{printData.dms_control}</span>
                                </div>

                                {/* Watermark notice */}
                                <div className="qr-paper-watermark">
                                    {paper.name} Sheet ({paper.description})
                                    <br />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 400 }}>
                                        (Feed page into printer tray)
                                    </span>
                                </div>

                                {/* Draggable QR Stamp */}
                                <div
                                    className={`qr-draggable-stamp ${isDragging ? 'is-dragging' : ''}`}
                                    style={{
                                        left: `${previewStampX}px`,
                                        top: `${previewStampY}px`,
                                        width: `${previewStampW}px`,
                                        height: `${previewStampH}px`,
                                        padding: `${Math.round(size.paddingInches * paper.scale)}px`,
                                    }}
                                    onPointerDown={handlePointerDown}
                                    title="Click and drag anywhere on the page"
                                >
                                    <div className="qr-drag-badge">
                                        <FiMove size={9} /> Drag
                                    </div>
                                    <QRCode
                                        value={qrValue}
                                        size={Math.round(size.qrInches * 96)}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block',
                                        }}
                                    />
                                    {showLabel && (
                                        <div className="qr-stamp-label-preview">
                                            {printData.dms_control}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Controls & Presets Sidebar */}
                        <div className="qr-controls-sidebar">
                            {/* Paper Size Section */}
                            <div className="qr-control-section">
                                <label className="qr-control-label">Paper Size</label>
                                <div className="qr-btn-grid-3">
                                    {Object.keys(PAPER_CONFIG).map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`qr-btn-pill ${paperSize === key ? 'active' : ''}`}
                                            onClick={() => handlePaperChange(key)}
                                        >
                                            {paperSize === key && <FiCheck size={12} />}
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Position Presets Section */}
                            <div className="qr-control-section">
                                <label className="qr-control-label">Position Presets</label>
                                <div className="qr-btn-grid-2">
                                    <button
                                        type="button"
                                        className={`qr-btn-pill ${activePreset === 'top-left' ? 'active' : ''}`}
                                        onClick={() => handleSelectPreset('top-left')}
                                    >
                                        Top Left
                                    </button>
                                    <button
                                        type="button"
                                        className={`qr-btn-pill ${activePreset === 'top-right' ? 'active' : ''}`}
                                        onClick={() => handleSelectPreset('top-right')}
                                    >
                                        Top Right
                                    </button>
                                    <button
                                        type="button"
                                        className={`qr-btn-pill ${activePreset === 'bottom-left' ? 'active' : ''}`}
                                        onClick={() => handleSelectPreset('bottom-left')}
                                    >
                                        Bottom Left
                                    </button>
                                    <button
                                        type="button"
                                        className={`qr-btn-pill ${activePreset === 'bottom-right' ? 'active' : ''}`}
                                        onClick={() => handleSelectPreset('bottom-right')}
                                    >
                                        Bottom Right
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className={`qr-btn-pill ${activePreset === 'center' ? 'active' : ''}`}
                                    style={{ marginTop: '0.2rem' }}
                                    onClick={() => handleSelectPreset('center')}
                                >
                                    Center
                                </button>
                            </div>

                            {/* QR Stamp Size Section */}
                            <div className="qr-control-section">
                                <label className="qr-control-label">Stamp Size</label>
                                <div className="qr-btn-grid-3">
                                    {Object.keys(STAMP_SIZES).map((sizeKey) => (
                                        <button
                                            key={sizeKey}
                                            type="button"
                                            className={`qr-btn-pill ${stampSize === sizeKey ? 'active' : ''}`}
                                            onClick={() => handleStampSizeChange(sizeKey)}
                                        >
                                            {stampSize === sizeKey && <FiCheck size={12} />}
                                            {STAMP_SIZES[sizeKey].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Label Toggle */}
                            <div className="qr-control-section">
                                <label className="qr-control-label">Options</label>
                                <label className="qr-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={showLabel}
                                        onChange={(e) => handleLabelToggle(e.target.checked)}
                                    />
                                    <span>Print Control No. text below QR</span>
                                </label>
                            </div>

                            {/* Real Coordinates Feedback */}
                            <div className="qr-control-section">
                                <div className="qr-pos-indicator" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>
                                            From Top-Left: <strong>{posInches.x}" × {posInches.y}"</strong>
                                        </span>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            style={{
                                                padding: '2px 6px',
                                                fontSize: '0.7rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                            }}
                                            onClick={() => handleSelectPreset('bottom-right')}
                                            title="Reset position to Bottom-Right"
                                        >
                                            <FiRotateCcw size={11} /> Reset
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>
                                        From Edge: <strong>Right: {distFromRight}"</strong>,{' '}
                                        <strong>Bottom: {distFromBottom}"</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Tip */}
                            <div className="qr-info-callout">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 600,
                                        marginBottom: '2px',
                                    }}
                                >
                                    <FiInfo size={13} /> 100% Print-to-Scale
                                </div>
                                Virtual page matches physical paper scale exactly. Place physical
                                document into printer tray and click Print.
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="dialog-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Close
                        </button>
                        <button type="button" className="btn-primary" onClick={handlePrint}>
                            <FiPrinter /> Print QR Stamp
                        </button>
                    </div>
                </Dialog.Content>

                {/* Printable container: active only during browser window.print() */}
                <div
                    className="print-only-container"
                    style={{
                        width: `${paper.widthInches}in`,
                        height: `${paper.heightInches}in`,
                    }}
                >
                    <style>
                        {`@page { size: ${paper.cssSize}; margin: 0; }`}
                    </style>
                    <div
                        className="qr-print-layout"
                        style={{
                            position: 'absolute',
                            left: `${posInches.x}in`,
                            top: `${posInches.y}in`,
                            width: `${stampW}in`,
                            height: `${stampH}in`,
                        }}
                    >
                        <div
                            className="qr-stamp-inner"
                            style={{
                                width: `${stampW}in`,
                                height: `${stampH}in`,
                                padding: `${size.paddingInches}in`,
                            }}
                        >
                            <QRCode
                                value={qrValue}
                                size={Math.round(size.qrInches * 96)}
                                style={{
                                    width: `${size.qrInches}in`,
                                    height: `${size.qrInches}in`,
                                    display: 'block',
                                }}
                            />
                            {showLabel && printData.dms_control && (
                                <div className="qr-stamp-label">{printData.dms_control}</div>
                            )}
                        </div>
                    </div>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default DocOutgoingPrintModal;
