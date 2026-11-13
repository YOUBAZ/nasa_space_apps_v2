import { lazy, Suspense, useEffect, useState } from 'react'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { Icon } from '../icons'
import { vehName } from '../names'
import { Scene3D } from '../three/Scene3D'
import { sfx } from '../sound'

const LaunchScene3D = lazy(() => import('../three/LaunchScene3D'))
const LOST = ['over_capacity', 'vehicle_cannot_reach', 'structure_overloaded']
const COUNT_FROM = 10
const TICK_MS = 550

export function Launch() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const vehicle = m.finalDesign!.vehicle
  const fail = m.report!.faults.some((f) => LOST.includes(f.code))
  const [count, setCount] = useState(COUNT_FROM)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const started = count <= 0

  useEffect(() => {
    if (count <= 0) return
    sfx('beep')
    const id = setTimeout(() => setCount((c) => c - 1), TICK_MS)
    return () => clearTimeout(id)
  }, [count])
  useEffect(() => {
    if (!started || done) return
    sfx('rumble')
    const blast = fail ? setTimeout(() => sfx('boom'), 2600) : undefined
    const id = setTimeout(() => setDone(true), fail ? 5000 : 7000)
    return () => { clearTimeout(id); if (blast) clearTimeout(blast) }
  }, [started, done, fail])

  useEffect(() => {
    if (!started || done) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [started, done])

  const status = !started ? t('launch.count') : !done ? t('launch.ascent') : fail ? t('launch.lost') : t('launch.orbit')
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col px-3 py-3">
      <div className="relative flex-1 overflow-hidden rounded border border-carbon-70 transition-colors duration-[4000ms]"
        style={{ background: started ? 'linear-gradient(#000, #0b1a3a)' : 'linear-gradient(#0b3d91, #f6a66a)', minHeight: 420 }}>
        <div className="absolute inset-0">
          <Scene3D fallback={<div className="flex h-full items-center justify-center"><Icon name="rocket" size={120} className={started && !done ? 'animate-bounce text-nasa-red' : 'text-carbon-10'} /></div>}>
            <Suspense fallback={null}><LaunchScene3D vehicle={vehicle} started={started} fail={fail} /></Suspense>
          </Scene3D>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div>
            <p className="label">{vehName(vehicle)}</p>
            <p className="mono text-lg text-white">{status}</p>
          </div>
          <p className={`mono text-6xl font-medium tabular-nums sm:text-8xl ${started ? 'text-active-green' : 'text-white'}`} dir="ltr" aria-live="polite">
            {started ? `T+${String(elapsed).padStart(2, '0')}` : `T-${String(count).padStart(2, '0')}`}
          </p>
        </div>
        {done && fail && <p className="absolute inset-x-0 top-1/3 text-center font-display text-4xl font-black uppercase text-nasa-red">{t('launch.lostBig')}</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {!done
          ? <Button variant="ghost" size="sm" onClick={() => { setCount(0); setDone(true) }}>{t('launch.skip')}</Button>
          : <span />}
        {done && (can('radio')
          ? <Button variant="primary" size="lg" icon="radio" onClick={() => act({ type: 'advanceOps' }, 'radio')}>{fail ? t('launch.toDebrief') : t('launch.toOps')}</Button>
          : <p className="mono text-sm text-carbon-30">{t('launch.waitRadio')}</p>)}
      </div>
    </div>
  )
}
