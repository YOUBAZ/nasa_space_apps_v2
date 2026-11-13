import type { Action, GameState, Mode } from '../engine/state'

export type Listener = (state: GameState | null, error?: string) => void

/** How the screens talk to a game, wherever the engine actually runs. */
export interface Transport {
  mode: Mode
  /** this device's player id */
  me: string
  /** room code (online only) */
  code?: string
  getState(): GameState | null
  /** `actorId` is honoured only by local games (pass-and-play); online always acts as `me`. */
  dispatch(action: Action, actorId?: string): void
  subscribe(cb: Listener): () => void
  dispose(): void
}
