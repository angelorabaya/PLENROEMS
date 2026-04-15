import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiShield, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import DeleteModal from '../components/modals/DeleteModal';
import '../styles/global.css';
import { getUserPermissions } from '../utils/permissions';

const ROLE_OPTIONS = ['Admin', 'Editor', 'Viewer'];

const EMPTY_FORM = {
    log_user: '',
    password: '',
    log_cname: '',
    log_role: 'Viewer',
};

const isProtectedUser = (logUser) => (logUser || '').trim().toLowerCase() === 'admin';

const UserManagement = () => {
    const { currentUser } = useOutletContext();
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);

    const adminAllowed = useMemo(
        () => getUserPermissions(currentUser).isAdministrator,
        [currentUser]
    );
    const currentUsername = (currentUser?.log_user || '').trim().toUpperCase();
    const isEditingCurrentUser =
        !!editingUser && (editingUser.log_user || '').trim().toUpperCase() === currentUsername;
    const isEditingProtectedUser = !!editingUser && isProtectedUser(editingUser.log_user);

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return users;

        return users.filter((user) =>
            [user.log_user, user.log_cname, user.log_role]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword))
        );
    }, [search, users]);

    const nameSuggestions = useMemo(() => {
        const keyword = formData.log_cname.trim().toLowerCase();
        if (!keyword) return employees.slice(0, 8);

        return employees
            .filter((employee) => (employee.emp_name || '').toLowerCase().includes(keyword))
            .slice(0, 8);
    }, [employees, formData.log_cname]);

    useEffect(() => {
        if (!adminAllowed) return;
        fetchUsers();
        fetchEmployees();
    }, [adminAllowed]);

    useEffect(() => {
        if (!success) return undefined;

        const timeoutId = window.setTimeout(() => {
            setSuccess('');
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [success]);

    useEffect(() => {
        if (!error) return undefined;

        const timeoutId = window.setTimeout(() => {
            setError('');
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [error]);

    const clearError = () => setError('');
    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const fetchUsers = async () => {
        setLoading(true);
        clearError();

        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await api.getEmployees();
            setEmployees(data || []);
        } catch (err) {
            console.error('Failed to fetch employee lookup:', err);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData(EMPTY_FORM);
        setShowNameSuggestions(false);
        clearError();
    };

    const handleEdit = (user) => {
        if (isProtectedUser(user.log_user)) {
            setError('The admin account cannot be edited.');
            return;
        }

        setEditingUser(user);
        setFormData({
            log_user: user.log_user || '',
            password: '',
            log_cname: user.log_cname || '',
            log_role: user.log_role || 'Viewer',
        });
        setShowNameSuggestions(false);
        clearMessages();
    };

    const handleNameSuggestionSelect = (employeeName) => {
        setFormData((prev) => ({
            ...prev,
            log_cname: employeeName,
        }));
        setShowNameSuggestions(false);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
        clearMessages();
    };

    const handleDelete = async () => {
        if (!userToDelete) return;

        setSaving(true);
        clearMessages();

        try {
            await api.deleteUser(userToDelete.log_ctrlno);
            setSuccess(`User ${userToDelete.log_user} deleted successfully.`);
            if (editingUser?.log_ctrlno === userToDelete.log_ctrlno) {
                resetForm();
            }
            await fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearMessages();

        const payload = {
            log_user: formData.log_user.trim(),
            password: formData.password,
            log_cname: formData.log_cname.trim(),
            log_role: formData.log_role,
        };

        if (!payload.log_user || !payload.log_cname || !payload.log_role) {
            setError('User, name, and role are required.');
            return;
        }

        if (!editingUser && !payload.password) {
            setError('Password is required for a new user.');
            return;
        }

        if (payload.password && payload.password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (
            isEditingCurrentUser &&
            (editingUser.log_role || '').trim().toLowerCase() !==
                payload.log_role.trim().toLowerCase()
        ) {
            setError('You cannot change your own role while logged in.');
            return;
        }

        setSaving(true);

        try {
            if (editingUser) {
                await api.updateUser(editingUser.log_ctrlno, payload);
                setSuccess(`User ${payload.log_user.toUpperCase()} updated successfully.`);
            } else {
                await api.createUser(payload);
                setSuccess(`User ${payload.log_user.toUpperCase()} created successfully.`);
            }

            await fetchUsers();
            resetForm();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!adminAllowed) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">User Management</h1>
                </div>

                <div className="alert alert-error">
                    <FiShield className="alert-icon" size={16} />
                    Admin access is required to manage login accounts.
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">
                        Create and edit login accounts stored in <code>tbl_login</code>.
                    </p>
                </div>
                <div className="page-actions">
                    <div className="search-container">
                        <FiSearch className="search-icon" size={16} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={fetchUsers}>
                        <FiRefreshCw size={16} />
                        Refresh
                    </button>
                    <button type="button" className="btn btn-primary" onClick={resetForm}>
                        <FiPlus size={16} />
                        New User
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="user-management-layout">
                <div className="table-wrapper">
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <span className="loading-text">Loading users...</span>
                        </div>
                    ) : (
                        <div className="table-scroll-container user-table-scroll">
                            <table className="table">
                                <thead className="table-header">
                                    <tr className="table-row">
                                        <th className="table-head">User</th>
                                        <th className="table-head">Name</th>
                                        <th className="table-head">Role</th>
                                        <th className="table-head">Password</th>
                                        <th className="table-head" style={{ textAlign: 'center' }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <tr key={user.log_ctrlno} className="table-row">
                                                <td className="table-cell">
                                                    <span className="cell-text">
                                                        {user.log_user}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <span className="cell-text">
                                                        {user.log_cname || '-'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <span className="role-badge">
                                                        {user.log_role || 'Viewer'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <span className="cell-text">
                                                        {user.log_passhash
                                                            ? 'Hashed'
                                                            : 'Legacy / Empty'}
                                                    </span>
                                                </td>
                                                <td
                                                    className="table-cell"
                                                    style={{ textAlign: 'center' }}
                                                >
                                                    {isProtectedUser(user.log_user) ? (
                                                        <span className="cell-text">Protected</span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn-edit"
                                                                onClick={() => handleEdit(user)}
                                                                title="Edit user"
                                                            >
                                                                <FiEdit2 className="icon-sm" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-delete"
                                                                onClick={() =>
                                                                    handleDeleteClick(user)
                                                                }
                                                                title="Delete user"
                                                                disabled={
                                                                    (user.log_user || '')
                                                                        .trim()
                                                                        .toUpperCase() ===
                                                                    currentUsername
                                                                }
                                                            >
                                                                <FiTrash2 className="icon-sm" />
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="table-empty">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="user-form-card">
                    <div className="user-form-header">
                        <h2 className="user-form-title">
                            {editingUser ? `Edit ${editingUser.log_user}` : 'Create User'}
                        </h2>
                        <p className="user-form-copy">
                            Passwords are stored in <code>log_passhash</code> using bcrypt. When
                            editing a user, leaving the password blank keeps the current password
                            and preserves the existing <code>log_pass</code> value.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="user-form">
                        <div className="form-group">
                            <label className="form-label">User</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.log_user}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        log_user: e.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="Enter username"
                                required
                                disabled={isEditingProtectedUser}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <div className="autocomplete-field">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.log_cname}
                                    onFocus={() => setShowNameSuggestions(true)}
                                    onBlur={() => {
                                        window.setTimeout(() => {
                                            setShowNameSuggestions(false);
                                        }, 150);
                                    }}
                                    onChange={(e) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            log_cname: e.target.value,
                                        }));
                                        setShowNameSuggestions(true);
                                    }}
                                    placeholder="Enter full name"
                                    required
                                    disabled={isEditingProtectedUser}
                                    autoComplete="off"
                                />
                                {showNameSuggestions &&
                                    !isEditingProtectedUser &&
                                    nameSuggestions.length > 0 && (
                                        <div className="autocomplete-menu">
                                            {nameSuggestions.map((employee) => (
                                                <button
                                                    key={employee.emp_ctrlno}
                                                    type="button"
                                                    className="autocomplete-option"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() =>
                                                        handleNameSuggestionSelect(
                                                            employee.emp_name || ''
                                                        )
                                                    }
                                                >
                                                    {employee.emp_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            <p className="field-note">
                                Suggestions come from <code>tbl_enroemp</code>, but you can still
                                enter a different name.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                className="form-input"
                                value={formData.log_role}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        log_role: e.target.value,
                                    }))
                                }
                                disabled={isEditingCurrentUser}
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            {isEditingCurrentUser && (
                                <p className="field-note">
                                    Your own role is locked for the current session.
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {editingUser ? 'New Password' : 'Password'}
                            </label>
                            <input
                                type="password"
                                className="form-input"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                placeholder={
                                    editingUser
                                        ? 'Leave blank to keep current password'
                                        : 'Enter password'
                                }
                                disabled={isEditingProtectedUser}
                            />
                        </div>

                        {isEditingProtectedUser && (
                            <p className="field-note">
                                The admin account is protected and cannot be edited.
                            </p>
                        )}

                        <div className="user-form-actions">
                            {editingUser && (
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving
                                    ? editingUser
                                        ? 'Updating...'
                                        : 'Creating...'
                                    : editingUser
                                      ? 'Update User'
                                      : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .page-subtitle {
                    margin-top: 0.35rem;
                    font-size: 0.875rem;
                    color: var(--muted-foreground);
                }

                .user-management-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
                    gap: 1.25rem;
                    align-items: start;
                }

                .user-table-scroll {
                    max-height: calc(100vh - 260px);
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: var(--border) transparent;
                }

                .user-table-scroll::-webkit-scrollbar {
                    width: 10px;
                }

                .user-table-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }

                .user-table-scroll::-webkit-scrollbar-thumb {
                    background-color: var(--border);
                    border-radius: 999px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }

                .user-table-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: var(--muted-foreground);
                }

                .user-form-card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 0.75rem;
                    padding: 1.25rem;
                    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
                }

                .user-form-header {
                    margin-bottom: 1rem;
                }

                .user-form-title {
                    margin: 0;
                    font-size: 1.125rem;
                    color: var(--foreground);
                }

                .user-form-copy {
                    margin: 0.5rem 0 0;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    color: var(--muted-foreground);
                }

                .user-form {
                    display: grid;
                    gap: 1rem;
                }

                .user-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                }

                .user-form select.form-input {
                    background-color: var(--input);
                    color: var(--foreground);
                }

                .user-form select.form-input option {
                    background-color: var(--card);
                    color: var(--foreground);
                }

                .autocomplete-field {
                    position: relative;
                }

                .autocomplete-menu {
                    position: absolute;
                    top: calc(100% + 0.35rem);
                    left: 0;
                    right: 0;
                    z-index: 20;
                    display: grid;
                    gap: 0.25rem;
                    padding: 0.4rem;
                    border: 1px solid var(--border);
                    border-radius: 0.75rem;
                    background: var(--card);
                    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
                    max-height: 220px;
                    overflow-y: auto;
                }

                .autocomplete-option {
                    width: 100%;
                    border: 0;
                    border-radius: 0.55rem;
                    background: transparent;
                    color: var(--foreground);
                    text-align: left;
                    padding: 0.55rem 0.7rem;
                    cursor: pointer;
                    font: inherit;
                }

                .autocomplete-option:hover {
                    background: var(--muted);
                }

                .field-note {
                    margin: 0.4rem 0 0;
                    font-size: 0.8125rem;
                    color: var(--muted-foreground);
                }

                .role-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.625rem;
                    border-radius: 999px;
                    background: rgba(59, 130, 246, 0.12);
                    color: var(--foreground);
                    font-size: 0.8125rem;
                    font-weight: 600;
                }

                @media (max-width: 1100px) {
                    .user-management-layout {
                        grid-template-columns: 1fr;
                    }

                    .user-table-scroll {
                        max-height: none;
                    }
                }
            `}</style>

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Delete User"
                message={
                    userToDelete
                        ? `Are you sure you want to delete ${userToDelete.log_user}?`
                        : 'Are you sure you want to delete this user?'
                }
            />
        </div>
    );
};

export default UserManagement;
