import type {
  Design, Difficulty, Fault, FaultCode, InstrumentId, ObjectiveId, OrbitId, Role, ScheduleMode,
  Severity, Slot, StationId,
} from './types'
import { SLOTS } from './types'
import {
  COMPONENTS, INSTRUMENTS, OBJECTIVES, ORBITS, STATIONS, VEHICLES, INTEGRATION_MONTHS,
  instrumentsFor,
} from './catalog'

export type Outcome = 'success' | 'partial' | 'failure'

export interface MissionReport {
  outcome: Outcome
  faults: Fault[]
  mass: number
  /** effective launch capacity for the destination (0 when the vehicle cannot reach it) */
  capacity: number
  powerDraw: number
  powerGen: number
  dataGenerated: number
  /** Gb per day that can reach the ground */
  downlink: number
  /** fraction of the day in contact, 0..1 */
  coverage: number
  lifeYears: number
  /** 0..1 */
  science: number
  cost: number
  devMonths: number
}

export interface EvalContext {
  unlocked?: string[]
  scheduleMode?: ScheduleMode
}

const SCIENCE_WEIGHTS = [1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
export const SCHEDULE: Record<ScheduleMode, { cost: number; time: number }> = {
  rush: { cost: 1.2, time: 0.75 },
  standard: { cost: 1, time: 1 },
  careful: { cost: 0.95, time: 1.25 },
}

const part = (slot: Slot, id: string) => {
  const o = COMPONENTS[slot].options[id]
  if (!o) throw new Error(`unknown option ${slot}.${id}`)
  return o
}

/** Fraction of the day the spacecraft is in contact with the chosen ground stations. */
export function coverage(orbit: OrbitId, stations: StationId[], band: string): number {
  const vals = stations.map((s) => {
    const st = STATIONS[s]
    return st.coverage[orbit] * (band === 'ka' && st.rainy ? 0.7 : 1)
  })
  if (vals.length === 0) return 0
  const c = orbit === 'geo' ? Math.max(...vals) : Math.min(1, vals.reduce((a, b) => a + b, 0))
  return c * ORBITS[orbit].covMult
}

/** Best science score reachable with 4 instruments available at this difficulty. */
export function maxScience(objective: ObjectiveId, diff: Difficulty, unlocked: string[] = []): number {
  const rel = OBJECTIVES[objective].rel
  const top = instrumentsFor(diff, unlocked)
    .map((i) => rel[i] ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 4)
  return top.reduce((sum, r, i) => sum + r * SCIENCE_WEIGHTS[i], 0)
}

/** Running totals for the telemetry gauges; works on a half-built design. */
export function liveTotals(d: Partial<Design>): {
  mass: number; powerDraw: number; powerGen: number; cost: number; dataGenerated: number
} {
  let mass = 0, powerDraw = 0, cost = 0, dataGenerated = 0, powerGen = 0
  for (const slot of SLOTS) {
    const id = d[slot]
    if (!id) continue
    const p = part(slot, id)
    mass += p.mass; powerDraw += p.power; cost += p.cost
  }
  for (const i of d.instruments ?? []) {
    const ins = INSTRUMENTS[i]
    mass += ins.mass; powerDraw += ins.power; cost += ins.cost; dataGenerated += ins.gb
  }
  if (d.power) {
    const pw = part('power', d.power)
    powerGen = (pw.gen ?? 0) * (pw.solar && d.orbit ? ORBITS[d.orbit].sun : 1)
  }
  if (d.vehicle) cost += VEHICLES[d.vehicle].cost
  for (const s of d.stations ?? []) cost += STATIONS[s].cost
  return { mass, powerDraw, powerGen, cost, dataGenerated }
}

/**
 * The whole consequence model: turns a finished design into faults, science, cost and time.
 * Mirrors docs/superpowers/specs/balance_reference.py evaluate() line for line.
 */
export function evaluateDesign(d: Design, objective: ObjectiveId, diff: Difficulty, ctx: EvalContext = {}): MissionReport {
  const o = ORBITS[d.orbit]
  const ob = OBJECTIVES[objective]
  const parts = SLOTS.map((s) => part(s, d[s]))
  const insts = d.instruments.map((i) => INSTRUMENTS[i])
  const faults: Fault[] = []
  const F = (severity: Severity, code: FaultCode, roles: Role[]) => faults.push({ severity, code, roles })
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

  // --- mass & launch
  const structure = part('structure', d.structure)
  const mass = sum(parts.map((p) => p.mass)) + sum(insts.map((i) => i.mass))
  const carried = mass - structure.mass
  const v = VEHICLES[d.vehicle]
  const rawCap = v.cap[o.cls]
  let capacity = 0
  if (rawCap === null) F('critical', 'vehicle_cannot_reach', ['designer', 'radio'])
  else capacity = rawCap * o.capMult
  if (capacity > 0 && mass > capacity) F('critical', 'over_capacity', ['designer'])
  if (carried > (structure.supports ?? 0)) F('critical', 'structure_overloaded', ['designer'])

  // --- destination fit
  const fit = ob.orbits[d.orbit] ?? 0
  if (fit === 0) F('critical', 'wrong_destination', ['scientist', 'radio'])

  // --- power
  const pw = part('power', d.power)
  const powerGen = (pw.gen ?? 0) * (pw.solar ? o.sun : 1)
  const powerDraw = sum(parts.map((p) => p.power)) + sum(insts.map((i) => i.power))
  if (powerGen < powerDraw) F('critical', 'power_deficit', ['designer'])
  else if ((powerGen - powerDraw) / powerDraw < 0.1) F('minor', 'thin_power_margin', ['designer'])
  const needWh = pw.solar ? powerDraw * o.shadow : 0
  if ((part('battery', d.battery).wh ?? 0) < needWh) {
    F(o.shadow >= 6 ? 'critical' : 'major', 'battery_short', ['designer'])
  }

  // --- propulsion & protection
  const onSurface = d.orbit === 'mars_surf'
  const propClass = part('propulsion', d.propulsion).cls ?? 0
  if (propClass < o.capture) F(o.capture === 2 ? 'critical' : 'major', 'no_capture_propulsion', ['designer'])
  if (onSurface && d.protection !== 'mars_edl') F('critical', 'no_landing_kit', ['designer'])
  if (d.orbit === 'jupiter' && d.protection !== 'rad_shield') F('critical', 'radiation_fried', ['designer'])
  const hasTelescope = d.instruments.includes('ir_telescope')
  if (hasTelescope && d.protection !== 'sunshield') F('major', 'telescope_blinded', ['designer', 'scientist'])

  // --- pointing
  const magnetorquer = d.attitude === 'magnetorquer'
  let point = part('attitude', d.attitude).point ?? 0
  if (magnetorquer && !o.earth) point = 0
  if (point === 0 && !(magnetorquer && o.earth)) F('critical', 'tumbling', ['designer'])
  const antenna = part('antenna', d.antenna)
  const band = part('band', d.band)
  const needPoint = Math.max(...insts.map((i) => i.point), antenna.point ?? 0)
  if (point < needPoint) F('major', 'pointing_too_coarse', ['designer'])

  // --- communications
  const linkOk = (antenna.tier ?? 0) >= o.tier && (band.tier ?? 0) >= o.tier && (antenna.gain ?? 0) >= (band.needGain ?? 0)
  if (!linkOk) F('critical', 'no_link', ['radio'])
  const cov = coverage(d.orbit, d.stations, d.band)
  if (cov === 0) F('critical', 'no_station_in_view', ['radio'])
  else if (cov < ob.minCov) F('major', 'coverage_low', ['radio'])
  const downlink = linkOk ? (band.rate ?? 0) * (antenna.gain ?? 0) * o.dist * cov * 24 : 0
  const dataGenerated = sum(insts.map((i) => i.gb))
  const frac = dataGenerated === 0 ? 1 : Math.min(1, downlink / dataGenerated)
  if (dataGenerated > 0 && frac < 0.5) F('major', 'downlink_bottleneck', ['radio', 'scientist'])
  const computer = part('computer', d.computer)
  if ((computer.gbday ?? 0) < dataGenerated) F('major', 'computer_overloaded', ['designer'])
  if ((part('storage', d.storage).gb ?? 0) < dataGenerated * (1 - cov)) F('major', 'storage_overflow', ['designer'])

  // --- lifetime
  let life = o.life
  if (d.orbit === 'leo' && propClass >= 1) life = 8
  if (o.rad === 'med' && !(d.protection === 'rad_shield' || computer.radhard)) life *= 0.3
  if (o.rad === 'high' && !computer.radhard) life *= 0.3
  const handles = part('thermal', d.thermal).handles ?? []
  if (!handles.includes(o.thermal) && !(d.power === 'rtg' && o.thermal === 'extreme')) {
    life *= 0.5
    F('major', 'thermal_failure', ['designer'])
  }
  if (onSurface && pw.solar) life = Math.min(life, 3)
  if (life < ob.life) F('major', 'short_lifetime', ['designer', 'radio'])

  if (d.orbit === 'geo' && d.stations.length > 1) F('minor', 'wasted_stations', ['radio'])

  // --- science
  const rels = d.instruments.map((name: InstrumentId) => {
    if (INSTRUMENTS[name].surface && !onSurface) return 0
    if (name === 'ir_telescope' && d.protection !== 'sunshield') return 0
    return ob.rel[name] ?? 0
  }).sort((a, b) => b - a)
  const raw = rels.reduce((acc, r, i) => acc + r * SCIENCE_WEIGHTS[i], 0)
  const science = Math.min(1, raw / maxScience(objective, diff, ctx.unlocked)) * fit * frac * Math.min(1, life / ob.life)
  if (rels.some((r) => r === 0)) F('minor', 'irrelevant_instruments', ['scientist'])

  // --- cost & time
  const mode = SCHEDULE[ctx.scheduleMode ?? 'standard']
  const baseCost = sum(parts.map((p) => p.cost)) + sum(insts.map((i) => i.cost)) + v.cost + sum(d.stations.map((s) => STATIONS[s].cost))
  const cost = Math.round(baseCost * mode.cost)
  const slowest = Math.max(...parts.map((p) => p.dev), ...insts.map((i) => i.dev), 0)
  const devMonths = Math.ceil((slowest + INTEGRATION_MONTHS) * mode.time)

  // Careful mode: extra testing catches one small problem before launch.
  if (ctx.scheduleMode === 'careful') {
    const i = faults.findIndex((f) => f.severity === 'minor')
    if (i >= 0) faults.splice(i, 1)
  }

  return {
    outcome: outcomeOf(faults), faults, mass, capacity, powerDraw, powerGen, dataGenerated,
    downlink, coverage: cov, lifeYears: life, science, cost, devMonths,
  }
}

export function outcomeOf(faults: Fault[]): Outcome {
  if (faults.some((f) => f.severity === 'critical')) return 'failure'
  if (faults.some((f) => f.severity === 'major')) return 'partial'
  return 'success'
}
