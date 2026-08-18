import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [portalOpen, setPortalOpen] = useState(false)

    const handleLogout = () => {
        logout()
        toast.success('Logged out successfully')
        navigate('/')
    }

    const isActive = (path) => location.pathname === path ? 'active' : ''

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
                    {user && <li><Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link></li>}
                </ul>

                <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                    {/* 🏥 Portals dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setPortalOpen(o => !o)}
                            className="btn-ghost"
                            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                            🏥 Portals <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{portalOpen ? '▲' : '▼'}</span>
                        </button>

                        {portalOpen && (
                            <>
                                {/* backdrop to close on outside click */}
                                <div onClick={() => setPortalOpen(false)}
                                    style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 99,
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    borderRadius: 14, padding: 8, minWidth: 210,
                                    boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
                                    display: 'flex', flexDirection: 'column', gap: 2,
                                }}>
                                    <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        Select Portal
                                    </div>
                                    {[
                                        { to: '/login', icon: '👤', label: 'Patient Login', color: '#00d4aa' },
                                        { to: '/doctor/login', icon: '🩺', label: 'Doctor Login', color: '#00c2ff' },
                                        { to: '/receptionist/login', icon: '🏥', label: 'Receptionist Login', color: '#a855f7' },
                                    ].map(item => (
                                        <Link key={item.to} to={item.to}
                                            onClick={() => setPortalOpen(false)}
                                            style={{ padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: item.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {item.icon} {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {user ? (
                        <>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                👋 {user.name?.split(' ')[0]}
                            </span>
                            <button className="btn-ghost" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Login</Link>
                            <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>Get Started</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
