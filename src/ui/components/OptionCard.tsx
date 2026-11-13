import type { ReactNode } from 'react'
import { InfoTip } from '../handbook/Handbook'
import { Icon, type IconName } from '../icons'

export interface Chip { icon?: IconName; text: string; tone?: 'plain' | 'accent' }

export function Chips({ chips }: { chips: Chip[] }) {
  return (
    <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
      {chips.map((c, i) => (
        <span key={i} className={`mono inline-flex items-center gap-1 text-[0.7rem] ${c.tone === 'accent' ? 'text-nasa-blue-tint' : 'text-carbon-30'}`}>
          {c.icon && <Icon name={c.icon} size={11} />}<span dir="ltr">{c.text}</span>
        </span>
      ))}
    </span>
  )
}

export interface OptionCardProps {
  name: string
  entryId: string
  chips: Chip[]
  selected: boolean
  disabled?: boolean
  onPick(): void
  badge?: ReactNode
  footer?: ReactNode
  color?: string
}

/** One selectable thing (a part, rocket, orbit, instrument, station) with its raw stats. */
export function OptionCard({ name, entryId, chips, selected, disabled, onPick, badge, footer, color = '#288bff' }: OptionCardProps) {
  return (
    <div className={`relative flex flex-col rounded border transition ${selected ? 'bg-carbon-80' : 'bg-black/40'}`}
      style={{ borderColor: selected ? color : '#444447', boxShadow: selected ? `0 0 0 1px ${color}` : undefined }}>
      <button type="button" aria-label={name} aria-pressed={selected} disabled={disabled} onClick={onPick}
        className="flex flex-1 flex-col px-3 py-2 pe-9 text-start enabled:hover:bg-carbon-80/70 disabled:cursor-not-allowed disabled:opacity-55">
        <span className="font-display text-sm font-bold text-white">{name}</span>
        <Chips chips={chips} />
        {badge}
      </button>
      <span className="absolute end-1.5 top-1.5"><InfoTip entryId={entryId} /></span>
      {footer && <div className="border-t border-carbon-70 px-3 py-1.5">{footer}</div>}
    </div>
  )
}
