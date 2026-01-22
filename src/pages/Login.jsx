import React, { useState } from 'react';
import { api } from '../services/api';
import plenroLogo from '../plenro.png';
import '../styles/global.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = await api.login(username, password);
            onLogin(user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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
