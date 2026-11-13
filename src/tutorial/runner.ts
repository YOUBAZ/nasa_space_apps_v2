import { applyAction, createGame } from '../engine/game'
import type { Action, GameState } from '../engine/state'
import type { Role } from '../engine/types'
import { ROLES } from '../engine/types'
import { TUTORIAL, type Scripted, type TutorialStep } from './script'

export interface TutLine { role: Role; key: string }
export interface TutState {
  index: number
  /** the current step's teammates have already acted */
  entered: boolean
  /** shown when the player tries something the step is not about */
  hint: string | null
  /** what scripted teammates have said so far */
  lines: TutLine[]
  done: boolean
}

const PLAYER = 'p1'
export const currentStep = (tut: TutState): TutorialStep | undefined => TUTORIAL[tut.index]

function run(game: GameState, tut: TutState, scripted: Scripted): GameState {
  const r = applyAction(game, scripted.action(game), PLAYER)
  if (!r.ok) return game
  if (scripted.sayKey) tut.lines.push({ role: scripted.role, key: scripted.sayKey })
  return r.state
}

/** Let teammates act and move through every step that is already complete. */
function settle(game0: GameState, tut0: TutState): { game: GameState; tut: TutState } {
  let game = game0
  const tut: TutState = { ...tut0, lines: [...tut0.lines] }
  for (let guard = 0; guard < 200; guard++) {
    const step = TUTORIAL[tut.index]
    if (!step) { tut.done = true; break }
    if (!tut.entered) {
      for (const s of step.enter ?? []) game = run(game, tut, s)
      tut.entered = true
    }
    for (let i = 0; i < 12; i++) {
      const next = step.react?.(game)
      if (!next) break
      const after = run(game, tut, next)
      if (after === game) break
      game = after
    }
    if (step.next || !step.done?.(game)) break
    tut.index += 1
    tut.entered = false
    tut.hint = null
  }
  return { game, tut }
}

/** A fresh training game: one player holding every role, already at the objective step. */
export function startTutorial(seed = 2026): { game: GameState; tut: TutState } {
  let game = createGame({ mode: 'local', difficulty: 'fan', seed, hostName: 'You' })
  const steps: Action[] = [...ROLES.map((role) => ({ type: 'claimRole', role }) as Action), { type: 'setTeamName', name: 'Training Crew' }, { type: 'startCampaign' }]
  for (const a of steps) {
    const r = applyAction(game, a, PLAYER)
    if (r.ok) game = r.state
  }
  return settle(game, { index: 0, entered: false, hint: null, lines: [], done: false })
}

/** The player tries something. Only what the current step is teaching is let through. */
export function tutorialAct(game: GameState, tut: TutState, action: Action): { game: GameState; tut: TutState; accepted: boolean } {
  const step = currentStep(tut)
  const refuse = (hint: string) => ({ game, tut: { ...tut, hint }, accepted: false })
  if (!step || !step.allow?.(action, game)) return refuse(step?.hintKey ?? 'tut.hint.generic')
  const r = applyAction(game, action, PLAYER)
  if (!r.ok) return refuse(step.hintKey ?? 'tut.hint.generic')
  return { ...settle(r.state, { ...tut, hint: null }), accepted: true }
}

/** The Next button: only moves on from steps that are just the coach talking. */
export function tutorialNext(game: GameState, tut: TutState): { game: GameState; tut: TutState } {
  const step = currentStep(tut)
  if (!step?.next) return { game, tut }
  return settle(game, { ...tut, index: tut.index + 1, entered: false, hint: null })
}
