import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';

import '../styles/global.css';
import '../components/modals/Modal.css';

const ORDINALS = [
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
    'Tenth',
];

const startOfMonth = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

const cycleRanges = (permit) => {
    if (!permit?.ph_dfrom || !permit?.ph_dto) return [];

    // Parse start and end dates from permit
    const dFrom = new Date(permit.ph_dfrom);
    const dTo = new Date(permit.ph_dto);

    if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) return [];

    const ranges = [];

    // Start logic: Next month from ph_dfrom
    // Example: ph_dfrom = May 14, 2024 -> First cycle start = June 1, 2024
    let cursor = new Date(dFrom.getFullYear(), dFrom.getMonth() + 1, 1);

    // End logic: ph_dto determines the absolute cutoff
    const absoluteEnd = new Date(dTo.getFullYear(), dTo.getMonth(), 1); // Normalize to start of month for comparison

    while (cursor <= absoluteEnd) {
        // Define cycle start
        const rangeStart = new Date(cursor);

        // Define expected cycle end: 12 months later (inclusive range)
        // e.g., Start June 2024 -> End May 2025
        const rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 11, 1);

        // Check if the calculated end exceeds the permit's actual expiration
        // If the permit ends mid-cycle, we cap the cycle at the permit end.
        // But usually cycles are full years. We'll take the min.
        const effectiveEnd = rangeEnd > absoluteEnd ? new Date(absoluteEnd) : rangeEnd;

        // Push the range
        ranges.push({ start: rangeStart, end: effectiveEnd });

        // Prepare cursor for next cycle: Start of the month AFTER the current cycle ends
        // e.g., Current Ends May 2025 -> Next Starts June 2025
        cursor = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth() + 1, 1);

        // Safety break to prevent infinite loops if dates are messed up
        if (cursor <= rangeStart) break;
    }

    return ranges;
};

const formatMonthYear = (date) =>
    date
        ? date.toLocaleDateString('en-US', {
              timeZone: 'Asia/Manila',
              month: 'long',
              year: 'numeric',
          })
        : '';

const formatVolumeValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    return numeric.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const formatDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstDayOfCurrentMonthInput = () => {
    const now = new Date();
    return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
};

