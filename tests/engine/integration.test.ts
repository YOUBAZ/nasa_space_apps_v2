import { ok, err, P, designGame, applyDesign, allReady, fixture } from './helpers/play'
import type { GameState } from '../../src/engine/state'

const wildfire = fixture('fan/wildfire/viable0').design
const lastReq = (s: GameState) => s.mission!.requests[s.mission!.requests.length - 1]
const integration = (plan = {}) => allReady(applyDesign(designGame('fan', 'wildfire', plan), wildfire))
const approvedPurchase = (s0: GameState) => {
  const s = ok(s0, { type: 'submitPurchase' }, P.designer)
  return ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'approve' }, P.planner)
}
const paired = (s0: GameState) => {
  const s = ok(s0, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
  return ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
}
const goPoll = (plan = {}) => paired(approvedPurchase(integration(plan)))
const allGo = (s0: GameState) => {
  let s = s0
  for (const role of ['planner', 'scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'vote', role, vote: 'go' }, P[role])
  return s
}

describe('integration', () => {
  it('needs both the pairing lock and an approved purchase', () => {
    let s = integration()
    s = approvedPurchase(s)
    expect(s.phase).toBe('integration')
    s = ok(s, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
    expect(s.phase).toBe('integration')
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
    expect(s.phase).toBe('go_poll')
  })
  it('the purchase order carries the full bill', () => {
    const s = ok(integration(), { type: 'submitPurchase' }, P.designer)
    expect(lastReq(s)).toMatchObject({ kind: 'purchase', from: 'designer', amount: 179, status: 'pending' })
    expect(err(s, { type: 'submitPurchase' }, P.designer)).toBe('request_open')
  })
  it('un-agreeing the pairing sends everyone back to design', () => {
    let s = paired(integration())
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: false }, P.radio)
    expect(s.phase).toBe('design')
    expect(s.mission!.pairing).toEqual({ designer: false, radio: false })
    expect(s.mission!.ready).toEqual({ scientist: false, designer: false, radio: false })
  })
  it('editing design after purchase approval clears approval', () => {
    let s = approvedPurchase(integration())
    expect(s.mission!.purchaseApproved).toBe(true)
    s = ok(s, { type: 'setSlot', slot: 'battery', option: 'large' }, P.designer)
    expect(s.phase).toBe('design')
    expect(s.mission!.purchaseApproved).toBe(false)
  })
  it('a rejected purchase can be appealed twice', () => {
    let s = ok(integration(), { type: 'submitPurchase' }, P.designer)
    const id = lastReq(s).id
    for (let i = 0; i < 3; i++) {
      s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'Too much' }, P.planner)
      if (i < 2) s = ok(s, { type: 'appeal', requestId: id, reason: 'Needed' }, P.designer)
    }
    expect(err(s, { type: 'appeal', requestId: id, reason: 'x' }, P.designer)).toBe('appeals_exhausted')
    expect(err(s, { type: 'submitPurchase' }, P.designer)).toBe('purchase_rejected')
    s = ok(s, { type: 'setSlot', slot: 'battery', option: 'large' }, P.designer)
    expect(s.phase).toBe('design')
  })
})

describe('go / no-go poll', () => {
  it('a no-go returns to design and keeps accepted instruments and approved funding', () => {
    let s = goPoll()
    s = ok(s, { type: 'vote', role: 'scientist', vote: 'go' }, P.scientist)
    s = ok(s, { type: 'vote', role: 'radio', vote: 'nogo' }, P.radio)
    expect(s.phase).toBe('design')
    expect(s.mission!.votes).toEqual({})
    expect(s.mission!.purchaseApproved).toBe(false)
    expect(s.mission!.design.instruments).toEqual(['thermal_ir'])
    expect(s.mission!.instrumentStatus).toBe('accepted')
  })
  it('launch needs four go votes and the Planner', () => {
    let s = goPoll()
    expect(err(s, { type: 'launch' }, P.planner)).toBe('votes_missing')
    s = allGo(s)
    expect(err(s, { type: 'launch' }, P.designer)).toBe('not_your_role')
    expect(ok(s, { type: 'launch' }, P.planner).phase).toBe('launch')
  })
  it('you vote only for roles you hold', () => {
    expect(err(goPoll(), { type: 'vote', role: 'planner', vote: 'go' }, P.radio)).toBe('not_your_role')
  })
})

