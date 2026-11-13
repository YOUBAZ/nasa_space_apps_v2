import type { OrbitId } from '../../engine/types'

export type Body = 'earth' | 'mars' | 'jupiter' | 'moon' | 'asteroid'

export interface BodyLook {
  /** NASA image map in public/textures (the asteroid is shaped and shaded in code) */
  texture?: string
  /** shown while the image loads, and for the asteroid */
  color: string
  /** thin glowing shell around the limb */
  atmosphere?: string
  /** axial tilt in radians */
  tilt: number
  /** polar flattening (Jupiter bulges at its equator) */
  squash: number
  /** how rough the surface shading is */
  bump: number
}

export const BODIES: Record<Body, BodyLook> = {
  earth: { texture: 'earth.jpg', color: '#1c4f9c', atmosphere: '#5aa7ff', tilt: 0.41, squash: 1, bump: 0.015 },
  mars: { texture: 'mars.jpg', color: '#b5562d', atmosphere: '#ff9d6b', tilt: 0.44, squash: 1, bump: 0.03 },
  jupiter: { texture: 'jupiter.jpg', color: '#c9a37a', tilt: 0.05, squash: 0.935, bump: 0 },
  moon: { texture: 'moon.jpg', color: '#8d8d92', tilt: 0.03, squash: 1, bump: 0.04 },
  asteroid: { color: '#6f6a64', tilt: 0.3, squash: 1, bump: 0.06 },
}

export const SKY_TEXTURE = 'stars.jpg'

export interface OrbitLook {
  body: Body
  /** planet radius in scene units */
  radius: number
  /** orbit ring: radius, tilt from the equator (radians), stretch for elliptical orbits, angular speed */
  ring?: { r: number; tilt: number; stretch?: number; speed: number }
  /** L2: the spacecraft circles an empty point far from Earth */
  far?: boolean
  /** a lander on the surface instead of an orbit */
  surface?: boolean
  /** camera distance */
  distance: number
}

export const ORBIT_VIEW: Record<OrbitId, OrbitLook> = {
  leo: { body: 'earth', radius: 1, ring: { r: 1.14, tilt: 0.5, speed: 1.5 }, distance: 4.2 },
  sso: { body: 'earth', radius: 1, ring: { r: 1.22, tilt: 1.42, speed: 1.25 }, distance: 4.4 },
  meo: { body: 'earth', radius: 0.8, ring: { r: 1.75, tilt: 0.95, speed: 0.6 }, distance: 5.6 },
  geo: { body: 'earth', radius: 0.62, ring: { r: 2.15, tilt: 0, speed: 0.12 }, distance: 6.4 },
  heo: { body: 'earth', radius: 0.7, ring: { r: 1.45, tilt: 1.1, stretch: 1.75, speed: 0.5 }, distance: 6.6 },
  l2: { body: 'earth', radius: 0.42, ring: { r: 0.42, tilt: 1.2, speed: 0.8 }, far: true, distance: 5.6 },
  lunar: { body: 'moon', radius: 0.95, ring: { r: 1.28, tilt: 0.6, speed: 1 }, distance: 4.6 },
  asteroid: { body: 'asteroid', radius: 0.7, ring: { r: 1.15, tilt: 0.3, speed: 0.7 }, distance: 4.2 },
  mars_orbit: { body: 'mars', radius: 1, ring: { r: 1.3, tilt: 0.8, speed: 1 }, distance: 4.6 },
  mars_surf: { body: 'mars', radius: 1.25, surface: true, distance: 4.4 },
  jupiter: { body: 'jupiter', radius: 1.25, ring: { r: 1.85, tilt: 0.2, speed: 0.6 }, distance: 6 },
}

export const textureUrl = (file: string): string => `${import.meta.env.BASE_URL}textures/${file}`
