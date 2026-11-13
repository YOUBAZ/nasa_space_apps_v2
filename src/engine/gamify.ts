import type { MissionResult, Patch } from './state'
import type { Design, ObjectiveId } from './types'
import type { Outcome } from './evaluate'
import { nextRandom } from './rng'

export type Rank = 'cadet' | 'flight_engineer' | 'mission_specialist' | 'flight_director'
export const RANKS: { rank: Rank; from: number }[] = [
  { rank: 'cadet', from: 0 },
  { rank: 'flight_engineer', from: 300 },
  { rank: 'mission_specialist', from: 800 },
  { rank: 'flight_director', from: 1500 },
]

export const xpFor = (roleScore: number): number => Math.round(roleScore)

export function rankOf(xp: number): Rank {
  let rank: Rank = 'cadet'
  for (const r of RANKS) if (xp >= r.from) rank = r.rank
  return rank
}

export const BADGES = [
  'penny_pincher', 'data_hoarder', 'nailed_the_landing', 'rapid_unscheduled_disassembly',
  'comeback_kid', 'one_station_wonder',
] as const
export type Badge = (typeof BADGES)[number]

/** Badges this mission earns for the whole team. */
export function badgesFor(history: MissionResult[], result: MissionResult, design: Design): Badge[] {
  const out: Badge[] = []
  const won = result.outcome === 'success'
  if (result.awards.some((a) => a.id === 'cost_efficiency')) out.push('penny_pincher')
  if (result.awards.some((a) => a.id === 'scientific_value')) out.push('data_hoarder')
  if (won && design.orbit === 'mars_surf') out.push('nailed_the_landing')
  if (result.outcome === 'failure' && !history.some((h) => h.outcome === 'failure')) out.push('rapid_unscheduled_disassembly')
  if (won && history.length > 0 && history[history.length - 1].outcome === 'failure') out.push('comeback_kid')
  if (won && design.orbit === 'geo' && design.stations.length === 1) out.push('one_station_wonder')
  return out
}

const SHAPES: Patch['shape'][] = ['circle', 'shield', 'hexagon', 'triangle']
// HDS brand and accent tokens
const COLORS = ['#f64137', '#1c67e3', '#ea6f24', '#47da84', '#288bff', '#0b3d91', '#b60109']
const ICONS: Record<ObjectiveId, string> = {
  wildfire: 'flame', polar_ice: 'snowflake', crops: 'leaf', telescope: 'star', asteroid: 'rock',
  jupiter: 'planet', mars_ice: 'drop', mars_scout: 'flag', mars_isru: 'drill',
}

/** A mission patch, generated the same way every time for the same seed. */
export function makePatch(seed: number, objectiveId: ObjectiveId, teamName: string, outcome: Outcome): Patch {
  const [a, s1] = nextRandom(seed)
  const [b, s2] = nextRandom(s1)
  const [c] = nextRandom(s2)
  const colorA = COLORS[Math.floor(a * COLORS.length)]
  const rest = COLORS.filter((x) => x !== colorA)
  return {
    shape: SHAPES[Math.floor(c * SHAPES.length)],
    colorA,
    colorB: rest[Math.floor(b * rest.length)],
    icon: ICONS[objectiveId],
    objectiveId, outcome, teamName,
  }
}
