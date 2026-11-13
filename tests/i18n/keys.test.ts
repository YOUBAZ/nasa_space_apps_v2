import { en } from '../../src/i18n/en'
import { ar } from '../../src/i18n/ar'
import { setLang, t } from '../../src/i18n/i18n'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('Arabic translation', () => {
  it('has exactly the English key set', () => {
    const missing = Object.keys(en).filter((k) => !(k in ar))
    const extra = Object.keys(ar).filter((k) => !(k in en))
    expect({ missing, extra }).toEqual({ missing: [], extra: [] })
  })
  it('has no empty strings', () => {
    expect(Object.entries(ar).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([])
  })
  it('keeps every placeholder', () => {
    const wrong = Object.keys(en).filter((k) => k in ar && placeholders(en[k]) !== placeholders(ar[k]))
    expect(wrong).toEqual([])
  })
  it('uses Western digits', () => {
    expect(Object.entries(ar).filter(([, v]) => /[٠-٩]/.test(v)).map(([k]) => k)).toEqual([])
  })
  it('is actually Arabic (no untranslated English sentences)', () => {
    const latinOnly = Object.entries(ar).filter(([k, v]) => !/[؀-ۿ]/.test(v) && /[A-Za-z]{4,}/.test(v) && !k.startsWith('veh.') && !k.startsWith('cap.'))
    expect(latinOnly.map(([k]) => k)).toEqual([])
  })
  it('switching language flips the page direction', () => {
    setLang('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(t('role.planner')).toBe(ar['role.planner'])
    setLang('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(t('role.planner')).toBe('Planner')
  })
})
