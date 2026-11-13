export type Role = 'planner' | 'scientist' | 'designer' | 'radio'
export const ROLES: Role[] = ['planner', 'scientist', 'designer', 'radio']
export type Difficulty = 'fan' | 'nerd' | 'expert'
export type MissionType = 'eo' | 'deep' | 'mars'

export type VehicleId =
  | 'electron' | 'pslv' | 'vega_c' | 'h3' | 'falcon9' | 'ariane64'
  | 'atlas_v' | 'vulcan' | 'new_glenn' | 'falcon_hvy' | 'sls'
export type OrbitId =
  | 'leo' | 'sso' | 'meo' | 'geo' | 'heo' | 'l2' | 'lunar'
  | 'asteroid' | 'mars_orbit' | 'mars_surf' | 'jupiter'
export type StationId =
  | 'svalbard' | 'kiruna' | 'fairbanks' | 'wallops' | 'hawaii' | 'santiago'
  | 'hartebeesthoek' | 'singapore' | 'goldstone' | 'madrid' | 'canberra'
export type InstrumentId =
  | 'hires_cam' | 'multispectral' | 'hyperspectral' | 'thermal_ir' | 'sar' | 'gpr'
  | 'spectrometer' | 'magnetometer' | 'radiation' | 'weather' | 'ir_telescope' | 'drill'
export type ObjectiveId =
  | 'wildfire' | 'polar_ice' | 'crops' | 'telescope' | 'asteroid' | 'jupiter'
  | 'mars_ice' | 'mars_scout' | 'mars_isru'

export type Slot =
  | 'structure' | 'power' | 'battery' | 'computer' | 'attitude' | 'thermal'
  | 'propulsion' | 'storage' | 'protection' | 'antenna' | 'band'
export const SLOTS: Slot[] = [
  'structure', 'power', 'battery', 'computer', 'attitude', 'thermal',
  'propulsion', 'storage', 'protection', 'antenna', 'band',
]
/** Slots chosen by the Radio Operator (they still count in the Designer's mass/power/cost). */
export const RADIO_SLOTS: Slot[] = ['antenna', 'band']

export type Design = {
  orbit: OrbitId
  vehicle: VehicleId
  instruments: InstrumentId[]
  stations: StationId[]
} & Record<Slot, string>

export type Severity = 'critical' | 'major' | 'minor'
export type FaultCode =
  | 'vehicle_cannot_reach' | 'over_capacity' | 'structure_overloaded' | 'wrong_destination'
  | 'power_deficit' | 'thin_power_margin' | 'battery_short' | 'no_capture_propulsion'
  | 'no_landing_kit' | 'radiation_fried' | 'telescope_blinded' | 'tumbling'
  | 'pointing_too_coarse' | 'no_link' | 'no_station_in_view' | 'coverage_low'
  | 'downlink_bottleneck' | 'computer_overloaded' | 'storage_overflow' | 'thermal_failure'
  | 'short_lifetime' | 'wasted_stations' | 'irrelevant_instruments'
  | 'schedule_overrun' | 'missed_mars_window' | 'unused_allocation'

export interface Fault {
  severity: Severity
  code: FaultCode
  roles: Role[]
}

export type ScheduleMode = 'rush' | 'standard' | 'careful'
