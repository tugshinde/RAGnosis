import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'

const features = [
    { icon: '📐', title: 'Reference-Range Analysis', desc: 'Extracts lab values from your report and flags each one against a 25-parameter clinical reference catalogue.' },
    { icon: '🔍', title: 'RAG Knowledge Base', desc: 'Retrieval-Augmented Generation from a curated medical knowledge base gives accurate, contextual answers.' },
    { icon: '📊', title: 'Health Metrics Charts', desc: 'Automatic extraction of blood values (hemoglobin, glucose, cholesterol) with trend visualization.' },
    { icon: '🤖', title: 'AI Chatbot', desc: 'Ask any question about your report. Groq-powered LLM answers in simple, patient-friendly language.' },
    { icon: '🔒', title: 'Secure & Private', desc: 'Data encrypted at rest. Only you can access your medical reports via JWT-secured sessions.' },
    { icon: '📄', title: 'Multi-Format Support', desc: 'Upload PDF, JPG, PNG, and JPEG reports. OCR extracts text from scanned images automatically.' },
]

const steps = [
    { num: '01', title: 'Upload Report', desc: 'Drop your medical report in any format — PDF, image, or scan.' },
    { num: '02', title: 'Parameter Extraction', desc: 'Values are matched against a reference catalogue and flagged low, normal, or high.' },
    { num: '03', title: 'RAG Retrieval', desc: 'On-device embeddings and cosine similarity retrieve the medical context relevant to your specific values.' },
    { num: '04', title: 'Get Insights', desc: 'Read your summary, view health charts, and chat with your AI doctor.' },
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
}
const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

const PORTALS = [
    {
        icon: '👤',
        title: 'Patient Portal',
        desc: 'Upload your medical reports, get AI-powered analysis, view your prescriptions and chat with the AI assistant.',
        color: '#00d4aa',
        gradient: 'linear-gradient(135deg,rgba(0,212,170,0.12),rgba(0,212,170,0.04))',
        border: 'rgba(0,212,170,0.3)',
        loginLink: '/login',
        registerLink: '/register',
        demo: null,
    },
    {
        icon: '🩺',
        title: 'Doctor Portal',
        desc: "See today's appointment schedule, write prescriptions with medicine name, dosage & frequency, and view all your patients.",
        color: '#00c2ff',
        gradient: 'linear-gradient(135deg,rgba(0,194,255,0.12),rgba(0,194,255,0.04))',
        border: 'rgba(0,194,255,0.3)',
        loginLink: '/login',
        registerLink: '/register/staff',
        demoLabel: '📧 doctor@ragnosis.dev  🔑 demo1234',
        demo: 'doctor',
    },
    {
        icon: '🏥',
        title: 'Receptionist Portal',
        desc: 'Book appointments with live patient search, upload blood reports that instantly appear in the patient dashboard.',
        color: '#a855f7',
        gradient: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(168,85,247,0.04))',
        border: 'rgba(168,85,247,0.3)',
        loginLink: '/login',
        registerLink: '/register/staff',
        demoLabel: '📧 reception@ragnosis.dev  🔑 demo1234',
        demo: 'receptionist',
    },
]

