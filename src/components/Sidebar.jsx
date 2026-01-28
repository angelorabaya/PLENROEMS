import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import plenroLogo from '../plenro.png';
import {
    FiSettings,
    FiDatabase,
    FiFileText,
    FiActivity,
    FiLogOut,
    FiHome,
    FiUsers,
    FiLayers,
    FiClipboard,
    FiUserCheck,
    FiFilePlus,
    FiClock,
    FiBarChart2,
    FiCreditCard,
    FiTruck,
    FiInbox,
    FiSend,
    FiSearch,
    FiList,
    FiChevronRight,
    FiChevronLeft,
    FiPieChart,
    FiMessageSquare,
    FiPackage,
    FiShield,
} from 'react-icons/fi';
import '../styles/layout.css';

// Custom Philippine Peso icon component
const PesoIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em">
        <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="currentColor"
        >
            ₱
        </text>
    </svg>
);

const Sidebar = ({ onLogout, isCollapsed, onToggleCollapse, userRole, user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const isActive = (path) => location.pathname === path;

    const isAdmin = useMemo(() => {
        if (!user) return false;

        const role = user.role?.toLowerCase() || '';
        const username = user.log_user?.toLowerCase()?.trim() || '';
        const access = user.log_access;

        // Check various admin conditions
        // 1. role is 'admin' (legacy/default)
        // 2. username is 'admin'
        // 3. log_access is 1 (standard admin flag) or '1'
        return role === 'admin' || username === 'admin' || access == 1;
    }, [user]);

    // NavItem Component
    const NavItem = ({ to, icon: Icon, children }) => {
        const active = isActive(to);

        return (
            <button className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(to)}>
                <span
                    className="nav-item-icon-wrapper"
                    data-tooltip={isCollapsed ? children : undefined}
                >
                    <Icon className="nav-item-icon" size={16} />
                </span>
                {!isCollapsed && <span className="nav-item-text">{children}</span>}
            </button>
        );
    };

    // NavSection Component (collapsible)
    const NavSection = ({ title, id, icon: Icon, children }) => {
        const isExpanded = expandedSection === id;

        return (
            <div className={`nav-section ${isExpanded ? 'open' : ''}`}>
                <button
                    className={`nav-section-header ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleSection(id)}
                >
                    <span className="nav-section-left">
                        <span
                            className="nav-section-icon-wrapper"
                            data-tooltip={isCollapsed ? title : undefined}
                        >
                            <Icon className="nav-section-icon" size={16} />
                        </span>
                        {!isCollapsed && <span className="nav-section-title">{title}</span>}
                    </span>
                    {!isCollapsed && <FiChevronRight className="nav-section-chevron" size={16} />}
                </button>
                {!isCollapsed && <div className="nav-section-items">{children}</div>}
            </div>
        );
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            {/* Logo/Brand Section */}
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="sidebar-logo-wrapper">
                        <img src={plenroLogo} alt="PLENRO Logo" className="sidebar-logo" />
                    </div>
                    {!isCollapsed && <span className="sidebar-title">PLENRO EMS</span>}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation Sections */}
            <nav className="sidebar-nav">
                {/* Home - Top Level Menu */}
                <NavItem to="/home" icon={FiHome}>
                    Home
                </NavItem>

                {/* Ordinance Bot - Right after Home */}
                <NavItem to="/ordinance-bot" icon={FiMessageSquare}>
                    Ordinance Bot
                </NavItem>

                <NavSection title="Master Data" id="master-data" icon={FiSettings}>
                    <NavItem to="/clients" icon={FiUsers}>
                        Clients
                    </NavItem>
                    <NavItem to="/permittypes" icon={FiLayers}>
                        Permit Type
                    </NavItem>
                    <NavItem to="/permitreqs" icon={FiClipboard}>
                        Permit Requirements
                    </NavItem>
                    <NavItem to="/commodity" icon={FiPackage}>
                        Commodity
                    </NavItem>
                    <NavItem to="/nature-of-payment" icon={FiCreditCard}>
                        Nature of Payment
                    </NavItem>
                </NavSection>

                <NavSection title="Mining Management" id="mining" icon={FiDatabase}>
                    <NavItem to="/holder" icon={FiUserCheck}>
                        Permit Holder
                    </NavItem>
                    <NavItem to="/newapp" icon={FiFilePlus}>
                        New Application
                    </NavItem>
                    <NavItem to="/assessment" icon={PesoIcon}>
                        Assessment of Payment
                    </NavItem>
                    <NavItem to="/assessment-history" icon={FiClock}>
                        Assessment History
                    </NavItem>
                    <NavItem to="/production-audit" icon={FiBarChart2}>
                        Production Audit
                    </NavItem>
                    <NavItem to="/transactions" icon={FiCreditCard}>
                        Client Transactions
                    </NavItem>
                    <NavItem to="/vehicle" icon={FiTruck}>
                        Vehicle Registration
                    </NavItem>
                    <NavItem to="/delivery-receipts" icon={FiActivity}>
                        Delivery Receipts
                    </NavItem>
                    <NavItem to="/taskforce" icon={FiShield}>
                        Task Force
                    </NavItem>
                </NavSection>

                <NavSection title="Document Tracking" id="doctracking" icon={FiFileText}>
                    <NavItem to="/doc-receiving" icon={FiInbox}>
                        Document Receiving
                    </NavItem>
                    <NavItem to="/doc-outgoing" icon={FiSend}>
                        Document Outgoing
                    </NavItem>
                    <NavItem to="/doc-probing" icon={FiSearch}>
                        Document Probing
                    </NavItem>
                </NavSection>

                <NavSection title="Reports" id="reports" icon={FiPieChart}>
                    <NavItem to="/reports-hub" icon={FiBarChart2}>
                        Reports Hub
                    </NavItem>
                    <NavItem to="/daily-collection" icon={FiFileText}>
                        Daily Collection
                    </NavItem>
                </NavSection>

                {isAdmin && (
                    <NavSection title="System" id="system" icon={FiActivity}>
                        <NavItem to="/activitylogs" icon={FiList}>
                            Audit Logs
                        </NavItem>
                    </NavSection>
                )}
            </nav>

            {/* Logout Section */}
            <div className="sidebar-footer">
                <button
                    type="button"
                    className="logout-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onLogout) onLogout();
                    }}
                >
                    <span
                        className="logout-icon-wrapper"
                        data-tooltip={isCollapsed ? 'Logout' : undefined}
                    >
                        <FiLogOut size={16} />
                    </span>
                    {!isCollapsed && (
                        <span className="logout-btn-text" title="Logout">
                            {user?.log_cname || 'Logout'}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
