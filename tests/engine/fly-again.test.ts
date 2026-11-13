import { debriefOf, fixture, ok, P } from './helpers/play'
import type { GameState } from '../../src/engine/state'
import { completeDesign } from '../../src/engine/spend'

const wildfire = fixture('fan/wildfire/viable0').design
const plan = { total: 300, designer: 200, radio: 10, targetMonth: 20, scheduleMode: 'careful' as const }
const flown = (design = wildfire) => ok(debriefOf(design, 'wildfire', plan), { type: 'finishDebrief' }, P.radio)
const again = (s: GameState) => ok(s, { type: 'nextMission', flyAgain: true }, P.planner)

describe('fly again with fixes keeps the previous mission as it was', () => {
  it('goes straight back to the design with the same objective, budget split and schedule', () => {
    const before = flown({ ...wildfire, vehicle: 'electron' })
    const s = again(before)
    expect(s.phase).toBe('design')
    const m = s.mission!
    expect(m.objectiveId).toBe('wildfire')
    expect(m.budget).toMatchObject({ total: 300, designer: 200, radio: 10, reserve: 90 })
    expect(m.scheduleMode).toBe('careful')
    // same lead time as before (target was month 20 from a start at month 0), counted from today
    expect(m.targetMonth).toBe(before.campaign.month + 20)
  })
  it('every part of the old design is still there', () => {
    const s = again(flown({ ...wildfire, vehicle: 'electron' }))
    // (standard equipment is filled in by the game, so compare the complete spacecraft)
    expect(completeDesign(s.mission!, 'fan')).toEqual({ ...wildfire, vehicle: 'electron' })
    expect(s.mission!.instrumentStatus).toBe('accepted')
    expect(s.mission!.instrumentRequest).toEqual(wildfire.instruments)
  })
  it('money the Planner added during the first flight is kept in the split', () => {
    // first flight: Designer asked for and got 40 more
    let s = debriefOf(wildfire, 'wildfire', plan)
    s = { ...s, mission: { ...s.mission!, budget: { ...s.mission!.budget, designer: 240, reserve: 50 } } }
    s = again(ok(s, { type: 'finishDebrief' }, P.radio))
    expect(s.mission!.budget).toMatchObject({ total: 300, designer: 240, radio: 10, reserve: 50 })
  })
  it('only the fix is needed before launching again', () => {
    let s = again(flown({ ...wildfire, vehicle: 'electron' }))
    s = ok(s, { type: 'setVehicle', vehicle: 'pslv' }, P.designer)
    for (const role of ['scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'setReady', role, ready: true }, P[role])
    expect(s.phase).toBe('integration')
  })
  it('when the campaign can no longer afford the same budget, the Planner re-plans from the old numbers', () => {
    let s = flown({ ...wildfire, vehicle: 'electron' })
    s = { ...s, campaign: { ...s.campaign, funds: 250 } }
    s = again(s)
    expect(s.phase).toBe('planning')
    expect(s.mission!.suggestedPlan).toMatchObject({ total: 300, designer: 200, radio: 10, scheduleMode: 'careful' })
    expect(s.mission!.objectiveId).toBe('wildfire')
  })
  it('a new mission starts from scratch', () => {
    const s = ok(flown(), { type: 'nextMission', flyAgain: false }, P.planner)
    expect(s.phase).toBe('objective_proposal')
    expect(s.mission!.design).toEqual({})
    expect(s.mission!.suggestedPlan).toBeUndefined()
  })
})
