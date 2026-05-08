import { useState, useEffect } from 'react'
import './App.css'
import { fetchRates } from './services/api'
import COUNTRY_DATA, { CURRENCIES, FALLBACK_RATES } from './data/countriesData'

function convert(amount, from, to, rates) {
  return (amount / rates[from]) * rates[to]
}

function formatResult(value, code) {
  if (!isFinite(value)) return '—'
  const decimals = COUNTRY_DATA[code]?.decimals ?? 2
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function CurrencySelect({ value, onChange, label }) {
  const americas = CURRENCIES.filter(c => c.region === 'América')
  const europe   = CURRENCIES.filter(c => c.region === 'Europa')
  const asia     = CURRENCIES.filter(c => c.region === 'Asia')

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

function CountryCard({ code }) {
  const data = COUNTRY_DATA[code]
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

export default function App() {
  const [amount, setAmount]           = useState('1')
  const [from, setFrom]               = useState('USD')
  const [to, setTo]                   = useState('EUR')
  const [rotating, setRotating]       = useState(false)
  const [rates, setRates]             = useState(FALLBACK_RATES)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

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

  const fromCur = CURRENCIES.find(c => c.code === from)
  const toCur   = CURRENCIES.find(c => c.code === to)

  function handleSwap() {
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
                  />
                </div>
              </div>

              <div className="pair-row">
                <CurrencySelect value={from} onChange={setFrom} label="Moneda origen" />
                <button
                  className={`swap-btn${rotating ? ' rotating' : ''}`}
                  onClick={handleSwap}
                  aria-label="Intercambiar monedas"
                >
                  ⇄
                </button>
                <CurrencySelect value={to} onChange={setTo} label="Moneda destino" />
              </div>

              <div className="result-card">
                <div className="result-flags">
                  <span>{fromCur?.flag}</span>
                  <span className="result-arrow">→</span>
                  <span>{toCur?.flag}</span>
                </div>
                <div className="result-row">
                  <span className="result-sym">{toCur?.symbol}</span>
                  <span className="result-value">{formatResult(result, to)}</span>
                  <span className="result-code">{to}</span>
                </div>
                <p className="rate-line">
                  1 {from} = {formatResult(unitRate, to)} {to}
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
            <CountryCard code={from} />
            {from !== to && <CountryCard code={to} />}
          </div>

        </div>
      </main>
    </div>
  )
}
