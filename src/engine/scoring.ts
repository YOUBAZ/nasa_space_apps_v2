import type { Award, GameState, MissionResult } from './state'
import type { Fault, OrbitId, Role, StationId } from './types'
import { ROLES } from './types'
import { COMPONENTS, INSTRUMENTS, OBJECTIVES, ORBITS, STATIONS, nextUnlock } from './catalog'
import { coverage } from './evaluate'
import { isSolo, missionOf } from './ctx'
import { spendOf } from './spend'

const PENALTY = { critical: 30, major: 15, minor: 5 } as const
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Points each role loses for the faults blamed on it; shared faults split the penalty. */
export function faultPenalties(faults: Fault[]): Record<Role, number> {
  const out: Record<Role, number> = { planner: 0, scientist: 0, designer: 0, radio: 0 }
  for (const f of faults) for (const role of f.roles) out[role] += PENALTY[f.severity] / f.roles.length
  return out
}

/**
 * 0 with no margin, 100 inside the ideal band [lo, hi], easing to 70 when heavily over-built
 * (over-building is wasteful, but parts and rockets only come in a few sizes).
 */
export function marginScore(margin: number, lo: number, hi: number): number {
  if (margin <= 0) return 0
  if (margin < lo) return Math.round((100 * margin) / lo)
  if (margin <= hi) return 100
  return Math.round(Math.max(70, 100 - (30 * (margin - hi)) / (2 * hi)))
}

/** Cheapest set of up to three stations that reaches the needed coverage (Infinity if none can). */
export function cheapestStationCost(orbit: OrbitId, need: number, band: string): number {
  const ids = Object.keys(STATIONS) as StationId[]
  let best = Infinity
  const consider = (set: StationId[]) => {
    if (coverage(orbit, set, band) + 1e-9 < need) return
    best = Math.min(best, set.reduce((sum, id) => sum + STATIONS[id].cost, 0))
  }
  for (let a = 0; a < ids.length; a++) {
    consider([ids[a]])
    for (let b = a + 1; b < ids.length; b++) {
      consider([ids[a], ids[b]])
      for (let c = b + 1; c < ids.length; c++) consider([ids[a], ids[b], ids[c]])
    }
  }
  return best
}

/** Final blame: the spec's sharing rules applied on top of the evaluator's default roles. */
function assignBlame(s: GameState): Fault[] {
  const m = missionOf(s)
  const report = m.report!
  const design = m.finalDesign!
  const instrumentPower = design.instruments.reduce((sum, i) => sum + INSTRUMENTS[i].power, 0)
  const hungryPayload = report.powerDraw > 0 && instrumentPower / report.powerDraw > 0.5
  return report.faults.map((f) => {
    const roles = [...f.roles]
    const share = (role: Role) => { if (!roles.includes(role)) roles.push(role) }
    if ((f.code === 'over_capacity' || f.code === 'structure_overloaded') && m.scientistOverrode) share('scientist')
    if ((f.code === 'power_deficit' || f.code === 'thin_power_margin' || f.code === 'battery_short') && hungryPayload) share('scientist')
    return { ...f, roles }
  })
}

