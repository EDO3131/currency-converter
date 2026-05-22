import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function UserMenu({ onLoginClick }) {
  const { user, logout, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return null

  if (!user) {
    return (
      <button className="shell-auth-btn" onClick={onLoginClick}>
        Iniciar sesión
      </button>
    )
  }

  const initials = user.email?.[0]?.toUpperCase() ?? '?'

  async function handleLogout() {
    setOpen(false)
    await logout()
  }

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <div className="user-avatar">{initials}</div>
        <span className="user-email">{user.email}</span>
        <span className="user-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          <button
            className="user-dropdown-item user-dropdown-item--danger"
            role="menuitem"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
