import { applyAction, createGame } from '../engine/game'
import type { Action, GameState } from '../engine/state'
import type { Difficulty } from '../engine/types'
import type { Listener, Transport } from './transport'

// Bump the version whenever the saved game's shape changes, so old saves are ignored rather than loaded.
export const SAVE_KEY = 'mc.save.v2'

export interface LocalOpts {
  mode: 'solo' | 'local'
  difficulty: Difficulty
  names: string[]
  seed?: number
  /** continue a saved game instead of starting a new one */
  resume?: GameState
  /** set false to keep the game out of localStorage (tutorial, tests) */
  persist?: boolean
  /** which player this device is (defaults to the host) */
  me?: string
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as GameState
    return s && typeof s === 'object' && 'phase' in s && s.mode !== 'online' ? s : null
  } catch {
    return null
  }
}
export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY) } catch { /* storage unavailable */ }
}

/** Solo and pass-and-play: the engine runs right here in the browser. */
export function createLocalTransport(opts: LocalOpts): Transport {
  let state: GameState
  if (opts.resume) state = opts.resume
  else {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31)
    state = createGame({ mode: opts.mode, difficulty: opts.difficulty, seed, hostName: opts.names[0] ?? 'Player' })
    opts.names.slice(1, 4).forEach((name, i) => {
      const r = applyAction(state, { type: 'join', name }, `p${i + 2}`)
      if (r.ok) state = r.state
    })
  }
  const listeners = new Set<Listener>()
  const persist = opts.persist !== false
  const save = () => {
    if (!persist) return
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
  }
  return {
    mode: state.mode,
    me: opts.me ?? 'p1',
    getState: () => state,
    dispatch(action: Action, actorId = opts.me ?? 'p1') {
      const r = applyAction(state, action, actorId)
      if (r.ok) {
        state = r.state
        save()
        listeners.forEach((l) => l(state))
      } else listeners.forEach((l) => l(state, r.error))
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    dispose() { listeners.clear() },
  }
}
