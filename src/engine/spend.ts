import type { GameState, Mission } from './state'
import { fail } from './state'
import type { Design, Difficulty, Slot } from './types'
import { SLOTS } from './types'
import { COMPONENTS, INSTRUMENTS, STATIONS, VEHICLES, autoOption, optionsFor } from './catalog'
import { SCHEDULE } from './evaluate'
import { isSolo, missionOf } from './ctx'

/** The design with the slots this difficulty hides filled in automatically. */
export function withAutoSlots(design: Partial<Design>, diff: Difficulty): Partial<Design> {
  const out: Partial<Design> = { ...design }
  for (const slot of SLOTS) {
    const auto = autoOption(diff, slot, design.orbit ?? 'sso')
    if (auto) out[slot] = auto
  }
  return out
}

/** Slots the player must choose at this difficulty. */
export const activeSlots = (diff: Difficulty, unlocked: string[]): Slot[] =>
  SLOTS.filter((slot) => optionsFor(diff, slot, unlocked).length > 0)

/** A launch-ready design, or null while choices are still missing. */
export function completeDesign(m: Mission, diff: Difficulty): Design | null {
  const d = withAutoSlots(m.design, diff)
  if (!d.orbit || !d.vehicle) return null
  if (SLOTS.some((slot) => !d[slot])) return null
  return { ...d, instruments: d.instruments ?? [], stations: d.stations ?? [] } as Design
}

/** What a role has committed so far, including the schedule-mode price change. */
export function spendOf(s: GameState, role: 'designer' | 'radio'): number {
  const m = missionOf(s)
  const mult = SCHEDULE[m.scheduleMode].cost
  const d = withAutoSlots(m.design, s.difficulty)
  if (role === 'radio') return (d.stations ?? []).reduce((sum, st) => sum + STATIONS[st].cost, 0) * mult
  let total = 0
  for (const slot of SLOTS) if (d[slot]) total += COMPONENTS[slot].options[d[slot]!].cost
  for (const i of d.instruments ?? []) total += INSTRUMENTS[i].cost
  if (d.vehicle) total += VEHICLES[d.vehicle].cost
  return total * mult
}

const EPS = 1e-9

/** Hard caps: throws when a role has committed more than its allocation. */
export function checkCaps(s: GameState): void {
  const m = missionOf(s)
  const designer = spendOf(s, 'designer')
  const radio = spendOf(s, 'radio')
  if (isSolo(s)) {
    if (designer + radio + m.fees > m.budget.total + EPS) fail('over_allocation')
    return
  }
  if (designer > m.budget.designer + EPS || radio > m.budget.radio + EPS) fail('over_allocation')
}
