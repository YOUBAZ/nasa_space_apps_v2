import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FaultCode } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { View3D } from '../components/View3D'
import { Icon } from '../icons'
import { num, orbName, vehName } from '../names'
import { sfx } from '../sound'

const LaunchScene3D = lazy(() => import('../three/LaunchScene3D'))
const OrbitView3D = lazy(() => import('../three/OrbitView3D'))

const LOST: FaultCode[] = ['over_capacity', 'vehicle_cannot_reach', 'structure_overloaded']
const NO_LINK: FaultCode[] = ['no_link', 'no_station_in_view']
const COUNT_FROM = 10
const TICK_MS = 550
const REPLY_MS = 1200

type Tone = 'ok' | 'warn' | 'bad'
interface Beat { key: string; bad: FaultCode[]; warn: FaultCode[] }
const BEATS: Beat[] = [
  { key: 'arrival', bad: ['no_capture_propulsion', 'no_landing_kit', 'wrong_destination'], warn: [] },
  { key: 'power', bad: ['power_deficit', 'radiation_fried'], warn: ['battery_short', 'thermal_failure', 'thin_power_margin'] },
  { key: 'instruments', bad: ['tumbling'], warn: ['pointing_too_coarse', 'telescope_blinded', 'computer_overloaded', 'irrelevant_instruments'] },
  { key: 'downlink', bad: NO_LINK, warn: ['downlink_bottleneck', 'coverage_low', 'storage_overflow'] },
]
interface Line { id: number; who: 'flight' | 'radio' | 'craft'; text: string; tone?: Tone }
const TONE: Record<Tone, string> = { ok: 'border-active-green text-active-green', warn: 'border-intl-orange text-intl-orange', bad: 'border-nasa-red text-nasa-red-tint' }

/**
 * Launch and operations on one page: the 3D view on one side, the Radio Operator's console on the other.
 * The console keeps one running transcript, from the countdown calls to every command and reply.
 */
