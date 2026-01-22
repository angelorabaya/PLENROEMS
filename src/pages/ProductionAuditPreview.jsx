import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const ProductionAuditPreview = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { state } = useLocation();
    const previewData = state?.previewData;

    // Theme-aware colors
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0a0a0b' : '#f4f4f5';
    const toolbarBg = isDark ? '#1c1c1e' : '#ffffff';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    const mutedColor = isDark ? '#a1a1aa' : '#71717a';

    const cycles = previewData?.cycles || [];

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatMonthYear = (date) =>
        date
            ? new Date(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            : '';

    if (!previewData) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', color: mutedColor }}>
                No production audit data to preview.
                <br />
                <button
                    className="btn btn-secondary"
                    style={{ marginTop: '16px' }}
                    onClick={() => navigate(-1)}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div
            className="production-print-page"
            style={{
                minHeight: '100vh',
                backgroundColor: bgColor,
                padding: '20px',
                color: '#000', // Always black for print
            }}
        >
            {/* Toolbar - Hidden in Print */}
            <div
                className="print-toolbar"
                style={{
                    backgroundColor: toolbarBg,
                    borderBottom: `1px solid ${borderColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                }}
            >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() =>
                            navigate('/production-audit', {
                                state: { restoreState: state?.restoreState },
                            })
                        }
                    >
                        Back
                    </button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        Print Report
                    </button>
                </div>
                <div style={{ color: mutedColor, fontWeight: 500 }}>
                    Production Audit Report Preview
                </div>
            </div>

            {/* Report Content */}
            <div
                className="print-content"
                style={{
                    maxWidth: '210mm', // A4 width
                    margin: '0 auto',
                    backgroundColor: '#fff',
                    padding: '32px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    minHeight: '297mm', // A4 height
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px',
                        gap: '16px',
                    }}
                >
                    <div style={{ textAlign: 'center', color: '#111827' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                            Republic of the Philippines
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            PROVINCE OF MISAMIS ORIENTAL
                        </div>
                        <div style={{ fontSize: '11px' }}>Cagayan de Oro City</div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginTop: '8px',
                                color: '#111827',
                            }}
                        >
                            PROVINCIAL LOCAL ENVIRONMENT AND NATURAL RESOURCES OFFICE
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1
                        style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            color: '#111827',
                            margin: 0,
                        }}
                    >
                        Production Audit Report
                    </h1>
                </div>

                {/* Client & Permit Info */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '24px',
                        marginBottom: '32px',
                        fontSize: '12px',
                        color: '#111827',
                    }}
                >
                    <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td
                                        style={{
                                            fontWeight: 'bold',
                                            padding: '4px 0',
                                            width: '100px',
                                        }}
                                    >
                                        PERMITTEE:
                                    </td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {previewData.client?.ph_cname}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '4px 0' }}>
                                        ADDRESS:
                                    </td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {[
                                            previewData.client?.ph_address1,
                                            previewData.client?.ph_address2,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '4px 0' }}>TIN:</td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {previewData.client?.ph_TIN || 'N/A'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td
                                        style={{
                                            fontWeight: 'bold',
                                            padding: '4px 0',
                                            width: '100px',
                                        }}
                                    >
                                        PERMIT NO:
                                    </td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {previewData.permit?.ph_permitno}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '4px 0' }}>
                                        VALIDITY:
                                    </td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {formatDate(previewData.permit?.ph_dfrom)} –{' '}
                                        {formatDate(previewData.permit?.ph_dto)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '4px 0' }}>AREA:</td>
                                    <td
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            padding: '4px 0',
                                        }}
                                    >
                                        {previewData.client?.ph_area || 'N/A'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Production Data */}
                <div style={{ marginBottom: '32px' }}>
                    {cycles.length > 0 ? (
                        cycles.map((cycle, idx) => (
                            <div
                                key={idx}
                                style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}
                            >
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                        color: '#111827',
                                        textTransform: 'uppercase',
                                        borderLeft: '4px solid #208080',
                                        paddingLeft: '8px',
                                    }}
                                >
                                    {cycle.label}{' '}
                                    <span style={{ fontWeight: 'normal' }}>
                                        ({formatMonthYear(cycle.range.start)} -{' '}
                                        {formatMonthYear(cycle.range.end)})
                                    </span>
                                </div>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '11px',
                                        border: '1px solid #000',
                                    }}
                                >
                                    <thead style={{ backgroundColor: '#ffffff', color: '#000' }}>
                                        <tr>
                                            <th
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'left',
                                                    width: '25%',
                                                    color: '#000',
                                                }}
                                            >
                                                Production Month
                                            </th>
                                            <th
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    width: '25%',
                                                    color: '#000',
                                                }}
                                            >
                                                Volume Extracted
                                            </th>
                                            <th
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    width: '25%',
                                                    color: '#000',
                                                }}
                                            >
                                                Volume Sold
                                            </th>
                                            <th
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    width: '25%',
                                                    color: '#000',
                                                }}
                                            >
                                                Volume Paid
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cycle.rows.length > 0 ? (
                                            cycle.rows.map((row, rIdx) => (
                                                <tr key={rIdx}>
                                                    <td
                                                        style={{
                                                            border: '1px solid #000',
                                                            padding: '4px 6px',
                                                            color: '#000',
                                                        }}
                                                    >
                                                        {formatMonthYear(row.pr_date)}
                                                    </td>
                                                    {row.noProduction ? (
                                                        <td
                                                            colSpan={3}
                                                            style={{
                                                                border: '1px solid #000',
                                                                padding: '4px 6px',
                                                                textAlign: 'center',
                                                                fontStyle: 'italic',
                                                                color: '#666',
                                                            }}
                                                        >
                                                            No Production
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #000',
                                                                    padding: '4px 6px',
                                                                    textAlign: 'right',
                                                                    color: '#000',
                                                                }}
                                                            >
                                                                {row.pr_vextracted}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #000',
                                                                    padding: '4px 6px',
                                                                    textAlign: 'right',
                                                                    color: '#000',
                                                                }}
                                                            >
                                                                {row.pr_vsold}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #000',
                                                                    padding: '4px 6px',
                                                                    textAlign: 'right',
                                                                    color: '#000',
                                                                }}
                                                            >
                                                                {row.pr_vpaid}
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="4"
                                                    style={{
                                                        border: '1px solid #000',
                                                        padding: '8px',
                                                        textAlign: 'center',
                                                        fontStyle: 'italic',
                                                        color: '#000',
                                                    }}
                                                >
                                                    No production recorded for this cycle.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderTop: '2px solid #000',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        <tr>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                }}
                                            >
                                                TOTAL
                                            </td>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                }}
                                            >
                                                {cycle.totalExtracted.toFixed(2)}
                                            </td>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                }}
                                            >
                                                {cycle.totalSold.toFixed(2)}
                                            </td>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                }}
                                            >
                                                {cycle.totalPaid.toFixed(2)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                colSpan="4"
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '6px',
                                                    fontSize: '11px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                }}
                                            >
                                                Allowable Volume: {cycle.allowableVolume || 'N/A'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '32px',
                                border: '1px dashed #d1d5db',
                                borderRadius: '8px',
                                color: '#6b7280',
                            }}
                        >
                            No cycles found.
                        </div>
                    )}
                </div>

                {/* Signatories */}
                <div
                    style={{
                        marginTop: '48px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#000',
                        pageBreakInside: 'avoid',
                    }}
                >
                    <div style={{ minWidth: '200px' }}>
                        <div style={{ marginBottom: '32px' }}>Prepared by:</div>
                        <div
                            style={{
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                borderBottom: '1px solid #000',
                                display: 'inline-block',
                                minWidth: '200px',
                                textAlign: 'center',
                                color: '#000',
                            }}
                        >
                            {localStorage.getItem('currentUser')
                                ? JSON.parse(localStorage.getItem('currentUser')).log_cname
                                : '__________________'}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '4px' }}>PLENRO Staff</div>
                    </div>
                    <div style={{ minWidth: '200px' }}>
                        <div style={{ marginBottom: '32px' }}>Verified by:</div>
                        <div
                            style={{
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                borderBottom: '1px solid #000',
                                display: 'inline-block',
                                minWidth: '200px',
                                textAlign: 'center',
                                color: '#000',
                            }}
                        >
                            {import.meta.env.VITE_NOTED_BY_NAME || 'GERAN JOHN T. FLORES'}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '4px' }}>
                            {import.meta.env.VITE_NOTED_BY_TITLE || 'PLENRO'}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: '32px',
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#9ca3af',
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '16px',
                    }}
                >
                    Generated on {new Date().toLocaleString()} | PLENRO Systems
                </div>
            </div>

            <style>
                {`
                    @media print {
                        @page { margin: 10mm; size: A4 portrait; }
                        
                        html, body {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            width: 100% !important;
                        }

                        #root {
                            display: block !important;
                            height: auto !important;
                            overflow: visible !important;
                        }

                        .print-toolbar { display: none !important; }
                        
                        .production-print-page { 
                            position: relative !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important; 
                            height: auto !important;
                            min-height: 0 !important;
                            padding: 0 !important; 
                            margin: 0 !important;
                            background: white !important; 
                            overflow: visible !important;
                            display: block !important;
                        }
                        
                        .print-content { 
                            box-shadow: none !important; 
                            margin: 0 !important; 
                            width: 100% !important; 
                            max-width: none !important; 
                        }
                        
                        /* Force table backgrounds to white */
                        table, thead, tbody, tfoot, tr, th, td {
                            background-color: white !important;
                            color: black !important;
                        }

                        /* Force all text to black */
                        * {
                            color: black !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }

                    /* Also force it for screen view within the preview container */
                    .production-print-page table, 
                    .production-print-page thead, 
                    .production-print-page tbody, 
                    .production-print-page tfoot, 
                    .production-print-page tr, 
                    .production-print-page th, 
                    .production-print-page td {
                        background-color: white !important;
                        color: black !important;
                    }
                `}
            </style>
        </div>
    );
};

export default ProductionAuditPreview;
