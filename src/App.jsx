import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Clients from './pages/Clients';
import PermitTypes from './pages/PermitTypes';
import PermitReqs from './pages/PermitReqs';
import Commodity from './pages/Commodity';
import NatureOfPayment from './pages/NatureOfPayment';

import AssessmentHistory from './pages/AssessmentHistory';
import ClientTransactions from './pages/ClientTransactions';
import VehicleRegistration from './pages/VehicleRegistration';
import Placeholder from './components/Placeholder';
import Assessment from './pages/Assessment';
import AssessmentPreview from './pages/AssessmentPreview';
import AssessmentShare from './pages/AssessmentShare';
import NewApplication from './pages/NewApplication';
import NewApplicationPreview from './pages/NewApplicationPreview';
import ProductionAudit from './pages/ProductionAudit';
import PermitHolder from './pages/PermitHolder';
import ProductionAuditPreview from './pages/ProductionAuditPreview';
import DeliveryReceipts from './pages/DeliveryReceipts';
import DocumentReceiving from './pages/DocumentReceiving';
import DocumentOutgoing from './pages/DocumentOutgoing';
import DocumentProbing from './pages/DocumentProbing';
import ActivityLogs from './pages/ActivityLogs';
import ReportsHub from './pages/ReportsHub';
import ComparativeIncomeReport from './pages/ComparativeIncomeReport';
import RevenueCollectionReport from './pages/RevenueCollectionReport';
import BarangayShareReport from './pages/BarangayShareReport';
import MunicipalShareReport from './pages/MunicipalShareReport';
import ActivePermitteesReport from './pages/ActivePermitteesReport';
import BackgroundShapes from './components/BackgroundShapes';
import OrdinanceBot from './pages/OrdinanceBot';
import TaskForce from './pages/TaskForce';
import DailyCollection from './pages/DailyCollection';

import { ThemeProvider } from './context/ThemeContext';

function App() {
    // Load user from localStorage on initial render
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });

    const handleLogin = (user) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
    };

    const handleLogout = () => {
        // Logout directly without confirmation (confirm dialogs can be blocked by browsers)
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
    };

    return (
        <ThemeProvider>
            <Router>
                <BackgroundShapes />
                <Routes>
                    <Route
                        path="/login"
                        element={
                            !currentUser ? (
                                <Login onLogin={handleLogin} />
                            ) : (
                                <Navigate to="/home" replace />
                            )
                        }
                    />

                    <Route
                        element={
                            currentUser ? (
                                <Layout onLogout={handleLogout} currentUser={currentUser} />
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    >
                        <Route path="/home" element={<Home />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/permittypes" element={<PermitTypes />} />
                        <Route path="/permitreqs" element={<PermitReqs />} />
                        <Route path="/commodity" element={<Commodity />} />
                        <Route path="/nature-of-payment" element={<NatureOfPayment />} />
                        <Route path="/assessment-history" element={<AssessmentHistory />} />
                        <Route
                            path="/payment"
                            element={<Navigate to="/assessment-history" replace />}
                        />
                        <Route path="/transactions" element={<ClientTransactions />} />

                        <Route path="/vehicle" element={<VehicleRegistration />} />

                        <Route path="/holder" element={<PermitHolder />} />
                        <Route path="/newapp" element={<NewApplication />} />
                        <Route path="/newapp/preview" element={<NewApplicationPreview />} />
                        <Route path="/assessment" element={<Assessment />} />
                        <Route path="/assessment/preview" element={<AssessmentPreview />} />
                        <Route path="/assessment/share" element={<AssessmentShare />} />
                        <Route path="/production-audit" element={<ProductionAudit />} />
                        <Route path="/delivery-receipts" element={<DeliveryReceipts />} />
                        <Route path="/taskforce" element={<TaskForce />} />
                        <Route
                            path="/production-audit/preview"
                            element={<ProductionAuditPreview />}
                        />
                        <Route path="/doc-receiving" element={<DocumentReceiving />} />
                        <Route path="/doc-outgoing" element={<DocumentOutgoing />} />
                        <Route path="/doc-probing" element={<DocumentProbing />} />
                        <Route path="/activitylogs" element={<ActivityLogs />} />
                        <Route path="/reports-hub" element={<ReportsHub />} />
                        <Route
                            path="/reports/comparative-income"
                            element={<ComparativeIncomeReport />}
                        />
                        <Route
                            path="/reports/revenue-collection"
                            element={<RevenueCollectionReport />}
                        />
                        <Route path="/reports/barangay-share" element={<BarangayShareReport />} />
                        <Route path="/reports/municipal-share" element={<MunicipalShareReport />} />
                        <Route
                            path="/reports/active-permittees"
                            element={<ActivePermitteesReport />}
                        />
                        <Route
                            path="/daily-collection"
                            element={<DailyCollection />}
                        />

                        <Route path="/ordinance-bot" element={<OrdinanceBot />} />

                        <Route path="/" element={<Navigate to="/home" replace />} />
                    </Route>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
