import { screen, fireEvent, within } from '@testing-library/react'
import { mount } from './helpers'
import { designGame, ok, P } from '../engine/helpers/play'
import { duties } from '../../src/ui/guide'
import type { GameState } from '../../src/engine/state'

const BOTH = ['thermal_ir', 'hires_cam'] as never
const tab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }))
const send = (s: GameState, list = BOTH, note?: string) => ok(s, { type: 'requestInstruments', list, note }, P.scientist)
const pushBack = (s: GameState, reason: string) => ok(s, { type: 'reviewInstruments', decision: 'pushback', reason }, P.designer)
const thirdLook = () => send(pushBack(send(pushBack(send(designGame('fan')), 'Too heavy'), BOTH, 'I need both'), 'Still too heavy'))
const escalated = () => ok(thirdLook(), { type: 'reviewInstruments', decision: 'escalate', reason: 'We cannot agree' }, P.designer)

describe('instrument negotiation on screen', () => {
  it('after a push-back the Scientist reads the reason and can insist', () => {
    const { transport } = mount(pushBack(send(designGame('fan')), 'Too heavy'), P.scientist)
    tab(/scientist/i)
    const panel = within(screen.getByTestId('panel-scientist'))
    expect(panel.getByText(/pushed back \(1 of 2\)/i)).toBeInTheDocument()
    expect(panel.getAllByText(/too heavy/i).length).toBeGreaterThan(0)
    fireEvent.change(panel.getByLabelText(/message to the designer/i), { target: { value: 'Fires need both' } })
    fireEvent.click(panel.getByRole('button', { name: /insist on this list/i }))
    const m = transport.getState()!.mission!
    expect(m.instrumentStatus).toBe('pending')
    expect(m.instrumentThread.at(-1)).toMatchObject({ kind: 'insist', text: 'Fires need both' })
  })

  it('changing the list after a push-back is offered as a change, not as insisting', () => {
    mount(pushBack(send(designGame('fan')), 'Too heavy'), P.scientist)
    tab(/scientist/i)
    const panel = within(screen.getByTestId('panel-scientist'))
    fireEvent.click(panel.getByRole('button', { name: /^high-resolution camera/i })) // take one off
    expect(panel.queryByRole('button', { name: /insist on this list/i })).toBeNull()
    expect(panel.getByRole('button', { name: /send the changed list/i })).toBeEnabled()
  })

  it('the second push-back is marked as the last one', () => {
    mount(send(pushBack(send(designGame('fan')), 'Too heavy')), P.designer)
    tab(/designer/i)
    const panel = within(screen.getByTestId('panel-designer'))
    expect(panel.getByText(/decision 2 of 3/i)).toBeInTheDocument()
    expect(panel.getByRole('button', { name: /push back \(last time\)/i })).toBeInTheDocument()
    expect(panel.queryByRole('button', { name: /take it to the planner/i })).toBeNull()
  })

  it('at the third decision the Designer approves or takes it to the Planner', () => {
    const { transport } = mount(thirdLook(), P.designer)
    tab(/designer/i)
    const panel = within(screen.getByTestId('panel-designer'))
    expect(panel.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(panel.queryByRole('button', { name: /push back/i })).toBeNull()
    expect(panel.getByText(/i need both/i)).toBeInTheDocument() // the conversation is in front of the Designer
    fireEvent.click(panel.getByRole('button', { name: /take it to the planner/i }))
    fireEvent.change(panel.getByLabelText(/reason/i), { target: { value: 'We cannot agree' } })
    fireEvent.click(panel.getByRole('button', { name: /send to the planner/i }))
    expect(transport.getState()!.mission!.instrumentStatus).toBe('escalated')
  })

  it("the Planner reads both sides and sets the Scientist's instrument budget", () => {
    const { transport } = mount(escalated(), P.planner)
    const inbox = within(screen.getByTestId('inbox'))
    expect(inbox.getByText(/instrument dispute/i)).toBeInTheDocument()
    expect(inbox.getByText(/still too heavy/i)).toBeInTheDocument()
    expect(inbox.getByText(/we cannot agree/i)).toBeInTheDocument()
    const amount = inbox.getByLabelText(/instrument budget/i)
    fireEvent.change(amount, { target: { value: '999' } })
    expect(inbox.getByRole('button', { name: /set the limit/i })).toBeDisabled() // more than the Designer has
    fireEvent.change(amount, { target: { value: '25' } })
    fireEvent.click(inbox.getByRole('button', { name: /set the limit/i }))
    const m = transport.getState()!.mission!
    expect(m.instrumentStatus).toBe('capped')
    expect(m.instrumentCap).toBe(25)
  })

  it('only the Planner gets the controls of the dispute', () => {
    mount(escalated(), P.designer)
    const inbox = within(screen.getByTestId('inbox'))
    expect(inbox.getByText(/instrument dispute/i)).toBeInTheDocument()
    expect(inbox.queryByRole('button', { name: /set the limit/i })).toBeNull()
    expect(inbox.getByText(/waiting for the planner/i)).toBeInTheDocument()
  })

  it('after the ruling the Scientist can only send a list inside the limit', () => {
    const capped = ok(escalated(), { type: 'capInstruments', amount: 25 }, P.planner)
    const { transport } = mount(capped, P.scientist)
    tab(/scientist/i)
    const panel = within(screen.getByTestId('panel-scientist'))
    expect(panel.getByText(/set your instrument budget at \$25M/i)).toBeInTheDocument()
    expect(panel.getByText(/costs more than the planner allows/i)).toBeInTheDocument() // both cameras are $50M
    expect(panel.getByRole('button', { name: /send final list/i })).toBeDisabled()
    fireEvent.click(panel.getByRole('button', { name: /^high-resolution camera/i }))
    fireEvent.click(panel.getByRole('button', { name: /send final list/i }))
    expect(transport.getState()!.mission!.instrumentStatus).toBe('final')
    expect(transport.getState()!.mission!.instrumentRequest).toEqual(['thermal_ir'])
  })

  it('the Designer must accept the final list: approving is the only choice', () => {
    let s = ok(escalated(), { type: 'capInstruments', amount: 25 }, P.planner)
    s = send(s, ['thermal_ir'] as never)
    const { transport } = mount(s, P.designer)
    tab(/designer/i)
    const panel = within(screen.getByTestId('panel-designer'))
    expect(panel.getByText(/you must accept this list/i)).toBeInTheDocument()
    expect(panel.queryByRole('button', { name: /push back|take it to the planner/i })).toBeNull()
    fireEvent.click(panel.getByRole('button', { name: /^approve$/i }))
    expect(transport.getState()!.mission!.instrumentStatus).toBe('accepted')
    expect(transport.getState()!.mission!.design.instruments).toEqual(['thermal_ir'])
  })

  it('the to-do hints follow the conversation', () => {
    const first = send(designGame('fan'))
    expect(duties(first).designer).toBe('todo.reviewInstruments')
    expect(duties(pushBack(first, 'Too heavy')).scientist).toBe('todo.answerPushback')
    expect(duties(escalated()).planner).toBe('todo.ruleInstruments')
    expect(duties(escalated()).scientist).toBeUndefined()
    const capped = ok(escalated(), { type: 'capInstruments', amount: 25 }, P.planner)
    expect(duties(capped).scientist).toBe('todo.finalInstruments')
    expect(duties(capped).planner).toBeUndefined()
  })
})
