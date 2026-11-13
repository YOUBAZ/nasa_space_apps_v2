import { COMPONENTS, INSTRUMENTS, OBJECTIVES, ORBITS, STATIONS, VEHICLES } from '../../engine/catalog'

/** English names come straight from the catalog data; other languages translate these keys. */
export function catalogNames(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const def of Object.values(COMPONENTS)) {
    out[`slot.${def.slot}`] = def.name
    for (const o of Object.values(def.options)) out[`opt.${def.slot}.${o.id}`] = o.name
  }
  for (const i of Object.values(INSTRUMENTS)) out[`inst.${i.id}`] = i.name
  for (const v of Object.values(VEHICLES)) out[`veh.${v.id}`] = v.name
  for (const o of Object.values(ORBITS)) out[`orb.${o.id}`] = o.name
  for (const s of Object.values(STATIONS)) out[`stn.${s.id}`] = s.name
  for (const o of Object.values(OBJECTIVES)) out[`obj.${o.id}`] = o.name
  return out
}

/** Handbook entries that follow a pattern are generated so the numbers can never drift from the data. */
export function generatedHandbook(): Record<string, string> {
  const out: Record<string, string> = {}
  const kg = (n: number | null) => (n === null ? 'cannot reach' : `${n.toLocaleString('en-US')} kg`)
  for (const v of Object.values(VEHICLES)) {
    out[`hb.veh.${v.id}.what`] = `${v.name} costs $${v.cost}M. It lifts ${kg(v.cap.LEO)} to low Earth orbit, ${kg(v.cap.SSO)} to sun-synchronous orbit, ${kg(v.cap.GTO)} to high Earth orbits and ${kg(v.cap.ESC)} beyond Earth.`
    out[`hb.veh.${v.id}.why`] = 'The same rocket carries less the farther it has to throw the payload. Pick the cheapest rocket that still has spare capacity for your destination.'
  }
  for (const s of Object.values(STATIONS)) {
    out[`hb.stn.${s.id}.what`] = s.network === 'dsn'
      ? `${s.name} is one of three Deep Space Network sites, with giant dishes for far-away spacecraft. $${s.cost}M per mission.`
      : `${s.name} is a ground station for Earth-orbiting satellites. $${s.cost}M per mission.`
    out[`hb.stn.${s.id}.why`] = s.network === 'dsn'
      ? 'Beyond Earth orbit only the Deep Space Network can hear a spacecraft. The three sites are spread around the globe so one always faces it.'
      : s.id === 'svalbard' || s.id === 'kiruna' || s.id === 'fairbanks'
        ? 'Stations near the poles see a polar-orbiting satellite on almost every lap, so they give the most contact time for sun-synchronous orbits.'
        : s.rainy
          ? 'Stations near the equator see low-inclination orbits well, but tropical rain weakens Ka-band signals.'
          : 'A mid-latitude station sees a satellite a few times a day. More stations mean more contact time and more cost.'
  }
  return out
}
