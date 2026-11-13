import { render, screen, fireEvent } from '@testing-library/react'
import { isMuted, setMuted, sfx, SFX_NAMES } from '../../src/ui/sound'
import { MuteToggle } from '../../src/ui/components/MuteToggle'

describe('sound', () => {
  beforeEach(() => { localStorage.clear(); setMuted(false) })
  it('is on by default and remembers being muted', () => {
    expect(isMuted()).toBe(false)
    setMuted(true)
    expect(isMuted()).toBe(true)
    expect(localStorage.getItem('mc.muted')).toBe('1')
  })
  it('never throws where the browser has no audio', () => {
    for (const name of SFX_NAMES) expect(() => sfx(name)).not.toThrow()
  })
  it('the toggle mutes and unmutes', () => {
    render(<MuteToggle />)
    fireEvent.click(screen.getByRole('button', { name: /mute sound/i }))
    expect(isMuted()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /turn sound on/i }))
    expect(isMuted()).toBe(false)
  })
})
