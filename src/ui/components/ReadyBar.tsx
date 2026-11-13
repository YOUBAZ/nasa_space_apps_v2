import { useState } from 'react'
import { readyBlocker } from '../../engine/phases/design'
import type { ReadyRole } from '../../engine/state'
import { spendOf } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from './Button'
import { FundsDialog } from './FundsDialog'
import { money } from '../names'

/** Bottom of each design panel: money left, ask for more, and the "I'm ready" switch. */
export function ReadyBar({ role }: { role: ReadyRole }) {
  const { state, act, can } = useGame()
  const [asking, setAsking] = useState(false)
  const m = state.mission!
  if (state.phase !== 'design') return null
  const solo = state.mode === 'solo'
  const blocker = readyBlocker(state, role)
  const ready = m.ready[role]
  const budgetRole = role === 'scientist' ? null : role
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-carbon-70 pt-3" data-tut={`ready-${role}`}>
      {budgetRole && !solo ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono text-sm text-carbon-20" dir="ltr">
            {money(spendOf(state, budgetRole))} / {money(m.budget[budgetRole])}
          </span>
          <Button size="sm" variant="ghost" icon="coin" disabled={!can(role)} onClick={() => setAsking(true)}>{t('funds.request')}</Button>
        </div>
      ) : <span />}
      {!solo && (
        <div className="flex items-center gap-3">
          {blocker && !ready && <span className="text-sm text-intl-orange">{t(`ready.${blocker}`)}</span>}
          {ready
            ? <Button variant="ghost" icon="check" disabled={!can(role)} onClick={() => act({ type: 'setReady', role, ready: false }, role)}>{t('ready.undo')}</Button>
            : <Button variant="go" icon="check" disabled={!can(role) || !!blocker} onClick={() => act({ type: 'setReady', role, ready: true }, role)}>{t('ready.go')}</Button>}
        </div>
      )}
      {asking && budgetRole && <FundsDialog from={budgetRole} amount={10} onClose={() => setAsking(false)} />}
    </div>
  )
}
