import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'

type View = 'dashboard' | 'add' | 'history' | 'detail' | 'analytics' | 'calendar' | 'rules'
type Direction = 'BUY' | 'SELL'
type TradeResult = 'OPEN' | 'WIN' | 'LOSS' | 'BE'

type Trade = {
  id: string
  symbol: string
  direction: Direction
  entry: number
  sl: number
  tp: number
  lot: number
  risk: number
  contract: number
  conversion: number
  fees: number
  exit: number | ''
  openedAt: string
  closedAt: string
  timeframe: string
  session: string
  strategy: string
  setup: string[]
  confluences: string[]
  psychology: string
  mistakes: string[]
  notes: string
  before: string
  after: string
}

type Rules = {
  maxRisk: number
  minRR: number
  maxTrades: number
  dailyLoss: number
  minChecks: number
}

type JournalState = { trades: Trade[]; initial: number; rules: Rules }

type Calculation = {
  rr: number | null
  pnl: number | null
  riskMoney: number
  r: number | null
  result: TradeResult
  duration: number | null
}

const defaultRules: Rules = { maxRisk: 1, minRR: 2, maxTrades: 3, dailyLoss: 200, minChecks: 4 }
const defaultState: JournalState = { trades: [], initial: 10000, rules: defaultRules }
const checklist = ['HTF bias sesuai', 'Liquidity sweep', 'BOS / CHoCH', 'FVG', 'Order block', 'Session sesuai', 'News sudah dicek']
const STORAGE_KEY = 'edgebook-journal-v1'
const DATABASE_NAME = 'edgebook-react'

const viewMeta: Record<View, { title: string; copy: string }> = {
  dashboard: { title: 'Dashboard', copy: 'Catat prosesnya. Pahami performanya.' },
  add: { title: 'Add Trade', copy: 'Rencanakan, eksekusi, lalu evaluasi.' },
  history: { title: 'Trade History', copy: 'Setiap keputusan punya cerita.' },
  detail: { title: 'Trade Detail', copy: 'Rencana dan hasil dalam satu tempat.' },
  analytics: { title: 'Analytics', copy: 'Temukan pola dari trade yang sudah ditutup.' },
  calendar: { title: 'Calendar', copy: 'Hasil harian berdasarkan tanggal close.' },
  rules: { title: 'Trading Rules', copy: 'Tetapkan batas. Bangun disiplin.' },
}

