import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { hasKey } from '../src/i18n/i18n'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

describe('i18n usage', () => {
  it('every literal key passed to t() exists in English', () => {
    const missing = new Set<string>()
    for (const file of files('src')) {
      if (file.includes(`${join('src', 'i18n')}`)) continue
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!hasKey(m[1])) missing.add(`${m[1]}  (${file})`)
    }
    expect([...missing]).toEqual([])
  })
})
