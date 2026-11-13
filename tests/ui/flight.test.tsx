import { screen, fireEvent, within, act } from '@testing-library/react'
import { mount } from './helpers'
import { designGame, launchFrom, fixture, P } from '../engine/helpers/play'
import { STORY_ORDER } from '../../src/engine/flight'
import { hasKey, t } from '../../src/i18n/i18n'
import type { Design, ObjectiveId } from '../../src/engine/types'

const wildfire = fixture('fan/wildfire/viable0').design
const plan = { total: 220, designer: 200, radio: 8, targetMonth: 18 }
const launched = (design: Design = wildfire) => launchFrom(designGame('fan', 'wildfire', plan), design)
const launchedOn = (name: string, change: Partial<Design>, budget = { total: 1500, designer: 1300, radio: 100, targetMonth: 80 }) => {
  const f = fixture(name)
  return launchFrom(designGame(f.diff, f.objective as ObjectiveId, budget), { ...f.design, ...change } as Design)
}
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const page = () => within(screen.getByTestId('flight'))
const log = () => within(page().getByRole('log', { name: /radio console/i }))
const skip = () => { fireEvent.click(page().getByRole('button', { name: /skip/i })); tick(150) }
const stage = () => screen.getByTestId('flight').getAttribute('data-stage')

describe('flight: one page from the pad to the destination', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the view and the radio console together from the countdown on', () => {
    mount(launched(), P.radio)
    expect(page().getByTestId('flight-view')).toBeInTheDocument()
    expect(page().getByRole('log', { name: /radio console/i })).toBeInTheDocument()
    expect(page().getByText(/T-10/)).toBeInTheDocument()
    expect(stage()).toBe('countdown')
  })

  it("the Radio Operator's button does not appear until the rocket has left the atmosphere", () => {
    mount(launched(), P.radio)
    const contact = () => page().queryByRole('button', { name: /contact the spacecraft/i })
    expect(contact()).toBeNull()
    tick(5700) // countdown over
    expect(stage()).toBe('ascent')
    expect(contact()).toBeNull()
    tick(3000) // still climbing
    expect(stage()).toBe('ascent')
    expect(contact()).toBeNull()
    tick(6000) // through the edge of space
    expect(stage()).toBe('space')
    expect(log().getByText(/left the atmosphere/i)).toBeInTheDocument()
    expect(contact()).not.toBeNull()
  })

  it('a successful mission is tracked all the way, then talked to on arrival', () => {
    const { transport } = mount(launched(), P.radio)
    skip(); skip()
    expect(log().getByText('Liftoff!')).toBeInTheDocument()
    fireEvent.click(page().getByRole('button', { name: /contact the spacecraft/i }))
    tick(150)
    expect(transport.getState()!.phase).toBe('operations')
    expect(stage()).toBe('cruise')
    expect(screen.getByTestId('flight')).toBeInTheDocument() // same page
    expect(log().getByText('Liftoff!')).toBeInTheDocument() // same transcript
    tick(3500)
    expect(log().getByText(/50% of the way/)).toBeInTheDocument()
    skip()
    expect(stage()).toBe('arrival')
    skip()
    expect(stage()).toBe('end')
    expect(log().getByText(/Arrived after/)).toBeInTheDocument()
    expect(page().getByTestId('hud-distance')).toHaveTextContent('700 km')

    for (let i = 0; i < 4; i++) { fireEvent.click(page().getByRole('button', { name: /send command/i })); tick(1500) }
    expect(log().getByText('On station.')).toBeInTheDocument()
    expect(log().getByText('Data is flowing.')).toBeInTheDocument()
    fireEvent.click(page().getByRole('button', { name: /open the debrief/i }))
    expect(transport.getState()!.phase).toBe('debrief')
  })

  it('a far destination takes longer to reach than a near one, and the clock shows real mission time', () => {
    mount(launchedOn('fan/mars_ice/viable0', {}), P.radio)
    skip(); skip()
    fireEvent.click(page().getByRole('button', { name: /contact the spacecraft/i }))
    tick(8000) // a low orbit would long have arrived; Mars is still on its way
    expect(stage()).toBe('cruise')
    tick(16000)
    expect(stage()).not.toBe('cruise')
    skip()
    expect(page().getByTestId('hud-time')).toHaveTextContent(/7 months/)
    expect(page().getByTestId('hud-distance')).toHaveTextContent('225 million km')
    expect(page().getByTestId('hud-delay')).toHaveTextContent('12.5 min')
  })

  it('too heavy: lost on the pad, straight to the debrief', () => {
    const { transport } = mount(launched({ ...wildfire, vehicle: 'electron' }), P.radio)
    skip(); skip()
    expect(screen.getByTestId('flight')).toHaveAttribute('data-story', 'over_capacity')
    expect(stage()).toBe('end')
    expect(log().getByText(/could not lift/i)).toBeInTheDocument()
    expect(page().queryByRole('button', { name: /contact the spacecraft/i })).toBeNull()
    fireEvent.click(page().getByRole('button', { name: /open the debrief/i }))
    expect(transport.getState()!.phase).toBe('debrief')
  })

  it('nobody listening: the craft reaches space, calls home, and no one answers', () => {
    mount(launched({ ...wildfire, stations: [] }), P.radio)
    skip(); skip()
    fireEvent.click(page().getByRole('button', { name: /contact the spacecraft/i }))
    tick(150); skip()
    expect(screen.getByTestId('flight')).toHaveAttribute('data-story', 'no_station_in_view')
    expect(stage()).toBe('end')
    expect(log().getByText(/no ground station can hear it/i)).toBeInTheDocument()
    expect(page().queryByRole('button', { name: /send command/i })).toBeNull()
    expect(page().getByRole('button', { name: /open the debrief/i })).toBeInTheDocument()
  })

  it('could not stop: the failure only shows on arrival', () => {
    mount(launchedOn('fan/mars_ice/viable0', { propulsion: 'none' }), P.radio)
    skip(); skip()
    fireEvent.click(page().getByRole('button', { name: /contact the spacecraft/i }))
    tick(150); skip()
    expect(stage()).toBe('arrival') // the cruise went fine
    expect(log().queryByText(/flew straight past/i)).toBeNull()
    skip()
    expect(stage()).toBe('end')
    expect(log().getByText(/flew straight past/i)).toBeInTheDocument()
  })

  it('other players watch the same flight but cannot make contact', () => {
    mount(launched(), P.designer)
    skip(); skip()
    expect(page().queryByRole('button', { name: /contact the spacecraft/i })).toBeNull()
    expect(page().getByText(/only the radio operator can talk/i)).toBeInTheDocument()
  })

  it('every mission-ending problem has its own line to tell the players what they are watching', () => {
    const lines = STORY_ORDER.map((s) => {
      expect(hasKey(`story.${s.code}.line`), s.code).toBe(true)
      return t(`story.${s.code}.line`)
    })
    expect(new Set(lines).size).toBe(12)
  })
})
