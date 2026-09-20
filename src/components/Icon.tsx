type IconName = 'grid' | 'list' | 'plus'

export function Icon({ name }: { name: IconName }) {
  if (name === 'grid') return <span className="icon-shape grid-icon" aria-hidden="true" />
  if (name === 'plus') return <span className="icon-shape plus-icon" aria-hidden="true" />
  return <span className="icon-shape list-icon" aria-hidden="true" />
}
