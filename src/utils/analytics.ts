import type { AccountStats, EquityPoint, GroupMetric, Trade } from '../types/trade'
import { getOutcome, getProfit, getRiskReward } from './tradeMath'

export function getAccountStats(trades: Trade[]): AccountStats {
  const total = trades.length
  const wins = trades.filter((trade) => getOutcome(trade) === 'Win')
  const losses = trades.filter((trade) => getOutcome(trade) === 'Loss')
  const grossProfit = wins.reduce((sum, trade) => sum + getProfit(trade), 0)
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + getProfit(trade), 0))
  const netProfit = trades.reduce((sum, trade) => sum + getProfit(trade), 0)
  const planRate =
    total === 0
      ? 0
      : (trades.filter((trade) => trade.followedPlan).length / total) * 100

  return {
    total,
    netProfit,
    winRate: total === 0 ? 0 : (wins.length / total) * 100,
    profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
    averageRR:
      total === 0
        ? 0
        : trades.reduce((sum, trade) => sum + getRiskReward(trade), 0) / total,
    planRate,
    averageProfit: total === 0 ? 0 : netProfit / total,
  }
}

export function groupByProfit(
  trades: Trade[],
  key: keyof Pick<Trade, 'session' | 'strategy' | 'pair'>,
): GroupMetric[] {
  const grouped = trades.reduce<Record<string, GroupMetric>>((map, trade) => {
    const label = String(trade[key])
    map[label] ??= { label, value: 0, count: 0 }
    map[label].value += getProfit(trade)
    map[label].count += 1
    return map
  }, {})

  return Object.values(grouped).sort((a, b) => b.value - a.value)
}

export function getEquityCurve(trades: Trade[]): EquityPoint[] {
  let balance = 0

  return [...trades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((trade) => {
      balance += getProfit(trade)
      return { label: trade.date.slice(5), value: balance }
    })
}

export function getRecurringMistake(trades: Trade[]) {
  const mistakes = trades.map((trade) => trade.mistake.trim()).filter(Boolean)
  if (mistakes.length === 0) return 'No recurring mistake has been logged yet.'

  const grouped = mistakes.reduce<Record<string, number>>((map, mistake) => {
    map[mistake] = (map[mistake] ?? 0) + 1
    return map
  }, {})

  return Object.entries(grouped).sort((a, b) => b[1] - a[1])[0][0]
}
