import { ok, err, P, designGame, applyDesign, allReady, fixture, soloGame } from './helpers/play'
import { spendOf } from '../../src/engine/spend'
import type { GameState } from '../../src/engine/state'

const wildfire = fixture('fan/wildfire/viable0').design
const lastReq = (s: GameState) => s.mission!.requests[s.mission!.requests.length - 1]

describe('design choices and hard caps', () => {
  it('standard equipment counts from the start', () => {
    // Fan auto slots: computer 12 + attitude 15 + thermal 5 + storage 3 + X-band 3
    expect(spendOf(designGame(), 'designer')).toBe(38)
  })
  it('totals the Designer and Radio spend of a full design', () => {
    const s = applyDesign(designGame(), wildfire)
    expect(spendOf(s, 'designer')).toBe(173)
    expect(spendOf(s, 'radio')).toBe(6)
  })
  it('refuses a pick that would break the allocation', () => {
    const s = designGame('fan', 'wildfire', { designer: 100 })
    expect(err(s, { type: 'setSlot', slot: 'structure', option: 'large' }, P.designer)).toBe('over_allocation')
    expect(ok(s, { type: 'setSlot', slot: 'structure', option: 'medium' }, P.designer).mission!.design.structure).toBe('medium')
  })
  it("the Radio Operator's antenna is paid from the Designer's allocation", () => {
    const s = designGame('fan', 'wildfire', { designer: 60 })
    expect(err(s, { type: 'setSlot', slot: 'antenna', option: 'dsa' }, P.radio)).toBe('over_allocation')
  })
  it('rush mode makes everything 20% dearer', () => {
    const s = applyDesign(designGame('fan', 'wildfire', { scheduleMode: 'rush' }), wildfire)
    expect(spendOf(s, 'designer')).toBeCloseTo(207.6, 6)
  })
  it('each slot belongs to one role', () => {
    const s = designGame()
    expect(err(s, { type: 'setSlot', slot: 'structure', option: 'medium' }, P.scientist)).toBe('not_your_role')
    expect(err(s, { type: 'setSlot', slot: 'antenna', option: 'medium' }, P.designer)).toBe('not_your_role')
    expect(err(s, { type: 'setOrbit', orbit: 'sso' }, P.designer)).toBe('not_your_role')
    expect(err(s, { type: 'setVehicle', vehicle: 'pslv' }, P.radio)).toBe('not_your_role')
  })
  it('only offers what the difficulty and unlocks allow', () => {
    expect(err(designGame('fan'), { type: 'setSlot', slot: 'structure', option: 'small' }, P.designer)).toBe('unavailable')
    expect(err(designGame('fan'), { type: 'setSlot', slot: 'computer', option: 'basic' }, P.designer)).toBe('unavailable')
    expect(err(designGame('expert'), { type: 'setSlot', slot: 'band', option: 'ka' }, P.radio)).toBe('unavailable')
    expect(err(designGame('fan'), { type: 'setVehicle', vehicle: 'vulcan' }, P.designer)).toBe('unavailable')
    expect(err(designGame('fan'), { type: 'setOrbit', orbit: 'jupiter' }, P.radio)).toBe('unavailable')
    expect(err(designGame('fan'), { type: 'setStations', stations: ['kiruna', 'kiruna'] }, P.radio)).toBe('invalid_stations')
  })
})

describe('instrument request and push-back', () => {
  const requested = () => ok(designGame(), { type: 'requestInstruments', list: ['thermal_ir', 'hires_cam'] }, P.scientist)
  it('a request waits for the Designer', () => {
    const s = requested()
    expect(s.mission!.instrumentStatus).toBe('pending')
    expect(s.mission!.design.instruments ?? []).toEqual([])
  })
  it('push-back needs a reason, then the resend is final', () => {
    let s = requested()
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback' }, P.designer)).toBe('reason_required')
    s = ok(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'Too heavy' }, P.designer)
    expect(s.mission!.instrumentStatus).toBe('pushed_back')
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'hires_cam'] }, P.scientist)
    expect(s.mission!.instrumentStatus).toBe('final')
    expect(s.mission!.scientistOverrode).toBe(true)
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'Still heavy' }, P.designer)).toBe('already_final')
    s = ok(s, { type: 'reviewInstruments', decision: 'accept' }, P.designer)
    expect(s.mission!.instrumentStatus).toBe('accepted')
    expect(s.mission!.design.instruments).toEqual(['thermal_ir', 'hires_cam'])
  })
  it('a lighter resend is a compromise, not an override', () => {
    let s = requested()
    s = ok(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'Too heavy' }, P.designer)
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)
    expect(s.mission!.scientistOverrode).toBe(false)
  })
  it('accepting checks the Designer cap', () => {
    let s = designGame('fan', 'wildfire', { designer: 60 })
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'hires_cam'] }, P.scientist)
    expect(err(s, { type: 'reviewInstruments', decision: 'accept' }, P.designer)).toBe('over_allocation')
  })
  it('changing instruments after acceptance re-opens the review', () => {
    let s = ok(requested(), { type: 'reviewInstruments', decision: 'accept' }, P.designer)
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)
    expect(s.mission!.instrumentStatus).toBe('pending')
    expect(s.mission!.design.instruments).toEqual(['thermal_ir', 'hires_cam'])
    s = ok(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'no' }, P.designer)
    expect(s.mission!.instrumentStatus).toBe('pushed_back')
  })
  it('rejects empty, duplicate or unavailable lists', () => {
    const s = designGame()
    expect(err(s, { type: 'requestInstruments', list: [] }, P.scientist)).toBe('invalid_instruments')
    expect(err(s, { type: 'requestInstruments', list: ['thermal_ir', 'thermal_ir'] }, P.scientist)).toBe('invalid_instruments')
    expect(err(s, { type: 'requestInstruments', list: ['drill'] }, P.scientist)).toBe('invalid_instruments')
  })
  it('nothing to review before a request', () => {
    expect(err(designGame(), { type: 'reviewInstruments', decision: 'accept' }, P.designer)).toBe('nothing_to_review')
  })
})

