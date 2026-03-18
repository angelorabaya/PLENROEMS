import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BackgroundShapes from './components/BackgroundShapes';
import { ThemeProvider } from './context/ThemeContext';
import { getTodayPHT } from './utils/dateUtils';

const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Clients = lazy(() => import('./pages/Clients'));
const EmployeeDirectory = lazy(() => import('./pages/EmployeeDirectory'));
const PermitTypes = lazy(() => import('./pages/PermitTypes'));
const PermitReqs = lazy(() => import('./pages/PermitReqs'));
const Commodity = lazy(() => import('./pages/Commodity'));
const NatureOfPayment = lazy(() => import('./pages/NatureOfPayment'));
const AssessmentHistory = lazy(() => import('./pages/AssessmentHistory'));
const ClientTransactions = lazy(() => import('./pages/ClientTransactions'));
const VehicleRegistration = lazy(() => import('./pages/VehicleRegistration'));
const PermitHolder = lazy(() => import('./pages/PermitHolder'));
const NewApplication = lazy(() => import('./pages/NewApplication'));
const NewApplicationPreview = lazy(() => import('./pages/NewApplicationPreview'));
const Assessment = lazy(() => import('./pages/Assessment'));
const AssessmentPreview = lazy(() => import('./pages/AssessmentPreview'));
const AssessmentShare = lazy(() => import('./pages/AssessmentShare'));
const ProductionAudit = lazy(() => import('./pages/ProductionAudit'));
const DeliveryReceipts = lazy(() => import('./pages/DeliveryReceipts'));
const TaskForce = lazy(() => import('./pages/TaskForce'));
const ProductionAuditPreview = lazy(() => import('./pages/ProductionAuditPreview'));
const DocumentReceiving = lazy(() => import('./pages/DocumentReceiving'));
const DocumentOutgoing = lazy(() => import('./pages/DocumentOutgoing'));
const DocumentProbing = lazy(() => import('./pages/DocumentProbing'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const ReportsHub = lazy(() => import('./pages/ReportsHub'));
const ComparativeIncomeReport = lazy(() => import('./pages/ComparativeIncomeReport'));
const RevenueCollectionReport = lazy(() => import('./pages/RevenueCollectionReport'));
const BarangayShareReport = lazy(() => import('./pages/BarangayShareReport'));
const BarangayShareBreakdown = lazy(() => import('./pages/BarangayShareBreakdown'));
const MunicipalShareReport = lazy(() => import('./pages/MunicipalShareReport'));
const ActivePermitteesReport = lazy(() => import('./pages/ActivePermitteesReport'));
const ActivePermitteesByMunicipalityReport = lazy(
    () => import('./pages/ActivePermitteesByMunicipalityReport')
);
const TaskForceMonthly = lazy(() => import('./pages/TaskForceMonthly'));
const DailyCollection = lazy(() => import('./pages/DailyCollection'));
const TaskForceActivityLog = lazy(() => import('./pages/TaskForceActivityLog'));
const PersonnelTravelLogs = lazy(() => import('./pages/PersonnelTravelLogs'));
const TravelAuthorization = lazy(() => import('./pages/TravelAuthorization'));
const EmployeeLeavePortal = lazy(() => import('./pages/EmployeeLeavePortal'));
const OrdinanceBot = lazy(() => import('./pages/OrdinanceBot'));

const CURRENT_USER_KEY = 'currentUser';
const CURRENT_USER_LOGIN_DATE_KEY = 'currentUserLoginDate';

const RouteLoadingFallback = () => (
    <div
        style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted-foreground, #64748b)',
            fontSize: '0.95rem',
            letterSpacing: '0.02em',
        }}
    >
        Loading page...
    </div>
);

const getTodayDateKey = () => getTodayPHT();

const getStoredCurrentUser = () => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (!saved) return null;

    const loginDate = localStorage.getItem(CURRENT_USER_LOGIN_DATE_KEY);
    const today = getTodayDateKey();

    // Expire login when it's not from the current date.
    if (!loginDate || loginDate !== today) {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(CURRENT_USER_LOGIN_DATE_KEY);
        return null;
    }

    try {
        return JSON.parse(saved);
    } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(CURRENT_USER_LOGIN_DATE_KEY);
        return null;
    }
};

function App() {
    // Load user from localStorage on initial render
    const [currentUser, setCurrentUser] = useState(() => {
        return getStoredCurrentUser();
    });

    const handleLogin = (user) => {
        setCurrentUser(user);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem(CURRENT_USER_LOGIN_DATE_KEY, getTodayDateKey());
    };

    const handleLogout = () => {
        // Logout directly without confirmation (confirm dialogs can be blocked by browsers)
        setCurrentUser(null);
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(CURRENT_USER_LOGIN_DATE_KEY);
    };

    return (
        <ThemeProvider>
            <Router>
                <BackgroundShapes />
                <Suspense fallback={<RouteLoadingFallback />}>
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
                            <Route path="/employee-directory" element={<EmployeeDirectory />} />
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
                            <Route
                                path="/reports/barangay-share"
                                element={<BarangayShareReport />}
                            />
                            <Route
                                path="/reports/barangay-share-breakdown"
                                element={<BarangayShareBreakdown />}
                            />
                            <Route
                                path="/reports/municipal-share"
                                element={<MunicipalShareReport />}
                            />
                            <Route
                                path="/reports/active-permittees"
                                element={<ActivePermitteesReport />}
                            />
                            <Route
                                path="/reports/active-permittees-by-municipality"
                                element={<ActivePermitteesByMunicipalityReport />}
                            />
                            <Route
                                path="/reports/monthly-environmental-load-monitoring"
                                element={<TaskForceMonthly />}
                            />
                            <Route path="/daily-collection" element={<DailyCollection />} />
                            <Route
                                path="/taskforce-activity-log"
                                element={<TaskForceActivityLog />}
                            />
                            <Route
                                path="/personnel-travel-logs"
                                element={<PersonnelTravelLogs />}
                            />
                            <Route
                                path="/travel-authorization"
                                element={<TravelAuthorization />}
                            />
                            <Route
                                path="/leave-management"
                                element={<EmployeeLeavePortal />}
                            />

                            <Route path="/ordinance-bot" element={<OrdinanceBot />} />

                            <Route path="/" element={<Navigate to="/home" replace />} />
                        </Route>
                    </Routes>
                </Suspense>
            </Router>
        </ThemeProvider>
    );
}

export default App;
