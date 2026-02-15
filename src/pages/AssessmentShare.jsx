import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import QRCode from 'react-qr-code';
import logo from '../logo.png';
import qrLogo from '../plenro.png';

const DEFAULT_NOTED_BY_NAME = 'GERAN JOHN T. FLORES';
const DEFAULT_NOTED_BY_TITLE = 'PLENRO';
const getEnvValue = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return fallback;
};
const NOTED_BY_NAME = getEnvValue(import.meta.env.VITE_NOTED_BY_NAME, DEFAULT_NOTED_BY_NAME);
const NOTED_BY_TITLE = getEnvValue(import.meta.env.VITE_NOTED_BY_TITLE, DEFAULT_NOTED_BY_TITLE);

const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
};

const formatAmount = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatDateLong = (dateString) => {
    if (!dateString) return '';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

const AssessmentShare = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { state } = useLocation();
    const previewData = state?.previewData;
    const preparedByName = (previewData?.preparedBy || 'ADMINISTRATOR').toUpperCase();

    // Theme-aware colors
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0a0a0b' : '#f4f4f5';
    const toolbarBg = isDark ? '#1c1c1e' : '#ffffff';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    const mutedColor = isDark ? '#a1a1aa' : '#71717a';
    const qrSize = 80;
    const qrLogoSize = Math.round(qrSize * 0.18);

    const preparedItems = useMemo(() => {
        if (!previewData?.items) return [];
        return previewData.items.map((item) => {
            const measurement = (item.measurement || item.aop_measure || '').trim();
            const volume = item.volume ?? item.aop_volume ?? '';
            const volumeLocked = item.volumeLocked ?? measurement.toLowerCase() === 'n/a';
            const volumeLabel = volumeLocked
                ? 'N/A'
                : [volume, measurement].filter(Boolean).join(' ').trim() || 'N/A';
            return {
                name: item.item || item.aop_item || '',
                volumeLabel,
                charge: Number(item.charge ?? item.aop_charge ?? 0),
                total: Number(item.total ?? item.aop_total ?? 0),
            };
        });
    }, [previewData]);

    const shareInfo = useMemo(() => {
        const breakdown = previewData?.shareBreakdown;
        if (!breakdown) return null;
        const total = breakdown.total || 0;
        const shares = breakdown.shares || [];
        return { total, shares };
    }, [previewData]);

    const renderPanel = (idx = 0) => (
        <div
            key={idx}
            className={`assessment-print-panel${idx === 1 ? ' print-only' : ''}`}
        >
            <div className="assessment-print-header">
                <div className="header-left header-with-logo">
                    <img
                        src={logo}
                        alt="PLENRO Logo"
                        className="header-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <div className="header-text">
                        <div>Republic of the Philippines</div>
                        <div>PROVINCE OF MISAMIS ORIENTAL</div>
                        <div>Cagayan de Oro City</div>
                    </div>
                </div>
                {shareInfo && (
                    <div className="share-box">
                        <div className="share-title">SHARING OF EXTRACTION FEE:</div>
                        <div className="share-rows">
                            {shareInfo.shares.map((share, i) => (
                                <div key={i} className="share-row">
                                    <span>{`${Math.round((share.percent || 0) * 100)}% for ${(
                                        share.label || ''
                                    )
                                        .replace('Brgy.', 'Brgy.')
                                        .trim()}`}</span>
                                    <span>{formatAmount(share.amount)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="share-total">
                            <span>Total</span>
                            <span>{formatCurrency(shareInfo.total)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="assessment-print-body">
                <div className="gov-title">
                    PROVINCIAL LOCAL ENVIRONMENT AND NATURAL RESOURCES OFFICE
                </div>
                <div className="assessment-title">ASSESSMENT OF PAYMENT</div>

                <div className="payer-block">
                    <div className="payer-row">
                        <span className="label">NAME OF PAYOR</span>
                        <span className="separator">:</span>
                        <span className="value bold">{previewData?.clientName || '—'}</span>
                    </div>
                    <div className="payer-row">
                        <span className="label">TIN</span>
                        <span className="separator">:</span>
                        <span className="value">{previewData?.tin || 'N/A'}</span>
                    </div>
                    <div className="payer-row">
                        <span className="label">ADDRESS</span>
                        <span className="separator">:</span>
                        <span className="value">{previewData?.address || 'N/A'}</span>
                    </div>
                    <div className="payer-row">
                        <span className="label">PROJECT LOCATION</span>
                        <span className="separator">:</span>
                        <span className="value">{previewData?.projectLocation || 'N/A'}</span>
                    </div>
                    <div className="payer-row">
                        <span className="label">NATURE OF PAYMENT</span>
                        <span className="separator">:</span>
                        <span className="value">{previewData?.natureOfPayment || 'N/A'}</span>
                    </div>
                    <div className="payer-row">
                        <span className="label">DATE ASSESSED</span>
                        <span className="separator">:</span>
                        <span className="value">
                            {formatDateLong(previewData?.assessmentDate) || 'N/A'}
                        </span>
                        <span className="value control-no">
                            <span className="control-no-wrap">
                                {previewData?.controlNo && (
                                    <span className="control-no-qr">
                                        <span
                                            className="qr-code-wrap"
                                            style={{
                                                '--qr-size': `${qrSize}px`,
                                                '--qr-logo-size': `${qrLogoSize}px`,
                                            }}
                                        >
                                            <QRCode
                                                value={previewData.controlNo}
                                                size={qrSize}
                                                level="H"
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                            />
                                            <img
                                                src={qrLogo}
                                                alt=""
                                                className="qr-code-logo"
                                                onError={(e) => (e.target.style.display = 'none')}
                                            />
                                        </span>
                                    </span>
                                )}
                                <span className="control-no-text">
                                    Control No.: {previewData?.controlNo || '—'}
                                </span>
                            </span>
                        </span>
                    </div>
                </div>

                <div className="assessment-table">
                    <div className="table-row table-head">
                        <div className="col item-col">Items Payable</div>
                        <div className="col volume-col">Volume / Unit</div>
                        <div className="col charge-col">Unit Charge (Php)</div>
                        <div className="col total-col">TOTAL (Php)</div>
                    </div>
                    {preparedItems.map((item, idx) => (
                        <div className="table-row" key={`${item.name}-${idx}`}>
                            <div className="col item-col">{item.name || '—'}</div>
                            <div className="col volume-col">{item.volumeLabel}</div>
                            <div className="col charge-col">{formatAmount(item.charge)}</div>
                            <div className="col total-col">{formatAmount(item.total)}</div>
                        </div>
                    ))}
                    {preparedItems.length === 0 && (
                        <div className="table-row empty-row">
                            <div className="col">No items added</div>
                        </div>
                    )}
                </div>

                <div className="signature-row">
                    <div>
                        <div className="signature-label">Prepared by:</div>
                        <div className="signature-line">{preparedByName}</div>
                        <div className="signature-sub">Staff, Mines Mgt. Services Division</div>
                    </div>
                    <div>
                        <div className="signature-label">Noted by:</div>
                        <div className="signature-line">{NOTED_BY_NAME}</div>
                        <div className="signature-sub">{NOTED_BY_TITLE}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!previewData) {
        return (
            <div
                className="assessment-print-page"
                style={{ backgroundColor: bgColor, minHeight: '100vh' }}
            >
                <div
                    className="print-toolbar"
                    style={{ backgroundColor: toolbarBg, borderBottom: `1px solid ${borderColor}` }}
                >
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                </div>
                <div className="missing-preview" style={{ color: mutedColor }}>
                    No assessment data to preview.
                </div>
            </div>
        );
    }

    return (
        <div
            className="assessment-print-page"
            style={{
                '--page-bg': bgColor,
                '--page-height': '100vh',
            }}
        >
            <div
                className="print-toolbar"
                style={{ backgroundColor: toolbarBg, borderBottom: `1px solid ${borderColor}` }}
            >
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        Print
                    </button>
                </div>
                <div className="toolbar-meta" style={{ color: mutedColor }}>
                    <span>Control No. {previewData.controlNo}</span>
                    <span>Assessment Share Preview</span>
                </div>
            </div>

            <div className="print-panels">{[0, 1].map((idx) => renderPanel(idx))}</div>
        </div>
    );
};

export default AssessmentShare;