describe('launch', () => {
  it('deducts exactly the mission cost and stores the report', () => {
    const s = ok(allGo(goPoll()), { type: 'launch' }, P.planner)
    expect(s.mission!.report!.cost).toBe(179)
    expect(s.mission!.totalCost).toBe(179)
    expect(s.campaign.funds).toBe(2000 - 179)
    expect(s.mission!.report!.outcome).toBe('success')
    expect(s.mission!.launchMonth).toBe(15)
  })
  it('flags a large unused allocation against the Planner', () => {
    const s = ok(allGo(goPoll({ total: 600, designer: 400, radio: 50 })), { type: 'launch' }, P.planner)
    expect(s.mission!.report!.faults).toContainEqual({ severity: 'minor', code: 'unused_allocation', roles: ['planner'] })
    expect(s.mission!.report!.outcome).toBe('success')
  })
  it('flags a schedule overrun when ready after the target month', () => {
    const s = ok(allGo(goPoll({ targetMonth: 10 })), { type: 'launch' }, P.planner)
    expect(s.mission!.report!.faults.map((f) => f.code)).toContain('schedule_overrun')
  })
  it('a Mars mission that misses the window waits and pays', () => {
    // infrared telescope takes 24 months + 6 integration = ready at month 30; windows at 26, 52, …
    const d = { ...fixture('fan/mars_ice/viable0').design, instruments: ['gpr', 'ir_telescope'] as const }
    let s = designGame('fan', 'mars_ice', { total: 1500, designer: 1300, radio: 100, targetMonth: 30 })
    s = allReady(applyDesign(s, { ...d, instruments: [...d.instruments], structure: 'large', vehicle: 'falcon_hvy' }))
    s = ok(allGo(paired(approvedPurchase(s))), { type: 'launch' }, P.planner)
    const m = s.mission!
    expect(m.readyMonth).toBe(30)
    expect(m.launchMonth).toBe(52)
    expect(m.waitMonths).toBe(22)
    expect(m.waitCost).toBe(88)
    expect(m.totalCost).toBe(m.report!.cost + 88)
    expect(m.report!.faults.map((f) => f.code)).toContain('missed_mars_window')
  })
  it('a waited-for backorder delays the launch by six months', () => {
    let s = designGame('nerd', 'wildfire', { total: 800, designer: 600, radio: 50, targetMonth: 40 })
    const b = s.mission!.backorders[0]
    const d = { ...fixture('nerd/wildfire/viable0').design, [b.slot]: b.option }
    s = ok(s, { type: 'resolveBackorder', id: b.id, choice: 'wait' }, P.planner)
    s = ok(allGo(paired(approvedPurchase(allReady(applyDesign(s, d))))), { type: 'launch' }, P.planner)
    expect(s.mission!.readyMonth).toBe(s.mission!.report!.devMonths + 6)
  })
  it('the Radio Operator advances operations to the debrief', () => {
    let s = ok(allGo(goPoll()), { type: 'launch' }, P.planner)
    expect(err(s, { type: 'advanceOps' }, P.planner)).toBe('not_your_role')
    s = ok(s, { type: 'advanceOps' }, P.radio)
    expect(s.phase).toBe('operations')
    s = ok(s, { type: 'advanceOps' }, P.radio)
    expect(s.phase).toBe('debrief')
  })
  it('a rocket that never reaches orbit skips operations', () => {
    let s = designGame()
    s = allReady(applyDesign(s, { ...wildfire, vehicle: 'electron' }))
    s = ok(allGo(paired(approvedPurchase(s))), { type: 'launch' }, P.planner)
    expect(s.mission!.report!.outcome).toBe('failure')
    expect(ok(s, { type: 'advanceOps' }, P.radio).phase).toBe('debrief')
  })
})
