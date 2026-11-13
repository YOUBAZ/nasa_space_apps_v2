import { flightPlan, storyOf, JOURNEY, STORY_ORDER } from '../../src/engine/flight'
import { evaluateDesign } from '../../src/engine/evaluate'
import { fixture } from './helpers/play'
import type { Design, Fault, FaultCode, ObjectiveId } from '../../src/engine/types'

const plan = (name: string, change: Partial<Design> = {}, objective?: ObjectiveId) => {
  const f = fixture(name)
  const d = { ...f.design, ...change } as Design
  return flightPlan(d, evaluateDesign(d, objective ?? f.objective, f.diff))
}
const crit = (code: FaultCode): Fault => ({ severity: 'critical', code, roles: ['designer'] })

describe('flight plan: timing follows distance and design', () => {
  it('the farther the destination, the longer the trip and the longer its animation', () => {
    const order = ['leo', 'geo', 'lunar', 'l2', 'mars_orbit', 'asteroid', 'jupiter'] as const
    for (let i = 1; i < order.length; i++) {
      expect(JOURNEY[order[i]].distanceKm).toBeGreaterThan(JOURNEY[order[i - 1]].distanceKm)
      expect(JOURNEY[order[i]].travelDays).toBeGreaterThan(JOURNEY[order[i - 1]].travelDays)
    }
    const near = plan('fan/wildfire/viable0')
    const mars = plan('fan/mars_ice/viable0')
    const jup = plan('expert/jupiter/viable0')
    expect(near.anim.cruise).toBeLessThan(mars.anim.cruise)
    expect(mars.anim.cruise).toBeLessThan(jup.anim.cruise)
    expect(near.travelDays).toBeLessThan(0.02) // minutes to a low orbit
    expect(mars.travelDays).toBeGreaterThan(150) // months to Mars
    expect(jup.travelDays).toBeGreaterThan(1200) // years to Jupiter
    expect(jup.anim.cruise).toBeLessThanOrEqual(26) // still watchable
  })
  it('real numbers: Mars is about 12.5 light-minutes away, a low orbit a fraction of a second', () => {
    expect(plan('fan/mars_ice/viable0').lightDelaySeconds).toBeCloseTo(750, -1)
    expect(plan('fan/wildfire/viable0').lightDelaySeconds).toBeLessThan(0.01)
  })
  it('a rocket loaded close to its limit climbs more slowly than one with room to spare', () => {
    const light = plan('fan/wildfire/viable0', { vehicle: 'falcon_hvy' })
    const heavy = plan('fan/wildfire/viable0', { vehicle: 'pslv' })
    expect(heavy.load).toBeGreaterThan(light.load)
    expect(heavy.ascentSeconds).toBeGreaterThan(light.ascentSeconds)
    expect(heavy.anim.ascent).toBeGreaterThan(light.anim.ascent)
    expect(light.ascentSeconds).toBeGreaterThanOrEqual(130)
    expect(heavy.ascentSeconds).toBeLessThanOrEqual(220)
  })
  it('spare rocket capacity shortens the trip; an ion engine lengthens it', () => {
    const base = plan('expert/mars_ice/viable0')
    expect(plan('expert/mars_ice/viable0', { vehicle: 'falcon_hvy' }).travelDays).toBeLessThan(base.travelDays)
    const ion = flightPlan({ ...fixture('expert/mars_ice/viable0').design, propulsion: 'ion', power: 'large_solar' } as Design,
      evaluateDesign({ ...fixture('expert/mars_ice/viable0').design, propulsion: 'ion', power: 'large_solar' } as Design, 'mars_ice', 'expert', { unlocked: ['ion'] }))
    expect(ion.travelDays).toBeGreaterThan(base.travelDays)
  })
})

