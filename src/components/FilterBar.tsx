import type { OutcomeFilter } from '../types/trade'

type FilterBarProps = {
  query: string
  sessionFilter: string
  outcomeFilter: OutcomeFilter
  setQuery: (query: string) => void
  setSessionFilter: (session: string) => void
  setOutcomeFilter: (outcome: OutcomeFilter) => void
}

export function FilterBar({
  outcomeFilter,
  query,
  sessionFilter,
  setOutcomeFilter,
  setQuery,
  setSessionFilter,
}: FilterBarProps) {
  return (
    <section className="control-bar" aria-label="Journal filters">
      <input placeholder="Search pair, strategy, emotion, notes..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)}>
        <option>All</option>
        <option>Asia</option>
        <option>London</option>
        <option>New York</option>
      </select>
      <div className="segmented">
        {(['All', 'Win', 'Loss', 'Break Even'] as OutcomeFilter[]).map((outcome) => (
          <button
            className={outcomeFilter === outcome ? 'is-active' : ''}
            key={outcome}
            type="button"
            onClick={() => setOutcomeFilter(outcome)}
          >
            {outcome}
          </button>
        ))}
      </div>
    </section>
  )
}
