import { useState, useEffect } from 'react'
import './App.css'
import { fetchRates } from './services/api'
import COUNTRY_DATA, { CURRENCIES, FALLBACK_RATES } from './data/countriesData'
import { getCountriesData } from './services/countriesService'

function convert(amount, from, to, rates) {
  return (amount / rates[from]) * rates[to]
}

function formatResult(value, code, countryData) {
  if (!isFinite(value)) return '—'
  const decimals = countryData[code]?.decimals ?? 2
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function CurrencySelect({ value, onChange, label, currencies }) {
  const americas = currencies.filter(c => c.region === 'América')
  const europe   = currencies.filter(c => c.region === 'Europa')
  const asia     = currencies.filter(c => c.region === 'Asia')

  return (
    <div className="select-group">
      <label className="field-label">{label}</label>
      <div className="select-wrapper">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="currency-select"
        >
          <optgroup label="🌎 América">
            {americas.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="🌍 Europa">
            {europe.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="🌏 Asia">
            {asia.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </optgroup>
        </select>
        <span className="select-arrow">▾</span>
      </div>
    </div>
  )
}

function CountryCard({ code, countryData }) {
  const data = countryData[code]
  if (!data) return null

  return (
    <div className="country-card">
      <div className="country-card-header">
        <span className="country-flag">{data.flag}</span>
        <div className="country-header-info">
          <span className="country-name">{data.country}</span>
          <span className="country-code-badge">{code}</span>
        </div>
      </div>

      <div className="country-card-body">
        <div className="country-data-item">
          <span className="cdi-label">Moneda</span>
          <span className="cdi-value">{data.currency} · {data.symbol}</span>
        </div>
        <div className="country-data-item">
          <span className="cdi-label">Banco central</span>
          <span className="cdi-value">{data.centralBank}</span>
        </div>
        <div className="country-data-pair">
          <div className="country-data-item">
            <span className="cdi-label">Inflación</span>
            <span className="cdi-value">{data.inflation}</span>
          </div>
          <div className="country-data-item">
            <span className="cdi-label">PIB</span>
            <span className="cdi-value">{data.gdp}</span>
          </div>
        </div>
      </div>

      <div className="country-fact">
        <span className="country-fact-icon">💡</span>
        <span>{data.fact}</span>
      </div>
    </div>
  )
}

function ConversionHistory({ history, countryData }) {
  return (
    <div className="history-card">
      <div className="history-header">
        <span className="history-title">Historial de conversiones</span>
      </div>
      {history.length === 0 ? (
        <p className="history-empty">Sin conversiones recientes</p>
      ) : (
        <ul className="history-list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-pair">
                <span>{entry.fromFlag}</span>
                <span className="history-from">
                  {entry.fromSymbol} {formatResult(entry.amount, entry.from, countryData)} {entry.from}
                </span>
                <span className="history-arrow">→</span>
                <span>{entry.toFlag}</span>
                <span className="history-to">
                  {entry.toSymbol} {formatResult(entry.result, entry.to, countryData)} {entry.to}
                </span>
              </div>
              <span className="history-time">
                {entry.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function App() {
  const [amount, setAmount]           = useState('1')
  const [from, setFrom]               = useState('USD')
  const [to, setTo]                   = useState('EUR')
  const [rotating, setRotating]       = useState(false)
  const [rates, setRates]             = useState(FALLBACK_RATES)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [history, setHistory]         = useState([])
  const [countryData, setCountryData] = useState(COUNTRY_DATA)
  const [currencies, setCurrencies]   = useState(CURRENCIES)

  useEffect(() => {
    getCountriesData().then(({ countryData: cd, currencies: cur }) => {
      setCountryData(cd)
      setCurrencies(cur)
    })
  }, [])

  function addToHistoryWith(amt, fromCode, toCode, res) {
    if (amt <= 0 || !isFinite(res)) return
    setHistory(prev => {
      const last = prev[0]
      if (last && last.from === fromCode && last.to === toCode && last.amount === amt) return prev
      const fromData = currencies.find(c => c.code === fromCode)
      const toData   = currencies.find(c => c.code === toCode)
      return [{
        id: Date.now(),
        amount: amt,
        from: fromCode,
        to: toCode,
        result: res,
        fromFlag: fromData?.flag ?? '',
        toFlag: toData?.flag ?? '',
        fromSymbol: fromData?.symbol ?? fromCode,
        toSymbol: toData?.symbol ?? toCode,
        time: new Date(),
      }, ...prev].slice(0, 5)
    })
  }

  async function loadRates() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRates()
      setRates(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[fetchRates]', err)
      setError('No se pudo conectar con el servidor de tasas. Se muestran los últimos valores disponibles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRates() }, [])

  const numericAmount = parseFloat(amount) || 0
  const result   = convert(numericAmount, from, to, rates)
  const unitRate = convert(1, from, to, rates)

  const fromCur = currencies.find(c => c.code === from)
  const toCur   = currencies.find(c => c.code === to)

  function handleSwap() {
    addToHistoryWith(numericAmount, to, from, convert(numericAmount, to, from, rates))
    setRotating(true)
    setTimeout(() => setRotating(false), 380)
    setFrom(to)
    setTo(from)
  }

  return (
    <div className="app">

      <nav className="shell-bar">
        <div className="shell-logo">
          <span className="shell-logo-mark">FX</span>
        </div>
        <div className="shell-titles">
          <span className="shell-app-name">Convertidor de Monedas</span>
          <span className="shell-app-sub">América · Europa · Asia</span>
        </div>
      </nav>

      <main className="page-content">
        <div className="converter-layout">

          <article className="card">
            <div className="card-body">
              <div className="field">
                <label className="field-label">Monto</label>
                <div className="amount-box">
                  <span className="amount-symbol">{fromCur?.symbol}</span>
                  <input
                    type="number"
                    className="amount-input"
                    value={amount}
                    min="0"
                    placeholder="0"
                    onChange={e => setAmount(e.target.value)}
                    onBlur={() => addToHistoryWith(numericAmount, from, to, result)}
                  />
                </div>
              </div>

              <div className="pair-row">
                <CurrencySelect value={from} onChange={v => { addToHistoryWith(numericAmount, v, to, convert(numericAmount, v, to, rates)); setFrom(v) }} label="Moneda origen" currencies={currencies} />
                <button
                  className={`swap-btn${rotating ? ' rotating' : ''}`}
                  onClick={handleSwap}
                  aria-label="Intercambiar monedas"
                >
                  ⇄
                </button>
                <CurrencySelect value={to} onChange={v => { addToHistoryWith(numericAmount, from, v, convert(numericAmount, from, v, rates)); setTo(v) }} label="Moneda destino" currencies={currencies} />
              </div>

              <div className="result-card">
                <div className="result-flags">
                  <span>{fromCur?.flag}</span>
                  <span className="result-arrow">→</span>
                  <span>{toCur?.flag}</span>
                </div>
                <div className="result-row">
                  <span className="result-sym">{toCur?.symbol}</span>
                  <span className="result-value">{formatResult(result, to, countryData)}</span>
                  <span className="result-code">{to}</span>
                </div>
                <p className="rate-line">
                  1 {from} = {formatResult(unitRate, to, countryData)} {to}
                </p>
              </div>
            </div>

            <footer className="card-footer">
              {error && (
                <div className="status-msg status-error">
                  <span className="status-icon">✕</span>
                  <span>{error}</span>
                </div>
              )}
              {!error && lastUpdated && (
                <div className="status-msg status-success">
                  <span className="status-icon">✓</span>
                  <span>Tasas actualizadas correctamente</span>
                </div>
              )}
              <div className="footer-controls">
                <button
                  className="btn-primary"
                  onClick={loadRates}
                  disabled={loading}
                >
                  {loading ? 'Actualizando…' : 'Actualizar tasas'}
                </button>
                {lastUpdated && (
                  <span className="footer-timestamp">
                    Actualizado: {lastUpdated.toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </footer>
          </article>

          <div className={`country-cards${from === to ? ' country-cards--single' : ''}`}>
            <CountryCard code={from} countryData={countryData} />
            {from !== to && <CountryCard code={to} countryData={countryData} />}
          </div>

          <ConversionHistory history={history} countryData={countryData} />

        </div>
      </main>
    </div>
  )
}
