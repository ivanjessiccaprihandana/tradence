import type { EquityPoint } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'

export function EquityChart({ data }: { data: EquityPoint[] }) {
  if (data.length === 0) return <div className="chart-empty">No trades available for the chart.</div>

  const width = 720
  const height = 260
  const padding = 28
  const values = data.map((point) => point.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const range = max - min || 1
  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
    return { ...point, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${path} L ${points.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`
  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2)

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Equity curve">
        <defs>
          <linearGradient id="equityArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#19a974" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#19a974" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="chart-grid-line" d={`M ${padding} ${zeroY} L ${width - padding} ${zeroY}`} />
        <path className="chart-area" d={area} />
        <path className="chart-line" d={path} />
        {points.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle className="chart-point" cx={point.x} cy={point.y} r="4.5" />
          </g>
        ))}
      </svg>
      <div className="chart-axis">
        <span>{data[0]?.label}</span>
        <strong>{currencyFormatter.format(values.at(-1) ?? 0)}</strong>
        <span>{data.at(-1)?.label}</span>
      </div>
    </div>
  )
}
