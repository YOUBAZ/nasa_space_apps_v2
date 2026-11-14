import { vi } from 'vitest'
import { createGame } from '../../src/engine/game'
import { ok, err } from '../engine/helpers/play'
import { createHostTransport as hostOn, memoryBusFactory } from '../../src/net/roomTransport'

const room = vi.hoisted(() => ({ bus: null as unknown, server: true }))
vi.mock('../../src/net/buses', () => ({
  defaultBus: () => room.bus,
  hasServer: () => room.server,
}))
import { createClientTransport } from '../../src/net/supabaseTransport'

const fresh = () => createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Host' })
const names = (s: { players: { name: string }[] }) => s.players.map((p) => p.name)

describe('joining a room: the name a player types', () => {
  it('a returning player who types a new name is renamed', () => {
    let s = ok(fresh(), { type: 'join', name: 'Player 1' }, 'c1')
    s = ok(s, { type: 'setConnected', playerId: 'c1', connected: false }, 'p1')
    s = ok(s, { type: 'join', name: 'Sara' }, 'c1')
    expect(names(s)).toEqual(['Host', 'Sara'])
  })
  it('a returning player who leaves the name blank keeps the name they had', () => {
    let s = ok(fresh(), { type: 'join', name: 'Sara' }, 'c1')
    s = ok(s, { type: 'setConnected', playerId: 'c1', connected: false }, 'p1')
    s = ok(s, { type: 'join', name: '  ' }, 'c1')
    expect(names(s)).toEqual(['Host', 'Sara'])
  })
  it('a new player with a blank name is numbered by seat', () => {
    let s = ok(fresh(), { type: 'join', name: '' }, 'c1')
    s = ok(s, { type: 'join', name: '' }, 'c2')
    expect(names(s)).toEqual(['Host', 'Player 2', 'Player 3'])
  })
  it('a seat that is live in one tab cannot be taken over from another tab', () => {
    const s = ok(fresh(), { type: 'join', name: 'Sara', tab: 'tab-a' }, 'c1')
    expect(err(s, { type: 'join', name: 'Omar', tab: 'tab-b' }, 'c1')).toBe('seat_in_use')
    // the same tab coming back (a refresh) is still welcome
    expect(names(ok(s, { type: 'join', name: 'Sara B', tab: 'tab-a' }, 'c1'))).toEqual(['Host', 'Sara B'])
  })
})

describe('joining a room from one browser', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); room.bus = memoryBusFactory(); room.server = true })

  it('leaving and joining again with a new name changes the name', async () => {
    const host = await hostOn({ difficulty: 'fan', name: 'Host', code: 'ROOM01' }, room.bus as never)
    const first = await createClientTransport({ code: 'ROOM01', name: '' })
    expect(names(host.getState()!)).toEqual(['Host', 'Player 2'])
    first.dispose()
    const again = await createClientTransport({ code: 'ROOM01', name: 'Sara' })
    expect(again.me).toBe(first.me)
    expect(names(host.getState()!)).toEqual(['Host', 'Sara'])
  })
  it('two tabs of the same browser are two players, each with their own name', async () => {
    const host = await hostOn({ difficulty: 'fan', name: 'Host', code: 'ROOM02' }, room.bus as never)
    const sara = await createClientTransport({ code: 'ROOM02', name: 'Sara' })
    sessionStorage.clear() // a second tab: same localStorage, its own sessionStorage
    const omar = await createClientTransport({ code: 'ROOM02', name: 'Omar' })
    expect(omar.me).not.toBe(sara.me)
    expect(names(host.getState()!)).toEqual(['Host', 'Sara', 'Omar'])
  })
})
