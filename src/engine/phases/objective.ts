import type { Action, GameState, Request } from '../state'
import { fail, MAX_APPEALS } from '../state'
import { objectivesFor } from '../catalog'
import { isSolo, log, missionOf, requirePhase, requireRole } from '../ctx'
import { closeOpen, openRequest } from '../requests'

export function proposeObjective(s: GameState, a: Extract<Action, { type: 'proposeObjective' }>, actorId: string): void {
  requirePhase(s, 'objective_proposal')
  requireRole(s, actorId, 'scientist')
  const m = missionOf(s)
  if (!objectivesFor(s.difficulty).includes(a.objectiveId)) fail('unavailable')
  if (m.rejectedObjectives.includes(a.objectiveId)) fail('objective_rejected')
  closeOpen(m, 'objective')
  // Coming back to an objective that was turned down uses up an appeal, however it is done.
  const priorRejections = m.objectiveRejections[a.objectiveId] ?? 0
  m.objectiveId = a.objectiveId
  m.pitch = (a.pitch ?? '').trim().slice(0, 200)
  log(s, 'log.objective.proposed', { objective: a.objectiveId }, 'scientist')
  if (isSolo(s)) {
    s.phase = 'planning'
    return
  }
  const r = openRequest(s, m, 'objective', 'scientist', m.pitch, { objectiveId: a.objectiveId })
  r.appeals = Math.min(MAX_APPEALS, priorRejections)
  s.phase = 'objective_review'
}

export function reviewObjective(s: GameState, r: Request, approve: boolean): void {
  const m = missionOf(s)
  if (approve) {
    s.phase = 'planning'
    log(s, 'log.objective.approved', { objective: r.objectiveId ?? '' }, 'planner')
    return
  }
  if (r.objectiveId) m.objectiveRejections[r.objectiveId] = (m.objectiveRejections[r.objectiveId] ?? 0) + 1
  if (r.appeals >= MAX_APPEALS && r.objectiveId) m.rejectedObjectives.push(r.objectiveId)
  s.phase = 'objective_proposal'
  log(s, 'log.objective.rejected', { objective: r.objectiveId ?? '', left: MAX_APPEALS - r.appeals }, 'planner')
}
