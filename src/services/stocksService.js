const API_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const BASE_URL = 'https://api.twelvedata.com'

const STOCK_NAMES = {
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon',
  NVDA: 'NVIDIA', META: 'Meta', TSLA: 'Tesla', 'BRK.B': 'Berkshire Hathaway',
  JPM: 'JPMorgan', V: 'Visa',
  ASML: 'ASML Holding', SAP: 'SAP SE', LVMH: 'LVMH', 'NESN.SW': 'Nestlé',
  'ROG.SW': 'Roche', NVS: 'Novartis', 'SIE.DE': 'Siemens', 'CS.PA': 'AXA',
  'TTE.PA': 'TotalEnergies', 'ULVR.L': 'Unilever',
  SHEL: 'Shell', AZN: 'AstraZeneca', 'HSBA.L': 'HSBC', BP: 'BP',
  RIO: 'Rio Tinto', GSK: 'GSK', 'BATS.L': 'BAT', 'VOD.L': 'Vodafone', 'LLOY.L': 'Lloyds',
  '7203.T': 'Toyota', '6758.T': 'Sony', '9984.T': 'SoftBank', '8306.T': 'MUFG',
  '6861.T': 'Keyence', '9432.T': 'NTT', '4063.T': 'Shin-Etsu',
  '7267.T': 'Honda', '6501.T': 'Hitachi', '8411.T': 'Mizuho',
  BABA: 'Alibaba', JD: 'JD.com', PDD: 'PDD Holdings', NIO: 'NIO', XPEV: 'XPeng',
  BIDU: 'Baidu', TME: 'Tencent Music', VIPS: 'Vipshop', ZTO: 'ZTO Express', YUMC: 'Yum China',
}

export const LOCAL_STOCKS = {
  USD: ['AAPL', 'MSFT'],
  EUR: ['ASML', 'SAP'],
  GBP: ['SHEL', 'AZN'],
  JPY: ['7203.T', '6758.T'],
  CNY: ['BABA', 'JD'],
}

export const GLOBAL_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'V', 'JPM']

// TODO: migrar caché a Supabase (tabla stocks_cache) cuando
// la app tenga múltiples usuarios simultáneos para compartir
// el caché entre sesiones y reducir llamadas a Twelve Data API
const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000

async function fetchStock(symbol) {
  const hit = cache.get(symbol)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data

  const qs = `symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
  console.log(`[stocksService] Twelve Data → ${symbol}`)
  const [quoteRes, seriesRes] = await Promise.all([
    fetch(`${BASE_URL}/quote?${qs}`),
    fetch(`${BASE_URL}/time_series?${qs}&interval=1day&outputsize=7`),
  ])
  if (!quoteRes.ok || !seriesRes.ok) throw new Error(`HTTP error`)

  const [quote, series] = await Promise.all([quoteRes.json(), seriesRes.json()])

  if (quote.code === 429 || series.code === 429) throw new Error('rate_limit')
  if (quote.status === 'error' || series.status === 'error') throw new Error('no_data')

  const price     = parseFloat(quote.close)
  const change    = parseFloat(quote.percent_change)
  const volume    = parseInt(quote.volume, 10) || 0
  const chartData = Array.isArray(series.values)
    ? series.values.map(v => parseFloat(v.close)).reverse()
    : []

  const data = { symbol, name: quote.name ?? STOCK_NAMES[symbol] ?? symbol, price, change, volume, chartData }
  cache.set(symbol, { data, ts: Date.now() })
  return data
}

export async function fetchStockList(symbols) {
  const results = await Promise.allSettled(symbols.map(fetchStock))
  const allRateLimited = results.every(
    r => r.status === 'rejected' && r.reason?.message === 'rate_limit'
  )
  if (allRateLimited) throw new Error('rate_limit')
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}