describe('flight plan: which story the animation tells', () => {
  it('a clean mission is a success; lost science is a partial; both go all the way', () => {
    expect(plan('fan/wildfire/viable0')).toMatchObject({ story: 'success', stage: 'arrival', failAt: 1 })
    expect(plan('fan/wildfire/viable0', { stations: ['svalbard'] })).toMatchObject({ story: 'partial', stage: 'arrival', failAt: 1 })
  })
  it('each of the twelve mission-ending problems has its own story, at the moment it would happen', () => {
    const expected: [FaultCode, 'ascent' | 'cruise' | 'arrival'][] = [
      ['over_capacity', 'ascent'], ['structure_overloaded', 'ascent'], ['vehicle_cannot_reach', 'ascent'],
      ['no_station_in_view', 'cruise'], ['tumbling', 'cruise'], ['power_deficit', 'cruise'], ['no_link', 'cruise'],
      ['no_capture_propulsion', 'arrival'], ['no_landing_kit', 'arrival'], ['radiation_fried', 'arrival'],
      ['battery_short', 'arrival'], ['wrong_destination', 'arrival'],
    ]
    expect(STORY_ORDER.map((s) => [s.code, s.stage])).toEqual(expected)
    for (const [code, stage] of expected) expect(storyOf([crit(code)])).toEqual({ story: code, stage })
    expect(new Set(expected.map(([c]) => c)).size).toBe(12)
  })
  it('with several problems, the one that happens first is shown', () => {
    expect(storyOf([crit('wrong_destination'), crit('no_link'), crit('over_capacity')]).story).toBe('over_capacity')
    expect(storyOf([crit('radiation_fried'), crit('tumbling')]).story).toBe('tumbling')
  })
  it('a short battery only ends the mission when it is the mission-ending kind', () => {
    expect(storyOf([{ severity: 'major', code: 'battery_short', roles: ['designer'] }]).story).toBe('partial')
  })
  it('real designs land on the right story', () => {
    expect(plan('fan/wildfire/viable0', { vehicle: 'electron' }).story).toBe('over_capacity')
    expect(plan('fan/wildfire/viable0', { stations: [] })).toMatchObject({ story: 'no_station_in_view', stage: 'cruise' })
    expect(plan('fan/mars_ice/viable0', { propulsion: 'none' })).toMatchObject({ story: 'no_capture_propulsion', stage: 'arrival' })
    expect(plan('expert/jupiter/viable0', { protection: 'none' }).story).toBe('radiation_fried')
    expect(plan('expert/mars_scout/viable0', { protection: 'none' }).story).toBe('no_landing_kit')
    expect(plan('expert/mars_scout/viable0', { battery: 'small' }).story).toBe('battery_short')
    expect(plan('fan/mars_ice/viable0', { antenna: 'medium' }).story).toBe('no_link')
    expect(plan('expert/mars_ice/viable0', { attitude: 'magnetorquer' }).story).toBe('tumbling')
    expect(plan('expert/jupiter/viable0', { power: 'deploy_solar' }).story).toBe('power_deficit')
    expect(plan('fan/wildfire/viable0', { orbit: 'lunar', vehicle: 'electron' }).story).toBe('vehicle_cannot_reach')
    expect(plan('fan/wildfire/viable0', { orbit: 'l2', vehicle: 'falcon_hvy', stations: ['goldstone'], antenna: 'dsa' }).story).toBe('wrong_destination')
  })
  it('a failure happens part-way through its stage, never at the very start or after the end', () => {
    for (const s of STORY_ORDER) {
      const p = plan('fan/wildfire/viable0')
      const f = flightPlan(fixture('fan/wildfire/viable0').design, { ...evaluateDesign(fixture('fan/wildfire/viable0').design, 'wildfire', 'fan'), faults: [crit(s.code)], outcome: 'failure' })
      expect(f.failAt).toBeGreaterThan(0.05)
      expect(f.failAt).toBeLessThan(1)
      expect(f.anim.ascent).toBe(p.anim.ascent)
    }
  })
  it('solar power fades with distance: the farther the Sun-starved craft gets, the later it dies', () => {
    const jup = plan('expert/jupiter/viable0', { power: 'large_solar', instruments: ['magnetometer', 'radiation', 'gpr', 'hires_cam'] })
    expect(jup.story).toBe('power_deficit')
    expect(jup.failAt).toBeGreaterThan(0.3) // it worked near Earth and died on the way out
    expect(jup.sunAtDestination).toBeCloseTo(0.04, 5)
  })
})
