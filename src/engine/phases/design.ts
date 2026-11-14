import type { Action, GameState, InstrumentStep, Mission, ReadyRole, Request } from '../state'
import { fail, MAX_PUSHBACKS } from '../state'
import type { InstrumentId, Slot } from '../types'
import { RADIO_SLOTS } from '../types'
import {
  BACKORDER_DELAY_MONTHS, EXPRESS_FEE, INSTRUMENTS, STATIONS, instrumentsFor, optionsFor, orbitsFor,
  vehiclesFor,
} from '../catalog'
import { isSolo, log, missionOf, newId, random, requirePhase, requireRole, validAmount } from '../ctx'
import { hasOpenRequest, openRequest, requireReason } from '../requests'
import { SCHEDULE } from '../evaluate'
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
    m.instrumentThread.push({ by: 'designer', kind: 'accept', list: [...list] })
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
  // The purchase order described the old design, whatever had been decided about it.
  for (const r of m.requests) if (r.kind === 'purchase' && r.status !== 'closed') r.status = 'closed'
  log(s, 'log.back_to_design')
}

/**
 * Shared entry for every design edit: right phase, right role, then reopen the design if needed.
 * Returns null when the edit would change nothing, so a stray click cannot undo the team's approvals.
 */
function beginEdit(s: GameState, actorId: string, role: 'scientist' | 'designer' | 'radio', unchanged: (m: Mission) => boolean = () => false): Mission | null {
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, role)
  if (unchanged(missionOf(s))) return null
  backToDesign(s)
  return missionOf(s)
}

export function setSlot(s: GameState, a: Extract<Action, { type: 'setSlot' }>, actorId: string): void {
  const owner = ownerOf(a.slot)
  const m = beginEdit(s, actorId, owner, (x) => x.design[a.slot] === a.option)
  if (!m) return
  if (!optionsFor(s.difficulty, a.slot, s.campaign.unlocked).includes(a.option)) fail('unavailable')
  if (m.banned.some((b) => b.slot === a.slot && b.option === a.option)) fail('substituted')
  m.design[a.slot] = a.option
  m.ready[owner] = false
  if (owner === 'radio') m.ready.designer = false
  checkCaps(s)
}

export function setVehicle(s: GameState, a: Extract<Action, { type: 'setVehicle' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'designer', (x) => x.design.vehicle === a.vehicle)
  if (!m) return
  if (!vehiclesFor(s.difficulty).includes(a.vehicle)) fail('unavailable')
  m.design.vehicle = a.vehicle
  m.ready.designer = false
  checkCaps(s)
}

export function setOrbit(s: GameState, a: Extract<Action, { type: 'setOrbit' }>, actorId: string): void {
  const m = beginEdit(s, actorId, 'radio', (x) => x.design.orbit === a.orbit)
  if (!m) return
  if (!orbitsFor(s.difficulty).includes(a.orbit)) fail('unavailable')
  m.design.orbit = a.orbit
  m.ready.radio = false
  checkCaps(s)
}

export function setStations(s: GameState, a: Extract<Action, { type: 'setStations' }>, actorId: string): void {
  const list = a.stations ?? []
  const same = (x: Mission) => (x.design.stations ?? []).length === list.length && list.every((id, i) => x.design.stations![i] === id)
  const m = beginEdit(s, actorId, 'radio', same)
  if (!m) return
  if (new Set(list).size !== list.length || list.some((id) => !STATIONS[id])) fail('invalid_stations')
  m.design.stations = [...list]
  m.ready.radio = false
  checkCaps(s)
}

/** What a list of instruments takes out of the Designer's allocation (schedule price change included). */
export function instrumentCost(s: GameState, list: InstrumentId[]): number {
  const mult = SCHEDULE[missionOf(s).scheduleMode].cost
  return list.reduce((sum, i) => sum + INSTRUMENTS[i].cost, 0) * mult
}
/** The cheapest single instrument the Scientist could still pick: no limit may be set below this. */
export const cheapestInstrument = (s: GameState): number =>
  Math.min(...instrumentsFor(s.difficulty, s.campaign.unlocked).map((i) => instrumentCost(s, [i])))

const sameSet = (a: InstrumentId[], b: InstrumentId[]) => a.length === b.length && a.every((x) => b.includes(x))
const note = (text: string | undefined): string | undefined => (text ?? '').trim().slice(0, 300) || undefined
const step = (m: Mission, x: InstrumentStep) => { m.instrumentThread.push(x) }

/**
 * The Scientist sends a list. It never goes on the craft by itself: the Designer approves what flies.
 * After a push-back the same list means "I insist"; a different one is a change.
 * Once the Planner has ruled, every list must fit the Planner's limit, and the Designer must accept it.
 */
export function requestInstruments(s: GameState, a: Extract<Action, { type: 'requestInstruments' }>, actorId: string): void {
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, 'scientist')
  const list = a.list ?? []
  const allowed = instrumentsFor(s.difficulty, s.campaign.unlocked)
  if (list.length === 0 || new Set(list).size !== list.length || list.some((i) => !allowed.includes(i))) {
    fail('invalid_instruments')
  }
  const before = missionOf(s)
  if (!isSolo(s)) {
    if (before.instrumentStatus === 'escalated') fail('awaiting_planner')
    if (before.instrumentCap !== undefined && instrumentCost(s, list) > before.instrumentCap + 1e-9) fail('over_instrument_cap')
    // Sending the list that is already agreed (or already waiting) changes nothing.
    const settled = before.instrumentStatus === 'accepted' || before.instrumentStatus === 'pending' || before.instrumentStatus === 'final'
    if (settled && sameSet(list, before.instrumentRequest)) return
  }
  backToDesign(s)
  const m = missionOf(s)
  m.ready.scientist = false
  if (isSolo(s)) {
    m.instrumentRequest = [...list]
    m.design.instruments = [...list]
    m.instrumentStatus = 'accepted'
    checkCaps(s)
    return
  }
  const kind = m.instrumentStatus === 'none' ? 'list' : m.instrumentStatus === 'pushed_back' && sameSet(list, m.instrumentRequest) ? 'insist' : 'change'
  m.instrumentRequest = [...list]
  m.instrumentStatus = m.instrumentCap !== undefined ? 'final' : 'pending'
  m.ready.designer = false
  step(m, { by: 'scientist', kind, list: [...list], text: note(a.note) })
  if (kind === 'insist') log(s, 'log.instruments.insisted', { n: list.length }, 'scientist')
  else log(s, 'log.instruments.requested', { n: list.length }, 'scientist')
}

