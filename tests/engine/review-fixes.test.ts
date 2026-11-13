import { ok, err, P, teamGame, soloGame, designGame, applyDesign, allReady, fixture, debriefOf, launchFrom } from './helpers/play'
import { createGame } from '../../src/engine/game'
import { minLaunchCost } from '../../src/engine/spend'
import type { GameState } from '../../src/engine/state'

const wildfire = fixture('fan/wildfire/viable0').design
const lastReq = (s: GameState) => s.mission!.requests[s.mission!.requests.length - 1]

describe('reconnecting (review C1, I3)', () => {
  it('a returning player gets back the roles nobody took in the meantime', () => {
    let s = teamGame()
    s = ok(s, { type: 'setConnected', playerId: P.designer, connected: false }, 'p1')
    s = ok(s, { type: 'join', name: 'Des' }, P.designer)
    expect(s.players.find((p) => p.id === P.designer)!.roles).toEqual(['designer'])
  })
  it('a role someone else claimed stays with them', () => {
    let s = teamGame()
    s = ok(s, { type: 'setConnected', playerId: P.designer, connected: false }, 'p1')
    s = ok(s, { type: 'claimRole', role: 'designer' }, 'p1')
    s = ok(s, { type: 'join', name: 'Des' }, P.designer)
    expect(s.players.find((p) => p.id === P.designer)!.roles).toEqual([])
    expect(s.players.find((p) => p.id === 'p1')!.roles).toContain('designer')
  })
  it('a new device can take a disconnected seat in a full room', () => {
    let s = teamGame()
    expect(err(s, { type: 'join', name: 'New' }, 'c9')).toBe('room_full')
    s = ok(s, { type: 'setConnected', playerId: P.radio, connected: false }, 'p1')
    s = ok(s, { type: 'join', name: 'New' }, 'c9')
    expect(s.players).toHaveLength(4)
    expect(s.players.find((p) => p.id === 'c9')).toMatchObject({ name: 'New', connected: true })
    expect(s.players.some((p) => p.id === P.radio)).toBe(false)
  })
})

describe('budgets that cannot strand a mission (review I1)', () => {
  const planning = () => {
    const s = ok(teamGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)
    return ok(s, { type: 'review', requestId: s.mission!.requests[0].id, decision: 'approve' }, P.planner)
  }
  it('refuses an allocation smaller than the standard equipment already aboard', () => {
    expect(err(planning(), { type: 'setPlan', total: 300, designer: 30, radio: 10, targetMonth: 20, scheduleMode: 'standard' }, P.planner)).toBe('allocation_too_small')
    // rush makes the same equipment 20% dearer: 38 → 45.6
    expect(err(planning(), { type: 'setPlan', total: 300, designer: 40, radio: 10, targetMonth: 20, scheduleMode: 'rush' }, P.planner)).toBe('allocation_too_small')
  })
  it('solo: the total must cover the standard equipment', () => {
    const s = ok(soloGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    expect(err(s, { type: 'setPlan', total: 30, designer: 0, radio: 0, targetMonth: 20, scheduleMode: 'standard' }, 'p1')).toBe('allocation_too_small')
  })
  it('the Planner can top up the mission from campaign funds during design', () => {
    let s = designGame('fan', 'wildfire', { total: 100, designer: 60, radio: 10 })
    s = ok(s, { type: 'topUp', amount: 150 }, P.planner)
    expect(s.mission!.budget).toMatchObject({ total: 250, reserve: 180 })
    expect(err(s, { type: 'topUp', amount: 1800 }, P.planner)).toBe('exceeds_funds')
    expect(err(s, { type: 'topUp', amount: 0 }, P.planner)).toBe('invalid_amount')
    expect(err(s, { type: 'topUp', amount: 10 }, P.designer)).toBe('not_your_role')
  })
  it('solo top-up raises the single budget', () => {
    let s = ok(soloGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    s = ok(s, { type: 'setPlan', total: 100, designer: 0, radio: 0, targetMonth: 20, scheduleMode: 'standard' }, 'p1')
    s = ok(s, { type: 'confirmPlan' }, 'p1')
    expect(err(s, { type: 'setVehicle', vehicle: 'falcon9' }, 'p1')).toBe('over_allocation')
    s = ok(s, { type: 'topUp', amount: 100 }, 'p1')
    expect(ok(s, { type: 'setVehicle', vehicle: 'falcon9' }, 'p1').mission!.design.vehicle).toBe('falcon9')
  })
  it('knows the cheapest mission that can launch at each difficulty', () => {
    expect(minLaunchCost('fan', [])).toBe(144) // 151 × 0.95 (Careful), rounded up
    expect(minLaunchCost('nerd', [])).toBeLessThan(144)
    expect(minLaunchCost('expert', [])).toBeLessThanOrEqual(minLaunchCost('nerd', []))
  })
  it('the campaign ends when the funds cannot pay for any launch', () => {
    let s = debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 })
    s = { ...s, campaign: { ...s.campaign, funds: 120 } }
    expect(ok(s, { type: 'finishDebrief' }, P.radio).phase).toBe('campaign_over')
    s = { ...s, campaign: { ...s.campaign, funds: 144 } }
    expect(ok(s, { type: 'finishDebrief' }, P.radio).phase).toBe('campaign')
  })
})

