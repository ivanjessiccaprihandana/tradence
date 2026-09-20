export function InsightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
