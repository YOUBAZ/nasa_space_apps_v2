import { screen, fireEvent, within, act, render } from '@testing-library/react'
import { mount } from './helpers'
import { teamGame, designGame, debriefOf, fixture, ok, P } from '../engine/helpers/play'
import { createGame } from '../../src/engine/game'
import { CrashBoundary } from '../../src/ui/components/CrashBoundary'

const wildfire = fixture('fan/wildfire/viable0').design
const tab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }))

describe('online reconnect (review C1, I5)', () => {
  it('a role freed by a dropped player can be claimed from the board', () => {
    const s = ok(designGame('fan'), { type: 'setConnected', playerId: P.designer, connected: false }, 'p1')
    const { transport } = mount(s, P.radio)
    fireEvent.click(screen.getByRole('button', { name: /take the designer role/i }))
    expect(transport.getState()!.players.find((p) => p.id === P.radio)!.roles.sort()).toEqual(['designer', 'radio'])
    expect(screen.queryByRole('button', { name: /take the designer role/i })).not.toBeInTheDocument()
  })
  it('the online lobby has no auto-assign (it could only give every role to the host)', () => {
    let s = createGame({ mode: 'online', difficulty: 'fan', seed: 1, hostName: 'Host' })
    s = ok(s, { type: 'join', name: 'Bo' }, 'c1')
    mount(s, 'p1')
    expect(screen.queryByRole('button', { name: /auto-assign/i })).not.toBeInTheDocument()
  })
})

describe('scientist draft (review I2)', () => {
  it("someone else's action does not wipe instruments ticked but not yet sent", () => {
    const { transport } = mount(designGame('fan'), P.scientist)
    tab(/scientist/i)
    const panel = within(screen.getByTestId('panel-scientist'))
    fireEvent.click(panel.getByRole('button', { name: /^thermal infrared camera/i }))
    act(() => transport.dispatch({ type: 'setSlot', slot: 'structure', option: 'medium' }, P.designer))
    act(() => transport.dispatch({ type: 'chat', text: 'hello' }, P.radio))
    expect(panel.getByRole('button', { name: /^thermal infrared camera/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('funding (review I9)', () => {
  it("a request raised from the Radio Operator's antenna asks for the Designer's pot, where antennas are paid", () => {
    const { transport } = mount(designGame('fan', 'wildfire', { designer: 60 }), P.radio)
    tab(/radio/i)
    fireEvent.click(within(screen.getByTestId('panel-radio')).getByRole('button', { name: /request funds for deep-space dish/i }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText(/reason/i), { target: { value: 'Mars needs it' } })
    fireEvent.click(dialog.getByRole('button', { name: /send request/i }))
    expect(transport.getState()!.mission!.requests.at(-1)).toMatchObject({ from: 'radio', target: 'designer', amount: 13 })
  })
  it('the Planner can top up the mission from campaign funds', () => {
    const { transport } = mount(designGame('fan', 'wildfire', { total: 100, designer: 60, radio: 10 }), P.planner)
    tab(/planner/i)
    const panel = within(screen.getByTestId('panel-planner'))
    fireEvent.change(panel.getByLabelText(/add from campaign funds/i), { target: { value: '150' } })
    fireEvent.click(panel.getByRole('button', { name: /add to reserve/i }))
    expect(transport.getState()!.mission!.budget).toMatchObject({ total: 250, reserve: 180 })
  })
})

describe('debrief (review I8)', () => {
  it('only the Radio Operator sees the button that closes it', () => {
    const s = debriefOf(wildfire, 'wildfire', { total: 220, designer: 200, radio: 8, targetMonth: 18 })
    const view = mount(s, P.scientist)
    expect(screen.queryByRole('button', { name: /close the debrief/i })).not.toBeInTheDocument()
    expect(screen.getByText(/radio operator will close the debrief/i)).toBeInTheDocument()
    view.unmount()
    mount(s, P.radio)
    expect(screen.getByRole('button', { name: /close the debrief/i })).toBeInTheDocument()
  })
})

describe('engine errors are shown on every screen', () => {
  it('a refused action in the lobby shows a message', () => {
    const { transport } = mount(teamGame('fan', 'online'), P.radio)
    act(() => transport.dispatch({ type: 'launch' }, P.radio))
    expect(screen.getByRole('alert')).toHaveTextContent(/another role|not at this stage/i)
  })
})

describe('crash boundary', () => {
  it('offers a way out instead of a blank page', () => {
    const Boom = () => { throw new Error('bad save') }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<CrashBoundary><Boom /></CrashBoundary>)
    spy.mockRestore()
    expect(screen.getByRole('heading', { name: /something broke/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear saved game and restart/i })).toBeInTheDocument()
  })
})
