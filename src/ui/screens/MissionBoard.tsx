import { lazy, Suspense, useEffect, useState } from 'react'
import { ROLES, type Role } from '../../engine/types'
import type { Phase } from '../../engine/state'
import { hasKey, t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { ActivityLog } from '../components/ActivityLog'
import { Button } from '../components/Button'
import { RequestInbox } from '../components/RequestInbox'
import { RoleTabs } from '../components/RoleTabs'
import { Telemetry } from '../components/Telemetry'
import { duties } from '../guide'
import { useHandbook } from '../handbook/Handbook'
import { money, objName } from '../names'
import { DesignerPanel } from '../panels/DesignerPanel'
import { PlannerPanel } from '../panels/PlannerPanel'
import { RadioPanel } from '../panels/RadioPanel'
import { ScientistPanel } from '../panels/ScientistPanel'
import { ROLE_META } from '../roles'
import { Scene3D } from '../three/Scene3D'
import { GoPollCard, IntegrationCard } from './StageCards'
import { withAutoSlots } from '../../engine/spend'

const Spacecraft3D = lazy(() => import('../three/Spacecraft3D'))

const STEPS: Phase[] = ['objective_proposal', 'planning', 'design', 'integration', 'go_poll', 'launch']
const stepOf = (p: Phase) => (p === 'objective_review' ? 0 : Math.max(0, STEPS.indexOf(p)))

const PANELS: Record<Role, () => JSX.Element | null> = {
  planner: PlannerPanel, scientist: ScientistPanel, designer: DesignerPanel, radio: RadioPanel,
}

export function ErrorToast() {
  const { lastError, clearError } = useGame()
  useEffect(() => {
    if (!lastError) return
    const id = setTimeout(clearError, 4000)
    return () => clearTimeout(id)
  }, [lastError, clearError])
  if (!lastError) return null
  const key = `err.${lastError}`
  return (
    <div role="alert" className="fixed bottom-4 start-1/2 z-40 -translate-x-1/2 rounded border border-nasa-red bg-carbon-90 px-4 py-2 text-sm text-white shadow-lg rtl:translate-x-1/2">
      {hasKey(key) ? t(key) : t('err.generic')}
    </div>
  )
}

export function MissionBoard({ onExit, extra }: { onExit(): void; extra?: React.ReactNode }) {
  const { state, can, act } = useGame()
  const handbook = useHandbook()
  const todo = duties(state)
  const mineWithDuty = ROLES.find((r) => todo[r] && can(r))
  const [active, setActive] = useState<Role>(mineWithDuty ?? ROLES.find((r) => can(r)) ?? 'planner')
  // Follow the action: when the phase changes, show a role that now has something to do here.
  useEffect(() => {
    if (mineWithDuty) setActive(mineWithDuty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])
  const m = state.mission
  const Panel = PANELS[active]
  const solo = state.mode === 'solo'
  const step = stepOf(state.phase)
  const design = m ? withAutoSlots(m.design, state.difficulty) : {}

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-3">
      <header className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <p className="label truncate">{state.campaign.teamName} · {t(`diff.${state.difficulty}`)}{m?.objectiveId ? ` · ${objName(m.objectiveId)}` : ''}</p>
          <h1 className="text-2xl font-black leading-tight">{t(`stage.${state.phase}`)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <div data-tut="funds">
            <p className="label">{t('board.funds')}</p>
            <p className="mono text-lg text-active-green" dir="ltr">{money(state.campaign.funds)}</p>
          </div>
          <div>
            <p className="label">{t('board.month')}</p>
            <p className="mono text-lg" dir="ltr">{state.campaign.month}</p>
          </div>
          <div>
            <p className="label">{t('board.mission')}</p>
            <p className="mono text-lg" dir="ltr">{state.campaign.launches + 1}/5</p>
          </div>
          <Button size="sm" variant="ghost" icon="book" onClick={() => handbook.open()}>{t('hb.title')}</Button>
          {extra}
          <Button size="sm" variant="ghost" icon="back" onClick={onExit}>{t('common.exit')}</Button>
        </div>
      </header>

      <ol className="grid grid-cols-6 gap-1" aria-label={t('board.progress')}>
        {STEPS.map((p, i) => (
          <li key={p} className={`rounded-sm px-1 py-1 text-center font-mono text-[0.62rem] uppercase tracking-wider sm:text-xs ${i < step ? 'bg-active-green/25 text-active-green' : i === step ? 'bg-nasa-red text-white' : 'bg-carbon-80 text-carbon-40'}`}>
            {t(`step.${p}`)}
          </li>
        ))}
      </ol>

      <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_310px]">
        <RoleTabs active={active} onSelect={setActive} />

        <main className="flex min-w-0 flex-col gap-3">
          {state.phase === 'integration' && <IntegrationCard />}
          {state.phase === 'go_poll' && <GoPollCard />}
          <section role="tabpanel" data-testid={`panel-${active}`} className="panel p-4" style={{ borderColor: ROLE_META[active].color }}>
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold" style={{ color: ROLE_META[active].color }}>{t(`role.${active}`)}</h2>
              {!can(active) && <span className="mono rounded border border-carbon-60 px-2 py-0.5 text-xs text-carbon-30">{t('board.viewOnly')}</span>}
            </header>
            <Panel />
          </section>
        </main>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:self-start lg:overflow-y-auto">
          {m && state.phase !== 'objective_proposal' && state.phase !== 'objective_review' && (
            <div className="panel overflow-hidden" data-tut="spacecraft">
              <div className="h-48 bg-black">
                <Scene3D fallback={<p className="mono p-3 text-xs text-carbon-40">{t('board.preview')}</p>}>
                  <Suspense fallback={null}><Spacecraft3D design={design} /></Suspense>
                </Scene3D>
              </div>
              <div className="p-3"><Telemetry /></div>
            </div>
          )}
          {solo && todo.planner === 'todo.launch' && (
            <Button variant="primary" size="lg" icon="rocket" onClick={() => act({ type: 'launch' }, 'planner')}>{t('board.launch')}</Button>
          )}
          <div className="panel flex flex-col gap-4 p-3">
            <RequestInbox />
            <ActivityLog />
          </div>
        </aside>
      </div>
      <ErrorToast />
    </div>
  )
}
