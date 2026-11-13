import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { VehicleId } from '../../engine/types'
import { Stage } from './common'

type Size = { h: number; r: number; boosters: boolean; core: string }
const SIZE: Record<VehicleId, Size> = {
  electron: { h: 1.2, r: 0.085, boosters: false, core: '#17171b' },
  pslv: { h: 1.8, r: 0.12, boosters: false, core: '#f6f6f6' },
  vega_c: { h: 1.7, r: 0.13, boosters: false, core: '#f6f6f6' },
  h3: { h: 2.0, r: 0.15, boosters: false, core: '#f6f6f6' },
  falcon9: { h: 2.5, r: 0.14, boosters: false, core: '#f6f6f6' },
  ariane64: { h: 2.4, r: 0.17, boosters: true, core: '#f6f6f6' },
  atlas_v: { h: 2.3, r: 0.15, boosters: true, core: '#d8b48a' },
  vulcan: { h: 2.4, r: 0.17, boosters: true, core: '#f6f6f6' },
  new_glenn: { h: 3.0, r: 0.22, boosters: false, core: '#f6f6f6' },
  falcon_hvy: { h: 2.6, r: 0.14, boosters: true, core: '#f6f6f6' },
  sls: { h: 3.1, r: 0.21, boosters: true, core: '#ea6f24' },
}

export const LIFTOFF_SECONDS = { success: 7, fail: 5 }
const BLAST_AT = 2.6
const STAGE_AT = 3.4

function Flame({ r, on }: { r: number; on: boolean }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.set(1, 0.85 + Math.sin(clock.elapsedTime * 40) * 0.2, 1)
  })
  if (!on) return null
  return (
    <mesh ref={ref} position={[0, -r * 3.2, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[r * 0.9, r * 6, 10]} />
      <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
    </mesh>
  )
}

