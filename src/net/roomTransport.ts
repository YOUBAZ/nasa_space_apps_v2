import { createGame } from '../engine/game'
import type { Action, GameState } from '../engine/state'
import type { Difficulty } from '../engine/types'
import { HOST_ID, hostReduce, makeRoomCode, type Msg } from './protocol'
import type { Listener, Transport } from './transport'

/** A room's message channel. Supabase Realtime in production; simpler buses for tests and same-browser play. */
export interface Bus {
  send(msg: Msg): void
  onMessage(cb: (msg: Msg) => void): void
  /** Fires when another member drops off the channel (presence), where the bus can tell. */
  onLeave(cb: (playerId: string) => void): void
  close(): void
}
export type BusFactory = (code: string, playerId: string) => Promise<Bus>

/** In-memory bus for tests: synchronous delivery to everyone else in the same room. */
export function memoryBusFactory(): BusFactory {
  const rooms = new Map<string, Map<string, { msg?: (m: Msg) => void; leave?: (id: string) => void }>>()
  return async (code, playerId) => {
    const room = rooms.get(code) ?? new Map()
    rooms.set(code, room)
    const me: { msg?: (m: Msg) => void; leave?: (id: string) => void } = {}
    room.set(playerId, me)
    return {
      send(msg) { for (const [id, m] of room) if (id !== playerId) m.msg?.(structuredClone(msg)) },
      onMessage(cb) { me.msg = cb },
      onLeave(cb) { me.leave = cb },
      close() {
        if (!room.delete(playerId)) return
        for (const m of room.values()) m.leave?.(playerId)
      },
    }
  }
}

export interface HostOpts { difficulty: Difficulty; name: string; code?: string; seed?: number }

/** The host runs the engine and broadcasts every new state. */
export async function createHostTransport(opts: HostOpts, busFactory: BusFactory): Promise<Transport> {
  const code = opts.code ?? makeRoomCode()
  const bus = await busFactory(code, HOST_ID)
  let state: GameState = createGame({
    mode: 'online', difficulty: opts.difficulty, hostName: opts.name,
    seed: opts.seed ?? Math.floor(Math.random() * 2 ** 31),
  })
  let rev = 0
  const listeners = new Set<Listener>()

  const handle = (msg: Msg) => {
    const step = hostReduce(state, rev, msg)
    const changed = step.state !== state
    state = step.state
    rev = step.rev
    for (const reply of step.reply) {
      bus.send(reply)
      if (reply.t === 'state') {
        const mine = reply.err?.to === HOST_ID ? reply.err.error : undefined
        if (changed || mine) listeners.forEach((l) => l(state, mine))
      }
    }
  }
  bus.onMessage(handle)
  bus.onLeave((playerId) => handle({ t: 'bye', playerId }))

  let seq = 0
  return {
    mode: 'online',
    me: HOST_ID,
    code,
    getState: () => state,
    dispatch(action: Action) { handle({ t: 'action', from: HOST_ID, action, seq: ++seq }) },
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    dispose() {
      bus.send({ t: 'closed' })
      bus.close()
      listeners.clear()
    },
  }
}

export interface ClientOpts {
  code: string; name: string; playerId?: string; timeoutMs?: number
  /** how often to ask the host for the current state, in case a broadcast was lost (0 = never) */
  resyncMs?: number
}

const newPlayerId = () => 'c' + Math.random().toString(36).slice(2, 8)

/** A client sends actions to the host and renders whatever state comes back. */
export async function createClientTransport(opts: ClientOpts, busFactory: BusFactory): Promise<Transport> {
  const me = opts.playerId ?? newPlayerId()
  const bus = await busFactory(opts.code, me)
  let state: GameState | null = null
  let rev = -1
  let closed = false
  const listeners = new Set<Listener>()
  let onFirst: ((error?: string) => void) | null = null

  const close = () => {
    if (closed) return
    closed = true
    listeners.forEach((l) => l(state, 'room_closed'))
  }
  bus.onMessage((msg) => {
    if (msg.t === 'closed') return close()
    if (msg.t !== 'state') return
    const mine = msg.err?.to === me ? msg.err.error : undefined
    if (state === null && mine) return onFirst?.(mine)
    if (msg.rev >= rev) {
      const changed = msg.rev > rev
      rev = msg.rev
      state = msg.state
      onFirst?.()
      if (changed || mine) listeners.forEach((l) => l(state, mine))
    } else if (mine) listeners.forEach((l) => l(state, mine))
  })
  bus.onLeave((playerId) => { if (playerId === HOST_ID) close() })

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { onFirst = null; bus.close(); reject(new Error('no_room')) }, opts.timeoutMs ?? 6000)
    onFirst = (error) => {
      clearTimeout(timer)
      onFirst = null
      if (error) { bus.close(); reject(new Error(error)) } else resolve()
    }
    bus.send({ t: 'hello', playerId: me, name: opts.name })
  })

  // Broadcasts are not guaranteed: ask for the state now and then, and whenever the tab wakes up.
  const resync = () => { if (!closed) bus.send({ t: 'snapshot_req', playerId: me }) }
  const every = opts.resyncMs ?? 8000
  const timer = every > 0 ? setInterval(resync, every) : null
  const onWake = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') resync() }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onWake)

  let seq = 0
  return {
    mode: 'online',
    me,
    code: opts.code,
    getState: () => state,
    dispatch(action: Action) { if (!closed) bus.send({ t: 'action', from: me, action, seq: ++seq }) },
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    dispose() {
      if (timer) clearInterval(timer)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onWake)
      if (!closed) bus.send({ t: 'bye', playerId: me })
      bus.close()
      listeners.clear()
    },
  }
}
