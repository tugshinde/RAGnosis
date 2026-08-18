import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

const PIPELINE_STEPS = [
    {
        id: 0, icon: '📄', title: 'Document Input', model: 'Upload Layer',
        subtitle: 'PDF / JPG / PNG / JPEG',
        color: '#3b82f6',
        desc: 'Patient uploads a medical report in any format. The file is validated by extension and size, then routed to the matching text extractor.',
        tech: ['PdfPig (.NET)', 'Tesseract OCR', 'OpenCvSharp'],
        detail: 'PDF text is extracted with PdfPig, then a custom line-reconstruction step regroups words by baseline — raw glyph concatenation would otherwise destroy row structure. Scanned images go through OpenCvSharp preprocessing (denoise, adaptive threshold, deskew) before Tesseract OCR converts pixels to text.'
    },
    {
        id: 1, icon: '🔎', title: 'Parameter Extraction', model: 'Regex Parser',
        subtitle: '25-parameter reference catalogue',
        color: '#8b5cf6',
        desc: 'A line-oriented parser matches lab report lines against 25 known clinical parameters — with common aliases — pulling out each value, unit, and printed reference range.',
        tech: ['Regex', 'Reference Catalogue', 'Alias Matching'],
        detail: 'Four regex patterns extract label+value pairs, inline ranges ("13.0 - 17.0"), one-sided bounds ("< 200"), and units. Matches are resolved against a canonical catalogue via an alias index; a reference range printed on the report itself takes precedence over the catalogue default.'
    },
    {
        id: 2, icon: '🚦', title: 'Flag & Advise', model: 'Clinical Rules Engine',
        subtitle: 'low / normal / high classification',
        color: '#00d4aa',
        desc: 'Each extracted value is classified against its reference range, then mapped to plain-language, deliberately non-diagnostic guidance.',
        tech: ['Reference Ranges', 'Rule-based Flagging', 'Recommendations'],
        detail: 'Values are flagged low, normal, or high by comparison against the matched reference range. A recommendation service turns out-of-range flags into patient-friendly guidance text — explanatory, never diagnostic or prescriptive.'
    },
    {
        id: 3, icon: '🔍', title: 'RAG Retrieval', model: 'ONNX MiniLM',
        subtitle: 'all-MiniLM-L6-v2 (ONNX) · cosine search',
        color: '#f59e0b',
        desc: 'The chat query is embedded locally via ONNX Runtime and matched against cached knowledge-chunk vectors by cosine similarity.',
        tech: ['ONNX Runtime', 'WordPiece Tokenizer', 'Cosine Similarity'],
        detail: 'A custom WordPiece tokenizer feeds a 384-dim MiniLM model; attention-masked mean pooling plus L2 normalization produce the query vector. It\'s compared against 27 cached knowledge-chunk embeddings (25 reference parameters + 2 guidance chunks) — the top 4 above a similarity floor are retrieved. Without a supplied ONNX model, retrieval falls back to keyword (term-overlap) search so answers stay grounded either way.'
    },
    {
        id: 4, icon: '🤖', title: 'Groq LLM Chat', model: 'openai/gpt-oss-120b',
        subtitle: 'Groq Inference API · constrained system prompt',
        color: '#10b981',
        desc: 'Patient questions are answered by GPT-OSS 120B, enriched with retrieved context and the patient\'s own measured values, running at low latency on Groq\'s LPU hardware.',
        tech: ['Groq API', 'GPT-OSS 120B', 'Constrained Prompt'],
        detail: 'The system prompt restricts the model to the supplied context and report values, forbids diagnosis, medication names, or dosing, and closes by pointing the patient to a clinician. Without a configured Groq API key, the chat endpoint returns a clear 503 instead of a broken response.'
    },
    {
        id: 5, icon: '📊', title: 'Output & Visualization', model: 'Frontend Layer',
        subtitle: 'React · Recharts · Real-time',
        color: '#6366f1',
        desc: 'Results are streamed to the patient dashboard: plain-language summary, health metric cards with status indicators, trend charts, and the interactive chatbot.',
        tech: ['React + Vite', 'Recharts', 'Framer Motion'],
        detail: 'Detected values are projected onto a flat metrics map (hemoglobin, ldl, tsh, ...) that the dashboard charts directly via Recharts, compared against the same reference catalogue used during extraction.'
    },
]

