import { applyAction, createGame } from '../../../src/engine/game'
import type { Action, GameState, Mode } from '../../../src/engine/state'
import type { Difficulty, Role } from '../../../src/engine/types'

/** Applies an action and fails the test loudly if the engine rejects it. */
export function ok(state: GameState, action: Action, actorId: string): GameState {
  const r = applyAction(state, action, actorId)
  if (!r.ok) throw new Error(`action ${action.type} rejected: ${r.error}`)
  return r.state
}
export function err(state: GameState, action: Action, actorId: string): string {
  const r = applyAction(state, action, actorId)
  if (r.ok) throw new Error(`action ${action.type} unexpectedly accepted`)
  return r.error
}

export const P: Record<Role, string> = { planner: 'p1', scientist: 'p2', designer: 'p3', radio: 'p4' }

/** A 4-player team game (one role each), started and sitting at objective_proposal. */
export function teamGame(difficulty: Difficulty = 'fan', mode: Mode = 'online', seed = 7): GameState {
  let s = createGame({ mode, difficulty, seed, hostName: 'Pat' })
  s = ok(s, { type: 'join', name: 'Sci' }, 'p2')
  s = ok(s, { type: 'join', name: 'Des' }, 'p3')
  s = ok(s, { type: 'join', name: 'Rad' }, 'p4')
  for (const role of ['planner', 'scientist', 'designer', 'radio'] as Role[]) s = ok(s, { type: 'claimRole', role }, P[role])
  return ok(s, { type: 'startCampaign' }, 'p1')
}
export function soloGame(difficulty: Difficulty = 'fan', seed = 7): GameState {
  return ok(createGame({ mode: 'solo', difficulty, seed, hostName: 'Solo' }), { type: 'startCampaign' }, 'p1')
}

import fixtures from '../../fixtures/reference-designs.json'
import type { Design, ObjectiveId, Slot } from '../../../src/engine/types'
import { SLOTS, RADIO_SLOTS } from '../../../src/engine/types'
import { optionsFor } from '../../../src/engine/catalog'

export type Fixture = { name: string; diff: Difficulty; objective: ObjectiveId; design: Design; expect: { outcome: string; cost: number; faults: string[] } }
export const fixture = (name: string): Fixture => (fixtures as unknown as Fixture[]).find((f) => f.name === name)!

export interface PlanOpts { total?: number; designer?: number; radio?: number; targetMonth?: number; scheduleMode?: 'rush' | 'standard' | 'careful' }

/** Team game advanced to the design phase with the given objective approved and budget split. */
export function designGame(difficulty: Difficulty = 'fan', objectiveId: ObjectiveId = 'wildfire', plan: PlanOpts = {}, seed = 7): GameState {
  let s = teamGame(difficulty, 'online', seed)
  s = ok(s, { type: 'proposeObjective', objectiveId, pitch: 'pitch' }, P.scientist)
  s = ok(s, { type: 'review', requestId: s.mission!.requests[0].id, decision: 'approve' }, P.planner)
  s = ok(s, { type: 'setPlan', total: plan.total ?? 400, designer: plan.designer ?? 250, radio: plan.radio ?? 50,
    targetMonth: plan.targetMonth ?? 24, scheduleMode: plan.scheduleMode ?? 'standard' }, P.planner)
  return ok(s, { type: 'confirmPlan' }, P.planner)
}

/** Plays a whole design into the game using the right role for each choice. */
export function applyDesign(s0: GameState, d: Design, ids: Record<Role, string> = P): GameState {
  let s = s0
  const solo = s.mode === 'solo'
  for (const slot of SLOTS as Slot[]) {
    if (!optionsFor(s.difficulty, slot, s.campaign.unlocked).includes(d[slot])) continue
    s = ok(s, { type: 'setSlot', slot, option: d[slot] }, RADIO_SLOTS.includes(slot) ? ids.radio : ids.designer)
  }
  s = ok(s, { type: 'setOrbit', orbit: d.orbit }, ids.radio)
  s = ok(s, { type: 'setVehicle', vehicle: d.vehicle }, ids.designer)
  s = ok(s, { type: 'setStations', stations: d.stations }, ids.radio)
  s = ok(s, { type: 'requestInstruments', list: d.instruments }, ids.scientist)
  if (!solo) s = ok(s, { type: 'reviewInstruments', decision: 'accept' }, ids.designer)
  return s
}

export function allReady(s0: GameState): GameState {
  let s = s0
  for (const role of ['scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'setReady', role, ready: true }, P[role])
  return s
}

const lastRequest = (s: GameState) => s.mission!.requests[s.mission!.requests.length - 1]

/** From the design phase: build the design, pass integration and the poll, and launch. */
export function launchFrom(s0: GameState, d: Design): GameState {
  let s = allReady(applyDesign(s0, d))
  s = ok(s, { type: 'submitPurchase' }, P.designer)
  s = ok(s, { type: 'review', requestId: lastRequest(s).id, decision: 'approve' }, P.planner)
  s = ok(s, { type: 'agreePairing', role: 'designer', agree: true }, P.designer)
  s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
  for (const role of ['planner', 'scientist', 'designer', 'radio'] as Role[]) s = ok(s, { type: 'vote', role, vote: 'go' }, P[role])
  return ok(s, { type: 'launch' }, P.planner)
}

/** A team mission flown all the way to the debrief screen. */
export function debriefOf(d: Design, objectiveId: ObjectiveId = 'wildfire', plan: PlanOpts = {}, difficulty: Difficulty = 'fan', seed = 7): GameState {
  let s = launchFrom(designGame(difficulty, objectiveId, plan, seed), d)
  while (s.phase !== 'debrief') s = ok(s, { type: 'advanceOps' }, P.radio)
  return s
}
