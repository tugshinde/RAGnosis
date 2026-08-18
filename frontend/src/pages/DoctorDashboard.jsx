import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

// Axios instance with doctor token
function doctorAxios() {
    const token = localStorage.getItem('doctor_token')
    return axios.create({
        headers: { Authorization: `Bearer ${token}` }
    })
}

const FREQ_OPTIONS = [
    'Once daily', 'Twice daily', 'Thrice daily',
    'Every 8 hours', 'Every 6 hours', 'Every 12 hours',
    'Before meals', 'After meals', 'Bedtime', 'As needed (SOS)'
]

// ─── Prescription Modal ───────────────────────────────────────────────────────
function PrescribeModal({ appointment, onClose, onSave }) {
    const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' }])
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const addMedicine = () => setMedicines(prev => [...prev, { name: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' }])
    const removeMedicine = (i) => setMedicines(prev => prev.filter((_, idx) => idx !== i))
    const updateMed = (i, field, val) => setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

    const handleSubmit = async (e) => {
        e.preventDefault()
        const validMeds = medicines.filter(m => m.name.trim())
        if (!validMeds.length) { toast.error('Add at least one medicine'); return }
        setSaving(true)
        try {
            await doctorAxios().post('/api/hospital/prescriptions', {
                patient_id: appointment.patient_id,
                appointment_id: appointment._id,
                medicines: validMeds,
                notes,
            })
            toast.success('Prescription saved! ✅')
            onSave()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save prescription')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>📋 Write Prescription</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Patient: <strong>{appointment.patient_name}</strong> · {new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        {medicines.map((med, i) => (
                            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 16, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>💊 Medicine {i + 1}</span>
                                    {medicines.length > 1 && (
                                        <button type="button" onClick={() => removeMedicine(i)}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '2px 10px', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Medicine Name *</label>
                                        <input className="input" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            placeholder="e.g. Paracetamol 500mg" value={med.name}
                                            onChange={e => updateMed(i, 'name', e.target.value)} required />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Dosage</label>
                                        <input className="input" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            placeholder="e.g. 1 tablet, 5ml" value={med.dosage}
                                            onChange={e => updateMed(i, 'dosage', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Frequency</label>
                                        <select className="input" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}>
                                            {FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Duration</label>
                                        <input className="input" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            placeholder="e.g. 5 days" value={med.duration}
                                            onChange={e => updateMed(i, 'duration', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Instructions (optional)</label>
                                        <input className="input" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            placeholder="e.g. Take with warm water" value={med.instructions}
                                            onChange={e => updateMed(i, 'instructions', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addMedicine} className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'center', marginBottom: 16, padding: '10px' }}>
                        ➕ Add Another Medicine
                    </button>

                    <div className="form-group">
                        <label>Doctor's Notes (optional)</label>
                        <textarea className="input" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' }}
                            placeholder="Additional instructions or notes for the patient..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}
                            style={{ flex: 2, justifyContent: 'center', padding: '12px' }}>
                            {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : '💾 Save Prescription'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Today's Appointments Tab ─────────────────────────────────────────────────
function TodayTab({ doctor }) {
    const [appointments, setAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [prescribing, setPrescribing] = useState(null) // appointment object
    const [prescribedIds, setPrescribedIds] = useState(new Set())

    const fetchToday = useCallback(async () => {
        setLoading(true)
        try {
            const res = await doctorAxios().get('/api/hospital/appointments/today')
            setAppointments(res.data.appointments || [])
        } catch {
            toast.error('Failed to load appointments')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchToday() }, [fetchToday])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>📅 Today's Appointments</h2>
                <span className="badge badge-cyan">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {appointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗓️</div>
                    <p>No appointments scheduled for today.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                                {['#', 'Patient Name', 'Mobile', 'Email', 'Time', 'Status', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={a._id} style={{ borderBottom: i < appointments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{a.patient_name}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{a.patient_mobile || '—'}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{a.patient_email || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className="badge badge-cyan" style={{ fontSize: '0.78rem' }}>🕐 {a.appointment_time}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b98140' }}>
                                            {a.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {prescribedIds.has(a._id) ? (
                                            <span style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b98150', display: 'inline-block' }}>
                                                ✅ Prescribed
                                            </span>
                                        ) : (
                                            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                                onClick={() => setPrescribing(a)}>
                                                ✍️ Prescribe
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {prescribing && (
                <PrescribeModal appointment={prescribing} onClose={() => setPrescribing(null)} onSave={() => {
                    setPrescribedIds(prev => new Set([...prev, prescribing._id]))
                    fetchToday()
                }} />
            )}
        </div>
    )
}

// ─── All Patients Tab ─────────────────────────────────────────────────────────
function AllPatientsTab() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [prescriptions, setPrescriptions] = useState([])
    const [loadingPx, setLoadingPx] = useState(false)

    useEffect(() => {
        doctorAxios().get('/api/hospital/appointments/all-patients')
            .then(res => setPatients(res.data.patients || []))
            .catch(() => toast.error('Failed to load patients'))
            .finally(() => setLoading(false))
    }, [])

    const viewPrescriptions = async (patient) => {
        setSelected(patient)
        setLoadingPx(true)
        try {
            const res = await doctorAxios().get(`/api/hospital/prescriptions/patient/${patient.patient_id}`)
            setPrescriptions(res.data.prescriptions || [])
        } catch {
            toast.error('Failed to load prescriptions')
        } finally {
            setLoadingPx(false)
        }
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

    if (selected) {
        return (
            <div>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ marginBottom: 20 }}>← Back to Patients</button>
                <h2 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 20 }}>
                    📋 Prescriptions for <span className="gradient-text">{selected.patient_name}</span>
                </h2>
                {loadingPx ? <div className="spinner" /> : prescriptions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No prescriptions found for this patient.</p>
                ) : prescriptions.map(px => (
                    <div key={px._id} className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontWeight: 700 }}>🗓️ {new Date(px.created_at).toLocaleDateString('en-IN')}</span>
                            <span className="badge badge-cyan">{px.medicines.length} medicine(s)</span>
                        </div>
                        {px.medicines.map((m, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 10, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Medicine</div><div style={{ fontWeight: 700 }}>{m.name}</div></div>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dosage</div><div>{m.dosage || '—'}</div></div>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Frequency</div><div>{m.frequency || '—'}</div></div>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration</div><div>{m.duration || '—'}</div></div>
                            </div>
                        ))}
                        {px.notes && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8 }}>📝 {px.notes}</p>}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 24 }}>👥 All Patients ({patients.length})</h2>
            {patients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
                    <p>No patients yet. Appointments will appear here.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                                {['Patient Name', 'Email', 'Mobile', 'Last Visit', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p, i) => (
                                <tr key={p.patient_id} style={{ borderBottom: i < patients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.patient_name}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.patient_email}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.patient_mobile || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{p.last_visit}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                                            onClick={() => viewPrescriptions(p)}>
                                            📋 View Prescriptions
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ─── Main Doctor Dashboard ─────────────────────────────────────────────────────
const DOC_NAV = [
    { key: 'today', icon: '📅', label: "Today's Appointments" },
    { key: 'patients', icon: '👥', label: 'All Patients' },
]

export default function DoctorDashboard() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('today')
    const [doctor, setDoctor] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('doctor_token')
        const info = localStorage.getItem('doctor_info')
        if (!token || !info) { navigate('/doctor/login'); return }
        setDoctor(JSON.parse(info))
        // Verify token
        axios.get('/api/hospital/doctor/me', { headers: { Authorization: `Bearer ${token}` } })
            .catch(() => { localStorage.removeItem('doctor_token'); navigate('/doctor/login') })
    }, [navigate])

    const logout = () => {
        localStorage.removeItem('doctor_token')
        localStorage.removeItem('doctor_info')
        toast.success('Logged out')
        navigate('/doctor/login')
    }

    if (!doctor) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ marginBottom: 20, padding: '16px', background: 'linear-gradient(135deg,rgba(0,194,255,0.1),rgba(124,58,237,0.08))', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#00c2ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 10 }}>🩺</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Dr. {doctor.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{doctor.specialization || 'Doctor'}</div>
                    {doctor.hospital && <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: 2 }}>🏥 {doctor.hospital}</div>}
                    {/* Doctor ID — for giving to receptionist */}
                    <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Your Doctor ID</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', wordBreak: 'break-all', cursor: 'pointer' }}
                            title="Click to copy"
                            onClick={() => { navigator.clipboard.writeText(doctor.id || ''); import('react-hot-toast').then(m => m.default.success('Doctor ID copied!')); }}>
                            {doctor.id || '—'}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>Click to copy · share with receptionist</div>
                    </div>
                </div>

                {DOC_NAV.map(item => (
                    <div key={item.key} id={`sidebar-${item.key}`}
                        className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.key)}>
                        <span className="sidebar-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}

                <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                    <button onClick={logout} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard-main">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                        {activeTab === 'today' && <TodayTab doctor={doctor} />}
                        {activeTab === 'patients' && <AllPatientsTab />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
