import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, LatheGeometry, Vector2, type Group, type Mesh, type PointLight } from 'three'
import type { VehicleId } from '../../engine/types'
import { noiseTexture, Stage } from './common'

type Size = { h: number; r: number; boosters: number; core: string; engines: number; fins: boolean }
const SIZE: Record<VehicleId, Size> = {
  electron: { h: 1.25, r: 0.085, boosters: 0, core: '#1b1d22', engines: 9, fins: false },
  pslv: { h: 1.85, r: 0.12, boosters: 4, core: '#f3f4f6', engines: 1, fins: false },
  vega_c: { h: 1.75, r: 0.13, boosters: 0, core: '#f3f4f6', engines: 1, fins: false },
  h3: { h: 2.05, r: 0.15, boosters: 2, core: '#f3f4f6', engines: 3, fins: false },
  falcon9: { h: 2.55, r: 0.14, boosters: 0, core: '#f3f4f6', engines: 9, fins: true },
  ariane64: { h: 2.45, r: 0.17, boosters: 4, core: '#f3f4f6', engines: 1, fins: false },
  atlas_v: { h: 2.35, r: 0.15, boosters: 4, core: '#c98a54', engines: 2, fins: false },
  vulcan: { h: 2.45, r: 0.17, boosters: 4, core: '#f3f4f6', engines: 2, fins: false },
  new_glenn: { h: 3.05, r: 0.22, boosters: 0, core: '#f3f4f6', engines: 7, fins: true },
  falcon_hvy: { h: 2.65, r: 0.14, boosters: 2, core: '#f3f4f6', engines: 9, fins: true },
  sls: { h: 3.15, r: 0.21, boosters: 2, core: '#d4722c', engines: 4, fins: false },
}

/** How the climb to space ends. Each failure looks different. */
export type AscentStory = 'ok' | 'over_capacity' | 'structure_overloaded' | 'vehicle_cannot_reach'

const STAGING = 0.45 // share of the ascent at which the first stage drops away
const FAIRING = 0.7 // …and at which the nose fairing opens
const TOP = 30 // scene height reached at the edge of space
const WHITE = '#f3f4f6'

const Skin = ({ color }: { color: string }) =>
  <meshStandardMaterial color={color} metalness={color === WHITE ? 0.25 : 0.1} roughness={color === WHITE ? 0.38 : 0.8} envMapIntensity={1.1} />

function Bell({ r }: { r: number }) {
  const geometry = useMemo(() => new LatheGeometry(
    Array.from({ length: 12 }, (_, i) => new Vector2(r * (0.35 + 0.65 * Math.pow(i / 11, 0.6)), -(i / 11) * r * 2.2)), 28), [r])
  return <mesh geometry={geometry}><meshStandardMaterial color="#2d3037" metalness={0.95} roughness={0.3} side={DoubleSide} /></mesh>
}

