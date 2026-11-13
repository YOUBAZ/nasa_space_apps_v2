import type { Difficulty, OrbitId } from '../types'
import type { CapClass } from './vehicles'

export type Thermal = 'mild' | 'cold' | 'extreme'
export interface Orbit {
  id: OrbitId
  name: string
  cls: CapClass
  capMult: number
  sun: number
  shadow: number
  dist: number
  tier: number
  life: number
  capture: 0 | 1 | 2
  dsn: boolean
  rad: 'low' | 'med' | 'high'
  thermal: Thermal
  earth: boolean
  covMult: number
  marsWindow: boolean
}

const o = (id: OrbitId, name: string, p: Omit<Orbit, 'id' | 'name' | 'marsWindow'>): Orbit =>
  ({ id, name, marsWindow: id === 'mars_orbit' || id === 'mars_surf', ...p })

// Balance appendix §3
export const ORBITS: Record<OrbitId, Orbit> = {
  leo: o('leo', 'Low Earth Orbit (400 km)', { cls: 'LEO', capMult: 1, sun: 1, shadow: 0.6, dist: 1, tier: 1, life: 2, capture: 0, dsn: false, rad: 'low', thermal: 'mild', earth: true, covMult: 1 }),
  sso: o('sso', 'Sun-Synchronous Orbit (700 km)', { cls: 'SSO', capMult: 1, sun: 1, shadow: 0.5, dist: 1, tier: 1, life: 8, capture: 0, dsn: false, rad: 'low', thermal: 'mild', earth: true, covMult: 1 }),
  meo: o('meo', 'Medium Earth Orbit', { cls: 'GTO', capMult: 1, sun: 1, shadow: 1, dist: 0.3, tier: 2, life: 15, capture: 0, dsn: false, rad: 'med', thermal: 'mild', earth: true, covMult: 1 }),
  geo: o('geo', 'Geostationary Orbit', { cls: 'GTO', capMult: 1, sun: 1, shadow: 1.2, dist: 0.3, tier: 2, life: 15, capture: 0, dsn: false, rad: 'low', thermal: 'mild', earth: true, covMult: 1 }),
  heo: o('heo', 'Highly Elliptical (Molniya)', { cls: 'GTO', capMult: 1, sun: 1, shadow: 1, dist: 0.3, tier: 2, life: 10, capture: 0, dsn: false, rad: 'med', thermal: 'mild', earth: true, covMult: 1 }),
  l2: o('l2', 'Sun–Earth L2', { cls: 'ESC', capMult: 1, sun: 1, shadow: 0, dist: 0.02, tier: 3, life: 10, capture: 1, dsn: true, rad: 'low', thermal: 'cold', earth: false, covMult: 1 }),
  lunar: o('lunar', 'Lunar Orbit', { cls: 'ESC', capMult: 1, sun: 1, shadow: 0.8, dist: 0.05, tier: 3, life: 3, capture: 2, dsn: true, rad: 'low', thermal: 'cold', earth: false, covMult: 1 }),
  asteroid: o('asteroid', 'Asteroid Rendezvous', { cls: 'ESC', capMult: 0.8, sun: 0.5, shadow: 0, dist: 0.01, tier: 4, life: 5, capture: 2, dsn: true, rad: 'low', thermal: 'cold', earth: false, covMult: 1 }),
  mars_orbit: o('mars_orbit', 'Mars Orbit', { cls: 'ESC', capMult: 1, sun: 0.43, shadow: 0.7, dist: 0.005, tier: 4, life: 10, capture: 2, dsn: true, rad: 'low', thermal: 'cold', earth: false, covMult: 1 }),
  mars_surf: o('mars_surf', 'Mars Surface', { cls: 'ESC', capMult: 1, sun: 0.35, shadow: 12, dist: 0.005, tier: 4, life: 8, capture: 0, dsn: true, rad: 'low', thermal: 'extreme', earth: false, covMult: 0.5 }),
  jupiter: o('jupiter', 'Jupiter System', { cls: 'ESC', capMult: 0.6, sun: 0.04, shadow: 0, dist: 0.001, tier: 5, life: 6, capture: 2, dsn: true, rad: 'high', thermal: 'cold', earth: false, covMult: 1 }),
}

export const ORBITS_BY_DIFF: Record<Difficulty, OrbitId[]> = {
  fan: ['leo', 'sso', 'meo', 'geo', 'l2', 'lunar', 'mars_orbit'],
  nerd: ['leo', 'sso', 'meo', 'geo', 'l2', 'lunar', 'mars_orbit', 'asteroid', 'mars_surf'],
  expert: Object.keys(ORBITS) as OrbitId[],
}