function Scene({ vehicle, started, fail }: { vehicle: VehicleId; started: boolean; fail: boolean }) {
  const s = SIZE[vehicle]
  const t = useRef(0)
  const rocket = useRef<Group>(null)
  const lower = useRef<Group>(null)
  const blast = useRef<Group>(null)
  const smoke = useRef<Group>(null)
  const upperFlame = useRef<Group>(null)
  const puffs = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2, d: 0.5 + (i % 3) * 0.25 })), [])
  const bits = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: i * 2.4, e: ((i * 37) % 10) / 10 - 0.3, v: 1.5 + (i % 4) })), [])

  useFrame(({ camera }, dt) => {
    if (started) t.current += dt
    const time = t.current
    const blown = fail && time >= BLAST_AT
    const climb = Math.min(time, fail ? BLAST_AT : 99)
    const y = 0.5 * 0.62 * climb * climb
    if (rocket.current) {
      rocket.current.position.y = y
      rocket.current.visible = !blown
      // an overloaded rocket leans before it lets go
      rocket.current.rotation.z = fail ? Math.max(0, time - 1.2) * 0.22 : 0
    }
    if (lower.current && !fail) {
      const since = Math.max(0, time - STAGE_AT)
      lower.current.position.y = -since * since * 1.4
      lower.current.rotation.z = since * 0.5
    }
    if (upperFlame.current) upperFlame.current.visible = !fail && time > STAGE_AT + 0.4
    if (smoke.current) {
      const k = Math.min(1, time / 2.5)
      smoke.current.scale.setScalar(started ? 0.2 + k * 2.6 : 0.001)
    }
    if (blast.current) {
      const since = time - BLAST_AT
      blast.current.visible = blown
      if (blown) {
        blast.current.position.y = y
        blast.current.scale.setScalar(0.3 + since * 2.2)
      }
    }
    const camY = Math.max(1.4, y + 0.9)
    camera.position.set(3.4, camY, 6.2)
    camera.lookAt(0, blown ? y : y + s.h * 0.45, 0)
  })

  const split = s.h * 0.55
  const Body = ({ from, to }: { from: number; to: number }) => (
    <mesh position={[0, (from + to) / 2, 0]}>
      <cylinderGeometry args={[s.r, s.r, to - from, 16]} />
      <meshStandardMaterial color={s.core} roughness={0.45} metalness={0.2} />
    </mesh>
  )
  return (
    <>
      {/* ground, pad and tower */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[14, 40]} /><meshStandardMaterial color="#1d2b1f" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.9, 1, 0.1, 8]} /><meshStandardMaterial color="#58585b" flatShading /></mesh>
      <mesh position={[-0.6, s.h * 0.45, 0]}><boxGeometry args={[0.12, s.h * 0.9, 0.12]} /><meshStandardMaterial color="#b60109" /></mesh>

      <group ref={smoke} position={[0, 0.15, 0]}>
        {puffs.map((p, i) => (
          <mesh key={i} position={[Math.cos(p.a) * p.d, 0.1, Math.sin(p.a) * p.d]}>
            <icosahedronGeometry args={[0.32, 1]} /><meshStandardMaterial color="#e3e3e3" flatShading transparent opacity={0.75} />
          </mesh>
        ))}
      </group>

      <group ref={rocket}>
        <group position={[0, 0.12, 0]}>
          <group ref={lower}>
            <Body from={0} to={split} />
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, s.r * 1.5, 0]}>
                <boxGeometry args={[s.r * 4.2, s.r * 2.6, 0.02]} /><meshStandardMaterial color="#444447" />
              </mesh>
            ))}
            {s.boosters && ([1, -1] as const).map((side) => (
              <group key={side} position={[side * s.r * 2.1, 0, 0]}>
                <mesh position={[0, split * 0.42, 0]}><cylinderGeometry args={[s.r * 0.72, s.r * 0.72, split * 0.84, 12]} /><meshStandardMaterial color="#f6f6f6" /></mesh>
                <mesh position={[0, split * 0.84 + s.r * 0.7, 0]}><coneGeometry args={[s.r * 0.72, s.r * 1.4, 12]} /><meshStandardMaterial color="#f6f6f6" /></mesh>
                <Flame r={s.r * 0.7} on={started} />
              </group>
            ))}
            <Flame r={s.r} on={started} />
          </group>
          <group ref={upperFlame} position={[0, split, 0]} visible={false}><Flame r={s.r * 0.8} on /></group>
          <Body from={split} to={s.h} />
          <mesh position={[0, split + 0.02, 0]}><cylinderGeometry args={[s.r * 1.02, s.r * 1.02, 0.06, 16]} /><meshStandardMaterial color="#17171b" /></mesh>
          <mesh position={[0, s.h + s.r * 1.3, 0]}><coneGeometry args={[s.r, s.r * 2.6, 16]} /><meshStandardMaterial color="#f6f6f6" roughness={0.4} /></mesh>
        </group>
      </group>

      <group ref={blast} visible={false}>
        <mesh><icosahedronGeometry args={[0.5, 1]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.85} /></mesh>
        <mesh scale={0.65}><icosahedronGeometry args={[0.5, 1]} /><meshBasicMaterial color="#f64137" /></mesh>
        {bits.map((b, i) => (
          <mesh key={i} position={[Math.cos(b.a) * 0.6 * (b.v / 3), b.e, Math.sin(b.a) * 0.6 * (b.v / 3)]} rotation={[b.a, b.e, 0]}>
            <boxGeometry args={[0.07, 0.03, 0.05]} /><meshBasicMaterial color="#e3e3e3" />
          </mesh>
        ))}
      </group>
    </>
  )
}

/** Liftoff. `fail` means the vehicle is lost on the way up. */
export default function LaunchScene3D(props: { vehicle: VehicleId; started: boolean; fail: boolean }) {
  return (
    <Stage camera={[3.4, 1.4, 6.2]} fov={42}>
      <Scene {...props} />
    </Stage>
  )
}