/** Rocket exhaust: a white-hot core inside orange flame inside a faint outer glow, all flickering. */
function Plume({ r, length = 1 }: { r: number; length?: number }) {
  const ref = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const f = 0.88 + Math.sin(clock.elapsedTime * 47) * 0.08 + Math.sin(clock.elapsedTime * 23) * 0.06
    ref.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = 6 * f
  })
  const layer = (rad: number, len: number, color: string, opacity: number) => (
    <mesh position={[0, -len / 2, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[rad, len, 24, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} toneMapped={false} />
    </mesh>
  )
  return (
    <group ref={ref}>
      {layer(r * 0.55, r * 5 * length, '#ffffff', 0.95)}
      {layer(r * 0.95, r * 9 * length, '#ffb347', 0.6)}
      {layer(r * 1.5, r * 14 * length, '#ff6a2a', 0.22)}
      <pointLight ref={light} position={[0, -r * 2, 0]} color="#ffb060" distance={6} decay={2} />
    </group>
  )
}

function EngineCluster({ r, count }: { r: number; count: number }) {
  const each = count === 1 ? r * 0.62 : count <= 4 ? r * 0.36 : r * 0.22
  const spots: [number, number][] = count === 1 ? [[0, 0]] : Array.from({ length: count }, (_, i) => {
    const centre = count >= 7 && i === 0
    const n = count >= 7 ? count - 1 : count
    const a = ((count >= 7 ? i - 1 : i) / n) * Math.PI * 2
    return centre ? [0, 0] : [Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6]
  })
  return <group>{spots.map(([x, z], i) => <group key={i} position={[x, 0, z]}><Bell r={each} /></group>)}</group>
}

function Tank({ r, from, to, color }: { r: number; from: number; to: number; color: string }) {
  const len = to - from
  return (
    <group position={[0, from, 0]}>
      <mesh position={[0, len / 2, 0]}><cylinderGeometry args={[r, r, len, 48]} /><Skin color={color} /></mesh>
      {[0.08, 0.92].map((k) => (
        <mesh key={k} position={[0, len * k, 0]}><cylinderGeometry args={[r * 1.012, r * 1.012, len * 0.03, 48]} /><meshStandardMaterial color="#1b1d22" metalness={0.6} roughness={0.4} /></mesh>
      ))}
      <mesh position={[0, len / 2, r * 1.005]}><boxGeometry args={[r * 0.14, len * 0.86, r * 0.06]} /><meshStandardMaterial color="#8d939c" metalness={0.7} roughness={0.4} /></mesh>
    </group>
  )
}

export interface LaunchSceneProps {
  vehicle: VehicleId
  /** wall-clock time (ms) of liftoff; null while the rocket waits on the pad */
  startAt: number | null
  /** seconds the climb to space takes on screen */
  duration: number
  story: AscentStory
  /** share of the climb at which a failing story strikes */
  failAt: number
}

function Scene({ vehicle, startAt, duration, story, failAt }: LaunchSceneProps) {
  const s = SIZE[vehicle]
  const rocket = useRef<Group>(null)
  const lower = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const upperPlume = useRef<Group>(null)
  const lowerPlume = useRef<Group>(null)
  const fairingL = useRef<Mesh>(null)
  const fairingR = useRef<Mesh>(null)
  const blast = useRef<Group>(null)
  const flash = useRef<PointLight>(null)
  const glow = useRef<Mesh>(null)
  const sky = useRef<Group>(null)
  const puffRefs = useRef<(Mesh | null)[]>([])
  const bitRefs = useRef<(Mesh | null)[]>([])

  const puffs = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    a: (i * 2.399) % (Math.PI * 2), speed: 0.3 + ((i * 37) % 10) / 16, delay: (((i * 13) % 30) / 30) * 2.4, lift: 0.08 + ((i * 7) % 10) / 30, size: 0.1 + ((i * 11) % 10) / 55,
  })), [])
  const bits = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    dir: [Math.cos(i * 2.4) * (0.6 + (i % 5) / 6), 0.3 + ((i * 3) % 10) / 9, Math.sin(i * 2.4) * (0.6 + (i % 4) / 5)] as [number, number, number],
    spin: 2 + (i % 7), size: 0.04 + (i % 4) * 0.018,
  })), [])
  const half = useMemo(() => new LatheGeometry(
    Array.from({ length: 16 }, (_, i) => new Vector2(s.r * 1.04 * Math.cos((i / 15) * Math.PI * 0.5), Math.sin((i / 15) * Math.PI * 0.5) * s.r * 3.1)), 24, 0, Math.PI), [s.r])
  const concrete = useMemo(() => noiseTexture('concrete', 256, 30, 5, 1.2), [])
  const ground = useMemo(() => {
    const g = noiseTexture('ground', 256, 12, 9, 0.7)
    g.repeat.set(10, 10)
    return g
  }, [])

  useFrame(({ camera }) => {
    const started = startAt !== null
    const t = started ? Math.max(0, (Date.now() - startAt) / 1000) : 0
    const tf = failAt * duration // when this story's failure strikes
    const f = t - tf // seconds since then
    const climb = (time: number) => TOP * Math.pow(Math.min(time, duration * 1.6) / duration, 2)

    let y = climb(t)
    let lean = -Math.min(0.14, Math.max(0, t / duration - 0.3) * 0.25) // a healthy gravity turn
    let x = 0
    let rocketVisible = true
    let engines = started
    let staged = t / duration > STAGING
    let fairingOpen = t / duration > FAIRING
    let blastAt: [number, number, number] | null = null
    let blastAge = 0
    let blastSize = 1
    let bitsFrom: [number, number, number] | null = null
    let burning = 0

    if (story === 'over_capacity') {
      // Too heavy: it claws its way a few metres up, wobbles, sinks back onto the pad and explodes there.
      staged = false; fairingOpen = false
      const up = Math.min(1, t / tf)
      y = 1.15 * Math.sin(up * Math.PI * 0.5)
      lean = Math.sin(t * 3.2) * 0.05 + up * 0.22
      x = -up * 0.25
      if (f > 0) {
        y = Math.max(0, 1.15 - 2.4 * f * f)
        lean += f * 0.9
        if (y <= 0.02) { rocketVisible = false; blastAt = [x, 0.5, 0]; blastAge = f - 0.7; blastSize = 1.6; bitsFrom = blastAt }
      }
    } else if (story === 'structure_overloaded') {
      // Frame buckled: at the moment of greatest air pressure the top folds in and the payload spills out.
      fairingOpen = false
      if (f > 0) {
        y = climb(tf) + (climb(tf) - climb(tf - 0.1)) * 10 * f - 3.5 * f * f
        lean -= f * 0.7
        x = f * 0.6
        engines = f < 0.7
        bitsFrom = [0, climb(tf) + s.h, 0]
        blastAt = bitsFrom; blastAge = f; blastSize = 0.45
      }
    } else if (story === 'vehicle_cannot_reach') {
      // Out of push: the engine flickers out, the rocket coasts, tips over and falls back, glowing as it meets the air.
      fairingOpen = false
      if (f > 0) {
        const v = (climb(tf) - climb(tf - 0.1)) * 10
        y = climb(tf) + v * f - 0.5 * (v / 1.4) * f * f
        lean = -0.14 - Math.min(Math.PI * 0.95, f * 1.1)
        x = f * 0.9
        engines = f < 0.5 && Math.sin(f * 60) > 0
        burning = Math.max(0, Math.min(1, (f - 1.6) / 1.2))
      }
    }

    if (rocket.current) {
      rocket.current.visible = rocketVisible
      rocket.current.position.set(x, y, 0)
      rocket.current.rotation.z = lean
    }
    if (lower.current) {
      const since = staged ? Math.max(0, t - STAGING * duration) : 0
      lower.current.position.y = -since * since * 1.5
      lower.current.rotation.z = since * 0.45
      lower.current.rotation.x = since * 0.2
    }
    if (upper.current) upper.current.visible = !(story === 'structure_overloaded' && f > 0)
    if (lowerPlume.current) lowerPlume.current.visible = engines && !staged
    if (upperPlume.current) upperPlume.current.visible = engines && staged && t > STAGING * duration + 0.35
    for (const [mesh, side] of [[fairingL.current, -1], [fairingR.current, 1]] as const) {
      if (!mesh) continue
      const since = fairingOpen ? t - FAIRING * duration : 0
      mesh.position.set(side * since * 0.55, s.h - since * since * 1.2, 0)
      mesh.rotation.z = -side * Math.min(1.4, since * 1.6)
      mesh.visible = since < 2.2
    }
    puffs.forEach((p, i) => {
      const mesh = puffRefs.current[i]
      if (!mesh) return
      const age = t - p.delay * 0.6
      if (!started || age <= 0) { mesh.visible = false; return }
      mesh.visible = true
      const spread = Math.min(1, age / 3.5)
      const d = 0.2 + spread * (0.9 + p.speed * 1.5)
      mesh.position.set(Math.cos(p.a) * d, 0.1 + age * p.lift * 0.45, Math.sin(p.a) * d)
      mesh.scale.setScalar(p.size * (1 + Math.min(age, 4) * 0.75))
      ;(mesh.material as { opacity: number }).opacity = Math.max(0, 0.42 - age * 0.06)
    })
    if (blast.current) {
      const on = blastAt !== null && blastAge >= 0
      blast.current.visible = on
      if (on && blastAt) {
        blast.current.position.set(...blastAt)
        const core = blast.current.children[0] as Group
        core.scale.setScalar((0.4 + blastAge * 2.4) * blastSize)
        core.children.forEach((c, i) => { ((c as Mesh).material as { opacity: number }).opacity = Math.max(0, (i === 0 ? 0.95 : 0.6) - blastAge * 0.55) })
      }
      if (flash.current) flash.current.intensity = on ? Math.max(0, 60 * blastSize - blastAge * 55) : 0
    }
    bits.forEach((b, i) => {
      const mesh = bitRefs.current[i]
      if (!mesh) return
      const age = bitsFrom ? (story === 'over_capacity' ? blastAge : f) : -1
      mesh.visible = age >= 0 && age < 4
      if (!bitsFrom || age < 0) return
      const k = story === 'structure_overloaded' ? 0.9 : 2.2
      mesh.position.set(bitsFrom[0] + b.dir[0] * age * k, bitsFrom[1] + b.dir[1] * age * k - 1.6 * age * age, bitsFrom[2] + b.dir[2] * age * k)
      mesh.rotation.set(age * b.spin, age * b.spin * 0.7, 0)
    })
    if (glow.current) {
      glow.current.visible = burning > 0
      glow.current.position.set(x + Math.sin(-lean) * s.h, y + Math.cos(-lean) * s.h, 0)
      glow.current.scale.setScalar(0.3 + burning * 1.2)
      ;(glow.current.material as { opacity: number }).opacity = burning * 0.8
    }
    if (sky.current) sky.current.visible = started && t / duration > 0.3
    const camY = Math.max(1.5, y + 0.9)
    const back = 6.4 + Math.min(3, y * 0.1)
    camera.position.set(3.4 + Math.sin(t * 0.25) * 0.5, camY, back)
    camera.lookAt(x * 0.5, y + s.h * 0.48, 0)
  })

  const split = s.h * 0.56
  const boosterAngles = Array.from({ length: s.boosters }, (_, i) => (i / s.boosters) * Math.PI * 2 + (s.boosters === 2 ? 0 : Math.PI / 4))
  const br = s.boosters > 2 ? s.r * 0.42 : s.r * 0.78
  return (
    <>
      <group ref={sky} visible={false}><Stars radius={70} depth={20} count={1800} factor={2.6} fade speed={0.4} /></group>

      {/* ground, pad, service tower and lightning masts */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[60, 64]} /><meshStandardMaterial color="#3a4a3a" map={ground} roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[1.5, 1.7, 0.1, 48]} /><meshStandardMaterial color="#8b8f96" map={concrete} roughness={0.95} /></mesh>
      <mesh position={[0, 0.075, 0]}><cylinderGeometry args={[s.r * 2.2, s.r * 2.2, 0.03, 32]} /><meshStandardMaterial color="#1b1d22" roughness={0.8} /></mesh>
      <group position={[-(s.r + 0.55), 0, 0]}>
        {[[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].map(([px, pz]) => (
          <mesh key={`${px}${pz}`} position={[px, s.h * 0.5, pz]}><boxGeometry args={[0.03, s.h, 0.03]} /><meshStandardMaterial color="#9b2a22" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        {Array.from({ length: Math.ceil(s.h / 0.3) }, (_, i) => (
          <mesh key={i} position={[0, 0.15 + i * 0.3, 0]}><boxGeometry args={[0.25, 0.02, 0.25]} /><meshStandardMaterial color="#7d221c" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        {[0.45, 0.8].map((k) => (
          <mesh key={k} position={[0.3, s.h * k, 0]}><boxGeometry args={[0.5, 0.03, 0.05]} /><meshStandardMaterial color="#c7ccd4" metalness={0.7} roughness={0.4} /></mesh>
        ))}
      </group>
      {[[1.3, 1.1], [-1.2, -1.3], [1.4, -1.0]].map(([px, pz]) => (
        <mesh key={`${px}${pz}`} position={[px * 1.5, s.h * 0.62, pz * 1.5]}><cylinderGeometry args={[0.006, 0.014, s.h * 1.24, 8]} /><meshStandardMaterial color="#c7ccd4" metalness={0.6} roughness={0.5} /></mesh>
      ))}

      {puffs.map((_, i) => (
        <mesh key={i} ref={(m) => { puffRefs.current[i] = m }} visible={false}>
          <sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#f4f5f7" roughness={1} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}

      <group ref={rocket}>
        <group position={[0, 0.14 + s.r * 0.5, 0]}>
          {/* first stage, boosters and their engines: all of this drops away at staging */}
          <group ref={lower}>
            <Tank r={s.r} from={0} to={split} color={s.core} />
            {s.fins && [0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]} position={[0, split * 0.9, 0]}>
                <boxGeometry args={[s.r * 3.1, s.r * 0.75, 0.012]} /><meshStandardMaterial color="#1b1d22" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
            {boosterAngles.map((a, i) => (
              <group key={i} position={[Math.cos(a) * (s.r + br), 0, Math.sin(a) * (s.r + br)]}>
                <mesh position={[0, split * 0.4, 0]}><cylinderGeometry args={[br, br, split * 0.8, 32]} /><Skin color={WHITE} /></mesh>
                <mesh position={[0, split * 0.8 + br * 0.9, 0]}><coneGeometry args={[br, br * 1.8, 32]} /><Skin color={WHITE} /></mesh>
                <Bell r={br * 0.7} />
              </group>
            ))}
            <EngineCluster r={s.r} count={s.engines} />
            <group ref={lowerPlume} position={[0, -s.r * 0.9, 0]} visible={false}>
              <Plume r={s.r * (1 + s.boosters * 0.25)} length={1.15} />
            </group>
          </group>

          {/* second stage, and the payload fairing that opens once the air is thin */}
          <group ref={upper}>
            <group ref={upperPlume} position={[0, split - s.r * 0.2, 0]} visible={false}><Plume r={s.r * 0.6} length={0.8} /></group>
            <mesh position={[0, split + 0.01, 0]}><cylinderGeometry args={[s.r * 1.02, s.r * 1.02, 0.05, 48]} /><meshStandardMaterial color="#1b1d22" metalness={0.6} roughness={0.4} /></mesh>
            <Tank r={s.r} from={split + 0.03} to={s.h} color={WHITE} />
            {/* the spacecraft riding inside */}
            <mesh position={[0, s.h + s.r * 0.9, 0]}><boxGeometry args={[s.r * 1.1, s.r * 1.5, s.r * 1.1]} /><meshStandardMaterial color="#e0a526" metalness={0.7} roughness={0.35} emissive="#e0a526" emissiveIntensity={0.15} /></mesh>
            <mesh ref={fairingL} position={[0, s.h, 0]} geometry={half} rotation={[0, Math.PI / 2, 0]}><meshStandardMaterial color={WHITE} metalness={0.25} roughness={0.38} side={DoubleSide} /></mesh>
            <mesh ref={fairingR} position={[0, s.h, 0]} geometry={half} rotation={[0, -Math.PI / 2, 0]}><meshStandardMaterial color={WHITE} metalness={0.25} roughness={0.38} side={DoubleSide} /></mesh>
          </group>
        </group>
      </group>

      {/* re-entry glow for a rocket that falls back */}
      <mesh ref={glow} visible={false}>
        <sphereGeometry args={[0.5, 20, 14]} /><meshBasicMaterial color="#ff7a2a" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* fireball and flying pieces */}
      <group ref={blast} visible={false}>
        <group>
          <mesh><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#fff3c4" transparent opacity={0.95} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
          <mesh scale={1.5}><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#ff8a2a" transparent opacity={0.6} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
          <mesh scale={2.1}><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#c2301c" transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
        </group>
        <pointLight ref={flash} color="#ffd9a0" distance={30} decay={1.5} />
      </group>
      {bits.map((b, i) => (
        <mesh key={i} ref={(m) => { bitRefs.current[i] = m }} visible={false}>
          <boxGeometry args={[b.size * 1.6, b.size * 0.5, b.size]} />
          <meshStandardMaterial color={story === 'structure_overloaded' ? (i % 3 === 0 ? '#1b4bb0' : '#e0a526') : i % 3 === 0 ? '#1b1d22' : '#e9ebee'} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}

/** The climb from the pad to the edge of space, in one of four endings. */
export default function LaunchScene3D(props: LaunchSceneProps) {
  return (
    <Stage camera={[3.4, 1.5, 6.4]} fov={42} sky={false}>
      <Scene {...props} />
    </Stage>
  )
}
