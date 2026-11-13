import { createGame } from '../../src/engine/game'
import { hostReduce, makeRoomCode, ROOM_ALPHABET, type Msg } from '../../src/net/protocol'
import { createHostTransport, createClientTransport, memoryBusFactory } from '../../src/net/roomTransport'
import { teamGame, designGame, P } from '../engine/helpers/play'

const fresh = () => createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Host' })

describe('hostReduce', () => {
  it('a hello adds the player and broadcasts the new state', () => {
    const r = hostReduce(fresh(), 0, { t: 'hello', playerId: 'c1', name: 'Bo' })
    expect(r.rev).toBe(1)
    expect(r.state.players.map((p) => p.id)).toEqual(['p1', 'c1'])
    expect(r.reply).toEqual([{ t: 'state', state: r.state, rev: 1 }])
  })
  it('an accepted action bumps the revision by one', () => {
    const r = hostReduce(fresh(), 4, { t: 'action', from: 'p1', action: { type: 'claimRole', role: 'planner' }, seq: 1 })
    expect(r.rev).toBe(5)
    expect(r.state.players[0].roles).toEqual(['planner'])
  })
  it('host rejects stale action and rebroadcasts', () => {
    const s = designGame('fan')
    const r = hostReduce(s, 9, { t: 'action', from: P.radio, action: { type: 'vote', role: 'radio', vote: 'go' }, seq: 3 })
    expect(r.rev).toBe(9)
    expect(r.state).toBe(s)
    expect(r.reply).toEqual([{ t: 'state', state: s, rev: 9, err: { to: P.radio, error: 'wrong_phase', seq: 3 } }])
  })
  it('a snapshot request is answered with the current state', () => {
    const s = teamGame()
    expect(hostReduce(s, 7, { t: 'snapshot_req', playerId: 'c9' }).reply).toEqual([{ t: 'state', state: s, rev: 7 }])
  })
  it('a fifth player is turned away without changing the game', () => {
    const s = teamGame()
    const r = hostReduce(s, 2, { t: 'hello', playerId: 'c5', name: 'Extra' })
    expect(r.rev).toBe(2)
    expect(r.reply[0]).toMatchObject({ t: 'state', err: { to: 'c5', error: 'room_full' } })
  })
  it('a client cannot use host-only actions', () => {
    const s = teamGame()
    const r = hostReduce(s, 2, { t: 'action', from: P.radio, action: { type: 'setConnected', playerId: 'p1', connected: false }, seq: 1 })
    expect(r.reply[0]).toMatchObject({ err: { error: 'host_only' } })
  })
  it('a leaving player frees their roles', () => {
    const s = teamGame()
    const r = hostReduce(s, 2, { t: 'bye', playerId: P.scientist })
    expect(r.state.players.find((p) => p.id === P.scientist)).toMatchObject({ connected: false, roles: [] })
    expect(r.rev).toBe(3)
  })
  it('ignores messages meant for clients', () => {
    const s = fresh()
    expect(hostReduce(s, 0, { t: 'state', state: s, rev: 0 } as Msg)).toEqual({ state: s, rev: 0, reply: [] })
  })
})

describe('room codes', () => {
  it('are six unambiguous characters', () => {
    const code = makeRoomCode(() => 0.5)
    expect(code).toHaveLength(6)
    expect([...code].every((c) => ROOM_ALPHABET.includes(c))).toBe(true)
    expect(ROOM_ALPHABET).not.toMatch(/[OI01]/)
  })
})

describe('host and client transports over an in-memory bus', () => {
  it('a client joins, acts, and both sides converge on the same state', async () => {
    const bus = memoryBusFactory()
    const host = await createHostTransport({ difficulty: 'fan', name: 'Host' }, bus)
    const client = await createClientTransport({ code: host.code!, name: 'Bo' }, bus)
    expect(client.getState()!.players.map((p) => p.name)).toEqual(['Host', 'Bo'])
    client.dispatch({ type: 'claimRole', role: 'scientist' })
    host.dispatch({ type: 'claimRole', role: 'planner' })
    await Promise.resolve()
    expect(host.getState()).toEqual(client.getState())
    expect(host.getState()!.players.find((p) => p.name === 'Bo')!.roles).toEqual(['scientist'])
  })
  it('a rejected action reaches only the sender as an error', async () => {
    const bus = memoryBusFactory()
    const host = await createHostTransport({ difficulty: 'fan', name: 'Host' }, bus)
    const client = await createClientTransport({ code: host.code!, name: 'Bo' }, bus)
    const hostErrors: string[] = []
    const clientErrors: string[] = []
    host.subscribe((_s, e) => { if (e) hostErrors.push(e) })
    client.subscribe((_s, e) => { if (e) clientErrors.push(e) })
    client.dispatch({ type: 'startCampaign' })
    await Promise.resolve()
    expect(clientErrors).toEqual(['host_only'])
    expect(hostErrors).toEqual([])
  })
  it('when a client leaves, the host frees their roles', async () => {
    const bus = memoryBusFactory()
    const host = await createHostTransport({ difficulty: 'fan', name: 'Host' }, bus)
    const client = await createClientTransport({ code: host.code!, name: 'Bo' }, bus)
    client.dispatch({ type: 'claimRole', role: 'radio' })
    client.dispose()
    await Promise.resolve()
    expect(host.getState()!.players.find((p) => p.name === 'Bo')).toMatchObject({ connected: false, roles: [] })
  })
  it('when the host leaves, clients are told the room closed', async () => {
    const bus = memoryBusFactory()
    const host = await createHostTransport({ difficulty: 'fan', name: 'Host' }, bus)
    const client = await createClientTransport({ code: host.code!, name: 'Bo' }, bus)
    const errors: string[] = []
    client.subscribe((_s, e) => { if (e) errors.push(e) })
    host.dispose()
    await Promise.resolve()
    expect(errors).toEqual(['room_closed'])
  })
  it('joining a room that does not exist fails', async () => {
    await expect(createClientTransport({ code: 'NOROOM', name: 'Bo', timeoutMs: 30 }, memoryBusFactory())).rejects.toThrow('no_room')
  })
})
