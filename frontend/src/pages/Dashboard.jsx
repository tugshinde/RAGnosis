import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import MedicineRemindersTab from '../components/MedicineRemindersTab'
import HealthCard from '../components/HealthCard'
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, Legend
} from 'recharts'

// ══════════════════════════════════════════════════════════
//  INLINE METRIC CATALOG  (mirrors backend METRIC_META)
// ══════════════════════════════════════════════════════════
const METRIC_CATALOG = {
    hemoglobin: {
        label: 'Hemoglobin', unit: 'g/dL', lo: 12, hi: 17, dLo: 5, dHi: 22,
        loTips: ['Eat iron-rich foods: spinach, lentils, red meat', 'Take iron + Vitamin C supplements', 'Avoid tea/coffee right after meals', 'Get serum ferritin test to confirm iron deficiency', 'Follow up with doctor if fatigue persists'],
        hiTips: ['Stay well hydrated', 'Avoid smoking', 'Rule out polycythemia vera with doctor']
    },
    glucose: {
        label: 'Blood Glucose', unit: 'mg/dL', lo: 70, hi: 100, dLo: 40, dHi: 300,
        loTips: ['Eat small frequent meals every 3–4 hrs', 'Carry glucose tablets when going out', 'Avoid prolonged fasting'],
        hiTips: ['Reduce sugar, white rice, processed carbs', 'Walk 30 min daily', 'Get HbA1c test', 'Consult endocrinologist if fasting glucose >126 mg/dL']
    },
    cholesterol: {
        label: 'Total Cholesterol', unit: 'mg/dL', lo: 100, hi: 200, dLo: 50, dHi: 350,
        loTips: ['Maintain balanced diet', 'Get labs rechecked annually'],
        hiTips: ['Avoid fried food, ghee, full-fat dairy', 'Eat oats, nuts, olive oil', 'Exercise 150 min/week', 'Get LDL/HDL ratio checked']
    },
    triglycerides: {
        label: 'Triglycerides', unit: 'mg/dL', lo: 0, hi: 150, dLo: 0, dHi: 500,
        loTips: ['Keep up healthy lifestyle habits'],
        hiTips: ['Cut down on sugar, alcohol, refined carbs', 'Eat fatty fish twice a week', 'Omega-3 supplements help', 'Lose 5–10% body weight if overweight']
    },
    hdl: {
        label: 'HDL (Good Chol.)', unit: 'mg/dL', lo: 60, hi: 999, dLo: 0, dHi: 120,
        loTips: ['Exercise regularly — best way to raise HDL', 'Quit smoking', 'Eat healthy fats: olive oil, avocado, nuts', 'Avoid trans fats (packaged snacks)'],
        hiTips: ['Excellent! High HDL protects your heart']
    },
    ldl: {
        label: 'LDL (Bad Chol.)', unit: 'mg/dL', lo: 0, hi: 100, dLo: 0, dHi: 300,
        loTips: ['Excellent! Keep up healthy diet'],
        hiTips: ['Reduce saturated fats: red meat, butter, cheese', 'Eat soluble fiber: oats, beans, fruits', 'Exercise lowers LDL by 5–10%']
    },
    wbc: {
        label: 'WBC', unit: 'k/µL', lo: 4.5, hi: 11, dLo: 0, dHi: 25,
        loTips: ['Avoid contact with sick individuals', 'Wash hands frequently', 'Check if medications are causing it'],
        hiTips: ['Look for signs of infection: fever, pain, redness', 'Get differential WBC count', 'Rest and treat underlying infection']
    },
    rbc: {
        label: 'RBC', unit: 'M/µL', lo: 4.0, hi: 5.5, dLo: 2, dHi: 8,
        loTips: ['Increase iron and B12 rich foods', 'Rule out chronic blood loss'],
        hiTips: ['Stay well hydrated', 'Rule out polycythemia vera', 'Stop smoking']
    },
    platelets: {
        label: 'Platelets', unit: 'k/µL', lo: 150, hi: 400, dLo: 0, dHi: 700,
        loTips: ['Avoid aspirin and blood thinners', 'Watch for unusual bruising', 'Severe cases (<50k) need urgent attention'],
        hiTips: ['Usually a reactive rise due to infection', 'Rule out essential thrombocythemia', 'Monitor if repeatedly elevated']
    },
    creatinine: {
        label: 'Creatinine', unit: 'mg/dL', lo: 0.5, hi: 1.2, dLo: 0, dHi: 5,
        loTips: ['Good kidney function — keep hydrated'],
        hiTips: ['Drink 2–3 liters of water daily', 'Reduce protein intake temporarily', 'Avoid NSAIDs (ibuprofen)', 'Get eGFR test', 'See nephrologist if >2 mg/dL']
    },
    urea: {
        label: 'Blood Urea (BUN)', unit: 'mg/dL', lo: 7, hi: 20, dLo: 0, dHi: 60,
        loTips: ['Maintain regular nutrition'],
        hiTips: ['Increase fluid intake', 'Reduce high-protein diet', 'Check kidney function']
    },
    sgpt: {
        label: 'SGPT (ALT)', unit: 'U/L', lo: 7, hi: 56, dLo: 0, dHi: 200,
        loTips: ['Good liver health — avoid excess alcohol'],
        hiTips: ['Avoid alcohol completely', 'Stop/reduce paracetamol/NSAIDs', 'Eat light, low-fat diet', 'Get hepatitis B & C ruled out']
    },
    sgot: {
        label: 'SGOT (AST)', unit: 'U/L', lo: 10, hi: 40, dLo: 0, dHi: 200,
        loTips: ['Keep up healthy diet habits'],
        hiTips: ['Could indicate liver disease or muscle injury', 'Get SGOT/SGPT ratio assessed', 'Check if intense exercise caused it']
    },
    tsh: {
        label: 'TSH (Thyroid)', unit: 'mIU/L', lo: 0.4, hi: 4.0, dLo: 0, dHi: 10,
        loTips: ['Get Free T3 and Free T4 tested', 'Watch for rapid heart rate, anxiety, weight loss', 'Consult endocrinologist'],
        hiTips: ['Get Free T4 tested', 'Watch for fatigue, hair loss, weight gain', 'Doctor may prescribe Levothyroxine']
    },
    systolic_bp: {
        label: 'Systolic BP', unit: 'mmHg', lo: 90, hi: 120, dLo: 60, dHi: 200,
        loTips: ['Increase salt and fluid intake slightly', 'Avoid standing up suddenly'],
        hiTips: ['Reduce sodium (salt) intake', 'Exercise regularly', 'Avoid smoking and alcohol', 'Monitor BP daily']
    },
    diastolic_bp: {
        label: 'Diastolic BP', unit: 'mmHg', lo: 60, hi: 80, dLo: 40, dHi: 130,
        loTips: ['Stay hydrated', 'Check with doctor if symptoms persist'],
        hiTips: ['Cut down on caffeine', 'Practice deep breathing/stress relief', 'Follow up with cardiologist if persistent']
    },
    mcv: {
        label: 'MCV', unit: 'fl', lo: 80, hi: 100, dLo: 60, dHi: 130,
        loTips: ['Low MCV may indicate iron-deficiency anemia', 'Increase iron-rich foods: spinach, red meat, lentils', 'Get serum ferritin test'],
        hiTips: ['High MCV may indicate B12 or folate deficiency', 'Get Vitamin B12 and folate levels tested', 'Reduce alcohol intake']
    },
    mch: {
        label: 'MCH', unit: 'pg', lo: 27, hi: 33, dLo: 15, dHi: 50,
        loTips: ['Low MCH suggests iron-deficiency anemia', 'Eat iron-rich and Vitamin C-rich foods', 'Avoid tea/coffee right after meals'],
        hiTips: ['High MCH may suggest B12/folate deficiency', 'Get B12 and folate blood tests']
    },
    mchc: {
        label: 'MCHC', unit: 'g/dL', lo: 32, hi: 36, dLo: 20, dHi: 45,
        loTips: ['Low MCHC indicates hypochromic anemia', 'Increase intake of iron-rich foods', 'Consult doctor for further tests'],
        hiTips: ['High MCHC may indicate hereditary spherocytosis', 'Consult your doctor for interpretation']
    },
    haematocrit: {
        label: 'Haematocrit (PCV)', unit: '%', lo: 36, hi: 48, dLo: 20, dHi: 70,
        loTips: ['Low PCV indicates anemia', 'Increase iron and B12 intake', 'Get a complete iron panel done'],
        hiTips: ['High PCV may indicate dehydration or polycythemia', 'Drink more water', 'Consult doctor if persistently high']
    },
}

