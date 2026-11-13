import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { t } from '../../i18n/i18n'
import { GameProvider } from '../../net/useGame'
import { createTutorialSession, type TutorialSession } from '../../tutorial/session'
import { currentStep } from '../../tutorial/runner'
import { TUTORIAL } from '../../tutorial/script'
import { Button } from '../components/Button'
import { RoleBadge } from '../components/RoleBadge'
import { Elon } from '../elon/Elon'
import { GameScreens } from '../GameScreens'
import { HandbookProvider } from '../handbook/Handbook'

/** A pulsing frame around the thing the coach is talking about. */
function Spotlight({ name, stepId }: { name?: string; stepId: string }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!name) { setBox(null); return }
    const find = () => document.querySelector<HTMLElement>(`[data-tut="${name}"], [data-testid="${name}"]`)
    find()?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    const measure = () => {
      const r = find()?.getBoundingClientRect()
      setBox(r && r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null)
    }
    measure()
    const id = setInterval(measure, 250)
    return () => clearInterval(id)
  }, [name, stepId])
  if (!box) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed z-40 animate-pulse rounded-md border-2 border-intl-orange shadow-[0_0_0_4px_#ea6f2440]"
      style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} />
  )
}

function Coach({ session, onExit }: { session: TutorialSession; onExit(): void }) {
  const tut = useSyncExternalStore(session.subscribeTut, session.getTut)
  const step = currentStep(tut)
  const line = tut.lines[tut.lines.length - 1]
  const last = TUTORIAL[TUTORIAL.length - 1]
  const shown = step ?? last
  return (
    <>
      {step && <Spotlight name={step.spotlight} stepId={step.id} />}
      <aside data-testid="coach" aria-live="polite"
        className="fixed bottom-3 left-1/2 z-40 flex w-[30rem] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-end gap-2">
        <div className="shrink-0 drop-shadow-[0_4px_12px_#000]"><Elon pose={tut.done ? 'celebrate' : shown.pose} size={104} /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {line && !tut.done && (
            <div className="self-start rounded-lg rounded-es-none border border-carbon-60 bg-carbon-80 px-3 py-2 text-sm shadow-lg">
              <span className="mb-0.5 flex items-center gap-1.5 text-xs text-carbon-30">
                <RoleBadge role={line.role} size="sm" label={false} />{t('tut.teammate', { role: t(`role.${line.role}`) })}
              </span>
              <span>{t(line.key)}</span>
            </div>
          )}
          <div className="rounded-lg rounded-es-none border-2 border-intl-orange bg-carbon-90 p-3 shadow-2xl">
            <p className="label mb-1 flex items-center justify-between gap-2">
              <span className="text-intl-orange">{t('tut.coach')}</span>
              <span>{t('tut.step', { n: Math.min(tut.index + 1, TUTORIAL.length), total: TUTORIAL.length })}</span>
            </p>
            <p className="text-sm leading-snug text-white">{t(shown.coachKey)}</p>
            {tut.hint && <p className="mt-2 rounded bg-intl-orange/15 px-2 py-1 text-sm text-intl-orange" role="status">{t(tut.hint)}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <button type="button" onClick={onExit} className="text-xs text-carbon-40 underline hover:text-carbon-10">{t('tut.skip')}</button>
              {tut.done
                ? <Button size="sm" variant="primary" icon="check" onClick={onExit}>{t('tut.finish')}</Button>
                : step?.next && <Button size="sm" variant="action" icon="arrow" onClick={() => session.next()}>{t('tut.next')}</Button>}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

/** The training mission: the normal game screens with Coach Elon and scripted teammates on top. */
export function TutorialGame({ onExit }: { onExit(): void }) {
  const session = useMemo(() => createTutorialSession(), [])
  const tut = useSyncExternalStore(session.subscribeTut, session.getTut)
  const step = currentStep(tut)
  useEffect(() => () => session.transport.dispose(), [session])
  return (
    <GameProvider transport={session.transport}>
      <HandbookProvider>
        <div className="pb-64">
          <GameScreens onExit={onExit} focusRole={step?.tab} focusKey={step?.id} />
        </div>
        <Coach session={session} onExit={onExit} />
      </HandbookProvider>
    </GameProvider>
  )
}
