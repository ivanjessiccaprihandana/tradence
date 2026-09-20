import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { blankTrade, calculate, checkRules, checklist, createDemoTrades, defaultRules, getStats, validateTrade } from './domain/journal'
import type { Direction, JournalState, Rules, Trade, View } from './domain/journal'

const defaultState: JournalState = { trades: [], initial: 10000, rules: defaultRules }
const STORAGE_KEY = 'edgebook-journal-v1'
const DATABASE_NAME = 'edgebook-react'
const THEME_KEY = 'tradence-theme'
type Theme = 'light' | 'dark'

const viewMeta: Record<View, { title: string; copy: string }> = {
  dashboard: { title: 'Dashboard', copy: 'Catat prosesnya. Pahami performanya.' },
  add: { title: 'Add Trade', copy: 'Rencanakan, eksekusi, lalu evaluasi.' },
  history: { title: 'Trade History', copy: 'Setiap keputusan punya cerita.' },
  detail: { title: 'Trade Detail', copy: 'Rencana dan hasil dalam satu tempat.' },
  analytics: { title: 'Analytics', copy: 'Temukan pola dari trade yang sudah ditutup.' },
  calendar: { title: 'Calendar', copy: 'Hasil harian berdasarkan tanggal close.' },
  rules: { title: 'Trading Rules', copy: 'Tetapkan batas. Bangun disiplin.' },
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return value === null ? '—' : '∞'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function number(value: number | null) {
  if (value === null) return '—'
  return Number.isFinite(value) ? value.toFixed(2) : '∞'
}

function readState(): JournalState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultState
    const parsed = JSON.parse(saved) as JournalState
    return parsed.trades && parsed.rules ? parsed : defaultState
  } catch {
    return defaultState
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('journal')) request.result.createObjectStore('journal')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadDatabaseState() {
  const database = await openDatabase()
  return new Promise<JournalState | null>((resolve, reject) => {
    const request = database.transaction('journal').objectStore('journal').get('state')
    request.onsuccess = () => resolve((request.result as JournalState | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function persistDatabaseState(state: JournalState) {
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('journal', 'readwrite')
    transaction.objectStore('journal').put(state, 'state')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    add: <><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="10"/></>,
    history: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="7" cy="18" r="1"/></>,
    analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="M2 20h22"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    rules: <><path d="M4 6h10M4 12h16M4 18h12"/><path d="m17 5 2 2 4-4"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    moon: <><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z"/><path d="M17.5 3.5v3M16 5h3"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

type ChartPeriod = '7D' | '30D' | '3M' | '6M' | 'YTD' | 'ALL'
type ChartGrouping = 'Daily' | 'Weekly' | 'Monthly'
type ChartDatum = { key: string; label: string; balance: number; pnl: number; trades: number }

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseTradeDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function chartStart(period: ChartPeriod, end: Date, firstTrade?: Date) {
  if (period === 'ALL') return firstTrade ?? end
  const start = new Date(end)
  if (period === 'YTD') return new Date(end.getFullYear(), 0, 1)
  if (period === '7D') start.setDate(start.getDate() - 6)
  if (period === '30D') start.setDate(start.getDate() - 29)
  if (period === '3M') start.setMonth(start.getMonth() - 3)
  if (period === '6M') start.setMonth(start.getMonth() - 6)
  return start
}

function groupDate(date: Date, grouping: ChartGrouping) {
  if (grouping === 'Daily') return { key: dateKey(date), label: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date) }
  if (grouping === 'Monthly') return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date) }
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return { key: dateKey(monday), label: `Week of ${new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(monday)}` }
}

function axisMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function EquityChart({ trades, initial }: { trades: Trade[]; initial: number }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [period, setPeriod] = useState<ChartPeriod>('30D')
  const [grouping, setGrouping] = useState<ChartGrouping>('Daily')
  const analysis = useMemo(() => {
    const closed = trades
      .map((trade) => ({ trade, result: calculate(trade), date: parseTradeDate(trade.closedAt) }))
      .filter((item) => item.result.pnl !== null && !Number.isNaN(item.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = chartStart(period, end, closed[0]?.date)
    start.setHours(0, 0, 0, 0)
    const openingBalance = initial + closed.filter((item) => item.date < start).reduce((sum, item) => sum + (item.result.pnl ?? 0), 0)
    const periodTrades = closed.filter((item) => item.date >= start && item.date <= end)
    const buckets = new Map<string, ChartDatum>()
    periodTrades.forEach((item) => {
      const group = groupDate(item.date, grouping)
      const current = buckets.get(group.key) ?? { ...group, balance: 0, pnl: 0, trades: 0 }
      current.pnl += item.result.pnl ?? 0
      current.trades += 1
      buckets.set(group.key, current)
    })
    let balance = openingBalance
    const startLabel = period === 'ALL' ? 'Start' : new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(start)
    const points: ChartDatum[] = [{ key: `start-${dateKey(start)}`, label: startLabel, balance, pnl: 0, trades: 0 }]
    buckets.forEach((bucket) => {
      balance += bucket.pnl
      points.push({ ...bucket, balance })
    })
    let peak = points[0].balance
    let maxDrawdown = 0
    points.forEach((point) => {
      peak = Math.max(peak, point.balance)
      maxDrawdown = Math.max(maxDrawdown, peak - point.balance)
    })
    const pnl = periodTrades.reduce((sum, item) => sum + (item.result.pnl ?? 0), 0)
    return {
      points,
      openingBalance,
      pnl,
      returnPct: openingBalance ? (pnl / openingBalance) * 100 : 0,
      bestPeriod: Math.max(0, ...[...buckets.values()].map((bucket) => bucket.pnl)),
      maxDrawdown,
      tradeCount: periodTrades.length,
    }
  }, [grouping, initial, period, trades])

  const values = analysis.points.map((point) => point.balance)
  const rawLow = Math.min(...values)
  const rawHigh = Math.max(...values)
  const padding = Math.max((rawHigh - rawLow) * .16, Math.abs(rawHigh) * .004, 20)
  const low = rawLow - padding
  const high = rawHigh + padding
  const span = high - low || 1
  const plot = { left: 64, right: 792, top: 24, bottom: 172 }
  const coordinates = analysis.points.map((point, index) => ({ ...point, x: plot.left + (index / Math.max(1, analysis.points.length - 1)) * (plot.right - plot.left), y: plot.bottom - ((point.balance - low) / span) * (plot.bottom - plot.top) }))
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const active = hovered === null ? coordinates.at(-1)! : coordinates[hovered]
  const yTicks = Array.from({ length: 4 }, (_, index) => high - (span * index) / 3)
  const labelIndexes = [...new Set(Array.from({ length: Math.min(5, coordinates.length) }, (_, index) => Math.round((index / Math.max(1, Math.min(5, coordinates.length) - 1)) * (coordinates.length - 1))))]
  const dotStep = Math.max(1, Math.ceil(coordinates.length / 40))
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - rect.left) / rect.width) * 800
    const ratio = Math.max(0, Math.min(1, (svgX - plot.left) / (plot.right - plot.left)))
    setHovered(Math.round(ratio * Math.max(0, coordinates.length - 1)))
  }
  return (
    <div className="equity-chart-wrap">
      <div className="chart-controls"><div className="chart-range-tabs" aria-label="Pilih periode grafik">{(['7D','30D','3M','6M','YTD','ALL'] as ChartPeriod[]).map((value) => <button type="button" className={period === value ? 'active' : ''} key={value} onClick={() => { setPeriod(value); setHovered(null) }}>{value}</button>)}</div><CustomSelect ariaLabel="Grouping" value={grouping} options={['Daily','Weekly','Monthly']} onChange={(value) => { setGrouping(value as ChartGrouping); setHovered(null) }}/></div>
      <div className="chart-insights">
        <div><span>PERIOD P/L</span><strong className={analysis.pnl >= 0 ? 'positive' : 'negative'}>{analysis.pnl >= 0 ? '+' : ''}{money(analysis.pnl)}</strong><small>{analysis.tradeCount} closed trades</small></div>
        <div><span>RETURN</span><strong className={analysis.returnPct >= 0 ? 'positive' : 'negative'}>{analysis.returnPct >= 0 ? '+' : ''}{analysis.returnPct.toFixed(2)}%</strong><small>From period opening</small></div>
        <div><span>BEST {grouping.toUpperCase()}</span><strong className="positive">+{money(analysis.bestPeriod)}</strong><small>Strongest result</small></div>
        <div><span>MAX DRAWDOWN</span><strong className="negative">{money(analysis.maxDrawdown)}</strong><small>Peak-to-trough</small></div>
      </div>
      <div className={`chart-shell ${hovered === null ? '' : 'is-hovering'}`}>
      <svg key={`${period}-${grouping}`} className="chart" viewBox="0 0 800 220" preserveAspectRatio="none" role="img" aria-label={`Kurva balance periode ${period}, dikelompokkan ${grouping}`} onPointerMove={move} onPointerLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00c892" stopOpacity=".32"/><stop offset="75%" stopColor="#00c892" stopOpacity=".05"/><stop offset="100%" stopColor="#00c892" stopOpacity="0"/></linearGradient>
          <filter id="chartGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {yTicks.map((tick, index) => { const y = plot.top + (index / 3) * (plot.bottom - plot.top); return <g key={tick}><path d={`M${plot.left} ${y}H${plot.right}`} className="chart-grid"/><text x="2" y={y + 3} className="chart-axis-label">{axisMoney(tick)}</text></g> })}
        {labelIndexes.map((index) => <g key={analysis.points[index].key}><path d={`M${coordinates[index].x} ${plot.top}V${plot.bottom}`} className="chart-grid chart-grid-vertical"/><text x={coordinates[index].x} y="207" textAnchor={index === 0 ? 'start' : index === coordinates.length - 1 ? 'end' : 'middle'} className="chart-axis-label chart-axis-date">{analysis.points[index].label.replace('Week of ', '')}</text></g>)}
        <polygon className="chart-area" points={`${coordinates[0].x},${plot.bottom} ${points} ${coordinates.at(-1)!.x},${plot.bottom}`} fill="url(#chartFade)" />
        <polyline points={points} className="chart-line" vectorEffect="non-scaling-stroke" />
        {coordinates.map((point, index) => index > 0 && (index % dotStep === 0 || index === coordinates.length - 1) ? <circle key={point.key} className={`chart-data-point ${point.pnl < 0 ? 'loss' : 'win'}`} cx={point.x} cy={point.y} r="3.2" vectorEffect="non-scaling-stroke"/> : null)}
        {hovered !== null && <line className="chart-crosshair" x1={active.x} x2={active.x} y1={plot.top} y2={plot.bottom} vectorEffect="non-scaling-stroke"/>}
        <circle className="chart-point-halo" cx={active.x} cy={active.y} r="10" vectorEffect="non-scaling-stroke"/>
        <circle className="chart-point" cx={active.x} cy={active.y} r="4.5" vectorEffect="non-scaling-stroke"/>
      </svg>
      {hovered !== null && <div className={`chart-tooltip ${hovered < 2 ? 'at-start' : hovered > values.length - 3 ? 'at-end' : ''}`} style={{ left: `${(active.x / 800) * 100}%`, top: `${(active.y / 220) * 100}%` }}><span>{active.label}</span><strong>{money(active.balance)}</strong><small className={active.pnl >= 0 ? 'positive' : 'negative'}>{active.pnl >= 0 ? '+' : ''}{money(active.pnl)} · {active.trades} trades</small></div>}
      {analysis.tradeCount === 0 && <div className="chart-empty-state">Belum ada closed trade pada periode ini.</div>}
      <div className="chart-labels"><span>Opening {money(analysis.openingBalance)}</span><span>Current {money(values.at(-1) ?? analysis.openingBalance)}</span></div>
      </div>
    </div>
  )
}

function RulesList({ items }: { items: { label: string; pass: boolean }[] }) {
  return <div>{items.map((item) => <div className="rule-row" key={item.label}><span>{item.label}</span><strong className={item.pass ? 'positive' : 'negative'}>{item.pass ? '✓ Sesuai' : '! Melanggar'}</strong></div>)}</div>
}

type TradeTableProps = { trades: Trade[]; onSelect: (id: string) => void }
function TradeTable({ trades, onSelect }: TradeTableProps) {
  if (!trades.length) return <div className="empty">Belum ada trade. Tambahkan trade pertama Anda.</div>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>SYMBOL / ENTRY</th><th>DIRECTION</th><th>SETUP</th><th>PLANNED RR</th><th>ACTUAL R</th><th>NET P/L</th><th>RESULT</th></tr></thead>
        <tbody>{trades.map((trade) => {
          const result = calculate(trade)
          return <tr key={trade.id}>
            <td><button className="link-button" onClick={() => onSelect(trade.id)}>{trade.symbol}</button><div className="sub">{trade.openedAt.replace('T', ' · ')}</div></td>
            <td className={trade.direction === 'BUY' ? 'positive' : 'negative'}>{trade.direction}</td>
            <td>{trade.setup.join(' · ') || '—'}</td><td>1:{number(result.rr)}</td><td>{number(result.r)}{result.r === null ? '' : 'R'}</td>
            <td className={result.pnl === null ? '' : result.pnl >= 0 ? 'positive' : 'negative'}>{money(result.pnl)}</td>
            <td><span className={`badge ${result.result.toLowerCase()}`}>{result.result}</span></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, helper, tone = '' }: { label: string; value: string | number; helper: string; tone?: string }) {
  const bars = [38, 62, 48, 78, 57, 88]
  return <article className={`stat-card ${tone}`}>
    <div className="stat-card-top"><span className="label">{label}</span><span className="metric-status"><i/> LIVE</span></div>
    <strong className={`stat-value ${tone}`}>{value}</strong>
    <span className="sub">{helper}</span>
    <div className="metric-spark" aria-hidden="true">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div>
  </article>
}

function AppHeader({ view, theme, onToggleTheme, onAdd, onExport }: { view: View; theme: Theme; onToggleTheme: () => void; onAdd: () => void; onExport: () => void }) {
  const meta = viewMeta[view]
  return <header className="page-header"><div className="header-copy"><div className="eyebrow"><i/> BUILD RHYTHM. MEASURE GROWTH.</div><h1>{meta.title}</h1><p>{meta.copy}</p></div><div className="actions"><button className="button theme-toggle" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Gunakan light mode' : 'Gunakan dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}><Icon name={theme === 'dark' ? 'sun' : 'moon'}/><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><span className="workspace-status"><i/> Local autosave</span><button className="button secondary" onClick={onExport}><Icon name="download"/> Export backup</button><button className="button primary" onClick={onAdd}><Icon name="plus"/> Add trade</button></div></header>
}

function DashboardView({ state, onSelect, onHistory, onDemo }: { state: JournalState; onSelect: (id: string) => void; onHistory: () => void; onDemo: () => void }) {
  const stats = getStats(state.trades, state.initial)
  const cards = [
    ['Balance', money(stats.balance), 'Saldo awal + realized P/L', ''],
    ['Total P/L', money(stats.pnl), `${stats.closed} trade closed`, stats.pnl >= 0 ? 'positive' : 'negative'],
    ['Win rate', `${stats.winRate.toFixed(1)}%`, 'Win / semua trade closed', ''],
    ['Profit factor', number(stats.pf), 'Gross profit / gross loss', ''],
    ['Average RR', `1:${number(stats.avgRR)}`, 'Rata-rata planned RR', ''],
    ['Expectancy', money(stats.expectancy), 'Rata-rata net P/L per closed trade', ''],
    ['Max drawdown', money(stats.dd), `${number(stats.ddPct)}% · balance closed trades`, 'negative'],
    ['Open trades', String(state.trades.filter((trade) => calculate(trade).pnl === null).length), 'Belum masuk realized P/L', ''],
  ]
  const recent = [...state.trades].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 5)
  return <>
    <div className="notice">{state.trades.length ? 'Ingin mencoba seluruh skenario fitur tanpa mengubah format jurnal?' : 'Mulai dengan trade Anda sendiri atau jelajahi seluruh fitur.'} <button onClick={onDemo}>{state.trades.length ? 'Ganti dengan 24 trade demo' : 'Muat 24 trade demo'}</button></div>
    <section className="stats-grid stats-primary">{cards.slice(0, 4).map(([label, value, helper, tone]) => <StatCard key={label} label={label} value={value} helper={helper} tone={tone}/>)}</section>
    <section className="stats-grid stats-secondary">{cards.slice(4).map(([label, value, helper, tone]) => <StatCard key={label} label={label} value={value} helper={helper} tone={tone}/>)}</section>
    <section className="dashboard-grid">
      <article className="panel chart-panel"><div className="panel-head chart-panel-head"><div><span className="chart-kicker">REALIZED PERFORMANCE</span><h2>Balance curve</h2><p>Perjalanan saldo berdasarkan waktu dan trade yang sudah ditutup.</p></div><span className="badge">INTERACTIVE</span></div><EquityChart trades={state.trades} initial={state.initial}/></article>
      <article className="panel process-panel"><h2>Process review</h2>{(['WIN', 'LOSS', 'BE'] as const).map((result) => {
        const count = state.trades.filter((trade) => calculate(trade).result === result).length
        const width = stats.closed ? (count / stats.closed) * 100 : 0
        return <div className="process-item" key={result}><div><span>{result === 'WIN' ? 'Winning trades' : result === 'LOSS' ? 'Losing trades' : 'Breakeven'}</span><strong>{count}</strong></div><div className="progress"><i className={result === 'LOSS' ? 'red' : ''} style={{ width: `${width}%` }}/></div></div>
      })}</article>
    </section>
    <section className="panel"><div className="panel-head"><h2>Recent trades</h2><button className="text-button" onClick={onHistory}>Lihat semua <Icon name="arrow"/></button></div><TradeTable trades={recent} onSelect={onSelect}/></section>
  </>
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label>
}

function CustomSelect({ value, options, onChange, ariaLabel, descriptions = {} }: {
  value: string
  options: string[]
  onChange: (value: string) => void
  ariaLabel: string
  descriptions?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const hasDescriptions = Object.keys(descriptions).length > 0

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const choose = (nextValue: string) => {
    onChange(nextValue)
    setActiveIndex(options.indexOf(nextValue))
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return
    event.preventDefault()
    if (!open) { setOpen(true); setActiveIndex(Math.max(0, options.indexOf(value))); return }
    if (event.key === 'Enter') { choose(options[activeIndex]); return }
    const direction = event.key === 'ArrowDown' ? 1 : -1
    setActiveIndex((current) => (current + direction + options.length) % options.length)
  }

  return <div className={`custom-select ${open ? 'open' : ''} ${hasDescriptions ? 'status-select' : ''}`} ref={rootRef} onKeyDown={handleKeyDown} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button type="button" className="custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} onClick={() => { setOpen((current) => !current); setActiveIndex(Math.max(0, options.indexOf(value))) }}>
      {hasDescriptions && <i className={`select-dot ${value.toLowerCase()}`}/>}<span>{value}</span><i className="select-chevron"/>
    </button>
    {open && <div className="custom-select-menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
      <div className="select-menu-label">SELECT {ariaLabel.toUpperCase()}</div>
      {options.map((option, index) => <button type="button" role="option" aria-selected={option === value} className={`custom-select-option ${index === activeIndex ? 'keyboard-active' : ''}`} key={option} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>
        {hasDescriptions && <i className={`select-dot ${option.toLowerCase()}`}/>}<span className="select-option-copy"><strong>{option}</strong>{descriptions[option] && <small>{descriptions[option]}</small>}</span>{option === value && <span className="select-check">✓</span>}
      </button>)}
    </div>}
  </div>
}

function TradeFormView({ draft, setDraft, allTrades, rules, onSave, onCancel, editing }: {
  draft: Trade
  setDraft: (trade: Trade) => void
  allTrades: Trade[]
  rules: Rules
  onSave: (trade: Trade) => void
  onCancel: () => void
  editing: boolean
}) {
  const [error, setError] = useState('')
  const result = calculate(draft)
  const update = <K extends keyof Trade>(key: K, value: Trade[K]) => setDraft({ ...draft, [key]: value })
  const setList = (key: 'setup' | 'mistakes', value: string) => update(key, [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))])
  const upload = (key: 'before' | 'after') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError('Screenshot harus PNG/JPEG/WebP, maksimal 4 MB per gambar.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update(key, String(reader.result))
    reader.onerror = () => setError('Gagal membaca screenshot.')
    reader.readAsDataURL(file)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      validateTrade(draft)
      setError('')
      onSave(draft)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Trade tidak dapat disimpan.')
    }
  }
  return <form onSubmit={submit}>
    <section className="panel form-section"><div className="section-title"><span>01</span><div><h2>Trade plan</h2><p>Detail utama dan skenario sebelum masuk market.</p></div></div>
      <div className="form-grid">
        <Field label="Symbol"><input required maxLength={20} value={draft.symbol} onChange={(event) => update('symbol', event.target.value.toUpperCase())}/></Field>
        <Field label="Direction"><CustomSelect ariaLabel="Direction" value={draft.direction} options={['BUY','SELL']} onChange={(value) => update('direction', value as Direction)}/></Field>
        <Field label="Waktu entry (lokal)"><input required type="datetime-local" value={draft.openedAt} onChange={(event) => update('openedAt', event.target.value)}/></Field>
        <Field label="Entry price"><input required type="number" step="any" value={draft.entry} onChange={(event) => update('entry', Number(event.target.value))}/></Field>
        <Field label="Stop loss"><input required type="number" step="any" value={draft.sl} onChange={(event) => update('sl', Number(event.target.value))}/></Field>
        <Field label="Take profit"><input required type="number" step="any" value={draft.tp} onChange={(event) => update('tp', Number(event.target.value))}/></Field>
        <Field label="Lot"><input required type="number" step="any" value={draft.lot} onChange={(event) => update('lot', Number(event.target.value))}/></Field>
        <Field label="Planned risk %"><input required type="number" step="any" value={draft.risk} onChange={(event) => update('risk', Number(event.target.value))}/></Field>
        <Field label="Timeframe"><CustomSelect ariaLabel="Timeframe" value={draft.timeframe} options={['M1','M5','M15','M30','H1','H4','D1']} onChange={(value) => update('timeframe', value)}/></Field>
        <Field label="Session"><CustomSelect ariaLabel="Session" value={draft.session} options={['Asia','London','New York','Overlap']} onChange={(value) => update('session', value)}/></Field>
        <Field label="Strategy"><input value={draft.strategy} onChange={(event) => update('strategy', event.target.value)}/></Field>
        <Field label="Setup tags (pisahkan koma)"><input value={draft.setup.join(', ')} onChange={(event) => setList('setup', event.target.value)}/></Field>
      </div>
    </section>

    <section className="panel form-section"><div className="section-title"><span>02</span><div><h2>Confluence & psychology</h2><p>Checklist kualitas setup dan kondisi mental saat entry.</p></div></div>
      <div className="checks">{checklist.map((item) => <label className={draft.confluences.includes(item) ? 'checked' : ''} key={item}><input type="checkbox" checked={draft.confluences.includes(item)} onChange={(event) => update('confluences', event.target.checked ? [...draft.confluences, item] : draft.confluences.filter((value) => value !== item))}/><span>{item}</span></label>)}</div>
      <div className="form-grid form-gap">
        <Field label="Psychology"><CustomSelect ariaLabel="Psychology" value={draft.psychology} options={['Tenang','Percaya diri','Ragu','FOMO','Revenge','Takut']} onChange={(value) => update('psychology', value)}/></Field>
        <Field label="Mistakes (pisahkan koma)"><input value={draft.mistakes.join(', ')} onChange={(event) => setList('mistakes', event.target.value)}/></Field>
        <Field label="Notes" wide><textarea value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Apa yang Anda lihat, lakukan, dan pelajari?"/></Field>
      </div>
    </section>

    <section className="panel form-section"><div className="section-title"><span>03</span><div><h2>Hasil & perhitungan USD</h2><p>Harga exit kosong berarti posisi masih OPEN.</p></div></div>
      <div className="form-grid">
        <Field label="Harga exit (opsional)"><input type="number" step="any" value={draft.exit} onChange={(event) => update('exit', event.target.value === '' ? '' : Number(event.target.value))}/></Field>
        <Field label="Waktu close (lokal)"><input type="datetime-local" value={draft.closedAt} onChange={(event) => update('closedAt', event.target.value)}/></Field>
        <Field label="Total biaya USD"><input required type="number" min="0" step="any" value={draft.fees} onChange={(event) => update('fees', Number(event.target.value))}/></Field>
        <Field label="Contract size per lot"><input required type="number" step="any" value={draft.contract} onChange={(event) => update('contract', Number(event.target.value))}/></Field>
        <Field label="1 quote currency = berapa USD"><input required type="number" step="any" value={draft.conversion} onChange={(event) => update('conversion', Number(event.target.value))}/></Field>
      </div>
      <p className="helper-copy">Default EURUSD: 100.000 unit/lot, konversi 1. XAUUSD umumnya 100 oz/lot; verifikasi dengan broker.</p>
    </section>

    <section className="panel form-section"><div className="section-title"><span>04</span><div><h2>Screenshot review</h2><p>Simpan chart sebelum entry dan setelah exit.</p></div></div>
      <div className="screenshot-fields">{(['before','after'] as const).map((key) => <Field key={key} label={key === 'before' ? 'Before entry · PNG/JPEG/WebP ≤ 4 MB' : 'After exit · PNG/JPEG/WebP ≤ 4 MB'}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload(key)}/>{draft[key] && <div className="file-actions"><a href={draft[key]} target="_blank" rel="noreferrer">Lihat tersimpan</a><button type="button" onClick={() => update(key, '')}>Hapus</button></div>}</Field>)}</div>
    </section>

    <section className="panel save-panel">
      <div className="live-preview"><span className="badge">Planned RR 1:{number(result.rr)}</span><span className="badge">P/L {money(result.pnl)}</span><span className="badge">Actual {number(result.r)}R</span><span className="badge">Estimasi SL {money(result.riskMoney)}</span></div>
      <h3>Rules checker · saat entry</h3><RulesList items={checkRules(draft, allTrades, rules)}/>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions form-actions"><button className="button primary" type="submit">{editing ? 'Simpan perubahan' : 'Simpan trade'}</button><button className="button secondary" type="button" onClick={onCancel}>Batal</button></div>
    </section>
  </form>
}

