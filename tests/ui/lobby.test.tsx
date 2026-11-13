import { render, screen, fireEvent, within } from '@testing-library/react'
import { GameProvider } from '../../src/net/useGame'
import { createLocalTransport } from '../../src/net/localTransport'
import { GameScreens } from '../../src/ui/GameScreens'

function renderLobby(names: string[]) {
  const transport = createLocalTransport({ mode: 'local', difficulty: 'fan', names, persist: false, seed: 1 })
  render(<GameProvider transport={transport}><GameScreens onExit={() => {}} /></GameProvider>)
  return transport
}

describe('Lobby (pass-and-play)', () => {
  it('cannot start until all four roles are claimed, then opens the mission board', () => {
    const transport = renderLobby(['Ana', 'Ben'])
    const start = screen.getByRole('button', { name: /start campaign/i })
    expect(start).toBeDisabled()
    const give = (role: string, player: string) =>
      fireEvent.click(within(screen.getByTestId(`role-${role}`)).getByRole('button', { name: player }))
    give('planner', 'Ana')
    give('scientist', 'Ben')
    give('designer', 'Ana')
    expect(start).toBeDisabled()
    give('radio', 'Ben')
    expect(start).toBeEnabled()
    fireEvent.click(start)
    expect(transport.getState()!.phase).toBe('objective_proposal')
    expect(screen.getByRole('heading', { name: /mission objective/i })).toBeInTheDocument()
  })
  it('a role can be handed to another player', () => {
    const transport = renderLobby(['Ana', 'Ben'])
    const card = within(screen.getByTestId('role-planner'))
    fireEvent.click(card.getByRole('button', { name: 'Ana' }))
    fireEvent.click(card.getByRole('button', { name: 'Ben' }))
    const s = transport.getState()!
    expect(s.players.find((p) => p.name === 'Ben')!.roles).toEqual(['planner'])
    expect(s.players.find((p) => p.name === 'Ana')!.roles).toEqual([])
  })
  it('auto-assign fills every role', () => {
    const transport = renderLobby(['Ana', 'Ben', 'Cy'])
    fireEvent.click(screen.getByRole('button', { name: /auto-assign/i }))
    const held = transport.getState()!.players.flatMap((p) => p.roles).sort()
    expect(held).toEqual(['designer', 'planner', 'radio', 'scientist'])
    expect(screen.getByRole('button', { name: /start campaign/i })).toBeEnabled()
  })
})
