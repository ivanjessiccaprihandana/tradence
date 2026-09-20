import type { ChangeEvent, FormEvent } from 'react'
import { Metric } from '../components/Metric'
import type { Direction, TradeForm } from '../types/trade'
import { currencyFormatter } from '../utils/formatters'
import { getPips, getProfit, getRiskReward } from '../utils/tradeMath'

type TradeFormViewProps = {
  form: TradeForm
  handleScreenshot: (event: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  updateForm: (field: keyof TradeForm, value: string | number | boolean) => void
}

export function TradeFormView({
  form,
  handleScreenshot,
  handleSubmit,
  updateForm,
}: TradeFormViewProps) {
  const previewTrade = { ...form, id: 'preview' }
  const previewProfit = getProfit(previewTrade)

  return (
    <form className="panel trade-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Input</p>
          <h2>Add new trade</h2>
        </div>
        <span className="muted-pill">Auto calculate</span>
      </div>

      <div className="form-grid">
        <label>
          Date
          <input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
        </label>
        <label>
          Pair
          <input value={form.pair} onChange={(event) => updateForm('pair', event.target.value.toUpperCase())} />
        </label>
        <label>
          Direction
          <select value={form.direction} onChange={(event) => updateForm('direction', event.target.value as Direction)}>
            <option>Buy</option>
            <option>Sell</option>
          </select>
        </label>
        <label>
          Session
          <select value={form.session} onChange={(event) => updateForm('session', event.target.value)}>
            <option>Asia</option>
            <option>London</option>
            <option>New York</option>
          </select>
        </label>
        <label>
          Timeframe
          <input value={form.timeframe} onChange={(event) => updateForm('timeframe', event.target.value.toUpperCase())} />
        </label>
        <label>
          Strategy
          <input value={form.strategy} onChange={(event) => updateForm('strategy', event.target.value)} />
        </label>
        <NumberField label="Entry" value={form.entry} onChange={(value) => updateForm('entry', value)} />
        <NumberField label="Stop loss" value={form.stopLoss} onChange={(value) => updateForm('stopLoss', value)} />
        <NumberField label="Take profit" value={form.takeProfit} onChange={(value) => updateForm('takeProfit', value)} />
        <NumberField label="Exit" value={form.exit} onChange={(value) => updateForm('exit', value)} />
        <NumberField label="Lot" value={form.lot} onChange={(value) => updateForm('lot', value)} />
        <NumberField label="Risk USD" value={form.riskAmount} onChange={(value) => updateForm('riskAmount', value)} />
        <label>
          Emotion
          <input value={form.emotion} onChange={(event) => updateForm('emotion', event.target.value)} />
        </label>
        <label>
          Mistake
          <input value={form.mistake} placeholder="Leave empty if none" onChange={(event) => updateForm('mistake', event.target.value)} />
        </label>
      </div>

      <div className="form-bottom">
        <label className="checkbox-card">
          <input type="checkbox" checked={form.followedPlan} onChange={(event) => updateForm('followedPlan', event.target.checked)} />
          <span>
            <strong>Followed trading plan</strong>
            <small>Check this if entry, risk, and exit followed your rules.</small>
          </span>
        </label>

        <label>
          Screenshot chart
          <input type="file" accept="image/*" onChange={handleScreenshot} />
        </label>
      </div>

      <label>
        Review notes
        <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} />
      </label>

      <div className="form-preview">
        <Metric label="Preview pips" value={getPips(previewTrade).toFixed(1)} />
        <Metric label="Preview P/L" value={currencyFormatter.format(previewProfit)} tone={previewProfit >= 0 ? 'positive' : 'negative'} />
        <Metric label="Planned R:R" value={`1:${getRiskReward(previewTrade).toFixed(2)}`} />
      </div>

      <button className="primary-button" type="submit">Save trade</button>
    </form>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" step="any" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}
