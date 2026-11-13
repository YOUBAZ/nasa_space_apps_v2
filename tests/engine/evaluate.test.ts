import fixtures from '../fixtures/reference-designs.json'
import { evaluateDesign, coverage, liveTotals } from '../../src/engine/evaluate'
import type { Design, Difficulty, ObjectiveId } from '../../src/engine/types'

type Fx = { name: string; diff: Difficulty; objective: ObjectiveId; design: Design; expect: {
  outcome: string; faults: string[]; mass: number; cost: number; science: number; downlink: number
  coverage: number; life: number; powerDraw: number; powerGen: number } }
const all = fixtures as unknown as Fx[]
const byName = (n: string) => all.find((f) => f.name === n)!

describe('evaluateDesign — oracle parity', () => {
  it('has the full fixture set', () => expect(all.length).toBe(90))
  it.each(all.map((f) => [f.name, f] as const))('%s', (_n, f) => {
    const r = evaluateDesign(f.design, f.objective, f.diff)
    expect(r.outcome).toBe(f.expect.outcome)
    expect(r.faults.map((x) => x.code).sort()).toEqual(f.expect.faults)
    expect(r.mass).toBe(f.expect.mass)
    expect(r.cost).toBe(f.expect.cost)
    expect(r.science).toBeCloseTo(f.expect.science, 6)
    expect(r.downlink).toBeCloseTo(f.expect.downlink, 6)
    expect(r.coverage).toBeCloseTo(f.expect.coverage, 6)
    expect(r.lifeYears).toBeCloseTo(f.expect.life, 6)
    expect(r.powerDraw).toBe(f.expect.powerDraw)
    expect(r.powerGen).toBeCloseTo(f.expect.powerGen, 6)
  })
})

describe('evaluateDesign — single rules', () => {
  const base = byName('fan/wildfire/viable0')
  it('GEO with two stations wastes one', () => {
    const d: Design = { ...base.design, orbit: 'geo', stations: ['kiruna', 'wallops'], vehicle: 'falcon9' }
    const r = evaluateDesign(d, 'wildfire', 'fan')
    expect(r.coverage).toBe(1)
    expect(r.faults).toContainEqual({ severity: 'minor', code: 'wasted_stations', roles: ['radio'] })
  })
  it('Svalbard cannot see GEO', () => {
    expect(coverage('geo', ['svalbard'], 'x')).toBe(0)
    const d: Design = { ...base.design, orbit: 'geo', stations: ['svalbard'], vehicle: 'falcon9' }
    expect(evaluateDesign(d, 'wildfire', 'fan').faults.map((f) => f.code)).toContain('no_station_in_view')
  })
  it('Ka-band loses 30% at rainy stations', () => {
    expect(coverage('leo', ['singapore'], 'ka')).toBeCloseTo(0.049, 6)
    expect(coverage('leo', ['singapore'], 'x')).toBeCloseTo(0.07, 6)
  })
  it('a solar Mars lander with a small battery freezes overnight (critical)', () => {
    const lander = byName('expert/mars_scout/viable0')
    const r = evaluateDesign({ ...lander.design, battery: 'small' }, 'mars_scout', 'expert')
    expect(r.faults).toContainEqual({ severity: 'critical', code: 'battery_short', roles: ['designer'] })
    expect(r.outcome).toBe('failure')
  })
  it('Jupiter without radiation shielding is fried', () => {
    const j = byName('expert/jupiter/viable0')
    const r = evaluateDesign({ ...j.design, protection: 'none' }, 'jupiter', 'expert')
    expect(r.faults.map((f) => f.code)).toContain('radiation_fried')
  })
  it('schedule mode scales cost and development time', () => {
    const std = evaluateDesign(base.design, 'wildfire', 'fan')
    expect(std.devMonths).toBe(15) // slowest item 9 + 6 integration
    const careful = evaluateDesign(base.design, 'wildfire', 'fan', { scheduleMode: 'careful' })
    expect(careful.devMonths).toBe(19) // ceil(15 × 1.25)
    expect(careful.cost).toBe(170) // round(179 × 0.95)
    const rush = evaluateDesign(base.design, 'wildfire', 'fan', { scheduleMode: 'rush' })
    expect(rush.devMonths).toBe(12) // ceil(15 × 0.75)
    expect(rush.cost).toBe(215) // round(179 × 1.2)
  })
  it('careful mode forgives the first minor fault', () => {
    const d: Design = { ...base.design, orbit: 'geo', stations: ['kiruna', 'wallops'], vehicle: 'falcon9' }
    const r = evaluateDesign(d, 'wildfire', 'fan', { scheduleMode: 'careful' })
    expect(r.faults.map((f) => f.code)).not.toContain('wasted_stations')
  })
  it('unlocked gear raises the science ceiling', () => {
    const d = byName('expert/crops/viable0').design
    const before = evaluateDesign(d, 'crops', 'expert').science
    const after = evaluateDesign(d, 'crops', 'expert', { unlocked: ['hyperspectral'] }).science
    expect(after).toBeLessThan(before)
  })
})

describe('liveTotals', () => {
  it('tolerates a half-built design', () => {
    const t = liveTotals({ structure: 'medium', instruments: ['thermal_ir'] })
    expect(t).toEqual({ mass: 445, powerDraw: 50, powerGen: 0, cost: 70, dataGenerated: 20 })
  })
  it('scales solar by destination sunlight', () => {
    expect(liveTotals({ power: 'deploy_solar', orbit: 'mars_orbit' }).powerGen).toBeCloseTo(1075, 6)
  })
})