function localDateTime(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

function blankTrade(): Trade {
  return {
    id: crypto.randomUUID(), symbol: 'EURUSD', direction: 'BUY', entry: 1.1, sl: 1.095,
    tp: 1.11, lot: 0.1, risk: 1, contract: 100000, conversion: 1, fees: 0,
    exit: '', openedAt: localDateTime(), closedAt: '', timeframe: 'M5', session: 'London',
    strategy: 'SMC', setup: ['Sweep', 'FVG'], confluences: [], psychology: 'Tenang',
    mistakes: [], notes: '', before: '', after: '',
  }
}

function calculate(trade: Trade): Calculation {
  const risk = Math.abs(trade.entry - trade.sl)
  const sign = trade.direction === 'BUY' ? 1 : -1
  const rr = risk ? (sign * (trade.tp - trade.entry)) / risk : null
  const closed = trade.exit !== '' && trade.exit != null
  const riskMoney = risk * trade.lot * trade.contract * trade.conversion
  const pnl = closed ? (Number(trade.exit) - trade.entry) * sign * trade.lot * trade.contract * trade.conversion - trade.fees : null
  const r = closed && riskMoney ? Number(pnl) / riskMoney : null
  const result: TradeResult = !closed ? 'OPEN' : Number(pnl) > 0 ? 'WIN' : Number(pnl) < 0 ? 'LOSS' : 'BE'
  const duration = closed && trade.closedAt && trade.openedAt
    ? (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / 60000
    : null
  return { rr, pnl, riskMoney, r, result, duration }
}

function getStats(trades: Trade[], initial: number) {
  const done = trades.filter((trade) => calculate(trade).pnl !== null).sort((a, b) => a.closedAt.localeCompare(b.closedAt))
  let balance = initial
  let peak = initial
  let dd = 0
  let ddPct = 0
  const curve = [initial]
  done.forEach((trade) => {
    balance += calculate(trade).pnl ?? 0
    peak = Math.max(peak, balance)
    dd = Math.max(dd, peak - balance)
    if (peak > 0) ddPct = Math.max(ddPct, ((peak - balance) / peak) * 100)
    curve.push(balance)
  })
  const results = done.map(calculate)
  const profit = results.reduce((sum, item) => sum + Math.max(0, item.pnl ?? 0), 0)
  const loss = -results.reduce((sum, item) => sum + Math.min(0, item.pnl ?? 0), 0)
  return {
    balance,
    pnl: balance - initial,
    winRate: done.length ? (results.filter((item) => Number(item.pnl) > 0).length / done.length) * 100 : 0,
    pf: loss ? profit / loss : profit ? Number.POSITIVE_INFINITY : null,
    avgRR: trades.length ? trades.reduce((sum, trade) => sum + (calculate(trade).rr ?? 0), 0) / trades.length : 0,
    expectancy: done.length ? (balance - initial) / done.length : 0,
    dd,
    ddPct,
    curve,
    closed: done.length,
  }
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return value === null ? '—' : '∞'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function number(value: number | null) {
  if (value === null) return '—'
  return Number.isFinite(value) ? value.toFixed(2) : '∞'
}

function checkRules(trade: Trade, trades: Trade[], rules: Rules) {
  const result = calculate(trade)
  const day = trade.openedAt.slice(0, 10)
  const others = trades.filter((item) => item.id !== trade.id)
  const preceding = others.filter((item) => item.openedAt.slice(0, 10) === day && item.openedAt <= trade.openedAt)
  const priorPnl = others
    .filter((item) => item.closedAt && item.closedAt.slice(0, 10) === day && item.closedAt <= trade.openedAt)
    .reduce((sum, item) => sum + (calculate(item).pnl ?? 0), 0)
  return [
    { label: `Risk ≤ ${rules.maxRisk}%`, pass: trade.risk <= rules.maxRisk },
    { label: `Planned RR ≥ ${rules.minRR}`, pass: result.rr !== null && result.rr + 1e-9 >= rules.minRR },
    { label: `Maks. ${rules.maxTrades} entry per hari`, pass: preceding.length < rules.maxTrades },
    { label: `Batas loss harian ${money(rules.dailyLoss)}`, pass: priorPnl > -rules.dailyLoss },
    { label: `Min. ${rules.minChecks} confluence`, pass: trade.confluences.length >= rules.minChecks },
  ]
}

function validateTrade(trade: Trade) {
  if (!trade.symbol.trim() || !trade.openedAt) throw new Error('Symbol dan waktu entry wajib diisi.')
  const positiveFields: (keyof Trade)[] = ['entry', 'sl', 'tp', 'lot', 'contract', 'conversion', 'risk']
  positiveFields.forEach((key) => {
    if (!Number.isFinite(Number(trade[key])) || Number(trade[key]) <= 0) throw new Error(`${key} harus lebih besar dari 0.`)
  })
  if (trade.risk > 100 || !Number.isFinite(trade.fees) || trade.fees < 0) throw new Error('Risk maksimal 100% dan biaya tidak boleh negatif.')
  const sign = trade.direction === 'BUY' ? 1 : -1
  if (sign * (trade.entry - trade.sl) <= 0 || sign * (trade.tp - trade.entry) <= 0) {
    throw new Error('BUY: SL < entry < TP. SELL: TP < entry < SL.')
  }
  if (trade.exit !== '' && (!Number.isFinite(Number(trade.exit)) || Number(trade.exit) <= 0 || !trade.closedAt || trade.closedAt < trade.openedAt)) {
    throw new Error('Trade closed memerlukan harga exit positif dan waktu close setelah entry.')
  }
  if (trade.exit === '' && trade.closedAt) throw new Error('Isi harga exit atau kosongkan waktu close.')
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
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function EquityChart({ values }: { values: number[] }) {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 800},${170 - ((value - low) / span) * 130}`).join(' ')
  return (
    <div className="chart-shell">
      <svg className="chart" viewBox="0 0 800 190" preserveAspectRatio="none" role="img" aria-label="Kurva balance dari trade closed">
        <defs><linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00c892" stopOpacity=".24"/><stop offset="100%" stopColor="#00c892" stopOpacity="0"/></linearGradient></defs>
        {[30, 100, 170].map((y) => <path key={y} d={`M0 ${y}H800`} className="chart-grid" />)}
        <polygon points={`0,190 ${points} 800,190`} fill="url(#chartFade)" />
        <polyline points={points} className="chart-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels"><span>Awal {money(values[0])}</span><span>Terakhir {money(values.at(-1) ?? 0)}</span></div>
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
  return <article className="stat-card"><span className="label">{label}</span><strong className={`stat-value ${tone}`}>{value}</strong><span className="sub">{helper}</span></article>
}

function AppHeader({ view, onAdd, onExport }: { view: View; onAdd: () => void; onExport: () => void }) {
  const meta = viewMeta[view]
  return <header className="page-header"><div><div className="eyebrow">BUILD RHYTHM. MEASURE GROWTH.</div><h1>{meta.title}</h1><p>{meta.copy}</p></div><div className="actions"><button className="button secondary" onClick={onExport}><Icon name="download"/> Export backup</button><button className="button primary" onClick={onAdd}><Icon name="plus"/> Add trade</button></div></header>
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
    {!state.trades.length && <div className="notice">Mulai dengan trade Anda sendiri, atau <button onClick={onDemo}>muat data demo</button> untuk menjelajahi dashboard.</div>}
    <section className="stats-grid stats-primary">{cards.slice(0, 4).map(([label, value, helper, tone]) => <StatCard key={label} label={label} value={value} helper={helper} tone={tone}/>)}</section>
    <section className="stats-grid stats-secondary">{cards.slice(4).map(([label, value, helper, tone]) => <StatCard key={label} label={label} value={value} helper={helper} tone={tone}/>)}</section>
    <section className="dashboard-grid">
      <article className="panel chart-panel"><div className="panel-head"><h2>Balance curve</h2><span className="badge">ALL TIME</span></div><EquityChart values={stats.curve}/></article>
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
        <Field label="Direction"><select value={draft.direction} onChange={(event) => update('direction', event.target.value as Direction)}><option>BUY</option><option>SELL</option></select></Field>
        <Field label="Waktu entry (lokal)"><input required type="datetime-local" value={draft.openedAt} onChange={(event) => update('openedAt', event.target.value)}/></Field>
        <Field label="Entry price"><input required type="number" step="any" value={draft.entry} onChange={(event) => update('entry', Number(event.target.value))}/></Field>
        <Field label="Stop loss"><input required type="number" step="any" value={draft.sl} onChange={(event) => update('sl', Number(event.target.value))}/></Field>
        <Field label="Take profit"><input required type="number" step="any" value={draft.tp} onChange={(event) => update('tp', Number(event.target.value))}/></Field>
        <Field label="Lot"><input required type="number" step="any" value={draft.lot} onChange={(event) => update('lot', Number(event.target.value))}/></Field>
        <Field label="Planned risk %"><input required type="number" step="any" value={draft.risk} onChange={(event) => update('risk', Number(event.target.value))}/></Field>
        <Field label="Timeframe"><select value={draft.timeframe} onChange={(event) => update('timeframe', event.target.value)}>{['M1','M5','M15','M30','H1','H4','D1'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Session"><select value={draft.session} onChange={(event) => update('session', event.target.value)}>{['Asia','London','New York','Overlap'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Strategy"><input value={draft.strategy} onChange={(event) => update('strategy', event.target.value)}/></Field>
        <Field label="Setup tags (pisahkan koma)"><input value={draft.setup.join(', ')} onChange={(event) => setList('setup', event.target.value)}/></Field>
      </div>
    </section>

    <section className="panel form-section"><div className="section-title"><span>02</span><div><h2>Confluence & psychology</h2><p>Checklist kualitas setup dan kondisi mental saat entry.</p></div></div>
      <div className="checks">{checklist.map((item) => <label className={draft.confluences.includes(item) ? 'checked' : ''} key={item}><input type="checkbox" checked={draft.confluences.includes(item)} onChange={(event) => update('confluences', event.target.checked ? [...draft.confluences, item] : draft.confluences.filter((value) => value !== item))}/><span>{item}</span></label>)}</div>
      <div className="form-grid form-gap">
        <Field label="Psychology"><select value={draft.psychology} onChange={(event) => update('psychology', event.target.value)}>{['Tenang','Percaya diri','Ragu','FOMO','Revenge','Takut'].map((value) => <option key={value}>{value}</option>)}</select></Field>
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
    <div className="toolbar"><label className="search-box"><Icon name="search"/><input aria-label="Cari symbol atau setup" placeholder="Cari symbol, strategy, setup…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><select aria-label="Filter hasil" value={status} onChange={(event) => setStatus(event.target.value)}>{['ALL','OPEN','WIN','LOSS','BE'].map((value) => <option key={value}>{value}</option>)}</select>{dayFilter && <button className="button secondary" onClick={clearDay}>{dayFilter} ×</button>}</div>
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

function createDemoTrades() {
  const now = new Date()
  return Array.from({ length: 16 }, (_, index) => {
    const trade = blankTrade()
    const day = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 16 + index), 9 + (index % 4), 0, 0, 0)
    const gold = index % 3 === 0
    const isLoss = index % 4 === 0
    const direction: Direction = index % 5 === 0 ? 'SELL' : 'BUY'
    const entry = gold ? 2500 : 1.1
    const sl = direction === 'BUY' ? (gold ? 2490 : 1.095) : (gold ? 2510 : 1.105)
    const tp = direction === 'BUY' ? (gold ? 2520 : 1.11) : (gold ? 2480 : 1.09)
    const exit = isLoss ? sl : direction === 'BUY' ? (gold ? 2520 : 1.108) : (gold ? 2480 : 1.092)
    return { ...trade, id: crypto.randomUUID(), symbol: gold ? 'XAUUSD' : index % 3 === 1 ? 'EURUSD' : 'GBPUSD', direction, entry, sl, tp, exit, contract: gold ? 100 : 100000, openedAt: localDateTime(day), closedAt: localDateTime(new Date(day.getTime() + 75 * 60000)), session: index % 2 ? 'London' : 'New York', setup: index % 2 ? ['Sweep','FVG'] : ['BOS'], fees: 3, confluences: checklist.slice(0, 4 + (index % 3)), psychology: isLoss ? 'FOMO' : 'Tenang', mistakes: isLoss ? ['Entry terlalu cepat'] : [], notes: 'DATA DEMO — hanya untuk mencoba aplikasi.' }
  })
}

export default function TradenceApp() {
  const [state, setState] = useState<JournalState>(readState)
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

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand brand-compact"><img className="brand-icon" src="/tradence-icon-v3.png" alt=""/><strong className="brand-title">Tradence<span>.</span></strong></div><nav>{navItems.map((item) => <button key={item.id} className={(view === item.id || (view === 'detail' && item.id === 'history')) ? 'active' : ''} onClick={() => { setEditing(false); setDayFilter(''); if (item.id === 'add') openAdd(); else go(item.id) }}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav><div className="sidebar-foot"><span>PERSONAL WORKSPACE</span><strong>Akun USD · Local journal</strong><p>Data tersimpan di browser ini.</p></div></aside>
    <main className="main-content"><AppHeader view={view} onAdd={openAdd} onExport={exportBackup}/>
      {view === 'dashboard' && <DashboardView state={state} onSelect={openDetail} onHistory={() => go('history')} onDemo={() => { saveState({ ...state, trades: createDemoTrades() }); setToast('16 trade demo dimuat') }}/>} 
      {view === 'add' && <TradeFormView key={draft.id} draft={draft} setDraft={setDraft} allTrades={state.trades} rules={state.rules} onSave={saveTrade} onCancel={() => go(editing ? 'detail' : 'history')} editing={editing}/>} 
      {view === 'history' && <HistoryView trades={state.trades} query={query} setQuery={setQuery} status={status} setStatus={setStatus} dayFilter={dayFilter} clearDay={() => setDayFilter('')} onSelect={openDetail}/>} 
      {view === 'detail' && <DetailView trade={selectedTrade} allTrades={state.trades} rules={state.rules} onEdit={editTrade} onDelete={deleteTrade}/>} 
      {view === 'analytics' && <AnalyticsView trades={state.trades}/>} 
      {view === 'calendar' && <CalendarView trades={state.trades} month={month} setMonth={setMonth} onDay={(date) => { setQuery(''); setStatus('ALL'); setDayFilter(date); go('history') }}/>} 
      {view === 'rules' && <RulesView state={state} onSaveState={saveState} notify={setToast}/>} 
    </main>
    {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
  </div>
}
