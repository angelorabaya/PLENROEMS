import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import ShipmentModal from '../components/modals/ShipmentModal';

const MAX_ITEMS = 4;

const formatDateInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

const generateControlNo = () => {
    const timestamp = Date.now();
    const randomComponent = Math.floor(Math.random() * 10000);
    const base = (timestamp + randomComponent) % 100000000;
    return `AOP${String(base).padStart(8, '0')}`;
};

const formatMeasurement = (measure = '') => {
    if (!measure) return '';
    const lower = measure.toLowerCase();
    if (lower === 'not applicable') return 'N/A';
    if (measure.includes('-')) {
        return measure.split('-').slice(1).join('-').trim();
    }
    return measure;
};

const createEmptyItem = () => ({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    item: '',
    volume: '',
    measurement: '',
    charge: '',
    total: 0,
    volumeLocked: false,
});

const checkPermitStatus = (permitDate) => {
    if (!permitDate) return '';
    const permit = new Date(permitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    permit.setHours(0, 0, 0, 0);
    return permit >= today ? 'Active' : 'Expired';
};

const computeTotal = (volume, charge, volumeLocked) => {
    const chargeNum = parseFloat(charge);
    if (Number.isNaN(chargeNum)) return 0;
    if (volumeLocked) return chargeNum;
    const volumeNum = parseFloat(volume);
    if (Number.isNaN(volumeNum)) return chargeNum;
    return +(volumeNum * chargeNum).toFixed(2);
};

const Assessment = () => {
    const navigate = useNavigate();
    const { currentUser } = useOutletContext() || {};
    const { theme } = useTheme();
    const [clients, setClients] = useState([]);
    const [natureOptions, setNatureOptions] = useState([]);
    const [paymentDetails, setPaymentDetails] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [vehicleRegistry, setVehicleRegistry] = useState([]);

    const [items, setItems] = useState([createEmptyItem()]);

    const [controlNo, setControlNo] = useState(generateControlNo());
    const [assessmentDate, setAssessmentDate] = useState(formatDateInput(new Date()));
    const [clientId, setClientId] = useState('');
    const [nature, setNature] = useState('');
    const [apprehended, setApprehended] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [barangay, setBarangay] = useState('');
    const [barangay2, setBarangay2] = useState('');
    const [address, setAddress] = useState('');
    const [tin, setTin] = useState('');
    const [permitNo, setPermitNo] = useState('');
    const [permitStatus, setPermitStatus] = useState('');
    const [locationLocked, setLocationLocked] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [shipmentEntry, setShipmentEntry] = useState('');

    const [loading, setLoading] = useState({
        clients: false,
        nature: false,
        municipalities: false,
        barangays: false,
        submitting: false,
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
    const [shipmentRowIndex, setShipmentRowIndex] = useState(null);

    // Client autocomplete state
    const [clientSearch, setClientSearch] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number.isFinite(item.total) ? item.total : 0), 0);
    }, [items]);

    const apprehendedEnabled = (nature || '').toLowerCase().includes('fines');
    const shipmentNature = (nature || '').toLowerCase().includes('shipment');

    useEffect(() => {
        loadClients();
        loadNatureOptions();
        loadMunicipalities();
        loadVehicleRegistry();
    }, []);

    useEffect(() => {
        if (!nature || !nature.toUpperCase().includes('MGB')) return;
        const autoRemark = `Provincial Share 30% of total amount (${totalAmount.toFixed(2)}x.30=${(totalAmount * 0.3).toFixed(2)})`;
        setRemarks((prev) => {
            if (prev && !prev.toLowerCase().includes('provincial share')) return prev;
            return autoRemark;
        });
    }, [nature, totalAmount]);

    const transientMessage = (setter, message) => {
        setter(message);
        setTimeout(() => setter(''), 3500);
    };

    const loadClients = async () => {
        setLoading((prev) => ({ ...prev, clients: true }));
        try {
            const data = await api.getAssessmentClients();
            data.sort((a, b) => (a.ph_cname || '').localeCompare(b.ph_cname || ''));
            setClients(data);
        } catch (err) {
            transientMessage(setError, err.message);
        } finally {
            setLoading((prev) => ({ ...prev, clients: false }));
        }
    };

    const loadNatureOptions = async () => {
        setLoading((prev) => ({ ...prev, nature: true }));
        try {
            const data = await api.getNatureOfPayments();
            setNatureOptions(data);
        } catch (err) {
            transientMessage(setError, err.message);
        } finally {
            setLoading((prev) => ({ ...prev, nature: false }));
        }
    };

    const loadPaymentDetails = async (np_ctrlno) => {
        if (!np_ctrlno) {
            setPaymentDetails([]);
            return;
        }
        try {
            const data = await api.getNatureOfPaymentDetails(np_ctrlno);
            setPaymentDetails(data);
        } catch (err) {
            setPaymentDetails([]);
            transientMessage(setError, err.message);
        }
    };

    const loadMunicipalities = async () => {
        setLoading((prev) => ({ ...prev, municipalities: true }));
        try {
            const data = await api.getMunicipalities();
            setMunicipalities(data);
        } catch (err) {
            transientMessage(setError, err.message);
        } finally {
            setLoading((prev) => ({ ...prev, municipalities: false }));
        }
    };

    const loadBarangays = async (mun, preselectValue = '', lock = false) => {
        setLoading((prev) => ({ ...prev, barangays: true }));
        try {
            if (!mun) {
                setBarangays([]);
                setBarangay('');
                setLocationLocked(lock);
                return;
            }
            const data = await api.getBarangays(mun);
            setBarangays(data);
            if (preselectValue) {
                setBarangay(preselectValue);
            }
        } catch (err) {
            transientMessage(setError, err.message);
        } finally {
            setLoading((prev) => ({ ...prev, barangays: false }));
            setLocationLocked(lock);
        }
    };

    const loadVehicleRegistry = async () => {
        try {
            const data = await api.getVehicleRegistry();
            setVehicleRegistry(data);
        } catch (err) {
            transientMessage(setError, err.message);
        }
    };

    const resetForm = () => {
        setControlNo(generateControlNo());
        setAssessmentDate(formatDateInput(new Date()));
        setClientId('');
        setClientSearch('');
        setNature('');
        setPaymentDetails([]);
        setApprehended('');
        setMunicipality('');
        setBarangay('');
        setBarangays([]);
        setBarangay2('');
        setAddress('');
        setTin('');
        setPermitNo('');
        setPermitStatus('');
        setLocationLocked(false);
        setRemarks('');
        setShipmentEntry('');
        setItems([createEmptyItem()]);
        setShipmentModalOpen(false);
        setShipmentRowIndex(null);
        setShowClientSuggestions(false);
    };

    // Client suggestions based on search
    const clientSuggestions = useMemo(() => {
        const query = (clientSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients.filter((c) => (c.ph_cname || '').toLowerCase().includes(query)).slice(0, 10);
    }, [clientSearch, clients]);

    const selectClient = (ctrlno) => {
        setClientId(String(ctrlno));
        const client = clients.find((c) => String(c.ph_ctrlno) === String(ctrlno));
        if (client) {
            setClientSearch(client.ph_cname || '');
            const composedAddress = [client.ph_address1, client.ph_address2]
                .filter(Boolean)
                .join(', ');
            setAddress(composedAddress);
            setTin(client.ph_TIN || '');
            setPermitNo(client.ph_permitno || '');
            const status = checkPermitStatus(client.ph_dto);
            setPermitStatus(status);
            const muni = client.ph_mun || '';
            const brgy = client.ph_brgy || '';
            setMunicipality(muni);
            setBarangay2(client.ph_brgy2 || '');
            const shouldLock = status === 'Active' && muni && brgy;
            loadBarangays(muni, brgy, shouldLock);
        }
        setShowClientSuggestions(false);
    };

    const clearClient = () => {
        setClientId('');
        setClientSearch('');
        setAddress('');
        setTin('');
        setPermitNo('');
        setPermitStatus('');
        setMunicipality('');
        setBarangay('');
        setBarangay2('');
        setLocationLocked(false);
        setBarangays([]);
    };

    const handleClientChange = (e) => {
        const value = e.target.value;
        setClientId(value);
        if (!value) {
            setAddress('');
            setTin('');
            setPermitNo('');
            setPermitStatus('');
            setMunicipality('');
            setBarangay('');
            setBarangay2('');
            setLocationLocked(false);
            setBarangays([]);
            return;
        }

        const client = clients.find((c) => String(c.ph_ctrlno) === value);
        const composedAddress = [client?.ph_address1, client?.ph_address2]
            .filter(Boolean)
            .join(', ');
        setAddress(composedAddress);
        setTin(client?.ph_TIN || '');
        setPermitNo(client?.ph_permitno || '');
        const status = checkPermitStatus(client?.ph_dto);
        setPermitStatus(status);
        const muni = client?.ph_mun || '';
        const brgy = client?.ph_brgy || '';
        setMunicipality(muni);
        setBarangay2(client?.ph_brgy2 || '');
        const shouldLock = status === 'Active' && muni && brgy;
        loadBarangays(muni, brgy, shouldLock);
    };

    const handleMunicipalityChange = (e) => {
        const mun = e.target.value;
        setMunicipality(mun);
        setBarangay('');
        setLocationLocked(false);
        loadBarangays(mun);
    };

    const handleNatureChange = (e) => {
        const value = e.target.value;
        setNature(value);
        setApprehended('');
        setRemarks('');
        setItems([createEmptyItem()]);
        const selectedOption = natureOptions.find((n) => n.np_desc === value);
        setPaymentDetails([]);
        loadPaymentDetails(selectedOption?.np_ctrlno);
    };

    const handleApprehendedChange = (value) => {
        setApprehended(value);
        if (value) {
            setRemarks(`Apprehended at ${value}, Misamis Oriental.`);
        } else {
            setRemarks('');
        }
    };

    const handleItemSelection = (id, value) => {
        const detail = paymentDetails.find((d) => d.np_desc === value);
        const charge = detail ? parseFloat(detail.np_unitcharge || 0) : '';
        const measurement = detail ? formatMeasurement(detail.np_measure || '') : '';
        const volumeLocked = detail
            ? (detail.np_measure || '').toLowerCase() === 'not applicable'
            : false;

        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const total = computeTotal(item.volume, charge, volumeLocked);
                return {
                    ...item,
                    item: value,
                    measurement,
                    charge: charge === '' ? '' : charge.toFixed(2),
                    volume: volumeLocked ? '' : item.volume,
                    volumeLocked,
                    total,
                };
            })
        );

        if (value && shipmentNature) {
            const rowIndex = items.findIndex((row) => row.id === id);
            openShipmentModal(rowIndex);
        }
    };

    const handleVolumeChange = (id, value) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const total = computeTotal(value, item.charge, item.volumeLocked);
                return { ...item, volume: value, total };
            })
        );
    };

    const handleChargeChange = (id, value) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const total = computeTotal(item.volume, value, item.volumeLocked);
                return { ...item, charge: value, total };
            })
        );
    };

    const handleAddItem = () => {
        if (items.length >= MAX_ITEMS) {
            transientMessage(setError, `You can only add up to ${MAX_ITEMS} items`);
            return;
        }
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const handleRemoveItem = (id) => {
        if (items.length === 1) {
            setItems([createEmptyItem()]);
            return;
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const openShipmentModal = (rowIndex) => {
        setShipmentRowIndex(rowIndex);
        setShipmentModalOpen(true);
    };

    const closeShipmentModal = () => {
        setShipmentModalOpen(false);
        setShipmentRowIndex(null);
    };

    const handleShipmentSubmit = (shipmentData) => {
        // Map fields from ShipmentModal to Assessment expected fields
        const truckCapacity = Number(shipmentData.truckCapacity) || 0;
        const tripCount = Number(shipmentData.tripCount) || 0;
        const pointOfEntry = shipmentData.pointOfEntry || '';
        const plateObjs = shipmentData.plates || [];
        // plates is now array of objects { plateNo, ... }
        const plates = plateObjs.map((p) => p.plateNo);

        if (shipmentRowIndex === null || shipmentRowIndex >= items.length) {
            closeShipmentModal();
            return;
        }

        const computedVolume = +(truckCapacity * tripCount).toFixed(2);
        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== shipmentRowIndex) return item;
                const total = computeTotal(computedVolume, item.charge, item.volumeLocked);
                return { ...item, volume: computedVolume, total };
            })
        );

        const plateList = plates.length > 0 ? plates.join(', ') : 'No Plate';
        const baseRemarks = `(${tripCount} Trip(s)) {${plateList}} (P-Entry: ${pointOfEntry})`;
        const shipmentNote =
            'Shipment fee for Aggregates - Going Out the Province per SP Ordinance No. 1571-2022 Section 36-O';
        const finalRemarks = nature.toLowerCase().includes('out')
            ? `${shipmentNote} ${baseRemarks}`
            : baseRemarks;
        setRemarks(finalRemarks);
        setShipmentEntry(pointOfEntry);
        closeShipmentModal();
    };

    const buildPreviewData = (validItems) => {
        const client = clients.find((c) => String(c.ph_ctrlno) === clientId);
        const barangayText =
            [barangay, barangay2].filter(Boolean).join('/') || barangay || barangay2 || '';
        const location = [barangayText, municipality].filter(Boolean).join(', ');
        const preparedBy = (
            currentUser?.log_cname ||
            currentUser?.log_name ||
            'ADMINISTRATOR'
        ).toUpperCase();
        const natureLower = (nature || '').toLowerCase();
        const isGovShare = natureLower.includes('government share');
        const shareBreakdown = (() => {
            if (!isGovShare) return null;
            const total = Number(totalAmount) || 0;
            const shares = [
                { label: 'Prov. of Misamis Oriental', percent: 0.3 },
                { label: municipality ? `Mun. of ${municipality}` : 'Municipality', percent: 0.3 },
                { label: barangayText ? `Brgy. of ${barangayText}` : 'Barangay', percent: 0.4 },
            ];
            return {
                total,
                shares: shares.map((s) => ({
                    ...s,
                    amount: +(total * s.percent).toFixed(2),
                })),
            };
        })();
        return {
            clientName: client?.ph_cname || '',
            tin: tin || 'N/A',
            address: address || 'N/A',
            projectLocation: location || 'N/A',
            natureOfPayment: nature || '',
            assessmentDate,
            controlNo,
            totalAmount,
            remarks,
            shareBreakdown,
            preparedBy,
            items: validItems.map((item) => ({
                item: item.item,
                volume: item.volume,
                measurement: item.measurement,
                charge: item.charge,
                total: item.total,
                volumeLocked: item.volumeLocked,
            })),
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!controlNo || !clientId || !assessmentDate || !nature) {
            transientMessage(
                setError,
                'Control No., client, date, and nature of payment are required'
            );
            return;
        }

        const validItems = items.filter((item) => {
            const hasItem = item.item && item.item.trim() !== '';
            const hasValue =
                !Number.isNaN(parseFloat(item.volume)) || !Number.isNaN(parseFloat(item.charge));
            return hasItem && hasValue;
        });

        if (validItems.length === 0) {
            transientMessage(setError, 'Please add at least one item with values');
            return;
        }

        const pentryMatch = remarks.match(/P-Entry:\s*([^)]+)\)/i);
        const pentryValue = shipmentEntry || (pentryMatch ? pentryMatch[1].trim() : '');

        const payload = {
            aop_control: controlNo,
            aop_clientid: parseInt(clientId, 10),
            aop_date: assessmentDate,
            aop_nature: nature,
            aop_mun: municipality || '',
            aop_brgy: barangay || '',
            aop_remarks: remarks || '',
            aop_amount: totalAmount,
            aop_total: totalAmount,
            aop_apploc: apprehended || '',
            aop_req: '',
            aop_pentry: pentryValue || '',
            items: validItems.map((item) => ({
                aop_item: item.item,
                aop_volume: Number.isNaN(parseFloat(item.volume)) ? 0 : parseInt(item.volume, 10),
                aop_charge: Number.isNaN(parseFloat(item.charge)) ? 0 : parseFloat(item.charge),
                aop_total: Number.isNaN(parseFloat(item.total)) ? 0 : parseFloat(item.total),
                aop_measure: item.measurement || '',
                aop_permitno: permitNo || '',
            })),
        };

        const previewData = buildPreviewData(validItems);

        setLoading((prev) => ({ ...prev, submitting: true }));
        try {
            await api.createAssessment(payload);
            resetForm();
            const isGovShare = (nature || '').toLowerCase().includes('government share');
            navigate(isGovShare ? '/assessment/share' : '/assessment/preview', {
                state: { previewData },
            });
        } catch (err) {
            transientMessage(setError, err.message);
        } finally {
            setLoading((prev) => ({ ...prev, submitting: false }));
        }
    };

    const formatMoney = (value) => `₱ ${(Number.isFinite(value) ? value : 0).toFixed(2)}`;

    return (
        <div className="assessment-page">
            <div className="page-header">
                <div className="page-title-section">
                    <img
                        src={plenroLogo}
                        alt="PLENRO Logo"
                        className="page-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h2 className="page-title">Assessment of Payment</h2>
                </div>
                <div className="header-actions">
                    <span className="assessment-chip">Control No. {controlNo}</span>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                        Reset Form
                    </button>
                </div>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form className="assessment-grid" onSubmit={handleSubmit}>
                <div className="assessment-card">
                    <div className="assessment-card-header">
                        <h3>Client Information</h3>
                        {loading.clients && (
                            <span className="assessment-slim-text">Loading clients…</span>
                        )}
                    </div>
                    <div className="assessment-row">
                        <div className="assessment-field">
                            <label>Control No.</label>
                            <input className="assessment-input" value={controlNo} readOnly />
                        </div>
                        <div className="assessment-field" style={{ position: 'relative' }}>
                            <label>Client</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input
                                    className="assessment-input"
                                    type="text"
                                    value={clientSearch}
                                    placeholder="Type to search client..."
                                    style={{ flex: 1 }}
                                    onFocus={() => setShowClientSuggestions(!!clientSearch)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setClientSearch(val);
                                        setShowClientSuggestions(!!val);
                                        if (!val) clearClient();
                                    }}
                                />
                                {clientId && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            height: '30px',
                                            minWidth: '30px',
                                            flexShrink: 0,
                                        }}
                                        onClick={clearClient}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {clientSuggestions.length > 0 && showClientSuggestions && (
                                <ul
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 20,
                                        background: theme === 'light' ? '#ffffff' : '#1c1c1e',
                                        border:
                                            theme === 'light'
                                                ? '1px solid #e4e4e7'
                                                : '1px solid #27272a',
                                        color: theme === 'light' ? '#09090b' : '#fafafa',
                                        borderRadius: '6px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        margin: '4px 0 0 0',
                                        padding: 0,
                                        listStyle: 'none',
                                        boxShadow:
                                            theme === 'light'
                                                ? '0 4px 12px rgba(0,0,0,0.1)'
                                                : '0 4px 12px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    {clientSuggestions.map((c) => (
                                        <li
                                            key={c.ph_ctrlno}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                borderBottom:
                                                    theme === 'light'
                                                        ? '1px solid #e4e4e7'
                                                        : '1px solid #27272a',
                                                color: theme === 'light' ? '#09090b' : '#fafafa',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.target.style.background =
                                                    theme === 'light' ? '#f4f4f5' : '#27272a')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.target.style.background = 'transparent')
                                            }
                                            onClick={() => selectClient(c.ph_ctrlno)}
                                        >
                                            {c.ph_cname}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="assessment-field">
                            <label>Address</label>
                            <input className="assessment-input" value={address} readOnly />
                        </div>
                        <div className="assessment-field">
                            <label>TIN</label>
                            <input className="assessment-input" value={tin} readOnly />
                        </div>
                        <div className="assessment-field">
                            <label>Permit No.</label>
                            <div className="assessment-inline">
                                <input className="assessment-input" value={permitNo} readOnly />
                                {permitStatus && (
                                    <span
                                        className={`status-badge ${permitStatus === 'Active' ? 'status-active' : 'status-expired'}`}
                                    >
                                        {permitStatus}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="assessment-card">
                    <div className="assessment-card-header">
                        <h3>Assessment Details</h3>
                        {loading.nature && (
                            <span className="assessment-slim-text">Loading options…</span>
                        )}
                    </div>
                    <div className="assessment-row">
                        <div className="assessment-field">
                            <label>Date</label>
                            <input
                                type="date"
                                className="assessment-input"
                                value={assessmentDate}
                                onChange={(e) => setAssessmentDate(e.target.value)}
                            />
                        </div>
                        <div className="assessment-field">
                            <label>Nature of Payment</label>
                            <select
                                className="assessment-select"
                                value={nature}
                                onChange={handleNatureChange}
                            >
                                <option value="">-- Select Nature --</option>
                                {natureOptions.map((opt) => (
                                    <option key={opt.np_ctrlno} value={opt.np_desc}>
                                        {opt.np_desc}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="assessment-field">
                            <label>Apprehended</label>
                            <select
                                className="assessment-select"
                                value={apprehended}
                                onChange={(e) => handleApprehendedChange(e.target.value)}
                                disabled={!apprehendedEnabled}
                            >
                                <option value="">-- Select Municipality --</option>
                                {municipalities.map((mun) => (
                                    <option key={mun.mun_name} value={mun.mun_name}>
                                        {mun.mun_name}
                                    </option>
                                ))}
                            </select>
                            {!apprehendedEnabled && (
                                <div className="assessment-slim-text">
                                    Enabled when nature includes fines
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="assessment-card">
                    <div className="assessment-card-header">
                        <h3>Project Location</h3>
                        {loading.municipalities && (
                            <span className="assessment-slim-text">Loading municipalities…</span>
                        )}
                    </div>
                    <div className="assessment-row">
                        <div className="assessment-field">
                            <label>Municipality</label>
                            <select
                                className="assessment-select"
                                value={municipality}
                                onChange={handleMunicipalityChange}
                                disabled={locationLocked}
                            >
                                <option value="">-- Select Municipality --</option>
                                {municipalities.map((mun) => (
                                    <option key={mun.mun_name} value={mun.mun_name}>
                                        {mun.mun_name}
                                    </option>
                                ))}
                            </select>
                            {locationLocked && (
                                <div className="assessment-slim-text">
                                    Locked from permit details
                                </div>
                            )}
                        </div>
                        <div className="assessment-field">
                            <label>Barangay</label>
                            <select
                                className="assessment-select"
                                value={barangay}
                                onChange={(e) => setBarangay(e.target.value)}
                                disabled={locationLocked || !municipality || loading.barangays}
                            >
                                <option value="">-- Select Barangay --</option>
                                {barangays.map((bg) => (
                                    <option key={bg.mun_brgy || bg} value={bg.mun_brgy || bg}>
                                        {bg.mun_brgy || bg}
                                    </option>
                                ))}
                            </select>
                            {loading.barangays && (
                                <div className="assessment-slim-text">Loading barangays…</div>
                            )}
                        </div>
                        <div className="assessment-field">
                            <label>Second Barangay</label>
                            <input className="assessment-input" value={barangay2} readOnly />
                        </div>
                    </div>
                </div>

                <div className="assessment-card assessment-items">
                    <div className="assessment-card-header">
                        <h3>Items Payable</h3>
                        <span className="assessment-slim-text">Up to {MAX_ITEMS} items</span>
                    </div>
                    <div className="assessment-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Volume/Unit</th>
                                    <th>Measurement</th>
                                    <th>Charge</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <select
                                                className="assessment-select"
                                                value={row.item}
                                                onChange={(e) =>
                                                    handleItemSelection(row.id, e.target.value)
                                                }
                                            >
                                                <option value="">-- Select Item --</option>
                                                {paymentDetails.map((detail) => (
                                                    <option
                                                        key={detail.np_desc}
                                                        value={detail.np_desc}
                                                    >
                                                        {detail.np_desc}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="assessment-input"
                                                value={row.volume}
                                                onChange={(e) =>
                                                    handleVolumeChange(row.id, e.target.value)
                                                }
                                                placeholder="0"
                                                step="0.01"
                                                disabled={row.volumeLocked}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="assessment-input"
                                                value={row.measurement}
                                                readOnly
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="assessment-input"
                                                value={row.charge}
                                                onChange={(e) =>
                                                    handleChargeChange(row.id, e.target.value)
                                                }
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="assessment-input"
                                                value={(Number.isFinite(row.total)
                                                    ? row.total
                                                    : 0
                                                ).toFixed(2)}
                                                readOnly
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleRemoveItem(row.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="assessment-add">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleAddItem}
                            disabled={items.length >= MAX_ITEMS}
                        >
                            + Add Item
                        </button>
                    </div>
                    <div className="assessment-total">
                        <span>Total Amount</span>
                        <span className="assessment-total-figure">{formatMoney(totalAmount)}</span>
                    </div>
                </div>

                <div className="assessment-card">
                    <div className="assessment-card-header">
                        <h3>Additional Information</h3>
                    </div>
                    <div className="assessment-row">
                        <div className="assessment-field full-width">
                            <label>Remarks</label>
                            <textarea
                                className="assessment-textarea"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any additional remarks..."
                            />
                        </div>
                    </div>
                </div>

                <div className="assessment-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading.submitting}>
                        {loading.submitting ? 'Saving...' : 'Save Assessment'}
                    </button>
                </div>
            </form>

            <ShipmentModal
                isOpen={shipmentModalOpen}
                onClose={closeShipmentModal}
                onSubmit={handleShipmentSubmit}
                vehicleRegistry={vehicleRegistry}
            />
        </div>
    );
};

export default Assessment;
