import { ROLES, type Role } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { duties } from '../guide'
import { Icon } from '../icons'
import { ROLE_META } from '../roles'

export function RoleTabs({ active, onSelect }: { active: Role; onSelect(role: Role): void }) {
  const { state, can, holder, act } = useGame()
  const todo = duties(state)
  const m = state.mission
  return (
    <div role="tablist" aria-label={t('board.roles')} className="grid grid-cols-2 content-start gap-2 lg:sticky lg:top-3 lg:grid-cols-1 lg:self-start" data-tut="roles">
      {ROLES.map((role) => {
        const meta = ROLE_META[role]
        const selected = active === role
        const ready = role !== 'planner' && m?.ready[role]
        const free = state.mode === 'online' && !holder(role)
        return (
          <div key={role} className="flex flex-col gap-1">
          <button type="button" role="tab" aria-selected={selected} aria-label={t(`role.${role}`)}
            data-tut={`tab-${role}`} onClick={() => onSelect(role)}
            className={`relative flex items-center gap-2 rounded border px-3 py-2 text-start transition ${selected ? 'bg-carbon-80' : 'bg-black/40 hover:bg-carbon-80/60'}`}
            style={{ borderColor: selected ? meta.color : '#444447' }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: meta.color, color: meta.color }}>
              <Icon name={meta.icon} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-bold" style={{ color: meta.color }}>{t(`role.${role}`)}</span>
              <span className="mono block truncate text-xs text-carbon-30">
                {holder(role) ?? t('lobby.unclaimed')}{can(role) && state.mode === 'online' ? ` · ${t('lobby.you')}` : ''}
              </span>
              {todo[role] && <span className="block truncate text-xs text-intl-orange">{t(todo[role]!)}</span>}
            </span>
            {todo[role] && <span className="absolute end-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-intl-orange" aria-hidden="true" />}
            {ready && <Icon name="check" size={16} className="text-active-green" />}
          </button>
          {free && (
            <button type="button" onClick={() => act({ type: 'claimRole', role })}
              className="rounded border border-intl-orange px-2 py-1 text-xs font-bold text-intl-orange hover:bg-intl-orange/15">
              {t('board.take', { role: t(`role.${role}`) })}
            </button>
          )}
          </div>
        )
      })}
    </div>
  )
}
