import assert from 'node:assert/strict'
import test from 'node:test'
import { calculate, checkRules, createDemoTrades, defaultRules, getStats, validateTrade } from '../src/domain/journal.ts'

const referenceDate = new Date(2026, 8, 20, 12, 0, 0)

test('demo dataset covers the complete journal workflow', () => {
  const trades = createDemoTrades(referenceDate)
  assert.equal(trades.length, 24)
  assert.equal(new Set(trades.map((trade) => trade.id)).size, 24)
  assert.deepEqual(new Set(trades.map((trade) => trade.symbol)), new Set(['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'NAS100']))
  assert.deepEqual(new Set(trades.map((trade) => trade.session)), new Set(['London', 'New York', 'Asia', 'Overlap']))
  trades.forEach(validateTrade)
})

test('demo dataset includes wins, losses, breakeven, and open positions', () => {
  const results = createDemoTrades(referenceDate).map((trade) => calculate(trade).result)
  assert.equal(results.filter((result) => result === 'WIN').length, 13)
  assert.equal(results.filter((result) => result === 'LOSS').length, 7)
  assert.equal(results.filter((result) => result === 'BE').length, 2)
  assert.equal(results.filter((result) => result === 'OPEN').length, 2)
})

test('dashboard statistics only realize closed trades', () => {
  const trades = createDemoTrades(referenceDate)
  const stats = getStats(trades, 10000)
  assert.equal(stats.closed, 22)
  assert.equal(stats.curve.length, 23)
  assert.equal(stats.balance, 10000 + stats.pnl)
  assert.ok(Math.abs(stats.winRate - (13 / 22) * 100) < 1e-9)
  assert.ok(stats.pf !== null && stats.pf > 1)
  assert.ok(stats.dd >= 0)
})

test('open trades do not affect realized P/L', () => {
  const openTrade = createDemoTrades(referenceDate).find((trade) => trade.exit === '')
  assert.ok(openTrade)
  assert.equal(calculate(openTrade).pnl, null)
  assert.equal(calculate(openTrade).duration, null)
  assert.equal(calculate(openTrade).result, 'OPEN')
})

test('rules checker exposes both compliant and warning demo scenarios', () => {
  const trades = createDemoTrades(referenceDate)
  const warningTrade = trades.find((trade) => trade.risk > defaultRules.maxRisk)
  const compliantTrade = trades.find((trade) => trade.risk <= defaultRules.maxRisk && trade.confluences.length >= defaultRules.minChecks)
  assert.ok(warningTrade)
  assert.ok(compliantTrade)
  assert.equal(checkRules(warningTrade, trades, defaultRules)[0].pass, false)
  assert.equal(checkRules(compliantTrade, trades, defaultRules)[0].pass, true)
  assert.equal(checkRules(compliantTrade, trades, defaultRules)[4].pass, true)
})

test('demo screenshot review contains safe inline images', () => {
  const trades = createDemoTrades(referenceDate)
  const withBefore = trades.filter((trade) => trade.before.startsWith('data:image/svg+xml'))
  const withAfter = trades.filter((trade) => trade.after.startsWith('data:image/svg+xml'))
  assert.ok(withBefore.length >= 6)
  assert.ok(withAfter.length >= 5)
})

test('trade validation rejects invalid BUY price geometry', () => {
  const invalid = { ...createDemoTrades(referenceDate)[0], direction: 'BUY' as const, sl: 2, entry: 1, tp: 3 }
  assert.throws(() => validateTrade(invalid), /BUY: SL < entry < TP/)
})
