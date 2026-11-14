import { ok, err, P, designGame, soloGame } from './helpers/play'
import { instrumentCost } from '../../src/engine/phases/design'
import type { GameState } from '../../src/engine/state'

const BOTH = ['thermal_ir', 'hires_cam'] as const
const send = (s: GameState, list: readonly string[], note?: string) =>
  ok(s, { type: 'requestInstruments', list: [...list] as never, note }, P.scientist)
const pushBack = (s: GameState, reason = 'Too heavy') => ok(s, { type: 'reviewInstruments', decision: 'pushback', reason }, P.designer)
const approve = (s: GameState) => ok(s, { type: 'reviewInstruments', decision: 'accept' }, P.designer)
const escalate = (s: GameState, reason = 'We cannot agree') => ok(s, { type: 'reviewInstruments', decision: 'escalate', reason }, P.designer)
const cap = (s: GameState, amount: number) => ok(s, { type: 'capInstruments', amount }, P.planner)
const st = (s: GameState) => s.mission!.instrumentStatus

/** Scientist list, push-back, insist, last push-back, insist: the Designer's third and last review. */
function thirdReview(s0 = designGame()): GameState {
  let s = send(s0, BOTH)
  s = pushBack(s, 'Too heavy')
  s = send(s, BOTH, 'I need both')
  s = pushBack(s, 'Still too heavy')
  return send(s, BOTH, 'Both, please')
}