const ProductionAudit = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Check for restored state
    const restoredClientId = location.state?.restoreState?.clientId || '';
    const restoredPermitId = location.state?.restoreState?.permitId || '';

    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(restoredClientId);
    const [selectedPermit, setSelectedPermit] = useState(''); // Will be set after permits load
    const [pendingRestoredPermit, setPendingRestoredPermit] = useState(restoredPermitId);
    const [permits, setPermits] = useState([]);
    const [productionRows, setProductionRows] = useState([]);
    const [loadingProduction, setLoadingProduction] = useState(false);
    const [savingProduction, setSavingProduction] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ pr_date: '', pr_vextracted: '', pr_vsold: '' });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);

    const { currentUser } = useOutletContext();

    const isAdmin = useMemo(() => {
        if (!currentUser) return false;

        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;

        // Check various admin conditions
        // 1. role is 'admin' (legacy/default)
        // 2. username is 'admin'
        // 3. log_access is 1 (standard admin flag) or '1'
        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

    const selectedClient = useMemo(
        () => clients.find((client) => String(client.ph_ctrlno) === String(selectedClientId)),
        [clients, selectedClientId]
    );

    const selectedPermitObj = useMemo(
        () => permits.find((permit) => permit.ph_permitno === selectedPermit),
        [permits, selectedPermit]
    );

    const permitStatus = useMemo(() => {
        if (!selectedPermitObj?.ph_dto) return '';
        const end = new Date(selectedPermitObj.ph_dto);
        if (Number.isNaN(end)) return '';
        return new Date() <= end ? 'Active' : 'Expired';
    }, [selectedPermitObj]);

    // Auto-hide success notification after 3 seconds
    useEffect(() => {
        if (!info) return;
        const timer = setTimeout(() => setInfo(''), 3000);
        return () => clearTimeout(timer);
    }, [info]);

    // Auto-hide error notification after 5 seconds
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    useEffect(() => {
        const loadClients = async () => {
            try {
                const data = await api.getProductionAuditClients();
                setClients(data || []);

                // If restoring, set search text
                if (restoredClientId && data) {
                    const client = data.find(
                        (c) => String(c.ph_ctrlno) === String(restoredClientId)
                    );
                    if (client) {
                        setClientSearch(client.ph_cname);
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load clients');
            }
        };

        loadClients();
    }, [restoredClientId]);

    useEffect(() => {
        if (!selectedClientId) {
            setSelectedPermit('');
            setPermits([]);
            return;
        }
        const fetchPermits = async () => {
            try {
                setError('');
                const data = await api.getProductionAuditPermits(selectedClient.ph_ctrlno);
                setPermits(data || []);

                if (pendingRestoredPermit) {
                    // Try to restore the specific permit
                    const exists = data.find((p) => p.ph_permitno === pendingRestoredPermit);
                    if (exists) {
                        setSelectedPermit(pendingRestoredPermit);
                    } else {
                        setSelectedPermit((data && data[0]?.ph_permitno) || '');
                    }
                    setPendingRestoredPermit(''); // Clear it so it doesn't interfere later
                } else {
                    setSelectedPermit((data && data[0]?.ph_permitno) || '');
                }
            } catch (err) {
                setPermits([]);
                setSelectedPermit('');
                setError(err.message || 'Failed to load permits');
            }
        };

        fetchPermits();
    }, [selectedClient, pendingRestoredPermit]);

    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const selectClient = (clientId) => {
        setSelectedClientId(clientId);
        setSelectedPermit('');
        setPermits([]);
        setProductionRows([]);
        setError('');
        setInfo('');
        setEditingId(null);
        setShowClientSuggestions(false);

        if (!clientId) {
            setClientSearch('');
            return;
        }
        const client = clients.find((c) => c.ph_ctrlno == clientId);
        setClientSearch(client?.ph_cname || '');
    };

    const clearClient = () => {
        setSelectedClientId('');
        setClientSearch('');
        setSelectedPermit('');
        setPermits([]);
        setProductionRows([]);
        setError('');
        setInfo('');
        setEditingId(null);
        setShowClientSuggestions(false);
    };

    const fetchProduction = useCallback(async () => {
        if (!selectedPermit || !selectedClientId) {
            setProductionRows([]);
            return;
        }
        try {
            setError('');
            setLoadingProduction(true);
            const data = await api.getProductionAuditData(selectedPermit, selectedClientId);
            setProductionRows(data || []);
        } catch (err) {
            setProductionRows([]);
            setError(err.message || 'Failed to load production data');
        } finally {
            setLoadingProduction(false);
        }
    }, [selectedPermit, selectedClientId]);

    useEffect(() => {
        fetchProduction();
        setEditingId(null);
        setForm({ pr_date: '', pr_vextracted: '', pr_vsold: '' });
    }, [fetchProduction]);

    const combinedAddress = useMemo(() => {
        if (!selectedClient) return '';
        return [selectedClient.ph_address1, selectedClient.ph_address2].filter(Boolean).join(', ');
    }, [selectedClient]);

    const productionByCycle = useMemo(() => {
        if (!selectedPermitObj) return [];
        const ranges = cycleRanges(selectedPermitObj);
        const allowableVolume = selectedPermitObj?.ph_volume ?? '';

        return ranges.map((range, idx) => {
            const label = `${ORDINALS[idx] || `${idx + 1}th`} Cycle`;

            // Generate all months in the cycle range
            const allMonths = [];
            let cursor = new Date(range.start);
            while (cursor <= range.end) {
                allMonths.push(new Date(cursor));
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            }

            // Map each month to existing production data or mark as no production
            const rows = allMonths.map((monthDate) => {
                const existingRow = productionRows.find((row) => {
                    const dt = startOfMonth(row.pr_date);
                    return dt && dt.getTime() === monthDate.getTime();
                });

                if (existingRow) {
                    const hasExtractedValue =
                        existingRow.pr_vextracted !== null &&
                        existingRow.pr_vextracted !== undefined &&
                        existingRow.pr_vextracted !== '';
                    const hasSoldValue =
                        existingRow.pr_vsold !== null &&
                        existingRow.pr_vsold !== undefined &&
                        existingRow.pr_vsold !== '';
                    const hasProductionValue = hasExtractedValue || hasSoldValue;
                    if (hasProductionValue) {
                        return existingRow;
                    }
                    return {
                        ...existingRow,
                        pr_date: monthDate,
                        noProduction: true,
                    };
                } else {
                    // Return placeholder for months without data
                    return {
                        pr_date: monthDate,
                        pr_vextracted: null,
                        pr_vsold: null,
                        pr_vpaid: null,
                        pr_taskforce: null,
                        noProduction: true, // Flag to indicate no production data
                    };
                }
            });

            // Calculate totals for all volume columns in this cycle.
            const totalExtracted = rows.reduce((sum, r) => sum + (Number(r.pr_vextracted) || 0), 0);
            const totalSold = rows.reduce((sum, r) => sum + (Number(r.pr_vsold) || 0), 0);
            const totalPaid = rows.reduce((sum, r) => sum + (Number(r.pr_vpaid) || 0), 0);
            const totalTaskForce = rows.reduce((sum, r) => sum + (Number(r.pr_taskforce) || 0), 0);

            return {
                label,
                range,
                rows,
                totalExtracted,
                totalSold,
                totalPaid,
                totalTaskForce,
                allowableVolume,
            };
        });
    }, [productionRows, selectedPermitObj]);

    const handleFormChange = (field) => (e) => {
        let value = e.target.value;
        if (field === 'pr_date' && value) {
            // Snap to the 1st of the selected month
            const parts = value.split('-');
            if (parts.length === 3) {
                value = `${parts[0]}-${parts[1]}-01`;
            }
        }
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleEdit = (row) => {
        setEditingId(row.pr_ctrlno);
        setForm({
            pr_date: formatDateInput(row.pr_date),
            pr_vextracted: row.pr_vextracted ?? '',
            pr_vsold: row.pr_vsold ?? '',
        });
        setInfo('');
        setIsModalOpen(true);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm({ pr_date: '', pr_vextracted: '', pr_vsold: '' });
        setInfo('');
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (!selectedPermit) {
            setError('Select a permit first.');
            return;
        }
        if (!form.pr_date) {
            setError('Date is required.');
            return;
        }

        try {
            setSavingProduction(true);
            const payload = {
                permitNo: selectedPermit,
                date: form.pr_date,
                volumeExtracted: form.pr_vextracted === '' ? 0 : Number(form.pr_vextracted) || 0,
                volumeSold: form.pr_vsold === '' ? 0 : Number(form.pr_vsold) || 0,
            };
            let successMsg = '';
            if (editingId) {
                await api.updateProductionAuditEntry({ id: editingId, ...payload });
                successMsg = 'Production entry updated.';
            } else {
                await api.createProductionAuditEntry(payload);
                successMsg = 'Production entry added.';
            }
            handleCancelEdit();
            setInfo(successMsg);
            fetchProduction();
        } catch (err) {
            setError(err.message || 'Failed to save production entry');
        } finally {
            setSavingProduction(false);
        }
    };

    const handleDelete = async (row) => {
        if (!row?.pr_ctrlno) return;
        setRowToDelete(row);
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="hstack hstack-3">
                    <h1 className="page-title">Production Audit</h1>
                </div>
            </div>

            <div
                style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                    }}
                >
                    <div className="form-group">
                        <label className="form-label">Client</label>
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="form-input"
                                value={clientSearch}
                                placeholder="Type to search client..."
                                onFocus={() => {
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!clientSearch);
                                }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setClientSearch(val);
                                    if (inputRef.current) {
                                        const rect = inputRef.current.getBoundingClientRect();
                                        setDropdownPosition({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                        });
                                    }
                                    setShowClientSuggestions(!!val);
                                    if (!val) clearClient();
                                }}
                            />
                            {selectedClientId && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        height: '100%',
                                        aspectRatio: '1',
                                    }}
                                    onClick={clearClient}
                                    title="Clear selection"
                                >
                                    ✕
                                </button>
                            )}
                            {clientSuggestions.length > 0 &&
                                showClientSuggestions &&
                                createPortal(
                                    <ul
                                        style={{
                                            position: 'absolute',
                                            top: dropdownPosition.top,
                                            left: dropdownPosition.left,
                                            width: dropdownPosition.width,
                                            zIndex: 9999,
                                            background: 'var(--popover)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            margin: '4px 0 0 0',
                                            padding: 0,
                                            listStyle: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        {clientSuggestions.map((c) => (
                                            <li
                                                key={c.ph_ctrlno}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    borderBottom: '1px solid var(--border)',
                                                    color: 'var(--foreground)',
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.target.style.background = 'var(--accent)')
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.target.style.background = 'transparent')
                                                }
                                                onClick={() => selectClient(c.ph_ctrlno)}
                                            >
                                                {c.ph_cname}
                                            </li>
                                        ))}
                                    </ul>,
                                    document.body
                                )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <input
                            type="text"
                            className="form-input form-input-readonly"
                            readOnly
                            value={combinedAddress}
                            placeholder="Client address"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">TIN</label>
                        <input
                            type="text"
                            className="form-input form-input-readonly"
                            readOnly
                            value={selectedClient?.ph_TIN || ''}
                            placeholder="Tax Identification No."
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact</label>
                        <input
                            type="text"
                            className="form-input form-input-readonly"
                            readOnly
                            value={selectedClient?.ph_contact || ''}
                            placeholder="Contact details"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Permit No.</label>
                        <div className="hstack hstack-2">
                            <select
                                className="form-select"
                                value={selectedPermit}
                                onChange={(e) => setSelectedPermit(e.target.value)}
                            >
                                <option value="">-- Select Permit --</option>
                                {permits.map((permit) => (
                                    <option
                                        key={`${permit.ph_permitno}-${permit.ph_dfrom}`}
                                        value={permit.ph_permitno}
                                    >
                                        {permit.ph_permitno}
                                    </option>
                                ))}
                            </select>
                            {permitStatus && (
                                <span
                                    className={`badge ${permitStatus === 'Active' ? 'badge-success' : 'badge-error'}`}
                                >
                                    {permitStatus}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {error && (
                    <div className="alert alert-error" style={{ marginTop: '12px' }}>
                        {error}
                    </div>
                )}
                {info && (
                    <div className="alert alert-success" style={{ marginTop: '12px' }}>
                        {info}
                    </div>
                )}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                }}
            >
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--foreground)' }}>
                    {selectedPermitObj ? (
                        <>
                            Permit Duration (
                            {new Date(selectedPermitObj.ph_dfrom).toLocaleDateString('en-US', {
                                timeZone: 'Asia/Manila',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}{' '}
                            –{' '}
                            {new Date(selectedPermitObj.ph_dto).toLocaleDateString('en-US', {
                                timeZone: 'Asia/Manila',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                            ) | Allowable Volume:{' '}
                            {selectedPermitObj.ph_volume !== null &&
                            selectedPermitObj.ph_volume !== undefined &&
                            selectedPermitObj.ph_volume !== ''
                                ? formatVolumeValue(selectedPermitObj.ph_volume)
                                : 'N/A'}
                        </>
                    ) : (
                        ''
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            if (!selectedPermit) return;
                            navigate('/production-audit/preview', {
                                state: {
                                    previewData: {
                                        client: selectedClient,
                                        permit: selectedPermitObj,
                                        cycles: productionByCycle,
                                    },
                                    restoreState: {
                                        clientId: selectedClientId,
                                        permitId: selectedPermit,
                                    },
                                },
                            });
                        }}
                        disabled={!selectedPermit}
                    >
                        Print Preview
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                            setEditingId(null);
                            setForm({
                                pr_date: firstDayOfCurrentMonthInput(),
                                pr_vextracted: '',
                                pr_vsold: '',
                            });
                            setIsModalOpen(true);
                        }}
                        disabled={!selectedPermit}
                    >
                        + Add Production
                    </button>
                </div>
            </div>

            <div className="table-container">
                {loadingProduction ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <span className="loading-text">Loading production data...</span>
                    </div>
                ) : productionByCycle.length > 0 ? (
                    productionByCycle.map((cycle, idx) => (
                        <div
                            key={`${cycle.label}-${idx}`}
                            style={{
                                marginBottom: idx === productionByCycle.length - 1 ? 0 : 16,
                            }}
                        >
                            <div className="text-sm font-medium" style={{ margin: '0 0 8px 12px' }}>
                                {cycle.label} ({formatMonthYear(cycle.range.start)} -{' '}
                                {formatMonthYear(cycle.range.end)})
                            </div>
                            {cycle.rows.length > 0 ? (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '16%' }}>Date</th>
                                            <th style={{ width: '16%' }}>Volume Extracted</th>
                                            <th style={{ width: '16%' }}>Volume Sold</th>
                                            <th style={{ width: '16%' }}>Volume Paid</th>
                                            <th style={{ width: '16%' }}>Volume (Task Force)</th>
                                            <th style={{ width: '20%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cycle.rows.map((row, rIdx) => (
                                            <tr
                                                key={
                                                    row.pr_ctrlno ||
                                                    `${row.pr_permitno}-${row.pr_date}-${rIdx}`
                                                }
                                                style={row.noProduction ? { opacity: 0.6 } : {}}
                                            >
                                                <td>
                                                    {formatMonthYear(startOfMonth(row.pr_date))}
                                                </td>
                                                {row.noProduction ? (
                                                    <>
                                                        <td
                                                            style={{
                                                                fontStyle: 'italic',
                                                                color: 'var(--muted-foreground)',
                                                            }}
                                                        >
                                                            No Production
                                                        </td>
                                                        <td></td>
                                                        <td>
                                                            {Number(row.pr_vpaid) > 0
                                                                ? formatVolumeValue(row.pr_vpaid)
                                                                : ''}
                                                        </td>
                                                        <td
                                                            style={{
                                                                color:
                                                                    Number(row.pr_taskforce) > 0
                                                                        ? '#ef4444'
                                                                        : 'var(--muted-foreground)',
                                                                fontWeight:
                                                                    Number(row.pr_taskforce) > 0
                                                                        ? 600
                                                                        : undefined,
                                                                fontStyle:
                                                                    Number(row.pr_taskforce) > 0
                                                                        ? 'normal'
                                                                        : 'italic',
                                                            }}
                                                        >
                                                            {Number(row.pr_taskforce) > 0
                                                                ? formatVolumeValue(
                                                                      row.pr_taskforce
                                                                  )
                                                                : ''}
                                                        </td>
                                                        <td></td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>
                                                            {formatVolumeValue(row.pr_vextracted)}
                                                        </td>
                                                        <td>{formatVolumeValue(row.pr_vsold)}</td>
                                                        <td>{formatVolumeValue(row.pr_vpaid)}</td>
                                                        <td
                                                            style={{
                                                                color:
                                                                    Number(row.pr_taskforce) >
                                                                    Number(row.pr_vextracted)
                                                                        ? '#ef4444'
                                                                        : undefined,
                                                                fontWeight:
                                                                    Number(row.pr_taskforce) >
                                                                    Number(row.pr_vextracted)
                                                                        ? 600
                                                                        : undefined,
                                                            }}
                                                        >
                                                            {formatVolumeValue(row.pr_taskforce)}
                                                        </td>
                                                        <td>
                                                            <div
                                                                className="action-buttons"
                                                                style={{
                                                                    justifyContent: 'flex-start',
                                                                }}
                                                            >
                                                                <button
                                                                    className="btn-edit"
                                                                    type="button"
                                                                    onClick={() => handleEdit(row)}
                                                                    title="Edit"
                                                                >
                                                                    <FiEdit2 className="icon-sm" />
                                                                </button>
                                                                {isAdmin && (
                                                                    <button
                                                                        className="btn-delete"
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleDelete(row)
                                                                        }
                                                                        title="Delete"
                                                                    >
                                                                        <FiTrash2 className="icon-sm" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td
                                                style={{
                                                    fontWeight: 600,
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                }}
                                            >
                                                Total
                                            </td>
                                            <td
                                                style={{
                                                    fontWeight: 600,
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                    color:
                                                        cycle.allowableVolume &&
                                                        Number(cycle.allowableVolume) <
                                                            cycle.totalExtracted
                                                            ? '#ef4444'
                                                            : '#22c55e',
                                                }}
                                            >
                                                {formatVolumeValue(cycle.totalExtracted)}
                                            </td>
                                            <td
                                                style={{
                                                    fontWeight: 600,
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                }}
                                            >
                                                {formatVolumeValue(cycle.totalSold)}
                                            </td>
                                            <td
                                                style={{
                                                    fontWeight: 600,
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                }}
                                            >
                                                {formatVolumeValue(cycle.totalPaid)}
                                            </td>
                                            <td
                                                style={{
                                                    fontWeight: 600,
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                }}
                                            >
                                                {formatVolumeValue(cycle.totalTaskForce)}
                                            </td>
                                            <td
                                                style={{
                                                    borderTop: '3px double var(--border)',
                                                    paddingTop: '10px',
                                                }}
                                            ></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <div className="text-muted" style={{ padding: '12px' }}>
                                    No production data for this cycle.
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-muted" style={{ padding: '16px' }}>
                        {selectedPermit
                            ? 'No production data found for this permit.'
                            : 'Select a permit to view production data.'}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content dialog-content-lg">
                        <form onSubmit={handleSubmit}>
                            <div className="dialog-header">
                                <Dialog.Title className="dialog-title">
                                    {editingId ? 'Edit Production Entry' : 'Add Production Entry'}
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="dialog-close"
                                        aria-label="Close"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <div className="dialog-body">
                                <div className="form-grid form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">ID</label>
                                        <input
                                            className="form-input form-input-readonly"
                                            value={selectedClient?.ph_ctrlno || ''}
                                            readOnly
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Permit No.</label>
                                        <input
                                            className="form-input form-input-readonly"
                                            value={selectedPermit || ''}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="form-grid form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label form-label-required">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={form.pr_date}
                                            onChange={handleFormChange('pr_date')}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Volume Extracted</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            step="0.01"
                                            min="0"
                                            value={form.pr_vextracted}
                                            onChange={handleFormChange('pr_vextracted')}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Volume Sold</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            step="0.01"
                                            min="0"
                                            value={form.pr_vsold}
                                            onChange={handleFormChange('pr_vsold')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="dialog-footer">
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`btn-primary btn-sm ${savingProduction ? 'btn-loading' : ''}`}
                                    disabled={!selectedPermit || savingProduction}
                                >
                                    {savingProduction ? '' : editingId ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Production Entry"
                    message="Are you sure you want to delete this production entry?"
                    onCancel={() => {
                        setIsDeleteModalOpen(false);
                        setRowToDelete(null);
                    }}
                    onConfirm={async () => {
                        if (!rowToDelete?.pr_ctrlno) return;
                        try {
                            setSavingProduction(true);
                            await api.deleteProductionAuditEntry(rowToDelete.pr_ctrlno);
                            setInfo('Production entry deleted.');
                            if (editingId === rowToDelete.pr_ctrlno) {
                                handleCancelEdit();
                            }
                            fetchProduction();
                        } catch (err) {
                            setError(err.message || 'Failed to delete production entry');
                        } finally {
                            setSavingProduction(false);
                            setIsDeleteModalOpen(false);
                            setRowToDelete(null);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default ProductionAudit;
