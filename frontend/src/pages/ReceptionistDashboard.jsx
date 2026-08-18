import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

function recAxios() {
    const token = localStorage.getItem('receptionist_token')
    return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

// ─── Patient Search Box ───────────────────────────────────────────────────────
function PatientSearch({ onSelect, label = 'Search Patient' }) {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [selected, setSelected] = useState(null)
    const [searching, setSearching] = useState(false)
    const debounceRef = useRef(null)

    const handleChange = (e) => {
        const val = e.target.value
        setQuery(val)
        setSelected(null)
        onSelect(null)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (val.trim().length < 2) { setSuggestions([]); return }
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await recAxios().get(`/api/hospital/patients/search?q=${encodeURIComponent(val)}`)
                setSuggestions(res.data.patients || [])
            } catch { setSuggestions([]) }
            finally { setSearching(false) }
        }, 350)
    }

    const pick = (p) => {
        setSelected(p)
        setQuery(p.name + (p.mobile ? ` — ${p.mobile}` : ''))
        setSuggestions([])
        onSelect(p)
    }

    return (
        <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                    className="input"
                    value={query}
                    onChange={handleChange}
                    placeholder="Type name, email or mobile..."
                    autoComplete="off"
                />
                {searching && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, flexShrink: 0 }} />}
            </div>
            {selected && (
                <div style={{ marginTop: 8, padding: '8px 14px', background: 'rgba(0,212,170,0.08)', border: '1px solid var(--accent-cyan)', borderRadius: 10, fontSize: '0.82rem' }}>
                    ✅ <strong>{selected.name}</strong> · {selected.email} · {selected.mobile || 'no mobile'}
                </div>
            )}
            <AnimatePresence>
                {suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', marginTop: 4 }}>
                        {suggestions.map(p => (
                            <div key={p._id}
                                onClick={() => pick(p)}
                                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    📧 {p.email} {p.mobile ? `· 📱 ${p.mobile}` : ''}{p.age ? ` · ${p.age}y` : ''}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Book Appointment Tab ─────────────────────────────────────────────────────
function BookAppointmentTab({ info }) {
    const todayStr = new Date().toISOString().split('T')[0]
    const defaultTime = () => {
        const d = new Date()
        d.setMinutes(d.getMinutes() + 30)
        return d.toTimeString().slice(0, 5)
    }

    const [patient, setPatient] = useState(null)
    const [date, setDate] = useState(todayStr)
    const [time, setTime] = useState(defaultTime())
    const [notes, setNotes] = useState('')
    const [booking, setBooking] = useState(false)

    const handleBook = async (e) => {
        e.preventDefault()
        if (!patient) { toast.error('Please select a patient first'); return }
        setBooking(true)
        try {
            const res = await recAxios().post('/api/hospital/appointments', {
                patient_id: patient._id,
                appointment_date: date,
                appointment_time: time,
                notes,
            })
            toast.success(res.data.message)
            setPatient(null)
            setDate(todayStr)
            setTime(defaultTime())
            setNotes('')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Booking failed')
        } finally {
            setBooking(false)
        }
    }

    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>📅 Book Appointment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.88rem' }}>
                Booking for: <strong style={{ color: 'var(--accent-cyan)' }}>Dr. {info.doctor_name}</strong>
            </p>

            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <PatientSearch onSelect={setPatient} label="Search & Select Patient *" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Appointment Date</label>
                        <input type="date" className="input" value={date} min={todayStr} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Time</label>
                        <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} required />
                    </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Notes (optional)</label>
                    <input type="text" className="input" placeholder="e.g. Follow-up, First visit..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <button type="submit" className="btn-primary" disabled={booking || !patient}
                    style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}>
                    {booking ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Booking...</> : '📅 Book Appointment'}
                </button>
            </form>
        </div>
    )
}

// ─── Upload Report Tab ────────────────────────────────────────────────────────
function UploadReportTab() {
    const [patient, setPatient] = useState(null)
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!patient) { toast.error('Please select a patient'); return }
        if (!file) { toast.error('Please choose a file'); return }
        setUploading(true)
        setResult(null)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('patient_id', patient._id)
        toast.loading('⚙️ Uploading and analyzing report...', { id: 'rec-upload' })
        try {
            const res = await recAxios().post('/api/hospital/reports/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            })
            setResult(res.data)
            toast.success('✅ Report analyzed and saved to patient record!', { id: 'rec-upload' })
        } catch (err) {
            const d = err.response?.data || {}
            toast.error(d.message || d.error || 'Upload failed', { id: 'rec-upload' })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>📁 Upload Blood Report</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.88rem' }}>
                Report will be analyzed by AI and saved directly to the patient's dashboard.
            </p>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <PatientSearch onSelect={setPatient} label="Search & Select Patient *" />

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Blood Report File (PDF, JPG, PNG)</label>
                    <div style={{ marginTop: 8 }}>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            id="rec-report-file"
                            style={{ display: 'none' }}
                            onChange={e => setFile(e.target.files[0] || null)}
                        />
                        <label htmlFor="rec-report-file" style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                            background: 'var(--bg-secondary)', border: '2px dashed var(--border)',
                            borderRadius: 14, cursor: 'pointer', transition: 'border-color 0.2s',
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{file ? '📄' : '📂'}</span>
                            <span style={{ color: file ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.88rem' }}>
                                {file ? file.name : 'Click to browse or drag & drop file'}
                            </span>
                        </label>
                    </div>
                </div>

                <button type="submit" className="btn-primary" disabled={uploading || !patient || !file}
                    style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}>
                    {uploading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing...</> : '📤 Upload & Analyze Report'}
                </button>
            </form>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        style={{ marginTop: 28, padding: 20, background: 'rgba(16,185,129,0.06)', border: '1px solid #10b98150', borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.3rem' }}>✅</span>
                            <span style={{ fontWeight: 800, color: '#10b981' }}>Report Saved to Patient Dashboard</span>
                            <span className="badge badge-cyan" style={{ marginLeft: 'auto' }}>{result.report_type}</span>
                        </div>
                        {result.summary && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{result.summary}</p>
                        )}
                        {result.metrics && Object.keys(result.metrics).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                {Object.entries(result.metrics).map(([k, v]) => (
                                    <span key={k} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 99 }}>
                                        {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── My Patients Tab ──────────────────────────────────────────────────────────
function MyPatientsTab() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        recAxios().get('/api/hospital/receptionist/my-patients')
            .then(res => setPatients(res.data.appointments || []))
            .catch(() => toast.error('Failed to load patients'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

    return (
        <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 24 }}>👥 All Appointments ({patients.length})</h2>
            {patients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                    <p>No appointments booked yet.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                                {['Patient', 'Email', 'Mobile', 'Date', 'Time', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p, i) => (
                                <tr key={p._id} style={{ borderBottom: i < patients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.patient_name}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.patient_email}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.patient_mobile || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}><span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{p.appointment_date}</span></td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.appointment_time}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b98140' }}>
                                            {p.status || 'scheduled'}
                                        </span>
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

// ─── Main Receptionist Dashboard ──────────────────────────────────────────────
const REC_NAV = [
    { key: 'book', icon: '📅', label: 'Book Appointment' },
    { key: 'upload', icon: '📁', label: 'Upload Report' },
    { key: 'patients', icon: '👥', label: 'All Appointments' },
]

export default function ReceptionistDashboard() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('book')
    const [info, setInfo] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('receptionist_token')
        const stored = localStorage.getItem('receptionist_info')
        if (!token || !stored) { navigate('/receptionist/login'); return }
        const recInfo = JSON.parse(stored)
        setInfo(recInfo)
        // Verify token + fetch fresh info (to get doctor_name)
        axios.get('/api/hospital/receptionist/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => { setInfo(res.data.receptionist); localStorage.setItem('receptionist_info', JSON.stringify(res.data.receptionist)) })
            .catch(() => { localStorage.removeItem('receptionist_token'); navigate('/receptionist/login') })
    }, [navigate])

    const logout = () => {
        localStorage.removeItem('receptionist_token')
        localStorage.removeItem('receptionist_info')
        toast.success('Logged out')
        navigate('/receptionist/login')
    }

    if (!info) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div style={{ marginBottom: 20, padding: '16px', background: 'linear-gradient(135deg,rgba(0,212,170,0.1),rgba(124,58,237,0.08))', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4aa,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 10 }}>🏥</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{info.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Receptionist</div>
                    {info.doctor_name && <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: 2 }}>👨‍⚕️ Dr. {info.doctor_name}</div>}
                </div>

                {REC_NAV.map(item => (
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

            <main className="dashboard-main">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                        {activeTab === 'book' && <BookAppointmentTab info={info} />}
                        {activeTab === 'upload' && <UploadReportTab />}
                        {activeTab === 'patients' && <MyPatientsTab />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
