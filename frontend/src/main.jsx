import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Backend API base. Override with VITE_API_URL when the API isn't on the default port.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontFamily: 'Inter, sans-serif',
                    },
                    success: { iconTheme: { primary: '#00d4aa', secondary: '#0a0f1e' } },
                    error: { iconTheme: { primary: '#ff4d6d', secondary: '#0a0f1e' } },
                }}
            />
        </BrowserRouter>
    </React.StrictMode>
)
