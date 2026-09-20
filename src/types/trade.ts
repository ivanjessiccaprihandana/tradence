export type Direction = 'Buy' | 'Sell'
export type Outcome = 'Win' | 'Loss' | 'Break Even'
export type View = 'dashboard' | 'journal' | 'add'
export type OutcomeFilter = 'All' | Outcome

export type Trade = {
  id: string
  date: string
  pair: string
  direction: Direction
  session: string
  timeframe: string
  strategy: string
  entry: number
  stopLoss: number
  takeProfit: number
  exit: number
  lot: number
  riskAmount: number
  emotion: string
  mistake: string
  followedPlan: boolean
  note: string
  screenshot?: string
}

export type TradeForm = Omit<Trade, 'id' | 'screenshot'> & {
  screenshot?: string
}

export type GroupMetric = {
  label: string
  value: number
  count: number
}

export type AccountStats = {
  total: number
  netProfit: number
  winRate: number
  profitFactor: number
  averageRR: number
  planRate: number
  averageProfit: number
}

export type EquityPoint = {
  label: string
  value: number
}
