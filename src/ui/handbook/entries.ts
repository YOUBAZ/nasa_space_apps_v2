import { COMPONENTS, INSTRUMENTS, OBJECTIVES, ORBITS, STATIONS, VEHICLES } from '../../engine/catalog'
import { t } from '../../i18n/i18n'

export const CONCEPTS = ['tradeoff', 'mass', 'power', 'data', 'coverage', 'payload', 'lifetime', 'budget', 'schedule', 'margin']

const BASICS = 'https://science.nasa.gov/learn/basics-of-space-flight/'
export interface HandbookSection { key: string; ids: string[]; url: string }

export function handbookSections(): HandbookSection[] {
  const slots = Object.values(COMPONENTS)
  return [
    { key: 'concepts', ids: CONCEPTS.map((c) => `concept.${c}`), url: BASICS + 'chapter7-1/' },
    { key: 'objectives', ids: Object.keys(OBJECTIVES).map((o) => `obj.${o}`), url: 'https://science.nasa.gov/' },
    { key: 'orbits', ids: Object.keys(ORBITS).map((o) => `orb.${o}`), url: 'https://earthobservatory.nasa.gov/features/OrbitsCatalog' },
    { key: 'spacecraft', ids: slots.flatMap((d) => [`slot.${d.slot}`, ...Object.keys(d.options).map((o) => `opt.${d.slot}.${o}`)]), url: 'https://www.nasa.gov/smallsat-institute/sst-soa/' },
    { key: 'instruments', ids: Object.keys(INSTRUMENTS).map((i) => `inst.${i}`), url: BASICS + 'chapter12-1/' },
    { key: 'vehicles', ids: Object.keys(VEHICLES).map((v) => `veh.${v}`), url: BASICS + 'chapter14-1/' },
    { key: 'stations', ids: Object.keys(STATIONS).map((s) => `stn.${s}`), url: 'https://www.nasa.gov/communicating-with-missions/dsn/' },
  ]
}

export const handbookIds = (): string[] => handbookSections().flatMap((s) => s.ids)

export const entryTitle = (id: string): string => (id.startsWith('concept.') ? t(`hbt.${id}`) : t(id))

export const entryUrl = (id: string): string =>
  handbookSections().find((s) => s.ids.includes(id))?.url ?? BASICS
