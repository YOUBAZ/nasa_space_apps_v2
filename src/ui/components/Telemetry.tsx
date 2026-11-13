import { ORBITS, VEHICLES } from '../../engine/catalog'
import { liveTotals } from '../../engine/evaluate'
import { spendOf, withAutoSlots } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Gauge, type Hint } from './Gauge'
import { num } from '../names'

const hintFor = (value: number, max: number): Hint => (max <= 0 || value > max ? 'bad' : value > 0.9 * max ? 'warn' : 'ok')

/** Live totals for the design in progress. Only Space Fan sees the mass and power limits. */
export function Telemetry() {
  const { state } = useGame()
  const m = state.mission
  if (!m) return null
  const d = withAutoSlots(m.design, state.difficulty)
  const totals = liveTotals(d)
  const hints = state.difficulty === 'fan'
  let capacity: number | undefined
  if (hints && d.vehicle && d.orbit) {
    const o = ORBITS[d.orbit]
    capacity = (VEHICLES[d.vehicle].cap[o.cls] ?? 0) * o.capMult
  }
  const gen = hints && d.power ? totals.powerGen : undefined
  const spent = spendOf(state, 'designer') + spendOf(state, 'radio') + m.fees
  return (
    <div className="grid grid-cols-2 gap-2" data-tut="telemetry">
      <Gauge label={t('gauge.mass')} value={totals.mass} unit="kg" max={capacity}
        hint={capacity !== undefined ? hintFor(totals.mass, capacity) : undefined}
        sub={capacity !== undefined ? t('gauge.ofRocket', { n: num(capacity) }) : undefined} />
      <Gauge label={t('gauge.power')} value={totals.powerDraw} unit="W" max={gen}
        hint={gen !== undefined ? hintFor(totals.powerDraw, gen) : undefined}
        sub={gen !== undefined ? t('gauge.ofGen', { n: num(gen) }) : undefined} />
      <Gauge label={t('gauge.cost')} value={spent} unit="$M" max={m.budget.total || undefined}
        hint={m.budget.total ? hintFor(spent, m.budget.total) : undefined}
        sub={m.budget.total ? t('gauge.ofBudget', { n: num(m.budget.total) }) : undefined} />
      <Gauge label={t('gauge.data')} value={totals.dataGenerated} unit="Gb/d" />
    </div>
  )
}
