import { applyAction } from '../engine/game'
import type { Action, GameState } from '../engine/state'

/** Everything that travels over a room's channel. The host's browser is the single source of truth. */
export type Msg =
  | { t: 'hello'; playerId: string; name: string }
  | { t: 'action'; from: string; action: Action; seq: number }
  | { t: 'snapshot_req'; playerId: string }
  | { t: 'bye'; playerId: string }
  | { t: 'state'; state: GameState; rev: number; err?: { to: string; error: string; seq?: number } }
  | { t: 'closed' }

export const HOST_ID = 'p1'
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]
  return code
}

export interface HostStep { state: GameState; rev: number; reply: Msg[] }

/**
 * The host's whole job, as a pure function: take a message, run it through the engine,
 * and say what to broadcast. A rejected action changes nothing and goes back to its sender
 * with the current state, so a stale client simply catches up.
 */
export function hostReduce(state: GameState, rev: number, msg: Msg): HostStep {
  const accept = (next: GameState): HostStep => ({ state: next, rev: rev + 1, reply: [{ t: 'state', state: next, rev: rev + 1 }] })
  const reject = (to: string, error: string, seq?: number): HostStep =>
    ({ state, rev, reply: [{ t: 'state', state, rev, err: seq === undefined ? { to, error } : { to, error, seq } }] })

  switch (msg.t) {
    case 'hello': {
      const r = applyAction(state, { type: 'join', name: msg.name }, msg.playerId)
      return r.ok ? accept(r.state) : reject(msg.playerId, r.error)
    }
    case 'action': {
      const r = applyAction(state, msg.action, msg.from)
      return r.ok ? accept(r.state) : reject(msg.from, r.error, msg.seq)
    }
    case 'snapshot_req':
      return { state, rev, reply: [{ t: 'state', state, rev }] }
    case 'bye': {
      const p = state.players.find((x) => x.id === msg.playerId)
      if (!p || !p.connected || msg.playerId === HOST_ID) return { state, rev, reply: [] }
      const r = applyAction(state, { type: 'setConnected', playerId: msg.playerId, connected: false }, HOST_ID)
      return r.ok ? accept(r.state) : { state, rev, reply: [] }
    }
    default:
      return { state, rev, reply: [] }
  }
}
