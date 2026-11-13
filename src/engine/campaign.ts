import type { Action, GameState } from './state'
import { fail } from './state'
import { CAMPAIGN_MAX_LAUNCHES } from './catalog'
import { minLaunchCost } from './spend'
import { log, missionOf, requirePhase, requireRole } from './ctx'
import { badgesFor, makePatch, xpFor } from './gamify'
import { newMission } from './game'
import { enterDesign } from './phases/design'

/** Closes the debrief: pays the grant, hands out XP, badges, unlocks and the mission patch. */
export function finishDebrief(s: GameState, actorId: string): void {
  requirePhase(s, 'debrief')
  // The Radio Operator presents the debrief, so the Radio Operator decides when it is over.
  requireRole(s, actorId, 'radio')
  const m = missionOf(s)
  const result = m.result ?? fail('no_result')
  const design = m.finalDesign ?? fail('no_result')
  const c = s.campaign

  const badges = badgesFor(c.history, result, design)
  c.funds += result.grant
  c.launches += 1
  for (const a of result.awards) if (a.id === 'new_gear' && a.unlock && !c.unlocked.includes(a.unlock)) c.unlocked.push(a.unlock)
  c.patches.push(makePatch(s.seed + c.launches, result.objectiveId, c.teamName, result.outcome))
  c.history.push(result)
  c.lastDesign = design
  c.lastObjective = result.objectiveId
  // the split as it stood at launch, including anything the Planner added along the way
  c.lastPlan = {
    total: m.budget.total, designer: m.budget.designer, radio: m.budget.radio,
    lead: Math.max(1, m.targetMonth - c.month), scheduleMode: m.scheduleMode,
  }
  c.month = result.launchMonth

  for (const p of s.players) {
    if (p.roles.length > 0) {
      const avg = p.roles.reduce((sum, r) => sum + result.roleScores[r], 0) / p.roles.length
      p.xp += xpFor(avg)
    }
    for (const b of badges) if (!p.badges.includes(b)) p.badges.push(b)
  }

  // The campaign ends when no complete spacecraft could be paid for any more.
  const over = c.launches >= CAMPAIGN_MAX_LAUNCHES || c.funds < minLaunchCost(s.difficulty, c.unlocked)
  s.phase = over ? 'campaign_over' : 'campaign'
  log(s, over ? 'log.campaign.over' : 'log.debrief.finished', { funds: c.funds, grant: result.grant })
}

export function nextMission(s: GameState, a: Extract<Action, { type: 'nextMission' }>, actorId: string): void {
  requirePhase(s, 'campaign')
  requireRole(s, actorId, 'planner')
  const c = s.campaign
  s.mission = newMission()
  if (a.flyAgain && c.lastDesign && c.lastObjective) {
    // Same objective, already approved once. Nothing from the last flight is changed:
    // the same budget split, schedule and design come back, and the team applies only its fix.
    const m = s.mission
    m.objectiveId = c.lastObjective
    m.template = c.lastDesign
    log(s, 'log.mission.fly_again', { objective: c.lastObjective }, 'planner')
    const plan = c.lastPlan
    if (plan && plan.total <= c.funds) {
      m.budget = {
        total: plan.total, designer: plan.designer, radio: plan.radio,
        reserve: plan.total - plan.designer - plan.radio, initialDesigner: plan.designer,
      }
      m.targetMonth = c.month + plan.lead
      m.scheduleMode = plan.scheduleMode
      m.planSet = true
      enterDesign(s)
      return
    }
    // The campaign can no longer pay for the same budget: the Planner re-plans from the old numbers.
    m.suggestedPlan = plan
    s.phase = 'planning'
    return
  }
  s.phase = 'objective_proposal'
  log(s, 'log.mission.new', {}, 'planner')
}
