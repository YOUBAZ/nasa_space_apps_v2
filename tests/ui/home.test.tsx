import { render, screen, fireEvent } from '@testing-library/react'
import { Home } from '../../src/ui/screens/Home'
import type { Transport } from '../../src/net/transport'

function renderHome() {
  const started: Transport[] = []
  render(<Home onStart={(t) => started.push(t)} onTutorial={() => {}} />)
  return started
}

describe('home: pass and play names', () => {
  beforeEach(() => localStorage.clear())
  it('player 1 can be renamed right in the player list', () => {
    const started = renderHome()
    fireEvent.click(screen.getByRole('tab', { name: /pass and play/i }))
    const first = screen.getByLabelText('Player 1 name')
    expect(first).not.toHaveAttribute('readonly')
    fireEvent.change(first, { target: { value: 'Sara' } })
    fireEvent.change(screen.getByLabelText('Player 2 name'), { target: { value: 'Omar' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(started[0].getState()!.players.map((p) => p.name)).toEqual(['Sara', 'Omar'])
  })
  it('the two places to type your name stay in step', () => {
    renderHome()
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Lina' } })
    fireEvent.click(screen.getByRole('tab', { name: /pass and play/i }))
    expect(screen.getByLabelText('Player 1 name')).toHaveValue('Lina')
    fireEvent.change(screen.getByLabelText('Player 1 name'), { target: { value: 'Lina M' } })
    expect(screen.getByLabelText('Your name')).toHaveValue('Lina M')
  })
  it('blank names fall back to Player 1, Player 2', () => {
    const started = renderHome()
    fireEvent.click(screen.getByRole('tab', { name: /pass and play/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(started[0].getState()!.players.map((p) => p.name)).toEqual(['Player 1', 'Player 2'])
  })
})
