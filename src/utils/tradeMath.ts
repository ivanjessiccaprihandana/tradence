import type { Outcome, Trade } from '../types/trade'

export function getPipSize(pair: string) {
  if (pair.includes('JPY')) return 0.01
  if (pair.includes('XAU')) return 0.1
  return 0.0001
}

export function getPips(trade: Trade) {
  const movement =
    trade.direction === 'Buy'
      ? trade.exit - trade.entry
      : trade.entry - trade.exit

  return movement / getPipSize(trade.pair)
}

export function getRiskReward(trade: Trade) {
  const risk = Math.abs(trade.entry - trade.stopLoss)
  const reward = Math.abs(trade.takeProfit - trade.entry)
  return risk === 0 ? 0 : reward / risk
}

export function getOutcome(trade: Trade): Outcome {
  const pips = getPips(trade)
  if (pips > 0) return 'Win'
  if (pips < 0) return 'Loss'
  return 'Break Even'
}

export function getProfit(trade: Trade) {
  const outcome = getOutcome(trade)
  if (outcome === 'Break Even') return 0

  const stopPips = Math.abs((trade.entry - trade.stopLoss) / getPipSize(trade.pair))
  const resultMultiple = stopPips === 0 ? 0 : Math.abs(getPips(trade)) / stopPips
  const value = trade.riskAmount * (Number.isFinite(resultMultiple) ? resultMultiple : 0)

  return outcome === 'Win' ? value : -trade.riskAmount
}
