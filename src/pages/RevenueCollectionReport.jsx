import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    ShadingType,
    VerticalAlign,
    TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';
import '../styles/revenue-collection-print.css';

/* ============================================
   CONFIGURATION
   ============================================ */
const DEFAULT_PREPARED_BY_NAME = 'GERAN JOHN T. FLORES';
const DEFAULT_PREPARED_BY_TITLE = 'PLENRO';
const DEFAULT_VERIFIED_BY_NAME = 'RONALD JAME D. VIOLON, CPA';
const DEFAULT_VERIFIED_BY_TITLE = 'PROVINCIAL TREASURER';

const getEnvValue = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return fallback;
};

const PREPARED_BY_NAME = getEnvValue(import.meta.env.VITE_NOTED_BY_NAME, DEFAULT_PREPARED_BY_NAME);
const PREPARED_BY_TITLE = getEnvValue(
    import.meta.env.VITE_NOTED_BY_TITLE,
    DEFAULT_PREPARED_BY_TITLE
);
const VERIFIED_BY_NAME = getEnvValue(
    import.meta.env.VITE_VERIFIED_BY_NAME,
    DEFAULT_VERIFIED_BY_NAME
);
const VERIFIED_BY_TITLE = getEnvValue(
    import.meta.env.VITE_VERIFIED_BY_TITLE,
    DEFAULT_VERIFIED_BY_TITLE
);

/* ============================================
   UTILITIES
   ============================================ */
const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/* ============================================
   DOCX EXPORT HELPERS
   ============================================ */
const ACCENT_COLOR = '2D5A27';
const BLACK = '000000';
const MUTED = '555555';
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const solidBorder = { style: BorderStyle.SINGLE, size: 1, color: BLACK };
const thickBorder = { style: BorderStyle.SINGLE, size: 2, color: BLACK };
const allBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };

