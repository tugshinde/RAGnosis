import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const TOKEN_KEY = 'ragnosis_token'
const USER_KEY = 'ragnosis_user'

/**
 * Where each role lands after signing in.
 *
 * The API already reports the role, so the user is never asked to pick a "portal" — being
 * asked to state something the credentials already prove is friction, and it previously
 * allowed three independent sessions to exist in one browser at the same time.
 */
export const HOME_FOR_ROLE = {
    patient: '/dashboard',
    doctor: '/doctor',
    receptionist: '/receptionist',
    admin: '/dashboard',
}

export const homeFor = (role) => HOME_FOR_ROLE[role] ?? '/dashboard'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY)
        const savedUser = localStorage.getItem(USER_KEY)

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser))
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            } catch {
                // A corrupted entry would otherwise wedge the app on every load.
                localStorage.removeItem(TOKEN_KEY)
                localStorage.removeItem(USER_KEY)
            }
        }
        setLoading(false)
    }, [])

    const login = (token, userData) => {
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser(userData)
    }

    /**
     * Replaces the cached account after a profile save so the navbar and profile view update
     * immediately. The token is untouched — only the account details changed.
     */
    const updateUser = (userData) => {
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)

        // Legacy per-portal sessions. Cleared on the way out so a browser that still holds
        // one from an older build cannot leave a stale staff session behind.
        for (const key of ['doctor_token', 'doctor_info', 'receptionist_token', 'receptionist_info']) {
            localStorage.removeItem(key)
        }

        delete axios.defaults.headers.common['Authorization']
        setUser(null)
    }

    const value = useMemo(() => ({
        user,
        role: user?.role ?? null,
        isStaff: user?.role === 'doctor' || user?.role === 'receptionist',
        home: homeFor(user?.role),
        login, updateUser, logout, loading,
    }), [user, loading])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
