import { useState, useEffect } from 'react'
import axios from 'axios'

// Metrics with normal ranges and points
const HEALTH_METRICS_CONFIG = [
    { weight: 0.15, label: 'Excellent (85-100%)', conditions: 'All metrics within normal range' },
    { weight: 0.25, label: 'Good (70-84%)', conditions: '80-90% of metrics normal, minor abnormalities' },
    { weight: 0.35, label: 'Fair (50-69%)', conditions: '50-70% of metrics normal, multiple concerns' },
    { weight: 0.25, label: 'Needs Improvement (<50%)', conditions: 'Less than 50% of metrics normal' },
]

const INSURANCE_ADVICE = {
    excellent: {
        icon: '💚',
        title: 'Excellent Health Status',
        color: '#10b981',
        advice: [
            '✅ Standard health insurance plans are ideal for you',
            '✅ Lower premiums possible due to excellent health profile',
            '✅ Focus on preventive care insurance to maintain your health',
            '💡 Consider critical illness riders for additional protection',
        ],
        tips: 'Continue regular health check-ups (annually) and maintain your current lifestyle.'
    },
    good: {
        icon: '💙',
        title: 'Good Health Status',
        color: '#3b82f6',
        advice: [
            '✅ Eligible for standard health insurance with good coverage',
            '⚠️ Some insurers may offer minor premium adjustments',
            '💡 Consider comprehensive health plans with wellness benefits',
            '💡 Add coverage for chronic disease management if applicable',
        ],
        tips: 'Monitor your health metrics regularly (every 6 months) and address any minor concerns early.'
    },
    fair: {
        icon: '🟡',
        title: 'Fair Health Status',
        color: '#f59e0b',
        advice: [
            '⚠️ Enhanced health insurance coverage is recommended',
            '⚠️ May face higher premiums due to moderate health risks',
            '💡 Look for policies with comprehensive outpatient benefits',
            '💡 Consider critical illness and accidental injury coverage',
            '💡 Enroll in disease management programs offered by insurers',
        ],
        tips: 'Schedule appointments with healthcare providers to address abnormal metrics. Undergo regular monitoring (every 3 months).'
    },
    poor: {
        icon: '🔴',
        title: 'Needs Improvement - Health Concerns',
        color: '#ef4444',
        advice: [
            '🚨 Comprehensive health insurance with broad coverage is essential',
            '🚨 May face significantly higher premiums or exclusions',
            '⚠️ Some pre-existing conditions may not be covered initially',
            '💡 Look for policies without long waiting periods',
            '💡 Consider HMO plans for structured healthcare management',
            '💡 Check for critical illness and hospitalization coverage',
        ],
        tips: 'Consult your doctor immediately to address critical health concerns. Schedule regular monitoring (monthly or as advised). Document all medical history for insurance applications.'
    }
}

