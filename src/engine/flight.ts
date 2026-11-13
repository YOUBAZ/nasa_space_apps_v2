import type { Design, Fault, FaultCode, OrbitId } from './types'
import type { MissionReport } from './evaluate'
import { COMPONENTS, ORBITS } from './catalog'

/** How far each destination is from Earth and how long a normal trip there takes. Rounded real figures. */
export const JOURNEY: Record<OrbitId, { distanceKm: number; travelDays: number }> = {
  leo: { distanceKm: 400, travelDays: 0.006 }, // about 8.5 minutes
  sso: { distanceKm: 700, travelDays: 0.007 }, // about 10 minutes
  meo: { distanceKm: 20_200, travelDays: 0.25 }, // about 6 hours
  geo: { distanceKm: 35_786, travelDays: 0.27 },
  heo: { distanceKm: 39_900, travelDays: 0.3 },
  lunar: { distanceKm: 384_400, travelDays: 3 },
  l2: { distanceKm: 1_500_000, travelDays: 30 },
  mars_orbit: { distanceKm: 225_000_000, travelDays: 210 }, // about 7 months
  mars_surf: { distanceKm: 225_000_000, travelDays: 210 },
  asteroid: { distanceKm: 320_000_000, travelDays: 730 }, // about 2 years
  jupiter: { distanceKm: 778_000_000, travelDays: 1800 }, // about 5 years
}

export type FlightStage = 'ascent' | 'cruise' | 'arrival'
export type Story = 'success' | 'partial' | FaultCode

/** The twelve mission-ending problems, in the order they would strike during a flight. */
export const STORY_ORDER: { code: FaultCode; stage: FlightStage }[] = [
  { code: 'over_capacity', stage: 'ascent' }, // cannot lift off properly
  { code: 'structure_overloaded', stage: 'ascent' }, // breaks up at maximum air pressure
  { code: 'vehicle_cannot_reach', stage: 'ascent' }, // runs out of push before it can leave
  { code: 'no_station_in_view', stage: 'cruise' }, // the first call home is heard by nobody
  { code: 'tumbling', stage: 'cruise' }, // loses its footing once Earth's magnetic field is behind it
  { code: 'power_deficit', stage: 'cruise' }, // starves as the Sun shrinks
  { code: 'no_link', stage: 'cruise' }, // the signal fades with distance
  { code: 'no_capture_propulsion', stage: 'arrival' }, // flies straight past
  { code: 'no_landing_kit', stage: 'arrival' }, // burns up on the way down
  { code: 'radiation_fried', stage: 'arrival' }, // electronics die in the radiation belts
  { code: 'battery_short', stage: 'arrival' }, // freezes in its first night
  { code: 'wrong_destination', stage: 'arrival' }, // arrives, with nothing to study
]

/** Which story the flight animation tells: the first mission-ending problem in flight order, if any. */
export function storyOf(faults: Fault[]): { story: Story; stage: FlightStage } {
  const critical = new Set(faults.filter((f) => f.severity === 'critical').map((f) => f.code))
  const first = STORY_ORDER.find((s) => critical.has(s.code))
  if (first) return { story: first.code, stage: first.stage }
  return { story: faults.some((f) => f.severity === 'major') ? 'partial' : 'success', stage: 'arrival' }
}

export interface FlightPlan {
  story: Story
  /** the stage in which the story ends */
  stage: FlightStage
  /** how far through that stage the failure strikes (1 = the stage completes) */
  failAt: number
  /** spacecraft mass as a share of what the rocket can carry there */
  load: number
  /** real seconds from liftoff to the edge of space (100 km) */
  ascentSeconds: number
  /** real days from leaving the atmosphere to the destination */
  travelDays: number
  distanceKm: number
  /** one-way radio delay at the destination, in seconds */
  lightDelaySeconds: number
  sunAtDestination: number
  /** how long each part of the time-lapse plays, in seconds */
  anim: { ascent: number; cruise: number; arrival: number }
}

const LIGHT_KM_S = 299_792.458
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Turns a finished design into the flight the players will watch.
 * Time and distance come from the destination; the design bends them:
 * a rocket near its limit climbs slowly, spare capacity buys a faster transfer, an ion engine a slower one.
 */
export function flightPlan(design: Design, report: MissionReport): FlightPlan {
  const o = ORBITS[design.orbit]
  const j = JOURNEY[design.orbit]
  const { story, stage } = storyOf(report.faults)

  const load = report.capacity > 0 ? clamp(report.mass / report.capacity, 0, 1.2) : 1.2
  const ascentSeconds = Math.round(130 + 70 * load)
  const beyondEarth = !o.earth
  const engine = design.propulsion === 'ion' && beyondEarth ? 1.5 : 1
  const spare = 1.15 - 0.3 * clamp(1 - load, 0, 1)
  const travelDays = j.travelDays * engine * spare

  let failAt = 1
  switch (story) {
    case 'over_capacity': failAt = 0.3; break
    case 'structure_overloaded': failAt = 0.45; break
    case 'vehicle_cannot_reach': failAt = 0.8; break
    case 'no_station_in_view': failAt = 0.12; break
    case 'tumbling': failAt = 0.2; break
    case 'power_deficit': {
      // sunlight falls from full at Earth to the destination's share; the craft dies where it can no longer cover its needs
      const power = COMPONENTS.power.options[design.power]
      const fullSun = power?.gen ?? 0
      const needs = fullSun > 0 ? report.powerDraw / fullSun : 2
      failAt = !power?.solar || needs >= 1 || o.sun >= 1 ? 0.1 : clamp((1 - needs) / (1 - o.sun), 0.1, 0.95)
      break
    }
    case 'no_link': {
      const antenna = COMPONENTS.antenna.options[design.antenna]
      const band = COMPONENTS.band.options[design.band]
      const reach = Math.min(antenna?.tier ?? 1, band?.tier ?? 1)
      const tooWeak = (antenna?.gain ?? 0) < (band?.needGain ?? 0)
      failAt = tooWeak ? 0.15 : clamp(reach / o.tier - 0.1, 0.15, 0.9)
      break
    }
    case 'no_capture_propulsion': failAt = 0.5; break
    case 'no_landing_kit': failAt = 0.45; break
    case 'radiation_fried': failAt = 0.6; break
    case 'battery_short': failAt = 0.55; break
    case 'wrong_destination': failAt = 0.7; break
  }

  return {
    story, stage, failAt, load, ascentSeconds, travelDays,
    distanceKm: j.distanceKm,
    lightDelaySeconds: j.distanceKm / LIGHT_KM_S,
    sunAtDestination: o.sun,
    anim: {
      ascent: round1(clamp(ascentSeconds / 25, 5, 9)),
      cruise: round1(clamp(5 + 4.2 * Math.log10(1 + travelDays * 24), 5, 26)),
      arrival: 7,
    },
  }
}
