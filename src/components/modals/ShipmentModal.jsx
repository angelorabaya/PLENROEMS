import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import './Modal.css';

const POINT_OF_ENTRY_OPTIONS = ['Lugait', 'Opol', 'Tagoloan'];

const ShipmentModal = ({ isOpen, onClose, onSubmit, shipment, vehicleRegistry = [] }) => {
    const { theme } = useTheme();

    // State matching reference
    const [truckCapacity, setTruckCapacity] = useState('14');
    const [tripCount, setTripCount] = useState('');
    const [pointOfEntry, setPointOfEntry] = useState('');

    // Plate management
    const [plateInput, setPlateInput] = useState('');
    const [plates, setPlates] = useState([]); // [{ plateNo, expiryDate, status }]
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState('');

    // Metadata
    // If vehicleRegistry prop is empty, we might want to fetch, or just rely on prop.
    // Reference relied on prop. We will support both for robustness or just use prop.
    // For now, let's use the prop if provided, else fetch.
    const [localRegistry, setLocalRegistry] = useState([]);

    useEffect(() => {
        if (vehicleRegistry && vehicleRegistry.length > 0) {
            setLocalRegistry(vehicleRegistry);
        } else {
            const fetchPlates = async () => {
                try {
                    const vehicles = await api.getVehicleRegistry();
                    setLocalRegistry(vehicles);
                } catch (err) {
                    console.error('Failed to fetch vehicles:', err);
                }
            };
            if (isOpen) fetchPlates();
        }
    }, [isOpen, vehicleRegistry]);

    // Cleanup/Reset on close or reopen
    useEffect(() => {
        if (!isOpen) {
            setTruckCapacity('14');
            setTripCount('');
            setPointOfEntry('');
            setPlateInput('');
            setPlates([]);
            setShowSuggestions(false);
            setError('');
        }
    }, [isOpen]);

    // If editing an existing shipment (if applicable, though reference doesn't seem to show edit logic clearly, source did.
    // I I will retain the logic to populate if 'shipment' prop is passed, mapping old fields if possible,
    // or arguably just reset if the data structure is changing completely.
    // Given the major structure change, I will assume this is primarily for NEW shipments or the parent will need update to pass compatible data.
    // For now, I will NOT try to map old 'shipment' prop to new fields unless clear mapping exists.
    // The reference didn't use 'shipment' prop for editing, just 'onSubmit'. I'll stick to new structure.)

    const isPlateExpired = (expiryDate) => {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        return expiry < today;
    };

    const transientError = (message) => {
        setError(message);
        setTimeout(() => setError(''), 3500);
    };

    const suggestions = useMemo(() => {
        if (!plateInput.trim()) return [];
        const input = plateInput.toUpperCase();
        return localRegistry
            .filter((v) => v.vr_plateno && v.vr_plateno.toUpperCase().includes(input))
            .slice(0, 8);
    }, [plateInput, localRegistry]);

    const addPlate = (val) => {
        const inputToParse = val || plateInput; // can facilitate direct add from click
        const rawInput = (inputToParse || '').trim();

        if (!rawInput) {
            transientError('Type a plate number first');
            return;
        }

        const parsedPlates = Array.from(
            new Set(
                rawInput
                    .split(',')
                    .map((p) => (p || '').trim().toUpperCase())
                    .filter(Boolean)
            )
        );

        if (parsedPlates.length === 0) {
            transientError('Type a plate number first');
            return;
        }

        const existingSet = new Set(plates.map((p) => p.plateNo));
        const toAdd = parsedPlates.filter((p) => !existingSet.has(p));

        if (toAdd.length === 0) {
            transientError('All plate numbers already added');
            return;
        }

        const additions = toAdd.map((plateNo) => {
            const match = localRegistry.find((v) => (v.vr_plateno || '').toUpperCase() === plateNo);
            const status = match ? (isPlateExpired(match.vr_expiry) ? 'expired' : 'valid') : 'new';
            return { plateNo, expiryDate: match?.vr_expiry || null, status };
        });

        setPlates((prev) => [...prev, ...additions]);
        setPlateInput('');
        setShowSuggestions(false);
    };

    const removePlate = (plateNo) => {
        setPlates((prev) => prev.filter((p) => p.plateNo !== plateNo));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const capacityNum = parseFloat(truckCapacity);
        const tripsNum = parseInt(tripCount, 10);

        if (!capacityNum || !tripsNum || !pointOfEntry || plates.length === 0) {
            transientError('Fill in all shipment fields and add at least one plate');
            return;
        }

        if (onSubmit) {
            onSubmit({
                truckCapacity: capacityNum,
                tripCount: tripsNum,
                pointOfEntry,
                plates, // This is the array of objects { plateNo, expiryDate, status }
            });
            onClose();
        } else {
            console.error('onSubmit prop is missing');
        }
    };

    const getPlateColor = (status) => {
        switch (status) {
            case 'valid':
                return '#10b981'; // Green
            case 'expired':
                return '#ef4444'; // Red
            default:
                return '#8b5cf6'; // Purple (new/unknown)
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Shipment Details</Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body" style={{ overflow: 'visible' }}>
                            {/* Grid validation error */}
                            {error && (
                                <div
                                    className="form-error"
                                    style={{
                                        color: '#fca5a5',
                                        marginBottom: '1rem',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            <div className="form-grid form-grid-3">
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Truck Capacity
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={truckCapacity}
                                        onChange={(e) => setTruckCapacity(e.target.value)}
                                        step="0.01"
                                        placeholder="14"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Trip(s)
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={tripCount}
                                        onChange={(e) => setTripCount(e.target.value)}
                                        step="1"
                                        placeholder="1"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Point of Entry
                                    </label>
                                    <Select.Root
                                        value={pointOfEntry}
                                        onValueChange={setPointOfEntry}
                                    >
                                        <Select.Trigger
                                            className="select-trigger"
                                            aria-label="Point of Entry"
                                        >
                                            <Select.Value placeholder="-- Select --" />
                                            <Select.Icon className="select-icon">
                                                <FiChevronDown />
                                            </Select.Icon>
                                        </Select.Trigger>
                                        <Select.Portal>
                                            <Select.Content className="select-content">
                                                <Select.Viewport className="select-viewport">
                                                    {POINT_OF_ENTRY_OPTIONS.map((opt) => (
                                                        <Select.Item
                                                            key={opt}
                                                            value={opt}
                                                            className="select-item"
                                                        >
                                                            <Select.ItemText>{opt}</Select.ItemText>
                                                            <Select.ItemIndicator className="select-item-indicator">
                                                                <FiCheck />
                                                            </Select.ItemIndicator>
                                                        </Select.Item>
                                                    ))}
                                                </Select.Viewport>
                                            </Select.Content>
                                        </Select.Portal>
                                    </Select.Root>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label form-label-required">
                                    Plate No. (Type to Search)
                                </label>
                                <div
                                    className="autocomplete-wrapper"
                                    style={{ display: 'flex', gap: '8px' }}
                                >
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Type plate number..."
                                            value={plateInput}
                                            onChange={(e) => {
                                                setPlateInput(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() =>
                                                setTimeout(() => setShowSuggestions(false), 200)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addPlate();
                                                }
                                            }}
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <ul
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    zIndex: 100,
                                                    background:
                                                        theme === 'light' ? '#ffffff' : '#1c1c1e',
                                                    border:
                                                        theme === 'light'
                                                            ? '1px solid #e4e4e7'
                                                            : '1px solid #27272a',
                                                    borderRadius: '6px',
                                                    maxHeight: '160px',
                                                    overflowY: 'auto',
                                                    marginTop: '4px',
                                                    padding: '4px',
                                                    listStyle: 'none',
                                                    boxShadow:
                                                        theme === 'light'
                                                            ? '0 4px 12px rgba(0,0,0,0.15)'
                                                            : '0 4px 12px rgba(0,0,0,0.4)',
                                                }}
                                            >
                                                {suggestions.map((v) => {
                                                    const expired = isPlateExpired(v.vr_expiry);
                                                    return (
                                                        <li
                                                            key={v.vr_plateno}
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                borderRadius: '4px',
                                                                color: expired
                                                                    ? '#ef4444'
                                                                    : '#22c55e',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background =
                                                                    theme === 'light'
                                                                        ? '#f4f4f5'
                                                                        : '#27272a')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background =
                                                                    'transparent')
                                                            }
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setPlateInput(v.vr_plateno);
                                                                addPlate(v.vr_plateno);
                                                            }}
                                                        >
                                                            <span>{v.vr_plateno}</span>
                                                            <span
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    opacity: 0.8,
                                                                }}
                                                            >
                                                                {expired ? '(EXPIRED)' : '(Valid)'}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        style={{ width: 'auto', padding: '0 1rem' }}
                                        onClick={() => addPlate()}
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="tags-container" style={{ marginTop: '0.5rem' }}>
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            display: 'block',
                                            width: '100%',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        Added Plates:
                                    </span>
                                    {plates.length === 0 ? (
                                        <span
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--muted-foreground)',
                                            }}
                                        >
                                            No plate numbers added yet
                                        </span>
                                    ) : (
                                        plates.map((p) => (
                                            <span
                                                key={p.plateNo}
                                                className="tag"
                                                style={{
                                                    backgroundColor: getPlateColor(p.status),
                                                    color: 'var(--primary-foreground)',
                                                }}
                                            >
                                                {p.plateNo}
                                                <button
                                                    type="button"
                                                    className="tag-close"
                                                    onClick={() => removePlate(p.plateNo)}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                Use Shipment
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ShipmentModal;
