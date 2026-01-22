import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiLogOut } from 'react-icons/fi';
import Sidebar from './Sidebar';
import '../styles/layout.css';
import './modals/Modal.css';

const Layout = ({ onLogout, currentUser }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleToggleSidebar = () => {
        setIsSidebarCollapsed((prev) => !prev);
    };

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
    };

    const handleConfirmLogout = () => {
        setIsLogoutModalOpen(false);
        if (onLogout) onLogout();
    };

    return (
        <div className="app-layout">
            <Sidebar
                onLogout={handleLogoutClick}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
                userRole={currentUser?.role || 'viewer'}
                user={currentUser}
            />
            <div className="main-content">
                <div className="main-scroll-area custom-scrollbar">
                    <Outlet context={{ currentUser }} />
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <Dialog.Root open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content dialog-content-sm">
                        <div className="dialog-header">
                            <Dialog.Title className="dialog-title">Confirm Logout</Dialog.Title>
                            <Dialog.Close asChild>
                                <button type="button" className="dialog-close" aria-label="Close">
                                    <FiX size={16} />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="dialog-body">
                            <div className="logout-modal-content">
                                <div className="logout-modal-icon">
                                    <FiLogOut size={24} />
                                </div>
                                <p className="logout-modal-message">
                                    Are you sure you want to logout?
                                </p>
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setIsLogoutModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-destructive"
                                onClick={handleConfirmLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <style>{`
                .logout-modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 1rem 0;
                }

                .logout-modal-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(239, 68, 68, 0.15);
                    color: #F87171;
                    border-radius: 50%;
                    margin-bottom: 1rem;
                }

                .logout-modal-message {
                    color: var(--foreground);
                    font-size: 0.9375rem;
                    margin: 0;
                }
            `}</style>
        </div>
    );
};

export default Layout;
