import type { Action, GameState, Mission, ReadyRole, Request } from '../state'
import { fail } from '../state'
import type { InstrumentId, Slot } from '../types'
import { RADIO_SLOTS } from '../types'
import {
  BACKORDER_DELAY_MONTHS, EXPRESS_FEE, INSTRUMENTS, STATIONS, instrumentsFor, optionsFor, orbitsFor,
  vehiclesFor,
} from '../catalog'
import { isSolo, log, missionOf, newId, random, requirePhase, requireRole, validAmount } from '../ctx'
import { hasOpenRequest, openRequest, requireReason } from '../requests'
import { activeSlots, checkCaps, spendOf } from '../spend'

export { BACKORDER_DELAY_MONTHS }

const BACKORDER_COUNT = { fan: 0, nerd: 1, expert: 2 } as const
const ownerOf = (slot: Slot): 'designer' | 'radio' => (RADIO_SLOTS.includes(slot) ? 'radio' : 'designer')

/** Returns true when the change keeps every allocation intact; otherwise undoes it. */
function tryPiece(s: GameState, apply: () => void, undo: () => void): boolean {
  apply()
  try {
    checkCaps(s)
    return true
  } catch {
    undo()
    return false
  }
}

/** "Fly again": re-apply last mission's design piece by piece, skipping what no longer fits. */
function applyTemplate(s: GameState): void {
  const m = missionOf(s)
  const t = m.template
  if (!t) return
  const d = m.design
  for (const slot of activeSlots(s.difficulty, s.campaign.unlocked)) {
    if (!optionsFor(s.difficulty, slot, s.campaign.unlocked).includes(t[slot])) continue
    tryPiece(s, () => { d[slot] = t[slot] }, () => { delete d[slot] })
  }
  if (orbitsFor(s.difficulty).includes(t.orbit)) tryPiece(s, () => { d.orbit = t.orbit }, () => { delete d.orbit })
  if (vehiclesFor(s.difficulty).includes(t.vehicle)) tryPiece(s, () => { d.vehicle = t.vehicle }, () => { delete d.vehicle })
  d.stations = []
  for (const st of t.stations) tryPiece(s, () => { d.stations!.push(st) }, () => { d.stations!.pop() })
  const allowed = instrumentsFor(s.difficulty, s.campaign.unlocked)
  const list = t.instruments.filter((i) => allowed.includes(i))
  if (list.length > 0 && tryPiece(s, () => { d.instruments = list }, () => { delete d.instruments })) {
    m.instrumentRequest = [...list]
    m.instrumentStatus = 'accepted'
  }
  m.template = undefined
}

export function enterDesign(s: GameState): void {
  const m = missionOf(s)
  s.phase = 'design'
  applyTemplate(s)
  // Supply-chain surprises: some parts are backordered this mission.
  const pool: { slot: Slot; option: string }[] = []
  for (const slot of activeSlots(s.difficulty, s.campaign.unlocked)) {
    for (const option of optionsFor(s.difficulty, slot, s.campaign.unlocked)) {
      if (option !== 'none') pool.push({ slot, option })
    }
  }
  for (let i = 0; i < BACKORDER_COUNT[s.difficulty] && pool.length > 0; i++) {
    const [pick] = pool.splice(Math.floor(random(s) * pool.length), 1)
    m.backorders.push({ id: newId(s, 'b'), ...pick, status: 'open' })
    log(s, 'log.backorder.opened', { slot: pick.slot, option: pick.option })
  }
}

/** Any change after the design left the design phase sends the team back to it. */
export function backToDesign(s: GameState): void {
  const m = missionOf(s)
  if (s.phase === 'design') return
  s.phase = 'design'
  m.pairing = { designer: false, radio: false }
  m.purchaseApproved = false
  m.votes = {}
  m.ready = { scientist: false, designer: false, radio: false }
  for (const r of m.requests) {
    if (r.kind === 'purchase' && (r.status === 'pending' || r.status === 'rejected')) r.status = 'closed'
  }
  log(s, 'log.back_to_design')
}

/** Shared entry for every design edit: right phase, right role, then reopen the design if needed. */
function beginEdit(s: GameState, actorId: string, role: 'scientist' | 'designer' | 'radio'): Mission {
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, role)
  backToDesign(s)
  return missionOf(s)
}

