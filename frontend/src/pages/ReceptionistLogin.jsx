import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function ReceptionistLogin() {
    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({ name: '', email: '', password: '', doctor_id: '' })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const endpoint = mode === 'login' ? '/api/hospital/receptionist/login' : '/api/hospital/receptionist/register'
            const payload = mode === 'login'
                ? { email: form.email, password: form.password }
                : { name: form.name, email: form.email, password: form.password, doctor_id: form.doctor_id }

            const res = await axios.post(endpoint, payload)
            localStorage.setItem('receptionist_token', res.data.token)
            localStorage.setItem('receptionist_info', JSON.stringify(res.data.receptionist))
            toast.success(res.data.message)
            navigate('/receptionist')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="orb orb-cyan" style={{ width: 500, height: 500, top: -200, left: -100 }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, bottom: -150, right: -100 }} />

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: '1.6rem', background: 'linear-gradient(135deg,#00d4aa,#7c3aed)' }}>🏥</div>
                    <h1 className="auth-title">{mode === 'login' ? 'Receptionist Login' : 'Receptionist Registration'}</h1>
                    <p className="auth-subtitle">{mode === 'login' ? 'Access your reception portal' : 'Create your receptionist account'}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" type="text" placeholder="Your full name" required className="input" value={form.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Doctor ID (from Doctor's profile)</label>
                                <input name="doctor_id" type="text" placeholder="Paste the Doctor's ID here" required className="input" value={form.doctor_id} onChange={handleChange} />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                                    💡 Ask your doctor for their ID from the Doctor Portal
                                </span>
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" placeholder="reception@hospital.com" required className="input" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" placeholder="••••••••" required className="input" value={form.password} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
                        {loading
                            ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Please wait...</>
                            : mode === 'login' ? '🔐 Sign In' : '✅ Register'
                        }
                    </button>
                </form>

                <div className="auth-divider" />
                <button className="btn-ghost" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    {mode === 'login' ? '➕ Register as Receptionist' : '← Back to Login'}
                </button>
            </motion.div>
        </div>
    )
}
