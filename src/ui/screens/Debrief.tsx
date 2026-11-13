import { explainFault } from '../../engine/explain'
import { badgesFor } from '../../engine/gamify'
import { ROLES, type Fault, type Role } from '../../engine/types'
import { unlockName } from '../../engine/scoring'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { OutcomeScene } from '../cinematics/OutcomeScene'
import { Button } from '../components/Button'
import { RoleBadge } from '../components/RoleBadge'
import { Icon } from '../icons'
import { money } from '../names'
import { ROLE_META } from '../roles'

const SEV: Record<Fault['severity'], string> = { critical: 'border-nasa-red', major: 'border-intl-orange', minor: 'border-carbon-60' }
const SEV_TEXT: Record<Fault['severity'], string> = { critical: 'text-nasa-red-tint', major: 'text-intl-orange', minor: 'text-carbon-30' }

function FaultCard({ fault }: { fault: Fault }) {
  const { state } = useGame()
  const m = state.mission!
  const e = explainFault(fault, m.report!, m.finalDesign!, m.objectiveId!, {
    readyMonth: m.readyMonth ?? 0, targetMonth: m.targetMonth, waitMonths: m.waitMonths ?? 0, waitCost: m.waitCost ?? 0,
  })
  return (
    <li className={`rounded border-s-4 bg-black/40 p-3 ${SEV[fault.severity]}`} data-testid={`fault-${fault.code}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{t(e.titleKey, e.vars)}</h3>
        <span className={`mono text-xs uppercase ${SEV_TEXT[fault.severity]}`}>{t(`sev.${fault.severity}`)}</span>
      </div>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-[7rem_1fr]">
        <dt className="label">{t('debrief.what')}</dt><dd>{t(e.whatKey, e.vars)}</dd>
        <dt className="label">{t('debrief.why')}</dt><dd>{t(e.whyKey, e.vars)}</dd>
        <dt className="label">{t('debrief.who')}</dt>
        <dd className="flex flex-wrap gap-3">{fault.roles.map((r) => <RoleBadge key={r} role={r} size="sm" />)}</dd>
        <dt className="label">{t('debrief.fix')}</dt><dd>{t(e.fixKey, e.vars)}</dd>
      </dl>
      <a href={e.learnUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-nasa-blue-tint underline">
        <Icon name="arrow" size={12} />{t('common.learnMore')}
      </a>
    </li>
  )
}

function ScoreBar({ role, score, name }: { role: Role; score: number; name?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2"><RoleBadge role={role} size="sm" /><span className="mono text-xs text-carbon-40">{name}</span></span>
        <span className="mono text-xl" dir="ltr" data-testid={`score-${role}`}>{score}<span className="text-xs text-carbon-40">%</span></span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded bg-carbon-80">
        <div className="h-full rounded transition-all duration-1000" style={{ width: `${score}%`, background: ROLE_META[role].color }} />
      </div>
    </div>
  )
}

/** The Radio Operator's transmission: what happened, why, whose call it was, and how to fix it. */
export function Debrief() {
  const { state, act, holder } = useGame()
  const m = state.mission!
  const r = m.result!
  const order = { critical: 0, major: 1, minor: 2 }
  const faults = [...r.faults].sort((a, b) => order[a.severity] - order[b.severity])
  const badges = badgesFor(state.campaign.history, r, m.finalDesign!)
  const net = r.grant - r.cost
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4">
      <OutcomeScene outcome={r.outcome} faults={r.faults} />

      <section className="panel p-4" data-tut="transmission">
        <header className="mb-3 flex items-center gap-2">
          <Icon name="radio" className="text-white" />
          <div>
            <h2 className="text-xl font-bold">{t('debrief.transmission')}</h2>
            <p className="mono text-xs text-carbon-40">{t('debrief.from', { name: holder('radio') ?? t('role.radio') })}</p>
          </div>
        </header>
        {faults.length === 0
          ? <p className="text-active-green">{t('debrief.clean')}</p>
          : <ul className="flex flex-col gap-3">{faults.map((f) => <FaultCard key={f.code} fault={f} />)}</ul>}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel flex flex-col gap-3 p-4" data-tut="scores">
          <h2 className="label">{t('debrief.scores')}</h2>
          {ROLES.map((role) => <ScoreBar key={role} role={role} score={r.roleScores[role]} name={holder(role)} />)}
          <div className="flex items-baseline justify-between border-t border-carbon-70 pt-2">
            <span className="label">{t('debrief.team')}</span>
            <span className="mono text-2xl text-active-green" dir="ltr">+{r.teamPoints}</span>
          </div>
        </section>

        <section className="panel flex flex-col gap-3 p-4">
          <h2 className="label">{t('debrief.money')}</h2>
          <dl className="mono grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-carbon-30">{t('debrief.cost')}</dt><dd className="text-end text-nasa-red-tint" dir="ltr">−{money(r.cost)}</dd>
            <dt className="text-carbon-30">{t('debrief.grant')}</dt><dd className="text-end text-active-green" dir="ltr">+{money(r.grant)}</dd>
            <dt className="border-t border-carbon-70 pt-1 text-carbon-10">{t('debrief.net')}</dt>
            <dd className={`border-t border-carbon-70 pt-1 text-end ${net >= 0 ? 'text-active-green' : 'text-nasa-red-tint'}`} dir="ltr">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</dd>
            <dt className="text-carbon-30">{t('debrief.science')}</dt><dd className="text-end" dir="ltr">{Math.round(r.science * 100)}%</dd>
          </dl>
          <h2 className="label mt-2">{t('debrief.awards')}</h2>
          {r.awards.length === 0 && badges.length === 0 && <p className="mono text-xs text-carbon-40">{t('debrief.noAwards')}</p>}
          <ul className="flex flex-wrap gap-2">
            {r.awards.map((a, i) => (
              <li key={i} className="inline-flex items-center gap-1.5 rounded-full border border-intl-orange px-3 py-1 text-sm text-intl-orange">
                <Icon name={a.id === 'new_gear' ? 'lock' : 'trophy'} size={14} />
                {t(`award.${a.id}`)}{a.role ? ` · ${t(`role.${a.role}`)}` : ''}{a.unlock ? `: ${unlockName(a.unlock)}` : ''}
              </li>
            ))}
            {badges.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full border border-nasa-blue-tint px-3 py-1 text-sm text-nasa-blue-tint">
                <Icon name="star" size={14} />{t(`badge.${b}`)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" icon="arrow" onClick={() => act({ type: 'finishDebrief' })}>{t('debrief.close')}</Button>
      </div>
    </div>
  )
}