export function setSlot(s: GameState, a: Extract<Action, { type: 'setSlot' }>, actorId: string): void {
  const owner = ownerOf(a.slot)
  const m = beginEdit(s, actorId, owner)
  if (!optionsFor(s.difficulty, a.slot, s.campaign.unlocked).includes(a.option)) fail('unavailable')
  if (m.banned.some((b) => b.slot === a.slot && b.option === a.option)) fail('substituted')
  m.design[a.slot] = a.option
  m.ready[owner] = false
  if (owner === 'radio') m.ready.designer = false
  checkCaps(s)
}

export function setVehicle(s: GameState, a: Extract<Action, { type: 'setVehicle' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'designer')
  if (!vehiclesFor(s.difficulty).includes(a.vehicle)) fail('unavailable')
  m.design.vehicle = a.vehicle
  m.ready.designer = false
  checkCaps(s)
}

export function setOrbit(s: GameState, a: Extract<Action, { type: 'setOrbit' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'radio')
  if (!orbitsFor(s.difficulty).includes(a.orbit)) fail('unavailable')
  m.design.orbit = a.orbit
  m.ready.radio = false
  checkCaps(s)
}

export function setStations(s: GameState, a: Extract<Action, { type: 'setStations' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'radio')
  const list = a.stations ?? []
  if (new Set(list).size !== list.length || list.some((id) => !STATIONS[id])) fail('invalid_stations')
  m.design.stations = [...list]
  m.ready.radio = false
  checkCaps(s)
}

const massOf = (list: InstrumentId[]) => list.reduce((sum, i) => sum + INSTRUMENTS[i].mass, 0)

export function requestInstruments(s: GameState, a: Extract<Action, { type: 'requestInstruments' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'scientist')
  const list = a.list ?? []
  const allowed = instrumentsFor(s.difficulty, s.campaign.unlocked)
  if (list.length === 0 || new Set(list).size !== list.length || list.some((i) => !allowed.includes(i))) {
    fail('invalid_instruments')
  }
  m.ready.scientist = false
  if (isSolo(s)) {
    m.instrumentRequest = [...list]
    m.design.instruments = [...list]
    m.instrumentStatus = 'accepted'
    checkCaps(s)
    return
  }
  if (m.instrumentStatus === 'pushed_back' || m.instrumentStatus === 'final') {
    // The Scientist has the last word after a push-back.
    if (m.instrumentStatus === 'pushed_back') m.scientistOverrode = massOf(list) >= massOf(m.instrumentRequest)
    m.instrumentStatus = 'final'
  } else {
    m.instrumentStatus = 'pending'
    m.scientistOverrode = false
  }
  m.instrumentRequest = [...list]
  log(s, 'log.instruments.requested', { n: list.length }, 'scientist')
}

export function reviewInstruments(s: GameState, a: Extract<Action, { type: 'reviewInstruments' }>, actorId: string): void {
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, 'designer')
  const m = missionOf(s)
  if (m.instrumentStatus !== 'pending' && m.instrumentStatus !== 'final') fail('nothing_to_review')
  if (a.decision === 'pushback') {
    if (m.instrumentStatus === 'final') fail('already_final')
    m.pushbackReason = requireReason(a.reason)
    m.instrumentStatus = 'pushed_back'
    log(s, 'log.instruments.pushed_back', {}, 'designer')
    return
  }
  backToDesign(s)
  m.design.instruments = [...m.instrumentRequest]
  m.instrumentStatus = 'accepted'
  m.pushbackReason = undefined
  m.ready.designer = false
  checkCaps(s)
  log(s, 'log.instruments.accepted', { n: m.instrumentRequest.length }, 'designer')
}

export function requestFunds(s: GameState, a: Extract<Action, { type: 'requestFunds' }>, actorId: string): void {
  if (isSolo(s)) fail('solo_game')
  requirePhase(s, 'design')
  requireRole(s, actorId, a.from)
  const m = missionOf(s)
  if (validAmount(a.amount) <= 0) fail('invalid_amount')
  if (a.target !== 'designer' && a.target !== 'radio') fail('invalid_target')
  if (hasOpenRequest(m, a.from, 'funding')) fail('request_open')
  openRequest(s, m, 'funding', a.from, requireReason(a.reason), { amount: a.amount, target: a.target })
  m.ready[a.from] = false
  log(s, 'log.funds.requested', { amount: a.amount }, a.from)
}

