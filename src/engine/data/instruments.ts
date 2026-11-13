import type { Difficulty, InstrumentId } from '../types'

export interface Instrument {
  id: InstrumentId
  name: string
  mass: number
  power: number
  cost: number
  dev: number
  gb: number
  point: number
  surface: boolean
}

const i = (id: InstrumentId, name: string, mass: number, power: number, cost: number, dev: number, gb: number, point: number, surface = false): Instrument =>
  ({ id, name, mass, power, cost, dev, gb, point, surface })

// Balance appendix §6
export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  hires_cam: i('hires_cam', 'High-resolution camera', 60, 40, 25, 9, 50, 2),
  multispectral: i('multispectral', 'Multispectral imager', 50, 45, 30, 9, 40, 2),
  hyperspectral: i('hyperspectral', 'Hyperspectral imager', 80, 70, 45, 12, 120, 2),
  thermal_ir: i('thermal_ir', 'Thermal infrared camera', 45, 50, 25, 9, 20, 1),
  sar: i('sar', 'Synthetic aperture radar', 300, 600, 70, 15, 200, 2),
  gpr: i('gpr', 'Ground-penetrating radar', 40, 60, 35, 12, 10, 1),
  spectrometer: i('spectrometer', 'Spectrometer', 30, 25, 30, 9, 5, 2),
  magnetometer: i('magnetometer', 'Magnetometer', 5, 4, 8, 6, 0.1, 0),
  radiation: i('radiation', 'Radiation detector', 10, 8, 10, 6, 0.2, 0),
  weather: i('weather', 'Weather station', 15, 15, 12, 6, 0.5, 0, true),
  ir_telescope: i('ir_telescope', 'Infrared telescope', 800, 300, 400, 24, 60, 3),
  drill: i('drill', 'Drill & sample analyzer', 60, 120, 60, 15, 1, 0, true),
}

export const INSTRUMENTS_BY_DIFF: Record<Difficulty, InstrumentId[]> = {
  fan: ['hires_cam', 'multispectral', 'thermal_ir', 'spectrometer', 'gpr', 'ir_telescope'],
  nerd: ['hires_cam', 'multispectral', 'thermal_ir', 'spectrometer', 'gpr', 'ir_telescope', 'magnetometer', 'weather', 'sar'],
  expert: Object.keys(INSTRUMENTS) as InstrumentId[],
}