describe('the two-appeal cap cannot be side-stepped (review I7)', () => {
  it('re-proposing a rejected objective counts as an appeal', () => {
    let s = ok(teamGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)
    for (let i = 0; i < 2; i++) {
      s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
      s = ok(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'again' }, P.scientist)
      expect(lastReq(s).appeals).toBe(i + 1)
    }
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
    expect(err(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'again' }, P.scientist)).toBe('objective_rejected')
  })
  it('a detour through another objective does not reset the count', () => {
    let s = ok(teamGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
    s = ok(s, { type: 'proposeObjective', objectiveId: 'telescope', pitch: 'y' }, P.scientist)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
    s = ok(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)
    expect(lastReq(s).appeals).toBe(1)
  })
  it('asking again for the same money after the appeals ran out is refused; asking for less is a new request', () => {
    let s = ok(designGame(), { type: 'requestFunds', from: 'designer', target: 'designer', amount: 50, reason: 'x' }, P.designer)
    const id = lastReq(s).id
    for (let i = 0; i < 3; i++) {
      s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'no' }, P.planner)
      if (i < 2) s = ok(s, { type: 'appeal', requestId: id, reason: 'please' }, P.designer)
    }
    expect(err(s, { type: 'requestFunds', from: 'designer', target: 'designer', amount: 50, reason: 'x' }, P.designer)).toBe('appeals_exhausted')
    s = ok(s, { type: 'requestFunds', from: 'designer', target: 'designer', amount: 20, reason: 'smaller' }, P.designer)
    expect(lastReq(s)).toMatchObject({ amount: 20, appeals: 0, status: 'pending' })
  })
  it('a rejected purchase order cannot be withdrawn and resubmitted', () => {
    let s = allReady(applyDesign(designGame(), wildfire))
    s = ok(s, { type: 'submitPurchase' }, P.designer)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
    expect(err(s, { type: 'withdraw', requestId: lastReq(s).id }, P.designer)).toBe('use_appeal')
  })
})

describe('smaller rule fixes from the review', () => {
  it('re-selecting the part already chosen during the poll changes nothing', () => {
    let s = allReady(applyDesign(designGame(), wildfire))
    s = ok(s, { type: 'submitPurchase' }, P.designer)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'approve' }, P.planner)
    s = ok(s, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
    s = ok(s, { type: 'vote', role: 'radio', vote: 'go' }, P.radio)
    for (const a of [
      { type: 'setSlot', slot: 'battery', option: 'medium' }, { type: 'setVehicle', vehicle: 'pslv' },
    ] as const) s = ok(s, a, P.designer)
    s = ok(s, { type: 'setOrbit', orbit: 'sso' }, P.radio)
    s = ok(s, { type: 'setStations', stations: ['svalbard', 'kiruna'] }, P.radio)
    expect(s.phase).toBe('go_poll')
    expect(s.mission!.votes).toEqual({ radio: 'go' })
  })
  it('an approved purchase from before a return to design no longer counts against the Planner', () => {
    let s = allReady(applyDesign(designGame('fan', 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 }), wildfire))
    s = ok(s, { type: 'submitPurchase' }, P.designer)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'approve' }, P.planner)
    s = ok(s, { type: 'setSlot', slot: 'battery', option: 'large' }, P.designer) // back to design
    expect(s.mission!.requests.filter((r) => r.kind === 'purchase').map((r) => r.status)).toEqual(['closed'])
  })
  it('only the Radio Operator, who presents the debrief, can close it', () => {
    const s = debriefOf(wildfire, 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 })
    expect(err(s, { type: 'finishDebrief' }, P.scientist)).toBe('not_your_role')
    expect(ok(s, { type: 'finishDebrief' }, P.radio).phase).toBe('campaign')
  })
  it('a malformed chat message is refused, not thrown', () => {
    const s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'A' })
    expect(err(s, { type: 'chat', text: 42 as unknown as string }, 'p1')).toBe('empty_message')
    expect(err(s, { type: 'chat', text: undefined as unknown as string }, 'p1')).toBe('empty_message')
  })
  it('buying the stations the data needs is not scored as over-buying', () => {
    const tel = fixture('fan/telescope/viable0')
    const s = launchFrom(designGame('fan', 'telescope', { total: 1100, designer: 1000, radio: 40, targetMonth: 40 }), tel.design)
    expect(s.mission!.report!.outcome).toBe('success')
    expect(s.mission!.result!.roleScores.radio).toBeGreaterThanOrEqual(90)
  })
  it('asking for funds is not itself a mark against the Designer', () => {
    let s = designGame('fan', 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 })
    s = ok(s, { type: 'requestFunds', from: 'designer', target: 'designer', amount: 5, reason: 'margin' }, P.designer)
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'reject', reason: 'no' }, P.planner)
    s = ok(s, { type: 'withdraw', requestId: lastReq(s).id }, P.designer)
    const withAsk = launchFrom(s, wildfire).mission!.result!.roleScores.designer
    const without = launchFrom(designGame('fan', 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 }), wildfire).mission!.result!.roleScores.designer
    expect(withAsk).toBe(without)
  })
})
