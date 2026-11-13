import { t } from '../src/i18n/i18n'

describe('i18n smoke', () => {
  it('translates the app title', () => {
    expect(t('app.title')).toBe('Mission Control')
  })
  it('returns the key for missing strings', () => {
    expect(t('missing.key')).toBe('missing.key')
  })
  it('interpolates variables', () => {
    expect(t('app.appealsLeft', { n: 1 })).toBe('1 of 2 appeals left')
  })
})
