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

const BLAST_AT = 2.6
const STAGE_AT = 3.4
const WHITE = '#f3f4f6'

const Skin = ({ color }: { color: string }) =>
  <meshStandardMaterial color={color} metalness={color === WHITE ? 0.25 : 0.1} roughness={color === WHITE ? 0.38 : 0.8} envMapIntensity={1.1} />

/** A rocket nozzle: bell-shaped, dark and shiny. */
function Bell({ r }: { r: number }) {
  const geometry = useMemo(() => new LatheGeometry(
    Array.from({ length: 12 }, (_, i) => new Vector2(r * (0.35 + 0.65 * Math.pow(i / 11, 0.6)), -(i / 11) * r * 2.2)), 28), [r])
  return <mesh geometry={geometry}><meshStandardMaterial color="#2d3037" metalness={0.95} roughness={0.3} side={DoubleSide} /></mesh>
}

/** Rocket exhaust: a white-hot core inside orange flame inside a faint outer glow, all flickering. */
function Plume({ r, lit, length = 1 }: { r: number; lit: boolean; length?: number }) {
  const ref = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const f = 0.88 + Math.sin(clock.elapsedTime * 47) * 0.08 + Math.sin(clock.elapsedTime * 23) * 0.06
    ref.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = lit ? 6 * f : 0
  })
  if (!lit) return null
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

/** Engines at the base of a stage: one in the middle, the rest in a ring. */
function EngineCluster({ r, count, lit }: { r: number; count: number; lit: boolean }) {
  const each = count === 1 ? r * 0.62 : count <= 4 ? r * 0.36 : r * 0.22
  const spots: [number, number][] = count === 1 ? [[0, 0]] : Array.from({ length: count }, (_, i) => {
    const ring = count >= 7 ? i > 0 : true
    const n = count >= 7 ? count - 1 : count
    const a = ((count >= 7 ? i - 1 : i) / n) * Math.PI * 2
    return ring ? [Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6] : [0, 0]
  })
  return (
    <group>
      {spots.map(([x, z], i) => <group key={i} position={[x, 0, z]}><Bell r={each} /></group>)}
      <group position={[0, -each * 1.6, 0]}><Plume r={r} lit={lit} /></group>
    </group>
  )
}