export function reviewFunding(s: GameState, r: Request, approve: boolean): void {
  const m = missionOf(s)
  if (!approve) {
    log(s, 'log.funds.rejected', { amount: r.amount ?? 0 }, 'planner')
    return
  }
  const amount = r.amount ?? 0
  if (amount > m.budget.reserve) fail('insufficient_reserve')
  m.budget.reserve -= amount
  m.budget[r.target ?? 'designer'] += amount
  log(s, 'log.funds.approved', { amount }, 'planner')
}

export function moveFunds(s: GameState, a: Extract<Action, { type: 'moveFunds' }>, actorId: string): void {
  if (isSolo(s)) fail('solo_game')
  requirePhase(s, 'design')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  const amount = validAmount(a.amount)
  const pots = ['designer', 'radio', 'reserve']
  if (amount <= 0 || a.from === a.to || !pots.includes(a.from) || !pots.includes(a.to)) fail('invalid_amount')
  if (a.from === 'reserve') {
    if (amount > m.budget.reserve) fail('insufficient_reserve')
  } else if (m.budget[a.from] - amount < spendOf(s, a.from) - 1e-9) fail('below_spend')
  m.budget[a.from] -= amount
  m.budget[a.to] += amount
}

export function resolveBackorder(s: GameState, a: Extract<Action, { type: 'resolveBackorder' }>, actorId: string): void {
  requirePhase(s, 'design')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  const b = m.backorders.find((x) => x.id === a.id) ?? fail('unknown_backorder')
  if (b.status !== 'open') fail('not_open')
  if (a.choice === 'express') {
    if (isSolo(s)) {
      m.fees += EXPRESS_FEE
      checkCaps(s)
    } else {
      if (m.budget.reserve < EXPRESS_FEE) fail('insufficient_reserve')
      m.budget.reserve -= EXPRESS_FEE
      m.fees += EXPRESS_FEE
    }
  } else if (a.choice === 'substitute') {
    m.banned.push({ slot: b.slot, option: b.option })
    if (m.design[b.slot] === b.option) {
      delete m.design[b.slot]
      m.ready[ownerOf(b.slot)] = false
    }
  } else if (a.choice !== 'wait') fail('invalid_choice')
  b.status = a.choice
  log(s, 'log.backorder.resolved', { slot: b.slot, option: b.option, choice: a.choice }, 'planner')
}

/** What still stops a role from declaring itself ready; null when nothing does. */
export function readyBlocker(s: GameState, role: ReadyRole): 'incomplete_design' | 'pending_items' | null {
  const m = missionOf(s)
  const d = m.design
  if (role === 'scientist') return m.instrumentStatus === 'accepted' ? null : 'pending_items'
  const mine = activeSlots(s.difficulty, s.campaign.unlocked).filter((slot) => ownerOf(slot) === role)
  if (mine.some((slot) => !d[slot])) return 'incomplete_design'
  if (role === 'designer' && !d.vehicle) return 'incomplete_design'
  if (role === 'radio' && !d.orbit) return 'incomplete_design'
  if (role === 'designer' && (m.instrumentStatus === 'pending' || m.instrumentStatus === 'final')) return 'pending_items'
  if (hasOpenRequest(m, role, 'funding')) return 'pending_items'
  if (m.backorders.some((b) => b.status === 'open' && ownerOf(b.slot) === role && d[b.slot] === b.option)) return 'pending_items'
  return null
}

export function setReady(s: GameState, a: Extract<Action, { type: 'setReady' }>, actorId: string): void {
  if (isSolo(s)) fail('solo_game')
  requirePhase(s, 'design')
  requireRole(s, actorId, a.role)
  const m = missionOf(s)
  if (a.ready) {
    const blocker = readyBlocker(s, a.role)
    if (blocker) fail(blocker)
  }
  m.ready[a.role] = a.ready
  if (m.ready.scientist && m.ready.designer && m.ready.radio) {
    s.phase = 'integration'
    log(s, 'log.integration.started')
  }
}