function HistoryView({ trades, query, setQuery, status, setStatus, dayFilter, clearDay, onSelect }: {
  trades: Trade[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; dayFilter: string; clearDay: () => void; onSelect: (id: string) => void
}) {
  const filtered = trades.filter((trade) => {
    const matchesText = !query || `${trade.symbol} ${trade.setup.join(' ')} ${trade.strategy}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = status === 'ALL' || calculate(trade).result === status
    const matchesDay = !dayFilter || trade.closedAt.slice(0, 10) === dayFilter
    return matchesText && matchesStatus && matchesDay
  }).sort((a, b) => b.openedAt.localeCompare(a.openedAt))
  return <>
    <div className="toolbar"><label className="search-box"><Icon name="search"/><input aria-label="Cari symbol atau setup" placeholder="Cari symbol, strategy, setup…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><CustomSelect ariaLabel="Filter hasil" value={status} options={['ALL','OPEN','WIN','LOSS','BE']} descriptions={{ ALL: 'Semua trade', OPEN: 'Posisi berjalan', WIN: 'Trade profit', LOSS: 'Trade loss', BE: 'Break even' }} onChange={setStatus}/>{dayFilter && <button className="button secondary" onClick={clearDay}>{dayFilter} ×</button>}</div>
    <section className="panel"><div className="panel-head"><h2>{filtered.length} trades</h2><span className="badge">{status}</span></div><TradeTable trades={filtered} onSelect={onSelect}/></section>
  </>
}

function DetailView({ trade, allTrades, rules, onEdit, onDelete }: { trade?: Trade; allTrades: Trade[]; rules: Rules; onEdit: () => void; onDelete: () => void }) {
  if (!trade) return <section className="panel"><div className="empty">Trade tidak ditemukan.</div></section>
  const result = calculate(trade)
  const details = [
    ['Net P/L', money(result.pnl)], ['Planned RR', `1:${number(result.rr)}`], ['Actual R', `${number(result.r)}R`],
    ['Duration', result.duration === null ? '—' : `${Math.floor(result.duration / 60)}j ${Math.round(result.duration % 60)}m`],
    ['Entry', trade.entry], ['SL', trade.sl], ['TP', trade.tp], ['Exit', trade.exit || '—'], ['Lot', trade.lot],
    ['Risk plan', `${trade.risk}%`], ['Session', trade.session], ['Timeframe', trade.timeframe],
    ['Entry time', trade.openedAt.replace('T', ' ')], ['Close time', trade.closedAt.replace('T', ' ') || '—'],
    ['Strategy', trade.strategy], ['Setup', trade.setup.join(', ') || '—'], ['Contract', trade.contract],
    ['Quote → USD', trade.conversion], ['Fees', money(trade.fees)], ['SL amount', money(result.riskMoney)],
  ]
  return <>
    <section className="panel"><div className="panel-head"><h2 className="symbol-title">{trade.symbol} <span className={`badge ${result.result.toLowerCase()}`}>{trade.direction} · {result.result}</span></h2><div className="actions"><button className="button secondary" onClick={onEdit}>Edit trade</button><button className="button danger" onClick={onDelete}>Hapus</button></div></div><div className="details-grid">{details.map(([label, value]) => <div key={label}><span className="label">{label}</span><strong className={label === 'Net P/L' ? (Number(result.pnl) >= 0 ? 'positive' : 'negative') : ''}>{value}</strong></div>)}</div></section>
    <div className="grid-half"><section className="panel"><h2>Process & psychology</h2><p>Confluence {trade.confluences.length}/{checklist.length}</p><p>{trade.confluences.join(' · ') || 'Belum dicatat'}</p><h3>{trade.psychology}</h3><p>Mistakes: {trade.mistakes.join(', ') || 'Tidak ada'}</p><p className="notes">{trade.notes || 'Tidak ada catatan.'}</p></section><section className="panel"><h2>Rules checker</h2><p className="sub">Dihitung ulang memakai aturan saat ini dan trade sebelum waktu entry.</p><RulesList items={checkRules(trade, allTrades, rules)}/></section></div>
    <section className="panel"><h2>Screenshot review</h2><div className="screens">{(['before','after'] as const).map((key) => <div key={key}><h3>{key === 'before' ? 'Before entry' : 'After exit'}</h3>{trade[key] ? <a href={trade[key]} target="_blank" rel="noreferrer"><img src={trade[key]} alt={`Screenshot ${key} ${trade.symbol}`}/></a> : <div className="empty">Belum ada screenshot</div>}</div>)}</div></section>
  </>
}

function AnalyticsTable({ trades, group, label }: { trades: Trade[]; group: 'symbol' | 'session' | 'setup'; label: string }) {
  const groups: Record<string, Trade[]> = {}
  trades.forEach((trade) => {
    const values = group === 'setup' ? (trade.setup.length ? trade.setup : ['Tanpa tag']) : [trade[group]]
    values.forEach((value) => { (groups[value] ??= []).push(trade) })
  })
  const rows = Object.entries(groups).sort((a, b) => getStats(b[1], 0).pnl - getStats(a[1], 0).pnl)
  return <section className="panel analytics-panel"><h2>Performance by {label}</h2>{rows.length ? <div className="table-wrap"><table><thead><tr><th>{label.toUpperCase()}</th><th>TRADES</th><th>WIN RATE</th><th>NET P/L</th><th>PROFIT FACTOR</th><th>AVG ACTUAL R</th></tr></thead><tbody>{rows.map(([name, groupTrades]) => {
    const stats = getStats(groupTrades, 0)
    const averageR = groupTrades.reduce((sum, trade) => sum + (calculate(trade).r ?? 0), 0) / groupTrades.length
    return <tr key={name}><td><strong>{name}</strong></td><td>{groupTrades.length}</td><td>{stats.winRate.toFixed(1)}%</td><td className={stats.pnl >= 0 ? 'positive' : 'negative'}>{money(stats.pnl)}</td><td>{number(stats.pf)}</td><td>{number(averageR)}R</td></tr>
  })}</tbody></table></div> : <div className="empty">Belum ada trade closed untuk dianalisis.</div>}</section>
}

function AnalyticsView({ trades }: { trades: Trade[] }) {
  const done = trades.filter((trade) => calculate(trade).pnl !== null)
  return <><div className="notice">Hanya trade closed. Trade dengan beberapa setup dihitung pada setiap tag; total antar-tag tidak dijumlahkan.</div><AnalyticsTable trades={done} group="symbol" label="Symbol"/><AnalyticsTable trades={done} group="session" label="Session"/><AnalyticsTable trades={done} group="setup" label="Setup tag"/></>
}

function CalendarView({ trades, month, setMonth, onDay }: { trades: Trade[]; month: Date; setMonth: (value: Date) => void; onDay: (date: string) => void }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const start = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const closedTrades = trades.filter((trade) => trade.closedAt.startsWith(prefix) && calculate(trade).pnl !== null)
  const title = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  return <section className="panel calendar-panel"><div className="panel-head calendar-head"><div><h2>{title}</h2><p>{closedTrades.length} closed trades · <strong className={getStats(closedTrades, 0).pnl >= 0 ? 'positive' : 'negative'}>{money(getStats(closedTrades, 0).pnl)}</strong></p></div><div className="actions"><button className="button icon-button" aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>←</button><button className="button secondary" onClick={() => setMonth(new Date())}>Bulan ini</button><button className="button icon-button" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>→</button></div></div>
    <div className="calendar-grid">{['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((day) => <div className="weekday" key={day}>{day}</div>)}{Array.from({ length: start }).map((_, index) => <div key={`empty-${index}`}/>)}{Array.from({ length: count }, (_, index) => {
      const date = `${prefix}-${String(index + 1).padStart(2, '0')}`
      const dayTrades = closedTrades.filter((trade) => trade.closedAt.slice(0, 10) === date)
      const pnl = getStats(dayTrades, 0).pnl
      return <button className={`calendar-day ${dayTrades.length ? (pnl >= 0 ? 'green' : 'red') : ''}`} key={date} onClick={() => onDay(date)}><span>{index + 1}</span>{dayTrades.length > 0 && <><strong className={pnl >= 0 ? 'positive' : 'negative'}>{money(pnl)}</strong><small>{dayTrades.length} trades</small></>}</button>
    })}</div>
  </section>
}

function RulesView({ state, onSaveState, notify }: { state: JournalState; onSaveState: (state: JournalState) => void; notify: (message: string) => void }) {
  const [initial, setInitial] = useState(state.initial)
  const [rules, setRules] = useState(state.rules)
  const [importError, setImportError] = useState('')
  const updateRule = (key: keyof Rules, value: number) => setRules({ ...rules, [key]: value })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSaveState({ ...state, initial, rules })
    notify('Aturan tersimpan')
  }
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file) return
      if (file.size > 80 * 1024 * 1024) throw new Error('Backup maksimal 80 MB.')
      const data = JSON.parse(await file.text()) as JournalState & { version?: number }
      if (data.version !== 1 || !Array.isArray(data.trades) || !Number.isFinite(data.initial) || data.initial <= 0 || !data.rules) throw new Error('Format backup tidak valid.')
      data.trades.forEach((trade) => validateTrade(trade))
      if (!window.confirm(`Ganti seluruh data dengan ${data.trades.length} trade dari backup?`)) return
      onSaveState({ trades: data.trades, initial: data.initial, rules: data.rules })
      setInitial(data.initial)
      setRules(data.rules)
      setImportError('')
      notify('Backup berhasil diimpor')
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : 'Backup tidak dapat diimpor.')
    }
  }
  return <>
    <form onSubmit={submit} className="panel form-section"><div className="section-title"><span>01</span><div><h2>Account & risk limits</h2><p>Aturan ini digunakan oleh checker pada setiap trade.</p></div></div><div className="form-grid">
      <Field label="Saldo awal USD"><input required type="number" min="1" step="any" value={initial} onChange={(event) => setInitial(Number(event.target.value))}/></Field>
      <Field label="Maks. risk per trade %"><input required type="number" min="0.01" max="100" step="any" value={rules.maxRisk} onChange={(event) => updateRule('maxRisk', Number(event.target.value))}/></Field>
      <Field label="Min. planned RR"><input required type="number" min="0.01" step="any" value={rules.minRR} onChange={(event) => updateRule('minRR', Number(event.target.value))}/></Field>
      <Field label="Maks. entry per hari"><input required type="number" min="1" step="1" value={rules.maxTrades} onChange={(event) => updateRule('maxTrades', Number(event.target.value))}/></Field>
      <Field label="Batas loss harian USD"><input required type="number" min="0.01" step="any" value={rules.dailyLoss} onChange={(event) => updateRule('dailyLoss', Number(event.target.value))}/></Field>
      <Field label="Min. confluence"><input required type="number" min="0" max="7" step="1" value={rules.minChecks} onChange={(event) => updateRule('minChecks', Number(event.target.value))}/></Field>
    </div><p className="helper-copy">Checker memberi peringatan, bukan memblokir trade. Loss harian menggunakan net P/L yang sudah direalisasikan sebelum entry pada hari yang sama.</p><button className="button primary" type="submit">Simpan aturan</button></form>
    <section className="panel form-section"><div className="section-title"><span>02</span><div><h2>Data & backup</h2><p>Impor backup akan mengganti seluruh data jurnal saat ini.</p></div></div><Field label="Import backup JSON"><input type="file" accept="application/json,.json" onChange={importBackup}/></Field>{importError && <p className="error" role="alert">{importError}</p>}</section>
  </>
}

export default function TradenceApp() {
  const [state, setState] = useState<JournalState>(readState)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [storageReady, setStorageReady] = useState(false)
  const [view, setView] = useState<View>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Trade>(blankTrade)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [dayFilter, setDayFilter] = useState('')
  const [month, setMonth] = useState(new Date())
  const [toast, setToast] = useState('')
  const selectedTrade = useMemo(() => state.trades.find((trade) => trade.id === selectedId), [selectedId, state.trades])

  useEffect(() => {
    let active = true
    loadDatabaseState()
      .then((saved) => { if (active && saved?.trades && saved.rules) setState(saved) })
      .catch(() => setToast('Penyimpanan browser tidak tersedia'))
      .finally(() => { if (active) setStorageReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    persistDatabaseState(state).catch(() => setToast('Data belum tersimpan. Periksa izin penyimpanan browser.'))
  }, [state, storageReady])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const saveState = (next: JournalState) => setState(next)
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openAdd = () => { setEditing(false); setDraft(blankTrade()); go('add') }
  const openDetail = (id: string) => { setSelectedId(id); go('detail') }
  const saveTrade = (trade: Trade) => {
    const trades = editing ? state.trades.map((item) => item.id === trade.id ? trade : item) : [...state.trades, trade]
    saveState({ ...state, trades })
    setSelectedId(trade.id)
    setEditing(false)
    setToast('Trade tersimpan')
    go('detail')
  }
  const editTrade = () => { if (selectedTrade) { setDraft({ ...selectedTrade }); setEditing(true); go('add') } }
  const deleteTrade = () => {
    if (!selectedTrade || !window.confirm(`Hapus trade ${selectedTrade.symbol} beserta screenshot?`)) return
    saveState({ ...state, trades: state.trades.filter((trade) => trade.id !== selectedTrade.id) })
    setSelectedId(null)
    setToast('Trade dihapus')
    go('history')
  }
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, ...state }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `tradence-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { id: 'add', label: 'Add Trade', icon: 'add' },
    { id: 'history', label: 'Trade History', icon: 'history' }, { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' }, { id: 'rules', label: 'Trading Rules', icon: 'rules' },
  ]

  return <div className="app-shell" data-theme={theme}>
    <aside className="sidebar"><div className="brand brand-compact"><span className="brand-icon-wrap"><img className="brand-icon" src="/tradence-icon-v3.png" alt=""/></span><strong className="brand-title">Tradence<span>.</span></strong></div><nav>{navItems.map((item) => <button key={item.id} className={(view === item.id || (view === 'detail' && item.id === 'history')) ? 'active' : ''} onClick={() => { setEditing(false); setDayFilter(''); if (item.id === 'add') openAdd(); else go(item.id) }}><Icon name={item.icon}/><span>{item.label}</span><i className="nav-arrow">›</i></button>)}</nav><div className="sidebar-foot"><span>PERSONAL WORKSPACE</span><strong><i/> Akun USD · Local journal</strong><p>Data tersimpan aman di browser ini.</p></div></aside>
    <main className="main-content"><AppHeader view={view} theme={theme} onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onAdd={openAdd} onExport={exportBackup}/>
      <div className={`view-stage view-${view}`} key={view}>
        {view === 'dashboard' && <DashboardView state={state} onSelect={openDetail} onHistory={() => go('history')} onDemo={() => { if (state.trades.length && !window.confirm('Ganti seluruh trade saat ini dengan 24 trade demo? Sebaiknya ekspor backup terlebih dahulu.')) return; const demo = createDemoTrades(); saveState({ ...state, trades: demo }); setMonth(new Date()); setToast(`${demo.length} trade demo dimuat`) }}/>} 
        {view === 'add' && <TradeFormView key={draft.id} draft={draft} setDraft={setDraft} allTrades={state.trades} rules={state.rules} onSave={saveTrade} onCancel={() => go(editing ? 'detail' : 'history')} editing={editing}/>} 
        {view === 'history' && <HistoryView trades={state.trades} query={query} setQuery={setQuery} status={status} setStatus={setStatus} dayFilter={dayFilter} clearDay={() => setDayFilter('')} onSelect={openDetail}/>} 
        {view === 'detail' && <DetailView trade={selectedTrade} allTrades={state.trades} rules={state.rules} onEdit={editTrade} onDelete={deleteTrade}/>} 
        {view === 'analytics' && <AnalyticsView trades={state.trades}/>} 
        {view === 'calendar' && <CalendarView trades={state.trades} month={month} setMonth={setMonth} onDay={(date) => { setQuery(''); setStatus('ALL'); setDayFilter(date); go('history') }}/>} 
        {view === 'rules' && <RulesView state={state} onSaveState={saveState} notify={setToast}/>} 
      </div>
    </main>
    {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
  </div>
}
