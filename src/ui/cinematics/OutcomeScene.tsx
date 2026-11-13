import { useEffect, useMemo } from 'react'
import type { Fault } from '../../engine/types'
import type { Outcome } from '../../engine/evaluate'
import { t } from '../../i18n/i18n'
import { Elon } from '../elon/Elon'
import { sfx } from '../sound'
import './outcome.css'

const GROUPS: { id: string; codes: string[] }[] = [
  { id: 'launch', codes: ['over_capacity', 'vehicle_cannot_reach', 'structure_overloaded'] },
  { id: 'comms', codes: ['no_link', 'no_station_in_view'] },
  { id: 'power', codes: ['power_deficit', 'battery_short', 'thermal_failure', 'radiation_fried'] },
]
/** Which flavour of failure this was, for the right tantrum line. */
export function failureGroup(faults: Fault[]): string {
  const critical = faults.filter((f) => f.severity === 'critical').map((f) => f.code as string)
  return GROUPS.find((g) => g.codes.some((c) => critical.includes(c)))?.id ?? 'other'
}

const CONFETTI = ['#f64137', '#1c67e3', '#47da84', '#ea6f24', '#f6f6f6', '#288bff']

/** The Flight Director reacts: tantrum on failure, shrug on partial, party on success. */
export function OutcomeScene({ outcome, faults }: { outcome: Outcome; faults: Fault[] }) {
  const group = failureGroup(faults)
  useEffect(() => { sfx(outcome === 'success' ? 'fanfare' : outcome === 'failure' ? 'argh' : 'click') }, [outcome])
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: (i * 37) % 100, delay: ((i * 13) % 20) / 10, color: CONFETTI[i % CONFETTI.length], spin: i % 2 ? 1 : -1,
  })), [])
  const tone = outcome === 'success' ? 'border-active-green' : outcome === 'partial' ? 'border-intl-orange' : 'border-nasa-red'
  return (
    <section className={`panel relative flex flex-col items-center gap-2 overflow-hidden border-2 p-5 text-center sm:flex-row sm:text-start ${tone} ${outcome === 'failure' ? 'outcome-quake' : ''}`}
      data-testid="outcome" data-outcome={outcome}>
      {outcome === 'success' && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {pieces.map((p, i) => (
            <span key={i} className="confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, ['--spin' as string]: p.spin }} />
          ))}
        </div>
      )}
      <div className="relative shrink-0">
        <Elon pose={outcome === 'success' ? 'celebrate' : outcome === 'partial' ? 'shrug' : 'tantrum'} size={170} />
        {outcome === 'failure' && <span className="scream" aria-hidden="true">{t('outcome.scream')}</span>}
      </div>
      <div className="relative">
        <p className="label">{t('outcome.director')}</p>
        <h1 className={`text-4xl font-black sm:text-5xl ${outcome === 'success' ? 'text-active-green' : outcome === 'partial' ? 'text-intl-orange' : 'text-nasa-red'}`}>
          {t(`outcome.${outcome}`)}
        </h1>
        <p className="mt-2 max-w-xl text-lg text-carbon-10">
          “{outcome === 'failure' ? t(`outcome.quip.failure.${group}`) : t(`outcome.quip.${outcome}`)}”
        </p>
      </div>
    </section>
  )
}
