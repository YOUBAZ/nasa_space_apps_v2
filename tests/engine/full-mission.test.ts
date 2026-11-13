import { applyAction, createGame } from '../../src/engine/game'
import type { Action, GameState } from '../../src/engine/state'
import type { Role, Slot } from '../../src/engine/types'
import { SLOTS, RADIO_SLOTS } from '../../src/engine/types'
import { optionsFor } from '../../src/engine/catalog'
import { fixture } from './helpers/play'

const d = fixture('fan/wildfire/viable0').design

function runner(start: GameState) {
  let s = start
  let count = 0
  return {
    do(a: Action, actor: string) {
      const r = applyAction(s, a, actor)
      if (!r.ok) throw new Error(`${a.type}: ${r.error}`)
      s = r.state
      count += 1
    },
    get state() { return s },
    get count() { return count },
  }
}

function designActions(g: ReturnType<typeof runner>, ids: Record<Role, string>) {
  for (const slot of SLOTS as Slot[]) {
    if (!optionsFor('fan', slot, []).includes(d[slot])) continue
    g.do({ type: 'setSlot', slot, option: d[slot] }, RADIO_SLOTS.includes(slot) ? ids.radio : ids.designer)
  }
  g.do({ type: 'setOrbit', orbit: d.orbit }, ids.radio)
  g.do({ type: 'setVehicle', vehicle: d.vehicle }, ids.designer)
  g.do({ type: 'setStations', stations: d.stations }, ids.radio)
  g.do({ type: 'requestInstruments', list: d.instruments }, ids.scientist)
}

describe('a whole mission', () => {
  let teamCount = 0
  it('a four-player team flies the reference wildfire design to a successful debrief', () => {
    const ids: Record<Role, string> = { planner: 'p1', scientist: 'p2', designer: 'p3', radio: 'p4' }
    const g = runner(createGame({ mode: 'online', difficulty: 'fan', seed: 3, hostName: 'Pat' }))
    for (const [i, name] of ['Sci', 'Des', 'Rad'].entries()) g.do({ type: 'join', name }, `p${i + 2}`)
    for (const role of Object.keys(ids) as Role[]) g.do({ type: 'claimRole', role }, ids[role])
    g.do({ type: 'startCampaign' }, 'p1')
    g.do({ type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'Catch fires early' }, 'p2')
    g.do({ type: 'review', requestId: g.state.mission!.requests[0].id, decision: 'approve' }, 'p1')
    g.do({ type: 'setPlan', total: 300, designer: 200, radio: 8, targetMonth: 18, scheduleMode: 'standard' }, 'p1')
    g.do({ type: 'confirmPlan' }, 'p1')
    designActions(g, ids)
    g.do({ type: 'reviewInstruments', decision: 'accept' }, 'p3')
    for (const role of ['scientist', 'designer', 'radio'] as const) g.do({ type: 'setReady', role, ready: true }, ids[role])
    g.do({ type: 'agreePairing', role: 'designer', agree: true }, 'p3')
    g.do({ type: 'agreePairing', role: 'radio', agree: true }, 'p4')
    g.do({ type: 'submitPurchase' }, 'p3')
    g.do({ type: 'review', requestId: g.state.mission!.requests[1].id, decision: 'approve' }, 'p1')
    for (const role of Object.keys(ids) as Role[]) g.do({ type: 'vote', role, vote: 'go' }, ids[role])
    g.do({ type: 'launch' }, 'p1')
    g.do({ type: 'advanceOps' }, 'p4')
    g.do({ type: 'advanceOps' }, 'p4')
    expect(g.state.phase).toBe('debrief')
    expect(g.state.mission!.report!.outcome).toBe('success')
    expect(g.state.mission!.report!.faults).toEqual([])
    teamCount = g.count
  })
  it('solo play needs fewer than half as many actions', () => {
    const ids: Record<Role, string> = { planner: 'p1', scientist: 'p1', designer: 'p1', radio: 'p1' }
    const g = runner(createGame({ mode: 'solo', difficulty: 'fan', seed: 3, hostName: 'Solo' }))
    g.do({ type: 'startCampaign' }, 'p1')
    g.do({ type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    g.do({ type: 'setPlan', total: 300, designer: 0, radio: 0, targetMonth: 18, scheduleMode: 'standard' }, 'p1')
    g.do({ type: 'confirmPlan' }, 'p1')
    designActions(g, ids)
    g.do({ type: 'launch' }, 'p1')
    g.do({ type: 'advanceOps' }, 'p1')
    g.do({ type: 'advanceOps' }, 'p1')
    expect(g.state.phase).toBe('debrief')
    expect(g.state.mission!.report!.outcome).toBe('success')
    expect(g.count).toBeLessThan(teamCount / 2)
  })
  it('solo launch is refused while the design is incomplete', () => {
    const g = runner(createGame({ mode: 'solo', difficulty: 'fan', seed: 3, hostName: 'Solo' }))
    g.do({ type: 'startCampaign' }, 'p1')
    g.do({ type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' }, 'p1')
    g.do({ type: 'setPlan', total: 300, designer: 0, radio: 0, targetMonth: 18, scheduleMode: 'standard' }, 'p1')
    g.do({ type: 'confirmPlan' }, 'p1')
    const r = applyAction(g.state, { type: 'launch' }, 'p1')
    expect(r).toEqual({ ok: false, error: 'incomplete_design' })
  })
})
