import type { Action, GameState } from '../state'
import { fail } from '../state'
import { isSolo, log, missionOf, requirePhase, requireRole, validAmount } from '../ctx'
import { enterDesign } from './design'

export function setPlan(s: GameState, a: Extract<Action, { type: 'setPlan' }>, actorId: string): void {
  requirePhase(s, 'planning')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  const total = validAmount(a.total)
  const designer = isSolo(s) ? total : validAmount(a.designer)
  const radio = isSolo(s) ? 0 : validAmount(a.radio)
  if (designer + radio > total) fail('allocation_exceeds_total')
  if (total > s.campaign.funds) fail('exceeds_funds')
  if (!Number.isInteger(a.targetMonth) || a.targetMonth <= s.campaign.month) fail('invalid_target')
  if (!['rush', 'standard', 'careful'].includes(a.scheduleMode)) fail('invalid_mode')
  m.budget = { total, designer, radio, reserve: total - designer - radio }
  m.targetMonth = a.targetMonth
  m.scheduleMode = a.scheduleMode
  m.planSet = true
}

export function confirmPlan(s: GameState, actorId: string): void {
  requirePhase(s, 'planning')
  requireRole(s, actorId, 'planner')
  const m = missionOf(s)
  if (!m.planSet) fail('no_plan')
  log(s, 'log.plan.confirmed', { total: m.budget.total, target: m.targetMonth }, 'planner')
  enterDesign(s)
}
