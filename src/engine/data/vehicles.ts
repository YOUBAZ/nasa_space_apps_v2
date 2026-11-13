import type { Difficulty, VehicleId } from '../types'

export type CapClass = 'LEO' | 'SSO' | 'GTO' | 'ESC'
export interface Vehicle {
  id: VehicleId
  name: string
  cap: Record<CapClass, number | null>
  cost: number
}

const v = (id: VehicleId, name: string, LEO: number | null, SSO: number | null, GTO: number | null, ESC: number | null, cost: number): Vehicle =>
  ({ id, name, cap: { LEO, SSO, GTO, ESC }, cost })

// Approximate public figures, rounded and simplified for gameplay (balance appendix §2).
export const VEHICLES: Record<VehicleId, Vehicle> = {
  electron: v('electron', 'Electron', 300, 200, null, null, 8),
  pslv: v('pslv', 'PSLV-XL', 3800, 1750, 1400, null, 30),
  vega_c: v('vega_c', 'Vega-C', 3300, 2300, null, null, 45),
  h3: v('h3', 'H3', 9000, 4000, 6500, 1000, 60),
  falcon9: v('falcon9', 'Falcon 9', 17500, 12000, 5500, 2500, 70),
  ariane64: v('ariane64', 'Ariane 64', 21600, 15000, 11500, 4000, 115),
  atlas_v: v('atlas_v', 'Atlas V 551', 18800, 15000, 8900, 4000, 150),
  vulcan: v('vulcan', 'Vulcan Centaur', 27200, 20000, 15000, 6000, 120),
  new_glenn: v('new_glenn', 'New Glenn', 45000, 30000, 13600, 7000, 110),
  falcon_hvy: v('falcon_hvy', 'Falcon Heavy', 63800, 40000, 26700, 16800, 150),
  sls: v('sls', 'SLS Block 1', 95000, null, null, 27000, 900),
}

export const VEHICLES_BY_DIFF: Record<Difficulty, VehicleId[]> = {
  fan: ['electron', 'pslv', 'falcon9', 'atlas_v', 'falcon_hvy', 'sls'],
  nerd: ['electron', 'pslv', 'vega_c', 'h3', 'falcon9', 'ariane64', 'atlas_v', 'falcon_hvy', 'sls'],
  expert: Object.keys(VEHICLES) as VehicleId[],
}
