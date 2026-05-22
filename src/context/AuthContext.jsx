import { createContext, useContext, useState, useEffect } from 'react'
import {
  login as loginApi,
  register as registerApi,
  logoutApi,
  getMe,
  loginWithGoogle as googleRedirect,
} from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Query params (?token=...) — flujo legacy / backend propio
    const params          = new URLSearchParams(window.location.search)
    const urlToken        = params.get('token')
    const urlRefreshToken = params.get('refresh_token')
    console.log('[auth] URL al cargar:', window.location.search)
    console.log('[auth] ?token=', urlToken ?? '(ausente)')

    // Hash fragment (#access_token=...) — flujo Supabase OAuth
    console.log('[auth] hash:', window.location.hash.slice(0, 50))
    const hashParams  = new URLSearchParams(window.location.hash.slice(1))
    const hashToken   = hashParams.get('access_token')
    const hashRefresh = hashParams.get('refresh_token')
    console.log('[auth] #access_token=', hashToken ?? '(ausente)')

    // Prioridad: hash (Supabase OAuth) > query param (backend propio)
    const resolvedToken   = hashToken   ?? urlToken
    const resolvedRefresh = hashRefresh ?? urlRefreshToken

    if (resolvedToken) {
      window.history.replaceState({}, '', window.location.pathname)
      localStorage.setItem('auth_token', resolvedToken)
      if (resolvedRefresh) {
        localStorage.setItem('auth_refresh_token', resolvedRefresh)
      }
    }

    const stored = resolvedToken || localStorage.getItem('auth_token')
    console.log('[auth] Token a verificar:', stored ? stored.slice(0, 20) + '…' : '(ninguno)')

    if (!stored) {
      Promise.resolve().then(() => setLoading(false))
      return
    }

    getMe(stored)
      .then(u => {
        console.log('[auth] Sesión restaurada:', u)
        setUser(u)
        setToken(stored)
      })
      .catch(err => {
        console.warn('[auth] getMe falló — token inválido o expirado:', err.message)
        localStorage.removeItem('auth_token')
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { token: t, user: u } = await loginApi(email, password)
    localStorage.setItem('auth_token', t)
    setToken(t)
    setUser(u)
  }

  async function register(email, password) {
    const { token: t, user: u } = await registerApi(email, password)
    localStorage.setItem('auth_token', t)
    setToken(t)
    setUser(u)
  }

  function loginWithGoogle() {
    googleRedirect()
  }

  async function logout() {
    if (token) logoutApi(token).catch(() => {})
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