const HEALTH_METRICS = {
    hemoglobin: { label: 'Hemoglobin', unit: 'g/dL', normal: { min: 12, max: 17 }, icon: '🩸' },
    glucose: { label: 'Blood Glucose', unit: 'mg/dL', normal: { min: 70, max: 100 }, icon: '🍬' },
    cholesterol: { label: 'Total Cholesterol', unit: 'mg/dL', normal: { min: 100, max: 200 }, icon: '❤️' },
    triglycerides: { label: 'Triglycerides', unit: 'mg/dL', normal: { min: 0, max: 150 }, icon: '🔥' },
    hdl: { label: 'HDL (Good)', unit: 'mg/dL', normal: { min: 60, max: 999 }, icon: '⬆️' },
    ldl: { label: 'LDL (Bad)', unit: 'mg/dL', normal: { min: 0, max: 100 }, icon: '⬇️' },
    wbc: { label: 'WBC', unit: 'k/µL', normal: { min: 4.5, max: 11 }, icon: '🛡️' },
    rbc: { label: 'RBC', unit: 'M/µL', normal: { min: 4.0, max: 5.5 }, icon: '⭕' },
    platelets: { label: 'Platelets', unit: 'k/µL', normal: { min: 150, max: 400 }, icon: '🩹' },
    creatinine: { label: 'Creatinine', unit: 'mg/dL', normal: { min: 0.5, max: 1.2 }, icon: '🫘' },
    urea: { label: 'Blood Urea (BUN)', unit: 'mg/dL', normal: { min: 7, max: 20 }, icon: '🧪' },
    sgpt: { label: 'SGPT (ALT)', unit: 'U/L', normal: { min: 7, max: 56 }, icon: '🔬' },
    sgot: { label: 'SGOT (AST)', unit: 'U/L', normal: { min: 10, max: 40 }, icon: '🔬' },
    tsh: { label: 'TSH', unit: 'mIU/L', normal: { min: 0.4, max: 4.0 }, icon: '🦋' },
    systolic_bp: { label: 'Systolic BP', unit: 'mmHg', normal: { min: 90, max: 120 }, icon: '💓' },
    diastolic_bp: { label: 'Diastolic BP', unit: 'mmHg', normal: { min: 60, max: 80 }, icon: '💓' },
}

// Report types with their associated metrics
const REPORT_TYPES = {
    cbc: { 
        label: '🩸 CBC (Complete Blood Count)', 
        metrics: ['hemoglobin', 'wbc', 'rbc', 'platelets'],
        description: 'Hemoglobin, WBC, RBC, Platelets'
    },
    glucose: { 
        label: '🍬 Diabetes / Glucose Report', 
        metrics: ['glucose'],
        description: 'Fasting Blood Sugar (FBS), Blood Glucose'
    },
    lipid: { 
        label: '❤️ Lipid Panel Report', 
        metrics: ['cholesterol', 'triglycerides', 'hdl', 'ldl'],
        description: 'Cholesterol, Triglycerides, HDL, LDL'
    },
    kidney: { 
        label: '🫘 Kidney Function Report', 
        metrics: ['creatinine', 'urea'],
        description: 'Creatinine, Urea / BUN'
    },
    liver: { 
        label: '🔬 Liver Function Report', 
        metrics: ['sgpt', 'sgot'],
        description: 'SGPT (ALT), SGOT (AST)'
    },
    thyroid: { 
        label: '🦋 Thyroid Report', 
        metrics: ['tsh'],
        description: 'TSH'
    },
    bp: { 
        label: '💓 Blood Pressure Record', 
        metrics: ['systolic_bp', 'diastolic_bp'],
        description: 'Systolic BP, Diastolic BP'
    },
}

const METRIC_OPTIONS = Object.entries(REPORT_TYPES).map(([key, val]) => ({
    value: key,
    label: val.label,
    metrics: val.metrics,
    description: val.description,
}))

function getHealthStatus(value, range) {
    if (value < range.min) return 'low'
    if (value > range.max) return 'high'
    return 'normal'
}

function getScoreColor(score) {
    if (score >= 85) return { color: '#10b981', bg: '#f0fdf4', label: 'Excellent' }
    if (score >= 70) return { color: '#3b82f6', bg: '#eff6ff', label: 'Good' }
    if (score >= 50) return { color: '#f59e0b', bg: '#fffbeb', label: 'Fair' }
    return { color: '#ef4444', bg: '#fef2f2', label: 'Needs Improvement' }
}

