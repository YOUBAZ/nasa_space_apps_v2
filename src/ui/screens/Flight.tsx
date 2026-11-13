import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { flightPlan, type FlightPlan } from '../../engine/flight'
import type { Design, FaultCode, StationId, VehicleId } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { View3D } from '../components/View3D'
import { formatDelay, formatDistance, formatMissionTime } from '../flight/format'
import { useFlightTimeline, type Timeline } from '../flight/useFlightTimeline'
import { Icon } from '../icons'
import { orbName, vehName } from '../names'
import { sfx } from '../sound'
import type { AscentStory } from '../three/LaunchScene3D'

const LaunchScene3D = lazy(() => import('../three/LaunchScene3D'))
const JourneyScene3D = lazy(() => import('../three/JourneyScene3D'))

const REPLY_MS = 1200
const LIGHT_KM_S = 299_792.458
const ASCENT_STORIES: FaultCode[] = ['over_capacity', 'structure_overloaded', 'vehicle_cannot_reach']
const smooth = (x: number) => x * x * (3 - 2 * x)

type Tone = 'ok' | 'warn' | 'bad'
interface Beat { key: string; warn: FaultCode[] }
// What the Radio Operator asks once the spacecraft has arrived, and which lost-science problems colour each reply.
const BEATS: Beat[] = [
  { key: 'arrival', warn: ['no_capture_propulsion', 'short_lifetime'] },
  { key: 'power', warn: ['battery_short', 'thermal_failure', 'thin_power_margin'] },
  { key: 'instruments', warn: ['pointing_too_coarse', 'telescope_blinded', 'computer_overloaded', 'irrelevant_instruments'] },
  { key: 'downlink', warn: ['downlink_bottleneck', 'coverage_low', 'storage_overflow'] },
]
export interface Line { id: number; who: 'flight' | 'radio' | 'craft'; text: string; tone?: Tone }
const TONE: Record<Tone, string> = { ok: 'border-active-green text-active-green', warn: 'border-intl-orange text-intl-orange', bad: 'border-nasa-red text-nasa-red-tint' }

/** Where the spacecraft is right now, in real units, for the readouts over the view. */
export function telemetry(plan: FlightPlan, tl: Pick<Timeline, 'stage' | 'animStage' | 'p'>) {
  const travel = plan.travelDays * 86400
  if (tl.animStage === 'countdown') return { seconds: 0, km: 0, altitude: true, sun: 1 }
  if (tl.animStage === 'ascent') {
    const reach = plan.story === 'over_capacity' ? 0.3 : 100
    return { seconds: plan.ascentSeconds * tl.p, km: reach * tl.p * tl.p, altitude: true, sun: 1 }
  }
  if (tl.animStage === 'cruise') {
    const k = smooth(tl.p)
    return { seconds: plan.ascentSeconds + travel * tl.p, km: 100 + (plan.distanceKm - 100) * k, altitude: false, sun: 1 + (plan.sunAtDestination - 1) * k }
  }
  return { seconds: plan.ascentSeconds + travel, km: plan.distanceKm, altitude: false, sun: plan.sunAtDestination }
}

