export type View = 'dashboard' | 'add' | 'history' | 'detail' | 'analytics' | 'calendar' | 'rules'
export type Direction = 'BUY' | 'SELL'
export type TradeResult = 'OPEN' | 'WIN' | 'LOSS' | 'BE'

export type Trade = {
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

export type Rules = {
  maxRisk: number
  minRR: number
  maxTrades: number
  dailyLoss: number
  minChecks: number
}

export type JournalState = { trades: Trade[]; initial: number; rules: Rules }

export type Calculation = {
  rr: number | null
  pnl: number | null
  riskMoney: number
  r: number | null
  result: TradeResult
  duration: number | null
}

export const defaultRules: Rules = { maxRisk: 1, minRR: 2, maxTrades: 3, dailyLoss: 200, minChecks: 4 }
export const checklist = ['HTF bias sesuai', 'Liquidity sweep', 'BOS / CHoCH', 'FVG', 'Order block', 'Session sesuai', 'News sudah dicek']

export function localDateTime(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

export function blankTrade(): Trade {
  return {
    id: crypto.randomUUID(), symbol: 'EURUSD', direction: 'BUY', entry: 1.1, sl: 1.095,
    tp: 1.11, lot: 0.1, risk: 1, contract: 100000, conversion: 1, fees: 0,
    exit: '', openedAt: localDateTime(), closedAt: '', timeframe: 'M5', session: 'London',
    strategy: 'SMC', setup: ['Sweep', 'FVG'], confluences: [], psychology: 'Tenang',
    mistakes: [], notes: '', before: '', after: '',
  }
}

export function calculate(trade: Trade): Calculation {
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

export function getStats(trades: Trade[], initial: number) {
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

function moneyLabel(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

export function checkRules(trade: Trade, trades: Trade[], rules: Rules) {
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
    { label: `Batas loss harian ${moneyLabel(rules.dailyLoss)}`, pass: priorPnl > -rules.dailyLoss },
    { label: `Min. ${rules.minChecks} confluence`, pass: trade.confluences.length >= rules.minChecks },
  ]
}

export function validateTrade(trade: Trade) {
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

type MarketConfig = { symbol: string; entry: number; distance: number; lot: number; contract: number; timeframe: string }

const markets: MarketConfig[] = [
  { symbol: 'EURUSD', entry: 1.105, distance: .0012, lot: .2, contract: 100000, timeframe: 'M15' },
  { symbol: 'GBPUSD', entry: 1.337, distance: .0015, lot: .15, contract: 100000, timeframe: 'M30' },
  { symbol: 'XAUUSD', entry: 3680, distance: 8, lot: .05, contract: 100, timeframe: 'M15' },
  { symbol: 'USDJPY', entry: 147.8, distance: .25, lot: .1, contract: 1000, timeframe: 'H1' },
  { symbol: 'NAS100', entry: 23800, distance: 60, lot: 1, contract: 1, timeframe: 'M5' },
]

const demoResults: Array<number | null> = [1.8, -1, 2.4, 1.2, 0, -1, 2.1, 1.6, -1, 2.8, 1.4, -1, 2.2, -1, 1.7, 0, 2.5, -1, 1.3, 2, -1, 1.9, null, null]

function demoChart(label: string, positive: boolean) {
  const points = positive ? '8,78 38,68 66,72 98,48 128,52 162,27 198,34 232,14' : '8,20 42,27 72,23 106,48 138,41 170,65 202,58 232,80'
  const color = positive ? '#00c892' : '#ef6262'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="220" viewBox="0 0 240 110"><rect width="240" height="110" fill="#071e36"/><g stroke="#17334b" stroke-width=".5"><path d="M0 27H240M0 55H240M0 82H240M60 0V110M120 0V110M180 0V110"/></g><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3"/><text x="10" y="102" fill="#8fa7ba" font-family="Arial" font-size="8">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function createDemoTrades(referenceDate = new Date()): Trade[] {
  const sessions = ['London', 'New York', 'Asia', 'Overlap']
  const strategies = ['SMC Reversal', 'Breakout Retest', 'Trend Continuation', 'Supply & Demand']
  const setups = [['Sweep', 'FVG'], ['BOS', 'Retest'], ['Order block', 'HTF bias'], ['Liquidity', 'CHoCH']]

  return demoResults.map((multiple, index) => {
    const market = markets[index % markets.length]
    const direction: Direction = index % 3 === 0 || index % 7 === 0 ? 'SELL' : 'BUY'
    const sign = direction === 'BUY' ? 1 : -1
    const opened = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - Math.floor((23 - index) * 5.2), 7 + (index % 9), index % 2 ? 30 : 0)
    const closed = new Date(opened.getTime() + (45 + (index % 5) * 30) * 60000)
    const isOpen = multiple === null
    const isBreakEven = multiple === 0
    const isLoss = multiple !== null && multiple < 0
    const fees = isOpen || isBreakEven ? 0 : index % 2 ? 1.5 : 2
    const exit = isOpen ? '' : market.entry + sign * market.distance * Number(multiple)
    const hasScreens = index % 4 === 0 || index === demoResults.length - 3
    const confidence = isLoss ? 'FOMO' : index % 5 === 0 ? 'Ragu' : index % 2 ? 'Tenang' : 'Percaya diri'

    return {
      id: `demo-${String(index + 1).padStart(3, '0')}`,
      symbol: market.symbol,
      direction,
      entry: market.entry,
      sl: market.entry - sign * market.distance,
      tp: market.entry + sign * market.distance * (2 + (index % 3) * .3),
      lot: market.lot,
      risk: index % 8 === 0 ? 1.25 : [.5, .75, 1][index % 3],
      contract: market.contract,
      conversion: 1,
      fees,
      exit,
      openedAt: localDateTime(opened),
      closedAt: isOpen ? '' : localDateTime(closed),
      timeframe: market.timeframe,
      session: sessions[index % sessions.length],
      strategy: strategies[index % strategies.length],
      setup: setups[index % setups.length],
      confluences: checklist.slice(0, 3 + (index % 5)),
      psychology: confidence,
      mistakes: isLoss ? [index % 2 ? 'Entry terlalu cepat' : 'Menggeser stop loss'] : [],
      notes: isOpen
        ? 'DATA DEMO — posisi masih berjalan dan menunggu konfirmasi exit.'
        : isLoss
          ? 'DATA DEMO — setup valid, tetapi eksekusi perlu lebih sabar dan mengikuti invalidation.'
          : isBreakEven
            ? 'DATA DEMO — posisi diamankan di breakeven setelah momentum melemah.'
            : 'DATA DEMO — rencana diikuti, risiko terjaga, dan exit sesuai struktur market.',
      before: hasScreens ? demoChart(`${market.symbol} · before entry`, true) : '',
      after: hasScreens && !isOpen ? demoChart(`${market.symbol} · after exit`, !isLoss) : '',
    }
  })
}
