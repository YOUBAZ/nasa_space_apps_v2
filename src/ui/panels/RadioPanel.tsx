import { lazy, Suspense } from 'react'
import { STATIONS, optionsFor, orbitsFor } from '../../engine/catalog'
import { coverage } from '../../engine/evaluate'
import { RADIO_SLOTS, type StationId } from '../../engine/types'
import { withAutoSlots } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { OptionCard } from '../components/OptionCard'
import { ReadyBar } from '../components/ReadyBar'
import { InfoTip } from '../handbook/Handbook'
import { orbName, stnName } from '../names'
import { orbitChips, stationChips } from '../stats'
import { SlotPicker } from './DesignerPanel'
import { Scene3D } from '../three/Scene3D'

const OrbitView3D = lazy(() => import('../three/OrbitView3D'))

function StationMap({ picked, onToggle, disabled }: { picked: StationId[]; onToggle(id: StationId): void; disabled: boolean }) {
  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded border border-carbon-70 bg-[#0b1220]" dir="ltr" aria-hidden="true">
      <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full">
        {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="#1c2a44" strokeWidth="0.4" />)}
        {[40, 80, 120, 160].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="100" stroke="#1c2a44" strokeWidth="0.4" />)}
        {/* very rough continents, just enough to place the pins */}
        <g fill="#1c67e3" opacity="0.28">
          <path d="M22 18 L52 14 L62 26 L54 40 L44 46 L36 40 L28 30 Z" />
          <path d="M52 52 L64 50 L70 62 L64 84 L56 80 L52 64 Z" />
          <path d="M92 20 L112 16 L120 26 L108 34 L96 32 Z" />
          <path d="M96 38 L116 36 L124 52 L114 76 L104 70 L98 52 Z" />
          <path d="M120 16 L170 14 L182 30 L168 42 L146 46 L128 36 Z" />
          <path d="M162 62 L182 60 L186 72 L170 76 Z" />
        </g>
        <line x1="0" x2="200" y1="50" y2="50" stroke="#288bff" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.6" />
      </svg>
      {(Object.keys(STATIONS) as StationId[]).map((id) => {
        const s = STATIONS[id]
        const on = picked.includes(id)
        return (
          <button key={id} type="button" tabIndex={-1} disabled={disabled} onClick={() => onToggle(id)}
            className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition ${on ? 'scale-125 border-white bg-active-green shadow-[0_0_10px_#47da84]' : s.network === 'dsn' ? 'border-intl-orange bg-black' : 'border-carbon-30 bg-black'}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }} />
        )
      })}
    </div>
  )
}

export function RadioPanel() {
  const { state, act, can } = useGame()
  const m = state.mission
  if (!m) return null
  if (!['design', 'integration', 'go_poll'].includes(state.phase)) {
    return <p className="mono text-sm text-carbon-40">{t('wait.design')}</p>
  }
  const d = withAutoSlots(m.design, state.difficulty)
  const picked = d.stations ?? []
  const me = can('radio')
  const toggle = (id: StationId) =>
    act({ type: 'setStations', stations: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id] }, 'radio')
  const cov = d.orbit ? coverage(d.orbit, picked, d.band ?? 'x') : null
  const slots = RADIO_SLOTS.filter((s) => optionsFor(state.difficulty, s, state.campaign.unlocked).length > 0)
  return (
    <div className="flex flex-col gap-4">
      <section data-tut="orbits">
        <h3 className="label mb-1.5">{t('radio.orbit')}</h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-2 sm:grid-cols-2">
            {orbitsFor(state.difficulty).map((id) => (
              <OptionCard key={id} name={orbName(id)} entryId={`orb.${id}`} chips={orbitChips(id)} color="#f6f6f6"
                selected={d.orbit === id} disabled={!me} onPick={() => act({ type: 'setOrbit', orbit: id }, 'radio')} />
            ))}
          </div>
          <div className="h-64 overflow-hidden rounded border border-carbon-70 bg-black lg:sticky lg:top-3 lg:self-start">
            <Scene3D fallback={<p className="mono p-3 text-xs text-carbon-40">{d.orbit ? orbName(d.orbit) : t('radio.noOrbit')}</p>}>
              <Suspense fallback={null}><OrbitView3D orbit={d.orbit} stations={picked} /></Suspense>
            </Scene3D>
          </div>
        </div>
      </section>

      {slots.map((slot) => <SlotPicker key={slot} slot={slot} role="radio" />)}

      <section data-tut="stations">
        <h3 className="label mb-1.5 flex items-center gap-1">{t('radio.stations')}<InfoTip entryId="concept.coverage" /></h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <StationMap picked={picked} onToggle={toggle} disabled={!me} />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between rounded border border-carbon-70 px-3 py-2">
              <span className="label">{t('radio.coverage')}</span>
              <span className="mono text-lg text-white" dir="ltr" data-testid="coverage">{cov === null ? '—' : `${Math.round(cov * 100)}%`}</span>
            </div>
            <p className="mono text-xs text-carbon-40">{t('radio.coverageHint')}</p>
          </div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(STATIONS) as StationId[]).map((id) => (
            <OptionCard key={id} name={stnName(id)} entryId={`stn.${id}`} chips={stationChips(id, d.orbit, d.band)} color="#47da84"
              selected={picked.includes(id)} disabled={!me} onPick={() => toggle(id)} />
          ))}
        </div>
      </section>
      <ReadyBar role="radio" />
    </div>
  )
}
