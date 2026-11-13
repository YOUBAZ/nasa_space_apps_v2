import { t } from '../../i18n/i18n'

const n = (v: number, digits = 0) => v.toLocaleString('en-US', { maximumFractionDigits: digits })

/** Elapsed mission time in the unit a person would say it in. */
export function formatMissionTime(seconds: number): string {
  if (seconds < 60) return t('unit.s', { n: Math.round(seconds) })
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds - m * 60)
    return s ? t('unit.minS', { m, s }) : t('unit.min', { n: m })
  }
  const hours = seconds / 3600
  if (hours < 48) return t('unit.h', { n: n(hours, hours < 10 ? 1 : 0) })
  const days = hours / 24
  if (days < 60) return t('unit.days', { n: Math.round(days) })
  const months = days / 30.44
  if (months < 24) return t('unit.months', { n: Math.round(months) })
  return t('unit.years', { n: n(days / 365.25, 1) })
}

export function formatDistance(km: number): string {
  if (km >= 1_000_000) return t('unit.mkm', { n: n(km / 1_000_000, km < 10_000_000 ? 1 : 0) })
  return t('unit.km', { n: n(km) })
}

/** One-way radio delay: how long a command takes to arrive. */
export function formatDelay(seconds: number): string {
  if (seconds < 0.05) return t('unit.instant')
  if (seconds < 60) return t('unit.s', { n: n(seconds, 1) })
  const min = seconds / 60
  return t('unit.min', { n: n(min, min < 20 ? 1 : 0) })
}