/** Turns a launched mission into scores, awards and money (spec §10). */
export function scoreMission(s: GameState): MissionResult {
  const m = missionOf(s)
  const report = m.report!
  const design = m.finalDesign!
  const ob = OBJECTIVES[m.objectiveId!]
  const solo = isSolo(s)
  const faults = assignBlame(s)
  const penalties = faultPenalties(faults)
  const has = (code: string) => faults.some((f) => f.code === code)
  const blamedHard = (role: Role) => faults.some((f) => f.severity !== 'minor' && f.roles.includes(role))

  // --- Scientist: science returned, instruments that fit, right destination
  const onSurface = design.orbit === 'mars_surf'
  const useful = design.instruments.filter((i) => {
    if (INSTRUMENTS[i].surface && !onSurface) return false
    if (i === 'ir_telescope' && design.protection !== 'sunshield') return false
    return (ob.rel[i] ?? 0) > 0
  }).length
  const instrumentFit = design.instruments.length ? useful / design.instruments.length : 0
  const orbitFit = ob.orbits[design.orbit] ?? 0
  const scientist = 50 * report.science + 30 * instrumentFit + 20 * orbitFit

  // --- Designer: healthy mass and power margins, living within the allocation
  const massMargin = report.capacity > 0 ? (report.capacity - report.mass) / report.capacity : -1
  const powerMargin = report.powerDraw > 0 ? (report.powerGen - report.powerDraw) / report.powerDraw : 1
  // Living within the first allocation: asking for money is fine, needing a lot more than planned is not.
  const firstGiven = m.budget.initialDesigner ?? m.budget.designer
  const overshoot = firstGiven > 0 ? Math.max(0, spendOf(s, 'designer') - firstGiven) / firstGiven : 0
  const designerCost = solo ? 100 : Math.max(40, Math.round(100 - 100 * overshoot))
  const designer = 0.35 * marginScore(massMargin, 0.1, 0.3) + 0.35 * marginScore(powerMargin, 0.1, 0.4) + 0.3 * designerCost

  // --- Planner: budget, schedule, quality of approvals
  const usage = m.budget.total > 0 ? (m.totalCost ?? report.cost) / m.budget.total : 1
  const budgetScore = usage > 1 ? Math.max(0, 100 - (usage - 1) * 300) : usage >= 0.7 ? 100 : 50 + (50 * usage) / 0.7
  const late = Math.max(0, (m.readyMonth ?? 0) - m.targetMonth)
  const scheduleScore = Math.max(0, 100 - 8 * late - 2 * (m.waitMonths ?? 0))
  const approved = m.requests.filter((r) => r.status === 'approved')
  const badApprovals = approved.filter((r) =>
    (r.kind === 'funding' && blamedHard(r.target ?? 'designer')) ||
    (r.kind === 'purchase' && faults.some((f) => f.severity === 'critical')) ||
    (r.kind === 'objective' && has('wrong_destination'))).length
  const reversed = approved.filter((r) => r.appeals > 0).length
  const decisionScore = Math.max(0, 100 - 20 * badApprovals - 10 * reversed)
  const planner = 0.4 * budgetScore + 0.3 * scheduleScore + 0.3 * decisionScore

  // --- Radio Operator: coverage per dollar, data brought home, a link that works
  const stationCost = design.stations.reduce((sum, id) => sum + STATIONS[id].cost, 0)
  // "Enough" coverage is what the objective asks for or what the data needs, whichever is more.
  const perDay = (COMPONENTS.band.options[design.band]?.rate ?? 0) * (COMPONENTS.antenna.options[design.antenna]?.gain ?? 0) * ORBITS[design.orbit].dist * 24
  const forData = perDay > 0 ? Math.min(1, report.dataGenerated / perDay) : 0
  const wanted = cheapestStationCost(design.orbit, Math.max(ob.minCov, forData), design.band)
  const cheapest = Number.isFinite(wanted) ? wanted : cheapestStationCost(design.orbit, ob.minCov, design.band)
  const reach = Math.min(1, report.coverage / ob.minCov)
  const thrift = stationCost > 0 && Number.isFinite(cheapest) ? Math.min(1, cheapest / stationCost) : stationCost > 0 ? 1 : 0
  const dataHome = report.dataGenerated > 0 ? Math.min(1, report.downlink / report.dataGenerated) : 1
  const linkOk = !has('no_link') && !has('no_station_in_view')
  const radio = 40 * reach * thrift + 40 * dataHome + (linkOk ? 20 : 0)

  const raw: Record<Role, number> = { planner, scientist, designer, radio }
  const roleScores = Object.fromEntries(ROLES.map((r) => [r, clamp(raw[r] - penalties[r])])) as Record<Role, number>

  // --- team result, money, awards
  const outcome = report.outcome
  const teamPoints = outcome === 'success' ? 1000 : outcome === 'partial' ? 400 : 0
  const grant = outcome === 'failure' ? 0 : Math.round(ob.grant * report.science * (outcome === 'success' ? 1 : 0.5))
  const cost = m.totalCost ?? report.cost
  const awards: Award[] = []
  if (outcome === 'success' && cost <= 0.85 * m.budget.total) awards.push({ id: 'cost_efficiency' })
  if (outcome !== 'failure' && report.science >= 0.8) awards.push({ id: 'scientific_value' })
  if (outcome === 'success') {
    const unlock = nextUnlock(s.difficulty, s.campaign.unlocked)
    if (unlock) awards.push({ id: 'new_gear', unlock })
  }
  for (const role of ROLES) {
    const critical = faults.some((f) => f.severity === 'critical' && f.roles.includes(role))
    if (roleScores[role] >= 80 && !critical) awards.push({ id: 'effective_decision', role })
  }

  return {
    objectiveId: ob.id, outcome, roleScores, teamPoints, awards, grant, cost, science: report.science,
    faults, launchMonth: m.launchMonth ?? 0,
  }
}

/** Display name helper for unlock cards. */
export function unlockName(id: string): string {
  for (const def of Object.values(COMPONENTS)) if (def.options[id]) return def.options[id].name
  return (INSTRUMENTS as Record<string, { name: string }>)[id]?.name ?? id
}
