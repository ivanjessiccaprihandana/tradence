import { Icon } from './Icon'

type NavButtonProps = {
  active: boolean
  icon: 'grid' | 'list' | 'plus'
  label: string
  onClick: () => void
}

export function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  )
}
