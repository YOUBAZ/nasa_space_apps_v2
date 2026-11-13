import { ROLES } from '../../engine/types'
import { spendOf } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { HoldButton } from '../components/HoldButton'
import { RoleBadge } from '../components/RoleBadge'
import { Icon } from '../icons'
import { money, orbName, vehName } from '../names'
import { ROLE_META } from '../roles'

/** Integration review: the rocket/orbit pairing lock and the purchase order. */
export function IntegrationCard() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const d = m.design
  const purchase = [...m.requests].reverse().find((r) => r.kind === 'purchase' && r.status !== 'closed')
  const total = Math.round(spendOf(state, 'designer') + spendOf(state, 'radio'))
  return (
    <section className="panel flex flex-col gap-4 border-nasa-blue-tint p-4" data-tut="integration">
      <p className="text-carbon-20">{t('integ.intro')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['designer', 'radio'] as const).map((role) => (
          <div key={role} className="flex flex-col gap-2 rounded border border-carbon-70 bg-black/40 p-3">
            <RoleBadge role={role} size="sm" />
            <p className="font-display text-lg font-bold">{role === 'designer' ? (d.vehicle ? vehName(d.vehicle) : '—') : (d.orbit ? orbName(d.orbit) : '—')}</p>
            <p className="label">{t(role === 'designer' ? 'integ.rocket' : 'integ.orbit')}</p>
            {m.pairing[role]
              ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="mono inline-flex items-center gap-1 text-sm text-active-green"><Icon name="lock" size={14} />{t('integ.agreed')}</span>
                  {can(role) && <Button size="sm" variant="ghost" onClick={() => act({ type: 'agreePairing', role, agree: false }, role)}>{t('integ.unagree')}</Button>}
                </div>
              )
              : can(role)
                ? <Button size="sm" variant="go" icon="check" onClick={() => act({ type: 'agreePairing', role, agree: true }, role)}>{t('integ.agree')}</Button>
                : <span className="mono text-xs text-carbon-40">{t('integ.waiting')}</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-carbon-70 bg-black/40 p-3">
        <div>
          <p className="label">{t('integ.purchase')}</p>
          <p className="mono text-xl" dir="ltr">{money(total)}</p>
        </div>
        {m.purchaseApproved
          ? <span className="mono inline-flex items-center gap-1 text-sm text-active-green"><Icon name="check" size={14} />{t('req.status.approved')}</span>
          : purchase?.status === 'pending' ? <span className="mono text-sm text-intl-orange">{t('req.waitingPlanner')}</span>
            : purchase?.status === 'rejected' ? <span className="mono text-sm text-nasa-red-tint">{t('integ.purchaseRejected')}</span>
              : <Button icon="send" disabled={!can('designer')} onClick={() => act({ type: 'submitPurchase' }, 'designer')}>{t('integ.submit')}</Button>}
      </div>
      <p className="mono text-xs text-carbon-40">{t('integ.editHint')}</p>
    </section>
  )
}

/** The Go / No-Go poll, then the big red button. */
export function GoPollCard() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const allGo = ROLES.every((r) => m.votes[r] === 'go')
  return (
    <section className="panel flex flex-col items-center gap-5 border-nasa-red p-5" data-tut="go-poll">
      <p className="max-w-xl text-center text-carbon-20">{t('poll.intro')}</p>
      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((role) => {
          const voted = m.votes[role] === 'go'
          return (
            <div key={role} className="flex flex-col items-center gap-2 rounded border bg-black/50 p-3"
              style={{ borderColor: voted ? '#47da84' : ROLE_META[role].color }}>
              <RoleBadge role={role} size="sm" />
              {voted
                ? <span className="mono text-2xl font-medium text-active-green">GO</span>
                : can(role)
                  ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="go" aria-label={t('poll.goAs', { role: t(`role.${role}`) })} onClick={() => act({ type: 'vote', role, vote: 'go' }, role)}>{t('poll.go')}</Button>
                      <Button size="sm" variant="danger" aria-label={t('poll.nogoAs', { role: t(`role.${role}`) })} onClick={() => act({ type: 'vote', role, vote: 'nogo' }, role)}>{t('poll.nogo')}</Button>
                    </div>
                  )
                  : <span className="mono animate-pulse text-sm text-carbon-40">…</span>}
            </div>
          )
        })}
      </div>
      {allGo && (can('planner')
        ? <HoldButton onDone={() => act({ type: 'launch' }, 'planner')}>{t('poll.hold')}</HoldButton>
        : <p className="mono text-sm text-carbon-30">{t('poll.waitPlanner')}</p>)}
    </section>
  )
}
