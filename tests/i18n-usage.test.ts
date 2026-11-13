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

describe('i18n keys built at runtime', () => {
  const literal = (dir: string, re: RegExp) => {
    const found = new Set<string>()
    for (const file of files(dir)) for (const m of readFileSync(file, 'utf8').matchAll(re)) found.add(m[1])
    return [...found]
  }
  it('every activity-log key written by the engine has copy', () => {
    const keys = literal(join('src', 'engine'), /'(log\.[a-z_.]+)'/g)
    expect(keys.length).toBeGreaterThan(20)
    expect(keys.filter((k) => !hasKey(k))).toEqual([])
  })
  it('every duty hint has copy', () => {
    const keys = literal(join('src', 'ui'), /'(todo\.[a-zA-Z]+)'/g)
    expect(keys.filter((k) => !hasKey(k))).toEqual([])
  })
  it('roles, difficulties, phases and schedule modes have copy', () => {
    const keys = [
      ...['planner', 'scientist', 'designer', 'radio'].flatMap((r) => [`role.${r}`, `role.${r}.job`, `pot.${r === 'planner' || r === 'scientist' ? 'reserve' : r}`]),
      ...['fan', 'nerd', 'expert'].flatMap((d) => [`diff.${d}`, `diff.${d}.desc`]),
      ...['lobby', 'objective_proposal', 'objective_review', 'planning', 'design', 'integration', 'go_poll', 'launch', 'operations', 'debrief', 'campaign', 'campaign_over'].map((p) => `stage.${p}`),
      ...['rush', 'standard', 'careful'].flatMap((m) => [`mode.${m}`, `mode.${m}.desc`]),
      ...['pending', 'pushed_back', 'final', 'accepted'].map((s) => `sci.status.${s}`),
      ...['pending', 'approved', 'rejected', 'closed'].map((s) => `req.status.${s}`),
      ...['incomplete_design', 'pending_items'].map((s) => `ready.${s}`),
      ...['wait', 'express', 'substitute'].flatMap((c) => [`backorder.${c}`, `backorder.do.${c}`]),
    ]
    expect(keys.filter((k) => !hasKey(k))).toEqual([])
  })
})

describe('i18n keys for the endgame screens', () => {
  it('operations beats, outcomes, awards, badges, ranks and severities have copy', () => {
    const beats = ['arrival', 'power', 'instruments', 'downlink']
    const keys = [
      ...beats.flatMap((b) => [`ops.beat.${b}`, `ops.ok.${b}`, `ops.warn.${b}`, `ops.bad.${b}`]),
      ...['success', 'partial', 'failure'].map((o) => `outcome.${o}`),
      'outcome.quip.success', 'outcome.quip.partial',
      ...['launch', 'comms', 'power', 'other'].map((g) => `outcome.quip.failure.${g}`),
      ...['cost_efficiency', 'scientific_value', 'new_gear', 'effective_decision'].map((a) => `award.${a}`),
      ...['penny_pincher', 'data_hoarder', 'nailed_the_landing', 'rapid_unscheduled_disassembly', 'comeback_kid', 'one_station_wonder'].map((b) => `badge.${b}`),
      ...['cadet', 'flight_engineer', 'mission_specialist', 'flight_director'].map((r) => `rank.${r}`),
      ...['critical', 'major', 'minor'].map((s) => `sev.${s}`),
      ...['eo', 'deep', 'mars'].map((x) => `type.${x}`),
      ...[1, 2, 3, 4, 5].map((n) => `tier.${n}`),
      ...['LEO', 'SSO', 'GTO', 'ESC'].map((c) => `cap.${c}`),
      ...[0, 1, 2].flatMap((n) => [`stat.prop.${n}`, `stat.capture.${n}`]),
    ]
    expect(keys.filter((k) => !hasKey(k))).toEqual([])
  })
})
