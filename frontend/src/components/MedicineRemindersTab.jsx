import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_COLORS = {
    active: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#10b981', icon: '✅' },
    inactive: { bg: 'rgba(100,100,100,0.12)', border: '#7c8a99', text: '#7c8a99', icon: '⏸' },
}

function formatTime(hour, minute) {
    const h = hour % 12 || 12
    const m = String(minute).padStart(2, '0')
    const suffix = hour >= 12 ? 'PM' : 'AM'
    return `${h}:${m} ${suffix}`
}

function ReminderCard({ reminder, onDelete, onToggle, onEdit }) {
    const sc = reminder.active ? STATUS_COLORS.active : STATUS_COLORS.inactive
    const [showDelete, setShowDelete] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'var(--bg-card)',
                border: `1.5px solid ${sc.border}`,
                borderRadius: 16,
                padding: '16px 18px',
                opacity: reminder.active ? 1 : 0.65,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: sc.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.2rem'
                }}>
                    💊
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {reminder.medicine_name}
                    </div>
                    {reminder.dosage && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {reminder.dosage}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => onToggle(reminder._id, !reminder.active)}
                        style={{
                            width: 32, height: 32, borderRadius: 8, border: `1px solid ${sc.border}`,
                            background: 'transparent', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                        }}
                        title={reminder.active ? 'Pause reminders' : 'Resume reminders'}
                    >
                        {reminder.active ? '⏸' : '▶'}
                    </button>
                    <button
                        onClick={() => setShowDelete(!showDelete)}
                        style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #ef4444',
                            background: 'transparent', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '0.8rem'
                        }}
                        title="Delete reminder"
                    >
                        🗑
                    </button>
                </div>
            </div>

            {/* Times */}
            {reminder.times && reminder.times.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {reminder.times.map((t, i) => {
                        const [h, m] = t.split(':').map(Number)
                        return (
                            <div key={i} style={{
                                background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
                                color: sc.text, display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                🕐 {formatTime(h, m)}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Notes */}
            {reminder.notes && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                    📝 {reminder.notes}
                </div>
            )}

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: sc.text }}>
                <span>{sc.icon}</span>
                <span>{reminder.active ? 'Reminders active • Notifications enabled' : 'Reminders paused • Notifications off'}</span>
            </div>

            {/* Delete confirmation */}
            <AnimatePresence>
                {showDelete && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            marginTop: 12, paddingTop: 10,
                            borderTop: '1px solid rgba(239,68,68,0.3)',
                            display: 'flex', gap: 8, alignItems: 'center'
                        }}
                    >
                        <div style={{ flex: 1, fontSize: '0.8rem', color: '#ef4444' }}>
                            Delete permanently?
                        </div>
                        <button
                            onClick={() => setShowDelete(false)}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                                background: 'transparent', cursor: 'pointer', fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onDelete(reminder._id)
                                setShowDelete(false)
                            }}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none',
                                background: '#ef4444', cursor: 'pointer', fontSize: '0.75rem',
                                color: '#fff', fontWeight: 600
                            }}
                        >
                            Delete
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function AddReminderModal({ isOpen, onClose, onAdd }) {
    const [medName, setMedName] = useState('')
    const [dosage, setDosage] = useState('')
    const [notes, setNotes] = useState('')
    const [hour, setHour] = useState('08')
    const [minute, setMinute] = useState('00')
    const [saving, setSaving] = useState(false)
    const [times, setTimes] = useState([])

    const handleAddTime = () => {
        const h = parseInt(hour, 10)
        const m = parseInt(minute, 10)
        if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
            toast.error('Invalid time')
            return
        }
        const label = formatTime(h, m)
        if (times.some(t => t.hour === h && t.minute === m)) {
            toast.error('Time already added')
            return
        }
        setTimes([...times, { hour: h, minute: m, label }])
        setHour('08')
        setMinute('00')
    }

    const handleRemoveTime = (index) => {
        setTimes(times.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!medName.trim()) {
            toast.error('Medicine name is required')
            return
        }
        if (times.length === 0) {
            toast.error('Add at least one reminder time')
            return
        }

        setSaving(true)
        try {
            await axios.post('/api/reminders/', {
                medicine_name: medName.trim(),
                dosage: dosage.trim(),
                notes: notes.trim(),
                times: times.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`),
                frequency: 'daily',
            })
            toast.success(`✅ Reminder set for ${medName}`)
            onAdd()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save reminder')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
            zIndex: 1000
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 400 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 400 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 600, background: 'var(--bg-card)',
                    borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Add Medicine 💊</h3>
                    <button onClick={onClose} style={{
                        width: 28, height: 28, borderRadius: 6, border: 'none',
                        background: 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '1.2rem'
                    }}>
                        ✕
                    </button>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Medicine Name */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Medicine Name *
                        </label>
                        <input
                            type="text"
                            value={medName}
                            onChange={e => setMedName(e.target.value)}
                            placeholder="e.g. Metformin, Aspirin, Lisinopril"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Dosage */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Dosage (optional)
                        </label>
                        <input
                            type="text"
                            value={dosage}
                            onChange={e => setDosage(e.target.value)}
                            placeholder="e.g. 500mg 2x daily, 1 tablet"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Time pickers */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Reminder Times
                        </label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hour (0–23)</label>
                                <input
                                    type="text"
                                    value={hour}
                                    onChange={e => setHour(e.target.value)}
                                    maxLength="2"
                                    style={{
                                        width: '100%', padding: '8px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--bg)',
                                        color: 'var(--text-primary)', textAlign: 'center', fontSize: '1rem', fontWeight: 700
                                    }}
                                />
                            </div>
                            <div style={{ paddingTop: 16, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>:</div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minute (0–59)</label>
                                <input
                                    type="text"
                                    value={minute}
                                    onChange={e => setMinute(e.target.value)}
                                    maxLength="2"
                                    style={{
                                        width: '100%', padding: '8px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--bg)',
                                        color: 'var(--text-primary)', textAlign: 'center', fontSize: '1rem', fontWeight: 700
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preview</label>
                                <div style={{
                                    padding: '10px 8px', borderRadius: 8, background: 'rgba(124,58,237,0.2)',
                                    color: '#7c3aed', fontWeight: 700, textAlign: 'center', fontSize: '0.85rem'
                                }}>
                                    {formatTime(parseInt(hour, 10) || 0, parseInt(minute, 10) || 0)}
                                </div>
                            </div>
                        </div>

                        {/* Quick presets */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {[
                                { label: '7 AM', h: 7, m: 0 },
                                { label: '12 PM', h: 12, m: 0 },
                                { label: '2 PM', h: 14, m: 0 },
                                { label: '8 PM', h: 20, m: 0 },
                                { label: '10 PM', h: 22, m: 0 },
                            ].map(p => (
                                <button key={p.label}
                                    onClick={() => { setHour(String(p.h).padStart(2, '0')); setMinute(String(p.m).padStart(2, '0')) }}
                                    style={{
                                        padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Add time button */}
                        <button
                            onClick={handleAddTime}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 8,
                                border: '1px solid #7c3aed', background: 'transparent',
                                color: '#7c3aed', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                            }}
                        >
                            + Add Time
                        </button>

                        {/* Added times */}
                        {times.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {times.map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: 'rgba(124,58,237,0.2)', padding: '6px 10px',
                                        borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed'
                                    }}>
                                        🕐 {t.label}
                                        <button
                                            onClick={() => handleRemoveTime(i)}
                                            style={{
                                                border: 'none', background: 'transparent', cursor: 'pointer',
                                                color: '#7c3aed', fontSize: '1rem', padding: 0
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Take with food, avoid dairy, take before bed"
                            rows="3"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.9rem'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                background: '#7c3aed', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 700, fontSize: '0.9rem', opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Setting...' : 'Set Reminder'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default function MedicineRemindersTab() {
    const [reminders, setReminders] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)

    const fetchReminders = useCallback(async () => {
        try {
            const res = await axios.get('/api/reminders/')
            setReminders(res.data.reminders || [])
        } catch (err) {
            toast.error('Failed to load reminders')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchReminders()
    }, [fetchReminders])

    const handleDelete = async (reminderId) => {
        try {
            await axios.delete(`/api/reminders/${reminderId}`)
            setReminders(prev => prev.filter(r => r._id !== reminderId))
            toast.success('Reminder deleted')
        } catch {
            toast.error('Failed to delete reminder')
        }
    }

    const handleToggle = async (reminderId, active) => {
        try {
            await axios.put(`/api/reminders/${reminderId}`, { active })
            setReminders(prev => prev.map(r => r._id === reminderId ? { ...r, active } : r))
            toast.success(active ? 'Reminders enabled 🔔' : 'Reminders paused 🔕')
        } catch {
            toast.error('Failed to update reminder')
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, marginBottom: 4 }}>
                        💊 Medicine Reminders
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                        Manage daily medicine doses & get reminders
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    style={{
                        padding: '10px 18px', borderRadius: 10, border: 'none',
                        background: '#7c3aed', color: '#fff', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.9rem'
                    }}
                >
                    + Add Medicine
                </button>
            </div>

            {/* Reminders list or empty state */}
            {reminders.length === 0 ? (
                <div style={{
                    background: 'var(--bg-card)', border: '1.5px dashed var(--border)',
                    borderRadius: 16, padding: 40, textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>💊</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                        No reminders yet
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                        Create your first medicine reminder to get daily notifications at your chosen time.
                    </p>
                    <button
                        onClick={() => setModalOpen(true)}
                        style={{
                            marginTop: 16, padding: '10px 20px', borderRadius: 8,
                            border: 'none', background: '#7c3aed', color: '#fff',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
                        }}
                    >
                        Create First Reminder
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reminders.map(r => (
                        <ReminderCard
                            key={r._id}
                            reminder={r}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                        />
                    ))}
                </div>
            )}

            {/* Add Reminder Modal */}
            <AddReminderModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onAdd={fetchReminders}
            />
        </div>
    )
}
