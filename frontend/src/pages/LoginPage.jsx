import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuth, homeFor } from '../context/AuthContext'
import FormField from '../components/FormField'
import { useForm } from '../lib/useForm'
import { validateIdentifier, validatePasswordPresent } from '../lib/validation'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const form = useForm(
        { identifier: '', password: '' },
        {
            identifier: validateIdentifier,
            // Sign-in only checks a password was typed. Applying the signup strength rules
            // here would lock out anyone whose account predates them.
            password: validatePasswordPresent,
        }
    )

    const submit = form.handleSubmit(async (values) => {
        try {
            // The API takes either an email address or a mobile number in its `email` field.
            const res = await axios.post('/api/auth/login', {
                email: values.identifier.trim(),
                password: values.password,
            })
            login(res.data.token, res.data.user)
            toast.success(res.data.message)

            // The credentials already establish the role, so the destination follows from the
            // response rather than from the user having picked a portal beforehand.
            navigate(homeFor(res.data.user?.role), { replace: true })
        } catch (err) {
            const status = err.response?.status
            toast.error(
                status === 429
                    ? 'Too many attempts. Please wait a minute and try again.'
                    : err.response?.data?.message || err.response?.data?.error || 'Sign in failed.'
            )
        }
    })

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
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">
                        Sign in with your email or mobile number — patients and hospital staff use the same form.
                    </p>
                </div>

                <form onSubmit={submit} id="login-form" noValidate
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FormField
                        label="Email or mobile number"
                        required
                        autoComplete="username"
                        placeholder="name@example.com or 9876543210"
                        {...form.fieldProps('identifier')}
                    />
                    <FormField
                        label="Password"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...form.fieldProps('password')}
                    />

                    <button
                        type="submit"
                        className="btn-primary"
                        id="login-submit"
                        disabled={form.submitting}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 8 }}
                    >
                        {form.submitting
                            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</>
                            : 'Sign in'}
                    </button>
                </form>

                <div className="auth-divider">New to RAGnosis?</div>
                <Link to="/register" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Create a patient account
                </Link>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 14 }}>
                    Hospital staff — <Link to="/register/staff" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        register a doctor or receptionist account
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
