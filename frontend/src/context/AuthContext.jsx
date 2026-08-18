import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('ragnosis_token')
        const savedUser = localStorage.getItem('ragnosis_user')
        if (token && savedUser) {
            setUser(JSON.parse(savedUser))
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
        setLoading(false)
    }, [])

    const login = (token, userData) => {
        localStorage.setItem('ragnosis_token', token)
        localStorage.setItem('ragnosis_user', JSON.stringify(userData))
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('ragnosis_token')
        localStorage.removeItem('ragnosis_user')
        delete axios.defaults.headers.common['Authorization']
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
