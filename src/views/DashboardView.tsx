import { BarList } from '../components/BarList'
import { EquityChart } from '../components/EquityChart'
import { InsightItem } from '../components/InsightItem'
import type { AccountStats, EquityPoint, GroupMetric } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'

type DashboardViewProps = {
  bestStrategy?: GroupMetric
  equityCurve: EquityPoint[]
  pairMetrics: GroupMetric[]
  recurringMistake: string
  sessionMetrics: GroupMetric[]
  stats: AccountStats
}

export function DashboardView({
  bestStrategy,
  equityCurve,
  pairMetrics,
  recurringMistake,
  sessionMetrics,
  stats,
}: DashboardViewProps) {
  return (
    <div className="dashboard-grid">
      <section className="panel hero-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Equity curve</p>
            <h2>Account progress</h2>
          </div>
          <span className="status-dot">Live local</span>
        </div>
        <EquityChart data={equityCurve} />
      </section>

      <aside className="panel insight-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Coach notes</p>
            <h2>Trading insights</h2>
          </div>
        </div>
        <InsightItem label="Best strategy" value={bestStrategy ? `${bestStrategy.label} (${currencyFormatter.format(bestStrategy.value)})` : 'No data yet'} />
        <InsightItem label="Recurring mistake" value={recurringMistake} />
        <InsightItem
          label="Review priority"
          value={stats.planRate < 70 ? 'Improve plan discipline before increasing risk.' : 'Keep prioritizing setups with healthy R:R and patient execution.'}
        />
        <InsightItem label="Average result" value={currencyFormatter.format(stats.averageProfit)} />
      </aside>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Session</p>
            <h2>Session performance</h2>
          </div>
        </div>
        <BarList items={sessionMetrics} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pairs</p>
            <h2>Most active pairs</h2>
          </div>
        </div>
        <BarList items={pairMetrics} />
      </section>
    </div>
  )
}
