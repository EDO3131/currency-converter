import { apiFetch } from './api-client'

export async function fetchRates(fallbackRates = {}) {
  const res = await apiFetch('/api/rates?base=USD')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { rates } = await res.json()
  return { USD: 1, ...fallbackRates, ...rates }
}