describe('instrument negotiation between the Scientist and the Designer', () => {
  it('the Designer may approve at the first look', () => {
    const s = approve(send(designGame(), BOTH))
    expect(st(s)).toBe('accepted')
    expect(s.mission!.design.instruments).toEqual([...BOTH])
  })

  it('the Designer can push back twice, each time with a reason, and no more', () => {
    let s = send(designGame(), BOTH)
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback' }, P.designer)).toBe('reason_required')
    s = pushBack(s)
    expect(st(s)).toBe('pushed_back')
    expect(s.mission!.instrumentPushbacks).toBe(1)
    s = send(s, BOTH) // the Scientist insists
    expect(st(s)).toBe('pending')
    s = pushBack(s, 'Still too heavy')
    expect(s.mission!.instrumentPushbacks).toBe(2)
    expect(s.mission!.pushbackReason).toBe('Still too heavy')
    s = send(s, ['thermal_ir']) // the Scientist changes the list
    expect(st(s)).toBe('pending')
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'No' }, P.designer)).toBe('no_pushbacks_left')
  })

  it('the Designer may approve at the second or third look', () => {
    let s = pushBack(send(designGame(), BOTH))
    expect(st(approve(send(s, ['thermal_ir'])))).toBe('accepted')
    s = thirdReview()
    s = approve(s)
    expect(st(s)).toBe('accepted')
    expect(s.mission!.design.instruments).toEqual([...BOTH])
  })

  it('escalating to the Planner is only possible at the third look, and needs a reason', () => {
    let s = send(designGame(), BOTH)
    expect(err(s, { type: 'reviewInstruments', decision: 'escalate', reason: 'x' }, P.designer)).toBe('cannot_escalate_yet')
    s = send(pushBack(s), BOTH)
    expect(err(s, { type: 'reviewInstruments', decision: 'escalate', reason: 'x' }, P.designer)).toBe('cannot_escalate_yet')
    s = thirdReview()
    expect(err(s, { type: 'reviewInstruments', decision: 'escalate' }, P.designer)).toBe('reason_required')
    s = escalate(s)
    expect(st(s)).toBe('escalated')
    expect(s.mission!.design.instruments ?? []).toEqual([])
  })

  it('while the Planner is deciding, nobody else can move the list', () => {
    const s = escalate(thirdReview())
    expect(err(s, { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)).toBe('awaiting_planner')
    expect(err(s, { type: 'reviewInstruments', decision: 'accept' }, P.designer)).toBe('nothing_to_review')
  })

  it("the Planner sets the Scientist's instrument budget, never above the Designer's allocation", () => {
    const s = escalate(thirdReview(designGame('fan', 'wildfire', { designer: 250 })))
    expect(err(s, { type: 'capInstruments', amount: 40 }, P.designer)).toBe('not_your_role')
    expect(err(s, { type: 'capInstruments', amount: 251 }, P.planner)).toBe('cap_exceeds_allocation')
    expect(err(s, { type: 'capInstruments', amount: 0 }, P.planner)).toBe('invalid_amount')
    expect(err(s, { type: 'capInstruments', amount: 1 }, P.planner)).toBe('cap_too_small') // no instrument is that cheap
    const t = cap(s, 250)
    expect(st(t)).toBe('capped')
    expect(t.mission!.instrumentCap).toBe(250)
  })

  it('the Planner cannot set a limit when nothing was escalated', () => {
    expect(err(send(designGame(), BOTH), { type: 'capInstruments', amount: 40 }, P.planner)).toBe('nothing_escalated')
  })

  it('after the ruling the Scientist must fit the limit, and the Designer must accept the final list', () => {
    const one = instrumentCost(designGame(), ['thermal_ir'])
    const two = instrumentCost(designGame(), [...BOTH])
    expect(two).toBeGreaterThan(one)
    let s = cap(escalate(thirdReview()), one)
    expect(err(s, { type: 'requestInstruments', list: [...BOTH] }, P.scientist)).toBe('over_instrument_cap')
    s = send(s, ['thermal_ir'])
    expect(st(s)).toBe('final')
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'No' }, P.designer)).toBe('already_final')
    expect(err(s, { type: 'reviewInstruments', decision: 'escalate', reason: 'No' }, P.designer)).toBe('already_final')
    s = approve(s)
    expect(st(s)).toBe('accepted')
    expect(s.mission!.design.instruments).toEqual(['thermal_ir'])
  })

  it('the Planner may correct the limit until the Scientist has sent the final list', () => {
    const one = instrumentCost(designGame(), ['thermal_ir'])
    let s = cap(escalate(thirdReview()), one)
    s = cap(s, one + 60)
    expect(s.mission!.instrumentCap).toBe(one + 60)
    s = send(s, ['thermal_ir'])
    expect(err(s, { type: 'capInstruments', amount: one }, P.planner)).toBe('nothing_escalated')
  })

  it('the limit stays for the rest of the mission', () => {
    const one = instrumentCost(designGame(), ['thermal_ir'])
    let s = approve(send(cap(escalate(thirdReview()), one), ['thermal_ir']))
    expect(err(s, { type: 'requestInstruments', list: [...BOTH] }, P.scientist)).toBe('over_instrument_cap')
    s = send(s, ['hires_cam']) // a different list inside the limit: the Designer must accept it
    expect(st(s)).toBe('final')
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'No' }, P.designer)).toBe('already_final')
    expect(s.mission!.instrumentCap).toBe(one)
  })

  it("the Planner cannot move money out from under the Scientist's limit", () => {
    let s = cap(escalate(thirdReview(designGame('fan', 'wildfire', { designer: 250 }))), 200)
    expect(err(s, { type: 'moveFunds', from: 'designer', to: 'reserve', amount: 60 }, P.planner)).toBe('below_instrument_cap')
    s = ok(s, { type: 'moveFunds', from: 'designer', to: 'reserve', amount: 50 }, P.planner)
    expect(s.mission!.budget.designer).toBe(200)
  })

  it('changing an accepted list re-opens the review but does not hand back used push-backs', () => {
    let s = approve(send(pushBack(send(designGame(), BOTH)), BOTH))
    expect(s.mission!.instrumentPushbacks).toBe(1)
    const same = send(s, BOTH)
    expect(st(same)).toBe('accepted') // sending the accepted list again changes nothing
    s = send(s, ['thermal_ir'])
    expect(st(s)).toBe('pending')
    expect(s.mission!.design.instruments).toEqual([...BOTH]) // the old list stays on the craft until the Designer decides
    s = pushBack(s, 'Now too little science')
    expect(s.mission!.instrumentPushbacks).toBe(2)
    s = send(s, ['thermal_ir'])
    expect(err(s, { type: 'reviewInstruments', decision: 'pushback', reason: 'No' }, P.designer)).toBe('no_pushbacks_left')
  })

  it('keeps the whole conversation, so the Planner can read both sides', () => {
    const s = cap(escalate(thirdReview(), 'We cannot agree'), 200)
    const steps = s.mission!.instrumentThread.map((x) => `${x.by}:${x.kind}`)
    expect(steps).toEqual([
      'scientist:list', 'designer:pushback', 'scientist:insist', 'designer:pushback', 'scientist:insist',
      'designer:escalate', 'planner:cap',
    ])
    const thread = s.mission!.instrumentThread
    expect(thread[1].text).toBe('Too heavy')
    expect(thread[2].text).toBe('I need both')
    expect(thread[0].list).toEqual([...BOTH])
    expect(thread[5].text).toBe('We cannot agree')
    expect(thread[6].amount).toBe(200)
    const changed = send(pushBack(send(designGame(), BOTH)), ['thermal_ir'])
    expect(changed.mission!.instrumentThread.at(-1)).toMatchObject({ by: 'scientist', kind: 'change', list: ['thermal_ir'] })
  })

  it('a solo player still fits instruments directly', () => {
    const s = ok(soloGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    const d = ok(ok(s, { type: 'setPlan', total: 150, designer: 0, radio: 0, targetMonth: 24, scheduleMode: 'standard' }, 'p1'), { type: 'confirmPlan' }, 'p1')
    const t = ok(d, { type: 'requestInstruments', list: ['thermal_ir'] }, 'p1')
    expect(t.mission!.instrumentStatus).toBe('accepted')
    expect(err(t, { type: 'capInstruments', amount: 50 }, 'p1')).toBe('solo_game')
  })
})
