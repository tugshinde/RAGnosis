import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const ROLE_LABEL = {
    patient: 'Patient',
    doctor: 'Doctor',
    receptionist: 'Receptionist',
    admin: 'Admin',
}

export default function Navbar() {
    const { user, role, home, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        toast.success('Logged out')
        navigate('/', { replace: true })
    }

    const isActive = (path) => (location.pathname === path ? 'active' : '')

    return (
        <nav className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon">R</div>
                    <span>RAG<span className="gradient-text">nosis</span></span>
                </Link>

                <ul className="navbar-links">
                    <li><Link to="/" className={isActive('/')}>Home</Link></li>
                    <li><Link to="/system" className={isActive('/system')}>How It Works</Link></li>
                    {/* Points at whichever dashboard belongs to this role, rather than always
                        the patient one — a doctor's "Dashboard" link used to lead nowhere useful. */}
                    {user && <li><Link to={home} className={isActive(home)}>Dashboard</Link></li>}
                </ul>

                <div className="navbar-actions">
                    {user ? (
                        <>
                            {/* Shows who is actually signed in. There is one session now, so this
                                can no longer display a patient's name while staff pages are open. */}
                            <span className="navbar-identity">
                                <span className="navbar-identity-name">{user.name?.split(' ')[0]}</span>
                                {role && <span className="navbar-identity-role">{ROLE_LABEL[role] ?? role}</span>}
                            </span>
                            <button className="btn-ghost" onClick={handleLogout}
                                style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            {/* No portal picker: one form authenticates every role. */}
                            <Link to="/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                Sign in
                            </Link>
                            <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                                Get started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
