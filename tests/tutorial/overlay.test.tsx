import { render, screen, fireEvent, within } from '@testing-library/react'
import { TutorialGame } from '../../src/ui/tutorial/TutorialGame'

describe('tutorial overlay', () => {
  it('Coach Elon walks from the welcome to the first task', () => {
    render(<TutorialGame onExit={() => {}} />)
    const coach = within(screen.getByTestId('coach'))
    expect(coach.getByText(/I'm Elon, your Flight Director/)).toBeInTheDocument()
    expect(coach.getByRole('img', { name: /elon musk/i })).toBeInTheDocument()
    fireEvent.click(coach.getByRole('button', { name: /next/i }))
    expect(coach.getByText(/Four jobs fly a mission/)).toBeInTheDocument()
    fireEvent.click(coach.getByRole('button', { name: /next/i }))
    expect(coach.getByText(/You are the Scientist/)).toBeInTheDocument()
    expect(coach.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Scientist' })).toHaveAttribute('aria-selected', 'true')
  })
  it('a wrong move gets a hint; the right one brings in a scripted teammate', () => {
    render(<TutorialGame onExit={() => {}} />)
    const coach = within(screen.getByTestId('coach'))
    fireEvent.click(coach.getByRole('button', { name: /next/i }))
    fireEvent.click(coach.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Infrared space telescope/ }))
    fireEvent.click(screen.getByRole('button', { name: /send to planner/i }))
    expect(coach.getByText(/choose "Wildfire & disaster watch"/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Wildfire & disaster watch/ }))
    fireEvent.click(screen.getByRole('button', { name: /send to planner/i }))
    expect(coach.getByText(/Rejected! The Planner controls the budget/)).toBeInTheDocument()
    expect(coach.getByText('Too pricey. Convince me.')).toBeInTheDocument()
    expect(coach.getByText(/Planner \(teammate\)/)).toBeInTheDocument()
  })
  it('can be left at any time', () => {
    const onExit = vi.fn()
    render(<TutorialGame onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: /leave training/i }))
    expect(onExit).toHaveBeenCalled()
  })
})
