import { startTutorial, tutorialAct, tutorialNext, currentStep, type TutState } from '../../src/tutorial/runner'
import { TUTORIAL } from '../../src/tutorial/script'
import type { Action, GameState } from '../../src/engine/state'
import { hasKey } from '../../src/i18n/i18n'

function session() {
  let { game, tut } = startTutorial(5)
  return {
    get game(): GameState { return game },
    get tut(): TutState { return tut },
    get step() { return currentStep(tut)!.id },
    act(a: Action) {
      const r = tutorialAct(game, tut, a)
      game = r.game; tut = r.tut
      return r.accepted
    },
    must(a: Action) {
      const r = tutorialAct(game, tut, a)
      if (!r.accepted) throw new Error(`step ${currentStep(tut)?.id}: ${a.type} refused (${r.tut.hint})`)
      game = r.game; tut = r.tut
    },
    next() { const r = tutorialNext(game, tut); game = r.game; tut = r.tut },
  }
}
const plan: Action = { type: 'setPlan', total: 500, designer: 300, radio: 50, targetMonth: 40, scheduleMode: 'standard' }

function flyFirstMission(s: ReturnType<typeof session>) {
  s.next(); s.next()
  expect(s.step).toBe('pick')
  s.must({ type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'Catch fires early' })
  expect(s.step).toBe('rejected')
  expect(s.game.mission!.requests[0].status).toBe('rejected')
  expect(s.tut.lines.at(-1)).toMatchObject({ role: 'planner' })
  s.next()
  s.must({ type: 'appeal', requestId: s.game.mission!.requests[0].id, reason: 'It saves lives' })
  expect(s.step).toBe('approved')
  expect(s.game.phase).toBe('planning')
  s.next()
  s.must(plan); s.must({ type: 'confirmPlan' })
  expect(s.step).toBe('instruments')
  s.must({ type: 'requestInstruments', list: ['thermal_ir', 'hires_cam'] })
  expect(s.step).toBe('pushback')
  expect(s.game.mission!.instrumentStatus).toBe('pushed_back')
  s.next()
  s.must({ type: 'requestInstruments', list: ['thermal_ir'] })
  expect(s.game.mission!.instrumentStatus).toBe('accepted')
  expect(s.step).toBe('build')
  for (const [slot, option] of [['structure', 'medium'], ['power', 'deploy_solar'], ['battery', 'medium'], ['propulsion', 'none'], ['protection', 'none']] as const) {
    s.must({ type: 'setSlot', slot, option })
  }
  s.must({ type: 'setVehicle', vehicle: 'electron' })
  expect(s.step).toBe('gauges')
  s.next()
  s.must({ type: 'setOrbit', orbit: 'sso' })
  s.must({ type: 'setSlot', slot: 'antenna', option: 'medium' })
  s.must({ type: 'setStations', stations: ['svalbard'] })
  s.must({ type: 'setStations', stations: ['svalbard', 'kiruna'] })
  expect(s.step).toBe('funding')
  const funding = s.game.mission!.requests.find((r) => r.kind === 'funding')!
  expect(funding).toMatchObject({ from: 'radio', status: 'pending', amount: 10 })
  s.must({ type: 'review', requestId: funding.id, decision: 'approve' })
  expect(s.step).toBe('ready')
  expect(s.game.mission!.ready).toMatchObject({ scientist: true, radio: true, designer: false })
  s.must({ type: 'setReady', role: 'designer', ready: true })
  expect(s.step).toBe('integration')
  s.must({ type: 'agreePairing', role: 'designer', agree: true })
  s.must({ type: 'submitPurchase' })
  expect(s.step).toBe('poll')
  s.must({ type: 'vote', role: 'designer', vote: 'go' })
  s.must({ type: 'launch' })
  expect(s.step).toBe('flight')
  s.must({ type: 'advanceOps' })
}

describe('tutorial runner', () => {
  it('starts with the player holding all four roles', () => {
    const s = session()
    expect(s.game.players).toHaveLength(1)
    expect(s.game.players[0].roles).toHaveLength(4)
    expect(s.game.mode).toBe('local')
    expect(s.step).toBe('welcome')
  })
  it('the first flight fails on the planted flaw and the debrief names it', () => {
    const s = session()
    flyFirstMission(s)
    expect(s.game.phase).toBe('debrief')
    expect(s.step).toBe('debrief')
    expect(s.game.mission!.result!.outcome).toBe('failure')
    expect(s.game.mission!.result!.faults.map((f) => f.code)).toContain('over_capacity')
  })
  it('fixing the rocket and flying again succeeds, and the tutorial finishes', () => {
    const s = session()
    flyFirstMission(s)
    s.next(); s.next()
    s.must({ type: 'finishDebrief' })
    s.must({ type: 'nextMission', flyAgain: true })
    s.must({ ...plan, targetMonth: 60 } as Action); s.must({ type: 'confirmPlan' })
    expect(s.step).toBe('fix')
    s.must({ type: 'setVehicle', vehicle: 'pslv' })
    expect(s.step).toBe('relaunch')
    s.must({ type: 'setReady', role: 'designer', ready: true })
    s.must({ type: 'agreePairing', role: 'designer', agree: true })
    s.must({ type: 'submitPurchase' })
    s.must({ type: 'vote', role: 'designer', vote: 'go' })
    s.must({ type: 'launch' })
    s.must({ type: 'advanceOps' }); s.must({ type: 'advanceOps' })
    expect(s.game.phase).toBe('debrief')
    expect(s.game.mission!.result!.outcome).toBe('success')
    expect(s.step).toBe('success')
    s.next()
    expect(s.tut.done).toBe(true)
  })
  it('an unexpected action does not advance the step and shows a hint', () => {
    const s = session()
    s.next(); s.next()
    expect(s.act({ type: 'proposeObjective', objectiveId: 'telescope', pitch: '' })).toBe(false)
    expect(s.step).toBe('pick')
    expect(s.tut.hint).toBeTruthy()
    expect(s.game.phase).toBe('objective_proposal')
  })
  it('a budget too small for the lesson is refused with a hint', () => {
    const s = session()
    s.next(); s.next()
    s.must({ type: 'proposeObjective', objectiveId: 'wildfire', pitch: '' })
    s.next()
    s.must({ type: 'appeal', requestId: s.game.mission!.requests[0].id, reason: 'x' })
    s.next()
    expect(s.act({ ...plan, designer: 100 } as Action)).toBe(false)
    expect(s.tut.hint).toBe('tut.hint.budget')
  })
  it('Next does nothing on a step that waits for an action', () => {
    const s = session()
    s.next(); s.next(); s.next(); s.next()
    expect(s.step).toBe('pick')
  })
  it('every step has coach copy, and every hint and teammate line has copy', () => {
    const missing: string[] = []
    for (const step of TUTORIAL) {
      if (!hasKey(step.coachKey)) missing.push(step.coachKey)
      if (step.hintKey && !hasKey(step.hintKey)) missing.push(step.hintKey)
      for (const e of step.enter ?? []) if (e.sayKey && !hasKey(e.sayKey)) missing.push(e.sayKey)
    }
    expect(missing).toEqual([])
    expect(new Set(TUTORIAL.map((s) => s.id)).size).toBe(TUTORIAL.length)
  })
})
