import { apiFetch } from './api-client'

function bearer(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function getHistory(token) {
  const res = await apiFetch('/api/history', { headers: bearer(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function saveConversion(token, { from_code, to_code, amount, result, rate }) {
  const res = await apiFetch('/api/history', {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_code, to_code, amount, result, rate }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteConversion(token, id) {
  const res = await apiFetch(`/api/history/${id}`, {
    method: 'DELETE',
    headers: bearer(token),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