describe('funding requests', () => {
  const ask = (s: GameState, amount = 50) =>
    ok(s, { type: 'requestFunds', from: 'designer', target: 'designer', amount, reason: 'Bigger rocket' }, P.designer)
  it('approval moves money from the reserve', () => {
    let s = ask(designGame())
    s = ok(s, { type: 'review', requestId: lastReq(s).id, decision: 'approve' }, P.planner)
    expect(s.mission!.budget).toMatchObject({ total: 400, designer: 300, radio: 50, reserve: 50 })
  })
  it('cannot approve more than the reserve holds', () => {
    const s = ask(designGame(), 150)
    expect(err(s, { type: 'review', requestId: lastReq(s).id, decision: 'approve' }, P.planner)).toBe('insufficient_reserve')
    expect(lastReq(s).status).toBe('pending')
    expect(s.mission!.budget.reserve).toBe(100)
  })
  it('two appeals, then the requester must choose another option', () => {
    let s = ask(designGame())
    const id = lastReq(s).id
    for (let i = 0; i < 3; i++) {
      s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'no' }, P.planner)
      if (i < 2) s = ok(s, { type: 'appeal', requestId: id, reason: 'please' }, P.designer)
    }
    expect(err(s, { type: 'appeal', requestId: id, reason: 'please' }, P.designer)).toBe('appeals_exhausted')
    expect(s.mission!.budget.designer).toBe(250)
  })
  it('one open request per role at a time', () => {
    const s = ask(designGame())
    expect(err(s, { type: 'requestFunds', from: 'designer', target: 'designer', amount: 10, reason: 'x' }, P.designer)).toBe('request_open')
  })
  it('amounts must be positive', () => {
    expect(err(designGame(), { type: 'requestFunds', from: 'radio', target: 'radio', amount: 0, reason: 'x' }, P.radio)).toBe('invalid_amount')
  })
  it('the Planner can move money but not below what is already spent', () => {
    let s = applyDesign(designGame(), wildfire)
    expect(err(s, { type: 'moveFunds', from: 'designer', to: 'radio', amount: 100 }, P.planner)).toBe('below_spend')
    s = ok(s, { type: 'moveFunds', from: 'designer', to: 'radio', amount: 50 }, P.planner)
    expect(s.mission!.budget).toMatchObject({ designer: 200, radio: 100, reserve: 100 })
    expect(err(s, { type: 'moveFunds', from: 'reserve', to: 'radio', amount: 101 }, P.planner)).toBe('insufficient_reserve')
  })
})

