import { screen, fireEvent, within } from '@testing-library/react'
import { mount } from './helpers'
import { designGame, applyDesign, fixture, P } from '../engine/helpers/play'
import { handbookIds } from '../../src/ui/handbook/entries'
import { hasKey } from '../../src/i18n/i18n'
import { duties } from '../../src/ui/guide'

const wildfire = fixture('fan/wildfire/viable0').design

describe('telemetry gauges', () => {
  it('Space Fan shows the rocket limit on the mass gauge', () => {
    mount(applyDesign(designGame('fan'), wildfire), P.designer)
    const mass = screen.getByRole('meter', { name: /mass/i })
    expect(mass).toHaveAttribute('aria-valuenow', '682')
    expect(mass).toHaveAttribute('aria-valuemax', '1750')
    expect(screen.getByRole('meter', { name: /power/i })).toHaveAttribute('aria-valuemax', '2500')
  })
  it('Space Expert shows totals only', () => {
    const d = fixture('expert/wildfire/viable0').design
    mount(applyDesign(designGame('expert', 'wildfire', { total: 800, designer: 600, radio: 50 }), d), P.designer)
    const mass = screen.getByRole('meter', { name: /mass/i })
    expect(mass).toHaveAttribute('aria-valuenow')
    expect(mass).not.toHaveAttribute('aria-valuemax')
    expect(screen.getByRole('meter', { name: /power/i })).not.toHaveAttribute('aria-valuemax')
  })
})

describe('role panels', () => {
  it("another role's controls are read-only on your device", () => {
    mount(designGame('fan'), P.scientist)
    fireEvent.click(screen.getByRole('tab', { name: /designer/i }))
    const panel = screen.getByTestId('panel-designer')
    const options = within(panel).getAllByRole('button', { name: /^(medium|large) bus/i })
    expect(options.length).toBeGreaterThan(0)
    for (const b of options) expect(b).toBeDisabled()
  })
  it('your own controls work', () => {
    const { transport } = mount(designGame('fan'), P.designer)
    fireEvent.click(screen.getByRole('tab', { name: /designer/i }))
    fireEvent.click(within(screen.getByTestId('panel-designer')).getByRole('button', { name: /^medium bus/i }))
    expect(transport.getState()!.mission!.design.structure).toBe('medium')
  })
})

describe('handbook', () => {
  it('has an entry for every catalog item', () => {
    const ids = handbookIds()
    expect(ids.length).toBeGreaterThan(100)
    const missing = ids.filter((id) => !hasKey(`hb.${id}.what`) || !hasKey(`hb.${id}.why`))
    expect(missing).toEqual([])
  })
  it('an info button opens the entry', () => {
    mount(designGame('fan'), P.designer)
    fireEvent.click(screen.getByRole('tab', { name: /designer/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /what is medium bus/i })[0])
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/about the size of a car/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /nasa/i })).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })
})

describe('duties', () => {
  it('tells each role what is waiting on them', () => {
    const s = designGame('fan')
    expect(duties(s)).toMatchObject({ scientist: 'todo.requestInstruments', designer: 'todo.finishDesign', radio: 'todo.finishDesign' })
    const done = applyDesign(s, wildfire)
    expect(duties(done)).toMatchObject({ scientist: 'todo.markReady', designer: 'todo.markReady', radio: 'todo.markReady' })
    expect(duties(done).planner).toBeUndefined()
  })
})
