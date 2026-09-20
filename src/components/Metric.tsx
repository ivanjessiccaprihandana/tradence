type MetricProps = {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}

export function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={tone === 'positive' ? 'positive-text' : tone === 'negative' ? 'negative-text' : ''}>{value}</strong>
    </div>
  )
}
