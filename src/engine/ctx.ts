import type { GameState, Mission, Phase, Player } from './state'
import { fail } from './state'
import type { Role } from './types'
import { nextRandom } from './rng'

export const playerOf = (s: GameState, id: string): Player =>
  s.players.find((p) => p.id === id) ?? fail('unknown_player')

export const holderOf = (s: GameState, role: Role): Player | undefined =>
  s.players.find((p) => p.roles.includes(role))

/** The actor must hold the role. Distinguishes "someone else has it" from "nobody has it". */
export function requireRole(s: GameState, actorId: string, role: Role): void {
  const p = playerOf(s, actorId)
  if (p.roles.includes(role)) return
  fail(holderOf(s, role) ? 'not_your_role' : 'role_unclaimed')
}

export function requirePhase(s: GameState, ...phases: Phase[]): void {
  if (!phases.includes(s.phase)) fail('wrong_phase')
}

export const missionOf = (s: GameState): Mission => s.mission ?? fail('no_mission')

export function newId(s: GameState, prefix: string): string {
  s.nextId += 1
  return `${prefix}${s.nextId}`
}

export function log(s: GameState, key: string, vars: Record<string, string | number> = {}, role?: Role): void {
  s.nextId += 1
  s.log.push({ n: s.nextId, key, vars, role })
  if (s.log.length > 300) s.log.splice(0, s.log.length - 300)
}

/** Draws from the game's seeded generator, advancing it. */
export function random(s: GameState): number {
  const [value, next] = nextRandom(s.rng)
  s.rng = next
  return value
}

export const isSolo = (s: GameState) => s.mode === 'solo'

export function validAmount(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) fail('invalid_amount')
  return n as number
}