export default function SystemAnimation() {
    const [activeStep, setActiveStep] = useState(0)
    const [playing, setPlaying] = useState(true)
    const [showDetail, setShowDetail] = useState(false)

    useEffect(() => {
        if (!playing) return
        const interval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % PIPELINE_STEPS.length)
        }, 2800)
        return () => clearInterval(interval)
    }, [playing])

    const step = PIPELINE_STEPS[activeStep]

    return (
        <div className="page-wrapper" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
            {/* Background grid */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px', zIndex: 0
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 32, paddingBottom: 60 }}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div className="badge badge-cyan" style={{ margin: '0 auto 16px', display: 'inline-flex' }}>
                        <div className="pulse-dot" /> RAGnosis Architecture
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12 }}>
                        How <span className="gradient-text">RAGnosis</span> Works
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto 20px', lineHeight: 1.8 }}>
                        A complete end-to-end pipeline — from raw medical report to actionable insights —
                        powered by reference-range analysis, ONNX-based RAG, and the Groq LLM.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            className={playing ? 'btn-secondary' : 'btn-primary'}
                            id="play-pause-btn"
                            onClick={() => setPlaying(!playing)}
                        >
                            {playing ? '⏸ Pause' : '▶ Play'} Animation
                        </button>
                        <Link to="/register" className="btn-primary">🚀 Try RAGnosis</Link>
                    </div>
                </motion.div>

                {/* Pipeline nodes - linear */}
                <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 900, justifyContent: 'center', marginBottom: 40 }}>
                        {PIPELINE_STEPS.map((s, idx) => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                                {/* Node */}
                                <motion.div
                                    onClick={() => { setActiveStep(idx); setPlaying(false) }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="node-box" style={{
                                        width: 108, padding: '14px 10px',
                                        borderColor: activeStep === idx ? s.color : 'var(--border)',
                                        boxShadow: activeStep === idx ? `0 0 30px ${s.color}44` : 'none',
                                        background: activeStep === idx ? `${s.color}11` : 'var(--bg-card)',
                                    }}>
                                        {activeStep === idx && (
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                style={{ position: 'absolute', inset: -2, borderRadius: 'inherit', border: `2px solid ${s.color}`, pointerEvents: 'none' }}
                                            />
                                        )}
                                        <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{s.icon}</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.3, color: activeStep === idx ? s.color : 'var(--text-primary)' }}>
                                            {s.title}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.2 }}>{s.model}</div>
                                    </div>
                                </motion.div>

                                {/* Arrow */}
                                {idx < PIPELINE_STEPS.length - 1 && (
                                    <div style={{ flex: '0 0 28px', textAlign: 'center', position: 'relative' }}>
                                        <motion.div
                                            animate={playing && activeStep === idx ? { x: [-8, 4, -8], opacity: [0.4, 1, 0.4] } : {}}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            style={{ color: activeStep === idx ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '1.2rem' }}
                                        >
                                            →
                                        </motion.div>
                                        {/* Moving data packet */}
                                        <AnimatePresence>
                                            {playing && activeStep === idx && (
                                                <motion.div
                                                    initial={{ left: 0, opacity: 1 }}
                                                    animate={{ left: 28, opacity: 0 }}
                                                    exit={{}}
                                                    transition={{ duration: 0.6, repeat: Infinity }}
                                                    style={{
                                                        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: 'var(--accent-cyan)',
                                                        boxShadow: '0 0 8px var(--accent-cyan)',
                                                    }}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step counter dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
                    {PIPELINE_STEPS.map((s, i) => (
                        <div
                            key={i}
                            onClick={() => { setActiveStep(i); setPlaying(false) }}
                            style={{
                                width: i === activeStep ? 28 : 8, height: 8, borderRadius: 4,
                                background: i === activeStep ? s.color : 'var(--border)',
                                cursor: 'pointer', transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Active step detail */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35 }}
                        className="card"
                        style={{
                            maxWidth: 860, margin: '0 auto',
                            borderColor: step.color + '44',
                            boxShadow: `0 0 40px ${step.color}1a`
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: 20, flexShrink: 0,
                                background: step.color + '22', border: `1px solid ${step.color}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                            }}>
                                {step.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: step.color, fontWeight: 600 }}>
                                        STEP {activeStep + 1}/{PIPELINE_STEPS.length}
                                    </span>
                                    <div className="badge" style={{ background: step.color + '22', color: step.color, border: `1px solid ${step.color}44` }}>
                                        {step.model}
                                    </div>
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>{step.title}</h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>{step.desc}</p>

                                {/* Tech badges */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {step.tech.map(t => (
                                        <span key={t} style={{
                                            background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: 100,
                                            fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace',
                                            color: step.color, border: `1px solid ${step.color}33`
                                        }}>{t}</span>
                                    ))}
                                </div>

                                {/* Toggle deep detail */}
                                <button
                                    className="btn-ghost"
                                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                                    onClick={() => setShowDetail(!showDetail)}
                                >
                                    {showDetail ? '▲ Less Detail' : '▼ Technical Deep Dive'}
                                </button>
                                <AnimatePresence>
                                    {showDetail && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{
                                                marginTop: 16, padding: 16,
                                                background: 'var(--bg-secondary)', borderRadius: 12,
                                                fontSize: '0.88rem', lineHeight: 1.8,
                                                color: 'var(--text-secondary)',
                                                borderLeft: `3px solid ${step.color}`
                                            }}>
                                                {step.detail}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Bottom summary cards */}
                <div style={{ marginTop: 56 }}>
                    <h2 style={{ textAlign: 'center', fontWeight: 800, marginBottom: 32, fontSize: '1.6rem' }}>
                        Complete <span className="gradient-text">Tech Stack</span>
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        {[
                            { icon: '⚛️', title: 'Frontend', items: ['React 18 + Vite', 'Framer Motion', 'Recharts', 'React Router v6'] },
                            { icon: '🟣', title: 'Backend', items: ['ASP.NET Core 8 (C#)', 'MongoDB.Driver', 'JWT Auth (HS256)', 'BCrypt.Net'] },
                            { icon: '🧠', title: 'AI Models', items: ['ONNX Runtime', 'MiniLM-L6-v2 (embeddings)', 'WordPiece Tokenizer', 'GPT-OSS 120B (Groq)'] },
                            { icon: '🔍', title: 'RAG Engine', items: ['Cosine Similarity', '27 Knowledge Chunks', 'MongoDB Vector Cache', 'Keyword Fallback'] },
                            { icon: '🗄️', title: 'Database', items: ['MongoDB', '7 Collections', 'User Profiles', 'Report Storage'] },
                            { icon: '⚡', title: 'Infrastructure', items: ['Groq API', 'PdfPig', 'Tesseract + OpenCvSharp', 'Docker Compose'] },
                        ].map(s => (
                            <motion.div key={s.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="card"
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{s.icon}</div>
                                <h3 style={{ fontWeight: 700, marginBottom: 10, color: 'var(--accent-cyan)' }}>{s.title}</h3>
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {s.items.map(i => (
                                        <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: 'var(--accent-cyan)', fontSize: '0.6rem' }}>◆</span> {i}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
