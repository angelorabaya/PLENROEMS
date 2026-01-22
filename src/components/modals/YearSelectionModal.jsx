import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { api } from '../../services/api';

const YearSelectionModal = ({ isOpen, onClose, onSubmit, reportName }) => {
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear1, setSelectedYear1] = useState('');
    const [selectedYear2, setSelectedYear2] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadAvailableYears();
        }
    }, [isOpen]);

    const loadAvailableYears = async () => {
        setLoading(true);
        setError('');
        try {
            const years = await api.getReportAvailableYears();
            setAvailableYears(years);
            // Default: first two years (latest and previous)
            if (years.length >= 2) {
                setSelectedYear1(years[0]);
                setSelectedYear2(years[1]);
            } else if (years.length === 1) {
                setSelectedYear1(years[0]);
                setSelectedYear2(years[0]);
            }
        } catch (err) {
            setError('Failed to load available years: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!selectedYear1 || !selectedYear2) {
            setError('Please select both years');
            return;
        }
        onSubmit({ year1: selectedYear1, year2: selectedYear2 });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                style={{ maxWidth: '420px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/20 p-2 rounded-lg">
                            <FiCalendar className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="modal-title">Select Years</h3>
                            <p className="text-sm text-gray-500">{reportName}</p>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {error && <div className="error-alert mb-4">{error}</div>}

                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <span className="loading-text">Loading years...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Select two years to compare in the report:
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="form-label">Year 1</label>
                                    <select
                                        className="form-select"
                                        value={selectedYear1}
                                        onChange={(e) => setSelectedYear1(Number(e.target.value))}
                                    >
                                        <option value="">Select year</option>
                                        {availableYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center pt-6">
                                    <FiArrowRight className="text-gray-500" />
                                </div>

                                <div className="flex-1">
                                    <label className="form-label">Year 2</label>
                                    <select
                                        className="form-select"
                                        value={selectedYear2}
                                        onChange={(e) => setSelectedYear2(Number(e.target.value))}
                                    >
                                        <option value="">Select year</option>
                                        {availableYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {availableYears.length === 0 && !loading && (
                                <p className="text-sm text-amber-400">
                                    No years available. Please check the database.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || !selectedYear1 || !selectedYear2}
                    >
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default YearSelectionModal;
