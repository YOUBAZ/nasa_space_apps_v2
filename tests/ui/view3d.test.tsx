import { render, screen, fireEvent, within } from '@testing-library/react'
import { View3D } from '../../src/ui/components/View3D'
import { mount } from './helpers'
import { designGame, P } from '../engine/helpers/play'

describe('3D box', () => {
  it('expands to fill the screen and shrinks back', () => {
    render(<View3D testId="box" fallback={<p>flat view</p>}><p>scene</p></View3D>)
    const box = screen.getByTestId('box')
    expect(box).toHaveAttribute('data-expanded', 'false')
    fireEvent.click(within(box).getByRole('button', { name: /expand 3d view/i }))
    expect(box).toHaveAttribute('data-expanded', 'true')
    fireEvent.click(within(box).getByRole('button', { name: /shrink 3d view/i }))
    expect(box).toHaveAttribute('data-expanded', 'false')
  })
  it('Escape shrinks it', () => {
    render(<View3D testId="box" fallback={<p>flat view</p>}><p>scene</p></View3D>)
    fireEvent.click(screen.getByRole('button', { name: /expand 3d view/i }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('box')).toHaveAttribute('data-expanded', 'false')
  })
  it('never scrolls inside', () => {
    render(<View3D testId="box" fallback={<p>flat view</p>}><p>scene</p></View3D>)
    expect(screen.getByTestId('box').className).toMatch(/overflow-hidden/)
    expect(screen.getByTestId('box').className).not.toMatch(/overflow-(y-)?auto|overflow-(y-)?scroll/)
  })
})

describe('mission board layout', () => {
  it('the spacecraft preview sits in a column that does not scroll, and can be expanded', () => {
    mount(designGame('fan'), P.designer)
    const preview = screen.getByTestId('spacecraft-view')
    expect(within(preview).getByRole('button', { name: /expand 3d view/i })).toBeInTheDocument()
    const column = preview.closest('aside')!
    expect(column.className).not.toMatch(/overflow-(y-)?auto|overflow-(y-)?scroll|max-h-/)
    // requests and activity moved out of that column
    expect(within(column).queryByTestId('inbox')).not.toBeInTheDocument()
    expect(screen.getByTestId('inbox')).toBeInTheDocument()
  })
})
