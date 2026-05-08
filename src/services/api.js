// Relative path → Vite proxy forwards to https://api.frankfurter.app server-side,
// bypassing browser CORS restrictions on cross-origin fetch calls.
const API_BASE = '/api/frankfurter'

// ECB doesn't track these Latin American currencies — static fallback only
const STATIC_RATES = {
  CLP: 960.0,
  ARS: 1100.0,
  COP: 4300.0,
  PEN: 3.75,
  UYU: 42.0,
  BOB: 6.91,
}

export async function fetchRates() {
  const res = await fetch(`${API_BASE}/latest?base=USD`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { rates } = await res.json()
  return { USD: 1, ...STATIC_RATES, ...rates }
}