function getMetricStatus(key, value) {
    const m = METRIC_CATALOG[key]
    if (!m) return null
    const { lo, hi, dLo, dHi, label, unit } = m
    const status = value < lo ? 'low' : value > hi ? 'high' : 'normal'
    const rng = dHi - dLo
    const pct = rng ? Math.max(0, Math.min(100, (value - dLo) / rng * 100)) : 50
    const lo_pct = rng ? Math.max(0, Math.min(100, (lo - dLo) / rng * 100)) : 0
    const hi_pct = rng ? Math.max(0, Math.min(100, (hi - dLo) / rng * 100)) : 100
    return {
        key, label, value, unit, status,
        normal_range: `${lo}–${hi > 900 ? '∞' : hi} ${unit}`,
        pct: +pct.toFixed(1), lo_pct: +lo_pct.toFixed(1), hi_pct: +hi_pct.toFixed(1),
        rec_tips: status === 'low' ? m.loTips : status === 'high' ? m.hiTips : [],
        rec_title: status === 'low'
            ? `Low ${label}`
            : status === 'high'
                ? `High ${label}`
                : `${label} is Normal ✓`,
        normal_lo: lo, normal_hi: hi,
    }
}

// ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
    low: { bg: 'rgba(251,191,36,0.12)', border: '#f59e0b', text: '#f59e0b', chip: 'LOW ↓', icon: '📉' },
    normal: { bg: 'rgba(16,185,129,0.10)', border: '#10b981', text: '#10b981', chip: 'NORMAL ✓', icon: '✅' },
    high: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#ef4444', chip: 'HIGH ↑', icon: '⚠️' },
}

function MetricBar({ rec }) {
    const sc = STATUS_COLORS[rec.status]
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 16, padding: '16px 18px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rec.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Normal: {rec.normal_range}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: sc.text, lineHeight: 1 }}>{rec.value}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{rec.unit}</div>
                </div>
            </div>
            {/* Range track */}
            <div style={{ position: 'relative', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 4 }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${rec.lo_pct}%`, width: `${rec.hi_pct - rec.lo_pct}%`, background: 'rgba(16,185,129,0.4)', borderRadius: 999 }} />
                <div style={{ position: 'absolute', top: '50%', left: `${rec.pct}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: sc.text, border: '2px solid var(--bg-card)', boxShadow: `0 0 8px ${sc.text}`, zIndex: 2 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span>Low</span>
                <span style={{ color: sc.text, fontWeight: 700 }}>{sc.chip}</span>
                <span>High</span>
            </div>
        </motion.div>
    )
}

