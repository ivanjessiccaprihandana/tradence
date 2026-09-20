import { Metric } from '../components/Metric'
import type { Trade } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'
import { getOutcome, getPips, getProfit, getRiskReward } from '../utils/tradeMath'

type JournalViewProps = {
  deleteTrade: (id: string) => void
  selectedTrade?: Trade
  selectedTradeId?: string
  setSelectedTradeId: (id: string) => void
  trades: Trade[]
}

export function JournalView({
  deleteTrade,
  selectedTrade,
  selectedTradeId,
  setSelectedTradeId,
  trades,
}: JournalViewProps) {
  return (
    <section className="journal-layout">
      <div className="panel trade-stream">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Journal</p>
            <h2>Trade history</h2>
          </div>
          <span className="muted-pill">{trades.length} entries</span>
        </div>

        <div className="trade-list">
          {trades.length === 0 && <div className="empty-state">No trades match the current filters.</div>}
          {trades.map((trade) => (
            <button
              className={`trade-row ${selectedTradeId === trade.id ? 'is-selected' : ''}`}
              key={trade.id}
              type="button"
              onClick={() => setSelectedTradeId(trade.id)}
            >
              <span className={`outcome-stripe ${getOutcome(trade).toLowerCase().replace(' ', '-')}`} />
              <span>
                <strong>{trade.pair}</strong>
                <small>{trade.date} | {trade.session} | {trade.strategy}</small>
              </span>
              <span className="trade-row-result">
                <strong className={getProfit(trade) >= 0 ? 'positive-text' : 'negative-text'}>{currencyFormatter.format(getProfit(trade))}</strong>
                <small>{getPips(trade).toFixed(1)} pips</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="panel review-panel">
        {selectedTrade ? (
          <>
            <div className="review-header">
              <span className={`badge ${getOutcome(selectedTrade).toLowerCase().replace(' ', '-')}`}>{getOutcome(selectedTrade)}</span>
              <h2>{selectedTrade.pair} {selectedTrade.direction}</h2>
              <p>{selectedTrade.date} | {selectedTrade.timeframe} | {selectedTrade.session}</p>
            </div>
            <div className="review-metrics">
              <Metric label="P/L" value={currencyFormatter.format(getProfit(selectedTrade))} tone={getProfit(selectedTrade) >= 0 ? 'positive' : 'negative'} />
              <Metric label="Pips" value={getPips(selectedTrade).toFixed(1)} />
              <Metric label="Risk reward" value={`1:${getRiskReward(selectedTrade).toFixed(2)}`} />
              <Metric label="Lot" value={String(selectedTrade.lot)} />
            </div>
            <div className="price-grid">
              <span>Entry <strong>{selectedTrade.entry}</strong></span>
              <span>SL <strong>{selectedTrade.stopLoss}</strong></span>
              <span>TP <strong>{selectedTrade.takeProfit}</strong></span>
              <span>Exit <strong>{selectedTrade.exit}</strong></span>
            </div>
            <div className="note-box">
              <strong>Review</strong>
              <p>{selectedTrade.note}</p>
            </div>
            <div className="trade-meta">
              <span>Emotion: {selectedTrade.emotion}</span>
              <span>Plan: {selectedTrade.followedPlan ? 'Yes' : 'No'}</span>
              {selectedTrade.mistake && <span>Mistake: {selectedTrade.mistake}</span>}
            </div>
            {selectedTrade.screenshot && <img className="chart-shot" src={selectedTrade.screenshot} alt={`Screenshot ${selectedTrade.pair}`} />}
            <button className="ghost-button danger" type="button" onClick={() => deleteTrade(selectedTrade.id)}>Delete trade</button>
          </>
        ) : (
          <div className="empty-state">Select a trade to review the details.</div>
        )}
      </aside>
    </section>
  )
}
