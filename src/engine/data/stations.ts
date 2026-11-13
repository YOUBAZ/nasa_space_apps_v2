import type { OrbitId, StationId } from '../types'

export interface Station {
  id: StationId
  name: string
  network: 'near' | 'dsn'
  cost: number
  rainy: boolean
  /** map position, percent of a flat world map (x = longitude, y = latitude) */
  x: number
  y: number
  coverage: Record<OrbitId, number>
}

const DEEP: OrbitId[] = ['l2', 'lunar', 'asteroid', 'mars_orbit', 'mars_surf', 'jupiter']
const deep = (val: number) => Object.fromEntries(DEEP.map((o) => [o, val])) as Record<OrbitId, number>

function s(id: StationId, name: string, network: 'near' | 'dsn', lon: number, lat: number,
  leo: number, sso: number, meo: number, geo: number, heo: number, deepVal: number): Station {
  return {
    id, name, network, cost: network === 'dsn' ? 15 : 3,
    rainy: id === 'singapore' || id === 'hawaii',
    x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100,
    coverage: { ...deep(deepVal), leo, sso, meo, geo, heo },
  }
}

// Balance appendix §4
export const STATIONS: Record<StationId, Station> = {
  svalbard: s('svalbard', 'Svalbard (Norway)', 'near', 15.4, 78.2, 0.02, 0.15, 0.3, 0, 0.6, 0),
  kiruna: s('kiruna', 'Kiruna (Sweden)', 'near', 20.2, 67.9, 0.03, 0.1, 0.3, 1, 0.6, 0),
  fairbanks: s('fairbanks', 'Fairbanks (Alaska)', 'near', -147.7, 64.8, 0.04, 0.1, 0.3, 1, 0.6, 0),
  wallops: s('wallops', 'Wallops (Virginia)', 'near', -75.5, 37.9, 0.06, 0.05, 0.3, 1, 0.4, 0),
  hawaii: s('hawaii', 'Hawaii', 'near', -155.6, 19.8, 0.06, 0.04, 0.3, 1, 0.1, 0),
  santiago: s('santiago', 'Santiago (Chile)', 'near', -70.7, -33.4, 0.06, 0.05, 0.3, 1, 0.1, 0),
  hartebeesthoek: s('hartebeesthoek', 'Hartebeesthoek (South Africa)', 'near', 27.7, -25.9, 0.06, 0.05, 0.3, 1, 0.1, 0),
  singapore: s('singapore', 'Singapore', 'near', 103.8, 1.4, 0.07, 0.04, 0.3, 1, 0.1, 0),
  goldstone: s('goldstone', 'Goldstone DSN (California)', 'dsn', -116.9, 35.4, 0.04, 0.05, 0.3, 1, 0.4, 0.33),
  madrid: s('madrid', 'Madrid DSN (Spain)', 'dsn', -4.2, 40.4, 0.04, 0.05, 0.3, 1, 0.4, 0.33),
  canberra: s('canberra', 'Canberra DSN (Australia)', 'dsn', 149.0, -35.4, 0.04, 0.05, 0.3, 1, 0.1, 0.34),
}