describe('backorders', () => {
  it('none on Fan, one on Nerd, two on Expert', () => {
    expect(designGame('fan').mission!.backorders).toHaveLength(0)
    expect(designGame('nerd').mission!.backorders).toHaveLength(1)
    const two = designGame('expert').mission!.backorders
    expect(two).toHaveLength(2)
    expect(`${two[0].slot}.${two[0].option}`).not.toBe(`${two[1].slot}.${two[1].option}`)
    expect(two.every((b) => b.option !== 'none' && b.status === 'open')).toBe(true)
  })
  it('the same seed gives the same backorders', () => {
    expect(designGame('expert', 'wildfire', {}, 99).mission!.backorders).toEqual(designGame('expert', 'wildfire', {}, 99).mission!.backorders)
  })
  it('express costs $10M from the reserve', () => {
    let s = designGame('nerd')
    s = ok(s, { type: 'resolveBackorder', id: s.mission!.backorders[0].id, choice: 'express' }, P.planner)
    expect(s.mission!.budget.reserve).toBe(90)
    expect(s.mission!.fees).toBe(10)
    expect(s.mission!.backorders[0].status).toBe('express')
    expect(err(s, { type: 'resolveBackorder', id: s.mission!.backorders[0].id, choice: 'wait' }, P.planner)).toBe('not_open')
  })
  it('substitute takes the part off the shelf', () => {
    let s = designGame('nerd')
    const b = s.mission!.backorders[0]
    const owner = b.slot === 'antenna' || b.slot === 'band' ? P.radio : P.designer
    s = ok(s, { type: 'setSlot', slot: b.slot, option: b.option }, owner)
    s = ok(s, { type: 'resolveBackorder', id: b.id, choice: 'substitute' }, P.planner)
    expect(s.mission!.design[b.slot]).toBeUndefined()
    expect(err(s, { type: 'setSlot', slot: b.slot, option: b.option }, owner)).toBe('substituted')
  })
})

describe('ready checks', () => {
  it('the Scientist cannot be ready while a review is pending', () => {
    const s = ok(designGame(), { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)
    expect(err(s, { type: 'setReady', role: 'scientist', ready: true }, P.scientist)).toBe('pending_items')
  })
  it('the Designer cannot be ready with an unfinished design or an unanswered review', () => {
    let s = designGame()
    expect(err(s, { type: 'setReady', role: 'designer', ready: true }, P.designer)).toBe('incomplete_design')
    s = applyDesign(s, wildfire)
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'hires_cam'] }, P.scientist)
    expect(err(s, { type: 'setReady', role: 'designer', ready: true }, P.designer)).toBe('pending_items')
  })
  it('an open funding request blocks its requester', () => {
    let s = applyDesign(designGame(), wildfire)
    s = ok(s, { type: 'requestFunds', from: 'radio', target: 'radio', amount: 10, reason: 'x' }, P.radio)
    expect(err(s, { type: 'setReady', role: 'radio', ready: true }, P.radio)).toBe('pending_items')
  })
  it('an unresolved backorder on a chosen part blocks its owner', () => {
    let s = designGame('nerd', 'wildfire', { total: 800, designer: 600, radio: 50 })
    const b = s.mission!.backorders[0]
    const owner = b.slot === 'antenna' || b.slot === 'band' ? 'radio' : 'designer'
    s = applyDesign(s, { ...fixture('nerd/wildfire/viable0').design, [b.slot]: b.option })
    expect(err(s, { type: 'setReady', role: owner, ready: true }, P[owner])).toBe('pending_items')
    s = ok(s, { type: 'resolveBackorder', id: b.id, choice: 'wait' }, P.planner)
    expect(ok(s, { type: 'setReady', role: owner, ready: true }, P[owner]).mission!.ready[owner]).toBe(true)
  })
  it('editing clears your ready flag', () => {
    let s = applyDesign(designGame(), wildfire)
    s = ok(s, { type: 'setReady', role: 'designer', ready: true }, P.designer)
    s = ok(s, { type: 'setSlot', slot: 'battery', option: 'large' }, P.designer)
    expect(s.mission!.ready.designer).toBe(false)
  })
  it('when all three are ready the mission moves to integration', () => {
    const s = allReady(applyDesign(designGame(), wildfire))
    expect(s.phase).toBe('integration')
  })
})

describe('solo design', () => {
  const solo = () => {
    let s = ok(soloGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    s = ok(s, { type: 'setPlan', total: 150, designer: 0, radio: 0, targetMonth: 24, scheduleMode: 'standard' }, 'p1')
    return ok(s, { type: 'confirmPlan' }, 'p1')
  }
  it('instruments go straight into the design', () => {
    const s = ok(solo(), { type: 'requestInstruments', list: ['thermal_ir'] }, 'p1')
    expect(s.mission!.design.instruments).toEqual(['thermal_ir'])
    expect(s.mission!.instrumentStatus).toBe('accepted')
  })
  it('one total budget caps everything', () => {
    let s = solo()
    s = ok(s, { type: 'setSlot', slot: 'structure', option: 'medium' }, 'p1') // 38 + 45 = 83
    s = ok(s, { type: 'setStations', stations: ['svalbard', 'kiruna'] }, 'p1') // +6 = 89
    expect(err(s, { type: 'setVehicle', vehicle: 'falcon9' }, 'p1')).toBe('over_allocation') // +70 = 159 > 150
    expect(ok(s, { type: 'setVehicle', vehicle: 'pslv' }, 'p1').mission!.design.vehicle).toBe('pslv')
  })
  it('has no funding requests', () => {
    expect(err(solo(), { type: 'requestFunds', from: 'designer', target: 'designer', amount: 5, reason: 'x' }, 'p1')).toBe('solo_game')
  })
})
