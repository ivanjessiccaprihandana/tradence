import { sampleTrades } from '../data/tradeDefaults'
import type { Trade } from '../types/trade'

const STORAGE_KEY = 'forex-journal-trades'

export function loadTrades() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return sampleTrades

  try {
    return JSON.parse(stored) as Trade[]
  } catch {
    return sampleTrades
  }
}

export function persistTrades(trades: Trade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
}