/** The 3D view with its readouts: the climb, then the cruise, then the arrival. Shared by the game and the gallery. */
export function FlightView({ plan, tl, design, vehicle, stations }:
  { plan: FlightPlan; tl: Timeline; design: Design; vehicle: VehicleId; stations: StationId[] }) {
  const onPad = tl.animStage === 'countdown' || tl.animStage === 'ascent'
  const tele = telemetry(plan, tl)
  const ascentStory: AscentStory = ASCENT_STORIES.includes(plan.story as FaultCode) ? (plan.story as AscentStory) : 'ok'
  const failed = tl.lost
  const sky = tl.animStage === 'countdown' ? 'linear-gradient(#0b3d91, #f6a66a)' : onPad ? `linear-gradient(#000, ${tl.p > 0.6 ? '#02040c' : '#0b1a3a'})` : '#000'
  return (
    <View3D testId="flight-view" className="min-h-[22rem] lg:min-h-0" background={sky}
      fallback={<div className="flex h-full min-h-[18rem] items-center justify-center"><Icon name="rocket" size={110} className={tl.stage === 'ascent' ? 'animate-bounce text-nasa-red' : 'text-carbon-10'} /></div>}
      overlay={(
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <div>
              <p className="label">{onPad ? vehName(vehicle) : orbName(design.orbit)}</p>
              <p className="mono text-lg text-white">{t(`hud.stage.${tl.stage}`)}</p>
            </div>
            {tl.stage === 'countdown' && (
              <p className="mono text-5xl font-medium tabular-nums text-white sm:text-7xl" dir="ltr" aria-live="polite">T-{String(tl.count).padStart(2, '0')}</p>
            )}
          </div>
          {tl.stage !== 'countdown' && (
            <dl className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-2 gap-x-4 gap-y-1 bg-gradient-to-t from-black/85 to-transparent p-4 pe-14 sm:grid-cols-4" dir="ltr">
              <div><dt className="label">{t('hud.time')}</dt><dd className="mono text-base text-white" data-testid="hud-time">{formatMissionTime(tele.seconds)}</dd></div>
              <div><dt className="label">{t(tele.altitude ? 'hud.altitude' : 'hud.distance')}</dt><dd className="mono text-base text-white" data-testid="hud-distance">{formatDistance(tele.km)}</dd></div>
              <div><dt className="label">{t('hud.delay')}</dt><dd className="mono text-base text-white" data-testid="hud-delay">{formatDelay(tele.km / LIGHT_KM_S)}</dd></div>
              <div><dt className="label">{t('hud.sun')}</dt><dd className="mono text-base text-white">{Math.round(tele.sun * 100)}%</dd></div>
            </dl>
          )}
          {failed && (
            <p className="pointer-events-none absolute start-4 top-[4.5rem] max-w-[70%] rounded bg-black/70 px-3 py-1.5 font-display text-lg font-black uppercase text-nasa-red-tint sm:text-xl" role="status">
              {t(`fault.${plan.story}.title`)}
            </p>
          )}
        </>
      )}>
      <Suspense fallback={null}>
        {onPad
          ? <LaunchScene3D vehicle={vehicle} startAt={tl.animStage === 'ascent' ? tl.animStart : null} duration={plan.anim.ascent} story={ascentStory} failAt={plan.failAt} />
          : <JourneyScene3D orbit={design.orbit} design={design} stations={stations} story={plan.story} storyStage={plan.stage} failAt={plan.failAt}
              shot={tl.animStage as 'cruise' | 'arrival'} startAt={tl.animStart} duration={plan.anim[tl.animStage as 'cruise' | 'arrival']} />}
      </Suspense>
    </View3D>
  )
}

/**
 * The whole flight on one page: the 3D view on one side, the Radio Operator's console on the other.
 * The rocket climbs to space, the Radio Operator makes contact and tracks the cruise, and the story
 * this design earned plays out where it would really happen.
 */