/** One cylindrical stage with a few painted bands, so it reads as hardware rather than a plain tube. */
function Stage1({ r, from, to, color }: { r: number; from: number; to: number; color: string }) {
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

function Scene({ vehicle, started, fail }: { vehicle: VehicleId; started: boolean; fail: boolean }) {
  const s = SIZE[vehicle]
  const t = useRef(0)
  const liftoffAt = useRef<number | null>(null)
  const rocket = useRef<Group>(null)
  const lower = useRef<Group>(null)
  const upperPlume = useRef<Group>(null)
  const lowerPlume = useRef<Group>(null)
  const blast = useRef<Group>(null)
  const flash = useRef<PointLight>(null)
  const sky = useRef<Group>(null)
  const puffRefs = useRef<(Mesh | null)[]>([])
  const bitRefs = useRef<(Mesh | null)[]>([])

  const puffs = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    a: (i * 2.399) % (Math.PI * 2), speed: 0.3 + ((i * 37) % 10) / 16, delay: ((i * 13) % 30) / 30 * 2.4, lift: 0.08 + ((i * 7) % 10) / 30, size: 0.1 + ((i * 11) % 10) / 55,
  })), [])
  const bits = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    dir: [Math.cos(i * 2.4) * (0.6 + (i % 5) / 6), 0.3 + ((i * 3) % 10) / 9, Math.sin(i * 2.4) * (0.6 + (i % 4) / 5)] as [number, number, number],
    spin: 2 + (i % 7), size: 0.04 + (i % 4) * 0.018,
  })), [])
  const fairing = useMemo(() => new LatheGeometry(
    Array.from({ length: 16 }, (_, i) => new Vector2(s.r * 1.04 * Math.cos((i / 15) * Math.PI * 0.5), Math.sin((i / 15) * Math.PI * 0.5) * s.r * 3.1)), 48), [s.r])
  const concrete = useMemo(() => noiseTexture('concrete', 256, 30, 5, 1.2), [])
  const ground = useMemo(() => {
    const g = noiseTexture('ground', 256, 12, 9, 0.7)
    g.repeat.set(10, 10)
    return g
  }, [])

  useFrame(({ camera, clock }) => {
    // wall-clock time since liftoff, so the flight takes the same seconds on any machine
    if (started && liftoffAt.current === null) liftoffAt.current = clock.elapsedTime
    if (started) t.current = clock.elapsedTime - (liftoffAt.current ?? clock.elapsedTime)
    const time = t.current
    const blown = fail && time >= BLAST_AT
    const climb = Math.min(time, fail ? BLAST_AT : 99)
    const y = 0.5 * 0.62 * climb * climb
    if (rocket.current) {
      rocket.current.position.y = y
      rocket.current.visible = !blown
      // an overloaded rocket leans before it lets go; a healthy one starts its gravity turn
      rocket.current.rotation.z = fail ? Math.max(0, time - 1.2) * 0.22 : -Math.min(0.12, Math.max(0, time - 2.5) * 0.03)
      rocket.current.position.x = fail ? -Math.max(0, time - 1.2) * 0.12 : 0
    }
    const staged = !fail && time > STAGE_AT
    if (lower.current && !fail) {
      const since = Math.max(0, time - STAGE_AT)
      lower.current.position.y = -since * since * 1.5
      lower.current.rotation.z = since * 0.45
      lower.current.rotation.x = since * 0.2
    }
    if (lowerPlume.current) lowerPlume.current.visible = started && !staged
    if (upperPlume.current) upperPlume.current.visible = staged && time > STAGE_AT + 0.35
    // launch smoke rolls out along the ground, rises and thins
    puffs.forEach((p, i) => {
      const mesh = puffRefs.current[i]
      if (!mesh) return
      const age = time - p.delay * 0.6
      if (!started || age <= 0) { mesh.visible = false; return }
      mesh.visible = true
      const spread = Math.min(1, age / 3.5)
      const d = 0.2 + spread * (0.9 + p.speed * 1.5)
      mesh.position.set(Math.cos(p.a) * d, 0.1 + age * p.lift * 0.45, Math.sin(p.a) * d)
      mesh.scale.setScalar(p.size * (1 + Math.min(age, 4) * 0.75))
      ;(mesh.material as { opacity: number }).opacity = Math.max(0, 0.42 - age * 0.06)
    })
    if (blast.current) {
      const since = time - BLAST_AT
      blast.current.visible = blown
      if (blown) {
        blast.current.position.set(rocket.current?.position.x ?? 0, y + s.h * 0.4, 0)
        const core = blast.current.children[0] as Group
        core.scale.setScalar(0.4 + since * 2.4)
        core.children.forEach((c, i) => { ((c as Mesh).material as { opacity: number }).opacity = Math.max(0, (i === 0 ? 0.95 : 0.6) - since * 0.55) })
        bits.forEach((b, i) => {
          const mesh = bitRefs.current[i]
          if (!mesh) return
          mesh.position.set(b.dir[0] * since * 2.2, b.dir[1] * since * 2.4 - 1.6 * since * since, b.dir[2] * since * 2.2)
          mesh.rotation.set(since * b.spin, since * b.spin * 0.7, 0)
        })
      }
      if (flash.current) flash.current.intensity = blown ? Math.max(0, 60 - since * 55) : 0
    }
    if (sky.current) sky.current.visible = started && time > 2.2
    const camY = Math.max(1.5, y + 0.9)
    const back = 6.4 + Math.min(2.5, y * 0.12)
    camera.position.set(3.4 + Math.sin(time * 0.25) * 0.5, camY, back)
    camera.lookAt(0, blown ? y + s.h * 0.4 : y + s.h * 0.48, 0)
  })

  const split = s.h * 0.56
  const boosterAngles = Array.from({ length: s.boosters }, (_, i) => (i / s.boosters) * Math.PI * 2 + (s.boosters === 2 ? 0 : Math.PI / 4))
  const br = s.boosters > 2 ? s.r * 0.42 : s.r * 0.78
  return (
    <>
      <group ref={sky} visible={false}><Stars radius={70} depth={20} count={1800} factor={2.6} fade speed={0.4} /></group>

      {/* ground, pad, tower and lightning masts */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[60, 64]} /><meshStandardMaterial color="#3a4a3a" map={ground} roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[1.5, 1.7, 0.1, 48]} /><meshStandardMaterial color="#8b8f96" map={concrete} roughness={0.95} /></mesh>
      <mesh position={[0, 0.075, 0]}><cylinderGeometry args={[s.r * 2.2, s.r * 2.2, 0.03, 32]} /><meshStandardMaterial color="#1b1d22" roughness={0.8} /></mesh>
      <group position={[-(s.r + 0.55), 0, 0]}>
        {[[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, s.h * 0.5, z]}><boxGeometry args={[0.03, s.h, 0.03]} /><meshStandardMaterial color="#9b2a22" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        {Array.from({ length: Math.ceil(s.h / 0.3) }, (_, i) => (
          <mesh key={i} position={[0, 0.15 + i * 0.3, 0]}><boxGeometry args={[0.25, 0.02, 0.25]} /><meshStandardMaterial color="#7d221c" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        {[0.45, 0.8].map((k) => (
          <mesh key={k} position={[0.3, s.h * k, 0]}><boxGeometry args={[0.5, 0.03, 0.05]} /><meshStandardMaterial color="#c7ccd4" metalness={0.7} roughness={0.4} /></mesh>
        ))}
      </group>
      {[[1.3, 1.1], [-1.2, -1.3], [1.4, -1.0]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 1.5, s.h * 0.62, z * 1.5]}><cylinderGeometry args={[0.006, 0.014, s.h * 1.24, 8]} /><meshStandardMaterial color="#c7ccd4" metalness={0.6} roughness={0.5} /></mesh>
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
            <Stage1 r={s.r} from={0} to={split} color={s.core} />
            {s.fins && [0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]} position={[0, split * 0.9, 0]}>
                <boxGeometry args={[s.r * 3.1, s.r * 0.75, 0.012]} /><meshStandardMaterial color="#1b1d22" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
            {boosterAngles.map((a, i) => (
              <group key={i} position={[Math.cos(a) * (s.r + br), 0, Math.sin(a) * (s.r + br)]}>
                <mesh position={[0, split * 0.4, 0]}><cylinderGeometry args={[br, br, split * 0.8, 32]} /><Skin color={WHITE} /></mesh>
                <mesh position={[0, split * 0.8 + br * 0.9, 0]}><coneGeometry args={[br, br * 1.8, 32]} /><Skin color={WHITE} /></mesh>
                <group position={[0, 0, 0]}><Bell r={br * 0.7} /></group>
              </group>
            ))}
            <EngineCluster r={s.r} count={s.engines} lit={false} />
            <group ref={lowerPlume} position={[0, -s.r * 0.9, 0]}>
              <Plume r={s.r * (1 + s.boosters * 0.25)} lit length={1.15} />
            </group>
          </group>

          {/* second stage and payload fairing */}
          <group ref={upperPlume} position={[0, split - s.r * 0.2, 0]} visible={false}><Plume r={s.r * 0.6} lit length={0.8} /></group>
          <mesh position={[0, split + 0.01, 0]}><cylinderGeometry args={[s.r * 1.02, s.r * 1.02, 0.05, 48]} /><meshStandardMaterial color="#1b1d22" metalness={0.6} roughness={0.4} /></mesh>
          <Stage1 r={s.r} from={split + 0.03} to={s.h} color={WHITE} />
          <mesh position={[0, s.h, 0]} geometry={fairing}><Skin color={WHITE} /></mesh>
        </group>
      </group>

      {/* loss of vehicle */}
      <group ref={blast} visible={false}>
        <group>
          <mesh><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#fff3c4" transparent opacity={0.95} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
          <mesh scale={1.5}><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#ff8a2a" transparent opacity={0.6} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
          <mesh scale={2.1}><sphereGeometry args={[0.5, 24, 18]} /><meshBasicMaterial color="#c2301c" transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
        </group>
        {bits.map((b, i) => (
          <mesh key={i} ref={(m) => { bitRefs.current[i] = m }}>
            <boxGeometry args={[b.size * 1.6, b.size * 0.5, b.size]} /><meshStandardMaterial color={i % 3 === 0 ? '#1b1d22' : '#e9ebee'} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        <pointLight ref={flash} color="#ffd9a0" distance={30} decay={1.5} />
      </group>
    </>
  )
}

/** Liftoff from the pad. `fail` means the vehicle is lost on the way up. */
export default function LaunchScene3D(props: { vehicle: VehicleId; started: boolean; fail: boolean }) {
  return (
    <Stage camera={[3.4, 1.5, 6.4]} fov={42} sky={false}>
      <Scene {...props} />
    </Stage>
  )
}
