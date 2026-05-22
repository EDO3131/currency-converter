import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const ERROR_MAP = [
  ['invalid login credentials',   'Email o contraseña incorrectos.'],
  ['invalid_credentials',         'Email o contraseña incorrectos.'],
  ['user already registered',     'Este email ya tiene una cuenta.'],
  ['already registered',          'Este email ya tiene una cuenta.'],
  ['email already',               'Este email ya tiene una cuenta.'],
  ['password should be at least', 'La contraseña debe tener al menos 6 caracteres.'],
  ['weak_password',               'La contraseña debe tener al menos 6 caracteres.'],
]

function translateError(msg) {
  if (!msg) return 'Ocurrió un error, intenta de nuevo.'
  const lower = msg.toLowerCase()
  for (const [key, text] of ERROR_MAP) {
    if (lower.includes(key)) return text
  }
  return 'Ocurrió un error, intenta de nuevo.'
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.387 17.64 12.08 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function AuthModal({ onClose }) {
  const [tab, setTab]               = useState('login')
  const [email, setEmail]           = useState('')
  const [password, setPass]         = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, register, loginWithGoogle } = useAuth()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (tab === 'register' && password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      if (tab === 'login') await login(email, password)
      else                 await register(email, password)
      onClose()
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    setGoogleLoading(true)
    loginWithGoogle()
    // La página se redirige a Google; el estado no se resetea adrede
    // porque el navegador abandona la página en el siguiente tick.
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function switchTab(next) {
    setTab(next)
    setError(null)
    setConfirm('')
  }

  const isRegister = tab === 'register'

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container auth-modal" role="dialog" aria-modal="true">

        <div className="modal-header">
          <div className="modal-title">
            <div>
              <span className="modal-country">
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </span>
              <span className="modal-subtitle">Currency Converter</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${!isRegister ? ' auth-tab--active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Iniciar sesión
          </button>
          <button
            className={`auth-tab${isRegister ? ' auth-tab--active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Registrarse
          </button>
        </div>

        <div className="auth-modal-body">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="field-label" htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="field-label" htmlFor="auth-password">Contraseña</label>
              <input
                id="auth-password"
                className="auth-input"
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </div>

            {isRegister && (
              <div className="auth-field">
                <label className="field-label" htmlFor="auth-confirm">Confirmar contraseña</label>
                <input
                  id="auth-confirm"
                  className={`auth-input${confirm && password !== confirm ? ' auth-input--error' : ''}`}
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {confirm && password !== confirm && (
                  <span className="auth-field-hint">Las contraseñas no coinciden</span>
                )}
              </div>
            )}

            {error && (
              <div className="status-msg status-error">
                <span className="status-icon">✕</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading || (isRegister && confirm.length > 0 && password !== confirm)}
            >
              {loading ? 'Procesando…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          {!isRegister && (
            <>
              <div className="auth-divider">o</div>
              <button
                className="btn-google"
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <GoogleIcon />
                {googleLoading ? 'Redirigiendo a Google…' : 'Continuar con Google'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
