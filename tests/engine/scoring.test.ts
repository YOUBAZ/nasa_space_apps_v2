import { debriefOf, fixture, designGame, ok, P, launchFrom } from './helpers/play'
import { faultPenalties, marginScore, cheapestStationCost } from '../../src/engine/scoring'

const wildfire = fixture('fan/wildfire/viable0').design
const tight = { total: 220, designer: 200, radio: 8, targetMonth: 18 }

describe('scoring helpers', () => {
  it('splits a shared fault penalty between the blamed roles', () => {
    const p = faultPenalties([{ severity: 'critical', code: 'vehicle_cannot_reach', roles: ['designer', 'radio'] }])
    expect(p).toEqual({ planner: 0, scientist: 0, designer: 15, radio: 15 })
  })
  it('adds up critical 30, major 15, minor 5', () => {
    const p = faultPenalties([
      { severity: 'critical', code: 'over_capacity', roles: ['designer'] },
      { severity: 'major', code: 'battery_short', roles: ['designer'] },
      { severity: 'minor', code: 'thin_power_margin', roles: ['designer'] },
    ])
    expect(p.designer).toBe(50)
  })
  it('scores a margin: zero at none, full inside the ideal band, easing off when over-built', () => {
    expect(marginScore(-0.1, 0.1, 0.3)).toBe(0)
    expect(marginScore(0, 0.1, 0.3)).toBe(0)
    expect(marginScore(0.05, 0.1, 0.3)).toBe(50)
    expect(marginScore(0.2, 0.1, 0.3)).toBe(100)
    expect(marginScore(0.6, 0.1, 0.3)).toBe(85)
    expect(marginScore(5, 0.1, 0.3)).toBe(70)
  })
  it('finds the cheapest stations for a coverage need', () => {
    expect(cheapestStationCost('sso', 0.2, 'x')).toBe(6) // Svalbard + one more
    expect(cheapestStationCost('geo', 0.2, 'x')).toBe(3)
    expect(cheapestStationCost('mars_orbit', 0.3, 'x')).toBe(15)
  })
})

describe('scoreMission', () => {
  it('a clean, well-budgeted success scores high and wins awards', () => {
    const r = debriefOf(wildfire, 'wildfire', tight).mission!.result!
    expect(r.outcome).toBe('success')
    expect(r.teamPoints).toBe(1000)
    expect(r.grant).toBe(186) // round(360 × 0.517)
    expect(r.cost).toBe(179)
    for (const role of ['planner', 'designer', 'radio'] as const) expect(r.roleScores[role]).toBeGreaterThanOrEqual(80)
    const ids = r.awards.map((a) => a.id)
    expect(ids).toContain('cost_efficiency')
    expect(ids).not.toContain('scientific_value')
    expect(r.awards.find((a) => a.id === 'new_gear')!.unlock).toBe('hga')
    expect(r.awards.filter((a) => a.id === 'effective_decision').map((a) => a.role)).toEqual(expect.arrayContaining(['designer', 'radio']))
  })
  it('an over-weight launch fails: no points, no grant, the Designer pays', () => {
    const r = debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight).mission!.result!
    expect(r.outcome).toBe('failure')
    expect(r.teamPoints).toBe(0)
    expect(r.grant).toBe(0)
    expect(r.roleScores.designer).toBeLessThanOrEqual(70)
    expect(r.awards.some((a) => a.id === 'effective_decision' && a.role === 'designer')).toBe(false)
    expect(r.awards.some((a) => a.id === 'new_gear')).toBe(false)
  })
  it('a partial success earns 400 points and half the grant', () => {
    const r = debriefOf({ ...wildfire, stations: ['svalbard'] }, 'wildfire', tight).mission!.result!
    expect(r.outcome).toBe('partial')
    expect(r.faults.map((f) => f.code)).toContain('coverage_low')
    expect(r.teamPoints).toBe(400)
    expect(r.grant).toBe(Math.round(360 * r.science / 2))
  })
  it('the Designer alone answers for excess mass, even when the Scientist insisted', () => {
    let s = designGame('fan', 'wildfire', { total: 600, designer: 580, radio: 8 })
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'ir_telescope'] }, P.scientist)
    s = ok(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'Far too heavy' }, P.designer)
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'ir_telescope'] }, P.scientist)
    s = ok(s, { type: 'reviewInstruments', decision: 'accept' }, P.designer)
    // wildfire design without re-requesting instruments: slots, orbit, vehicle, stations
    for (const [slot, option] of [['structure', 'medium'], ['power', 'deploy_solar'], ['battery', 'medium'], ['propulsion', 'none'], ['protection', 'none']] as const) {
      s = ok(s, { type: 'setSlot', slot, option }, P.designer)
    }
    s = ok(s, { type: 'setSlot', slot: 'antenna', option: 'medium' }, P.radio)
    s = ok(s, { type: 'setOrbit', orbit: 'sso' }, P.radio)
    s = ok(s, { type: 'setVehicle', vehicle: 'electron' }, P.designer)
    s = ok(s, { type: 'setStations', stations: ['svalbard', 'kiruna'] }, P.radio)
    for (const role of ['scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'setReady', role, ready: true }, P[role])
    s = ok(s, { type: 'submitPurchase' }, P.designer)
    s = ok(s, { type: 'review', requestId: s.mission!.requests[s.mission!.requests.length - 1].id, decision: 'approve' }, P.planner)
    s = ok(s, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
    for (const role of ['planner', 'scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'vote', role, vote: 'go' }, P[role])
    s = ok(s, { type: 'launch' }, P.planner)
    const blamed = s.mission!.result!.faults.find((f) => f.code === 'over_capacity' || f.code === 'structure_overloaded')!
    expect(blamed.roles).toEqual(['designer'])
    // the same goes for power: a hungry payload is on the craft because the Designer approved it
    const craft = ['over_capacity', 'structure_overloaded', 'power_deficit', 'thin_power_margin', 'battery_short']
    for (const f of s.mission!.result!.faults.filter((x) => craft.includes(x.code))) expect(f.roles).not.toContain('scientist')
  })
  it('keeps every role score between 0 and 100', () => {
    const r = debriefOf({ ...wildfire, vehicle: 'electron', stations: [], battery: 'medium' }, 'wildfire', tight).mission!.result!
    for (const v of Object.values(r.roleScores)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
  it('the result is stored at launch', () => {
    const s = launchFrom(designGame('fan', 'wildfire', tight), wildfire)
    expect(s.mission!.result!.launchMonth).toBe(15)
  })
})
