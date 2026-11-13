import type { Difficulty, InstrumentId, ObjectiveId, OrbitId, Slot, VehicleId } from './types'
import { COMPONENTS, SLOT_OPTIONS, AUTO_OPTIONS } from './data/components'
import { VEHICLES, VEHICLES_BY_DIFF } from './data/vehicles'
import { ORBITS, ORBITS_BY_DIFF } from './data/orbits'
import { STATIONS } from './data/stations'
import { INSTRUMENTS, INSTRUMENTS_BY_DIFF } from './data/instruments'
import { OBJECTIVES, OBJECTIVES_BY_DIFF } from './data/objectives'

export { COMPONENTS, VEHICLES, ORBITS, STATIONS, INSTRUMENTS, OBJECTIVES }

/** Unlocked by the New Gear award, in this order. */
export const LOCKED_AT_START = ['highperf', 'ion', 'ka', 'hyperspectral']
export const STARTING_BUDGET: Record<Difficulty, number> = { fan: 2000, nerd: 1600, expert: 1300 }
export const CAMPAIGN_MAX_LAUNCHES = 5
export const MARS_WINDOW_MONTHS = 26
export const MARS_WAIT_COST_PER_MONTH = 4
export const EXPRESS_FEE = 10
export const BACKORDER_DELAY_MONTHS = 6
export const INTEGRATION_MONTHS = 6

const isLocked = (id: string, unlocked: string[]) => LOCKED_AT_START.includes(id) && !unlocked.includes(id)

/**
 * Gear the New Gear award hands out, in order, per difficulty. On Fan and Nerd these are parts
 * from the next tier up; on Expert they are the advanced parts locked at the start.
 */
export const UNLOCKS: Record<Difficulty, string[]> = {
  fan: ['hga', 'sar', 'body_solar', 'magnetometer'],
  nerd: ['rtg', 'radiation', 'rad_shield', 'hyperspectral'],
  expert: LOCKED_AT_START,
}
const UNLOCK_SLOT: Record<string, Slot> = {
  hga: 'antenna', body_solar: 'power', rtg: 'power', rad_shield: 'protection',
  highperf: 'computer', ion: 'propulsion', ka: 'band',
}
export const nextUnlock = (diff: Difficulty, unlocked: string[]): string | undefined =>
  UNLOCKS[diff].find((id) => !unlocked.includes(id))

/** Options the player may pick for a slot; [] means the slot is auto-set at this difficulty. */
export function optionsFor(diff: Difficulty, slot: Slot, unlocked: string[]): string[] {
  const base = SLOT_OPTIONS[diff][slot]
  if (!base) return []
  const ids = new Set(base.filter((id) => !isLocked(id, unlocked)))
  for (const id of UNLOCKS[diff]) if (unlocked.includes(id) && UNLOCK_SLOT[id] === slot) ids.add(id)
  return Object.keys(COMPONENTS[slot].options).filter((id) => ids.has(id))
}

/** Value used for a slot the difficulty hides, or null when the player picks it. */
export function autoOption(diff: Difficulty, slot: Slot, orbit: OrbitId): string | null {
  if (SLOT_OPTIONS[diff][slot]) return null
  if (slot === 'thermal') return ORBITS[orbit].thermal === 'extreme' ? 'active' : 'heaters'
  return AUTO_OPTIONS[diff][slot] ?? null
}

export const vehiclesFor = (diff: Difficulty): VehicleId[] => VEHICLES_BY_DIFF[diff]
export const orbitsFor = (diff: Difficulty): OrbitId[] => ORBITS_BY_DIFF[diff]
export const objectivesFor = (diff: Difficulty): ObjectiveId[] => OBJECTIVES_BY_DIFF[diff]
export function instrumentsFor(diff: Difficulty, unlocked: string[]): InstrumentId[] {
  const ids = new Set<string>(INSTRUMENTS_BY_DIFF[diff].filter((id) => !isLocked(id, unlocked)))
  for (const id of UNLOCKS[diff]) if (unlocked.includes(id) && id in INSTRUMENTS) ids.add(id)
  return (Object.keys(INSTRUMENTS) as InstrumentId[]).filter((id) => ids.has(id))
}

export function componentOption(slot: Slot, id: string) {
  const o = COMPONENTS[slot].options[id]
  if (!o) throw new Error(`unknown option ${slot}.${id}`)
  return o
}