export function Flight() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const report = m.report!
  const design = m.finalDesign!
  const radio = can('radio')
  const inOps = state.phase === 'operations'
  const plan = useMemo(() => flightPlan(design, report), [design, report])
  const tl = useFlightTimeline(plan, { startInCruise: inOps })
  const failure = plan.story !== 'success' && plan.story !== 'partial'
  const has = (codes: FaultCode[]) => report.faults.some((f) => codes.includes(f.code))

  // once the Radio Operator has made contact (on any device), the cruise may begin here too
  useEffect(() => { if (inOps) tl.contact() }, [inOps]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- one running transcript
  const nextId = useRef(0)
  const said = useRef(new Set<string>())
  const [lines, setLines] = useState<Line[]>([])
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

  const tele = telemetry(plan, tl)
  useEffect(() => {
    const { stage, animStage, p, lost } = tl
    if (animStage === 'countdown') { say('flight', t('flight.call.count'), undefined, 'count'); return }
    say('flight', t('flight.call.count'), undefined, 'count')
    say('flight', t('flight.call.liftoff'), undefined, 'liftoff')
    const past = (s: 'ascent' | 'cruise' | 'arrival') => ['ascent', 'cruise', 'arrival'].indexOf(animStage) > ['ascent', 'cruise', 'arrival'].indexOf(s)
    const ascent = animStage === 'ascent' ? p : 1
    if (plan.story !== 'over_capacity' && (ascent >= 0.45 || past('ascent'))) say('flight', t('flight.call.staging'), undefined, 'staging')
    if (plan.stage !== 'ascent' && (ascent >= 0.7 || past('ascent'))) say('flight', t('flight.call.fairing'), undefined, 'fairing')
    if (stage === 'space' || past('ascent')) say('flight', t('flight.call.space'), 'ok', 'space')
    if (animStage === 'cruise' || past('cruise')) {
      say('radio', t('flight.call.tracking'), undefined, 'tracking')
      for (const pct of [25, 50, 75]) {
        const reached = past('cruise') || p * 100 >= pct
        const beforeFailure = plan.stage !== 'cruise' || pct / 100 < plan.failAt
        if (reached && beforeFailure) {
          const km = 100 + (plan.distanceKm - 100) * smooth(pct / 100)
          say('craft', t('flight.call.checkin', { pct, distance: formatDistance(km), delay: formatDelay(km / LIGHT_KM_S) }), 'ok', `checkin${pct}`)
        }
      }
    }
    if (animStage === 'arrival') say('flight', t('flight.call.approach'), undefined, 'approach')
    if (lost) {
      say('flight', t(`story.${plan.story}.line`), 'bad', 'story')
      if (!said.current.has('boom')) { said.current.add('boom'); sfx(plan.stage === 'ascent' ? 'boom' : 'static') }
    }
    if (stage === 'end' && !failure) {
      say('flight', t('flight.call.arrived', { time: formatMissionTime(tele.seconds) }), 'ok', 'arrived')
      say('flight', t(`story.${plan.story}.line`), plan.story === 'partial' ? 'warn' : 'ok', 'story')
    }
  }, [tl.stage, tl.animStage, tl.lost, Math.floor(tl.p * 20)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (tl.stage === 'countdown' && tl.count > 0) sfx('beep') }, [tl.stage, tl.count])
  useEffect(() => { if (tl.stage === 'ascent') sfx('rumble') }, [tl.stage])

  // ---- the conversation once it has arrived
  const [answered, setAnswered] = useState(0)
  const [pending, setPending] = useState(false)
  const arrived = inOps && tl.stage === 'end' && !failure
  const finished = arrived && answered >= BEATS.length
  const send = () => {
    if (pending || !arrived || answered >= BEATS.length) return
    say('radio', t(`ops.cmd.${BEATS[answered].key}`))
    setPending(true)
  }
  useEffect(() => {
    if (!pending) return
    const beat = BEATS[answered]
    const id = setTimeout(() => {
      const tone: Tone = has(beat.warn) ? 'warn' : 'ok'
      say('craft', t(`ops.${tone}.${beat.key}`), tone)
      sfx('static')
      setAnswered((n) => n + 1)
      setPending(false)
    }, REPLY_MS)
    return () => clearTimeout(id)
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps
  // other devices follow the same conversation automatically
  useEffect(() => {
    if (radio || !arrived || pending || answered >= BEATS.length) return
    const id = setTimeout(send, 1400)
    return () => clearTimeout(id)
  }, [radio, arrived, pending, answered]) // eslint-disable-line react-hooks/exhaustive-deps

  const playing = tl.stage === 'countdown' || tl.stage === 'ascent' || tl.stage === 'cruise' || tl.stage === 'arrival'
  const over = tl.stage === 'end' && failure
  const silent = over && plan.stage !== 'ascent'
  const bars = tl.animStage === 'countdown' || tl.animStage === 'ascent' ? 0 : silent ? 0 : Math.max(1, Math.round(Math.min(1, report.coverage * 2.5) * 5))
  const data = finished ? Math.min(report.downlink, report.dataGenerated) : 0
  const toDebrief = () => act({ type: 'advanceOps' }, 'radio')

  return (
    <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[1400px] gap-3 px-3 py-3 lg:grid-cols-[1.5fr_1fr]"
      data-testid="flight" data-stage={tl.stage} data-story={plan.story}>
      <FlightView plan={plan} tl={tl} design={design} vehicle={design.vehicle} stations={design.stations} />

      <section className="panel flex min-h-[24rem] flex-col gap-3 p-4" data-tut="console">
        <header>
          <h1 className="flex items-center gap-2 text-xl font-black"><Icon name="radio" />{t('ops.title')}</h1>
          <p className="text-sm text-carbon-30">{t(radio ? 'ops.youDrive' : 'ops.radioDrives')}</p>
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
            <p className="mono text-2xl text-white" dir="ltr">{data.toLocaleString('en-US', { maximumFractionDigits: 1 })} <span className="text-sm text-carbon-30">Gb/d</span></p>
          </div>
        </div>

        <ol role="log" aria-label={t('ops.title')} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded border border-carbon-70 bg-black/50 p-2.5">
          {lines.map((l) => (
            <li key={l.id} className={l.who === 'radio' ? 'self-end' : l.who === 'craft' ? 'self-start' : 'self-center text-center'}>
              {l.who === 'flight'
                ? <span className={`mono text-xs ${l.tone === 'bad' ? 'text-sm font-medium text-nasa-red-tint' : l.tone === 'ok' ? 'text-active-green' : l.tone === 'warn' ? 'text-intl-orange' : 'text-carbon-30'}`}>{l.text}</span>
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
          {playing && <Button variant="ghost" size="sm" onClick={tl.skip}>{t('launch.skip')}</Button>}
          {!inOps && tl.stage === 'ascent' && !radio && <span />}
          {!inOps && tl.stage !== 'space' && !over && radio && <p className="mono text-xs text-carbon-40">{t('flight.waitSpace')}</p>}
          {!radio && (tl.stage === 'space' || tl.stage === 'end') && <p className="mono text-sm text-carbon-30">{t('launch.waitRadio')}</p>}
          {radio && !inOps && tl.stage === 'space' && (
            <Button variant="primary" size="lg" icon="radio" onClick={toDebrief}>{t('launch.toOps')}</Button>
          )}
          {radio && arrived && !finished && (
            <Button icon="send" disabled={pending} onClick={send}>{pending ? t('ops.waiting') : t('ops.send')}</Button>
          )}
          {radio && (over || finished) && (
            <Button variant="primary" size="lg" icon="arrow" onClick={toDebrief}>{t('ops.toDebrief')}</Button>
          )}
        </div>
      </section>
    </div>
  )
}
