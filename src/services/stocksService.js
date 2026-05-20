import { apiFetch } from './api-client'

export const LOCAL_STOCKS = {
  USD: ['AAPL', 'MSFT'],
  EUR: ['ASML', 'SAP'],
  GBP: ['SHEL', 'AZN'],
  JPY: ['7203.T', '6758.T'],
  CNY: ['BABA', 'JD'],
}

export const GLOBAL_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'V', 'JPM']

const GLOBAL_KEY = GLOBAL_STOCKS.join(',')
const SYMBOLS_TO_CODE = Object.fromEntries(
  Object.entries(LOCAL_STOCKS).map(([code, syms]) => [syms.join(','), code])
)

function normalizeStock(symbol, s) {
  return {
    symbol,
    name:            s.name ?? symbol,
    price:           Number(s.close ?? s.price ?? 0),
    change:          Number(s.change ?? 0),
    percent_change:  Number(s.percent_change ?? 0),
    volume:          Number(s.volume ?? 0),
    chartData:       s.chartData ?? s.chart_data ?? [],
  }
}

// Matches all known symbols: AAPL, BRK.B, 7203.T, V, etc.
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.]{0,9}$/

function assertStocksPayload(data) {
  if (data.status === 'error') {
    throw new Error(data.code === 429 ? 'rate_limit' : 'no_data')
  }
  if (!Object.keys(data).every(k => SYMBOL_RE.test(k))) {
    throw new Error('no_data')
  }
}

async function fetchFromBackend(path) {
  const res = await apiFetch(path)
  if (res.status === 429) throw new Error('rate_limit')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) return data.map(s => normalizeStock(s.symbol ?? s.code, s))
  assertStocksPayload(data)
  return Object.entries(data).map(([symbol, s]) => normalizeStock(symbol, s))
}

export async function fetchStockList(symbols) {
  const key = symbols.join(',')

  if (key === GLOBAL_KEY) return fetchFromBackend('/api/stocks/global')

  const code = SYMBOLS_TO_CODE[key]
  if (code) return fetchFromBackend(`/api/stocks/${code}`)

  throw new Error('no_data')
}
