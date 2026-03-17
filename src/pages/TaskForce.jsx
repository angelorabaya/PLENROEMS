import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiCheck, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import DuplicateDRModal from '../components/modals/DuplicateDRModal';
import { useTheme } from '../context/ThemeContext';
import { getTodayPHT } from '../utils/dateUtils';
import '../styles/global.css';

const TaskForce = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Header state
    const [municipalities, setMunicipalities] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => getTodayPHT());

    // Records state
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Inline editing state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newRecord, setNewRecord] = useState({
        tf_checker: '',
        tf_dr: '',
        tf_destination: '',
        tf_plateno: '',
        tf_commodity: '',
        tf_volume: '14',
        tf_name: '',
        tf_remarks: '',
        tf_apprehended: false,
    });

    // Destination autocomplete state
    const [destSearch, setDestSearch] = useState('');
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);
    const [destHighlightIndex, setDestHighlightIndex] = useState(0);
    const [destDropdownPosition, setDestDropdownPosition] = useState({});
    const destInputRef = useRef(null);
    const editDestInputRef = useRef(null);

    // Plate autocomplete state
    const [vehicleRegistry, setVehicleRegistry] = useState([]);
    const [plateSearch, setPlateSearch] = useState('');
    const [showPlateSuggestions, setShowPlateSuggestions] = useState(false);
    const [plateHighlightIndex, setPlateHighlightIndex] = useState(0);
    const [plateDropdownPosition, setPlateDropdownPosition] = useState({});
    const plateInputRef = useRef(null);
    const editPlateInputRef = useRef(null);

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingRecord, setDeletingRecord] = useState(null);

    // Duplicate DR modal state
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateData, setDuplicateData] = useState(null);

    // Commodity state
    const [commodities, setCommodities] = useState([]);

    // Client/Name autocomplete state
    const [clients, setClients] = useState([]);
    const [nameSearch, setNameSearch] = useState('');
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    const [nameHighlightIndex, setNameHighlightIndex] = useState(0);
    const [nameDropdownPosition, setNameDropdownPosition] = useState({});
    const nameInputRef = useRef(null);
    const editNameInputRef = useRef(null);

    // DR validation state: null = not validated, true = valid, false = invalid
    const [drValidationStatus, setDrValidationStatus] = useState(null);

    // Checker autocomplete state
    const [checkers, setCheckers] = useState([]);
    const [checkerSearch, setCheckerSearch] = useState('');
    const [showCheckerSuggestions, setShowCheckerSuggestions] = useState(false);
    const [checkerHighlightIndex, setCheckerHighlightIndex] = useState(0);
    const [checkerDropdownPosition, setCheckerDropdownPosition] = useState({});
    const checkerInputRef = useRef(null);
    const editCheckerInputRef = useRef(null);

    // Fetch municipalities, vehicle registry, commodities, clients, and checkers on mount
    useEffect(() => {
        fetchMunicipalities();
        fetchVehicleRegistry();
        fetchCommodities();
        fetchClients();
        fetchCheckers();
    }, []);

    // Fetch records when area or date changes
    useEffect(() => {
        if (selectedArea && selectedDate) {
            fetchRecords();
        } else {
            setRecords([]);
        }
    }, [selectedArea, selectedDate]);

    const fetchMunicipalities = async () => {
        try {
            const data = await api.getTaskforceMunicipalities();
            setMunicipalities(data);
        } catch (err) {
            setError('Failed to fetch municipalities: ' + err.message);
        }
    };

    const fetchVehicleRegistry = async () => {
        try {
            const data = await api.getVehicleRegistry();
            setVehicleRegistry(data || []);
        } catch (err) {
            console.error('Failed to fetch vehicle registry:', err);
        }
    };

    const fetchCommodities = async () => {
        try {
            const data = await api.getTaskforceCommodities();
            setCommodities(data || []);
        } catch (err) {
            console.error('Failed to fetch commodities:', err);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await api.getTaskforceClients();
            setClients(data || []);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        }
    };

    const fetchCheckers = async () => {
        try {
            const data = await api.getTaskforceCheckers();
            setCheckers(data || []);
        } catch (err) {
            console.error('Failed to fetch checkers:', err);
        }
    };

    const fetchRecords = async () => {
        if (!selectedArea || !selectedDate) return;
        setLoading(true);
        try {
            const data = await api.getTaskforceRecords(selectedArea, selectedDate);
            setRecords(data);
        } catch (err) {
            setError('Failed to fetch records: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Destination autocomplete suggestions
    const destSuggestions = useMemo(() => {
        const query = (destSearch || '').trim().toLowerCase();
        if (!query) return [];
        return municipalities
            .filter((m) => (m.mun_name || '').toLowerCase().includes(query))
            .slice(0, 10);
    }, [destSearch, municipalities]);

    // Plate autocomplete suggestions
    const plateSuggestions = useMemo(() => {
        const query = (plateSearch || '').trim().toUpperCase();
        if (!query) return [];
        return vehicleRegistry
            .filter((v) => v.vr_plateno && v.vr_plateno.toUpperCase().includes(query))
            .slice(0, 8);
    }, [plateSearch, vehicleRegistry]);

    // Name autocomplete suggestions
    const nameSuggestions = useMemo(() => {
        const query = (nameSearch || '').trim().toLowerCase();
        if (!query) return [];
        return clients
            .filter((c) => c.ph_cname && c.ph_cname.toLowerCase().includes(query))
            .slice(0, 10);
    }, [nameSearch, clients]);

    // Checker autocomplete suggestions
    const checkerSuggestions = useMemo(() => {
        const query = (checkerSearch || '').trim().toUpperCase();
        if (!query) return [];
        return checkers
            .filter((c) => c.tf_checker && c.tf_checker.toUpperCase().includes(query))
            .slice(0, 10);
    }, [checkerSearch, checkers]);
    const isPlateExpired = (expiryDate) => {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        return expiry < today;
    };

    const updateDropdownPosition = (ref, setter) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setter({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    };

    // Auto-focus checker input when adding new record
    useEffect(() => {
        if (isAdding && checkerInputRef.current) {
            checkerInputRef.current.focus();
        }
    }, [isAdding]);

    // Add record handlers
    const handleAddClick = () => {
        setIsAdding(true);
        setNewRecord({
            tf_checker: '',
            tf_dr: '',
            tf_destination: '',
            tf_plateno: '',
            tf_commodity: '',
            tf_volume: '14',
            tf_name: '',
            tf_remarks: '',
            tf_apprehended: false,
        });
        setDrValidationStatus(null);
    };

    const handleSaveNew = async () => {
        // Prevent saving if DR validation already failed (red)
        if (drValidationStatus === false) {
            setError('Cannot save: Invalid or Duplicate DR Number');
            setTimeout(() => setError(''), 3000);
            return;
        }

        // Additional check: Validate DR is not duplicate before saving
        if (newRecord.tf_dr && newRecord.tf_dr.trim() !== '') {
            try {
                const dupResult = await api.checkTaskforceDuplicateDR(newRecord.tf_dr, null);
                if (dupResult.duplicate) {
                    setDuplicateData(dupResult.record);
                    setIsDuplicateModalOpen(true);
                    setDrValidationStatus(false);
                    return; // Block save
                }
            } catch (err) {
                console.error('Duplicate check on save failed:', err);
            }
        }

        try {
            await api.createTaskforceRecord({
                ...newRecord,
                tf_area: selectedArea,
                tf_date: selectedDate,
                tf_dr: !isNaN(parseInt(newRecord.tf_dr, 10)) ? parseInt(newRecord.tf_dr, 10) : null,
            });
            setSuccessMessage('Record added successfully');
            setDrValidationStatus(null);
            setIsAdding(false);
            fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to add record: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewRecord({
            tf_checker: '',
            tf_dr: '',
            tf_destination: '',
            tf_plateno: '',
            tf_commodity: '',
            tf_volume: '',
            tf_name: '',
            tf_remarks: '',
            tf_apprehended: false,
        });
    };

    // Edit handlers
    const handleEditClick = (record) => {
        setDrValidationStatus(null);
        setEditingId(record.tf_ctrlno);
        setEditForm({
            tf_checker: record.tf_checker || '',
            tf_dr: record.tf_dr || '',
            tf_destination: record.tf_destination || '',
            tf_plateno: record.tf_plateno || '',
            tf_commodity: record.tf_commodity || '',
            tf_volume: record.tf_volume || '',
            tf_name: record.tf_name || '',
            tf_remarks: record.tf_remarks || '',
            tf_apprehended: record.tf_apprehended || false,
        });
    };

    const handleSaveEdit = async () => {
        // Prevent saving if DR validation failed
        if (drValidationStatus === false) {
            setError('Cannot save: Invalid or Duplicate DR Number');
            setTimeout(() => setError(''), 3000);
            return;
        }

        // Additional check: Validate DR is not duplicate before saving
        const drValue = editForm.tf_dr?.toString().trim();
        if (drValue && drValue !== '') {
            try {
                const dupResult = await api.checkTaskforceDuplicateDR(drValue, editingId);
                if (dupResult.duplicate) {
                    setDuplicateData(dupResult.record);
                    setIsDuplicateModalOpen(true);
                    setDrValidationStatus(false);
                    return; // Block save
                }
            } catch (err) {
                console.error('Duplicate check on save failed:', err);
            }
        }

        try {
            await api.updateTaskforceRecord(editingId, {
                ...editForm,
                tf_area: selectedArea,
                tf_date: selectedDate,
                tf_dr: !isNaN(parseInt(editForm.tf_dr, 10)) ? parseInt(editForm.tf_dr, 10) : null,
            });
            setSuccessMessage('Record updated successfully');
            setEditingId(null);
            fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to update record: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    // Delete handlers
    const handleDeleteClick = (record) => {
        setDeletingRecord(record);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await api.deleteTaskforceRecord(deletingRecord.tf_ctrlno);
            setSuccessMessage('Record deleted successfully');
            setIsDeleteModalOpen(false);
            setDeletingRecord(null);
            fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to delete record: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    // Validate DR number and auto-populate name if valid
    const validateDR = async (drValue) => {
        if (!drValue || drValue.trim() === '') {
            setDrValidationStatus(null);
            return;
        }

        // 1. Check for duplicate in tbl_taskforce
        try {
            const excludeId = editingId || null;
            const dupResult = await api.checkTaskforceDuplicateDR(drValue, excludeId);
            console.log('Duplicate Result:', dupResult);
            console.log('dupResult.duplicate:', dupResult.duplicate);
            console.log('dupResult.record:', dupResult.record);

            if (dupResult.duplicate) {
                console.log('Duplicate found! Setting modal state...');
                setDuplicateData(dupResult.record);
                setIsDuplicateModalOpen(true);
                setDrValidationStatus(false);
                console.log('Modal should now be open with record:', dupResult.record);
                return; // Stop further validation if duplicate
            }
        } catch (err) {
            console.error('Duplicate DR check error:', err);
            // Continue to next validation even if duplicate check fails (or handle error)
        }

        // 2. Validate against delivery receipt stubs
        // 2. Validate against delivery receipt stubs
        try {
            const result = await api.validateTaskforceDR(drValue);

            // Per user request:
            // - Green (true) ONLY if valid (found in stubs).
            // - Default (null) if invalid but unique.
            // - Red (false) is handled by duplicate check above.
            if (result.valid) {
                setDrValidationStatus(true);
            } else {
                setDrValidationStatus(null);
            }

            if (result.valid && result.clientName) {
                if (isAdding) {
                    setNewRecord((prev) => ({ ...prev, tf_name: result.clientName }));
                } else if (editingId) {
                    setEditForm((prev) => ({ ...prev, tf_name: result.clientName }));
                }
            }
        } catch (err) {
            console.error('DR validation error:', err);
            // On error, revert to default color (don't block, don't show green)
            setDrValidationStatus(null);
        }
    };

    const getPlateStatusColor = (plateNo) => {
        if (!plateNo) return 'var(--foreground)';
        const vehicle = vehicleRegistry.find((v) => v.vr_plateno === plateNo);
        if (vehicle) {
            return isPlateExpired(vehicle.vr_expirydate) ? '#ef4444' : '#22c55e';
        }
        return 'var(--foreground)';
    };

    // Render DR input with validation color feedback
    const renderDRInput = (value, onChange, placeholder = '') => {
        let inputColor = 'var(--foreground)';
        let fontWeight = 'normal';
        if (drValidationStatus === true) {
            inputColor = '#22c55e'; // green
            fontWeight = '600';
        } else if (drValidationStatus === false) {
            inputColor = '#ef4444'; // red
            fontWeight = '600';
        }

        return (
            <input
                type="text"
                className="inline-input"
                value={value}
                onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    onChange(val);
                    setDrValidationStatus(null); // reset while typing
                }}
                onBlur={() => validateDR(value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: 'var(--background)',
                    color: inputColor,
                    fontWeight: fontWeight,
                }}
            />
        );
    };

    // Render checker autocomplete input
    const renderCheckerInput = (value, onChange, inputRef) => (
        <div style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                className="inline-input"
                value={value}
                placeholder="Search checker..."
                onFocus={() => {
                    updateDropdownPosition(inputRef, setCheckerDropdownPosition);
                    setCheckerSearch(value);
                    setShowCheckerSuggestions(true);
                    setCheckerHighlightIndex(0);
                }}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    onChange(val);
                    setCheckerSearch(val);
                    updateDropdownPosition(inputRef, setCheckerDropdownPosition);
                    setShowCheckerSuggestions(true);
                    setCheckerHighlightIndex(0);
                }}
                onKeyDown={(e) => {
                    if (!showCheckerSuggestions || checkerSuggestions.length === 0) return;

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCheckerHighlightIndex((prev) =>
                            prev < checkerSuggestions.length - 1 ? prev + 1 : 0
                        );
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCheckerHighlightIndex((prev) =>
                            prev > 0 ? prev - 1 : checkerSuggestions.length - 1
                        );
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (
                            checkerHighlightIndex >= 0 &&
                            checkerHighlightIndex < checkerSuggestions.length
                        ) {
                            onChange(checkerSuggestions[checkerHighlightIndex].tf_checker);
                            setShowCheckerSuggestions(false);
                        }
                    } else if (e.key === 'Escape') {
                        setShowCheckerSuggestions(false);
                    }
                }}
                onBlur={() => setTimeout(() => setShowCheckerSuggestions(false), 200)}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    textTransform: 'uppercase',
                }}
            />
            {showCheckerSuggestions &&
                checkerSuggestions.length > 0 &&
                createPortal(
                    <ul
                        style={{
                            position: 'absolute',
                            top: checkerDropdownPosition.top,
                            left: checkerDropdownPosition.left,
                            width: checkerDropdownPosition.width,
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
                        {checkerSuggestions.map((c, idx) => (
                            <li
                                key={idx}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--foreground)',
                                    textTransform: 'uppercase',
                                    background:
                                        idx === checkerHighlightIndex
                                            ? 'var(--accent)'
                                            : 'transparent',
                                }}
                                onMouseEnter={() => setCheckerHighlightIndex(idx)}
                                onMouseDown={() => {
                                    onChange(c.tf_checker);
                                    setShowCheckerSuggestions(false);
                                }}
                            >
                                {c.tf_checker}
                            </li>
                        ))}
                    </ul>,
                    document.body
                )}
        </div>
    );

    // Render inline input
    const renderInput = (value, onChange, type = 'text', placeholder = '') => (
        <input
            type={type}
            className="inline-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--background)',
                color: 'var(--foreground)',
            }}
        />
    );

    // Render inline input with uppercase
    const renderUppercaseInput = (value, onChange, placeholder = '') => (
        <input
            type="text"
            className="inline-input"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder={placeholder}
            style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--background)',
                color: 'var(--foreground)',
                textTransform: 'uppercase',
            }}
        />
    );

    // Render commodity combobox (displays cm_desc, saves cm_ctrlno)
    const renderCommoditySelect = (value, onChange) => (
        <select
            className="inline-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--background)',
                color: 'var(--foreground)',
            }}
        >
            <option value="">-- Select --</option>
            {commodities.map((c) => (
                <option key={c.cm_ctrlno} value={c.cm_ctrlno}>
                    {c.cm_desc}
                </option>
            ))}
        </select>
    );

    // Render name autocomplete input
    const renderNameInput = (value, onChange, inputRef) => (
        <div style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                className="inline-input"
                value={value}
                placeholder="Search name..."
                onFocus={() => {
                    updateDropdownPosition(inputRef, setNameDropdownPosition);
                    setNameSearch(value);
                    setShowNameSuggestions(true);
                    setNameHighlightIndex(0);
                }}
                onChange={(e) => {
                    const val = e.target.value;
                    onChange(val);
                    setNameSearch(val);
                    updateDropdownPosition(inputRef, setNameDropdownPosition);
                    setShowNameSuggestions(true);
                    setNameHighlightIndex(0);
                }}
                onKeyDown={(e) => {
                    if (!showNameSuggestions || nameSuggestions.length === 0) return;

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setNameHighlightIndex((prev) =>
                            prev < nameSuggestions.length - 1 ? prev + 1 : 0
                        );
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setNameHighlightIndex((prev) =>
                            prev > 0 ? prev - 1 : nameSuggestions.length - 1
                        );
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (
                            nameHighlightIndex >= 0 &&
                            nameHighlightIndex < nameSuggestions.length
                        ) {
                            onChange(nameSuggestions[nameHighlightIndex].ph_cname);
                            setShowNameSuggestions(false);
                        }
                    } else if (e.key === 'Escape') {
                        setShowNameSuggestions(false);
                    }
                }}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                }}
            />
            {showNameSuggestions &&
                nameSuggestions.length > 0 &&
                createPortal(
                    <ul
                        style={{
                            position: 'absolute',
                            top: nameDropdownPosition.top,
                            left: nameDropdownPosition.left,
                            width: nameDropdownPosition.width,
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
                        {nameSuggestions.map((c, idx) => (
                            <li
                                key={idx}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--foreground)',
                                    background:
                                        idx === nameHighlightIndex
                                            ? 'var(--accent)'
                                            : 'transparent',
                                }}
                                onMouseEnter={() => setNameHighlightIndex(idx)}
                                onMouseDown={() => {
                                    onChange(c.ph_cname);
                                    setShowNameSuggestions(false);
                                }}
                            >
                                {c.ph_cname}
                            </li>
                        ))}
                    </ul>,
                    document.body
                )}
        </div>
    );

    const renderDestinationInput = (value, onChange, inputRef, isNew = false) => (
        <div style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                className="inline-input"
                value={value}
                placeholder="Search..."
                onFocus={() => {
                    updateDropdownPosition(inputRef, setDestDropdownPosition);
                    setDestSearch(value);
                    setShowDestSuggestions(true);
                    setDestHighlightIndex(0);
                }}
                onChange={(e) => {
                    const val = e.target.value;
                    onChange(val);
                    setDestSearch(val);
                    updateDropdownPosition(inputRef, setDestDropdownPosition);
                    setShowDestSuggestions(true);
                    setDestHighlightIndex(0);
                }}
                onKeyDown={(e) => {
                    if (!showDestSuggestions || destSuggestions.length === 0) return;

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setDestHighlightIndex((prev) =>
                            prev < destSuggestions.length - 1 ? prev + 1 : 0
                        );
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setDestHighlightIndex((prev) =>
                            prev > 0 ? prev - 1 : destSuggestions.length - 1
                        );
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (
                            destHighlightIndex >= 0 &&
                            destHighlightIndex < destSuggestions.length
                        ) {
                            onChange(destSuggestions[destHighlightIndex].mun_name);
                            setShowDestSuggestions(false);
                        }
                    } else if (e.key === 'Escape') {
                        setShowDestSuggestions(false);
                    }
                }}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                }}
            />
            {showDestSuggestions &&
                destSuggestions.length > 0 &&
                createPortal(
                    <ul
                        style={{
                            position: 'absolute',
                            top: destDropdownPosition.top,
                            left: destDropdownPosition.left,
                            width: destDropdownPosition.width,
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
                        {destSuggestions.map((m, idx) => (
                            <li
                                key={idx}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--foreground)',
                                    background:
                                        idx === destHighlightIndex
                                            ? 'var(--accent)'
                                            : 'transparent',
                                }}
                                onMouseEnter={() => setDestHighlightIndex(idx)}
                                onMouseDown={() => {
                                    onChange(m.mun_name);
                                    setShowDestSuggestions(false);
                                }}
                            >
                                {m.mun_name}
                            </li>
                        ))}
                    </ul>,
                    document.body
                )}
        </div>
    );

    // Render plate number autocomplete
    const renderPlateInput = (value, onChange, inputRef) => {
        // Determine plate color based on registry lookup
        const plateMatch = vehicleRegistry.find(
            (v) => v.vr_plateno && v.vr_plateno.toUpperCase() === (value || '').toUpperCase()
        );
        let inputColor = 'var(--foreground)'; // default
        if (plateMatch) {
            inputColor = isPlateExpired(plateMatch.vr_expiry) ? '#ef4444' : '#22c55e';
        }

        return (
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="inline-input"
                    value={value}
                    placeholder="Search plate..."
                    onFocus={() => {
                        updateDropdownPosition(inputRef, setPlateDropdownPosition);
                        setPlateSearch(value);
                        setShowPlateSuggestions(true);
                        setPlateHighlightIndex(0);
                    }}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        onChange(val);
                        setPlateSearch(val);
                        updateDropdownPosition(inputRef, setPlateDropdownPosition);
                        setShowPlateSuggestions(true);
                        setPlateHighlightIndex(0);
                    }}
                    onKeyDown={(e) => {
                        if (!showPlateSuggestions || plateSuggestions.length === 0) return;

                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setPlateHighlightIndex((prev) =>
                                prev < plateSuggestions.length - 1 ? prev + 1 : 0
                            );
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setPlateHighlightIndex((prev) =>
                                prev > 0 ? prev - 1 : plateSuggestions.length - 1
                            );
                        } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (
                                plateHighlightIndex >= 0 &&
                                plateHighlightIndex < plateSuggestions.length
                            ) {
                                onChange(plateSuggestions[plateHighlightIndex].vr_plateno);
                                setShowPlateSuggestions(false);
                            }
                        } else if (e.key === 'Escape') {
                            setShowPlateSuggestions(false);
                        }
                    }}
                    onBlur={() => setTimeout(() => setShowPlateSuggestions(false), 200)}
                    style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--background)',
                        color: inputColor,
                        textTransform: 'uppercase',
                        fontWeight: plateMatch ? '600' : 'normal',
                    }}
                />
                {showPlateSuggestions &&
                    plateSuggestions.length > 0 &&
                    createPortal(
                        <ul
                            style={{
                                position: 'absolute',
                                top: plateDropdownPosition.top,
                                left: plateDropdownPosition.left,
                                width: plateDropdownPosition.width,
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
                            {plateSuggestions.map((v, idx) => {
                                const expired = isPlateExpired(v.vr_expiry);
                                return (
                                    <li
                                        key={v.vr_plateno}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            borderBottom: '1px solid var(--border)',
                                            color: expired ? '#ef4444' : '#22c55e',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            background:
                                                idx === plateHighlightIndex
                                                    ? 'var(--accent)'
                                                    : 'transparent',
                                        }}
                                        onMouseEnter={() => setPlateHighlightIndex(idx)}
                                        onMouseDown={() => {
                                            onChange(v.vr_plateno);
                                            setShowPlateSuggestions(false);
                                        }}
                                    >
                                        <span>{v.vr_plateno}</span>
                                        <span style={{ fontSize: '11px', opacity: 0.8 }}>
                                            {expired ? '(EXPIRED)' : '(Valid)'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>,
                        document.body
                    )}
            </div>
        );
    };

    return (
        <div className="page-container">
            {/* Header Section */}
            <div className="page-header">
                <h1 className="page-title">Task Force</h1>
                <div className="page-actions">
                    {selectedArea && selectedDate && (
                        <button className="btn btn-primary" onClick={handleAddClick}>
                            <FiPlus size={16} />
                            Add Record
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Section */}
            <div className="table-container" style={{ marginBottom: '16px', padding: '12px' }}>
                <div
                    className="transactions-compact-form"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
                >
                    {/* Area Combobox */}
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Area</label>
                        <select
                            className="transactions-compact-input"
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                        >
                            <option value="">-- Select Area --</option>
                            {municipalities.map((m, idx) => (
                                <option key={idx} value={m.mun_name}>
                                    {m.mun_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="transactions-compact-group">
                        <label className="transactions-compact-label">Date</label>
                        <input
                            type="date"
                            className="transactions-compact-input"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="alert alert-error">
                    <svg
                        className="alert-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="alert alert-success">
                    <svg
                        className="alert-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {successMessage}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading records...</span>
                </div>
            )}

            {/* Records Table */}
            {!loading && selectedArea && selectedDate && (
                <div className="table-wrapper">
                    <div className="table-scroll-container" style={{ overflow: 'auto' }}>
                        <table className="table" style={{ minWidth: '1200px' }}>
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head" style={{ width: '120px' }}>
                                        Checker
                                    </th>
                                    <th className="table-head" style={{ width: '80px' }}>
                                        DR No.
                                    </th>
                                    <th className="table-head" style={{ width: '150px' }}>
                                        Destination
                                    </th>
                                    <th className="table-head" style={{ width: '100px' }}>
                                        Plate No.
                                    </th>
                                    <th className="table-head" style={{ width: '120px' }}>
                                        Commodity
                                    </th>
                                    <th className="table-head" style={{ width: '80px' }}>
                                        Volume
                                    </th>
                                    <th className="table-head" style={{ width: '150px' }}>
                                        Name
                                    </th>
                                    <th className="table-head" style={{ width: '150px' }}>
                                        Remarks
                                    </th>
                                    <th
                                        className="table-head"
                                        style={{ width: '90px', textAlign: 'center' }}
                                    >
                                        Apprehended
                                    </th>
                                    <th
                                        className="table-head"
                                        style={{ width: '100px', textAlign: 'center' }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Add New Row */}
                                {isAdding && (
                                    <tr
                                        className="table-row"
                                        style={{ background: 'var(--accent)' }}
                                    >
                                        <td className="table-cell">
                                            {renderCheckerInput(
                                                newRecord.tf_checker,
                                                (v) =>
                                                    setNewRecord({ ...newRecord, tf_checker: v }),
                                                checkerInputRef
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderDRInput(
                                                newRecord.tf_dr,
                                                (v) => setNewRecord({ ...newRecord, tf_dr: v }),
                                                'Numbers only'
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderDestinationInput(
                                                newRecord.tf_destination,
                                                (v) =>
                                                    setNewRecord({
                                                        ...newRecord,
                                                        tf_destination: v,
                                                    }),
                                                destInputRef,
                                                true
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderPlateInput(
                                                newRecord.tf_plateno,
                                                (v) =>
                                                    setNewRecord({ ...newRecord, tf_plateno: v }),
                                                plateInputRef
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderCommoditySelect(newRecord.tf_commodity, (v) =>
                                                setNewRecord({ ...newRecord, tf_commodity: v })
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderInput(newRecord.tf_volume, (v) =>
                                                setNewRecord({ ...newRecord, tf_volume: v })
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderNameInput(
                                                newRecord.tf_name,
                                                (v) => setNewRecord({ ...newRecord, tf_name: v }),
                                                nameInputRef
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {renderInput(newRecord.tf_remarks, (v) =>
                                                setNewRecord({ ...newRecord, tf_remarks: v })
                                            )}
                                        </td>
                                        <td className="table-cell" style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={newRecord.tf_apprehended}
                                                onChange={(e) =>
                                                    setNewRecord({
                                                        ...newRecord,
                                                        tf_apprehended: e.target.checked,
                                                    })
                                                }
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </td>
                                        <td className="table-cell" style={{ textAlign: 'center' }}>
                                            <div className="actions-container">
                                                <button
                                                    className="btn-edit"
                                                    onClick={handleSaveNew}
                                                    title="Save"
                                                >
                                                    <FiCheck className="icon-sm" />
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={handleCancelNew}
                                                    title="Cancel"
                                                >
                                                    <FiX className="icon-sm" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* Existing Records */}
                                {records.map((record) =>
                                    editingId === record.tf_ctrlno ? (
                                        <tr
                                            key={record.tf_ctrlno}
                                            className="table-row"
                                            style={{ background: 'var(--accent)' }}
                                        >
                                            <td className="table-cell">
                                                {renderCheckerInput(
                                                    editForm.tf_checker,
                                                    (v) =>
                                                        setEditForm({ ...editForm, tf_checker: v }),
                                                    editCheckerInputRef
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderDRInput(
                                                    editForm.tf_dr,
                                                    (v) => setEditForm({ ...editForm, tf_dr: v }),
                                                    'Numbers only'
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderDestinationInput(
                                                    editForm.tf_destination,
                                                    (v) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            tf_destination: v,
                                                        }),
                                                    editDestInputRef
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderPlateInput(
                                                    editForm.tf_plateno,
                                                    (v) =>
                                                        setEditForm({ ...editForm, tf_plateno: v }),
                                                    editPlateInputRef
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderCommoditySelect(editForm.tf_commodity, (v) =>
                                                    setEditForm({ ...editForm, tf_commodity: v })
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderInput(editForm.tf_volume, (v) =>
                                                    setEditForm({ ...editForm, tf_volume: v })
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderNameInput(
                                                    editForm.tf_name,
                                                    (v) => setEditForm({ ...editForm, tf_name: v }),
                                                    editNameInputRef
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {renderInput(editForm.tf_remarks, (v) =>
                                                    setEditForm({ ...editForm, tf_remarks: v })
                                                )}
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{ textAlign: 'center' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.tf_apprehended}
                                                    onChange={(e) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            tf_apprehended: e.target.checked,
                                                        })
                                                    }
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{ textAlign: 'center' }}
                                            >
                                                <div className="actions-container">
                                                    <button
                                                        className="btn-edit"
                                                        onClick={handleSaveEdit}
                                                        title="Save"
                                                    >
                                                        <FiCheck className="icon-sm" />
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={handleCancelEdit}
                                                        title="Cancel"
                                                    >
                                                        <FiX className="icon-sm" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={record.tf_ctrlno} className="table-row">
                                            <td className="table-cell">
                                                {record.tf_checker || '-'}
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{
                                                    color:
                                                        record.is_dr_valid === 1
                                                            ? '#22c55e'
                                                            : record.tf_dr
                                                              ? '#ef4444'
                                                              : 'var(--foreground)',
                                                    fontWeight:
                                                        record.is_dr_valid === 1 || record.tf_dr
                                                            ? '600'
                                                            : 'normal',
                                                }}
                                            >
                                                {record.tf_dr || '-'}
                                            </td>
                                            <td className="table-cell">
                                                {record.tf_destination || '-'}
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{
                                                    color: getPlateStatusColor(record.tf_plateno),
                                                    fontWeight:
                                                        getPlateStatusColor(record.tf_plateno) !==
                                                        'var(--foreground)'
                                                            ? '600'
                                                            : 'normal',
                                                }}
                                            >
                                                {record.tf_plateno || '-'}
                                            </td>
                                            <td className="table-cell">
                                                {commodities.find(
                                                    (c) =>
                                                        String(c.cm_ctrlno) ===
                                                        String(record.tf_commodity)
                                                )?.cm_desc ||
                                                    record.tf_commodity ||
                                                    '-'}
                                            </td>
                                            <td className="table-cell">
                                                {record.tf_volume || '-'}
                                            </td>
                                            <td className="table-cell">{record.tf_name || '-'}</td>
                                            <td className="table-cell">
                                                {record.tf_remarks || '-'}
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{ textAlign: 'center' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={record.tf_apprehended}
                                                    disabled
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                            </td>
                                            <td
                                                className="table-cell"
                                                style={{ textAlign: 'center' }}
                                            >
                                                <div className="actions-container">
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => handleEditClick(record)}
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 className="icon-sm" />
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDeleteClick(record)}
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 className="icon-sm" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}

                                {/* Empty State */}
                                {records.length === 0 && !isAdding && (
                                    <tr>
                                        <td colSpan={10} className="table-empty">
                                            No records found for the selected area and date
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State when no area/date selected */}
            {!loading && (!selectedArea || !selectedDate) && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Please select an Area and Date to view task force records
                    </p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRecord(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Task Force Record"
                message={`Are you sure you want to delete this record? This action cannot be undone.`}
            />

            <DuplicateDRModal
                isOpen={isDuplicateModalOpen}
                onClose={() => {
                    setIsDuplicateModalOpen(false);
                    setDuplicateData(null);
                }}
                record={duplicateData}
            />
        </div>
    );
};

export default TaskForce;
