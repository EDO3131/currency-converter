const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://currency-converter-api-production-74f8.up.railway.app'

export function apiFetch(path, options) {
  const url = `${BASE_URL}${path}`
  console.log(`[api-client] → ${url}`)
  return fetch(url, options)
}

export default BASE_URL
