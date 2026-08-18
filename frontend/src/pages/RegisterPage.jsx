import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import FormField from '../components/FormField'
import { useForm } from '../lib/useForm'
import {
    BLOOD_GROUP_OPTIONS, GENDER_OPTIONS,
    validateName, validateEmail, validateMobile, validatePassword, confirmPasswordMatches,
    validateAge, validateHeight, validateWeight, validateBloodPressure, validateBloodGroup,
} from '../lib/validation'

const INITIAL = {
    name: '', email: '', mobile: '', password: '', confirm_password: '',
    age: '', height_inches: '', weight_kg: '',
    blood_pressure: '', blood_group: '', gender: 'Male',
}

export default function RegisterPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const form = useForm(INITIAL, {
        name: validateName,
        email: validateEmail,
        mobile: validateMobile,
        password: validatePassword,
        // Cross-field: reads the live password from the second argument rather than closing
        // over `form`, which is not assigned yet while useForm runs its first validation.
        confirm_password: (value, values) => confirmPasswordMatches(values.password)(value),
        age: validateAge,
        height_inches: validateHeight,
        weight_kg: validateWeight,
        blood_pressure: validateBloodPressure,
        blood_group: validateBloodGroup,
    })

    const submit = form.handleSubmit(async (values) => {
        try {
            const res = await axios.post('/api/auth/register', {
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                mobile: values.mobile.trim(),
                password: values.password,
                gender: values.gender,
                age: Number(values.age),
                height_inches: Number(values.height_inches),
                weight_kg: values.weight_kg ? Number(values.weight_kg) : undefined,
                blood_pressure: values.blood_pressure.trim() || undefined,
                blood_group: values.blood_group.trim().toUpperCase() || undefined,
            })
            login(res.data.token, res.data.user)
            toast.success(res.data.message)
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Registration failed.')
        }
    })

    return (
        <div className="auth-page">
            <div className="orb orb-cyan" style={{ width: 500, height: 500, top: -200, left: -200 }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, bottom: -150, right: -100 }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="auth-card"
                style={{ maxWidth: 620 }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: '1.3rem' }}>R</div>
                    <h1 className="auth-title">Create your account</h1>
                    <p className="auth-subtitle">Join RAGnosis and get AI-powered health insights</p>
                </div>

                {/* noValidate hands validation to the app: the browser's own bubbles cannot be
                    styled, are inconsistent across engines, and vanish on the next click. */}
                <form onSubmit={submit} id="register-form" noValidate>
                    <fieldset style={{ border: 'none', marginBottom: 8 }}>
                        <legend className="form-section-title">Account</legend>
                        <div className="form-grid">
                            <FormField
                                label="Full name" required autoComplete="name"
                                placeholder="Riya Sharma" wrapperClassName="span-2"
                                {...form.fieldProps('name')}
                            />
                            <FormField
                                label="Email address" type="email" required autoComplete="email"
                                placeholder="riya@example.com" wrapperClassName="span-2"
                                {...form.fieldProps('email')}
                            />
                            <FormField
                                label="Mobile number" type="tel" required autoComplete="tel"
                                inputMode="numeric" maxLength={10} placeholder="9876543210"
                                hint="10 digits, starting with 6, 7, 8 or 9."
                                {...form.fieldProps('mobile')}
                                onChange={(e) => form.setValue('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            />
                            <FormField
                                label="Gender" required options={GENDER_OPTIONS}
                                {...form.fieldProps('gender')}
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
                        </div>
                    </fieldset>

                    <fieldset style={{ border: 'none' }}>
                        <legend className="form-section-title">Medical profile</legend>
                        <div className="form-grid">
                            <FormField
                                label="Age" type="number" required inputMode="numeric"
                                min={1} max={120} placeholder="25"
                                {...form.fieldProps('age')}
                            />
                            <FormField
                                label="Height (inches)" type="number" required
                                min={20} max={100} placeholder="65"
                                {...form.fieldProps('height_inches')}
                            />
                            <FormField
                                label="Weight (kg)" type="number"
                                min={2} max={400} placeholder="60"
                                {...form.fieldProps('weight_kg')}
                            />
                            <FormField
                                label="Blood group"
                                options={[{ value: '', label: 'Select…' }, ...BLOOD_GROUP_OPTIONS]}
                                {...form.fieldProps('blood_group')}
                            />
                            <FormField
                                label="Blood pressure" placeholder="120/80" wrapperClassName="span-2"
                                hint="Optional — systolic over diastolic."
                                {...form.fieldProps('blood_pressure')}
                            />
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        className="btn-primary"
                        id="register-submit"
                        disabled={form.submitting}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '14px', fontSize: '1rem' }}
                    >
                        {form.submitting
                            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account…</>
                            : 'Create account'}
                    </button>
                </form>

                <div className="auth-divider">Already have an account?</div>
                <Link to="/login" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Sign in instead
                </Link>
            </motion.div>
        </div>
    )
}
