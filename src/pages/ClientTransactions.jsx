import React, { useState, useEffect, useMemo, useRef } from 'react';

import { createPortal } from 'react-dom';
import { api } from '../services/api';
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

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({});
    const inputRef = useRef(null);

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
                                        <th>Control No.</th>
                                        <th>O.R. No.</th>
                                        <th>O.R. Date</th>
                                        <th>Item</th>
                                        <th>Volume/Unit</th>
                                        <th>Charge</th>
                                        <th>Amount</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((detail, index) => {
                                        const dateObj = new Date(detail.aop_ordate);
                                        const dateStr = dateObj.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        });
                                        const charge = parseFloat(detail.aop_charge || 0).toFixed(
                                            2
                                        );
                                        const total = parseFloat(detail.aop_total || 0).toFixed(2);

                                        return (
                                            <tr key={index}>
                                                <td>{detail.aop_control}</td>
                                                <td>{detail.aop_orno}</td>
                                                <td>{dateStr}</td>
                                                <td>{detail.aop_item}</td>
                                                <td>{detail.aop_volume}</td>
                                                <td>₱ {charge}</td>
                                                <td>₱ {total}</td>
                                                <td>{detail.aop_remarks}</td>
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
        </div>
    );
};

export default ClientTransactions;
