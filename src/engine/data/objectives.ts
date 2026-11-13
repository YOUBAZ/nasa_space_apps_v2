import type { Difficulty, InstrumentId, MissionType, ObjectiveId, OrbitId } from '../types'

export interface Objective {
  id: ObjectiveId
  type: MissionType
  name: string
  minDiff: Difficulty
  orbits: Partial<Record<OrbitId, number>>
  life: number
  minCov: number
  grant: number
  rel: Partial<Record<InstrumentId, number>>
}

// Balance appendix §7
export const OBJECTIVES: Record<ObjectiveId, Objective> = {
  wildfire: { id: 'wildfire', type: 'eo', name: 'Wildfire & disaster watch', minDiff: 'fan',
    orbits: { sso: 1, leo: 0.9, geo: 0.6, meo: 0.5 }, life: 3, minCov: 0.2, grant: 360,
    rel: { thermal_ir: 3, multispectral: 2, hires_cam: 2, sar: 2, hyperspectral: 1 } },
  polar_ice: { id: 'polar_ice', type: 'eo', name: 'Polar ice & climate', minDiff: 'nerd',
    orbits: { sso: 1, heo: 0.8, leo: 0.3 }, life: 5, minCov: 0.1, grant: 480,
    rel: { sar: 3, thermal_ir: 2, gpr: 2, multispectral: 1, spectrometer: 1, hires_cam: 1 } },
  crops: { id: 'crops', type: 'eo', name: 'Crops & water resources', minDiff: 'expert',
    orbits: { sso: 1, leo: 0.8, geo: 0.4, meo: 0.4 }, life: 5, minCov: 0.1, grant: 400,
    rel: { multispectral: 3, hyperspectral: 3, thermal_ir: 2, sar: 2, hires_cam: 1 } },
  telescope: { id: 'telescope', type: 'deep', name: 'Infrared space telescope', minDiff: 'fan',
    orbits: { l2: 1, leo: 0.3 }, life: 5, minCov: 0.3, grant: 1300,
    rel: { ir_telescope: 3, spectrometer: 2 } },
  asteroid: { id: 'asteroid', type: 'deep', name: 'Asteroid survey', minDiff: 'nerd',
    orbits: { asteroid: 1 }, life: 3, minCov: 0.3, grant: 800,
    rel: { spectrometer: 3, hires_cam: 2, gpr: 2, hyperspectral: 2, magnetometer: 1, multispectral: 1, thermal_ir: 1 } },
  jupiter: { id: 'jupiter', type: 'deep', name: "Jupiter's icy moons", minDiff: 'expert',
    orbits: { jupiter: 1 }, life: 4, minCov: 0.3, grant: 1400,
    rel: { magnetometer: 3, gpr: 3, spectrometer: 2, hires_cam: 2, radiation: 1, thermal_ir: 1 } },
  mars_ice: { id: 'mars_ice', type: 'mars', name: 'Mars water-ice mapper', minDiff: 'fan',
    orbits: { mars_orbit: 1 }, life: 4, minCov: 0.3, grant: 700,
    rel: { gpr: 3, spectrometer: 2, thermal_ir: 2, hyperspectral: 2, hires_cam: 1, multispectral: 1 } },
  mars_scout: { id: 'mars_scout', type: 'mars', name: 'Landing-site scout & weather lander', minDiff: 'nerd',
    orbits: { mars_surf: 1, mars_orbit: 0.5 }, life: 2, minCov: 0.2, grant: 1000,
    rel: { weather: 3, hires_cam: 2, radiation: 2, spectrometer: 1, multispectral: 1 } },
  mars_isru: { id: 'mars_isru', type: 'mars', name: 'Resource test lander', minDiff: 'expert',
    orbits: { mars_surf: 1 }, life: 2, minCov: 0.2, grant: 1200,
    rel: { drill: 3, spectrometer: 2, gpr: 2, weather: 1, radiation: 1 } },
}

export const OBJECTIVES_BY_DIFF: Record<Difficulty, ObjectiveId[]> = {
  fan: ['wildfire', 'telescope', 'mars_ice'],
  nerd: ['wildfire', 'polar_ice', 'telescope', 'asteroid', 'mars_ice', 'mars_scout'],
  expert: Object.keys(OBJECTIVES) as ObjectiveId[],
}
