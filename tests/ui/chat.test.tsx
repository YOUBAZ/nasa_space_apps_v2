import { screen, fireEvent, within, act } from '@testing-library/react'
import { mount } from './helpers'
import { teamGame, soloGame, ok, P } from '../engine/helpers/play'

describe('chat dock', () => {
  it('sends a message as this player', () => {
    const { transport } = mount(teamGame('fan', 'online'), P.designer)
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    const dock = within(screen.getByTestId('chat'))
    fireEvent.change(dock.getByLabelText(/message/i), { target: { value: 'Which rocket?' } })
    fireEvent.click(dock.getByRole('button', { name: /send/i }))
    expect(transport.getState()!.chat.at(-1)).toMatchObject({ playerId: P.designer, text: 'Which rocket?' })
    expect(dock.getByText('Which rocket?')).toBeInTheDocument()
    expect(dock.getByLabelText(/message/i)).toHaveValue('')
  })
  it('shows decisions as system lines between messages', () => {
    let s = ok(teamGame('fan', 'online'), { type: 'chat', text: 'Proposing now' }, P.scientist)
    s = ok(s, { type: 'proposeObjective', objectiveId: 'wildfire', pitch: 'x' }, P.scientist)
    mount(s, P.planner)
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    const items = within(screen.getByTestId('chat')).getAllByRole('listitem').map((li) => li.textContent)
    const iChat = items.findIndex((x) => x!.includes('Proposing now'))
    const iSys = items.findIndex((x) => x!.includes('proposed "Wildfire & disaster watch"'))
    expect(iChat).toBeGreaterThanOrEqual(0)
    expect(iSys).toBeGreaterThan(iChat)
  })
  it('counts unread messages while closed', () => {
    const s = ok(ok(teamGame('fan', 'online'), { type: 'chat', text: 'one' }, P.radio), { type: 'chat', text: 'two' }, P.radio)
    const { transport } = mount(s, P.planner)
    const toggle = screen.getByRole('button', { name: /open chat/i })
    expect(toggle).toHaveTextContent('0')
    fireEvent.click(toggle) // open: everything seen
    fireEvent.click(screen.getByRole('button', { name: /close chat/i }))
    act(() => transport.dispatch({ type: 'chat', text: 'three' }, P.radio))
    expect(screen.getByRole('button', { name: /open chat/i })).toHaveTextContent('1')
  })
  it('is not shown in solo games', () => {
    mount(soloGame('fan'))
    expect(screen.queryByRole('button', { name: /open chat/i })).not.toBeInTheDocument()
  })
})
