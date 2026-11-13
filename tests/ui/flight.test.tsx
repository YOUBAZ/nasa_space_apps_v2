import { screen, fireEvent, within, act } from '@testing-library/react'
import { mount } from './helpers'
import { designGame, launchFrom, fixture, P } from '../engine/helpers/play'

const wildfire = fixture('fan/wildfire/viable0').design
const plan = { total: 220, designer: 200, radio: 8, targetMonth: 18 }
const launched = (design = wildfire) => launchFrom(designGame('fan', 'wildfire', plan), design)
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('flight: launch and radio on one page', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the launch view and the radio console together from the countdown on', () => {
    mount(launched(), P.radio)
    const page = within(screen.getByTestId('flight'))
    expect(page.getByTestId('flight-view')).toBeInTheDocument()
    expect(page.getByRole('log', { name: /radio console/i })).toBeInTheDocument()
    expect(page.getByText(/T-10/)).toBeInTheDocument()
  })

  it('the console logs the launch calls, then each command and its reply, without leaving the page', () => {
    const { transport } = mount(launched(), P.radio)
    const page = within(screen.getByTestId('flight'))
    const log = within(page.getByRole('log', { name: /radio console/i }))
    fireEvent.click(page.getByRole('button', { name: /skip/i }))
    expect(log.getByText(/Liftoff/)).toBeInTheDocument()
    expect(log.getByText(/Main engine cut-off/)).toBeInTheDocument()

    fireEvent.click(page.getByRole('button', { name: /contact the spacecraft/i }))
    expect(transport.getState()!.phase).toBe('operations')
    // still the same page, with the earlier lines still in the log
    expect(screen.getByTestId('flight')).toBeInTheDocument()
    expect(log.getByText(/Liftoff/)).toBeInTheDocument()

    fireEvent.click(page.getByRole('button', { name: /send command/i }))
    expect(log.getByText('Confirm you have arrived.')).toBeInTheDocument()
    expect(log.queryByText('On station.')).not.toBeInTheDocument()
    expect(page.getByRole('button', { name: /waiting for a reply/i })).toBeDisabled()
    tick(1500)
    expect(log.getByText('On station.')).toBeInTheDocument()

    for (let i = 0; i < 3; i++) { fireEvent.click(page.getByRole('button', { name: /send command/i })); tick(1500) }
    expect(log.getByText('Send the science home.')).toBeInTheDocument()
    expect(log.getByText('Data is flowing.')).toBeInTheDocument()
    fireEvent.click(page.getByRole('button', { name: /open the debrief/i }))
    expect(transport.getState()!.phase).toBe('debrief')
  })

  it('a spacecraft that cannot answer gets silence, and the conversation stops there', () => {
    // no ground stations: the launch works, but nobody can hear the spacecraft
    mount(launched({ ...wildfire, stations: [] }), P.radio)
    const page = within(screen.getByTestId('flight'))
    const log = within(page.getByRole('log', { name: /radio console/i }))
    fireEvent.click(page.getByRole('button', { name: /skip/i }))
    fireEvent.click(page.getByRole('button', { name: /contact the spacecraft/i }))
    fireEvent.click(page.getByRole('button', { name: /send command/i }))
    tick(1500)
    // the very first command already goes unanswered
    expect(log.getByText('Confirm you have arrived.')).toBeInTheDocument()
    expect(log.getByText('Nothing is reaching the ground.')).toBeInTheDocument()
    expect(page.getByText(/no signal/i)).toBeInTheDocument()
    expect(page.queryByRole('button', { name: /send command/i })).not.toBeInTheDocument()
    expect(page.getByRole('button', { name: /open the debrief/i })).toBeInTheDocument()
  })

  it('a rocket lost on the way up goes straight to the debrief from the same page', () => {
    const { transport } = mount(launched({ ...wildfire, vehicle: 'electron' }), P.radio)
    const page = within(screen.getByTestId('flight'))
    fireEvent.click(page.getByRole('button', { name: /skip/i }))
    expect(within(page.getByRole('log', { name: /radio console/i })).getByText(/Vehicle lost/)).toBeInTheDocument()
    fireEvent.click(page.getByRole('button', { name: /open the debrief/i }))
    expect(transport.getState()!.phase).toBe('debrief')
  })

  it('other players watch the same conversation but cannot send', () => {
    mount(launched(), P.designer)
    const page = within(screen.getByTestId('flight'))
    fireEvent.click(page.getByRole('button', { name: /skip/i }))
    expect(page.queryByRole('button', { name: /contact the spacecraft/i })).not.toBeInTheDocument()
    expect(page.getByText(/only the radio operator can talk/i)).toBeInTheDocument()
  })
})
