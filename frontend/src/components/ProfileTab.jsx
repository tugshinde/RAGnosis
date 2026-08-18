import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import FormField from './FormField'
import { useForm } from '../lib/useForm'
import {
    BLOOD_GROUP_OPTIONS, GENDER_OPTIONS,
    validateName, validateMobile, validateAge, validateHeight, validateWeight,
    validateBloodPressure, validateBloodGroup, validatePassword,
    validatePasswordPresent, confirmPasswordMatches,
} from '../lib/validation'

/** Maps the account returned by the API onto form values, since inputs need strings. */
const toFormValues = (user) => ({
    name: user?.name ?? '',
    mobile: user?.mobile ?? '',
    age: user?.age ?? '',
    gender: user?.gender || 'Male',
    height_inches: user?.height_inches ?? '',
    weight_kg: user?.weight_kg ?? '',
    blood_pressure: user?.blood_pressure ?? '',
    blood_group: user?.blood_group ?? '',
})

function ProfileDetailsForm({ user, onSaved }) {
    const form = useForm(toFormValues(user), {
        name: validateName,
        mobile: validateMobile,
        age: validateAge,
        height_inches: validateHeight,
        weight_kg: validateWeight,
        blood_pressure: validateBloodPressure,
        blood_group: validateBloodGroup,
    })

    // Comparing against the saved account keeps Save disabled until something actually
    // changed, so the button is honest about whether pressing it will do anything.
    const saved = toFormValues(user)
    const isDirty = Object.keys(saved).some(key => String(form.values[key]) !== String(saved[key]))

    const submit = form.handleSubmit(async (values) => {
        try {
            const res = await axios.patch('/api/auth/me', {
                name: values.name.trim(),
                mobile: values.mobile.trim(),
                age: Number(values.age),
                gender: values.gender,
                height_inches: Number(values.height_inches),
                // Omitted entirely when blank: the API reads null as "leave unchanged", and
                // there is no numeric equivalent of the empty-string clear.
                ...(values.weight_kg === '' ? {} : { weight_kg: Number(values.weight_kg) }),
                // Empty string is an explicit clear for these two.
                blood_pressure: values.blood_pressure.trim(),
                blood_group: values.blood_group.trim().toUpperCase(),
            })
            // The API is the source of truth for what was stored — echo its version back,
            // not the values we happened to send.
            onSaved(res.data.user ?? res.data)
            toast.success('Profile updated.')
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not save your profile.')
        }
    })

    return (
        <form onSubmit={submit} noValidate className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div aria-hidden="true" style={{
                    width: 56, height: 56, flexShrink: 0, background: 'var(--gradient-cyan)',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', fontWeight: 900, color: '#060d1f',
                }}>
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user?.name}</h3>
                    {/* Email identifies the account and is not editable here. */}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {user?.email}
                    </p>
                </div>
            </div>

            <div className="form-grid">
                <FormField
                    label="Full name" required autoComplete="name" wrapperClassName="span-2"
                    {...form.fieldProps('name')}
                />
                <FormField
                    label="Mobile number" type="tel" required autoComplete="tel"
                    inputMode="numeric" maxLength={10}
                    hint="10 digits, starting with 6, 7, 8 or 9."
                    {...form.fieldProps('mobile')}
                    onChange={(e) => form.setValue('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                <FormField label="Gender" required options={GENDER_OPTIONS} {...form.fieldProps('gender')} />
                <FormField label="Age" type="number" required min={1} max={120} {...form.fieldProps('age')} />
                <FormField label="Height (inches)" type="number" required min={20} max={100} {...form.fieldProps('height_inches')} />
                <FormField label="Weight (kg)" type="number" min={2} max={400} {...form.fieldProps('weight_kg')} />
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

            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" disabled={form.submitting || !isDirty}>
                    {form.submitting
                        ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
                        : 'Save changes'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => form.reset(saved)} disabled={!isDirty}>
                    Discard changes
                </button>
            </div>
        </form>
    )
}

function ChangePasswordForm() {
    const [open, setOpen] = useState(false)

    const form = useForm(
        { current_password: '', new_password: '', confirm_password: '' },
        {
            current_password: validatePasswordPresent,
            new_password: validatePassword,
            confirm_password: (value, values) => confirmPasswordMatches(values.new_password)(value),
        }
    )

    const submit = form.handleSubmit(async (values) => {
        try {
            await axios.post('/api/auth/change-password', {
                current_password: values.current_password,
                new_password: values.new_password,
            })
            toast.success('Password changed.')
            form.reset()
            setOpen(false)
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not change your password.')
        }
    })

    if (!open) {
        return (
            <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Password</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Changing your password signs you out of other devices the next time they refresh.
                </p>
                <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
                    Change password
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={submit} noValidate className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Change password</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField
                    label="Current password" type="password" required autoComplete="current-password"
                    {...form.fieldProps('current_password')}
                />
                <FormField
                    label="New password" type="password" required autoComplete="new-password"
                    hint="At least 8 characters, including a letter and a number."
                    {...form.fieldProps('new_password')}
                />
                <FormField
                    label="Confirm new password" type="password" required autoComplete="new-password"
                    {...form.fieldProps('confirm_password')}
                />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" disabled={form.submitting}>
                    {form.submitting ? 'Updating…' : 'Update password'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => { form.reset(); setOpen(false) }}>
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default function ProfileTab() {
    const { user, updateUser } = useAuth()

    return (
        <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.5rem' }}>My profile</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
                Keep these details current — your reports are interpreted against them.
            </p>

            {/* Remounts when the account changes so the form re-seeds from the saved values. */}
            <ProfileDetailsForm key={user?._id ?? 'profile'} user={user} onSaved={updateUser} />
            <ChangePasswordForm />
        </div>
    )
}
