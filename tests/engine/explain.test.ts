import fixtures from '../fixtures/reference-designs.json'
import { explainFault } from '../../src/engine/explain'
import { evaluateDesign } from '../../src/engine/evaluate'
import { FAULT_CODES } from '../../src/engine/types'
import type { Design } from '../../src/engine/types'
import { hasKey, t } from '../../src/i18n/i18n'

const fx = (fixtures as unknown as { name: string; design: Design }[]).find((f) => f.name === 'fan/wildfire/electron')!
const report = evaluateDesign(fx.design, 'wildfire', 'fan')

describe('explainFault', () => {
  it.each(FAULT_CODES)('%s has title/what/why/fix copy and a NASA link', (code) => {
    const e = explainFault({ severity: 'minor', code, roles: ['designer'] }, report, fx.design, 'wildfire')
    for (const k of [e.titleKey, e.whatKey, e.whyKey, e.fixKey]) expect(hasKey(k), k).toBe(true)
    expect(e.learnUrl).toMatch(/^https:\/\/([a-z]+\.)*nasa\.gov\//)
  })
  it('fills in the numbers for an over-capacity launch', () => {
    const f = report.faults.find((x) => x.code === 'over_capacity')!
    const e = explainFault(f, report, fx.design, 'wildfire')
    expect(e.vars.mass).toBe(682)
    expect(e.vars.capacity).toBe(200)
    expect(e.vars.vehicle).toBe('Electron')
    expect(t(e.whatKey, e.vars)).toContain('682')
    expect(t(e.whatKey, e.vars)).not.toMatch(/\{\w+\}/)
  })
  it('leaves no unfilled placeholders in any explanation', () => {
    for (const code of FAULT_CODES) {
      const e = explainFault({ severity: 'minor', code, roles: ['designer'] }, report, fx.design, 'wildfire')
      for (const k of [e.titleKey, e.whatKey, e.whyKey, e.fixKey]) expect(t(k, e.vars), k).not.toMatch(/\{\w+\}/)
    }
  })
})
