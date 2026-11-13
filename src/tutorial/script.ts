import type { Action, GameState } from '../engine/state'
import type { Role } from '../engine/types'
import { ROLES } from '../engine/types'
import type { ElonPose } from '../ui/elon/poses'

/** Something a scripted teammate does, with an optional line they say. */
export interface Scripted {
  role: Role
  action: (s: GameState) => Action
  sayKey?: string
}

export interface TutorialStep {
  id: string
  coachKey: string
  pose: ElonPose
  /** role tab to show */
  tab?: Role
  /** data-tut name of the thing to highlight */
  spotlight?: string
  /** advance with the Next button */
  next?: boolean
  /** which of the player's actions this step accepts */
  allow?: (a: Action, s: GameState) => boolean
  /** shown when the player tries something else */
  hintKey?: string
  /** auto-advance once this is true */
  done?: (s: GameState) => boolean
  /** teammates act when the step begins */
  enter?: Scripted[]
  /** teammates respond while the step is active */
  react?: (s: GameState) => Scripted | null
}

const m = (s: GameState) => s.mission!
const pendingOf = (s: GameState, kind: string) => m(s).requests.find((r) => r.kind === kind && r.status === 'pending')
// The lesson needs a known budget and a known payload, or a later step could become impossible.
const planOk = (a: Action) => a.type === 'confirmPlan' || (a.type === 'setPlan' && a.scheduleMode === 'standard' && a.designer >= 200 && a.radio >= 10)
const LESSON_INSTRUMENTS = ['thermal_ir', 'hires_cam']
const instrumentsOk = (a: Action) => a.type === 'requestInstruments' && a.list.length > 0 && a.list.every((i) => LESSON_INSTRUMENTS.includes(i))
const BUILD: Record<string, string> = { structure: 'medium', power: 'deploy_solar', battery: 'medium', propulsion: 'none', protection: 'none' }

/** Teammates carry the mission from "everyone ready" to the launch button. */
const crewToLaunch = (s: GameState): Scripted | null => {
  const mi = m(s)
  if (s.phase === 'integration' && !mi.pairing.radio) return { role: 'radio', action: () => ({ type: 'agreePairing', role: 'radio', agree: true }) }
  const purchase = pendingOf(s, 'purchase')
  if (purchase) return { role: 'planner', action: () => ({ type: 'review', requestId: purchase.id, decision: 'approve' }), sayKey: 'tut.say.purchase' }
  if (s.phase === 'go_poll') {
    const waiting = ROLES.find((r) => r !== 'designer' && !mi.votes[r])
    if (waiting) return { role: waiting, action: () => ({ type: 'vote', role: waiting, vote: 'go' }) }
  }
  return null
}
const crewReady: Scripted[] = [
  { role: 'scientist', action: () => ({ type: 'setReady', role: 'scientist', ready: true }) },
  { role: 'radio', action: () => ({ type: 'setReady', role: 'radio', ready: true }), sayKey: 'tut.say.ready' },
]

/**
 * The training mission: Space Fan, wildfire watch. The player acts as each role in turn while
 * scripted teammates play the other side. The first flight carries a planted flaw (a rocket far
 * too small) so the player sees a failure, reads the debrief, fixes it, and flies again.
 */
