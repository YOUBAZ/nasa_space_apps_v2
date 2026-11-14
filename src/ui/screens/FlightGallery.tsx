import { useEffect, useMemo, useState } from 'react'
import { evaluateDesign } from '../../engine/evaluate'
import { flightPlan, STORY_ORDER, type Story } from '../../engine/flight'
import type { Design, Fault, OrbitId, VehicleId } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { Button } from '../components/Button'
import { formatMissionTime } from '../flight/format'
import { useFlightTimeline } from '../flight/useFlightTimeline'
import { orbName } from '../names'
import { FlightView, telemetry } from './Flight'
import { Elon } from '../elon/Elon'
import { ELON_POSES } from '../elon/poses'

const BASE: Design = {
  structure: 'medium', power: 'deploy_solar', battery: 'medium', computer: 'radhard', attitude: 'wheels_star', thermal: 'heaters',
  propulsion: 'chemical', storage: 'medium', protection: 'none', antenna: 'hga', band: 'x',
  orbit: 'sso', vehicle: 'falcon9', instruments: ['hires_cam', 'thermal_ir'], stations: ['svalbard', 'kiruna', 'goldstone'],
}
// Where each story is best seen.
const WHERE: Record<Story, { orbit: OrbitId; vehicle: VehicleId; change?: Partial<Design> }> = {
  success: { orbit: 'mars_orbit', vehicle: 'falcon_hvy' },
  partial: { orbit: 'sso', vehicle: 'falcon9' },
  over_capacity: { orbit: 'sso', vehicle: 'electron' },
  structure_overloaded: { orbit: 'sso', vehicle: 'falcon9' },
  vehicle_cannot_reach: { orbit: 'lunar', vehicle: 'pslv' },
  no_station_in_view: { orbit: 'mars_orbit', vehicle: 'falcon_hvy' },
  tumbling: { orbit: 'mars_orbit', vehicle: 'falcon_hvy', change: { attitude: 'magnetorquer' } },
  power_deficit: { orbit: 'jupiter', vehicle: 'falcon_hvy' },
  no_link: { orbit: 'mars_orbit', vehicle: 'falcon_hvy', change: { antenna: 'medium' } },
  no_capture_propulsion: { orbit: 'mars_orbit', vehicle: 'falcon_hvy', change: { propulsion: 'none' } },
  no_landing_kit: { orbit: 'mars_surf', vehicle: 'falcon_hvy' },
  radiation_fried: { orbit: 'jupiter', vehicle: 'falcon_hvy', change: { power: 'rtg' } },
  battery_short: { orbit: 'mars_surf', vehicle: 'falcon_hvy', change: { protection: 'mars_edl' } },
  wrong_destination: { orbit: 'lunar', vehicle: 'falcon_hvy' },
} as Record<Story, { orbit: OrbitId; vehicle: VehicleId; change?: Partial<Design> }>

const STORIES: Story[] = ['success', 'partial', ...STORY_ORDER.map((s) => s.code)]

