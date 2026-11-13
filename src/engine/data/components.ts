import type { Difficulty, Slot } from '../types'
import type { Thermal } from './orbits'

export interface ComponentOption {
  id: string
  name: string
  mass: number
  power: number
  cost: number
  dev: number
  // slot-specific stats
  supports?: number
  gen?: number
  solar?: boolean
  wh?: number
  gbday?: number
  radhard?: boolean
  point?: number
  handles?: Thermal[]
  cls?: number
  gb?: number
  gain?: number
  tier?: number
  rate?: number
  needGain?: number
}
export interface SlotDef {
  slot: Slot
  name: string
  options: Record<string, ComponentOption>
}

const opt = (id: string, name: string, mass: number, power: number, cost: number, dev: number, extra: Partial<ComponentOption> = {}): ComponentOption =>
  ({ id, name, mass, power, cost, dev, ...extra })
const slot = (s: Slot, name: string, ...os: ComponentOption[]): SlotDef =>
  ({ slot: s, name, options: Object.fromEntries(os.map((x) => [x.id, x])) })

// Balance appendix §5. Option order = cheapest → most capable.
export const COMPONENTS: Record<Slot, SlotDef> = {
  structure: slot('structure', 'Structure (bus)',
    opt('small', 'Small bus', 150, 0, 15, 6, { supports: 500 }),
    opt('medium', 'Medium bus', 400, 0, 45, 9, { supports: 2000 }),
    opt('large', 'Large bus', 1000, 0, 110, 12, { supports: 6000 })),
  power: slot('power', 'Power source',
    opt('body_solar', 'Body-mounted solar', 25, 0, 5, 3, { gen: 400, solar: true }),
    opt('deploy_solar', 'Deployable solar arrays', 120, 0, 25, 6, { gen: 2500, solar: true }),
    opt('large_solar', 'Large solar arrays', 350, 0, 60, 9, { gen: 8000, solar: true }),
    opt('rtg', 'RTG (nuclear battery)', 60, 0, 110, 18, { gen: 450, solar: false })),
  battery: slot('battery', 'Batteries',
    opt('small', 'Small battery', 10, 0, 2, 3, { wh: 1000 }),
    opt('medium', 'Medium battery', 35, 0, 6, 3, { wh: 4000 }),
    opt('large', 'Large battery', 120, 0, 15, 6, { wh: 15000 })),
  computer: slot('computer', 'Onboard computer',
    opt('basic', 'Basic computer', 3, 15, 3, 3, { gbday: 100, radhard: false }),
    opt('radhard', 'Radiation-hardened computer', 6, 25, 12, 6, { gbday: 300, radhard: true }),
    opt('highperf', 'High-performance computer', 10, 60, 25, 9, { gbday: 1500, radhard: false })),
  attitude: slot('attitude', 'Attitude control',
    opt('magnetorquer', 'Magnetorquers', 4, 5, 1, 3, { point: 1 }),
    opt('wheels', 'Reaction wheels', 25, 50, 8, 6, { point: 2 }),
    opt('wheels_star', 'Wheels + star trackers', 40, 80, 15, 9, { point: 3 })),
  thermal: slot('thermal', 'Thermal control',
    opt('passive', 'Passive (paint & blankets)', 5, 0, 1, 2, { handles: ['mild'] }),
    opt('heaters', 'Heaters + radiators', 25, 60, 5, 4, { handles: ['mild', 'cold'] }),
    opt('active', 'Active fluid loop', 60, 150, 20, 8, { handles: ['mild', 'cold', 'extreme'] })),
  propulsion: slot('propulsion', 'Propulsion',
    opt('none', 'None', 0, 0, 0, 0, { cls: 0 }),
    opt('cold_gas', 'Cold-gas thrusters', 20, 0, 3, 3, { cls: 1 }),
    opt('chemical', 'Chemical engine + fuel', 600, 10, 30, 9, { cls: 2 }),
    opt('ion', 'Electric (ion) engine', 150, 1500, 45, 12, { cls: 2 })),
  storage: slot('storage', 'Data storage',
    opt('small', 'Small recorder', 2, 5, 1, 2, { gb: 100 }),
    opt('medium', 'Medium recorder', 5, 10, 3, 3, { gb: 500 }),
    opt('large', 'Large recorder', 12, 20, 8, 4, { gb: 4000 })),
  protection: slot('protection', 'Protection',
    opt('none', 'None', 0, 0, 0, 0),
    opt('rad_shield', 'Radiation shielding', 150, 0, 20, 6),
    opt('sunshield', 'Sunshield', 300, 0, 80, 12),
    opt('mars_edl', 'Mars landing kit', 900, 0, 180, 18)),
  antenna: slot('antenna', 'Antenna',
    opt('omni', 'Omni antenna', 2, 10, 1, 3, { gain: 0.2, tier: 2, point: 0 }),
    opt('medium', 'Medium-gain antenna', 6, 25, 4, 4, { gain: 1, tier: 3, point: 1 }),
    opt('hga', 'High-gain dish (1 m)', 30, 70, 12, 6, { gain: 4, tier: 4, point: 2 }),
    opt('dsa', 'Deep-space dish (3 m)', 90, 120, 35, 12, { gain: 15, tier: 5, point: 3 })),
  band: slot('band', 'Frequency band',
    opt('uhf', 'UHF', 0, 0, 0, 0, { rate: 0.5, tier: 1, needGain: 0 }),
    opt('s', 'S-band', 0, 0, 1, 0, { rate: 2, tier: 5, needGain: 0 }),
    opt('x', 'X-band', 0, 0, 3, 0, { rate: 10, tier: 5, needGain: 0 }),
    opt('ka', 'Ka-band', 0, 0, 6, 0, { rate: 40, tier: 5, needGain: 4 })),
}

