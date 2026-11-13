import type { Design, Fault, FaultCode, ObjectiveId } from './types'
import type { MissionReport } from './evaluate'
import { COMPONENTS, OBJECTIVES, ORBITS, VEHICLES } from './catalog'

const BASICS = 'https://science.nasa.gov/learn/basics-of-space-flight/'
const LEARN: Record<FaultCode, string> = {
  vehicle_cannot_reach: BASICS + 'chapter14-1/',
  over_capacity: BASICS + 'chapter14-1/',
  structure_overloaded: BASICS + 'chapter11-1/',
  wrong_destination: 'https://earthobservatory.nasa.gov/features/OrbitsCatalog',
  power_deficit: BASICS + 'chapter11-3/',
  thin_power_margin: BASICS + 'chapter11-3/',
  battery_short: BASICS + 'chapter11-3/',
  no_capture_propulsion: BASICS + 'chapter4-1/',
  no_landing_kit: BASICS + 'chapter16-1/',
  radiation_fried: BASICS + 'chapter11-1/',
  telescope_blinded: BASICS + 'chapter12-1/',
  tumbling: BASICS + 'chapter11-2/',
  pointing_too_coarse: BASICS + 'chapter11-2/',
  no_link: BASICS + 'chapter10-1/',
  no_station_in_view: 'https://www.nasa.gov/communicating-with-missions/dsn/',
  coverage_low: 'https://www.nasa.gov/communicating-with-missions/dsn/',
  downlink_bottleneck: BASICS + 'chapter10-1/',
  computer_overloaded: BASICS + 'chapter11-1/',
  storage_overflow: BASICS + 'chapter11-1/',
  thermal_failure: BASICS + 'chapter11-3/',
  short_lifetime: 'https://earthobservatory.nasa.gov/features/OrbitsCatalog',
  wasted_stations: 'https://earthobservatory.nasa.gov/features/OrbitsCatalog',
  irrelevant_instruments: BASICS + 'chapter12-1/',
  schedule_overrun: BASICS + 'chapter7-1/',
  missed_mars_window: BASICS + 'chapter4-1/',
  unused_allocation: BASICS + 'chapter7-1/',
}

export interface FaultExplanation {
  titleKey: string
  whatKey: string
  whyKey: string
  fixKey: string
  learnUrl: string
  vars: Record<string, string | number>
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Turns a fault into debrief copy keys plus the numbers that fill them. */
export function explainFault(
  f: Fault, report: MissionReport, design: Design, objective: ObjectiveId,
  extra: Record<string, string | number> = {},
): FaultExplanation {
  const o = ORBITS[design.orbit]
  const ob = OBJECTIVES[objective]
  const structure = COMPONENTS.structure.options[design.structure]
  const solar = COMPONENTS.power.options[design.power]?.solar
  const vars: Record<string, string | number> = {
    vehicle: VEHICLES[design.vehicle].name,
    orbit: o.name,
    objective: ob.name,
    mass: Math.round(report.mass),
    capacity: Math.round(report.capacity),
    carried: Math.round(report.mass - (structure?.mass ?? 0)),
    supports: structure?.supports ?? 0,
    powerDraw: Math.round(report.powerDraw),
    powerGen: Math.round(report.powerGen),
    sunPct: Math.round(o.sun * 100),
    shadow: o.shadow,
    needWh: Math.round(solar ? report.powerDraw * o.shadow : 0),
    batteryWh: COMPONENTS.battery.options[design.battery]?.wh ?? 0,
    dataGenerated: r1(report.dataGenerated),
    downlink: r1(report.downlink),
    coveragePct: Math.round(report.coverage * 100),
    minCovPct: Math.round(ob.minCov * 100),
    computerGb: COMPONENTS.computer.options[design.computer]?.gbday ?? 0,
    storageGb: COMPONENTS.storage.options[design.storage]?.gb ?? 0,
    life: r1(report.lifeYears),
    needLife: ob.life,
    extraStations: Math.max(0, design.stations.length - 1),
    readyMonth: 0, targetMonth: 0, waitMonths: 0, waitCost: 0,
    ...extra,
  }
  const k = `fault.${f.code}`
  return { titleKey: `${k}.title`, whatKey: `${k}.what`, whyKey: `${k}.why`, fixKey: `${k}.fix`, learnUrl: LEARN[f.code], vars }
}
