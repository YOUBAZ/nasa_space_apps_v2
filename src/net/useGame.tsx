import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Action, GameState } from '../engine/state'
import type { Role } from '../engine/types'
import type { Transport } from './transport'
import { applyAction } from '../engine/game'

export interface Game {
  state: GameState
  me: string
  transport: Transport
  /** Do something as a role. In pass-and-play this acts as whoever holds that role. */
  act(action: Action, asRole?: Role): void
  /** Do something as a specific player (lobby seat changes in pass-and-play). */
  actAs(playerId: string, action: Action): void
  /** Dry run: the error an action would hit, or null if it would be accepted. Nothing is sent. */
  probe(action: Action, asRole?: Role): string | null
  /** May this device operate the given role's controls? */
  can(role: Role): boolean
  holder(role: Role): string | undefined
  lastError: string | null
  clearError(): void
}

const Ctx = createContext<Game | null>(null)

export function GameProvider({ transport, children }: { transport: Transport; children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(transport.getState())
  const [lastError, setError] = useState<string | null>(null)

  useEffect(() => {
    setState(transport.getState())
    return transport.subscribe((s, err) => {
      setState(s)
      setError(err ?? null)
    })
  }, [transport])

  const holderId = useCallback((role: Role) => state?.players.find((p) => p.roles.includes(role))?.id, [state])

  const game = useMemo<Game | null>(() => {
    if (!state) return null
    const online = state.mode === 'online'
    return {
      state,
      me: transport.me,
      transport,
      act(action, asRole) {
        const actor = online || !asRole ? transport.me : holderId(asRole) ?? transport.me
        transport.dispatch(action, actor)
      },
      probe(action, asRole) {
        const actor = online || !asRole ? transport.me : holderId(asRole) ?? transport.me
        const r = applyAction(state, action, actor)
        return r.ok ? null : r.error
      },
      actAs(playerId, action) { transport.dispatch(action, online ? transport.me : playerId) },
      can(role) {
        if (!online) return holderId(role) !== undefined
        return state.players.find((p) => p.id === transport.me)?.roles.includes(role) ?? false
      },
      holder(role) { return state.players.find((p) => p.roles.includes(role))?.name },
      lastError,
      clearError: () => setError(null),
    }
  }, [state, transport, lastError, holderId])

  if (!game) return null
  return <Ctx.Provider value={game}>{children}</Ctx.Provider>
}

export function useGame(): Game {
  const g = useContext(Ctx)
  if (!g) throw new Error('useGame must be used inside <GameProvider>')
  return g
}