export const TUTORIAL: TutorialStep[] = [
  { id: 'welcome', coachKey: 'tut.welcome', pose: 'idle', next: true },
  { id: 'roles', coachKey: 'tut.roles', pose: 'point', spotlight: 'roles', next: true },
  {
    id: 'pick', coachKey: 'tut.pick', pose: 'point', tab: 'scientist', spotlight: 'objectives', hintKey: 'tut.hint.pick',
    allow: (a) => a.type === 'proposeObjective' && a.objectiveId === 'wildfire',
    done: (s) => s.phase !== 'objective_proposal',
  },
  {
    id: 'rejected', coachKey: 'tut.rejected', pose: 'shrug', tab: 'scientist', spotlight: 'inbox', next: true,
    enter: [{ role: 'planner', sayKey: 'tut.say.reject',
      action: (s) => ({ type: 'review', requestId: pendingOf(s, 'objective')!.id, decision: 'reject', reason: 'Too pricey. Convince me.' }) }],
  },
  {
    id: 'appeal', coachKey: 'tut.appeal', pose: 'point', tab: 'scientist', spotlight: 'inbox', hintKey: 'tut.hint.appeal',
    allow: (a) => a.type === 'appeal',
    done: (s) => m(s).requests.some((r) => r.kind === 'objective' && r.appeals > 0),
  },
  {
    id: 'approved', coachKey: 'tut.approved', pose: 'celebrate', tab: 'planner', next: true,
    enter: [{ role: 'planner', sayKey: 'tut.say.approve',
      action: (s) => ({ type: 'review', requestId: pendingOf(s, 'objective')!.id, decision: 'approve', reason: 'Fine. One shot.' }) }],
  },
  {
    id: 'budget', coachKey: 'tut.budget', pose: 'point', tab: 'planner', spotlight: 'plan', hintKey: 'tut.hint.budget',
    allow: planOk, done: (s) => s.phase === 'design',
  },
  {
    id: 'instruments', coachKey: 'tut.instruments', pose: 'point', tab: 'scientist', spotlight: 'instruments', hintKey: 'tut.hint.instruments',
    allow: instrumentsOk,
    done: (s) => m(s).instrumentStatus !== 'none',
  },
  {
    id: 'pushback', coachKey: 'tut.pushback', pose: 'shrug', tab: 'scientist', spotlight: 'instruments', next: true,
    enter: [{ role: 'designer', sayKey: 'tut.say.pushback',
      action: () => ({ type: 'reviewInstruments', decision: 'pushback', reason: 'That is a lot of mass and power. Do you need all of it?' }) }],
  },
  {
    id: 'resend', coachKey: 'tut.resend', pose: 'point', tab: 'scientist', spotlight: 'instruments', hintKey: 'tut.hint.instruments',
    allow: instrumentsOk,
    react: (s) => (m(s).instrumentStatus === 'final'
      ? { role: 'designer', sayKey: 'tut.say.accept', action: () => ({ type: 'reviewInstruments', decision: 'accept' }) } : null),
    done: (s) => m(s).instrumentStatus === 'accepted',
  },
  {
    id: 'build', coachKey: 'tut.build', pose: 'point', tab: 'designer', spotlight: 'panel-designer', hintKey: 'tut.hint.build',
    allow: (a) => (a.type === 'setSlot' && BUILD[a.slot] === a.option) || (a.type === 'setVehicle' && a.vehicle === 'electron'),
    done: (s) => Object.entries(BUILD).every(([slot, o]) => (m(s).design as Record<string, unknown>)[slot] === o) && m(s).design.vehicle === 'electron',
  },
  { id: 'gauges', coachKey: 'tut.gauges', pose: 'shrug', tab: 'designer', spotlight: 'telemetry', next: true },
  {
    id: 'radio', coachKey: 'tut.radio', pose: 'point', tab: 'radio', spotlight: 'panel-radio', hintKey: 'tut.hint.radio',
    allow: (a) => (a.type === 'setOrbit' && a.orbit === 'sso') || (a.type === 'setSlot' && a.slot === 'antenna' && a.option === 'medium') || a.type === 'setStations',
    done: (s) => {
      const d = m(s).design
      return d.orbit === 'sso' && d.antenna === 'medium' && ['svalbard', 'kiruna'].every((x) => (d.stations ?? []).includes(x as never))
    },
  },
  {
    id: 'funding', coachKey: 'tut.funding', pose: 'point', tab: 'planner', spotlight: 'inbox', hintKey: 'tut.hint.funding',
    enter: [{ role: 'radio', sayKey: 'tut.say.funds',
      action: () => ({ type: 'requestFunds', from: 'radio', target: 'radio', amount: 10, reason: 'A backup station in case one goes down.' }) }],
    allow: (a) => a.type === 'review',
    done: (s) => !pendingOf(s, 'funding'),
  },
  {
    id: 'ready', coachKey: 'tut.ready', pose: 'point', tab: 'designer', spotlight: 'ready-designer', hintKey: 'tut.hint.ready',
    enter: crewReady,
    allow: (a) => a.type === 'setReady' && a.role === 'designer' && a.ready,
    done: (s) => s.phase === 'integration',
  },
  {
    id: 'integration', coachKey: 'tut.integration', pose: 'point', tab: 'designer', spotlight: 'integration', hintKey: 'tut.hint.integration',
    allow: (a) => (a.type === 'agreePairing' && a.role === 'designer' && a.agree) || a.type === 'submitPurchase',
    react: crewToLaunch,
    done: (s) => s.phase === 'go_poll',
  },
  {
    id: 'poll', coachKey: 'tut.poll', pose: 'point', tab: 'designer', spotlight: 'go-poll', hintKey: 'tut.hint.poll',
    allow: (a) => (a.type === 'vote' && a.vote === 'go') || a.type === 'launch',
    react: crewToLaunch,
    done: (s) => s.phase === 'launch',
  },
  {
    id: 'flight', coachKey: 'tut.flight', pose: 'celebrate',
    allow: (a) => a.type === 'advanceOps', done: (s) => s.phase === 'debrief',
  },
  { id: 'debrief', coachKey: 'tut.debrief', pose: 'shrug', spotlight: 'transmission', next: true },
  { id: 'scores', coachKey: 'tut.scores', pose: 'point', spotlight: 'scores', next: true },
  {
    id: 'close', coachKey: 'tut.close', pose: 'point', hintKey: 'tut.hint.close',
    allow: (a) => a.type === 'finishDebrief', done: (s) => s.phase === 'campaign',
  },
  {
    id: 'again', coachKey: 'tut.again', pose: 'point', hintKey: 'tut.hint.again',
    allow: (a) => a.type === 'nextMission' && a.flyAgain, done: (s) => s.phase === 'design',
  },
  {
    id: 'fix', coachKey: 'tut.fix', pose: 'point', tab: 'designer', spotlight: 'vehicles', hintKey: 'tut.hint.fix',
    allow: (a) => a.type === 'setVehicle' && a.vehicle === 'pslv',
    done: (s) => m(s).design.vehicle === 'pslv',
  },
  {
    id: 'relaunch', coachKey: 'tut.relaunch', pose: 'point', tab: 'designer', hintKey: 'tut.hint.relaunch',
    enter: crewReady,
    allow: (a) => (a.type === 'setReady' && a.role === 'designer' && a.ready) || (a.type === 'agreePairing' && a.role === 'designer' && a.agree)
      || a.type === 'submitPurchase' || (a.type === 'vote' && a.vote === 'go') || a.type === 'launch',
    react: crewToLaunch,
    done: (s) => s.phase === 'launch',
  },
  {
    id: 'flight2', coachKey: 'tut.flight2', pose: 'celebrate',
    allow: (a) => a.type === 'advanceOps', done: (s) => s.phase === 'debrief',
  },
  { id: 'success', coachKey: 'tut.success', pose: 'celebrate', next: true },
]
