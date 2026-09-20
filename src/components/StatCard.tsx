type StatCardProps = {
  label: string
  value: string
  helper: string
  tone?: 'positive' | 'negative'
}

export function StatCard({ label, value, helper, tone }: StatCardProps) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong className={tone === 'positive' ? 'positive-text' : tone === 'negative' ? 'negative-text' : ''}>{value}</strong>
      <small>{helper}</small>
    </div>
  )
}