function RecommendationCard({ rec, defaultOpen }) {
    const [open, setOpen] = useState(defaultOpen || false)
    const sc = STATUS_COLORS[rec.status]
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ border: `1px solid ${sc.border}`, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '1.2rem' }}>{sc.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: sc.text, fontSize: '0.88rem' }}>{rec.rec_title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {rec.label}: <strong style={{ color: sc.text }}>{rec.value} {rec.unit}</strong> &nbsp;(normal {rec.normal_range})
                    </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '4px 16px 14px', borderTop: `1px solid ${sc.border}33` }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '10px 0 8px' }}>💡 <strong>What you can do:</strong></p>
                            <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {rec.rec_tips.map((tip, i) => (
                                    <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ── Frontend fallback: parse values from AI Summary text ──────────────────
// Used when backend failed to store metrics (e.g. first-time CBC upload)
function parseSummaryForMetrics(text) {
    if (!text) return {}
    const t = text.toLowerCase()
    const num = (s) => s ? parseFloat(s.replace(/,/g, '')) : null

    const rx = {
        hemoglobin: /(?:h(?:a)?emoglobin|hgb|hb)[:\s]+([0-9,]+\.?[0-9]*)/,
        glucose: /(?:glucose|blood\s*sugar|fbs|rbs)[:\s]+([0-9,]+\.?[0-9]*)/,
        cholesterol: /(?:total\s*cholesterol|cholesterol)[:\s]+([0-9,]+\.?[0-9]*)/,
        triglycerides: /(?:triglycerides?|tg)[:\s]+([0-9,]+\.?[0-9]*)/,
        hdl: /(?:hdl)[:\s]+([0-9,]+\.?[0-9]*)/,
        ldl: /(?:ldl)[:\s]+([0-9,]+\.?[0-9]*)/,
        wbc: /(?:total\s*wbc\s*count|wbc[\s\w]*count|wbc|white\s*blood[^.]{0,20}?)[\s:]+([0-9,]+\.?[0-9]*)/,
        rbc: /(?:rbcs?\s*count|rbc|red\s*blood[^.]{0,20}?)[\s:]+([0-9,]+\.?[0-9]*)/,
        platelets: /(?:platelet\s*count|platelet|plt)[\s:]+([0-9,]+\.?[0-9]*)/,
        creatinine: /(?:creatinine)[:\s]+([0-9,]+\.?[0-9]*)/,
        sgpt: /(?:sgpt|alt)[:\s]+([0-9,]+\.?[0-9]*)/,
        sgot: /(?:sgot|ast)[:\s]+([0-9,]+\.?[0-9]*)/,
        tsh: /(?:tsh)[:\s]+([0-9,]+\.?[0-9]*)/,
        mcv: /(?:mcv|mean\s*corpuscular\s*volume)[:\s]+([0-9,]+\.?[0-9]*)/,
        mch: /(?:mch(?!c)|mean\s*corpuscular\s*h(?:a)?emoglobin(?!\s*conc))[:\s]+([0-9,]+\.?[0-9]*)/,
        mchc: /(?:mchc)[:\s]+([0-9,]+\.?[0-9]*)/,
        haematocrit: /(?:p\.?c\.?v\.?|h(?:a)?ematocrit|packed\s*cell)[:\s]+([0-9,]+\.?[0-9]*)/,
    }

    const out = {}
    for (const [key, pattern] of Object.entries(rx)) {
        const m = t.match(pattern)
        if (m) {
            let v = num(m[1])
            if (v !== null && v > 0) {
                // Normalize cell counts to catalog units
                if (key === 'wbc' && v > 100) v = +(v / 1000).toFixed(2)
                // Platelets: lakhs (< 10) ×100 → k/µL; raw count (> 1000) ÷ 1000
                if (key === 'platelets') {
                    if (v < 10) v = +(v * 100).toFixed(1)
                    else if (v > 1000) v = +(v / 1000).toFixed(1)
                }
                if (key === 'rbc' && v > 20) v = +(v / 1_000_000).toFixed(2)
                out[key] = v
            }
        }
    }
    return out
}

// ══════════════════════════════════════════════════════════
//  REPLACE the entire ReportDetailView function in Dashboard.jsx
//  with this version.
//
//  FIXES:
//  1. Normal values now show correctly (were always empty because
//     backend only saves abnormal recommendations).
//  2. Recommendations always recomputed fresh from allMetrics using
//     getMetricStatus() — so MCH/MCHC/MCV/haematocrit all appear.
//  3. Old reports with wrong metric values (e.g. MCH=3000) are
//     auto-corrected client-side before display.
//  4. Below Normal box now populates correctly.
// ══════════════════════════════════════════════════════════

// ── Client-side unit normalisation (mirrors backend fix) ──────────────────
// Corrects old reports already saved in MongoDB with wrong values.
function normaliseMetrics(raw) {
    if (!raw) return {}
    const m = { ...raw }
    if (m.wbc && m.wbc > 100)          m.wbc        = +(m.wbc / 1000).toFixed(2)
    if (m.platelets) {
        if (m.platelets < 10)           m.platelets  = +(m.platelets * 100).toFixed(1)
        else if (m.platelets > 1000)    m.platelets  = +(m.platelets / 1000).toFixed(1)
    }
    if (m.rbc && m.rbc > 20)           m.rbc        = +(m.rbc / 1_000_000).toFixed(2)
    if (m.mch && m.mch > 100)          m.mch        = +(m.mch / 100).toFixed(1)
    if (m.mchc && m.mchc > 100)        m.mchc       = +(m.mchc / 10).toFixed(1)
    if (m.mcv && m.mcv > 200)          m.mcv        = +(m.mcv / 10).toFixed(1)
    if (m.haematocrit && m.haematocrit < 1) m.haematocrit = +(m.haematocrit * 100).toFixed(1)
    return m
}

function ReportDetailView({ report, onBack }) {
    const [extraMetrics, setExtraMetrics] = useState({})

    useEffect(() => {
        if (!report.metrics || Object.keys(report.metrics).length === 0) {
            const parsed = parseSummaryForMetrics(report.summary || '')
            setExtraMetrics(parsed)
        }
    }, [report._id])

    // 1. Merge raw metrics (backend takes priority over summary-parsed)
    const rawMetrics = Object.keys(report.metrics || {}).length > 0
        ? (report.metrics || {})
        : extraMetrics

    // 2. Normalise units — fixes old saved reports with wrong values
    const allMetrics = normaliseMetrics(rawMetrics)

    // 3. ALWAYS recompute recs from allMetrics using getMetricStatus()
    //    This ensures:
    //    - Normal values appear (backend only saves abnormal recs)
    //    - MCH/MCHC/MCV/haematocrit are included
    //    - Fresh tips from METRIC_CATALOG are used
    const recs = Object.entries(allMetrics)
        .map(([k, v]) => getMetricStatus(k, v))
        .filter(Boolean)

    // 4. Split by status
    const elevated = recs.filter(r => r.status === 'high')
    const lowVals  = recs.filter(r => r.status === 'low')
    const normal   = recs.filter(r => r.status === 'normal')
    const abnormal = [...elevated, ...lowVals]

    // 5. Table rows
    const tableRows = Object.entries(allMetrics).map(([k, v]) => {
        const m = METRIC_CATALOG[k]
        const status = !m ? 'unknown' : v < m.lo ? 'low' : v > m.hi ? 'high' : 'normal'
        return {
            key: k,
            label: m?.label || k.replace(/_/g, ' '),
            value: v,
            unit: m?.unit || '',
            normal_range: m ? `${m.lo}–${m.hi > 900 ? '∞' : m.hi} ${m.unit}` : '—',
            status,
        }
    })

    return (
        <div>
            <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Reports</button>

            {/* ── Header ── */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 8 }}>{report.original_name}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-cyan">{report.report_type}</span>
                    {elevated.length > 0 && (
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef444440' }}>
                            ⬆️ {elevated.length} elevated
                        </span>
                    )}
                    {lowVals.length > 0 && (
                        <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
                            ⬇️ {lowVals.length} low
                        </span>
                    )}
                    {normal.length > 0 && (
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b98140' }}>
                            ✓ {normal.length} normal
                        </span>
                    )}
                </div>
            </div>

            {/* ── 3 Status Boxes ── */}
            {recs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>

                    {/* Elevated box */}
                    <div style={{ borderRadius: 16, border: '1px solid #ef444450', background: 'rgba(239,68,68,0.07)', padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.2rem' }}>⬆️</span>
                            <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>ELEVATED VALUES</span>
                        </div>
                        {elevated.length === 0
                            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None — all in range ✓</p>
                            : elevated.map(r => (
                                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.label}</span>
                                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.88rem' }}>
                                        {r.value} <span style={{ fontWeight: 400, fontSize: '0.7rem' }}>{r.unit}</span>
                                    </span>
                                </div>
                            ))
                        }
                    </div>

                    {/* Below Normal box */}
                    <div style={{ borderRadius: 16, border: '1px solid #f59e0b50', background: 'rgba(251,191,36,0.07)', padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>BELOW NORMAL</span>
                        </div>
                        {lowVals.length === 0
                            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None — all in range ✓</p>
                            : lowVals.map(r => (
                                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(251,191,36,0.12)' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.label}</span>
                                    <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.88rem' }}>
                                        {r.value} <span style={{ fontWeight: 400, fontSize: '0.7rem' }}>{r.unit}</span>
                                    </span>
                                </div>
                            ))
                        }
                    </div>

                    {/* Normal box */}
                    <div style={{ borderRadius: 16, border: '1px solid #10b98150', background: 'rgba(16,185,129,0.07)', padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                            <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>NORMAL VALUES</span>
                        </div>
                        {normal.length === 0
                            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No values in normal range yet</p>
                            : normal.map(r => (
                                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.label}</span>
                                    <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>
                                        {r.value} <span style={{ fontWeight: 400, fontSize: '0.7rem' }}>{r.unit}</span>
                                    </span>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* ── Range Bars (all metrics) ── */}
            {recs.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '1rem' }}>📊 Lab Values at a Glance</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
                        {recs.map(rec => <MetricBar key={rec.key} rec={rec} />)}
                    </div>
                </div>
            )}

            {/* ── Recommendations (only abnormal — high + low) ── */}
            {abnormal.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: '1rem' }}>🩺 What You Should Do</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Click each card for actionable steps. Always consult your doctor before making changes.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {abnormal.map((rec, i) => (
                            <RecommendationCard key={rec.key} rec={rec} defaultOpen={i === 0} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── AI Summary ── */}
            {report.summary && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🧠 AI Summary</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.85, fontSize: '0.88rem', whiteSpace: 'pre-line' }}>
                        {report.summary}
                    </p>
                </div>
            )}

            {/* ── Full Data Table ── */}
            {tableRows.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '1rem' }}>🔬 Complete Lab Report Data</h3>
                    <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                                    {['Parameter', 'Your Value', 'Unit', 'Normal Range', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row, i) => {
                                    const sc = STATUS_COLORS[row.status] || STATUS_COLORS.normal
                                    return (
                                        <tr key={row.key} style={{
                                            borderBottom: i < tableRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                            background: row.status !== 'normal' ? sc.bg : 'transparent',
                                            transition: 'background 0.2s',
                                        }}>
                                            <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</td>
                                            <td style={{ padding: '11px 16px', fontWeight: 800, fontSize: '1rem', color: sc.text }}>{row.value}</td>
                                            <td style={{ padding: '11px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row.unit}</td>
                                            <td style={{ padding: '11px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row.normal_range}</td>
                                            <td style={{ padding: '11px 16px' }}>
                                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                                                    {sc.chip}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Disclaimer ── */}
            <div style={{ padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    ⚕️ <strong>Disclaimer:</strong> RAGnosis uses AI for preliminary analysis only. These results are not a substitute for professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.
                </p>
            </div>
        </div>
    )
}

// ── Sidebar items ──
const NAV = [
    { key: 'overview', icon: '🏠', label: 'Overview' },
    { key: 'health', icon: '💚', label: 'Health Card' },
    { key: 'upload', icon: '📤', label: 'Upload Report' },
    { key: 'reports', icon: '📋', label: 'My Reports' },
    { key: 'metrics', icon: '📊', label: 'Health Metrics' },
    { key: 'reminders', icon: '💊', label: 'Medicine Reminders' },
    { key: 'prescriptions', icon: '🩺', label: 'Prescriptions' },
    { key: 'chatbot', icon: '🤖', label: 'AI Chatbot' },
    { key: 'profile', icon: '👤', label: 'My Profile' },
]

// ══════════════════════════════════════════════════════════
//  PRESCRIPTIONS TAB
// ══════════════════════════════════════════════════════════
function PrescriptionsTab() {
    const [prescriptions, setPrescriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        axios.get('/api/hospital/prescriptions/me')
            .then(res => setPrescriptions(res.data.prescriptions || []))
            .catch(() => toast.error('Could not load prescriptions'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

    if (prescriptions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🩺</div>
                <p>No prescriptions yet. Your doctor's prescriptions will appear here.</p>
            </div>
        )
    }

    return (
        <div>
            <h2 style={{ fontWeight: 800, marginBottom: 24, fontSize: '1.5rem', color: 'var(--text-primary)' }}>💊 My Prescriptions ({prescriptions.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {prescriptions.map(px => {
                    const isExpanded = expandedId === px._id
                    const medicineCount = (px.medicines || []).length
                    
                    return (
                        <motion.div 
                            key={px._id} 
                            initial={{ opacity: 0, y: 12 }} 
                            animate={{ opacity: 1, y: 0 }}
                            style={{ 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 16, 
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}>
                            
                            {/* Header - Always Visible */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : px._id)}
                                style={{
                                    padding: '18px 24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: 'var(--bg-secondary)',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                            >
                                {/* Doctor Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ fontSize: '1.4rem' }}>👨‍⚕️</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                                Dr. {px.doctor_name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {px.doctor_specialization || 'Doctor'} • {new Date(px.created_at?.$date || px.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Medicine Count & Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
                                    <span style={{
                                        background: 'var(--accent-cyan)',
                                        color: '#000',
                                        padding: '6px 12px',
                                        borderRadius: 8,
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {medicineCount} 💊
                                    </span>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        color: 'var(--accent-cyan)',
                                        transition: 'transform 0.3s ease',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}>
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {/* Expandable Medicines Section */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
                                            {/* Medicines List */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                                                {(px.medicines || []).map((m, i) => (
                                                    <div 
                                                        key={i} 
                                                        style={{
                                                            padding: '16px',
                                                            background: 'var(--bg-primary)',
                                                            borderRadius: 12,
                                                            border: '1px solid var(--border)',
                                                            borderLeft: '4px solid var(--accent-cyan)'
                                                        }}
                                                    >
                                                        {/* Medicine Name */}
                                                        <div style={{ marginBottom: 12 }}>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>💊 Medicine Name</div>
                                                            <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>{m.name}</div>
                                                        </div>

                                                        {/* Details Grid */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                                                            {m.dosage && (
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>📏 Dosage</div>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{m.dosage}</div>
                                                                </div>
                                                            )}
                                                            {m.frequency && (
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>⏰ Frequency</div>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{m.frequency}</div>
                                                                </div>
                                                            )}
                                                            {m.duration && (
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>📅 Duration</div>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{m.duration}</div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Instructions */}
                                                        {m.instructions && (
                                                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>📝 Instructions</div>
                                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.instructions}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Doctor's Notes */}
                                            {px.notes && (
                                                <div style={{
                                                    padding: '14px 16px',
                                                    background: 'rgba(124, 58, 237, 0.1)',
                                                    borderRadius: 10,
                                                    border: '1px solid var(--accent-purple)',
                                                    borderLeft: '4px solid var(--accent-purple)'
                                                }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>📋 Doctor's Notes</div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{px.notes}</div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Metric status helper ──
function metricStatus(key, value) {
    const ranges = {
        hemoglobin: [12, 17.5], glucose: [70, 100], cholesterol: [0, 200],
        triglycerides: [0, 150], hdl: [60, 999], ldl: [0, 100],
        wbc: [4.5, 11], rbc: [4, 5.5], platelets: [150, 400],
        creatinine: [0.5, 1.2], tsh: [0.4, 4.0], sgpt: [7, 56], sgot: [10, 40],
    }
    const r = ranges[key]
    if (!r) return 'normal'
    if (value < r[0]) return 'low'
    if (value > r[1]) return 'high'
    return 'normal'
}

// ══════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════════════
function OverviewTab({ user, reports, setActiveTab }) {
    const latestReport = reports[0]
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Welcome banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(124,58,237,0.08) 100%)',
                border: '1px solid var(--border)',
                borderRadius: 20, padding: '28px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 16
            }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>
                        Good evening, <span className="gradient-text">{user?.name?.split(' ')[0]} 👋</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {reports.length === 0
                            ? 'Upload your first medical report to get started!'
                            : `You have ${reports.length} report${reports.length !== 1 ? 's' : ''} analyzed.`}
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setActiveTab('upload')}>📤 Upload Report</button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                {[
                    { icon: '📄', label: 'Total Reports', value: reports.length },
                    { icon: '🧬', label: 'Reports Analyzed', value: reports.filter(r => r.summary).length },
                    {
                        icon: '📅', label: 'This Month', value: reports.filter(r => {
                            const d = new Date(r.uploaded_at)
                            const now = new Date()
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                        }).length
                    },
                    { icon: '💬', label: 'AI Sessions', value: 'Active' },
                ].map(s => (
                    <div key={s.label} className="metric-card">
                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{s.value}</div>
                        <div className="metric-label" style={{ marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Latest report */}
            {latestReport && (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ fontSize: '1.3rem' }}>🩺</div>
                        <div>
                            <h3 style={{ fontWeight: 700 }}>Latest Report</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {latestReport.original_name} · {latestReport.report_type}
                            </p>
                        </div>
                        <div className="badge badge-cyan" style={{ marginLeft: 'auto' }}>{latestReport.report_type}</div>
                    </div>
                    {latestReport.summary && (
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                            {latestReport.summary}
                        </div>
                    )}
                    {latestReport.metrics && Object.keys(latestReport.metrics).length > 0 && (
                        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {Object.entries(latestReport.metrics).map(([k, v]) => {
                                const status = metricStatus(k, v)
                                return (
                                    <div key={k} style={{ background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: 100, display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                                        <span style={{ fontWeight: 700, color: status === 'normal' ? 'var(--accent-green)' : status === 'high' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{v}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {reports.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏥</div>
                    <p style={{ fontSize: '1.1rem', marginBottom: 20 }}>No reports yet. Start by uploading one!</p>
                    <button className="btn-primary" onClick={() => setActiveTab('upload')}>📤 Upload Your First Report</button>
                </div>
            )}
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  UPLOAD TAB
// ══════════════════════════════════════════════════════════
function UploadTab({ onUploadSuccess }) {
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)
    const [uploadError, setUploadError] = useState(null)  // { type, message }

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!acceptedFiles.length) return
        const file = acceptedFiles[0]
        const formData = new FormData()
        formData.append('file', file)
        setUploading(true)
        setResult(null)
        setUploadError(null)
        toast.loading('🔬 Analyzing your report with AI...', { id: 'upload' })
        try {
            const res = await axios.post('/api/reports/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            })
            setResult(res.data)
            toast.success('✅ Report analyzed successfully!', { id: 'upload' })
            onUploadSuccess()
        } catch (err) {
            const status = err.response?.status
            const data = err.response?.data || {}

            if (status === 422 && data.error === 'out_of_knowledge_base') {
                setUploadError({ type: 'ook', message: data.message })
                toast.dismiss('upload')
            } else if (status === 400 && data.error === 'unreadable') {
                setUploadError({ type: 'unreadable', message: data.message })
                toast.dismiss('upload')
            } else {
                toast.error(data.message || data.error || 'Upload failed', { id: 'upload' })
            }
        } finally {
            setUploading(false)
        }
    }, [onUploadSuccess])


    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
        maxFiles: 1,
        disabled: uploading,
    })

    return (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.5rem' }}>Upload Medical Report</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                Supports PDF, JPG, PNG, JPEG — max 25MB. AI will extract, summarize, and analyze your report.
            </p>

            <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-active' : ''}`} id="upload-dropzone">
                <input {...getInputProps()} id="report-file-input" />
                {uploading ? (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚙️</div>
                        <div className="upload-title">AI is analyzing your report...</div>
                        <div className="upload-subtitle">Extracting text and analyzing your report — this may take a few seconds</div>
                        <div className="spinner" style={{ margin: '16px auto 0' }} />
                    </>
                ) : isDragActive ? (
                    <>
                        <div className="upload-icon">📂</div>
                        <div className="upload-title">Drop it here!</div>
                    </>
                ) : (
                    <>
                        <div className="upload-icon">📄</div>
                        <div className="upload-title">Drag & drop your report here</div>
                        <div className="upload-subtitle">or click to browse files · PDF, JPG, PNG, JPEG · Max 25MB</div>
                        <button className="btn-primary" type="button" style={{ marginTop: 16 }}>Choose File</button>
                    </>
                )}
            </div>

            {/* ── Error cards ── */}
            <AnimatePresence>
                {uploadError && uploadError.type === 'ook' && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{
                            marginTop: 24, padding: '20px 24px', borderRadius: 16,
                            border: '1px solid #f59e0b', background: 'rgba(251,191,36,0.08)'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: '1.5rem' }}>🔬</span>
                            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>Out of Knowledge Base</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 12 }}>
                            {uploadError.message}
                        </p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <strong>Supported reports:</strong> CBC / Haematology · Lipid Panel · Liver Function (LFT) · Kidney Function (KFT) · Thyroid · Diabetes / Glucose · Blood Pressure
                        </div>
                    </motion.div>
                )}
                {uploadError && uploadError.type === 'unreadable' && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{
                            marginTop: 24, padding: '20px 24px', borderRadius: 16,
                            border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: '1.5rem' }}>❌</span>
                            <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>Could Not Read File</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 12 }}>
                            {uploadError.message}
                        </p>
                        <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: 18, lineHeight: 1.8 }}>
                            <li>Use a high-resolution scan (≥ 150 DPI)</li>
                            <li>Upload a digital (not handwritten) report</li>
                            <li>Make sure the image is well-lit and not blurry</li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Success result ── */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginTop: 32 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div className="badge badge-green">✅ Analysis Complete</div>
                            <div className="badge badge-cyan">{result.report_type}</div>
                        </div>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🧠 AI Summary</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{result.summary}</p>
                        </div>

                        {result.metrics && Object.keys(result.metrics).length > 0 && (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📊 Extracted Values</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                    {Object.entries(result.metrics).map(([k, v]) => {
                                        const status = metricStatus(k, v)
                                        return (
                                            <div key={k} className="metric-card" style={{ padding: '12px 16px' }}>
                                                <div className="metric-label">{k.replace(/_/g, ' ')}</div>
                                                <div className={`metric-value metric-${status}`} style={{ fontSize: '1.4rem' }}>{v}</div>
                                                <div className={`metric-status metric-${status}`}>{status.toUpperCase()}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  REPORTS TAB
// ══════════════════════════════════════════════════════════
function ReportsTab({ reports, onSelect }) {
    const typeIcons = { 'Blood / CBC Report': '🩸', 'Diabetes / Glucose Report': '💉', 'Lipid Panel Report': '💛', 'Kidney Function Report': '🫘', 'Liver Function Report': '🫀', 'Thyroid Report': '🦋', 'Radiology Report': '🔬', 'General Medical Report': '📋' }

    if (reports.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📂</div>
                <p>No reports yet. Upload your first medical report to see it here.</p>
            </div>
        )
    }

    return (
        <div>
            <h2 style={{ fontWeight: 800, marginBottom: 24, fontSize: '1.5rem' }}>My Reports ({reports.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {reports.map(r => (
                    <motion.div key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="report-card" onClick={() => onSelect(r)}
                    >
                        <div className="report-icon-wrap" style={{ background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}>
                            {typeIcons[r.report_type] || '📋'}
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{r.original_name || r.filename}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                            {r.report_type} · {new Date(r.uploaded_at?.$date || r.uploaded_at).toLocaleDateString()}
                        </p>
                        {r.metrics && Object.keys(r.metrics).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Object.entries(r.metrics).slice(0, 4).map(([k, v]) => (
                                    <span key={k} style={{ fontSize: '0.72rem', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 100, color: 'var(--text-secondary)' }}>
                                        {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                                    </span>
                                ))}
                            </div>
                        )}
                        {r.summary && (
                            <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {r.summary}
                            </p>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  METRICS TAB
// ══════════════════════════════════════════════════════════
function MetricsTab({ reports }) {
    const allMetrics = reports.flatMap(r =>
        Object.entries(r.metrics || {}).map(([k, v]) => ({
            name: r.original_name?.slice(0, 15) || 'Report',
            key: k, value: v,
            date: new Date(r.uploaded_at?.$date || r.uploaded_at).toLocaleDateString()
        }))
    )

    const uniqueKeys = [...new Set(allMetrics.map(m => m.key))]

    // Build timeline data
    const timelineData = reports.map(r => ({
        date: new Date(r.uploaded_at?.$date || r.uploaded_at).toLocaleDateString(),
        ...(r.metrics || {})
    })).reverse()

    if (reports.length === 0) {
        return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
            <p>Upload reports to see your health metrics visualized here!</p>
        </div>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Health Metrics Dashboard</h2>

            {/* Metric cards */}
            {allMetrics.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                    {Object.entries(reports[0]?.metrics || {}).map(([k, v]) => {
                        const status = metricStatus(k, v)
                        return (
                            <div key={k} className="metric-card">
                                <div className="metric-label">{k.replace(/_/g, ' ')}</div>
                                <div className={`metric-value metric-${status}`}>{v}</div>
                                <div className={`metric-status metric-${status}`}>{status.toUpperCase()}</div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Timeline bar chart */}
            {Object.keys(reports[0]?.metrics || {}).length > 0 && (
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📈 Latest Report Values</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(reports[0]?.metrics || {}).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                            <Bar dataKey="value" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Trend over reports if multiple */}
            {reports.length > 1 && uniqueKeys.slice(0, 3).map(key => (
                <div key={key} className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📉 {key.replace(/_/g, ' ')} — Trend Over Time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={timelineData.filter(d => d[key] !== undefined)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                            <Line type="monotone" dataKey={key} stroke="var(--accent-cyan)" strokeWidth={2} dot={{ fill: 'var(--accent-cyan)', r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ))}
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  CHATBOT TAB
// ══════════════════════════════════════════════════════════
function ChatbotTab({ reports }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 Hi! I\'m RAGnosis AI — your personal medical assistant. You can ask me anything about your report or general health questions. I use RAG + Groq to give you accurate, medically-grounded answers!' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedReport, setSelectedReport] = useState(reports[0]?._id || null)
    const messagesEndRef = useRef(null)
    const SUGGESTIONS = ['What does my hemoglobin level mean?', 'Is my blood sugar normal?', 'Explain my cholesterol results', 'Any abnormal values in my report?']

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    const sendMessage = async (text) => {
        const userMsg = text || input.trim()
        if (!userMsg) return
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)
        try {
            const res = await axios.post('/api/chat/', {
                message: userMsg,
                report_id: selectedReport,
                history: messages.slice(-6),
            })
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I couldn\'t connect. Please check your Groq API key and try again.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>🤖 AI Medical Assistant</h2>
                {reports.length > 0 && (
                    <select
                        className="input"
                        style={{ width: 'auto', fontSize: '0.85rem', padding: '8px 12px' }}
                        id="report-select"
                        value={selectedReport || ''}
                        onChange={e => setSelectedReport(e.target.value || null)}
                    >
                        <option value="">Chat without report context</option>
                        {reports.map(r => <option key={r._id} value={r._id}>{r.original_name || r.filename}</option>)}
                    </select>
                )}
            </div>

            {/* Quick suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)} className="badge badge-cyan" style={{ cursor: 'pointer', fontSize: '0.78rem', padding: '6px 14px' }}>
                        {s}
                    </button>
                ))}
            </div>

            <div className="chat-container">
                <div className="chat-header">
                    <div className="chat-avatar">🩺</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>RAGnosis AI</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>● Online · Groq + RAG Powered</div>
                    </div>
                    {selectedReport && <div className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Report Context Active</div>}
                </div>

                <div className="chat-messages" id="chat-messages">
                    {messages.map((m, i) => (
                        <div key={i} className={`message message-${m.role === 'user' ? 'user' : 'bot'}`}>
                            {m.role === 'assistant' && <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem', flexShrink: 0 }}>🩺</div>}
                            <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message message-bot">
                            <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem', flexShrink: 0 }}>🩺</div>
                            <div className="message-bubble">
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-cyan)', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        className="chat-input"
                        id="chat-input"
                        placeholder="Ask about your report or any health question..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <button className="chat-send" id="chat-send" onClick={() => sendMessage()} disabled={loading}>
                        ➤
                    </button>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  PROFILE TAB
// ══════════════════════════════════════════════════════════
function ProfileTab({ user }) {
    return (
        <div style={{ maxWidth: 560 }}>
            <h2 style={{ fontWeight: 800, marginBottom: 24, fontSize: '1.5rem' }}>My Profile</h2>
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                    <div style={{ width: 64, height: 64, background: 'var(--gradient-cyan)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900, color: '#060d1f' }}>
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                        ['📧 Email', user?.email],
                        ['📱 Mobile', user?.mobile || '—'],
                        ['🎂 Age', user?.age ? `${user.age} years` : '—'],
                        ['📐 Height', user?.height_inches ? `${user.height_inches} inches` : '—'],
                        ['⚖️ Weight', user?.weight_kg ? `${user.weight_kg} kg` : '—'],
                        ['🩸 Blood Group', user?.blood_group || '—'],
                        ['💉 Blood Pressure', user?.blood_pressure || '—'],
                        ['👤 Gender', user?.gender || '—'],
                    ].map(([label, value]) => (
                        <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontWeight: 600 }}>{value || '—'}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [reports, setReports] = useState([])
    const [selectedReport, setSelectedReport] = useState(null)
    const [loadingReports, setLoadingReports] = useState(true)

    const fetchReports = useCallback(async () => {
        try {
            const res = await axios.get('/api/reports/')
            setReports(res.data.reports || [])
        } catch (e) {
            toast.error('Could not load reports')
        } finally {
            setLoadingReports(false)
        }
    }, [])

    useEffect(() => { fetchReports() }, [fetchReports])

    const renderContent = () => {
        const REPORT_TABS = ['overview', 'reports', 'report-detail', 'metrics', 'health']
        if (loadingReports && REPORT_TABS.includes(activeTab)) {
            return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        }
        switch (activeTab) {
            case 'overview': return <OverviewTab user={user} reports={reports} setActiveTab={setActiveTab} />
            case 'health': return <HealthCard />
            case 'upload': return <UploadTab onUploadSuccess={fetchReports} />
            case 'reports': return <ReportsTab reports={reports} onSelect={async (r) => {
                try {
                    const full = await axios.get(`/api/reports/${r._id}`)
                    setSelectedReport(full.data)
                } catch {
                    setSelectedReport(r)  // fallback to partial data
                }
                setActiveTab('report-detail')
            }} />
            case 'report-detail':
                return selectedReport ? (
                    <ReportDetailView
                        report={selectedReport}
                        onBack={() => setActiveTab('reports')}
                    />
                ) : null
            case 'metrics': return <MetricsTab reports={reports} />
            case 'reminders': return <MedicineRemindersTab />
            case 'prescriptions': return <PrescriptionsTab />
            case 'chatbot': return <ChatbotTab reports={reports} />
            case 'profile': return <ProfileTab user={user} />
            default: return null
        }
    }

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Navigation</div>
                </div>
                {NAV.map(item => (
                    <div
                        key={item.key}
                        id={`sidebar-${item.key}`}
                        className={`sidebar-item ${activeTab === item.key || (item.key === 'reports' && activeTab === 'report-detail') ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.key)}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.key === 'reports' && reports.length > 0 && (
                            <span className="badge badge-cyan" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '0.7rem' }}>{reports.length}</span>
                        )}
                    </div>
                ))}
            </aside>

            {/* Main content */}
            <main className="dashboard-main">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
