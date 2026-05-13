import { useState, useEffect } from 'react'
import { fetchStockList, GLOBAL_STOCKS } from '../services/stocksService'

function formatTickerPrice(price) {
  if (!isFinite(price)) return '—'
  if (price >= 1000) return price.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return price.toFixed(2)
}

export default function StocksTicker() {
  const [stocks, setStocks] = useState([])

  useEffect(() => {
    fetchStockList(GLOBAL_STOCKS)
      .then(setStocks)
      .catch(() => {})
  }, [])

  if (stocks.length === 0) return null

  const items = [...stocks, ...stocks]

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {items.map((s, i) => {
          const up = s.change >= 0
          return (
            <span key={i} className="ticker-item">
              <span className="ticker-symbol">{s.symbol}</span>
              <span className="ticker-price">{formatTickerPrice(s.price)}</span>
              <span className={`ticker-change ${up ? 'ticker-change--up' : 'ticker-change--down'}`}>
                {up ? '▲' : '▼'}{Math.abs(s.change).toFixed(1)}%
              </span>
              <span className="ticker-sep" aria-hidden="true">|</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
