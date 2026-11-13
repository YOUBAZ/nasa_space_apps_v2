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
export const CAMPAIGN_MIN_FUNDS = 50
export const MARS_WINDOW_MONTHS = 26
export const MARS_WAIT_COST_PER_MONTH = 4
export const EXPRESS_FEE = 10
export const BACKORDER_DELAY_MONTHS = 6
export const INTEGRATION_MONTHS = 6

const isLocked = (id: string, unlocked: string[]) => LOCKED_AT_START.includes(id) && !unlocked.includes(id)

/** Options the player may pick for a slot; [] means the slot is auto-set at this difficulty. */
export function optionsFor(diff: Difficulty, slot: Slot, unlocked: string[]): string[] {
  return (SLOT_OPTIONS[diff][slot] ?? []).filter((id) => !isLocked(id, unlocked))
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
export const instrumentsFor = (diff: Difficulty, unlocked: string[]): InstrumentId[] =>
  INSTRUMENTS_BY_DIFF[diff].filter((id) => !isLocked(id, unlocked))

export function componentOption(slot: Slot, id: string) {
  const o = COMPONENTS[slot].options[id]
  if (!o) throw new Error(`unknown option ${slot}.${id}`)
  return o
}
