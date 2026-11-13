import {
  VEHICLES, ORBITS, STATIONS, INSTRUMENTS, OBJECTIVES, COMPONENTS,
  optionsFor, autoOption, instrumentsFor, objectivesFor, vehiclesFor, orbitsFor,
  LOCKED_AT_START, STARTING_BUDGET,
} from '../../src/engine/catalog'

describe('catalog', () => {
  it('has the full content set', () => {
    expect(Object.keys(VEHICLES)).toHaveLength(11)
    expect(Object.keys(ORBITS)).toHaveLength(11)
    expect(Object.keys(STATIONS)).toHaveLength(11)
    expect(Object.keys(INSTRUMENTS)).toHaveLength(12)
    expect(Object.keys(OBJECTIVES)).toHaveLength(9)
    expect(Object.keys(COMPONENTS)).toHaveLength(11)
  })
  it('matches appendix numbers', () => {
    expect(VEHICLES.falcon9.cap.ESC).toBe(2500)
    expect(VEHICLES.sls.cap.SSO).toBeNull()
    expect(ORBITS.jupiter.capMult).toBe(0.6)
    expect(COMPONENTS.power.options.rtg.gen).toBe(450)
    expect(STATIONS.svalbard.coverage.geo).toBe(0)
    expect(OBJECTIVES.wildfire.grant).toBe(360)
  })
  it('limits options by difficulty', () => {
    expect(optionsFor('fan', 'structure', [])).toEqual(['medium', 'large'])
    expect(optionsFor('fan', 'computer', [])).toEqual([])
    expect(optionsFor('expert', 'band', [])).toEqual(['uhf', 's', 'x'])
    expect(optionsFor('expert', 'band', ['ka'])).toEqual(['uhf', 's', 'x', 'ka'])
    expect(vehiclesFor('fan')).toHaveLength(6)
    expect(orbitsFor('nerd')).toHaveLength(9)
  })
  it('auto-sets hidden slots sensibly', () => {
    expect(autoOption('fan', 'computer', 'sso')).toBe('radhard')
    expect(autoOption('nerd', 'thermal', 'mars_surf')).toBe('active')
    expect(autoOption('nerd', 'thermal', 'sso')).toBe('heaters')
    expect(autoOption('expert', 'thermal', 'sso')).toBeNull()
  })
  it('locks advanced gear at start', () => {
    expect(LOCKED_AT_START).toEqual(['highperf', 'ion', 'ka', 'hyperspectral'])
    expect(instrumentsFor('expert', [])).not.toContain('hyperspectral')
    expect(instrumentsFor('expert', ['hyperspectral'])).toContain('hyperspectral')
    expect(objectivesFor('fan')).toEqual(['wildfire', 'telescope', 'mars_ice'])
    expect(STARTING_BUDGET).toEqual({ fan: 2000, nerd: 1600, expert: 1300 })
  })
})
