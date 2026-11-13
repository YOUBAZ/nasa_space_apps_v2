// Mission Handbook: "what is it" and "why it matters" in one plain sentence each.
const w = (id: string, what: string, why: string): Record<string, string> =>
  ({ [`hb.${id}.what`]: what, [`hb.${id}.why`]: why })

export const handbook: Record<string, string> = {
  // ---- concepts
  ...w('concept.tradeoff', 'A trade-off is giving up some of one thing to get more of another.', 'Every mission trades mass, power, money, data and time against each other. There is rarely one perfect design.'),
  ...w('concept.mass', 'Mass is how heavy the spacecraft is, in kilograms.', 'Every kilogram must be lifted by the rocket, and rockets carry less to far destinations.'),
  ...w('concept.power', 'Power is the electricity the spacecraft makes and uses, in watts.', 'If the parts use more than the power source makes, the spacecraft shuts down.'),
  ...w('concept.data', 'Data is what the instruments record, in gigabits per day.', 'Data is only worth something once it reaches Earth, so the radio link must keep up with the instruments.'),
  ...w('concept.coverage', 'Coverage is the share of the day a ground station can talk to the spacecraft.', 'More stations give more coverage and cost more. Efficiency means enough coverage for the least money.'),
  ...w('concept.payload', "Payload capacity is the most mass a rocket can deliver to a destination.", 'A spacecraft heavier than the capacity never arrives.'),
  ...w('concept.lifetime', 'Lifetime is how long the spacecraft keeps working.', 'Each objective needs a minimum time at the destination to collect its science.'),
  ...w('concept.budget', 'The budget is the money the Planner gives each team for this mission.', 'Money spent on a failed launch is gone, so the campaign shrinks with every failure.'),
  ...w('concept.schedule', 'The schedule is how many months it takes to build the spacecraft.', 'The slowest part sets the pace. Mars missions can only leave every 26 months.'),
  ...w('concept.margin', 'Margin is spare capacity kept in reserve.', 'A little spare mass and power absorbs surprises. Too much means you paid for capacity you never used.'),

  // ---- slots
  ...w('slot.structure', 'The structure, or bus, is the frame everything is bolted to.', 'A bigger bus carries more equipment but is heavier and dearer.'),
  ...w('slot.power', 'The power source makes electricity for the whole spacecraft.', 'Solar panels are light and cheap near the Sun. Far away they produce very little.'),
  ...w('slot.battery', 'Batteries store energy for when the panels are in shadow.', 'Low orbits pass through Earth\'s shadow every lap, and a Mars night lasts 12 hours.'),
  ...w('slot.computer', 'The onboard computer runs the spacecraft and handles instrument data.', 'It must process data as fast as the instruments make it, and survive radiation.'),
  ...w('slot.attitude', 'Attitude control points the spacecraft where it needs to look.', 'Sharp cameras, telescopes and big dishes all need very steady aim.'),
  ...w('slot.thermal', 'Thermal control keeps parts from freezing or overheating.', 'Space swings between extreme hot and cold, and electronics only work in a narrow range.'),
  ...w('slot.propulsion', 'Propulsion is the spacecraft\'s own engine.', 'It is needed to enter orbit around another world and to resist air drag in low orbit.'),
  ...w('slot.storage', 'The data recorder stores science until a ground station is in view.', 'With little contact time, the recorder must hold many hours of data.'),
  ...w('slot.protection', 'Protection covers special shielding for harsh places.', 'Some destinations destroy an unprotected spacecraft: Jupiter\'s radiation, Mars\'s atmosphere, the Sun\'s heat.'),
  ...w('slot.antenna', 'The antenna sends data to Earth and receives commands.', 'A bigger dish focuses the signal, which is essential over long distances, but it must be aimed precisely.'),
  ...w('slot.band', 'The frequency band is the radio "channel" the spacecraft uses.', 'Higher bands carry more data per second but need better antennas and clear weather.'),

  // ---- structure
  ...w('opt.structure.small', 'A small bus, about the size of a washing machine. Carries up to 500 kg.', 'Light and cheap, ideal for a few small instruments.'),
  ...w('opt.structure.medium', 'A medium bus, about the size of a car. Carries up to 2,000 kg.', 'The workhorse size for most science missions.'),
  ...w('opt.structure.large', 'A large bus, about the size of a bus. Carries up to 6,000 kg.', 'Needed for giant instruments such as a space telescope, but it weighs a tonne before you add anything.'),
  // ---- power
  ...w('opt.power.body_solar', 'Solar cells glued to the body. Makes 400 W in full sunlight.', 'The lightest, cheapest power for small satellites near Earth.'),
  ...w('opt.power.deploy_solar', 'Fold-out solar wings. Makes 2,500 W in full sunlight.', 'Enough for most missions near Earth and for modest loads at Mars.'),
  ...w('opt.power.large_solar', 'Huge fold-out arrays. Makes 8,000 W in full sunlight.', 'Lets solar power work far from the Sun or feed power-hungry radar, at a cost in mass.'),
  ...w('opt.power.rtg', 'A nuclear battery that turns the heat of decaying plutonium into 450 W.', 'It works anywhere, day or night, and its waste heat keeps a lander warm.'),
  // ---- battery
  ...w('opt.battery.small', 'A small battery holding 1,000 Wh.', 'Enough for a light spacecraft crossing a short shadow.'),
  ...w('opt.battery.medium', 'A medium battery holding 4,000 Wh.', 'Covers most Earth orbits with room to spare.'),
  ...w('opt.battery.large', 'A large battery holding 15,000 Wh.', 'Needed to survive a 12-hour Mars night on solar power.'),
  // ---- computer
  ...w('opt.computer.basic', 'A simple flight computer. Handles 100 Gb a day.', 'Cheap and light, but radiation can upset it.'),
  ...w('opt.computer.radhard', 'A computer built to shrug off radiation. Handles 300 Gb a day.', 'Essential in radiation belts and at Jupiter.'),
  ...w('opt.computer.highperf', 'A fast modern processor. Handles 1,500 Gb a day.', 'Keeps up with data-heavy instruments like radar, but it is not radiation-proof.'),
  // ---- attitude
  ...w('opt.attitude.magnetorquer', 'Electromagnets that push against Earth\'s magnetic field.', 'Tiny and cheap but coarse, and useless away from Earth.'),
  ...w('opt.attitude.wheels', 'Spinning wheels that turn the spacecraft by reaction.', 'Steady enough for cameras and a medium dish, anywhere in space.'),
  ...w('opt.attitude.wheels_star', 'Reaction wheels guided by cameras that track the stars.', 'The steadiest aim, needed for telescopes and deep-space dishes.'),
  // ---- thermal
  ...w('opt.thermal.passive', 'Paint and insulating blankets, with no moving parts.', 'Fine near Earth, where sunlight keeps things warm enough.'),
  ...w('opt.thermal.heaters', 'Electric heaters plus radiator panels.', 'Keeps electronics alive in the cold of deep space.'),
  ...w('opt.thermal.active', 'Pumped fluid that carries heat around the spacecraft.', 'Handles the extreme swings on the surface of Mars.'),
  // ---- propulsion
  ...w('opt.propulsion.none', 'No engine at all.', 'Saves mass and money when the rocket drops you exactly where you need to be.'),
  ...w('opt.propulsion.cold_gas', 'Small thrusters that puff compressed gas.', 'Enough to hold position at L2 and to resist air drag in low orbit.'),
  ...w('opt.propulsion.chemical', 'A rocket engine with fuel tanks. Heavy: 600 kg.', 'Strong enough to brake into orbit around the Moon, Mars, an asteroid or Jupiter.'),
  ...w('opt.propulsion.ion', 'An electric engine that fires charged gas very gently for months.', 'Uses far less fuel than a chemical engine but needs 1,500 W of power.'),
  // ---- storage
  ...w('opt.storage.small', 'A small recorder holding 100 Gb.', 'Enough for low-data instruments or frequent contacts.'),
  ...w('opt.storage.medium', 'A medium recorder holding 500 Gb.', 'A comfortable buffer for cameras with a few passes a day.'),
  ...w('opt.storage.large', 'A large recorder holding 4,000 Gb.', 'For radar and hyperspectral imagers that pour out data.'),
  // ---- protection
  ...w('opt.protection.none', 'No special protection.', 'Most Earth orbits do not need any.'),
  ...w('opt.protection.rad_shield', 'A metal vault around the electronics.', "Blocks the radiation that would otherwise destroy a spacecraft at Jupiter."),
  ...w('opt.protection.sunshield', 'A large reflective shade.', 'Keeps an infrared telescope cold enough to see faint heat from space.'),
  ...w('opt.protection.mars_edl', 'Heat shield, parachute and landing engines. Heavy: 900 kg.', 'The only way to reach the surface of Mars in one piece.'),
  // ---- antenna
  ...w('opt.antenna.omni', 'A small antenna that radiates in all directions.', 'Needs no aiming, but its weak signal only works near Earth.'),
  ...w('opt.antenna.medium', 'A flat antenna with a moderately focused beam.', 'Good for Earth orbits; reaches as far as the Moon and L2 at low rates.'),
  ...w('opt.antenna.hga', 'A one-metre dish with a tight beam.', 'Four times the data rate, and enough reach for Mars and asteroids.'),
  ...w('opt.antenna.dsa', 'A three-metre dish, like the ones on outer-planet probes.', 'The only antenna that reaches Jupiter, and the fastest link anywhere.'),
  // ---- band
  ...w('opt.band.uhf', 'UHF: a low frequency, like walkie-talkies.', 'Simple and cheap, but slow and only for low Earth orbit.'),
  ...w('opt.band.s', 'S-band: the classic spacecraft channel.', 'Reliable in any weather and at any distance, but slow.'),
  ...w('opt.band.x', 'X-band: the standard for science missions.', 'Five times faster than S-band and works out to the outer planets.'),
  ...w('opt.band.ka', 'Ka-band: a very high frequency.', 'Four times faster again, but it needs a high-gain dish and fades in rain.'),

  // ---- instruments
  ...w('inst.hires_cam', 'A sharp camera for detailed pictures.', 'Shows roads, buildings and landing hazards. Needs steady pointing.'),
  ...w('inst.multispectral', 'A camera that sees a handful of colours, including invisible ones.', 'Healthy plants, water and burned ground each reflect light differently.'),
  ...w('inst.hyperspectral', 'A camera that splits light into hundreds of colours.', 'Identifies minerals and crop types precisely, at the price of huge data volumes.'),
  ...w('inst.thermal_ir', 'A camera that sees heat.', 'Finds fires through smoke and measures ice and sea temperatures.'),
  ...w('inst.sar', 'Radar that builds images from its own radio pulses.', 'Sees through cloud and darkness, but it is heavy and uses a lot of power.'),
  ...w('inst.gpr', 'Radar that looks beneath the surface.', 'Finds buried ice on Mars and oceans under icy moons.'),
  ...w('inst.spectrometer', 'An instrument that reads the chemical fingerprint in light.', 'Tells what rocks, ice and atmospheres are made of.'),
  ...w('inst.magnetometer', 'A sensor that measures magnetic fields.', 'A salty ocean under an icy moon disturbs the magnetic field around it.'),
  ...w('inst.radiation', 'A counter for energetic particles.', 'Measures how dangerous a place would be for astronauts.'),
  ...w('inst.weather', 'Sensors for temperature, wind, pressure and dust. Works on a surface only.', 'Future crews need to know the weather where they will land.'),
  ...w('inst.ir_telescope', 'A large telescope that collects faint infrared light.', 'Sees the oldest galaxies and newborn stars, but it must be kept extremely cold.'),
  ...w('inst.drill', 'A drill with a small onboard laboratory. Works on a surface only.', 'Tests whether water and fuel can be made from local soil.'),

  // ---- orbits
  ...w('orb.leo', 'Low Earth orbit, about 400 km up. One lap takes 90 minutes.', 'Closest to the ground for sharp pictures, but air drag pulls satellites down within a couple of years.'),
  ...w('orb.sso', 'A near-polar orbit at 700 km that crosses each place at the same local time every day.', 'Consistent lighting makes changes easy to spot, and polar stations see every lap.'),
  ...w('orb.meo', 'Medium Earth orbit, about 20,000 km up.', 'Sees a wide region for hours, with less detail, and passes through radiation belts.'),
  ...w('orb.geo', 'Geostationary orbit, 35,786 km above the equator, turning in step with Earth.', 'The satellite hangs over one spot, so one station sees it all day, but detail is poor and the poles are out of view.'),
  ...w('orb.heo', 'A stretched orbit that lingers high over the far north.', 'Gives long views of polar regions that geostationary satellites cannot see.'),
  ...w('orb.l2', 'A balance point 1.5 million km from Earth, away from the Sun.', 'Cold, dark and steady: the best place for a space telescope.'),
  ...w('orb.lunar', 'An orbit around the Moon, 384,000 km away.', 'A nearby place to practise deep-space operations.'),
  ...w('orb.asteroid', 'Matching orbits with an asteroid far from Earth.', 'Asteroids are leftovers from the birth of the planets.'),
  ...w('orb.mars_orbit', 'An orbit around Mars.', 'Maps the whole planet and relays signals from landers. Sunlight is less than half as strong as at Earth.'),
  ...w('orb.mars_surf', 'Landing on the surface of Mars.', 'The only way to touch the soil, but nights are long and cold, and dust coats solar panels.'),
  ...w('orb.jupiter', "Touring Jupiter and its icy moons, five times farther from the Sun than Earth.", 'Sunlight is 4% of Earth\'s and the radiation is fierce.'),

  // ---- objectives
  ...w('obj.wildfire', 'Spot wildfires and disasters early from orbit.', 'Minutes matter for evacuations. Heat-sensing instruments in a regular, frequent orbit work best.'),
  ...w('obj.polar_ice', 'Track how fast polar ice is changing.', 'Ice loss drives sea-level rise. Radar sees ice through the long polar night.'),
  ...w('obj.crops', 'Monitor crops and fresh water worldwide.', 'Colour fingerprints reveal drought and crop stress before the eye can.'),
  ...w('obj.telescope', 'Build an infrared observatory in deep space.', 'Infrared light shows the first galaxies and planets forming around other stars.'),
  ...w('obj.asteroid', 'Visit an asteroid and work out what it is made of.', 'Asteroids record the early Solar System and could be mined one day.'),
  ...w('obj.jupiter', "Look for oceans under the ice of Jupiter's moons.", 'Those hidden oceans are among the best places to search for life.'),
  ...w('obj.mars_ice', 'Map buried water ice on Mars from orbit.', 'Future settlers will need local water for drinking, air and rocket fuel.'),
  ...w('obj.mars_scout', 'Land a scout to study a future settlement site.', 'Crews need to know the weather, radiation and terrain before they arrive.'),
  ...w('obj.mars_isru', 'Land a drill and test making resources from Martian soil.', 'Living off the land is what makes a colony possible.'),
}
