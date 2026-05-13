export default function MiniChart({ data, positive }) {
  if (!data || data.length < 2) return <span className="minichart-empty">—</span>

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 80, H = 32, PAD = 3

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + ((max - v) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} className="minichart" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? '#107E3E' : '#BB0000'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
