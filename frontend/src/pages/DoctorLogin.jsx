import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function DoctorLogin() {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '', specialization: '', hospital: '' })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const endpoint = mode === 'login' ? '/api/hospital/doctor/login' : '/api/hospital/doctor/register'
            const payload = mode === 'login'
                ? { email: form.email, password: form.password }
                : { name: form.name, email: form.email, password: form.password, specialization: form.specialization, hospital: form.hospital }

            const res = await axios.post(endpoint, payload)
            localStorage.setItem('doctor_token', res.data.token)
            localStorage.setItem('doctor_info', JSON.stringify(res.data.doctor))
            toast.success(res.data.message)
            navigate('/doctor')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong')
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
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: '1.6rem', background: 'linear-gradient(135deg,#00c2ff,#7c3aed)' }}>🩺</div>
                    <h1 className="auth-title">{mode === 'login' ? 'Doctor Login' : 'Doctor Registration'}</h1>
                    <p className="auth-subtitle">{mode === 'login' ? 'Access your doctor portal' : 'Create your doctor account'}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" type="text" placeholder="Dr. John Smith" required className="input" value={form.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Specialization</label>
                                <input name="specialization" type="text" placeholder="e.g. General Physician, Cardiologist" required className="input" value={form.specialization} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Hospital / Clinic (optional)</label>
                                <input name="hospital" type="text" placeholder="City Hospital" className="input" value={form.hospital} onChange={handleChange} />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" placeholder="doctor@hospital.com" required className="input" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" placeholder="••••••••" required className="input" value={form.password} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
                        {loading
                            ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Please wait...</>
                            : mode === 'login' ? '🔐 Sign In as Doctor' : '✅ Register as Doctor'
                        }
                    </button>
                </form>

                <div className="auth-divider" />
                <button className="btn-ghost" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    {mode === 'login' ? '➕ Register as Doctor' : '← Back to Login'}
                </button>
            </motion.div>
        </div>
    )
}