export function Flight() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const report = m.report!
  const design = m.finalDesign!
  const radio = can('radio')
  const inOps = state.phase === 'operations'
  const has = (codes: FaultCode[]) => report.faults.some((f) => codes.includes(f.code))
  const lost = has(LOST)
  const linkDead = has(NO_LINK)

  // --- launch timeline (local to each device; arriving mid-operations skips straight past it)
  const [count, setCount] = useState(inOps ? 0 : COUNT_FROM)
  const [ascentDone, setAscentDone] = useState(inOps)
  const [elapsed, setElapsed] = useState(0)
  const started = count <= 0

  // --- transcript
  const nextId = useRef(0)
  const [lines, setLines] = useState<Line[]>([])
  const said = useRef(new Set<string>())
  const say = (who: Line['who'], text: string, tone?: Tone, once?: string) => {
    if (once) {
      if (said.current.has(once)) return
      said.current.add(once)
    }
    nextId.current += 1
    const id = nextId.current
    setLines((ls) => [...ls, { id, who, text, tone }])
  }
  const end = useRef<HTMLLIElement>(null)
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [lines.length])

  useEffect(() => { say('flight', t(inOps ? 'flight.call.meco' : 'flight.call.count'), undefined, inOps ? 'meco' : 'count') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (count <= 0) return
    sfx('beep')
    const id = setTimeout(() => setCount((c) => c - 1), TICK_MS)
    return () => clearTimeout(id)
  }, [count])

  useEffect(() => {
    if (!started || ascentDone) return
    say('flight', t('flight.call.liftoff'), undefined, 'liftoff')
    sfx('rumble')
    const timers = [
      setTimeout(() => setAscentDone(true), lost ? 5000 : 7000),
      lost ? setTimeout(() => sfx('boom'), 2600) : setTimeout(() => say('flight', t('flight.call.staging'), undefined, 'staging'), 3400),
    ]
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { timers.forEach(clearTimeout); clearInterval(clock) }
  }, [started, ascentDone]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ascentDone) return
    say('flight', t('flight.call.liftoff'), undefined, 'liftoff')
    if (lost) say('flight', t('flight.call.lost'), 'bad', 'lost')
    else say('flight', t('flight.call.meco'), 'ok', 'meco')
  }, [ascentDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- conversation with the spacecraft
  const [answered, setAnswered] = useState(0)
  const [pending, setPending] = useState(false)
  const toneOf = (b: Beat): Tone => (has(b.bad) ? 'bad' : has(b.warn) ? 'warn' : 'ok')
  // With no radio link the first command already goes unanswered; otherwise the first hard failure ends the talk.
  const firstBad = linkDead ? 0 : BEATS.findIndex((b) => has(b.bad))
  const total = firstBad === -1 ? BEATS.length : firstBad + 1
  const finished = inOps && answered >= total

  const send = () => {
    if (pending || answered >= total) return
    const beat = BEATS[answered]
    say('radio', t(`ops.cmd.${beat.key}`))
    setPending(true)
  }
  useEffect(() => {
    if (!pending) return
    const beat = BEATS[answered]
    const id = setTimeout(() => {
      if (linkDead) say('craft', t('ops.bad.downlink'), 'bad')
      else { const tone = toneOf(beat); say('craft', t(`ops.${tone}.${beat.key}`), tone) }
      sfx('static')
      setAnswered((n) => n + 1)
      setPending(false)
    }, REPLY_MS)
    return () => clearTimeout(id)
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  // Other devices follow the same conversation automatically.
  useEffect(() => {
    if (radio || !inOps || pending || answered >= total) return
    const id = setTimeout(send, 1400)
    return () => clearTimeout(id)
  }, [radio, inOps, pending, answered, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const silent = finished && (linkDead || (firstBad !== -1 && firstBad < BEATS.length - 1))
  const bars = !inOps || answered === 0 ? 0 : silent ? 0 : Math.max(1, Math.round(Math.min(1, report.coverage * 2.5) * 5))
  const data = inOps && answered >= BEATS.length && !linkDead ? Math.min(report.downlink, report.dataGenerated) : 0
  const status = !started ? t('launch.count') : !ascentDone ? t('launch.ascent') : lost ? t('launch.lost') : t('launch.orbit')
  const skip = () => { setCount(0); setAscentDone(true) }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[1400px] gap-3 px-3 py-3 lg:grid-cols-[1.5fr_1fr]" data-testid="flight">
      {/* ---- the view: launch, then the destination */}
      <View3D testId="flight-view" className="min-h-[22rem] lg:min-h-0"
        background={inOps ? '#000' : started ? 'linear-gradient(#000, #0b1a3a)' : 'linear-gradient(#0b3d91, #f6a66a)'}
        fallback={<div className="flex h-full min-h-[18rem] items-center justify-center"><Icon name="rocket" size={110} className={started && !ascentDone ? 'animate-bounce text-nasa-red' : 'text-carbon-10'} /></div>}
        overlay={(
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
              <div>
                <p className="label">{inOps ? orbName(design.orbit) : vehName(design.vehicle)}</p>
                <p className="mono text-lg text-white">{inOps ? t('ops.onStation') : status}</p>
              </div>
              {!inOps && (
                <p className={`mono text-5xl font-medium tabular-nums sm:text-7xl ${started ? 'text-active-green' : 'text-white'}`} dir="ltr" aria-live="polite">
                  {started ? `T+${String(elapsed).padStart(2, '0')}` : `T-${String(count).padStart(2, '0')}`}
                </p>
              )}
            </div>
            {!inOps && ascentDone && lost && (
              <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-display text-4xl font-black uppercase text-nasa-red">{t('launch.lostBig')}</p>
            )}
          </>
        )}>
        <Suspense fallback={null}>
          {inOps
            ? <OrbitView3D orbit={design.orbit} stations={design.stations} design={design} />
            : <LaunchScene3D vehicle={design.vehicle} started={started} fail={lost} />}
        </Suspense>
      </View3D>

      {/* ---- the Radio Operator's console */}
      <section className="panel flex min-h-[24rem] flex-col gap-3 p-4" data-tut="console">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black"><Icon name="radio" />{t('ops.title')}</h1>
            <p className="text-sm text-carbon-30">{t(radio ? 'ops.youDrive' : 'ops.radioDrives')}</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-carbon-70 bg-black/40 p-2.5">
            <p className="label">{t('ops.signal')}</p>
            <div className="mt-1 flex h-7 items-end gap-1" role="img" aria-label={`${bars}/5`} dir="ltr">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`w-2.5 rounded-sm transition-all ${i <= bars ? 'bg-active-green' : 'bg-carbon-70'}`} style={{ height: `${i * 20}%` }} />
              ))}
              {silent && <span className="mono ms-2 text-sm text-nasa-red-tint">{t('ops.noSignal')}</span>}
            </div>
          </div>
          <div className="rounded border border-carbon-70 bg-black/40 p-2.5">
            <p className="label">{t('ops.data')}</p>
            <p className="mono text-2xl text-white" dir="ltr">{num(data, 1)} <span className="text-sm text-carbon-30">Gb/d</span></p>
          </div>
        </div>

        <ol role="log" aria-label={t('ops.title')} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded border border-carbon-70 bg-black/50 p-2.5">
          {lines.map((l) => (
            <li key={l.id} className={l.who === 'radio' ? 'self-end' : l.who === 'craft' ? 'self-start' : 'self-center'}>
              {l.who === 'flight'
                ? <span className={`mono text-xs ${l.tone === 'bad' ? 'text-nasa-red-tint' : l.tone === 'ok' ? 'text-active-green' : 'text-carbon-30'}`}>{l.text}</span>
                : (
                  <span className={`block max-w-[22rem] rounded border px-2.5 py-1.5 text-sm ${l.who === 'radio' ? 'border-nasa-blue-tint bg-nasa-blue-shade/50 text-white' : `bg-black/60 ${TONE[l.tone ?? 'ok']}`}`}>
                    <span className="mono block text-[0.65rem] uppercase opacity-80">
                      {l.who === 'radio' ? `▶ ${t('role.radio')}` : `◀ ${t('ops.who.craft')}`}
                    </span>
                    <span>{l.text}</span>
                  </span>
                )}
            </li>
          ))}
          <li ref={end} aria-hidden="true" />
        </ol>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!inOps && !ascentDone && <Button variant="ghost" size="sm" onClick={skip}>{t('launch.skip')}</Button>}
          {!radio && (ascentDone || inOps) && <p className="mono text-sm text-carbon-30">{t('launch.waitRadio')}</p>}
          {radio && !inOps && ascentDone && (
            <Button variant="primary" size="lg" icon={lost ? 'arrow' : 'radio'} onClick={() => act({ type: 'advanceOps' }, 'radio')}>
              {lost ? t('launch.toDebrief') : t('launch.toOps')}
            </Button>
          )}
          {radio && inOps && !finished && (
            <Button icon="send" disabled={pending} onClick={send}>{pending ? t('ops.waiting') : t('ops.send')}</Button>
          )}
          {radio && finished && (
            <Button variant="primary" size="lg" icon="arrow" onClick={() => act({ type: 'advanceOps' }, 'radio')}>{t('ops.toDebrief')}</Button>
          )}
        </div>
      </section>
    </div>
  )
}
