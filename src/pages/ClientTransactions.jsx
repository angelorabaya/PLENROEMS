import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import plenroLogo from '../plenro.png';

const ClientTransactions = () => {
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [natureOfPayment, setNatureOfPayment] = useState('');
    const [natureOptions, setNatureOptions] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [detailToDelete, setDetailToDelete] = useState(null);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

    // Admin check
    const { currentUser } = useOutletContext();
    const isAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase() || '';
        const username = currentUser.log_user?.toLowerCase()?.trim() || '';
        const access = currentUser.log_access;
        return role === 'admin' || username === 'admin' || access == 1;
    }, [currentUser]);

    useEffect(() => {
        fetchTransactionClients();
    }, []);

    const fetchTransactionClients = async () => {
        try {
            const data = await api.getTransactionClients();
            setClients(data);
        } catch (err) {
            setError('Failed to fetch transaction clients: ' + err.message);
        }
    };

    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const selectClient = async (clientId) => {
        setSelectedClientId(clientId);
        setTransactions([]);
        setAllTransactions([]);
        setError('');
        setNatureOfPayment('');
        setNatureOptions([]);
        setShowClientSuggestions(false);

        if (!clientId) {
            setSelectedClient(null);
            setClientSearch('');
            return;
        }

        const client = clients.find((c) => c.ph_ctrlno == clientId);
        setSelectedClient(client);
        setClientSearch(client?.ph_cname || '');

        setLoading(true);
        try {
            const [details, natures] = await Promise.all([
                api.getTransactionDetails(clientId),
                api.getNatureOfPayment(clientId),
            ]);
            setAllTransactions(details);
            setTransactions(details);
            setNatureOptions(natures || []);
        } catch (err) {
            setError('Failed to fetch assessment details: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearClient = () => {
        setSelectedClientId('');
        setSelectedClient(null);
        setClientSearch('');
        setTransactions([]);
        setAllTransactions([]);
        setError('');
        setNatureOfPayment('');
        setNatureOptions([]);

        setShowClientSuggestions(false);
    };

    useEffect(() => {
        if (!natureOfPayment) {
            setTransactions(allTransactions);
        } else {
            const filtered = allTransactions.filter(
                (tx) => (tx.aop_nature || '').trim() === natureOfPayment
            );
            setTransactions(filtered);
        }
    }, [natureOfPayment, allTransactions]);

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
                setTransactions(
                    natureOfPayment
                        ? details.filter((tx) => (tx.aop_nature || '').trim() === natureOfPayment)
                        : details
                );
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
                            onChange={(e) => setNatureOfPayment(e.target.value)}
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
                                        {isAdmin && (
                                            <th
                                                style={{
                                                    width: '60px',
                                                    textAlign: 'center',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 10,
                                                    backgroundColor: 'var(--secondary)',
                                                }}
                                            >
                                                Actions
                                            </th>
                                        )}
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
                                                {isAdmin && (
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="btn-delete"
                                                            title="Delete"
                                                            onClick={() =>
                                                                handleDeleteClick(detail)
                                                            }
                                                        >
                                                            <FiTrash2 className="icon-sm" />
                                                        </button>
                                                    </td>
                                                )}
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
                            <p>No transaction details found for this client</p>
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
