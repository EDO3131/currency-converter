import BASE_URL, { apiFetch } from './api-client'

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  console.log('[auth/login] status:', res.status, 'body:', data)
  if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`)
  return { token: data.session?.access_token ?? data.token, user: data.user }
}

export async function register(email, password) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  console.log('[auth/register] status:', res.status, 'body:', data)
  if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`)
  return { token: data.session?.access_token ?? data.token, user: data.user }
}

export async function logoutApi(token) {
  await apiFetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getMe(token) {
  const res = await apiFetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.user ?? data
}

export function loginWithGoogle() {
  window.location.href = `${BASE_URL}/api/auth/google`
}
