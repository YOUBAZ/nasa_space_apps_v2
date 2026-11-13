import { screen, fireEvent, within, act, render } from '@testing-library/react'
import { mount } from './helpers'
import { designGame, applyDesign, allReady, fixture, soloGame, ok, P } from '../engine/helpers/play'
import { HoldButton } from '../../src/ui/components/HoldButton'

const wildfire = fixture('fan/wildfire/viable0').design
const tab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }))

describe('designer panel', () => {
  it('an over-budget part offers "Request funds" instead of being picked', () => {
    const { transport } = mount(designGame('fan', 'wildfire', { designer: 100 }), P.designer)
    tab(/designer/i)
    const panel = within(screen.getByTestId('panel-designer'))
    expect(panel.getByRole('button', { name: /^large bus/i })).toBeDisabled()
    fireEvent.click(panel.getByRole('button', { name: /request funds for large bus/i }))
    expect(transport.getState()!.mission!.design.structure).toBeUndefined()
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/amount/i)).toHaveValue(48) // 38 standard + 110 − 100
    fireEvent.change(dialog.getByLabelText(/reason/i), { target: { value: 'Telescope needs it' } })
    fireEvent.click(dialog.getByRole('button', { name: /send request/i }))
    expect(transport.getState()!.mission!.requests.at(-1)).toMatchObject({ kind: 'funding', amount: 48, target: 'designer' })
  })
  it('the Designer can push back on instruments with a reason', () => {
    let s = designGame('fan')
    s = ok(s, { type: 'requestInstruments', list: ['thermal_ir', 'ir_telescope'] }, P.scientist)
    const { transport } = mount(s, P.designer)
    tab(/designer/i)
    const panel = within(screen.getByTestId('panel-designer'))
    fireEvent.click(panel.getByRole('button', { name: /push back/i }))
    fireEvent.change(panel.getByLabelText(/reason/i), { target: { value: 'Far too heavy' } })
    fireEvent.click(panel.getByRole('button', { name: /send push-back/i }))
    expect(transport.getState()!.mission!.instrumentStatus).toBe('pushed_back')
  })
})

describe('integration', () => {
  it('un-agreeing the pairing returns to design', () => {
    let s = allReady(applyDesign(designGame('fan'), wildfire))
    s = ok(s, { type: 'agreePairing', role: 'radio', agree: true }, P.radio)
    const { transport } = mount(s, P.radio)
    fireEvent.click(screen.getByRole('button', { name: /un-agree/i }))
    expect(transport.getState()!.phase).toBe('design')
  })
})

describe('scientist panel', () => {
  it('requests the chosen instruments', () => {
    const { transport } = mount(designGame('fan'), P.scientist)
    tab(/scientist/i)
    const panel = within(screen.getByTestId('panel-scientist'))
    fireEvent.click(panel.getByRole('button', { name: /^thermal infrared camera/i }))
    fireEvent.click(panel.getByRole('button', { name: /request instruments/i }))
    expect(transport.getState()!.mission!.instrumentRequest).toEqual(['thermal_ir'])
  })
})

describe('radio panel', () => {
  it('picks an orbit and toggles ground stations', () => {
    const { transport } = mount(designGame('fan'), P.radio)
    tab(/radio/i)
    const panel = within(screen.getByTestId('panel-radio'))
    fireEvent.click(panel.getByRole('button', { name: /^sun-synchronous orbit/i }))
    fireEvent.click(panel.getByRole('button', { name: /^svalbard/i }))
    fireEvent.click(panel.getByRole('button', { name: /^kiruna/i }))
    fireEvent.click(panel.getByRole('button', { name: /^svalbard/i }))
    const d = transport.getState()!.mission!.design
    expect(d.orbit).toBe('sso')
    expect(d.stations).toEqual(['kiruna'])
  })
})

describe('HoldButton', () => {
  it('fires only after being held for 1.5 seconds', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<HoldButton onDone={onDone}>Launch</HoldButton>)
    const b = screen.getByRole('button', { name: /launch/i })
    fireEvent.pointerDown(b)
    act(() => { vi.advanceTimersByTime(1000) })
    fireEvent.pointerUp(b)
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.pointerDown(b)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(onDone).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('solo', () => {
  it('has no approvals: choosing an objective goes straight to the budget', () => {
    const { transport } = mount(soloGame('fan'))
    fireEvent.click(screen.getByRole('button', { name: /^wildfire & disaster watch/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose this objective/i }))
    expect(transport.getState()!.phase).toBe('planning')
    expect(screen.queryByTestId('inbox')).not.toBeInTheDocument()
  })
})
