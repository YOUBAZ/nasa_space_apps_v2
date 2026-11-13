import { debriefOf, fixture, ok, err, P } from './helpers/play'
import { badgesFor, makePatch, rankOf, xpFor } from '../../src/engine/gamify'
import type { GameState } from '../../src/engine/state'

const wildfire = fixture('fan/wildfire/viable0').design
const tight = { total: 220, designer: 200, radio: 8, targetMonth: 18 }
const finish = (s: GameState) => ok(s, { type: 'finishDebrief' }, P.radio)

describe('campaign flow', () => {
  it('a success pays the grant, unlocks gear, and advances the calendar', () => {
    const s = finish(debriefOf(wildfire, 'wildfire', tight))
    expect(s.phase).toBe('campaign')
    expect(s.campaign.funds).toBe(2000 - 179 + 186)
    expect(s.campaign.launches).toBe(1)
    expect(s.campaign.month).toBe(15)
    expect(s.campaign.unlocked).toEqual(['hga'])
    expect(s.campaign.history).toHaveLength(1)
    expect(s.campaign.patches).toHaveLength(1)
    expect(s.players.every((p) => p.xp > 0)).toBe(true)
  })
  it('a first failure earns the Rapid Unscheduled Disassembly badge', () => {
    const s = finish(debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight))
    expect(s.players[0].badges).toContain('rapid_unscheduled_disassembly')
    expect(s.campaign.unlocked).toEqual([])
    expect(s.campaign.funds).toBe(2000 - 157)
  })
  it('fly again re-uses the objective and design, and a success after a failure is a comeback', () => {
    let s = finish(debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight))
    expect(err(s, { type: 'nextMission', flyAgain: true }, P.designer)).toBe('not_your_role')
    s = ok(s, { type: 'nextMission', flyAgain: true }, P.planner)
    expect(s.phase).toBe('planning')
    expect(s.mission!.objectiveId).toBe('wildfire')
    s = ok(s, { type: 'setPlan', ...tight, targetMonth: 40, scheduleMode: 'standard' }, P.planner)
    s = ok(s, { type: 'confirmPlan' }, P.planner)
    // the old design is pre-filled, including the accepted instruments
    expect(s.mission!.design).toMatchObject({ structure: 'medium', vehicle: 'electron', orbit: 'sso', instruments: ['thermal_ir'] })
    expect(s.mission!.instrumentStatus).toBe('accepted')
    s = ok(s, { type: 'setVehicle', vehicle: 'pslv' }, P.designer)
    for (const role of ['scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'setReady', role, ready: true }, P[role])
    s = ok(s, { type: 'submitPurchase' }, P.designer)
    s = ok(s, { type: 'review', requestId: s.mission!.requests[0].id, decision: 'approve' }, P.planner)
    s = ok(s, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
    for (const role of ['planner', 'scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'vote', role, vote: 'go' }, P[role])
    s = ok(s, { type: 'launch' }, P.planner)
    while (s.phase !== 'debrief') s = ok(s, { type: 'advanceOps' }, P.radio)
    s = finish(s)
    expect(s.players[0].badges).toEqual(expect.arrayContaining(['rapid_unscheduled_disassembly', 'comeback_kid']))
    expect(s.campaign.unlocked).toEqual(['hga'])
    expect(s.campaign.launches).toBe(2)
  })
  it('a pre-filled design is trimmed to fit a smaller budget', () => {
    let s = finish(debriefOf(wildfire, 'wildfire', tight))
    s = ok(s, { type: 'nextMission', flyAgain: true }, P.planner)
    s = ok(s, { type: 'setPlan', total: 150, designer: 100, radio: 3, targetMonth: 40, scheduleMode: 'standard' }, P.planner)
    s = ok(s, { type: 'confirmPlan' }, P.planner)
    expect(s.mission!.design.stations).toEqual(['svalbard'])
    expect(s.mission!.design.vehicle).toBeUndefined()
  })
  it('a new mission starts fresh at the objective proposal', () => {
    let s = finish(debriefOf(wildfire, 'wildfire', tight))
    s = ok(s, { type: 'nextMission', flyAgain: false }, P.planner)
    expect(s.phase).toBe('objective_proposal')
    expect(s.mission!.design).toEqual({})
    expect(s.mission!.requests).toEqual([])
  })
  it('the campaign ends when the money runs out', () => {
    let s = debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight)
    s = { ...s, campaign: { ...s.campaign, funds: 40 } }
    s = finish(s)
    expect(s.phase).toBe('campaign_over')
    expect(err(s, { type: 'nextMission', flyAgain: false }, P.planner)).toBe('wrong_phase')
  })
  it('the campaign ends after five launches', () => {
    let s = debriefOf(wildfire, 'wildfire', tight)
    s = { ...s, campaign: { ...s.campaign, launches: 4 } }
    expect(finish(s).phase).toBe('campaign_over')
  })
  it('the debrief can only be finished once', () => {
    const s = finish(debriefOf(wildfire, 'wildfire', tight))
    expect(err(s, { type: 'finishDebrief' }, P.radio)).toBe('wrong_phase')
  })
  it('unlocked gear becomes selectable', () => {
    let s = finish(debriefOf(wildfire, 'wildfire', tight))
    s = ok(s, { type: 'nextMission', flyAgain: true }, P.planner)
    s = ok(s, { type: 'setPlan', ...tight, targetMonth: 40, scheduleMode: 'standard' }, P.planner)
    s = ok(s, { type: 'confirmPlan' }, P.planner)
    expect(ok(s, { type: 'setSlot', slot: 'antenna', option: 'hga' }, P.radio).mission!.design.antenna).toBe('hga')
  })
})

describe('gamification', () => {
  it('ranks by XP', () => {
    expect(xpFor(87)).toBe(87)
    expect(rankOf(0)).toBe('cadet')
    expect(rankOf(299)).toBe('cadet')
    expect(rankOf(300)).toBe('flight_engineer')
    expect(rankOf(800)).toBe('mission_specialist')
    expect(rankOf(1500)).toBe('flight_director')
  })
  it('a player with several roles earns the average of their role scores', () => {
    let s = debriefOf(wildfire, 'wildfire', tight)
    const scores = s.mission!.result!.roleScores
    s = finish(s)
    expect(s.players.find((p) => p.id === P.designer)!.xp).toBe(scores.designer)
  })
  it('awards badges for thrift, one-station GEO and a first failure', () => {
    const r = debriefOf(wildfire, 'wildfire', tight).mission!.result!
    expect(badgesFor([], r, wildfire)).toContain('penny_pincher')
    expect(badgesFor([], { ...r, outcome: 'success' }, { ...wildfire, orbit: 'geo', stations: ['kiruna'] })).toContain('one_station_wonder')
    expect(badgesFor([], { ...r, outcome: 'failure', awards: [] }, wildfire)).toEqual(['rapid_unscheduled_disassembly'])
    expect(badgesFor([{ ...r, outcome: 'failure' }], { ...r, outcome: 'failure', awards: [] }, wildfire)).toEqual([])
    expect(badgesFor([], { ...r, outcome: 'success' }, { ...wildfire, orbit: 'mars_surf' })).toContain('nailed_the_landing')
  })
  it('patches are deterministic and use theme colours', () => {
    const a = makePatch(5, 'wildfire', 'Team Pat', 'success')
    expect(makePatch(5, 'wildfire', 'Team Pat', 'success')).toEqual(a)
    expect(a.colorA).toMatch(/^#[0-9a-f]{6}$/)
    expect(a.colorA).not.toBe(a.colorB)
    expect(a.teamName).toBe('Team Pat')
  })
})
