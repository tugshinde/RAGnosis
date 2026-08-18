import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuth, homeFor } from '../context/AuthContext'
import FormField from '../components/FormField'
import { useForm } from '../lib/useForm'
import { validateName, validateEmail, validatePassword, confirmPasswordMatches, required } from '../lib/validation'

/**
 * Registration for hospital staff.
 *
 * Only registration lives here — signing in happens on the one shared /login form, because
 * the API reports the role and the app can route on that. Previously each role had its own
 * combined login/register page, which meant three separate sessions could be open at once.
 */
const ROLES = {
    doctor: {
        label: 'Doctor',
        icon: '🩺',
        endpoint: '/api/hospital/doctor/register',
        accountKey: 'doctor',
        fields: [
            { name: 'specialization', label: 'Specialization', placeholder: 'General Physician, Cardiologist…', required: true },
            { name: 'hospital', label: 'Hospital or clinic', placeholder: 'City Hospital', required: false },
        ],
    },
    receptionist: {
        label: 'Receptionist',
        icon: '🏥',
        endpoint: '/api/hospital/receptionist/register',
        accountKey: 'receptionist',
        fields: [
            {
                name: 'doctor_id', label: 'Doctor ID', placeholder: "Paste the doctor's ID here", required: true,
                hint: 'Ask your doctor for their ID — it is shown in the Doctor Portal sidebar.',
            },
        ],
    },
}

export default function StaffRegisterPage() {
    const [role, setRole] = useState('doctor')
    const { login } = useAuth()
    const navigate = useNavigate()

    const config = ROLES[role]

    const form = useForm(
        {
            name: '', email: '', password: '', confirm_password: '',
            specialization: '', hospital: '', doctor_id: '',
        },
        {
            name: validateName,
            email: validateEmail,
            password: validatePassword,
            confirm_password: (value, values) => confirmPasswordMatches(values.password)(value),
            // Only the currently selected role's fields are required — switching role must not
            // leave the form blocked by a field that is no longer on screen.
            specialization: (value) => (role === 'doctor' ? required('Specialization')(value) : null),
            doctor_id: (value) => (role === 'receptionist' ? required('Doctor ID')(value) : null),
        }
    )

    const submit = form.handleSubmit(async (values) => {
        try {
            const payload = {
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password,
                ...Object.fromEntries(
                    config.fields.map(f => [f.name, values[f.name]?.trim() || undefined])
                ),
            }

            const res = await axios.post(config.endpoint, payload)

            login(res.data.token, res.data[config.accountKey])
            toast.success(res.data.message)
            navigate(homeFor(role), { replace: true })
        } catch (err) {
            const status = err.response?.status
            toast.error(
                status === 429
                    ? 'Too many attempts. Please wait a minute and try again.'
                    : err.response?.data?.message || err.response?.data?.error || 'Registration failed.'
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
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div className="logo-icon" style={{
                        margin: '0 auto 16px', width: 56, height: 56, fontSize: '1.6rem',
                        background: 'linear-gradient(135deg,#00c2ff,#7c3aed)',
                    }}>
                        {config.icon}
                    </div>
                    <h1 className="auth-title">Staff registration</h1>
                    <p className="auth-subtitle">Create a hospital account, then sign in on the main form.</p>
                </div>

                {/* radiogroup rather than buttons: this is a choice between options, and the
                    role genuinely changes which fields below are required. */}
                <div className="role-toggle" role="radiogroup" aria-label="Account type">
                    {Object.entries(ROLES).map(([key, value]) => (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={role === key}
                            className={`role-toggle-option ${role === key ? 'is-selected' : ''}`}
                            onClick={() => setRole(key)}
                        >
                            <span aria-hidden="true">{value.icon}</span> {value.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <FormField
                        label="Full name" required autoComplete="name"
                        placeholder={role === 'doctor' ? 'Dr. Asha Rao' : 'Front Desk'}
                        {...form.fieldProps('name')}
                    />

                    {config.fields.map(field => (
                        <FormField
                            key={field.name}
                            label={field.label}
                            required={field.required}
                            placeholder={field.placeholder}
                            hint={field.hint}
                            {...form.fieldProps(field.name)}
                        />
                    ))}

                    <FormField
                        label="Email address" type="email" required autoComplete="email"
                        placeholder={role === 'doctor' ? 'doctor@hospital.com' : 'reception@hospital.com'}
                        {...form.fieldProps('email')}
                    />
                    <FormField
                        label="Password" type="password" required autoComplete="new-password"
                        placeholder="••••••••"
                        hint="At least 8 characters, including a letter and a number."
                        {...form.fieldProps('password')}
                    />
                    <FormField
                        label="Confirm password" type="password" required autoComplete="new-password"
                        placeholder="••••••••"
                        {...form.fieldProps('confirm_password')}
                    />

                    <button type="submit" className="btn-primary" disabled={form.submitting}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
                        {form.submitting
                            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account…</>
                            : `Register as ${config.label}`}
                    </button>
                </form>

                <div className="auth-divider">Already have an account?</div>
                <Link to="/login" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Sign in
                </Link>
            </motion.div>
        </div>
    )
}
