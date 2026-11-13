import { screen, fireEvent, within } from '@testing-library/react'
import { mount } from './helpers'
import { debriefOf, fixture, P, ok } from '../engine/helpers/play'
import { failureGroup } from '../../src/ui/cinematics/OutcomeScene'
import { setLang } from '../../src/i18n/i18n'

const wildfire = fixture('fan/wildfire/viable0').design
const tight = { total: 220, designer: 200, radio: 8, targetMonth: 18 }

describe('debrief screen', () => {
  it('a failure shows the tantrum, the cause, whose call it was, and a NASA link', () => {
    mount(debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight), P.radio)
    expect(screen.getByTestId('outcome')).toHaveAttribute('data-outcome', 'failure')
    expect(screen.getByRole('img', { name: /cartoon elon musk/i })).toHaveClass('elon-tantrum')
    const card = within(screen.getByTestId('fault-over_capacity'))
    expect(card.getByText(/weighed 682 kg, but Electron can only carry 200 kg/)).toBeInTheDocument()
    expect(card.getByText('Designer')).toBeInTheDocument()
    expect(card.getByRole('link', { name: /nasa/i })).toHaveAttribute('href', expect.stringMatching(/nasa\.gov/))
    expect(Number(screen.getByTestId('score-designer').textContent!.replace('%', ''))).toBeLessThanOrEqual(70)
  })
  it('a success celebrates and closing it opens the campaign screen', () => {
    const { transport } = mount(debriefOf(wildfire, 'wildfire', tight), P.radio)
    expect(screen.getByRole('img', { name: /cartoon elon musk/i })).toHaveClass('elon-celebrate')
    expect(screen.getByText(/textbook mission/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close the debrief/i }))
    expect(transport.getState()!.phase).toBe('campaign')
    expect(screen.getByRole('heading', { name: /^campaign$/i })).toBeInTheDocument()
    // shown twice: the "new gear unlocked" card and the gear list
    expect(within(screen.getByRole('status')).getByText('High-gain dish (1 m)')).toBeInTheDocument()
    expect(screen.getAllByText('High-gain dish (1 m)')).toHaveLength(2)
  })
  it('only the Planner can start the next mission', () => {
    const s = ok(debriefOf(wildfire, 'wildfire', tight), { type: 'finishDebrief' }, P.radio)
    mount(s, P.radio)
    expect(screen.queryByRole('button', { name: /new mission/i })).not.toBeInTheDocument()
    expect(screen.getByText(/waiting for the planner/i)).toBeInTheDocument()
  })
  it('names the orbit and rocket in the chosen language', () => {
    setLang('ar')
    try {
      mount(debriefOf({ ...wildfire, vehicle: 'electron' }, 'wildfire', tight), P.radio)
      const card = within(screen.getByTestId('fault-over_capacity'))
      expect(card.getByText(/مدار متزامن مع الشمس/)).toBeInTheDocument()
      expect(card.queryByText(/Sun-Synchronous/)).not.toBeInTheDocument()
    } finally { setLang('en') }
  })
  it('picks the tantrum line from the worst fault', () => {
    expect(failureGroup([{ severity: 'critical', code: 'over_capacity', roles: ['designer'] }])).toBe('launch')
    expect(failureGroup([{ severity: 'critical', code: 'no_link', roles: ['radio'] }])).toBe('comms')
    expect(failureGroup([{ severity: 'critical', code: 'battery_short', roles: ['designer'] }])).toBe('power')
    expect(failureGroup([{ severity: 'critical', code: 'tumbling', roles: ['designer'] }])).toBe('other')
  })
})
