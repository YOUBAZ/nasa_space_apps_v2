import { screen, fireEvent, within } from '@testing-library/react'
import { mount } from './helpers'
import { debriefOf, fixture, ok, P } from '../engine/helpers/play'

const wildfire = fixture('fan/wildfire/viable0').design
const plan = { total: 220, designer: 200, radio: 8, targetMonth: 18 }
const atCampaign = (design = wildfire) => ok(debriefOf(design, 'wildfire', plan), { type: 'finishDebrief' }, P.radio)

describe('moving between the campaign screen and the debrief', () => {
  it('goes back to the last debrief and forward to the campaign again', () => {
    const { transport } = mount(atCampaign({ ...wildfire, vehicle: 'electron' }), P.planner)
    expect(screen.getByRole('heading', { name: /^campaign$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back to the debrief/i }))
    // the same debrief as before: outcome, the fault and the scores
    expect(screen.getByTestId('outcome')).toHaveAttribute('data-outcome', 'failure')
    expect(within(screen.getByTestId('fault-over_capacity')).getByText(/Electron can only carry 200 kg/)).toBeInTheDocument()
    expect(screen.getByTestId('score-designer')).toBeInTheDocument()
    // looking back changes nothing in the game
    expect(transport.getState()!.phase).toBe('campaign')
    expect(screen.queryByRole('button', { name: /close the debrief/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /forward to the campaign/i }))
    expect(screen.getByRole('heading', { name: /^campaign$/i })).toBeInTheDocument()
  })
  it('any player can look back, not only the Radio Operator', () => {
    mount(atCampaign(), P.scientist)
    fireEvent.click(screen.getByRole('button', { name: /back to the debrief/i }))
    expect(screen.getByTestId('outcome')).toHaveAttribute('data-outcome', 'success')
  })
  it('shows the badges that mission earned, not the ones the next would', () => {
    mount(atCampaign({ ...wildfire, vehicle: 'electron' }), P.planner)
    fireEvent.click(screen.getByRole('button', { name: /back to the debrief/i }))
    expect(screen.getByText('Rapid Unscheduled Disassembly')).toBeInTheDocument()
  })
  it('the final campaign report can look back too', () => {
    let s = debriefOf(wildfire, 'wildfire', plan)
    s = { ...s, campaign: { ...s.campaign, launches: 4 } }
    mount(ok(s, { type: 'finishDebrief' }, P.radio), P.planner)
    expect(screen.getByRole('heading', { name: /campaign report/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back to the debrief/i }))
    expect(screen.getByTestId('outcome')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /forward to the campaign/i }))
    expect(screen.getByRole('heading', { name: /campaign report/i })).toBeInTheDocument()
  })
  it('there is nothing to go back to before the first mission is flown', () => {
    const s = atCampaign()
    mount(ok(s, { type: 'nextMission', flyAgain: false }, P.planner), P.planner)
    expect(screen.queryByRole('button', { name: /back to the debrief/i })).not.toBeInTheDocument()
  })
})
