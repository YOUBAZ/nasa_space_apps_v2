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
