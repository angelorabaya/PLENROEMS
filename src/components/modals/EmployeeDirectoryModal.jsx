import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const initialFormData = {
    emp_name: '',
};

const EmployeeDirectoryModal = ({ isOpen, onClose, onSave, employee }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (employee) {
            setFormData({
                emp_name: employee.emp_name || '',
            });
            return;
        }

        setFormData(initialFormData);
    }, [employee, isOpen]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            await onSave({
                emp_name: formData.emp_name.trim().toUpperCase(),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content-md">
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">
                                {employee ? 'Edit Employee' : 'Add Employee'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Employee Name
                                </label>
                                <input
                                    type="text"
                                    name="emp_name"
                                    value={formData.emp_name}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Enter employee name"
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary btn-sm ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? '' : employee ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default EmployeeDirectoryModal;
