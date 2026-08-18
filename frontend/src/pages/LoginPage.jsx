import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

export default function LoginPage() {
    const [form, setForm] = useState({ identifier: '', password: '' })
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await axios.post('/api/auth/login', { email: form.identifier, password: form.password })
            login(res.data.token, res.data.user)
            toast.success(res.data.message)
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="orb orb-cyan" style={{ width: 500, height: 500, top: -200, right: -100 }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, bottom: -150, left: -100 }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="auth-card"
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: '1.3rem' }}>R</div>
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Sign in with your email or mobile number</p>
                </div>

                <form onSubmit={handleSubmit} id="login-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label htmlFor="identifier">Email or Mobile Number</label>
                        <input
                            id="identifier"
                            name="identifier"
                            type="text"
                            placeholder="email@example.com or 9876543210"
                            required
                            className="input"
                            value={form.identifier}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            className="input"
                            value={form.password}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        id="login-submit"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 8 }}
                    >
                        {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : '🔐 Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 20, padding: 16, background: 'var(--accent-cyan-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        💡 You can sign in with either your <strong>email address</strong> or <strong>10-digit mobile number</strong>
                    </p>
                </div>

                <div className="auth-divider">New to RAGnosis?</div>
                <Link to="/register" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Create Account
                </Link>
            </motion.div>
        </div>
    )
}
