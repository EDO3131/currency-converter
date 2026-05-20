const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function apiFetch(path, options) {
  const url = `${BASE_URL}${path}`
  console.log(`[api-client] → ${url}`)
  return fetch(url, options)
}

export default BASE_URL
