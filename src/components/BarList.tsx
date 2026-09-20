import type { GroupMetric } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'

export function BarList({ items }: { items: GroupMetric[] }) {
  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1)

  if (items.length === 0) {
    return <div className="empty-state">No data yet.</div>
  }

  return (
    <div className="bar-list">
      {items.map((item) => {
        const width = `${Math.max(8, (Math.abs(item.value) / maxValue) * 100)}%`
        return (
          <div className="bar-item" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>{item.count} trades</span>
            </div>
            <div className="bar-track">
              <span className={item.value >= 0 ? 'bar-fill positive' : 'bar-fill negative'} style={{ width }} />
            </div>
            <strong className={item.value >= 0 ? 'positive-text' : 'negative-text'}>{currencyFormatter.format(item.value)}</strong>
          </div>
        )
      })}
    </div>
  )
}
