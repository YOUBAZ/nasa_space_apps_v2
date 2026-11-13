import { applyAction, createGame, rolesOf } from '../../src/engine/game'
import { nextRandom } from '../../src/engine/rng'
import { ok, err, teamGame, P } from './helpers/play'

describe('lobby and roles', () => {
  it('solo: one player holds all four roles', () => {
    const s = createGame({ mode: 'solo', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    expect(s.players).toHaveLength(1)
    expect(rolesOf(s, 'p1').sort()).toEqual(['designer', 'planner', 'radio', 'scientist'])
    expect(s.phase).toBe('lobby')
  })
  it('a taken role cannot be claimed twice', () => {
    let s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    s = ok(s, { type: 'join', name: 'Bo' }, 'p2')
    s = ok(s, { type: 'claimRole', role: 'planner' }, 'p1')
    expect(err(s, { type: 'claimRole', role: 'planner' }, 'p2')).toBe('role_taken')
  })
  it('the campaign cannot start until all four roles are claimed', () => {
    let s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    for (const role of ['planner', 'scientist', 'designer'] as const) s = ok(s, { type: 'claimRole', role }, 'p1')
    expect(err(s, { type: 'startCampaign' }, 'p1')).toBe('roles_unclaimed')
    s = ok(s, { type: 'claimRole', role: 'radio' }, 'p1')
    s = ok(s, { type: 'startCampaign' }, 'p1')
    expect(s.phase).toBe('objective_proposal')
    expect(s.campaign.funds).toBe(2000)
  })
  it('only the host starts the campaign', () => {
    let s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    s = ok(s, { type: 'join', name: 'Bo' }, 'p2')
    for (const role of ['planner', 'scientist', 'designer', 'radio'] as const) s = ok(s, { type: 'claimRole', role }, 'p2')
    expect(err(s, { type: 'startCampaign' }, 'p2')).toBe('host_only')
  })
  it('a dropped player frees their roles and play waits until someone claims them', () => {
    let s = teamGame()
    s = ok(s, { type: 'setConnected', playerId: P.scientist, connected: false }, 'p1')
    expect(rolesOf(s, P.scientist)).toEqual([])
    expect(err(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)).toBe('role_unclaimed')
    s = ok(s, { type: 'claimRole', role: 'scientist' }, 'p1')
    s = ok(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, 'p1')
    expect(s.phase).toBe('objective_review')
  })
  it('a returning player can rejoin under the same id', () => {
    let s = teamGame()
    s = ok(s, { type: 'setConnected', playerId: P.radio, connected: false }, 'p1')
    s = ok(s, { type: 'join', name: 'Rad' }, P.radio)
    expect(s.players.filter((p) => p.id === P.radio)).toHaveLength(1)
    expect(s.players.find((p) => p.id === P.radio)!.connected).toBe(true)
  })
  it('chat keeps the last 200 messages and rejects empty text', () => {
    let s = teamGame()
    expect(err(s, { type: 'chat', text: '   ' }, 'p1')).toBe('empty_message')
    for (let i = 0; i < 205; i++) s = ok(s, { type: 'chat', text: `m${i}` }, 'p1')
    expect(s.chat).toHaveLength(200)
    expect(s.chat[199].text).toBe('m204')
    expect(s.chat[0].text).toBe('m5')
  })
  it('never mutates its input', () => {
    const s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    const frozen = JSON.stringify(s)
    applyAction(s, { type: 'claimRole', role: 'planner' }, 'p1')
    expect(JSON.stringify(s)).toBe(frozen)
  })
  it('unknown players are rejected', () => {
    const s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Ada' })
    expect(err(s, { type: 'claimRole', role: 'planner' }, 'ghost')).toBe('unknown_player')
  })
  it('the seeded generator is deterministic', () => {
    const [a, s1] = nextRandom(42)
    const [b] = nextRandom(42)
    const [c] = nextRandom(s1)
    expect(a).toBe(b)
    expect(c).not.toBe(a)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})
