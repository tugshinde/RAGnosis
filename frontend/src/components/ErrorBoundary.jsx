import { Component } from 'react'

/**
 * Catches render-time errors anywhere below it. Without this a single thrown component
 * unmounts the whole tree and leaves the user staring at a blank page with no way back —
 * which, on a page showing someone their medical results, reads as data loss.
 *
 * Must stay a class: React exposes no hook equivalent of componentDidCatch.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        // Left as console output deliberately: there is no error-reporting backend to send
        // this to, and a medical report's contents must not be shipped to a third party.
        console.error('Unhandled UI error:', error, info?.componentStack)
    }

    handleReset = () => {
        this.setState({ error: null })
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children

        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, background: 'var(--bg-primary)', color: 'var(--text-primary)'
            }}>
                <div style={{
                    maxWidth: 520, width: '100%', padding: 32, textAlign: 'center',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>

                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 10 }}>
                        Something went wrong
                    </h1>

                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>
                        This page hit an unexpected error. Your reports and account are unaffected —
                        nothing was lost.
                    </p>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
                        Try again, and if it keeps happening, reload the page.
                    </p>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={this.handleReset}>
                            Try Again
                        </button>
                        <button className="btn-ghost" onClick={() => window.location.assign('/')}>
                            Back to Home
                        </button>
                    </div>

                    {import.meta.env.DEV && (
                        <pre style={{
                            marginTop: 24, padding: 14, textAlign: 'left', overflowX: 'auto',
                            background: 'var(--bg-secondary)', borderRadius: 10,
                            fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap'
                        }}>
                            {error.message}
                        </pre>
                    )}
                </div>
            </div>
        )
    }
}
