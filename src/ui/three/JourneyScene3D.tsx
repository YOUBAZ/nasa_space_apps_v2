import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, Vector3, type Group, type Mesh } from 'three'
import { STATIONS } from '../../engine/catalog'
import type { FlightStage, Story } from '../../engine/flight'
import type { Design, OrbitId, StationId } from '../../engine/types'
import { ORBIT_VIEW } from './bodies'
import { Beacon, onSurface, Planet, Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

export interface JourneyProps {
  orbit: OrbitId
  design: Partial<Design>
  stations: StationId[]
  story: Story
  /** the stage in which the story ends */
  storyStage: FlightStage
  /** share of that stage at which a failing story strikes */
  failAt: number
  /** which part of the journey is on screen */
  shot: 'cruise' | 'arrival'
  /** wall-clock time (ms) at which this shot started */
  startAt: number
  /** seconds this shot plays for */
  duration: number
}

const OK = '#7dffb0'
const WARN = '#ffb347'
const BAD = '#ff4d4d'
const smooth = (x: number) => x * x * (3 - 2 * x)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

// wide shot of a trip beyond Earth: home on the left, the destination on the right, the Sun far behind home
const HOME = new Vector3(-3.4, -0.4, 0)
const AWAY = new Vector3(3.4, 0.4, 0)
const BEND = new Vector3(0, 2.0, -1.2)
const bezier = (k: number, out: Vector3) => out.set(
  (1 - k) * (1 - k) * HOME.x + 2 * (1 - k) * k * BEND.x + k * k * AWAY.x,
  (1 - k) * (1 - k) * HOME.y + 2 * (1 - k) * k * BEND.y + k * k * AWAY.y,
  (1 - k) * (1 - k) * HOME.z + 2 * (1 - k) * k * BEND.z + k * k * AWAY.z,
)
const SURFACE: [number, number] = [18, 77] // landing site latitude and longitude

function Scene({ orbit, design, stations, story, storyStage, failAt, shot, startAt, duration }: JourneyProps) {
  const v = ORBIT_VIEW[orbit]
  const near = v.body === 'earth' && !v.far
  const wide = !near && shot === 'cruise'
  const ring = v.ring
  const failing = storyStage === shot && story !== 'success' && story !== 'partial'

  const craft = useRef<Group>(null)
  const halo = useRef<Mesh>(null)
  const beam = useRef<Mesh>(null)
  const alert = useRef<Group>(null)
  const fire = useRef<Mesh>(null)
  const scan = useRef<Mesh>(null)
  const shade = useRef<Mesh>(null)
  const burn = useRef<Mesh>(null)
  const belts = useRef<Group>(null)
  const lander = useRef<Group>(null)
  const tmp = useMemo(() => ({ a: new Vector3(), b: new Vector3(), c: new Vector3() }), [])

  const path = useMemo(() => Array.from({ length: 48 }, (_, i) => bezier(i / 47, new Vector3()).clone()), [])
  const spiral = useMemo(() => {
    if (!ring) return []
    return Array.from({ length: 120 }, (_, i) => {
      const k = i / 119
      const th = 0.4 + k * Math.PI * 3
      const r = lerp(v.radius * 1.03, ring.r, smooth(k))
      return new Vector3(Math.cos(th) * r * (ring.stretch ?? 1), 0, Math.sin(th) * r)
    })
  }, [ring, v.radius])
  const site = useMemo(() => new Vector3(...onSurface(SURFACE[0], SURFACE[1], v.radius)), [v.radius])

  useFrame(({ camera, clock }) => {
    const t = Math.max(0, (Date.now() - startAt) / 1000)
    const raw = t / duration
    const p = Math.min(failing ? failAt : 1, raw)
    const lost = failing && raw >= failAt
    const f = lost ? t - failAt * duration : 0 // seconds since the failure
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6)
    const c = craft.current
    if (!c) return

    let color = story === 'partial' ? WARN : OK
    let haloOn = 1
    let beamOn = 0
    let beamColor = OK
    const pos = tmp.a
    c.rotation.set(0.3, clock.elapsedTime * 0.25, 0.2)

    if (wide) {
      // ---- the long cruise between worlds
      camera.position.set(0, 1.4, 9.6)
      camera.lookAt(0, 0.4, 0)
      bezier(smooth(p), pos)
      beamOn = 0.5 + 0.3 * pulse
      if (story === 'no_link' && shot === 'cruise') {
        beamOn *= Math.max(0, 1 - p / failAt) // the signal thins out with distance
        beamColor = p / failAt > 0.6 ? WARN : OK
        if (lost) { beamOn = Math.max(0, 0.5 - f * 0.4) * pulse; beamColor = BAD; color = BAD; haloOn = Math.max(0.15, 1 - f * 0.4) }
      }
      if (story === 'power_deficit' && shot === 'cruise') {
        haloOn = Math.max(0, 1 - p / failAt) // lights dim as the Sun shrinks behind it
        color = p / failAt > 0.6 ? WARN : OK
        if (lost) { haloOn = 0; beamOn = 0; pos.x += f * 0.12; pos.y -= f * 0.1; c.rotation.set(f * 0.5, f * 0.35, f * 0.2) }
      }
      if (story === 'tumbling' && lost) {
        c.rotation.set(f * 7, f * 5.3, f * 3.1) // spinning, with nothing to steady it
        pos.x += f * 0.1; pos.y += Math.sin(f * 2) * 0.08
        beamOn = Math.sin(f * 20) > 0.6 ? 0.5 : 0 // the antenna sweeps past Earth now and then
        beamColor = BAD; color = BAD; haloOn = 0.5 + 0.5 * Math.sin(f * 20)
      }
      if (story === 'no_station_in_view' && shot === 'cruise') {
        beamColor = lost ? BAD : WARN // it is calling, and nobody is there to hear
        if (lost) { color = BAD; beamOn = 0.6 * pulse }
      }
      c.position.copy(pos)
      c.scale.setScalar(0.2)
      if (beam.current) {
        const to = tmp.b.copy(HOME)
        const mid = tmp.c.copy(pos).add(to).multiplyScalar(0.5)
        beam.current.position.copy(mid)
        beam.current.lookAt(to)
        beam.current.rotateX(Math.PI / 2)
        beam.current.scale.set(1, pos.distanceTo(to), 1)
        const m = beam.current.material as unknown as { opacity: number; color: { set(c: string): void } }
        m.opacity = beamOn
        m.color.set(beamColor)
      }
      if (alert.current) alert.current.visible = story === 'no_station_in_view' && lost
    } else {
      // ---- close to a world: spiralling up to an Earth orbit, or arriving somewhere else
      const d = v.distance
      camera.position.set(d * 0.25, d * 0.32, d)
      camera.lookAt(v.far ? 0.3 : 0, 0, 0)
      const k = ring?.stretch ?? 1
      c.scale.setScalar(0.09)

      if (v.surface) {
        // straight down to the landing site
        const a = Math.min(1, raw / 0.4)
        const lift = 1 + 2.6 * (1 - smooth(a))
        pos.copy(site).multiplyScalar(lift)
        if (story === 'no_landing_kit' && shot === 'arrival') {
          const glow = Math.max(0, (a - 0.6) / 0.4)
          if (fire.current) {
            fire.current.visible = glow > 0 && f < 1.2
            fire.current.position.copy(pos)
            fire.current.scale.setScalar(0.05 + glow * 0.22 + (lost ? f * 0.5 : 0))
            ;(fire.current.material as { opacity: number }).opacity = lost ? Math.max(0, 0.9 - f * 0.8) : 0.5 + glow * 0.4
          }
          color = glow > 0.3 ? BAD : WARN
          if (lost) { c.visible = false; haloOn = 0 } else c.visible = true
        } else if (story === 'battery_short' && shot === 'arrival') {
          // landed safely; then the Sun goes down
          const night = lost ? Math.min(1, f / 2.5) : 0
          if (shade.current) (shade.current.material as { opacity: number }).opacity = night * 0.72
          color = night > 0.6 ? '#6fa8ff' : night > 0 ? WARN : OK
          haloOn = lost ? Math.max(0, 1 - Math.max(0, f - 2.5) / 1.5) : 1
        }
        if (lander.current) lander.current.visible = a >= 1 && story !== 'no_landing_kit'
      } else if (ring) {
        const local = tmp.b
        if (shot === 'cruise') {
          const th = 0.4 + smooth(p) * Math.PI * 3
          const r = lerp(v.radius * 1.03, ring.r, smooth(p))
          local.set(Math.cos(th) * r * k, 0, Math.sin(th) * r)
        } else if (near) {
          const th = 0.4 + Math.PI * 3 + t * ring.speed
          local.set(Math.cos(th) * ring.r * k, 0, Math.sin(th) * ring.r)
        } else {
          // come in from deep space, brake, and settle into the ring
          const a = Math.min(1, raw / 0.5)
          const flyby = story === 'no_capture_propulsion'
          if (a < 1 || flyby) {
            const along = flyby ? raw / 0.5 : a // without an engine it simply keeps going
            local.set(lerp(ring.r + 3.6, ring.r, Math.min(1, along)) - Math.max(0, along - 1) * 0.35, lerp(0.9, 0, Math.min(1, along)),
              lerp(-2.4, 0, Math.min(1, along)) + Math.max(0, along - 1) * 1.5)
            if (flyby && along > 1) { color = BAD; haloOn = Math.max(0.2, 1 - (along - 1)) }
          } else {
            const th = (t - duration * 0.5) * ring.speed
            local.set(Math.cos(th) * ring.r * k, 0, Math.sin(th) * ring.r)
          }
          if (burn.current) {
            const firing = !flyby && a > 0.82 && a < 1.0001 && raw < 0.62
            burn.current.visible = firing
            if (firing) burn.current.position.copy(local)
          }
        }
        // ring-plane coordinates → world (the ring is tilted like the real orbit)
        pos.copy(local).applyAxisAngle(tmp.c.set(1, 0, 0), ring.tilt).applyAxisAngle(tmp.c.set(0, 0, 1), 0.12)
        if (v.far) pos.x += 1.6

        if (story === 'radiation_fried' && shot === 'arrival' && lost) {
          const sparks = f < 1.6
          color = sparks ? '#ff5cf0' : BAD
          haloOn = sparks ? (Math.sin(f * 50) > 0 ? 1.6 : 0.2) : 0
        }
        if (story === 'wrong_destination' && shot === 'arrival') {
          color = lost ? BAD : WARN
          if (scan.current) {
            scan.current.visible = raw > 0.55
            scan.current.position.copy(pos).multiplyScalar(0.5)
            scan.current.lookAt(0, 0, 0)
            scan.current.rotateX(-Math.PI / 2)
            scan.current.scale.set(1, pos.length(), 1)
            const m = scan.current.material as unknown as { opacity: number; color: { set(c: string): void } }
            m.color.set(lost ? BAD : '#ffe27a')
            m.opacity = lost ? Math.max(0, 0.35 - f * 0.12) : 0.2 + 0.15 * pulse
          }
        }
        if (near && shot === 'cruise' && story === 'no_station_in_view' && lost) { color = BAD }
        if (near && story === 'tumbling' && lost) c.rotation.set(f * 7, f * 5.3, f * 3.1)
      }
      c.position.copy(pos)
      if (belts.current) belts.current.children.forEach((b, i) => { ((b as Mesh).material as { opacity: number }).opacity = 0.16 + 0.1 * Math.sin(clock.elapsedTime * 2 + i) })
    }

    if (halo.current) {
      halo.current.position.copy(c.position)
      halo.current.visible = c.visible !== false
      const m = halo.current.material as unknown as { opacity: number; color: { set(c: string): void } }
      m.color.set(color)
      m.opacity = Math.max(0, Math.min(1, haloOn)) * (0.35 + 0.2 * pulse)
    }
  })

  return (
    <>
      {wide ? (
        <>
          {/* the Sun, far behind home: the reason light and power fade on the way out */}
          <group position={[-10, 3.5, -7]}>
            <mesh><sphereGeometry args={[0.7, 24, 18]} /><meshBasicMaterial color="#fff2c0" toneMapped={false} /></mesh>
            <mesh scale={2.4}><sphereGeometry args={[0.7, 24, 18]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} /></mesh>
          </group>
          <group position={HOME}>
            <Planet body="earth" radius={0.5} spin={0.3} />
            <group ref={alert} visible={false}><Beacon position={[0, 0.62, 0]} color={BAD} size={0.07} /></group>
          </group>
          <group position={AWAY}>
            {v.far
              ? <mesh rotation={[0.6, 0.4, 0]}><octahedronGeometry args={[0.16, 0]} /><meshBasicMaterial color="#ff8a3d" wireframe toneMapped={false} /></mesh>
              : <Planet body={v.body} radius={v.body === 'jupiter' ? 0.85 : 0.6} spin={0.2} />}
          </group>
          <Line points={path} color="#dfe9ff" lineWidth={1} dashed dashSize={0.12} gapSize={0.1} transparent opacity={0.55} />
          <mesh ref={beam}>
            <cylinderGeometry args={[0.012, 0.012, 1, 8, 1, true]} />
            <meshBasicMaterial color={OK} transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={DoubleSide} />
          </mesh>
        </>
      ) : (
        <>
          <group position={v.far ? [-1.5, 0, 0] : [0, 0, 0]}>
            <Planet body={v.body} radius={v.radius} spin={v.surface ? 0 : 0.06}>
              {v.body === 'earth' && stations.map((id) => {
                const st = STATIONS[id]
                return <Beacon key={id} position={onSurface(90 - (st.y / 100) * 180, (st.x / 100) * 360 - 180, v.radius * 1.008)} color={st.network === 'dsn' ? '#ff8a3d' : '#47da84'} size={v.radius * 0.02} />
              })}
            </Planet>
            {v.surface && <group ref={lander} visible={false}><Beacon position={[site.x * 1.01, site.y * 1.01, site.z * 1.01]} color="#ffd27a" size={0.03} /></group>}
            {/* night falling over the landing site */}
            <mesh ref={shade} scale={1.02}><sphereGeometry args={[v.radius, 48, 32]} /><meshBasicMaterial color="#020308" transparent opacity={0} depthWrite={false} /></mesh>
            {v.body === 'jupiter' && shot === 'arrival' && (
              <group ref={belts} rotation={[Math.PI / 2, 0, 0]}>
                {[1.35, 1.6, 1.9].map((r) => (
                  <mesh key={r}><torusGeometry args={[v.radius * r, v.radius * 0.13, 12, 96]} /><meshBasicMaterial color="#d04cff" transparent opacity={0.2} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
                ))}
              </group>
            )}
          </group>
          {ring && (
            <group position={v.far ? [1.6, 0, 0] : [0, 0, 0]} rotation={[ring.tilt, 0, 0.12]}>
              <group rotation={[Math.PI / 2, 0, 0]} scale={[ring.stretch ?? 1, 1, 1]}>
                <mesh><torusGeometry args={[ring.r, 0.0045, 8, 256]} /><meshBasicMaterial color="#dfe9ff" toneMapped={false} transparent opacity={shot === 'cruise' ? 0.35 : 1} /></mesh>
                <mesh><torusGeometry args={[ring.r, 0.02, 8, 256]} /><meshBasicMaterial color="#5aa7ff" transparent opacity={0.2} depthWrite={false} blending={AdditiveBlending} /></mesh>
              </group>
              {shot === 'cruise' && <Line points={spiral} color="#ffd27a" lineWidth={1.2} transparent opacity={0.7} />}
              {v.far && <mesh><sphereGeometry args={[0.02, 12, 10]} /><meshBasicMaterial color="#ff8a3d" toneMapped={false} /></mesh>}
              <mesh ref={burn} visible={false}><sphereGeometry args={[0.09, 16, 12]} /><meshBasicMaterial color="#ffd9a0" transparent opacity={0.9} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
            </group>
          )}
          <mesh ref={fire} visible={false}><sphereGeometry args={[1, 20, 14]} /><meshBasicMaterial color="#ff7a2a" transparent opacity={0.7} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
          <mesh ref={scan} visible={false}>
            <coneGeometry args={[0.16, 1, 24, 1, true]} />
            <meshBasicMaterial color="#ffe27a" transparent opacity={0.25} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}

      <group ref={craft}><SpacecraftModel design={design.structure ? design : { structure: 'small', power: 'deploy_solar', antenna: 'hga' }} /></group>
      <mesh ref={halo}><sphereGeometry args={[wide ? 0.16 : 0.05, 16, 12]} /><meshBasicMaterial color={OK} transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
    </>
  )
}

/** The journey after the rocket leaves the atmosphere: the cruise, then the arrival, in the story this mission earned. */
export default function JourneyScene3D(props: JourneyProps) {
  return (
    <Stage camera={[0, 1.4, 9.6]} fov={36}>
      <Scene key={`${props.orbit}-${props.shot}`} {...props} />
    </Stage>
  )
}
