import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BODIES, SKY_TEXTURE, ORBIT_VIEW } from '../src/ui/three/bodies'
import { ORBITS } from '../src/engine/catalog'
import { ELON_PHOTOS } from '../src/ui/elon/photos'
import { ELON_POSES } from '../src/ui/elon/poses'

const dir = join('public', 'textures')

describe('planet imagery', () => {
  const files = [...Object.values(BODIES).map((b) => b.texture).filter(Boolean) as string[], SKY_TEXTURE]
  it.each(files)('%s is bundled, and is a real image of sensible size', (file) => {
    const p = join(dir, file)
    expect(existsSync(p)).toBe(true)
    const size = statSync(p).size
    expect(size).toBeGreaterThan(150_000) // high resolution, not a thumbnail
    expect(size).toBeLessThan(1_600_000) // but still quick to load
    expect(readFileSync(p).subarray(0, 3).toString('hex')).toBe('ffd8ff') // JPEG
  })
  it('every image is credited to its NASA source', () => {
    const credits = readFileSync(join(dir, 'CREDITS.md'), 'utf8')
    for (const f of files) expect(credits).toContain(f)
    expect(credits).toMatch(/NASA/)
  })
  it('every destination in the game has a world and a camera set-up', () => {
    for (const id of Object.keys(ORBITS)) {
      expect(ORBIT_VIEW[id as keyof typeof ORBIT_VIEW], id).toBeDefined()
      expect(BODIES[ORBIT_VIEW[id as keyof typeof ORBIT_VIEW].body]).toBeDefined()
    }
  })
  it.each(ELON_POSES)('the Flight Director\'s %s pose is a credited NASA photo', (pose) => {
    const photo = ELON_PHOTOS[pose]
    const p = join(dir, photo.file)
    expect(existsSync(p)).toBe(true)
    const head = readFileSync(p)
    expect(head.subarray(0, 4).toString()).toBe('RIFF')
    expect(head.subarray(8, 12).toString()).toBe('WEBP') // WebP keeps the transparent background small
    expect(statSync(p).size).toBeGreaterThan(8_000)
    expect(statSync(p).size).toBeLessThan(120_000)
    const credits = readFileSync(join(dir, 'CREDITS.md'), 'utf8')
    expect(credits).toContain(photo.file)
    expect(credits).toContain(photo.nasaId)
    expect(credits).toContain(photo.credit)
    expect(photo.credit).toMatch(/^NASA\//)
  })
  it('the drawn fallback still has its credited face photo, and the page says it is parody', () => {
    const p = join(dir, 'elon-head.png')
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p).subarray(1, 4).toString()).toBe('PNG')
    const credits = readFileSync(join(dir, 'CREDITS.md'), 'utf8')
    expect(credits).toContain('elon-head.png')
    expect(credits).toMatch(/parody/i)
  })
  it('Earth, Mars, Jupiter and the Moon use real imagery', () => {
    for (const b of ['earth', 'mars', 'jupiter', 'moon'] as const) expect(BODIES[b].texture).toMatch(/\.jpg$/)
  })
})
