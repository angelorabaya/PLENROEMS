import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { changePassword, login } from '../services/auth';
import { FiX } from 'react-icons/fi';
import plenroLogo from '../plenro.png';
import '../styles/global.css';
import '../components/modals/Modal.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [changePasswordData, setChangePasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [changePasswordError, setChangePasswordError] = useState('');
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = await login(username, password);
            if (user.requirePasswordChange) {
                setPendingUser(user);
                setChangePasswordData({
                    oldPassword: password,
                    newPassword: '',
                    confirmPassword: '',
                });
                setChangePasswordError('');
                setIsChangePasswordOpen(true);
                return;
            }
            onLogin(user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!pendingUser?.log_user) {
            setChangePasswordError('No user is pending for password change.');
            return;
        }

        if (
            !changePasswordData.oldPassword ||
            !changePasswordData.newPassword ||
            !changePasswordData.confirmPassword
        ) {
            setChangePasswordError('Please fill in all password fields.');
            return;
        }

        if (changePasswordData.newPassword.length < 8) {
            setChangePasswordError('New password must be at least 8 characters long.');
            return;
        }

        if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
            setChangePasswordError('New password and confirm password do not match.');
            return;
        }

        try {
            setChangePasswordLoading(true);
            setChangePasswordError('');
            const result = await changePassword(
                pendingUser.log_user,
                changePasswordData.oldPassword,
                changePasswordData.newPassword
            );
            setIsChangePasswordOpen(false);
            setPendingUser(null);
            onLogin(result.user);
        } catch (err) {
            setChangePasswordError(err.message);
        } finally {
            setChangePasswordLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <img
                        src={plenroLogo}
                        alt="PLENRO Logo"
                        className="login-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h1 className="login-title">PLENRO System</h1>
                    <p className="login-subtitle">Sign in to continue</p>
                </div>

                {error && (
                    <div className="login-error">
                        <svg
                            className="login-error-icon"
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

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-field">
                        <label className="login-label">Username</label>
                        <input
                            type="text"
                            className="login-input"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label">Password</label>
                        <input
                            type="password"
                            className="login-input"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={`login-button ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>

            <Dialog.Root open={isChangePasswordOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content dialog-content-sm">
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Change Password</Dialog.Title>
                            <button
                                type="button"
                                className="dialog-close"
                                aria-label="Close"
                                disabled
                            >
                                <FiX size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePasswordSubmit}>
                            <div className="dialog-body">
                                <p
                                    style={{
                                        marginBottom: '0.75rem',
                                        fontSize: '0.875rem',
                                        color: 'var(--muted-foreground)',
                                    }}
                                >
                                    Your account is still using a legacy password. You must change
                                    it before continuing.
                                </p>

                                {changePasswordError && (
                                    <div className="login-error" style={{ marginBottom: '1rem' }}>
                                        {changePasswordError}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Old Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={changePasswordData.oldPassword}
                                        onChange={(e) =>
                                            setChangePasswordData((prev) => ({
                                                ...prev,
                                                oldPassword: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={changePasswordData.newPassword}
                                        onChange={(e) =>
                                            setChangePasswordData((prev) => ({
                                                ...prev,
                                                newPassword: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={changePasswordData.confirmPassword}
                                        onChange={(e) =>
                                            setChangePasswordData((prev) => ({
                                                ...prev,
                                                confirmPassword: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="dialog-footer">
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={changePasswordLoading}
                                >
                                    {changePasswordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <style>{`
                .login-page {
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    background: var(--background);
                }

                .login-container {
                    width: 100%;
                    max-width: 28rem;
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 0.75rem;
                    padding: 2rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: slideUp 0.5s ease;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .login-logo {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin: 0 auto 1rem;
                }

                .login-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--foreground);
                    margin-bottom: 0.5rem;
                }

                .login-subtitle {
                    font-size: 0.875rem;
                    color: var(--muted-foreground);
                }

                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background-color: var(--destructive);
                    color: var(--destructive-foreground);
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 0.875rem;
                }

                .login-error-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    flex-shrink: 0;
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .login-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }

                .login-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--foreground);
                }

                .login-input {
                    width: 100%;
                    height: 2.5rem;
                    padding: 0.5rem 0.75rem;
                    background: var(--input);
                    border: 1px solid var(--border);
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--foreground);
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .login-input::placeholder {
                    color: var(--muted-foreground);
                }

                .login-input:hover {
                    border-color: var(--ring);
                }

                .login-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
                }

                .login-button {
                    width: 100%;
                    height: 2.5rem;
                    margin-top: 1rem;
                    background-color: var(--primary);
                    color: var(--primary-foreground);
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                .login-button:hover {
                    opacity: 0.9;
                }

                .login-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .login-button.loading {
                    position: relative;
                }
            `}</style>
        </div>
    );
};

export default Login;
