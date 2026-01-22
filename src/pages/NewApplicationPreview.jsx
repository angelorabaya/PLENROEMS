import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const NewApplicationPreview = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { state } = useLocation();
    const filePath = state?.filePath;
    const displayPath = state?.displayPath;
    const source = state?.source;
    const safeName = state?.safeName || '';
    const returnState = state?.restoreState;
    const returnPath = state?.returnPath || '/newapp';
    const [pdfDataUrl, setPdfDataUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const loggedRef = useRef(false);

    // Theme-aware colors
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0a0a0b' : '#ffffff';
    const cardBg = isDark ? '#1c1c1e' : '#ffffff';
    const textColor = isDark ? '#fafafa' : '#09090b';
    const mutedColor = isDark ? '#a1a1aa' : '#71717a';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    const errorColor = isDark ? '#fca5a5' : '#b91c1c';

    useEffect(() => {
        if (!loggedRef.current && (displayPath || source)) {
            // eslint-disable-next-line no-console
            console.log('Rendering attachment preview:', { filePath, displayPath, source });
            loggedRef.current = true;
        }
    }, [displayPath, source, filePath]);

    useEffect(() => {
        let blobUrl = '';

        const loadFile = async () => {
            if (!safeName) return;
            setLoading(true);
            setLoadError('');
            try {
                // Use server-side base64 API which returns JSON (not caught by download managers like IDM)
                const res = await api.getNewApplicationAttachmentBase64(safeName);

                // Convert base64 data URL to blob URL (no size limits in iframes)
                const base64Data = res.dataUrl.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                blobUrl = URL.createObjectURL(blob);
                setPdfDataUrl(blobUrl);
            } catch (err) {
                setLoadError(err.message || 'Failed to load attachment');
            } finally {
                setLoading(false);
            }
        };
        loadFile();

        // Cleanup blob URL on unmount
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [safeName]);

    const pageStyle = {
        backgroundColor: bgColor,
        color: textColor,
        minHeight: '100vh',
    };

    const toolbarStyle = {
        backgroundColor: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const panelStyle = {
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        margin: '16px',
    };

    if (!filePath) {
        return (
            <div style={pageStyle}>
                <div style={toolbarStyle}>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                </div>
                <div
                    style={{
                        ...panelStyle,
                        padding: '24px',
                        textAlign: 'center',
                        color: mutedColor,
                    }}
                >
                    No file to preview.
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={toolbarStyle}>
                <div className="toolbar-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() =>
                            navigate(returnPath, { state: { restoreState: returnState } })
                        }
                    >
                        Back
                    </button>
                </div>
                <div style={{ color: mutedColor, fontSize: '14px' }}>
                    <span>Attachment Preview</span>
                </div>
            </div>

            <div style={{ width: '100%', padding: '0 16px' }}>
                {loading ? (
                    <div style={{ ...panelStyle, padding: '24px', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 8px' }}></div>
                        Loading PDF...
                    </div>
                ) : loadError ? (
                    <div style={{ ...panelStyle, padding: '24px', color: errorColor }}>
                        {loadError}
                    </div>
                ) : pdfDataUrl ? (
                    <div
                        style={{
                            ...panelStyle,
                            width: '100%',
                            height: 'calc(100vh - 100px)',
                            padding: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <iframe
                            title="PDF Preview"
                            src={pdfDataUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    </div>
                ) : (
                    <div
                        style={{
                            ...panelStyle,
                            padding: '24px',
                            textAlign: 'center',
                            color: mutedColor,
                        }}
                    >
                        No file to preview.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewApplicationPreview;
