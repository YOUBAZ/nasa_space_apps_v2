import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BODIES, SKY_TEXTURE, ORBIT_VIEW } from '../src/ui/three/bodies'
import { ORBITS } from '../src/engine/catalog'

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
  it('Earth, Mars, Jupiter and the Moon use real imagery', () => {
    for (const b of ['earth', 'mars', 'jupiter', 'moon'] as const) expect(BODIES[b].texture).toMatch(/\.jpg$/)
  })
})
