import type { Action, GameState } from './state'
import { fail } from './state'
import { CAMPAIGN_MAX_LAUNCHES, CAMPAIGN_MIN_FUNDS } from './catalog'
import { log, missionOf, requirePhase, requireRole } from './ctx'
import { badgesFor, makePatch, xpFor } from './gamify'
import { newMission } from './game'

/** Closes the debrief: pays the grant, hands out XP, badges, unlocks and the mission patch. */
export function finishDebrief(s: GameState): void {
  requirePhase(s, 'debrief')
  const m = missionOf(s)
  const result = m.result ?? fail('no_result')
  const design = m.finalDesign ?? fail('no_result')
  const c = s.campaign

  const badges = badgesFor(c.history, result, design)
  c.funds += result.grant
  c.launches += 1
  c.month = result.launchMonth
  for (const a of result.awards) if (a.id === 'new_gear' && a.unlock && !c.unlocked.includes(a.unlock)) c.unlocked.push(a.unlock)
  c.patches.push(makePatch(s.seed + c.launches, result.objectiveId, c.teamName, result.outcome))
  c.history.push(result)
  c.lastDesign = design
  c.lastObjective = result.objectiveId

  for (const p of s.players) {
    if (p.roles.length > 0) {
      const avg = p.roles.reduce((sum, r) => sum + result.roleScores[r], 0) / p.roles.length
      p.xp += xpFor(avg)
    }
    for (const b of badges) if (!p.badges.includes(b)) p.badges.push(b)
  }

  const over = c.launches >= CAMPAIGN_MAX_LAUNCHES || c.funds < CAMPAIGN_MIN_FUNDS
  s.phase = over ? 'campaign_over' : 'campaign'
  log(s, over ? 'log.campaign.over' : 'log.debrief.finished', { funds: c.funds, grant: result.grant })
}

export function nextMission(s: GameState, a: Extract<Action, { type: 'nextMission' }>, actorId: string): void {
  requirePhase(s, 'campaign')
  requireRole(s, actorId, 'planner')
  const c = s.campaign
  s.mission = newMission()
  if (a.flyAgain && c.lastDesign && c.lastObjective) {
    // Same objective, already approved once: go straight to planning with the old design as a template.
    s.mission.objectiveId = c.lastObjective
    s.mission.template = c.lastDesign
    s.phase = 'planning'
    log(s, 'log.mission.fly_again', { objective: c.lastObjective }, 'planner')
    return
  }
  s.phase = 'objective_proposal'
  log(s, 'log.mission.new', {}, 'planner')
}
