import { useState, useEffect } from 'react'
import MiniChart from './MiniChart'
import { fetchStockList, LOCAL_STOCKS, GLOBAL_STOCKS } from '../services/stocksService'

function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatVolume(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('es-ES')
}

function StockRow({ stock }) {
  const up = stock.change >= 0
  return (
    <li className="stock-item">
      <div className="stock-identity">
        <span className="stock-name">{stock.name}</span>
        <span className="stock-symbol">{stock.symbol}</span>
      </div>
      <div className="stock-price">{formatPrice(stock.price)}</div>
      <div className={`stock-change ${up ? 'stock-change--up' : 'stock-change--down'}`}>
        {up ? '+' : ''}{stock.change.toFixed(2)}%
      </div>
      <div className="stock-volume">{formatVolume(stock.volume)}</div>
      <div className="stock-chart">
        <MiniChart data={stock.chartData} positive={up} />
      </div>
    </li>
  )
}

export default function StocksModal({ currencyCode, countryName, flag, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    // Limpia estado obsoleto de la moneda anterior antes de iniciar la nueva petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null)
    setError(null)
    setLoading(true)
    const symbols = LOCAL_STOCKS[currencyCode] ?? GLOBAL_STOCKS.slice(0, 2)
    fetchStockList(symbols)
      .then(setData)
      .catch(err => setError(
        err.message === 'rate_limit'
          ? 'Límite de la API alcanzado. Espera un minuto e intenta de nuevo.'
          : 'No se pudieron cargar los datos del mercado.'
      ))
      .finally(() => setLoading(false))
  }, [currencyCode])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-flag">{flag}</span>
            <div>
              <span className="modal-country">{countryName}</span>
              <span className="modal-subtitle">Mercado local</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="modal-loading">
              <span className="modal-spinner" />
              <span>Cargando datos del mercado…</span>
            </div>
          )}

          {error && !loading && (
            <div className="status-msg status-error" style={{ margin: '20px 16px' }}>
              <span className="status-icon">✕</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="stocks-header-row">
                <span>Empresa</span>
                <span>Precio</span>
                <span>Variación</span>
                <span>Volumen</span>
                <span>7 días</span>
              </div>
              <ul className="stocks-list">
                {data.length === 0
                  ? <li className="stocks-empty">No hay datos disponibles para este mercado.</li>
                  : data.map(s => <StockRow key={s.symbol} stock={s} />)
                }
              </ul>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
