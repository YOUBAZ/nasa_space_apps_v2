import { fireEvent, render, screen } from '@testing-library/react'
import { Elon } from '../../src/ui/elon/Elon'
import { ELON_POSES } from '../../src/ui/elon/poses'
import { ELON_PHOTOS, elonFit } from '../../src/ui/elon/photos'

describe('the Flight Director', () => {
  it.each(ELON_POSES)('%s shows a whole real photo, not a drawn body', (pose) => {
    const { container } = render(<Elon pose={pose} />)
    const figure = screen.getByRole('img', { name: /elon musk/i })
    expect(figure).toHaveClass('elon', `elon-${pose}`)
    const photo = figure.querySelector('img')!
    expect(photo.getAttribute('src')).toContain(ELON_PHOTOS[pose].file)
    expect(container.querySelector('svg .elon-body')).toBeNull() // no cartoon limbs
    expect(container.querySelector('canvas')).toBeNull() // and no 3D puppet
  })

  it('every pose is a different photograph', () => {
    expect(new Set(ELON_POSES.map((p) => ELON_PHOTOS[p].file)).size).toBe(ELON_POSES.length)
    expect(new Set(ELON_POSES.map((p) => ELON_PHOTOS[p].nasaId)).size).toBe(ELON_POSES.length)
  })

  it('the photo is never recoloured or distorted: effects live beside it', () => {
    render(<Elon pose="tantrum" />)
    const figure = screen.getByRole('img', { name: /elon musk/i })
    const photo = figure.querySelector('img')!
    expect(photo.style.filter).toBe('')
    expect(figure.querySelector('.elon-steam')).not.toBeNull()
  })

  it('falls back to the drawing if the photo cannot load', () => {
    const { container } = render(<Elon pose="celebrate" />)
    fireEvent.error(screen.getByRole('img', { name: /elon musk/i }).querySelector('img')!)
    const figure = screen.getByRole('img', { name: /elon musk/i })
    expect(figure).toHaveClass('elon-celebrate')
    expect(container.querySelector('svg .elon-body')).not.toBeNull()
  })

  it('scales with the size it is given', () => {
    render(<Elon pose="idle" size={100} />)
    const figure = screen.getByRole('img', { name: /elon musk/i })
    expect(figure.style.width).toBe('100px')
    expect(figure.style.height).toBe('130px')
  })

  it('each photo keeps its own proportions and stands on the floor of its box', () => {
    for (const pose of ELON_POSES) {
      const fit = elonFit(pose, 100)
      expect(fit.width / fit.height).toBeCloseTo(ELON_PHOTOS[pose].aspect, 2) // never stretched
      expect(fit.height).toBeLessThanOrEqual(130)
      expect(fit.height).toBeGreaterThan(100) // a wide photo is given room at the sides, not shrunk to a thumbnail
      expect(fit.width).toBeLessThanOrEqual(125)
    }
    render(<Elon pose="tantrum" size={100} />)
    const frame = screen.getByRole('img', { name: /elon musk/i }).querySelector<HTMLElement>('.elon-figure')!
    expect(frame.style.width).toBe(`${elonFit('tantrum', 100).width}px`)
    expect(frame.querySelector('img')).not.toBeNull()
    expect(frame.querySelector('.elon-steam')).not.toBeNull() // effects sit around the figure, wherever it stands
  })
})
