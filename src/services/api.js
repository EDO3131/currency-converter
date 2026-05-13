// Relative path → Vite proxy forwards to https://api.frankfurter.app server-side,
// bypassing browser CORS restrictions on cross-origin fetch calls.
const API_BASE = '/api/frankfurter'

export async function fetchRates(fallbackRates = {}) {
  const res = await fetch(`${API_BASE}/latest?base=USD`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { rates } = await res.json()
  return { USD: 1, ...fallbackRates, ...rates }
}