export default function HealthCard() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedReportType, setSelectedReportType] = useState('cbc')
    const [healthScore, setHealthScore] = useState(0)
    const [showScoreExplanation, setShowScoreExplanation] = useState(false)
    const [showInsuranceAdvice, setShowInsuranceAdvice] = useState(false)

    useEffect(() => {
        const fetchReports = async () => {
            try {
                console.log('📋 HealthCard: Fetching reports...')
                const res = await axios.get('/api/reports/')
                const reportsData = res.data.reports || []
                console.log('✅ Reports loaded:', reportsData.length)
                setReports(reportsData)

                // Calculate health score
                calculateHealthScore(reportsData)
            } catch (err) {
                console.error('❌ Error:', err)
                setError(err.response?.data?.error || err.message || 'Failed to fetch')
            } finally {
                setLoading(false)
            }
        }
        fetchReports()
    }, [])

    const calculateHealthScore = (reportsList) => {
        if (reportsList.length === 0) {
            setHealthScore(0)
            return
        }

        let totalMetrics = 0
        let normalMetrics = 0

        reportsList.forEach(report => {
            if (report.metrics && typeof report.metrics === 'object') {
                Object.entries(report.metrics).forEach(([key, value]) => {
                    if (HEALTH_METRICS[key] && value != null && !isNaN(value)) {
                        totalMetrics++
                        const status = getHealthStatus(value, HEALTH_METRICS[key].normal)
                        if (status === 'normal') normalMetrics++
                    }
                })
            }
        })

        const score = totalMetrics > 0 ? Math.round((normalMetrics / totalMetrics) * 100) : 0
        setHealthScore(score)
    }

    // Get trend data for all metrics in selected report type
    const getTrendData = () => {
        const reportType = REPORT_TYPES[selectedReportType]
        if (!reportType) return []

        const recentReports = reports.slice(0, 3).reverse()
        const metricsToShow = reportType.metrics

        return recentReports.map(report => {
            const metricValues = {}
            metricsToShow.forEach(metricKey => {
                metricValues[metricKey] = report.metrics?.[metricKey] || null
            })
            return {
                date: new Date(report.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                metrics: metricValues,
                reportType: report.report_type
            }
        })
    }

    const getMetricInfo = () => {
        if (!reports.length) return null
        const latestReport = reports[0]
        const reportType = REPORT_TYPES[selectedReportType]
        if (!reportType) return null
        
        return {
            metrics: reportType.metrics.map(key => ({
                key,
                label: HEALTH_METRICS[key].label,
                value: latestReport.metrics?.[key],
                metric: HEALTH_METRICS[key]
            })).filter(m => m.value != null)
        }
    }

    const getInsuranceAdvice = () => {
        if (healthScore >= 85) return INSURANCE_ADVICE.excellent
        if (healthScore >= 70) return INSURANCE_ADVICE.good
        if (healthScore >= 50) return INSURANCE_ADVICE.fair
        return INSURANCE_ADVICE.poor
    }

    // LOADING STATE
    if (loading) {
        return (
            <div style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                margin: '20px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>⏳</div>
                <p style={{ fontSize: '16px' }}>Loading health data...</p>
            </div>
        )
    }

    // ERROR STATE
    if (error) {
        return (
            <div style={{
                backgroundColor: 'rgba(255, 77, 109, 0.1)',
                color: 'var(--accent-red)',
                padding: '40px',
                borderRadius: '12px',
                margin: '20px',
                border: '1px solid var(--accent-red)'
            }}>
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>❌</div>
                <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Error Loading Health Card</h2>
                <p>{error}</p>
            </div>
        )
    }

    // NO REPORTS STATE
    if (reports.length === 0) {
        return (
            <div style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                padding: '60px 40px',
                borderRadius: '12px',
                textAlign: 'center',
                margin: '20px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>No Health Records Yet</h2>
                <p style={{ color: 'var(--text-muted)' }}>Upload your first medical report to see your health metrics</p>
            </div>
        )
    }

    const trendData = getTrendData()
    const metricInfo = getMetricInfo()
    const scoreInfo = getScoreColor(healthScore)

    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>💚 Your Health Overview</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Track your health metrics and trends</p>
            </div>

            {/* Health Score Card */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: `2px solid ${scoreInfo.color}`,
                borderRadius: '12px',
                padding: '30px',
                marginBottom: '30px',
                textAlign: 'center',
                boxShadow: `0 0 20px ${scoreInfo.color}22`
            }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '500' }}>
                    📊 Overall Health Score
                </div>
                <div style={{
                    fontSize: '60px',
                    fontWeight: 'bold',
                    color: scoreInfo.color,
                    fontFamily: 'monospace',
                    lineHeight: 1
                }}>
                    {healthScore}%
                </div>
                <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: scoreInfo.color,
                    marginTop: '8px'
                }}>
                    {scoreInfo.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                    {reports.length} report{reports.length !== 1 ? 's' : ''} • Last updated {new Date(reports[0].uploaded_at).toLocaleDateString()}
                </div>

                {/* Score Explanation Button */}
                <button
                    onClick={() => setShowScoreExplanation(!showScoreExplanation)}
                    style={{
                        backgroundColor: 'transparent',
                        border: `1px solid ${scoreInfo.color}`,
                        color: scoreInfo.color,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        marginTop: '16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                    }}
                    className="link-toggle"
                >
                    {showScoreExplanation ? '▼ Hide Details' : '▶ How is this calculated?'}
                </button>
            </div>

            {/* Score Explanation Section */}
            {showScoreExplanation && (
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '2px solid var(--accent-blue)',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px 0', color: 'var(--accent-blue)' }}>
                        📊 How Your Health Score is Calculated
                    </h3>
                    
                    <div style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                            <strong>Method:</strong> Your health score is calculated by comparing your health metrics against medically established normal ranges.
                        </p>

                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--accent-cyan)' }}>
                                Score Formula:
                            </div>
                            <div style={{
                                backgroundColor: 'rgba(0, 212, 170, 0.05)',
                                padding: '12px',
                                borderRadius: '6px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                color: 'var(--accent-cyan)',
                                marginBottom: '12px'
                            }}>
                                Health Score = (Metrics in Normal Range / Total Metrics Measured) × 100%
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                <strong>Example:</strong> If 8 out of 10 metrics are normal → Score = 80%
                            </div>
                        </div>

                        <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                            <strong>Score Ranges:</strong>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            {HEALTH_METRICS_CONFIG.map((level, i) => (
                                <div
                                    key={i}
                                    style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        padding: '12px',
                                        fontSize: '12px'
                                    }}
                                >
                                    <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--accent-cyan)' }}>
                                        {level.label}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                        {level.conditions}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            backgroundColor: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid var(--accent-yellow)',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '12px',
                            color: 'var(--accent-yellow)'
                        }}>
                            <strong>ℹ️ Note:</strong> Metrics are compared against standard medical reference ranges. Individual health conditions may require personalized interpretation by a healthcare provider.
                        </div>
                    </div>
                </div>
            )}

            {/* Metric Selector & Trend */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '30px'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
                    📈 Trend Over Time
                </h2>

                {/* Metric Selector */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        📋 Select Report Type:
                    </label>
                    <select
                        value={selectedReportType}
                        onChange={(e) => setSelectedReportType(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {METRIC_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        📊 {REPORT_TYPES[selectedReportType]?.description}
                    </div>
                </div>

                {/* Trend Chart - Show all metrics for selected report type */}
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '20px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-primary)' }}>
                        📊 Metrics Across Last 3 Reports:
                    </div>
                    
                    {/* Metrics Grid */}
                    {trendData.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '16px'
                        }}>
                            {REPORT_TYPES[selectedReportType]?.metrics.map((metricKey) => {
                                const metric = HEALTH_METRICS[metricKey]
                                
                                return (
                                    <div
                                        key={metricKey}
                                        style={{
                                            padding: '16px',
                                            background: 'var(--bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        {/* Metric Name */}
                                        <div style={{ 
                                            marginBottom: '14px',
                                            paddingBottom: '12px',
                                            borderBottom: '1px solid var(--border)'
                                        }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {metric.icon} {metric.label}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                Normal: {metric.normal.min}-{metric.normal.max} {metric.unit}
                                            </div>
                                        </div>

                                        {/* Trend Values */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {trendData.map((point, i) => {
                                                const value = point.metrics[metricKey]
                                                if (value === null || value === undefined) return (
                                                    <div key={i} style={{ opacity: 0.5, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                        {point.date}: —
                                                    </div>
                                                )

                                                const isNormal = value >= metric.normal.min && value <= metric.normal.max
                                                const status = getHealthStatus(value, metric.normal)
                                                
                                                return (
                                                    <div key={i} style={{ 
                                                        padding: '10px',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        borderRadius: '8px',
                                                        borderLeft: `3px solid ${isNormal ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {point.date}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.95rem',
                                                            fontWeight: '700',
                                                            color: isNormal ? 'var(--accent-green)' : 'var(--accent-red)'
                                                        }}>
                                                            {value} {metric.unit}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {trendData.filter(d => Object.values(d.metrics).some(v => v !== null)).length === 0 && (
                        <div style={{ 
                            backgroundColor: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid var(--accent-yellow)',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: '13px',
                            color: 'var(--accent-yellow)'
                        }}>
                            ℹ️ No data available for {REPORT_TYPES[selectedReportType]?.label} in your recent reports
                        </div>
                    )}
                </div>

                {/* Current Status - Show all metrics */}
                {getMetricInfo()?.metrics.length > 0 && (
                    <div style={{
                        marginTop: '24px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px'
                    }}>
                        {getMetricInfo()?.metrics.map((item) => {
                            const isNormal = item.value >= item.metric.normal.min && item.value <= item.metric.normal.max
                            
                            return (
                                <div 
                                    key={item.key}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-primary)',
                                        border: `1px solid ${isNormal ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                                        borderRadius: '8px',
                                        borderLeft: `4px solid ${isNormal ? 'var(--accent-green)' : 'var(--accent-red)'}`
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        {item.metric.icon} {item.label}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            {item.value}
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            color: isNormal ? 'var(--accent-green)' : 'var(--accent-red)'
                                        }}>
                                            {isNormal ? '✅' : '⚠️'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {item.metric.unit} (Normal: {item.metric.normal.min}-{item.metric.normal.max})
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Recent Reports Summary */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '30px'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                    📋 Recent Reports ({reports.length})
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                }}>
                    {reports.slice(0, 3).map((report, i) => (
                        <div
                            key={i}
                            style={{
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '16px',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                {report.report_type || 'Medical Report'}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)', marginBottom: '8px' }}>
                                {Object.keys(report.metrics || {}).length}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                metrics
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                📅 {new Date(report.uploaded_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insurance Recommendation Section */}
            {(() => {
                const advice = getInsuranceAdvice()
                return (
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: `2px solid ${advice.color}`,
                        borderRadius: '12px',
                        padding: '24px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '32px', marginRight: '12px' }}>
                                {advice.icon}
                            </div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                margin: 0,
                                color: 'var(--text-primary)'
                            }}>
                                Insurance Recommendations
                            </h2>
                        </div>

                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: `1px solid var(--border)`,
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                margin: '0 0 16px 0',
                                color: advice.color
                            }}>
                                {advice.title}
                            </h3>

                            <div style={{ marginBottom: '16px' }}>
                                {advice.advice.map((item, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '8px',
                                            marginBottom: '8px',
                                            fontSize: '13px',
                                            color: 'var(--text-primary)',
                                            backgroundColor: 'var(--bg-card)',
                                            borderRadius: '6px',
                                            borderLeft: `3px solid ${advice.color}`,
                                            paddingLeft: '12px'
                                        }}
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid var(--accent-green)',
                                borderRadius: '6px',
                                padding: '12px',
                                fontSize: '12px',
                                color: 'var(--accent-green)'
                            }}>
                                <strong>💡 Healthcare Tips:</strong><br />
                                {advice.tips}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid var(--accent-yellow)',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '12px',
                            color: 'var(--accent-yellow)'
                        }}>
                            <strong>Disclaimer:</strong> This insurance advice is informational. Consult with insurance agents and healthcare providers for personalized recommendations based on your specific health condition and insurance needs.
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
