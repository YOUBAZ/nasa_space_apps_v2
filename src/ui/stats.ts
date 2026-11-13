import { COMPONENTS, INSTRUMENTS, ORBITS, STATIONS, VEHICLES } from '../engine/catalog'
import type { InstrumentId, OrbitId, Slot, StationId, VehicleId } from '../engine/types'
import { t } from '../i18n/i18n'
import type { Chip } from './components/OptionCard'
import { num } from './names'

/** Raw stats for a spacecraft part. The game shows numbers, never verdicts. */
export function optionChips(slot: Slot, id: string): Chip[] {
  const o = COMPONENTS[slot].options[id]
  const chips: Chip[] = []
  if (o.mass) chips.push({ icon: 'weight', text: `${num(o.mass)} kg` })
  if (o.power) chips.push({ icon: 'bolt', text: `${num(o.power)} W` })
  chips.push({ icon: 'coin', text: `$${o.cost}M` })
  if (o.dev) chips.push({ icon: 'clock', text: t('stat.months', { n: o.dev }) })
  const a = (text: string) => chips.push({ text, tone: 'accent' })
  if (o.supports) a(t('stat.supports', { n: num(o.supports) }))
  if (o.gen) a(o.solar ? t('stat.genSolar', { n: num(o.gen) }) : t('stat.genAnywhere', { n: num(o.gen) }))
  if (o.wh) a(t('stat.wh', { n: num(o.wh) }))
  if (o.gbday) a(t('stat.gbday', { n: num(o.gbday) }))
  if (o.radhard) a(t('stat.radhard'))
  if (slot === 'attitude') a(t('stat.pointing', { n: o.point ?? 0 }))
  if (o.handles) a(t('stat.handles', { list: o.handles.map((h) => t(`thermal.${h}`)).join(', ') }))
  if (slot === 'propulsion') a(t(`stat.prop.${o.cls ?? 0}`))
  if (o.gb) a(t('stat.gb', { n: num(o.gb) }))
  if (slot === 'antenna') {
    a(t('stat.gain', { n: o.gain ?? 0 }))
    a(t('stat.reach', { where: t(`tier.${o.tier}`) }))
    if (o.point) a(t('stat.needsPointing', { n: o.point }))
  }
  if (slot === 'band') {
    a(t('stat.rate', { n: o.rate ?? 0 }))
    a(t('stat.reach', { where: t(`tier.${o.tier}`) }))
    if (o.needGain) a(t('stat.needsGain', { n: o.needGain }))
  }
  return chips
}

export function instrumentChips(id: InstrumentId): Chip[] {
  const i = INSTRUMENTS[id]
  const chips: Chip[] = [
    { icon: 'weight', text: `${num(i.mass)} kg` },
    { icon: 'bolt', text: `${num(i.power)} W` },
    { icon: 'coin', text: `$${i.cost}M` },
    { icon: 'clock', text: t('stat.months', { n: i.dev }) },
    { icon: 'data', text: `${num(i.gb, 1)} Gb/d` },
  ]
  if (i.point) chips.push({ text: t('stat.needsPointing', { n: i.point }), tone: 'accent' })
  if (i.surface) chips.push({ text: t('stat.surfaceOnly'), tone: 'accent' })
  return chips
}

export function vehicleChips(id: VehicleId): Chip[] {
  const v = VEHICLES[id]
  const cap = (n: number | null) => (n === null ? '–' : `${num(n)} kg`)
  return [
    { icon: 'coin', text: `$${v.cost}M` },
    { text: `${t('cap.LEO')} ${cap(v.cap.LEO)}`, tone: 'accent' },
    { text: `${t('cap.SSO')} ${cap(v.cap.SSO)}`, tone: 'accent' },
    { text: `${t('cap.GTO')} ${cap(v.cap.GTO)}`, tone: 'accent' },
    { text: `${t('cap.ESC')} ${cap(v.cap.ESC)}`, tone: 'accent' },
  ]
}

export function orbitChips(id: OrbitId): Chip[] {
  const o = ORBITS[id]
  const chips: Chip[] = [
    { icon: 'rocket', text: o.capMult === 1 ? t(`cap.${o.cls}`) : `${t(`cap.${o.cls}`)} × ${o.capMult}` },
    { icon: 'bolt', text: t('stat.sunlight', { n: Math.round(o.sun * 100) }) },
    { text: t('stat.shadow', { n: o.shadow }) },
    { icon: 'radio', text: t('stat.distance', { where: t(`tier.${o.tier}`) }) },
    { icon: 'clock', text: t('stat.life', { n: o.life }) },
    { text: t(o.dsn ? 'stat.netDsn' : 'stat.netNear'), tone: 'accent' },
    { text: t(`stat.capture.${o.capture}`), tone: 'accent' },
    { text: t('stat.radiation', { level: t(`level.${o.rad}`) }), tone: 'accent' },
    { text: t('stat.thermal', { level: t(`thermal.${o.thermal}`) }), tone: 'accent' },
  ]
  if (!o.earth) chips.push({ text: t('stat.noMagField'), tone: 'accent' })
  if (o.marsWindow) chips.push({ text: t('stat.marsWindow'), tone: 'accent' })
  return chips
}

export function stationChips(id: StationId, orbit?: OrbitId, band?: string): Chip[] {
  const s = STATIONS[id]
  const chips: Chip[] = [{ icon: 'coin', text: `$${s.cost}M` }, { text: t(s.network === 'dsn' ? 'stat.netDsn' : 'stat.netNear') }]
  if (orbit) {
    const cov = s.coverage[orbit] * (band === 'ka' && s.rainy ? 0.7 : 1)
    chips.push({ icon: 'eye', text: t('stat.sees', { n: Math.round(cov * 100) }), tone: 'accent' })
  }
  if (s.rainy) chips.push({ text: t('stat.rainy') })
  return chips
}
