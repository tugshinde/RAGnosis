import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

const FIELDS = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Riya Sharma', required: true },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'riya@example.com', required: true },
    { name: 'mobile', label: 'Mobile Number', type: 'tel', placeholder: '9876543210', required: true },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
    { name: 'age', label: 'Age (years)', type: 'number', placeholder: '25', required: true },
    { name: 'height_inches', label: 'Height (inches)', type: 'number', placeholder: '65', required: true },
    { name: 'weight_kg', label: 'Weight (kg)', type: 'number', placeholder: '60', required: false },
    { name: 'blood_pressure', label: 'Blood Pressure (optional)', type: 'text', placeholder: '120/80', required: false },
    { name: 'blood_group', label: 'Blood Group (optional)', type: 'text', placeholder: 'O+', required: false },
]

export default function RegisterPage() {
    const [form, setForm] = useState({ gender: 'Male' })
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await axios.post('/api/auth/register', {
                ...form,
                age: Number(form.age),
                height_inches: Number(form.height_inches),
                weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
            })
            login(res.data.token, res.data.user)
            toast.success(res.data.message)
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="orb orb-cyan" style={{ width: 500, height: 500, top: -200, left: -200 }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, bottom: -150, right: -100 }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="auth-card"
                style={{ maxWidth: 560 }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: '1.3rem' }}>R</div>
                    <h1 className="auth-title">Create Your Account</h1>
                    <p className="auth-subtitle">Join RAGnosis and get AI-powered health insights</p>
                </div>

                <form onSubmit={handleSubmit} id="register-form">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {FIELDS.map(f => (
                            <div key={f.name} className="form-group" style={f.name === 'name' || f.name === 'email' || f.name === 'password' ? { gridColumn: '1/-1' } : {}}>
                                <label htmlFor={f.name}>{f.label}{f.required && <span style={{ color: 'var(--accent-red)' }}> *</span>}</label>
                                <input
                                    id={f.name}
                                    name={f.name}
                                    type={f.type}
                                    placeholder={f.placeholder}
                                    required={f.required}
                                    className="input"
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                        <div className="form-group">
                            <label htmlFor="gender">Gender <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                            <select id="gender" name="gender" className="input" onChange={handleChange} value={form.gender || 'Male'}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        id="register-submit"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '14px', fontSize: '1rem' }}
                    >
                        {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Registering...</> : '🩺 Create Account'}
                    </button>
                </form>

                <div className="auth-divider">Already have an account?</div>
                <Link to="/login" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Sign In Instead
                </Link>
            </motion.div>
        </div>
    )
}
