// Debrief copy. One idea per sentence, no jargon; the concept is named once.
export const faults: Record<string, string> = {
  'fault.vehicle_cannot_reach.title': "The rocket can't get there",
  'fault.vehicle_cannot_reach.what': '{vehicle} cannot send anything to {orbit}. The spacecraft never arrived.',
  'fault.vehicle_cannot_reach.why': 'Every rocket has a limit on how far it can push a payload. Far destinations need a much more powerful rocket than low orbits.',
  'fault.vehicle_cannot_reach.fix': 'Pick a rocket with a number in the column for this destination, or choose a closer orbit.',

  'fault.over_capacity.title': 'Too heavy for the rocket',
  'fault.over_capacity.what': 'The spacecraft weighed {mass} kg, but {vehicle} can only carry {capacity} kg to {orbit}.',
  'fault.over_capacity.why': 'This limit is called payload capacity. The farther the destination, the less a rocket can carry there.',
  'fault.over_capacity.fix': 'Use a bigger rocket, or cut mass: fewer instruments, a smaller bus, lighter parts.',

  'fault.structure_overloaded.title': 'The frame buckled',
  'fault.structure_overloaded.what': 'The bus had to hold {carried} kg of equipment but is built for {supports} kg. It broke during launch.',
  'fault.structure_overloaded.why': 'Launch shakes a spacecraft with several times its own weight. The structure must be sized for everything bolted to it.',
  'fault.structure_overloaded.fix': 'Choose a larger bus or carry less equipment.',

  'fault.wrong_destination.title': 'Wrong place for this science',
  'fault.wrong_destination.what': 'The spacecraft reached {orbit}, but the objective "{objective}" cannot be done from there.',
  'fault.wrong_destination.why': 'An orbit decides what the spacecraft can see. The science goal and the destination have to match.',
  'fault.wrong_destination.fix': 'Scientist and Radio Operator: agree on an orbit that suits the objective before design starts.',

  'fault.power_deficit.title': 'Not enough power',
  'fault.power_deficit.what': 'The spacecraft needs {powerDraw} W but only makes {powerGen} W at {orbit}. It shut down.',
  'fault.power_deficit.why': 'Solar panels make less power farther from the Sun: {sunPct}% of full power at this destination.',
  'fault.power_deficit.fix': 'Add bigger solar arrays, use an RTG far from the Sun, or switch off power-hungry instruments.',

  'fault.thin_power_margin.title': 'Power margin too thin',
  'fault.thin_power_margin.what': 'The spacecraft makes {powerGen} W and uses {powerDraw} W. That leaves under 10% spare.',
  'fault.thin_power_margin.why': 'Engineers keep spare power because panels age and loads spike. It worked this time, with no room for surprises.',
  'fault.thin_power_margin.fix': 'Aim for 10–40% spare power.',

  'fault.battery_short.title': 'The battery ran flat in the dark',
  'fault.battery_short.what': 'The spacecraft spends up to {shadow} hours without sunlight and needs {needWh} Wh to get through. The battery holds {batteryWh} Wh.',
  'fault.battery_short.why': 'In shadow or at night, solar panels make nothing. Everything runs on the battery until the Sun returns.',
  'fault.battery_short.fix': 'Fit a bigger battery, lower the power use, or use an RTG, which needs no sunlight.',

  'fault.no_capture_propulsion.title': 'It could not stop at the destination',
  'fault.no_capture_propulsion.what': 'The spacecraft arrived at {orbit} with no engine able to slow it into orbit.',
  'fault.no_capture_propulsion.why': 'A spacecraft arrives moving very fast. It must fire an engine to be captured or to hold its position.',
  'fault.no_capture_propulsion.fix': 'Add propulsion. Orbiting another world needs a chemical or ion engine.',

  'fault.no_landing_kit.title': 'No way to land',
  'fault.no_landing_kit.what': 'The lander hit the Mars atmosphere without a heat shield, parachute or landing engines.',
  'fault.no_landing_kit.why': 'Landing on Mars means going from thousands of km/h to zero in about seven minutes.',
  'fault.no_landing_kit.fix': 'Add the Mars landing kit in the Protection slot. It is heavy, so check the rocket again.',

  'fault.radiation_fried.title': 'Fried by radiation',
  'fault.radiation_fried.what': "Jupiter's radiation destroyed the electronics soon after arrival.",
  'fault.radiation_fried.why': 'Jupiter traps particles in belts millions of times stronger than anything near Earth.',
  'fault.radiation_fried.fix': 'Add radiation shielding in the Protection slot.',

  'fault.telescope_blinded.title': 'The telescope was blinded by heat',
  'fault.telescope_blinded.what': 'Without a sunshield the infrared telescope warmed up and saw only its own glow.',
  'fault.telescope_blinded.why': 'An infrared telescope detects heat, so it must be kept extremely cold.',
  'fault.telescope_blinded.fix': 'Add a sunshield in the Protection slot.',

  'fault.tumbling.title': 'The spacecraft tumbled',
  'fault.tumbling.what': 'Magnetorquers do nothing at {orbit}. The spacecraft could not point its panels or antenna.',
  'fault.tumbling.why': "Magnetorquers push against Earth's magnetic field. Away from Earth there is nothing to push against.",
  'fault.tumbling.fix': 'Use reaction wheels beyond Earth orbit.',

  'fault.pointing_too_coarse.title': 'It could not aim precisely enough',
  'fault.pointing_too_coarse.what': 'An instrument or the antenna needs steadier aim than the attitude control can give. Images were blurred and the link was weak.',
  'fault.pointing_too_coarse.why': 'Sharp cameras, telescopes and big dishes have narrow views, so the whole spacecraft must hold very still.',
  'fault.pointing_too_coarse.fix': 'Upgrade attitude control to reaction wheels, or wheels with star trackers.',

  'fault.no_link.title': 'No radio contact',
  'fault.no_link.what': 'The antenna and frequency band could not reach Earth from {orbit}. Nothing was ever heard.',
  'fault.no_link.why': 'A radio signal gets weaker with distance. Far destinations need a bigger dish and a suitable band.',
  'fault.no_link.fix': 'Radio Operator: choose a higher-gain antenna and a band that works at this distance.',

  'fault.no_station_in_view.title': 'Nobody was listening',
  'fault.no_station_in_view.what': 'None of the chosen ground stations can see a spacecraft at {orbit}.',
  'fault.no_station_in_view.why': 'A station must have the spacecraft in its sky. Beyond Earth orbit, only the Deep Space Network can hear it.',
  'fault.no_station_in_view.fix': 'Pick stations that cover this orbit: polar stations for polar orbits, DSN stations for deep space.',

  'fault.coverage_low.title': 'Too little contact time',
  'fault.coverage_low.what': 'Stations saw the spacecraft {coveragePct}% of the day. The objective needs {minCovPct}%.',
  'fault.coverage_low.why': 'Coverage is the share of the day a station can talk to the spacecraft. Less coverage means slower news and less data.',
  'fault.coverage_low.fix': 'Add a station that sees this orbit well.',

  'fault.downlink_bottleneck.title': 'Most of the data never came home',
  'fault.downlink_bottleneck.what': 'The instruments made {dataGenerated} Gb a day, but only {downlink} Gb a day could be sent to Earth.',
  'fault.downlink_bottleneck.why': 'Data rate depends on the band, the antenna, the distance and the contact time. Science left on board is science lost.',
  'fault.downlink_bottleneck.fix': 'Use a bigger antenna or faster band, add stations, or fly instruments that make less data.',

  'fault.computer_overloaded.title': 'The computer could not keep up',
  'fault.computer_overloaded.what': 'The instruments made {dataGenerated} Gb a day. The computer can process {computerGb} Gb a day.',
  'fault.computer_overloaded.why': 'Every bit from an instrument passes through the onboard computer before it is stored or sent.',
  'fault.computer_overloaded.fix': 'Fit a faster computer or make less data.',

  'fault.storage_overflow.title': 'The data recorder filled up',
  'fault.storage_overflow.what': 'Between contacts the spacecraft had to hold more data than its {storageGb} Gb recorder fits. Old data was overwritten.',
  'fault.storage_overflow.why': 'A spacecraft stores data while no station is in view, then sends it during the next contact.',
  'fault.storage_overflow.fix': 'Fit a larger recorder or add ground stations.',

  'fault.thermal_failure.title': 'Too cold to keep working',
  'fault.thermal_failure.what': 'The thermal control could not handle conditions at {orbit}. Parts froze and failed early.',
  'fault.thermal_failure.why': 'Electronics only work in a narrow temperature range. Far from the Sun, or through a Mars night, they need heating.',
  'fault.thermal_failure.fix': 'Upgrade thermal control: heaters for cold destinations, an active loop for the Mars surface.',

  'fault.short_lifetime.title': 'The mission ended early',
  'fault.short_lifetime.what': 'The spacecraft lasted {life} years. The objective needs {needLife}.',
  'fault.short_lifetime.why': 'Air drag in low orbit, radiation and dust all shorten a mission.',
  'fault.short_lifetime.fix': 'In low orbit add propulsion to fight drag. In radiation use a hardened computer or shielding.',

  'fault.wasted_stations.title': 'Paid for stations you did not need',
  'fault.wasted_stations.what': 'A geostationary satellite stays over one spot, so one station sees it all day. The other {extraStations} added cost and nothing else.',
  'fault.wasted_stations.why': 'More stations only help when the spacecraft moves across the sky.',
  'fault.wasted_stations.fix': 'Use a single station for a geostationary orbit.',

  'fault.irrelevant_instruments.title': 'An instrument with nothing to study',
  'fault.irrelevant_instruments.what': 'At least one instrument added mass, power and cost but returned no useful science for "{objective}".',
  'fault.irrelevant_instruments.why': 'Each instrument answers certain questions. Some only work on a surface, or need a part the spacecraft lacked.',
  'fault.irrelevant_instruments.fix': 'Scientist: fly instruments that match the objective and the destination.',

  'fault.schedule_overrun.title': 'Launched later than planned',
  'fault.schedule_overrun.what': 'The spacecraft was ready in month {readyMonth}. The plan said month {targetMonth}.',
  'fault.schedule_overrun.why': 'Complex parts take longer to build, and the slowest part sets the pace for the whole mission.',
  'fault.schedule_overrun.fix': 'Planner: set a realistic target, use Rush mode, or ask for simpler parts.',

  'fault.missed_mars_window.title': 'Missed the Mars launch window',
  'fault.missed_mars_window.what': 'The spacecraft waited {waitMonths} months for the next window. Keeping the team waiting cost ${waitCost}M.',
  'fault.missed_mars_window.why': 'Earth and Mars line up for an efficient trip only once every 26 months.',
  'fault.missed_mars_window.fix': 'Planner: time development to finish just before a window.',

  'fault.unused_allocation.title': 'Budget left sitting idle',
  'fault.unused_allocation.what': 'More than 30% of an allocation was never spent.',
  'fault.unused_allocation.why': 'Money parked in one team could have bought margin, science or coverage in another.',
  'fault.unused_allocation.fix': 'Planner: keep a reserve and hand money out as teams ask for it.',
}
