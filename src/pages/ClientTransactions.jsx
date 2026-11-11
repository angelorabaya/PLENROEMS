import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import plenroLogo from '../plenro.png';
import { getUserPermissions } from '../utils/permissions';

const ClientTransactions = () => {
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [natureOfPayment, setNatureOfPayment] = useState('');
    const [natureOptions, setNatureOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [allTransactions, setAllTransactions] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewLoading, setPreviewLoading] = useState('');

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [detailToDelete, setDetailToDelete] = useState(null);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

    // Admin check & navigation
    const navigate = useNavigate();
    const { currentUser } = useOutletContext();
    const permissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);

    const selectClient = async (clientId, clientList = clients) => {
        setSelectedClientId(clientId);
        setTransactions([]);
        setAllTransactions([]);
        setError('');
        setNatureOfPayment('');
        setNatureOptions([]);
        setSearchTerm('');
        setShowClientSuggestions(false);

        if (!clientId) {
            setSelectedClient(null);
            setClientSearch('');
            sessionStorage.removeItem('client_transactions_selected_client_id');
            return;
        }

        sessionStorage.setItem('client_transactions_selected_client_id', String(clientId));

        const client = clientList.find((c) => String(c.ph_ctrlno) === String(clientId));
        setSelectedClient(client || null);
        setClientSearch(client?.ph_cname || '');

        setLoading(true);
        try {
            const [details, natures] = await Promise.all([
                api.getTransactionDetails(clientId),
                api.getNatureOfPayment(clientId),
            ]);
            setAllTransactions(details || []);
            setTransactions(details || []);
            setNatureOptions(natures || []);
        } catch (err) {
            setError('Failed to fetch assessment details: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initClients = async () => {
            try {
                const data = await api.getTransactionClients();
                setClients(data || []);

                const savedClientId = sessionStorage.getItem('client_transactions_selected_client_id');
                if (savedClientId && data?.some((c) => String(c.ph_ctrlno) === String(savedClientId))) {
                    const client = data.find((c) => String(c.ph_ctrlno) === String(savedClientId));
                    setSelectedClientId(savedClientId);
                    setSelectedClient(client || null);
                    setClientSearch(client?.ph_cname || '');
                    setLoading(true);
                    try {
                        const [details, natures] = await Promise.all([
                            api.getTransactionDetails(savedClientId),
                            api.getNatureOfPayment(savedClientId),
                        ]);
                        setAllTransactions(details || []);
                        setTransactions(details || []);
                        setNatureOptions(natures || []);
                    } catch (err) {
                        setError('Failed to fetch assessment details: ' + err.message);
                    } finally {
                        setLoading(false);
                    }
                }
            } catch (err) {
                setError('Failed to fetch transaction clients: ' + err.message);
            }
        };

        initClients();
    }, []);

    useEffect(() => {
        if (!error) return undefined;

        const timer = setTimeout(() => setError(''), 3000);
        return () => clearTimeout(timer);
    }, [error]);

    const buildPreviewData = (header, details) => {
        const address = [header.ph_address1, header.ph_address2].filter(Boolean).join(', ');
        const barangayText =
            header.aop_brgycombo != null && header.aop_brgycombo !== ''
                ? header.aop_brgycombo
                : header.aop_brgy || '';
        const location = [barangayText, header.aop_mun].filter(Boolean).join(', ');
        const totalAmount = Number(header.aop_total) || 0;
        const preparedBy = (
            currentUser?.log_cname ||
            currentUser?.log_name ||
            'ADMINISTRATOR'
        ).toUpperCase();
        const shareBreakdown = (() => {
            const isGovShare = (header.aop_nature || '').toLowerCase().includes('government share');
            if (!isGovShare) return null;
            const shares = [
                { label: 'Prov. of Misamis Oriental', percent: 0.3 },
                {
                    label: header.aop_mun ? `Mun. of ${header.aop_mun}` : 'Municipality',
                    percent: 0.3,
                },
                { label: barangayText ? `Brgy. of ${barangayText}` : 'Barangay', percent: 0.4 },
            ];
            return {
                total: totalAmount,
                shares: shares.map((s) => ({
                    ...s,
                    amount: +(totalAmount * s.percent).toFixed(2),
                })),
            };
        })();

        return {
            clientName: header.ph_cname || '',
            tin: header.ph_TIN || 'N/A',
            address: address || 'N/A',
            projectLocation: location || 'N/A',
            natureOfPayment: header.aop_nature || '',
            assessmentDate: header.aop_date,
            controlNo: header.aop_control,
            totalAmount,
            remarks: header.aop_remarks || '',
            preparedBy,
            shareBreakdown,
            items: (details || []).map((item) => ({
                item: item.aop_item,
                volume: item.aop_volume,
                measurement: item.aop_measure,
                charge: item.aop_charge,
                total: item.aop_total,
                volumeLocked: (item.aop_measure || '').toLowerCase() === 'n/a',
            })),
        };
    };

    const handlePreview = async (detail) => {
        if (!detail?.aop_control) return;
        try {
            setPreviewLoading(detail.aop_control);
            const data = await api.getAssessmentByControl(detail.aop_control);
            const previewData = buildPreviewData(data.header, data.details);
            const isGovShare = (previewData.natureOfPayment || '')
                .toLowerCase()
                .includes('government share');
            navigate(isGovShare ? '/assessment/share' : '/assessment/preview', {
                state: { previewData },
            });
        } catch (err) {
            setError(err.message || 'Failed to load assessment preview');
            setTimeout(() => setError(''), 3000);
        } finally {
            setPreviewLoading('');
        }
    };

    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const clearClient = () => {
        setSelectedClientId('');
        setSelectedClient(null);
        setClientSearch('');
        setTransactions([]);
        setAllTransactions([]);
        setError('');
        setNatureOfPayment('');
        setNatureOptions([]);
        setSearchTerm('');
        setShowClientSuggestions(false);
        sessionStorage.removeItem('client_transactions_selected_client_id');
    };

    const handleNatureChange = (e) => {
        const val = e.target.value;
        setNatureOfPayment(val);
        setSearchTerm('');
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setNatureOfPayment('');
    };

    useEffect(() => {
        if (natureOfPayment) {
            const filtered = allTransactions.filter(
                (tx) => (tx.aop_nature || '').trim() === natureOfPayment
            );
            setTransactions(filtered);
        } else if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            const filtered = allTransactions.filter((tx) => {
                const item = (tx.aop_item || '').toLowerCase();
                const control = (tx.aop_control || '').toString().toLowerCase();
                const orNo = (tx.aop_orno || '').toString().toLowerCase();
                const remarks = (tx.aop_remarks || '').toLowerCase();
                const volume = (tx.aop_volume || '').toString().toLowerCase();
                const chargeRaw = (tx.aop_charge || '').toString().toLowerCase();
                const totalRaw = (tx.aop_total || '').toString().toLowerCase();
                const chargeFormatted = parseFloat(tx.aop_charge || 0)
                    .toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })
                    .toLowerCase();
                const totalFormatted = parseFloat(tx.aop_total || 0)
                    .toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })
                    .toLowerCase();
                const nature = (tx.aop_nature || '').toLowerCase();

                let dateStr = '';
                if (tx.aop_ordate) {
                    const dateObj = new Date(tx.aop_ordate);
                    if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj
                            .toLocaleDateString('en-US', {
                                timeZone: 'Asia/Manila',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            })
                            .toLowerCase();
                    }
                }

                return (
                    item.includes(q) ||
                    control.includes(q) ||
                    orNo.includes(q) ||
                    remarks.includes(q) ||
                    volume.includes(q) ||
                    chargeRaw.includes(q) ||
                    chargeFormatted.includes(q) ||
                    totalRaw.includes(q) ||
                    totalFormatted.includes(q) ||
                    nature.includes(q) ||
                    dateStr.includes(q)
                );
            });
            setTransactions(filtered);
        } else {
            setTransactions(allTransactions);
        }
    }, [natureOfPayment, searchTerm, allTransactions]);

    const getFullAddress = (client) => {
        if (!client) return '';
        return (client.ph_address1 || '') + (client.ph_address2 ? ', ' + client.ph_address2 : '');
    };

    const handleDeleteClick = (detail) => {
        setDetailToDelete(detail);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!detailToDelete) return;
        try {
            await api.deleteTransactionDetail(detailToDelete.aop_control);
            setSuccess('Transaction deleted successfully');
            setIsDeleteModalOpen(false);
            setDetailToDelete(null);
            // Refresh the transactions
            if (selectedClientId) {
                const details = await api.getTransactionDetails(selectedClientId);
                setAllTransactions(details);
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div className="transactions-page">
            <div className="page-header">
                <div className="page-title-section">
                    <img
                        src={plenroLogo}
                        alt="PLENRO Logo"
                        className="page-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h2 className="page-title">Client Transactions</h2>
                </div>
            </div>

            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div
                    className="transactions-compact-form"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
                >
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Client</label>
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="transactions-compact-input"
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
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Address</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={getFullAddress(selectedClient)}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group" style={{ minWidth: '200px' }}>
                        <label className="transactions-compact-label">TIN</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_TIN || ''}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group" style={{ minWidth: '200px' }}>
                        <label className="transactions-compact-label">Contact</label>
                        <input
                            type="text"
                            className="transactions-compact-input"
                            value={selectedClient?.ph_contact || ''}
                            readOnly
                        />
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Nature of Payment</label>
                        <select
                            className="transactions-compact-input"
                            value={natureOfPayment}
                            onChange={handleNatureChange}
                            disabled={!selectedClientId}
                        >
                            <option value="">-- Select Nature --</option>
                            {natureOptions.map((option) => (
                                <option
                                    key={option.aop_nature || option}
                                    value={option.aop_nature || option}
                                >
                                    {option.aop_nature || option}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Search Details / Item</label>
                        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                            <input
                                type="text"
                                className="transactions-compact-input"
                                value={searchTerm}
                                placeholder={selectedClientId ? "Search details or item..." : "Select client first"}
                                onChange={handleSearchChange}
                                disabled={!selectedClientId}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        height: '100%',
                                        aspectRatio: '1',
                                    }}
                                    onClick={() => setSearchTerm('')}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {success && (
                <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    {success}
                </div>
            )}

            <div className="transactions-grid-section">
                {selectedClientId ? (
                    loading ? (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center' }}
                        >
                            <div className="spinner"></div> Loading details...
                        </div>
                    ) : transactions.length > 0 ? (
                        <div
                            className="table-container"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                maxHeight: 'none',
                                overflowY: 'auto',
                            }}
                        >
                            <table>
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Control No.
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            O.R. No.
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            O.R. Date
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Item
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Volume/Unit
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'right',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Charge
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'right',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Amount
                                        </th>
                                        <th
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Remarks
                                        </th>
                                        <th
                                            style={{
                                                width: permissions.canDelete ? '80px' : '50px',
                                                textAlign: 'center',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                backgroundColor: 'var(--secondary)',
                                            }}
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((detail, index) => {
                                        const dateObj = new Date(detail.aop_ordate);
                                        const dateStr = dateObj.toLocaleDateString('en-US', {
                                            timeZone: 'Asia/Manila',
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        });
                                        const charge = parseFloat(
                                            detail.aop_charge || 0
                                        ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        });
                                        const total = parseFloat(
                                            detail.aop_total || 0
                                        ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        });

                                        return (
                                            <tr key={detail.aop_ctrlno || index}>
                                                <td>{detail.aop_control}</td>
                                                <td>{detail.aop_orno}</td>
                                                <td>{dateStr}</td>
                                                <td>{detail.aop_item}</td>
                                                <td>{detail.aop_volume}</td>
                                                <td
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {charge}
                                                </td>
                                                <td
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {total}
                                                </td>
                                                <td>{detail.aop_remarks}</td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <div
                                                        style={{
                                                            display: 'inline-flex',
                                                            gap: '4px',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <button
                                                            className="btn-view"
                                                            title="Preview Assessment"
                                                            onClick={() => handlePreview(detail)}
                                                            disabled={previewLoading === detail.aop_control}
                                                        >
                                                            {previewLoading === detail.aop_control ? (
                                                                <span
                                                                    className="spinner spinner-sm"
                                                                    style={{ width: '12px', height: '12px' }}
                                                                />
                                                            ) : (
                                                                <FiEye className="icon-sm" />
                                                            )}
                                                        </button>
                                                        {permissions.canDelete && (
                                                            <button
                                                                className="btn-delete"
                                                                title="Delete"
                                                                onClick={() =>
                                                                    handleDeleteClick(detail)
                                                                }
                                                            >
                                                                <FiTrash2 className="icon-sm" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div
                            className="table-container"
                            style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                        >
                            <p>
                                {searchTerm || natureOfPayment
                                    ? 'No transaction details found matching your filter'
                                    : 'No transaction details found for this client'}
                            </p>
                        </div>
                    )
                ) : (
                    <div
                        className="table-container"
                        style={{ padding: '24px', textAlign: 'center', color: '#999' }}
                    >
                        <p>Select a client to view transaction details</p>
                    </div>
                )}
            </div>

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDetailToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
            />
        </div>
    );
};

export default ClientTransactions;
