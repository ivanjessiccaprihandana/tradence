import type { AccountStats, View } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'
import { NavButton } from './NavButton'

type SidebarProps = {
  activeView: View
  setActiveView: (view: View) => void
  stats: AccountStats
}

export function Sidebar({ activeView, setActiveView, stats }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">FX</div>
        <div>
          <strong>TradeLog</strong>
          <span>Forex journal</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        <NavButton active={activeView === 'dashboard'} label="Dashboard" icon="grid" onClick={() => setActiveView('dashboard')} />
        <NavButton active={activeView === 'journal'} label="Journal" icon="list" onClick={() => setActiveView('journal')} />
        <NavButton active={activeView === 'add'} label="Add Trade" icon="plus" onClick={() => setActiveView('add')} />
      </nav>

      <div className="sidebar-card">
        <span>Net performance</span>
        <strong className={stats.netProfit >= 0 ? 'positive-text' : 'negative-text'}>
          {currencyFormatter.format(stats.netProfit)}
        </strong>
        <small>{stats.total} trades filtered</small>
      </div>
    </aside>
  )
}
