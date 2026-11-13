import { ok, err, teamGame, soloGame, P } from './helpers/play'
import type { GameState } from '../../src/engine/state'

const propose = (s: GameState, id: 'wildfire' | 'telescope' | 'mars_ice' = 'wildfire') =>
  ok(s, { type: 'proposeObjective', objectiveId: id, pitch: 'Spot fires early' }, P.scientist)
const req = (s: GameState) => s.mission!.requests[s.mission!.requests.length - 1]

describe('objective proposal and review', () => {
  it('proposal opens a request for the Planner', () => {
    const s = propose(teamGame())
    expect(s.phase).toBe('objective_review')
    expect(req(s)).toMatchObject({ kind: 'objective', from: 'scientist', status: 'pending', appeals: 0 })
  })
  it('only the Planner reviews', () => {
    const s = propose(teamGame())
    expect(err(s, { type: 'review', requestId: req(s).id, decision: 'approve' }, P.designer)).toBe('not_your_role')
  })
  it('a rejection needs a reason', () => {
    const s = propose(teamGame())
    expect(err(s, { type: 'review', requestId: req(s).id, decision: 'reject' }, P.planner)).toBe('reason_required')
  })
  it('allows exactly two appeals', () => {
    let s = propose(teamGame())
    const id = req(s).id
    const reject = (x: GameState) => ok(x, { type: 'review', requestId: id, decision: 'reject', reason: 'Too pricey' }, P.planner)
    const appeal = (x: GameState) => ok(x, { type: 'appeal', requestId: id, reason: 'It saves lives' }, P.scientist)
    s = reject(s)
    expect(req(s).status).toBe('rejected')
    s = appeal(s)
    expect(req(s)).toMatchObject({ status: 'pending', appeals: 1 })
    s = appeal(reject(s))
    expect(req(s).appeals).toBe(2)
    s = reject(s)
    expect(err(s, { type: 'appeal', requestId: id, reason: 'please' }, P.scientist)).toBe('appeals_exhausted')
    expect(s.phase).toBe('objective_proposal')
  })
  it('an objective rejected after both appeals cannot be proposed again', () => {
    let s = propose(teamGame())
    const id = req(s).id
    for (let i = 0; i < 3; i++) {
      s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'no' }, P.planner)
      if (i < 2) s = ok(s, { type: 'appeal', requestId: id, reason: 'yes' }, P.scientist)
    }
    expect(err(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'again' }, P.scientist)).toBe('objective_rejected')
    s = propose(s, 'telescope')
    expect(req(s).status).toBe('pending')
  })
  it('proposing a different objective closes the rejected request', () => {
    let s = propose(teamGame())
    const id = req(s).id
    s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'no' }, P.planner)
    s = propose(s, 'mars_ice')
    expect(s.mission!.requests.find((r) => r.id === id)!.status).toBe('closed')
    expect(s.mission!.objectiveId).toBe('mars_ice')
  })
  it('only the requester appeals, and only a rejected request', () => {
    let s = propose(teamGame())
    const id = req(s).id
    expect(err(s, { type: 'appeal', requestId: id, reason: 'x' }, P.scientist)).toBe('not_rejected')
    s = ok(s, { type: 'review', requestId: id, decision: 'reject', reason: 'no' }, P.planner)
    expect(err(s, { type: 'appeal', requestId: id, reason: 'x' }, P.radio)).toBe('not_your_role')
  })
  it('objectives outside the difficulty are refused', () => {
    expect(err(teamGame('fan'), { type: 'proposeObjective', objectiveId: 'jupiter', pitch: 'x' }, P.scientist)).toBe('unavailable')
  })
  it('approval moves to planning', () => {
    let s = propose(teamGame())
    s = ok(s, { type: 'review', requestId: req(s).id, decision: 'approve' }, P.planner)
    expect(s.phase).toBe('planning')
  })
  it('solo mode never creates an objective request', () => {
    const s = ok(soloGame(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    expect(s.phase).toBe('planning')
    expect(s.mission!.requests).toHaveLength(0)
  })
})

describe('planning', () => {
  const planning = () => {
    const s = propose(teamGame())
    return ok(s, { type: 'review', requestId: req(s).id, decision: 'approve' }, P.planner)
  }
  const plan = { type: 'setPlan' as const, total: 400, designer: 250, radio: 50, targetMonth: 20, scheduleMode: 'standard' as const }
  it('splits the mission budget and keeps the rest in reserve', () => {
    const s = ok(planning(), plan, P.planner)
    expect(s.mission!.budget).toEqual({ total: 400, designer: 250, radio: 50, reserve: 100 })
  })
  it('allocations cannot exceed the mission budget', () => {
    expect(err(planning(), { ...plan, designer: 380 }, P.planner)).toBe('allocation_exceeds_total')
  })
  it('the mission budget cannot exceed campaign funds', () => {
    expect(err(planning(), { ...plan, total: 2001 }, P.planner)).toBe('exceeds_funds')
  })
  it('rejects negative or non-numeric money', () => {
    expect(err(planning(), { ...plan, radio: -5 }, P.planner)).toBe('invalid_amount')
    expect(err(planning(), { ...plan, total: Number.NaN }, P.planner)).toBe('invalid_amount')
  })
  it('the target month must be in the future', () => {
    expect(err(planning(), { ...plan, targetMonth: 0 }, P.planner)).toBe('invalid_target')
  })
  it('cannot confirm before a plan is set', () => {
    expect(err(planning(), { type: 'confirmPlan' }, P.planner)).toBe('no_plan')
  })
  it('confirming opens the design phase', () => {
    const s = ok(ok(planning(), plan, P.planner), { type: 'confirmPlan' }, P.planner)
    expect(s.phase).toBe('design')
  })
  it('only the Planner plans', () => {
    expect(err(planning(), plan, P.scientist)).toBe('not_your_role')
  })
  it('actions from another phase are refused', () => {
    expect(err(planning(), { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)).toBe('wrong_phase')
  })
})
