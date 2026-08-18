import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/RegisterPage'
import StaffRegisterPage from './pages/StaffRegisterPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import SystemAnimation from './pages/SystemAnimation'
import DoctorDashboard from './pages/DoctorDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import { AuthProvider, useAuth, homeFor } from './context/AuthContext'

function FullPageSpinner() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
        </div>
    )
}

/**
 * Guards a route by authentication and, optionally, by role.
 *
 * The role check matters: without it a signed-in patient could reach /doctor by typing the
 * URL. The API would refuse the requests, but the user would be left staring at a broken
 * dashboard rather than being sent somewhere that works.
 */
function RequireAuth({ children, roles }) {
    const { user, loading, role } = useAuth()

    if (loading) return <FullPageSpinner />
    if (!user) return <Navigate to="/login" replace />
    if (roles && !roles.includes(role)) return <Navigate to={homeFor(role)} replace />

    return children
}

/** Sends an already-signed-in visitor to their own dashboard instead of a login form. */
function RedirectIfAuthenticated({ children }) {
    const { user, loading, role } = useAuth()

    if (loading) return <FullPageSpinner />
    return user ? <Navigate to={homeFor(role)} replace /> : children
}

function AppRoutes() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/system" element={<SystemAnimation />} />

                {/* One sign-in form for every role — the API reports which one. */}
                <Route path="/login" element={<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>} />
                <Route path="/register" element={<RedirectIfAuthenticated><RegisterPage /></RedirectIfAuthenticated>} />
                <Route path="/register/staff" element={<RedirectIfAuthenticated><StaffRegisterPage /></RedirectIfAuthenticated>} />

                <Route path="/dashboard/*" element={
                    <RequireAuth roles={['patient', 'admin']}><Dashboard /></RequireAuth>
                } />
                <Route path="/doctor" element={
                    <RequireAuth roles={['doctor']}><DoctorDashboard /></RequireAuth>
                } />
                <Route path="/receptionist" element={
                    <RequireAuth roles={['receptionist']}><ReceptionistDashboard /></RequireAuth>
                } />

                {/* The portals were separate sign-in pages until the roles were unified.
                    Kept as redirects so existing links and bookmarks still land somewhere useful. */}
                <Route path="/doctor/login" element={<Navigate to="/login" replace />} />
                <Route path="/receptionist/login" element={<Navigate to="/login" replace />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