function Player({ story, orbit }: { story: Story; orbit: OrbitId }) {
  const w = WHERE[story]
  const design = useMemo<Design>(() => ({ ...BASE, ...w.change, orbit, vehicle: w.vehicle }), [w, orbit])
  const plan = useMemo(() => {
    const report = evaluateDesign(design, 'wildfire', 'expert')
    const faults: Fault[] = story === 'success' ? []
      : story === 'partial' ? [{ severity: 'major', code: 'coverage_low', roles: ['radio'] }]
        : [{ severity: 'critical', code: story, roles: ['designer'] }]
    return flightPlan(design, { ...report, faults })
  }, [design, story])
  const tl = useFlightTimeline(plan, { countFrom: 2 })
  // nobody is playing the Radio Operator here: make contact as soon as the craft is in space
  useEffect(() => { if (tl.stage === 'space') { const id = setTimeout(tl.contact, 900); return () => clearTimeout(id) } }, [tl.stage]) // eslint-disable-line react-hooks/exhaustive-deps
  const tele = telemetry(plan, tl)
  const failed = story !== 'success' && story !== 'partial'
  return (
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]" data-testid="gallery-player" data-stage={tl.stage} data-lost={tl.lost}>
      <div className="grid min-h-[30rem]"><FlightView plan={plan} tl={tl} design={design} vehicle={design.vehicle} stations={design.stations} /></div>
      <section className="panel flex flex-col gap-3 p-4">
        <p className="label">{orbName(orbit)}</p>
        <h2 className="text-2xl font-black">{failed ? t(`fault.${story}.title`) : t(`outcome.${story}`)}</h2>
        <p className="text-carbon-10">{t(`story.${story}.line`)}</p>
        <dl className="mono grid grid-cols-2 gap-2 text-sm">
          <dt className="text-carbon-40">{t('hud.time')}</dt><dd dir="ltr">{formatMissionTime(tele.seconds)}</dd>
          <dt className="text-carbon-40">{t('gallery.ends')}</dt><dd>{t(`hud.stage.${plan.stage}`)}</dd>
          <dt className="text-carbon-40">{t('gallery.length')}</dt>
          <dd dir="ltr">{plan.anim.ascent} + {plan.anim.cruise} + {plan.anim.arrival} s</dd>
        </dl>
        <div className="mt-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={tl.skip}>{t('launch.skip')}</Button>
        </div>
      </section>
    </div>
  )
}

/** Every flight animation in one place, for reviewing them without playing a whole mission. Open with #gallery. */
export function FlightGallery({ onExit }: { onExit(): void }) {
  const [story, setStory] = useState<Story>('success')
  const [orbit, setOrbit] = useState<OrbitId>(WHERE.success.orbit)
  const [run, setRun] = useState(0)
  const pick = (s: Story) => { setStory(s); setOrbit(WHERE[s].orbit); setRun((n) => n + 1) }
  const free = story === 'success' || story === 'partial'
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">{t('gallery.kicker')}</p>
          <h1 className="text-3xl font-black">{t('gallery.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon="refresh" onClick={() => setRun((n) => n + 1)}>{t('gallery.replay')}</Button>
          <Button variant="ghost" icon="back" onClick={onExit}>{t('common.exit')}</Button>
        </div>
      </header>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('gallery.title')}>
        {STORIES.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={story === s} onClick={() => pick(s)} data-story={s}
            className={`rounded border px-2.5 py-1 text-sm ${story === s ? 'border-nasa-red bg-nasa-red/20 text-white' : 'border-carbon-70 text-carbon-20 hover:border-carbon-40'}`}>
            {i < 2 ? t(`outcome.${s}`) : `${i - 1}. ${t(`fault.${s}.title`)}`}
          </button>
        ))}
      </div>
      {free && (
        <div className="flex flex-wrap gap-2">
          {(['sso', 'geo', 'lunar', 'l2', 'mars_orbit', 'mars_surf', 'asteroid', 'jupiter'] as OrbitId[]).map((o) => (
            <button key={o} type="button" aria-pressed={orbit === o} onClick={() => { setOrbit(o); setRun((n) => n + 1) }}
              className={`rounded border px-2 py-0.5 text-xs ${orbit === o ? 'border-nasa-blue-tint text-white' : 'border-carbon-70 text-carbon-30'}`}>{orbName(o)}</button>
          ))}
        </div>
      )}
      <Player key={`${story}-${orbit}-${run}`} story={story} orbit={orbit} />
      <section className="panel p-4" data-testid="gallery-elon">
        <h2 className="label mb-2">{t('gallery.director')}</h2>
        <div className="flex flex-wrap items-end justify-around gap-4">
          {ELON_POSES.map((pose) => (
            <figure key={pose} className="flex flex-col items-center">
              <Elon pose={pose} size={170} />
              <figcaption className="mono text-xs text-carbon-30">{pose}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  )
}