/**
 * The Designer decides what goes on the craft: approve, push back (twice at most, with a reason),
 * or, at the third look, take the disagreement to the Planner. A list sent after the Planner's ruling must be accepted.
 */
export function reviewInstruments(s: GameState, a: Extract<Action, { type: 'reviewInstruments' }>, actorId: string): void {
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, 'designer')
  const m = missionOf(s)
  if (m.instrumentStatus !== 'pending' && m.instrumentStatus !== 'final') fail('nothing_to_review')
  if (a.decision === 'pushback' || a.decision === 'escalate') {
    if (m.instrumentStatus === 'final') fail('already_final')
    const last = m.instrumentPushbacks >= MAX_PUSHBACKS
    if (a.decision === 'pushback' && last) fail('no_pushbacks_left')
    if (a.decision === 'escalate' && !last) fail('cannot_escalate_yet')
    m.pushbackReason = requireReason(a.reason)
    if (a.decision === 'pushback') {
      m.instrumentPushbacks += 1
      m.instrumentStatus = 'pushed_back'
      step(m, { by: 'designer', kind: 'pushback', text: m.pushbackReason })
      log(s, 'log.instruments.pushed_back', { n: m.instrumentPushbacks, max: MAX_PUSHBACKS }, 'designer')
    } else {
      m.instrumentStatus = 'escalated'
      step(m, { by: 'designer', kind: 'escalate', text: m.pushbackReason })
      log(s, 'log.instruments.escalated', {}, 'designer')
    }
    return
  }
  if (a.decision !== 'accept') fail('invalid_choice')
  backToDesign(s)
  m.design.instruments = [...m.instrumentRequest]
  m.instrumentStatus = 'accepted'
  m.pushbackReason = undefined
  m.ready.designer = false
  checkCaps(s)
  step(m, { by: 'designer', kind: 'accept', list: [...m.instrumentRequest] })
  log(s, 'log.instruments.accepted', { n: m.instrumentRequest.length }, 'designer')
}

/**
 * The Planner settles an escalated disagreement with money: the most the Scientist's instruments may cost.
 * It can never be more than the Designer has been given, and never less than the cheapest instrument.
 */
export function capInstruments(s: GameState, a: Extract<Action, { type: 'capInstruments' }>, actorId: string): void {
  if (isSolo(s)) fail('solo_game')
  requirePhase(s, 'design', 'integration', 'go_poll')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  if (m.instrumentStatus !== 'escalated' && m.instrumentStatus !== 'capped') fail('nothing_escalated')
  const amount = validAmount(a.amount)
  if (amount <= 0) fail('invalid_amount')
  if (amount > m.budget.designer + 1e-9) fail('cap_exceeds_allocation')
  if (amount + 1e-9 < cheapestInstrument(s)) fail('cap_too_small')
  m.instrumentCap = amount
  m.instrumentStatus = 'capped'
  step(m, { by: 'planner', kind: 'cap', amount, text: note(a.reason) })
  log(s, 'log.instruments.capped', { amount }, 'planner')
}

export function requestFunds(s: GameState, a: Extract<Action, { type: 'requestFunds' }>, actorId: string): void {
  if (isSolo(s)) fail('solo_game')
  requirePhase(s, 'design')
  requireRole(s, actorId, a.from)
  const m = missionOf(s)
  if (validAmount(a.amount) <= 0) fail('invalid_amount')
  if (a.target !== 'designer' && a.target !== 'radio') fail('invalid_target')
  if (hasOpenRequest(m, a.from, 'funding')) fail('request_open')
  // Asking again for the same money (or more) is an appeal, not a new request.
  const earlier = m.requests.filter((r) => r.kind === 'funding' && r.from === a.from && r.target === a.target)
  if (earlier.some((r) => r.exhausted && a.amount >= (r.amount ?? 0))) fail('appeals_exhausted')
  const open = earlier.find((r) => r.status === 'rejected')
  if (open) {
    if (a.amount >= (open.amount ?? 0)) fail('use_appeal')
    open.status = 'closed' // a smaller ask is "another option"
  }
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
  // The Scientist's limit was promised out of the Designer's money.
  if (a.from === 'designer' && m.instrumentCap !== undefined && m.budget.designer - amount < m.instrumentCap - 1e-9) fail('below_instrument_cap')
  m.budget[a.from] -= amount
  m.budget[a.to] += amount
}

/** The Planner adds campaign money to this mission (into the reserve), e.g. when the first budget proves too small. */
export function topUp(s: GameState, a: Extract<Action, { type: 'topUp' }>, actorId: string): void {
  requirePhase(s, 'design')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  const amount = validAmount(a.amount)
  if (amount <= 0) fail('invalid_amount')
  if (m.budget.total + amount > s.campaign.funds) fail('exceeds_funds')
  m.budget.total += amount
  if (isSolo(s)) m.budget.designer += amount
  else m.budget.reserve += amount
  log(s, 'log.funds.topup', { amount }, 'planner')
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