const buildFeeRow = (label, amount, isTotalRow = false) => {
    const topBorderStyle = isTotalRow ? thickBorder : solidBorder;
    return new TableRow({
        children: [
            new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: { ...allBorders, top: topBorderStyle },
                shading: isTotalRow ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                    new Paragraph({
                        spacing: { before: 40, after: 40 },
                        indent: { left: 120 },
                        children: [
                            new TextRun({
                                text: label,
                                bold: isTotalRow,
                                size: isTotalRow ? 22 : 20,
                                font: 'Segoe UI',
                            }),
                        ],
                    }),
                ],
            }),
            new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: { ...allBorders, top: topBorderStyle },
                shading: isTotalRow ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 40, after: 40 },
                        indent: { right: 120 },
                        children: [
                            new TextRun({
                                text: formatCurrency(amount),
                                bold: isTotalRow,
                                size: isTotalRow ? 22 : 20,
                                font: 'Segoe UI',
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
};

/* ============================================
   COMPONENT
   ============================================ */
const RevenueCollectionReport = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const month = searchParams.get('month') || 'January';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReportData();
    }, [year, month]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching report for ${month} ${year}`);
            const result = await api.getRevenueCollection(year, month);
            console.log('Report data received:', result);
            setData(result || {});
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportWord = async () => {
        if (!data) return;

        // Recalculate values (same logic as the component render)
        const extFee =
            (Number(data.Share_Prov_30) || 0) +
            (Number(data.Share_Mun_30) || 0) +
            (Number(data.Share_Brgy_40) || 0);
        const extFeeMGB = Number(data.MGB_Prov_30) || 0;
        const total =
            extFee +
            extFeeMGB +
            (Number(data.Admin_Fee) || 0) +
            (Number(data.Ecosystem_Fee) || 0) +
            (Number(data.Admin_Ecosystem_Fee) || 0) +
            (Number(data.Other_Misc_Fee) || 0) +
            (Number(data.Outbound_Fee) || 0) +
            (Number(data.Inbound_Fee) || 0) +
            (Number(data.Sticker_Fee) || 0) +
            (Number(data.Reg_Conveyances_Fee) || 0) +
            (Number(data.Penalties_Fee) || 0);

        // --- Header Section ---
        const headerParagraphs = [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                    new TextRun({
                        text: 'REPUBLIC OF THE PHILIPPINES',
                        bold: true,
                        size: 24,
                        font: 'Segoe UI',
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                    new TextRun({
                        text: 'Province of Misamis Oriental',
                        size: 22,
                        font: 'Segoe UI',
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 0 },
                children: [
                    new TextRun({
                        text: 'PROVINCIAL LOCAL ENVIRONMENT AND NATURAL RESOURCES OFFICE',
                        bold: true,
                        size: 20,
                        font: 'Segoe UI',
                        color: ACCENT_COLOR,
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                    new TextRun({
                        text: 'Misortel Building, A. Luna St., Cagayan de Oro City',
                        italics: true,
                        size: 18,
                        font: 'Segoe UI',
                        color: MUTED,
                    }),
                ],
            }),
            // Divider line
            new Paragraph({
                spacing: { before: 100, after: 100 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLACK } },
                children: [],
            }),
        ];

        // --- Title Section ---
        const titleParagraphs = [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 0 },
                children: [
                    new TextRun({
                        text: 'REVENUE COLLECTION REPORT',
                        bold: true,
                        size: 28,
                        font: 'Segoe UI',
                        color: ACCENT_COLOR,
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 200 },
                children: [
                    new TextRun({
                        text: `For the Month of ${month}, ${year}`,
                        size: 22,
                        font: 'Segoe UI',
                    }),
                ],
            }),
        ];

        // --- Table Header Row ---
        const tableHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    borders: allBorders,
                    shading: { type: ShadingType.SOLID, color: ACCENT_COLOR },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 60, after: 60 },
                            children: [
                                new TextRun({
                                    text: 'PARTICULARS',
                                    bold: true,
                                    size: 20,
                                    font: 'Segoe UI',
                                    color: 'FFFFFF',
                                }),
                            ],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: allBorders,
                    shading: { type: ShadingType.SOLID, color: ACCENT_COLOR },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 60, after: 60 },
                            children: [
                                new TextRun({
                                    text: 'AMOUNT (₱)',
                                    bold: true,
                                    size: 20,
                                    font: 'Segoe UI',
                                    color: 'FFFFFF',
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        // --- Fee Data Rows ---
        const feeRows = [
            buildFeeRow('Extraction Fee', extFee),
            buildFeeRow('Extraction Fee (MGB)', extFeeMGB),
            buildFeeRow('Administrative Fee', data.Admin_Fee),
            buildFeeRow('Ecosystem Services Fee', data.Ecosystem_Fee),
            buildFeeRow('Admin & Ecosystem Fee', data.Admin_Ecosystem_Fee),
            buildFeeRow('Other Miscellaneous Fee', data.Other_Misc_Fee),
            buildFeeRow('Outbound Fee', data.Outbound_Fee),
            buildFeeRow('Inbound Fee', data.Inbound_Fee),
            buildFeeRow('Sticker Fee', data.Sticker_Fee),
            buildFeeRow('Registration (Conveyances)', data.Reg_Conveyances_Fee),
            buildFeeRow('Penalties', data.Penalties_Fee),
            buildFeeRow('TOTAL COLLECTION (GROSS)', total, true),
            buildFeeRow('LESS: Municipal Share (30% of Extraction Fee)', data.Share_Mun_30),
            buildFeeRow('         Barangay Share (40% of Extraction Fee)', data.Share_Brgy_40),
            buildFeeRow('TOTAL COLLECTION (NET)', data.Net_Share, true),
        ];

        const feesTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [tableHeaderRow, ...feeRows],
        });

        // --- Signature Section (table-based for Word) ---
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
        const signatureTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
                // Labels row
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: noBorders,
                            children: [
                                new Paragraph({
                                    spacing: { before: 0, after: 600 },
                                    children: [
                                        new TextRun({
                                            text: 'Prepared by:',
                                            size: 20,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: noBorders,
                            children: [
                                new Paragraph({
                                    spacing: { before: 0, after: 600 },
                                    children: [
                                        new TextRun({
                                            text: 'Verified by:',
                                            size: 20,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
                // Names row
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: noBorders,
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    border: {
                                        top: { style: BorderStyle.SINGLE, size: 1, color: BLACK },
                                    },
                                    spacing: { before: 40, after: 0 },
                                    children: [
                                        new TextRun({
                                            text: PREPARED_BY_NAME,
                                            bold: true,
                                            size: 22,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 0, after: 0 },
                                    children: [
                                        new TextRun({
                                            text: PREPARED_BY_TITLE,
                                            size: 20,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            borders: noBorders,
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    border: {
                                        top: { style: BorderStyle.SINGLE, size: 1, color: BLACK },
                                    },
                                    spacing: { before: 40, after: 0 },
                                    children: [
                                        new TextRun({
                                            text: VERIFIED_BY_NAME,
                                            bold: true,
                                            size: 22,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 0, after: 0 },
                                    children: [
                                        new TextRun({
                                            text: VERIFIED_BY_TITLE,
                                            size: 20,
                                            font: 'Segoe UI',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        // --- Footer ---
        const footerParagraphs = [
            new Paragraph({
                spacing: { before: 300 },
                border: { top: { style: BorderStyle.SINGLE, size: 1, color: MUTED } },
                children: [],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 0 },
                children: [
                    new TextRun({
                        text: 'Provincial Local Environment and Natural Resources Office',
                        italics: true,
                        size: 16,
                        font: 'Segoe UI',
                        color: MUTED,
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                    new TextRun({
                        text: 'Misortel Building, A. Luna St., Provincial Capitol Compound, Cagayan de Oro City',
                        italics: true,
                        size: 16,
                        font: 'Segoe UI',
                        color: MUTED,
                    }),
                ],
            }),
        ];

        // --- Build Document ---
        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            size: { width: 12240, height: 15840 }, // Letter size in twips
                            margin: { top: 720, right: 900, bottom: 720, left: 900 },
                        },
                    },
                    children: [
                        ...headerParagraphs,
                        ...titleParagraphs,
                        feesTable,
                        new Paragraph({ spacing: { before: 400 }, children: [] }),
                        signatureTable,
                        ...footerParagraphs,
                    ],
                },
            ],
        });

        try {
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Revenue_Collection_Report_${month}_${year}.docx`);
        } catch (err) {
            console.error('Export to Word failed:', err);
            alert('Failed to export to Word. Please try again.');
        }
    };

    // Calculate extraction fee (sum of Province, Municipal, Barangay shares)
    const extractionFee = data
        ? (Number(data.Share_Prov_30) || 0) +
          (Number(data.Share_Mun_30) || 0) +
          (Number(data.Share_Brgy_40) || 0)
        : 0;

    // Calculate MGB Extraction Fee
    const extractionFeeMGB = data ? Number(data.MGB_Prov_30) || 0 : 0;

    // Calculate total
    const totalAmount = data
        ? extractionFee +
          extractionFeeMGB +
          (Number(data.Admin_Fee) || 0) +
          (Number(data.Ecosystem_Fee) || 0) +
          (Number(data.Admin_Ecosystem_Fee) || 0) +
          (Number(data.Other_Misc_Fee) || 0) +
          (Number(data.Outbound_Fee) || 0) +
          (Number(data.Inbound_Fee) || 0) +
          (Number(data.Sticker_Fee) || 0) +
          (Number(data.Reg_Conveyances_Fee) || 0) +
          (Number(data.Penalties_Fee) || 0)
        : 0;

    const shouldShowReport = !loading && !error && data !== null;

    return (
        <div className="revenue-collection-report">
            {/* ========== TOOLBAR (Hidden on Print) ========== */}
            <div className="revenue-print-toolbar">
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/reports-hub')}>
                        Back
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExportWord}
                        disabled={!shouldShowReport}
                    >
                        Export to Word
                    </button>
                </div>
                <div className="toolbar-meta">
                    Revenue Collection Report — {month} {year}
                </div>
            </div>

            {/* ========== REPORT CONTAINER ========== */}
            <div className="revenue-report-container">
                {loading ? (
                    <div className="report-loading">
                        <div className="spinner" />
                        <span>Loading report data...</span>
                    </div>
                ) : error ? (
                    <div className="report-error">
                        <span>Error: {error}</span>
                        <button className="btn btn-secondary" onClick={loadReportData}>
                            Retry
                        </button>
                    </div>
                ) : shouldShowReport ? (
                    <div className="revenue-report-paper">
                        {/* ===== HEADER ===== */}
                        <header className="revenue-report-header">
                            <div className="header-text">
                                <h3>REPUBLIC OF THE PHILIPPINES</h3>
                                <h4>Province of Misamis Oriental</h4>
                                <h4 className="office-name">
                                    Provincial Local Environment and Natural Resources Office
                                </h4>
                                <p className="office-address">
                                    Misortel Building, A. Luna St., Cagayan de Oro City
                                </p>
                            </div>
                        </header>

                        {/* ===== TITLE ===== */}
                        <section className="revenue-report-title">
                            <h1>Revenue Collection Report</h1>
                            <p className="report-date">
                                For the Month of {month}, {year}
                            </p>
                        </section>

                        {/* ===== FEES TABLE ===== */}
                        <table className="revenue-table">
                            <thead>
                                <tr className="table-header">
                                    <th style={{ width: '65%' }}>Particulars</th>
                                    <th style={{ width: '35%' }}>Amount (₱)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Extraction Fee</td>
                                    <td className="amount">{formatCurrency(extractionFee)}</td>
                                </tr>
                                <tr>
                                    <td>Extraction Fee (MGB)</td>
                                    <td className="amount">{formatCurrency(extractionFeeMGB)}</td>
                                </tr>
                                <tr>
                                    <td>Administrative Fee</td>
                                    <td className="amount">{formatCurrency(data.Admin_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Ecosystem Services Fee</td>
                                    <td className="amount">{formatCurrency(data.Ecosystem_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Admin & Ecosystem Fee</td>
                                    <td className="amount">
                                        {formatCurrency(data.Admin_Ecosystem_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Other Miscellaneous Fee</td>
                                    <td className="amount">
                                        {formatCurrency(data.Other_Misc_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Outbound Fee</td>
                                    <td className="amount">{formatCurrency(data.Outbound_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Inbound Fee</td>
                                    <td className="amount">{formatCurrency(data.Inbound_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Sticker Fee</td>
                                    <td className="amount">{formatCurrency(data.Sticker_Fee)}</td>
                                </tr>
                                <tr>
                                    <td>Registration (Conveyances)</td>
                                    <td className="amount">
                                        {formatCurrency(data.Reg_Conveyances_Fee)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Penalties</td>
                                    <td className="amount">{formatCurrency(data.Penalties_Fee)}</td>
                                </tr>
                                <tr className="total-row">
                                    <td>
                                        <strong>TOTAL COLLECTION (GROSS)</strong>
                                    </td>
                                    <td className="amount">
                                        <strong>{formatCurrency(totalAmount)}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td>LESS: Municipal Share (30% of Extraction Fee)</td>
                                    <td className="amount">{formatCurrency(data.Share_Mun_30)}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <span style={{ visibility: 'hidden' }}>LESS: </span>
                                        Barangay Share (40% of Extraction Fee)
                                    </td>
                                    <td className="amount">{formatCurrency(data.Share_Brgy_40)}</td>
                                </tr>
                                <tr className="total-row">
                                    <td>
                                        <strong>TOTAL COLLECTION (NET)</strong>
                                    </td>
                                    <td className="amount">
                                        <strong>{formatCurrency(data.Net_Share)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ===== SIGNATURE SECTION ===== */}

                        {/* ===== SIGNATURE SECTION ===== */}
                        <section className="signature-section">
                            <div className="signature-block">
                                <p className="signature-label">Prepared by:</p>
                                <p className="signature-name">{PREPARED_BY_NAME}</p>
                                <p className="signature-title">{PREPARED_BY_TITLE}</p>
                            </div>
                            <div className="signature-block">
                                <p className="signature-label">Verified by:</p>
                                <p className="signature-name">{VERIFIED_BY_NAME}</p>
                                <p className="signature-title">{VERIFIED_BY_TITLE}</p>
                            </div>
                        </section>

                        {/* ===== FOOTER ===== */}
                        <footer className="revenue-report-footer">
                            <p>Provincial Local Environment and Natural Resources Office</p>
                            <p>
                                Misortel Building, A. Luna St., Provincial Capitol Compound, Cagayan
                                de Oro City
                            </p>
                        </footer>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default RevenueCollectionReport;
