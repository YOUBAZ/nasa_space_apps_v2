import type { Action, GameState, Request } from '../state'
import { fail } from '../state'
import type { Fault } from '../types'
import { ROLES } from '../types'
import {
  BACKORDER_DELAY_MONTHS, MARS_WAIT_COST_PER_MONTH, MARS_WINDOW_MONTHS, OBJECTIVES,
} from '../catalog'
import { evaluateDesign, outcomeOf } from '../evaluate'
import { isSolo, log, missionOf, requirePhase, requireRole } from '../ctx'
import { openRequest } from '../requests'
import { completeDesign, spendOf } from '../spend'
import { backToDesign } from './design'
import { scoreMission } from '../scoring'

function maybeOpenPoll(s: GameState): void {
  const m = missionOf(s)
  if (s.phase === 'integration' && m.pairing.designer && m.pairing.radio && m.purchaseApproved) {
    s.phase = 'go_poll'
    log(s, 'log.go_poll.started')
  }
}

export function agreePairing(s: GameState, a: Extract<Action, { type: 'agreePairing' }>, actorId: string): void {
  requirePhase(s, 'integration')
  requireRole(s, actorId, a.role)
  const m = missionOf(s)
  if (!a.agree) {
    log(s, 'log.pairing.unagreed', {}, a.role)
    backToDesign(s)
    return
  }
  m.pairing[a.role] = true
  log(s, 'log.pairing.agreed', {}, a.role)
  maybeOpenPoll(s)
}

export function submitPurchase(s: GameState, actorId: string): void {
  requirePhase(s, 'integration')
  requireRole(s, actorId, 'designer')
  const m = missionOf(s)
  if (m.purchaseApproved) fail('already_approved')
  if (m.requests.some((r) => r.kind === 'purchase' && r.status === 'pending')) fail('request_open')
  if (m.requests.some((r) => r.kind === 'purchase' && r.status === 'rejected')) fail('purchase_rejected')
  const amount = Math.round(spendOf(s, 'designer') + spendOf(s, 'radio'))
  openRequest(s, m, 'purchase', 'designer', '', { amount })
  log(s, 'log.purchase.submitted', { amount }, 'designer')
}

export function reviewPurchase(s: GameState, _r: Request, approve: boolean): void {
  requirePhase(s, 'integration')
  const m = missionOf(s)
  if (approve) {
    m.purchaseApproved = true
    log(s, 'log.purchase.approved', {}, 'planner')
    maybeOpenPoll(s)
  } else log(s, 'log.purchase.rejected', {}, 'planner')
}

export function vote(s: GameState, a: Extract<Action, { type: 'vote' }>, actorId: string): void {
  requirePhase(s, 'go_poll')
  requireRole(s, actorId, a.role)
  const m = missionOf(s)
  if (a.vote === 'nogo') {
    log(s, 'log.vote.nogo', {}, a.role)
    backToDesign(s)
    return
  }
  m.votes[a.role] = 'go'
  log(s, 'log.vote.go', {}, a.role)
}

/** Launch happens no matter what: the design is evaluated as it stands and the bill is paid. */
export function launch(s: GameState, actorId: string): void {
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  if (isSolo(s)) requirePhase(s, 'design')
  else {
    requirePhase(s, 'go_poll')
    if (ROLES.some((r) => m.votes[r] !== 'go')) fail('votes_missing')
  }
  const design = completeDesign(m, s.difficulty) ?? fail('incomplete_design')
  if (isSolo(s) && m.instrumentStatus !== 'accepted') fail('incomplete_design')
  const objective = m.objectiveId ?? fail('no_objective')

  const report = evaluateDesign(design, objective, s.difficulty, {
    unlocked: s.campaign.unlocked, scheduleMode: m.scheduleMode,
  })

  // --- schedule
  const waited = m.backorders.filter((b) => b.status === 'wait' && design[b.slot] === b.option).length
  const readyMonth = s.campaign.month + report.devMonths + waited * BACKORDER_DELAY_MONTHS
  let launchMonth = readyMonth
  if (OBJECTIVES[objective].type === 'mars') {
    launchMonth = Math.ceil(readyMonth / MARS_WINDOW_MONTHS) * MARS_WINDOW_MONTHS
  }
  const waitMonths = launchMonth - readyMonth
  const waitCost = waitMonths * MARS_WAIT_COST_PER_MONTH

  // --- planning faults, all minor and all the Planner's
  const extra: Fault[] = []
  if (readyMonth > m.targetMonth) extra.push({ severity: 'minor', code: 'schedule_overrun', roles: ['planner'] })
  if (waitMonths > 0 && m.targetMonth < launchMonth) extra.push({ severity: 'minor', code: 'missed_mars_window', roles: ['planner'] })
  if (!isSolo(s)) {
    const idle = (['designer', 'radio'] as const).some((role) => {
      const alloc = m.budget[role]
      return alloc > 0 && (alloc - spendOf(s, role)) / alloc > 0.3
    })
    if (idle) extra.push({ severity: 'minor', code: 'unused_allocation', roles: ['planner'] })
  }
  report.faults.push(...extra)
  report.outcome = outcomeOf(report.faults)

  m.report = report
  m.finalDesign = design
  m.readyMonth = readyMonth
  m.launchMonth = launchMonth
  m.waitMonths = waitMonths
  m.waitCost = waitCost
  m.totalCost = report.cost + m.fees + waitCost
  m.result = scoreMission(s)
  s.campaign.funds = Math.max(0, s.campaign.funds - m.totalCost)
  s.phase = 'launch'
  log(s, 'log.launched', { cost: m.totalCost, month: launchMonth }, 'planner')
}

const LOST_AT_LAUNCH = ['over_capacity', 'vehicle_cannot_reach', 'structure_overloaded']

export function advanceOps(s: GameState, actorId: string): void {
  requirePhase(s, 'launch', 'operations')
  requireRole(s, actorId, 'radio')
  const m = missionOf(s)
  const lostAtLaunch = m.report?.faults.some((f) => LOST_AT_LAUNCH.includes(f.code)) ?? false
  s.phase = s.phase === 'launch' && !lostAtLaunch ? 'operations' : 'debrief'
}
