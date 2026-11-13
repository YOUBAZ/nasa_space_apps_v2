import { screen, fireEvent, within } from '@testing-library/react'
import { mount } from './helpers'
import { teamGame } from '../engine/helpers/play'

// Pass-and-play: one device operates every role.
const board = () => mount(teamGame('fan', 'local'))
const tab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }))

describe('objective approval flow', () => {
  it('propose → reject → appeal → reject → appeal → approve', () => {
    const { transport } = board()
    tab(/scientist/i)
    fireEvent.click(screen.getByRole('button', { name: /^wildfire & disaster watch/i }))
    fireEvent.change(screen.getByLabelText(/pitch/i), { target: { value: 'Catch fires early' } })
    fireEvent.click(screen.getByRole('button', { name: /send to planner/i }))
    expect(transport.getState()!.phase).toBe('objective_review')

    const reject = (why: string) => {
      tab(/planner/i)
      const inbox = within(screen.getByTestId('inbox'))
      fireEvent.click(inbox.getByRole('button', { name: /reject/i }))
      fireEvent.change(inbox.getByLabelText(/reason/i), { target: { value: why } })
      fireEvent.click(inbox.getByRole('button', { name: /send rejection/i }))
    }
    const appeal = (why: string) => {
      tab(/scientist/i)
      const inbox = within(screen.getByTestId('inbox'))
      fireEvent.click(inbox.getByRole('button', { name: /^appeal/i }))
      fireEvent.change(inbox.getByLabelText(/reason/i), { target: { value: why } })
      fireEvent.click(inbox.getByRole('button', { name: /send appeal/i }))
    }

    reject('Too pricey')
    expect(screen.getByText('2 of 2 appeals left')).toBeInTheDocument()
    expect(screen.getByText('Too pricey')).toBeInTheDocument()
    appeal('It saves lives')
    reject('Still too pricey')
    expect(screen.getByText('1 of 2 appeals left')).toBeInTheDocument()
    appeal('We have the budget')

    tab(/planner/i)
    fireEvent.click(within(screen.getByTestId('inbox')).getByRole('button', { name: /approve/i }))
    expect(transport.getState()!.phase).toBe('planning')
    expect(screen.getByRole('heading', { name: /budget and schedule/i })).toBeInTheDocument()
  })

  it('the Planner cannot reject without a reason', () => {
    const { transport } = board()
    tab(/scientist/i)
    fireEvent.click(screen.getByRole('button', { name: /^wildfire & disaster watch/i }))
    fireEvent.click(screen.getByRole('button', { name: /send to planner/i }))
    tab(/planner/i)
    const inbox = within(screen.getByTestId('inbox'))
    fireEvent.click(inbox.getByRole('button', { name: /reject/i }))
    expect(inbox.getByRole('button', { name: /send rejection/i })).toBeDisabled()
    expect(transport.getState()!.mission!.requests[0].status).toBe('pending')
  })

  it('the Planner sets a budget and opens the design phase', () => {
    const { transport } = board()
    tab(/scientist/i)
    fireEvent.click(screen.getByRole('button', { name: /^wildfire & disaster watch/i }))
    fireEvent.click(screen.getByRole('button', { name: /send to planner/i }))
    tab(/planner/i)
    fireEvent.click(within(screen.getByTestId('inbox')).getByRole('button', { name: /approve/i }))
    fireEvent.change(screen.getByLabelText(/mission budget/i), { target: { value: '400' } })
    fireEvent.change(screen.getByLabelText(/spacecraft \(designer\)/i), { target: { value: '250' } })
    fireEvent.change(screen.getByLabelText(/ground & comms \(radio operator\)/i), { target: { value: '50' } })
    expect(screen.getByTestId('reserve')).toHaveTextContent('$100M')
    fireEvent.click(screen.getByRole('button', { name: /confirm plan/i }))
    const s = transport.getState()!
    expect(s.phase).toBe('design')
    expect(s.mission!.budget).toMatchObject({ total: 400, designer: 250, radio: 50, reserve: 100 })
  })
})