export default function LandingPage() {
    const [seeding, setSeeding] = useState(false)
    const [seeded, setSeeded] = useState(false)

    const seedDemo = async () => {
        setSeeding(true)
        try {
            await axios.post('/api/hospital/demo/seed')
            toast.success('Demo accounts ready! You can now login as Doctor or Receptionist.')
            setSeeded(true)
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create demo accounts')
        } finally {
            setSeeding(false)
        }
    }

    return (
        <div className="page-wrapper" style={{ paddingTop: 72, overflowX: 'hidden' }}>
            {/* ── Hero ── */}
            <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <div className="orb orb-cyan" style={{ width: 600, height: 600, top: -200, left: -200 }} />
                <div className="orb orb-purple" style={{ width: 500, height: 500, bottom: -100, right: -100 }} />
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)',
                    backgroundSize: '60px 60px', pointerEvents: 'none'
                }} />

                <div className="container" style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ maxWidth: 720 }}>
                        <div className="badge badge-cyan" style={{ marginBottom: 24 }}>
                            <div className="pulse-dot" />
                            AI-Powered Medical Analysis
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24 }}>
                            Understand Your<br />
                            <span className="gradient-text">Medical Reports</span><br />
                            Instantly
                        </h1>
                        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 540, marginBottom: 36, lineHeight: 1.8 }}>
                            RAGnosis uses reference-range analysis and a retrieval-augmented, Groq-powered chatbot to transform complex medical reports into clear, actionable insights.
                        </p>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Link to="/register" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>🚀 Start Free Analysis</Link>
                            <Link to="/system" className="btn-secondary" style={{ fontSize: '1rem', padding: '14px 32px' }}>⚡ See How It Works</Link>
                        </div>
                        <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
                            {[['10K+', 'Reports Analyzed'], ['98%', 'Accuracy Rate'], ['5s', 'Average Process Time']].map(([val, lab]) => (
                                <div key={lab}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{val}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{lab}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <div className="badge badge-purple" style={{ marginBottom: 16 }}>✨ Features</div>
                        <h2 className="section-title">Everything You Need<br /><span className="gradient-text">In One Place</span></h2>
                    </div>
                    <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {features.map((f) => (
                            <motion.div key={f.title} variants={itemVariants} className="card" style={{ cursor: 'default' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
                                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{f.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section style={{ padding: '80px 0' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <div className="badge badge-cyan" style={{ marginBottom: 16 }}>🔬 Process</div>
                        <h2 className="section-title">From Report to<br /><span className="gradient-text">Insight in 4 Steps</span></h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                        {steps.map((s, i) => (
                            <motion.div key={s.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-cyan)', opacity: 0.4, marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>{s.num}</div>
                                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7 }}>{s.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOSPITAL PORTALS ── */}
            <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <div className="badge badge-cyan" style={{ marginBottom: 16 }}>🏥 Hospital Portal</div>
                        <h2 className="section-title">Choose Your<br /><span className="gradient-text">Login Portal</span></h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '16px auto 0', fontSize: '0.95rem' }}>
                            RAGnosis connects patients, doctors and receptionists in one integrated system.
                        </p>
                        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <motion.button whileTap={{ scale: 0.97 }}
                                onClick={seedDemo} disabled={seeding || seeded}
                                style={{
                                    padding: '10px 28px', borderRadius: 99, border: '1px solid rgba(0,212,170,0.4)',
                                    background: seeded ? 'rgba(0,212,170,0.15)' : 'rgba(0,212,170,0.06)',
                                    color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 700, cursor: seeded ? 'default' : 'pointer',
                                }}>
                                {seeding ? '⏳ Creating...' : seeded ? '✅ Demo Accounts Ready!' : '⚡ Create Demo Accounts'}
                            </motion.button>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Click once to create demo Doctor &amp; Receptionist accounts for testing
                            </p>
                        </div>
                    </div>

                    <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {PORTALS.map((p) => (
                            <motion.div key={p.title} variants={itemVariants}
                                style={{ background: p.gradient, border: `1px solid ${p.border}`, borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p.color}20`, border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                                    {p.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, color: p.color }}>{p.title}</h3>
                                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
                                </div>
                                {p.demo && p.demoLabel && (
                                    <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                                        {p.demoLabel}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                                    <Link to={p.loginLink} style={{
                                        flex: 1, padding: '11px 0', borderRadius: 10, textAlign: 'center',
                                        background: p.color, color: '#060d1f', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none',
                                    }}>🔐 Login</Link>
                                    <Link to={p.registerLink} style={{
                                        flex: 1, padding: '11px 0', borderRadius: 10, textAlign: 'center',
                                        background: 'transparent', color: p.color, fontWeight: 700, fontSize: '0.88rem',
                                        border: `1px solid ${p.border}`, textDecoration: 'none',
                                    }}>➕ Register</Link>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: '80px 0', textAlign: 'center' }}>
                <div className="container">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h2 className="section-title" style={{ marginBottom: 16 }}>Ready to Understand<br /><span className="gradient-text">Your Health?</span></h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
                            Join RAGnosis today. Upload your first report and get an AI-powered summary in seconds — completely free.
                        </p>
                        <Link to="/register" className="btn-primary" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
                            🩺 Start My Free Analysis
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ padding: '32px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <div className="container">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        © 2025 RAGnosis | PICT InC 2025 | Built with ❤️ by the RAGnosis team
                    </p>
                </div>
            </footer>
        </div>
    )
}
