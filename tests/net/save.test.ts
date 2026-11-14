import { loadSave, SAVE_KEY } from '../../src/net/localTransport'
import { designGame, ok, P } from '../engine/helpers/play'

describe('saved games from before the instrument negotiation', () => {
  afterEach(() => localStorage.clear())

  it('load with the new fields filled in, and can be played on', () => {
    const old = { ...designGame('fan'), mode: 'local' as const }
    const mission = { ...old.mission!, instrumentStatus: 'final', scientistOverrode: true } as Record<string, unknown>
    delete mission.instrumentThread
    delete mission.instrumentPushbacks
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...old, mission }))
    const s = loadSave()!
    expect(s.mission!.instrumentThread).toEqual([])
    expect(s.mission!.instrumentPushbacks).toBe(0)
    // "final" used to mean "the Scientist's last word"; now only the Planner's ruling makes a list final
    expect(s.mission!.instrumentStatus).toBe('pending')
    const next = ok(s, { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)
    expect(next.mission!.instrumentThread).toHaveLength(1)
  })

  it('leaves a current save alone', () => {
    const now = ok({ ...designGame('fan'), mode: 'local' as const }, { type: 'requestInstruments', list: ['thermal_ir'] }, P.scientist)
    localStorage.setItem(SAVE_KEY, JSON.stringify(now))
    expect(loadSave()).toEqual(now)
  })
})