/** Options offered per difficulty (before locks). A slot absent here is auto-set. */
export const SLOT_OPTIONS: Record<Difficulty, Partial<Record<Slot, string[]>>> = {
  fan: {
    structure: ['medium', 'large'], power: ['deploy_solar', 'large_solar'], battery: ['medium', 'large'],
    propulsion: ['none', 'chemical'], protection: ['none', 'sunshield'], antenna: ['medium', 'dsa'],
  },
  nerd: {
    structure: ['small', 'medium', 'large'], power: ['body_solar', 'deploy_solar', 'large_solar'],
    battery: ['small', 'medium', 'large'], computer: ['basic', 'radhard'],
    attitude: ['magnetorquer', 'wheels', 'wheels_star'], propulsion: ['none', 'cold_gas', 'chemical'],
    storage: ['small', 'medium', 'large'], protection: ['none', 'sunshield', 'mars_edl'],
    antenna: ['medium', 'hga', 'dsa'], band: ['uhf', 's', 'x'],
  },
  expert: {
    structure: ['small', 'medium', 'large'], power: ['body_solar', 'deploy_solar', 'large_solar', 'rtg'],
    battery: ['small', 'medium', 'large'], computer: ['basic', 'radhard', 'highperf'],
    attitude: ['magnetorquer', 'wheels', 'wheels_star'], thermal: ['passive', 'heaters', 'active'],
    propulsion: ['none', 'cold_gas', 'chemical', 'ion'], storage: ['small', 'medium', 'large'],
    protection: ['none', 'rad_shield', 'sunshield', 'mars_edl'], antenna: ['omni', 'medium', 'hga', 'dsa'],
    band: ['uhf', 's', 'x', 'ka'],
  },
}

/** Auto-set values for slots a difficulty hides. Thermal is destination-aware (see catalog.autoOption). */
export const AUTO_OPTIONS: Record<Difficulty, Partial<Record<Slot, string>>> = {
  fan: { computer: 'radhard', attitude: 'wheels_star', thermal: 'heaters', storage: 'medium', band: 'x' },
  nerd: { thermal: 'heaters' },
  expert: {},
}
