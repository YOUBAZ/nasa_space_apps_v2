import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import { STATIONS } from '../../engine/catalog'
import type { OrbitId, StationId } from '../../engine/types'
import { Planet, Stage, type Body } from './common'

interface View { body: Body; radius: number; ring?: { r: number; tilt: number; stretch?: number; speed: number }; far?: boolean; surface?: boolean }
const VIEW: Record<OrbitId, View> = {
  leo: { body: 'earth', radius: 1, ring: { r: 1.18, tilt: 0.5, speed: 1.6 } },
  sso: { body: 'earth', radius: 1, ring: { r: 1.28, tilt: 1.45, speed: 1.3 } },
  meo: { body: 'earth', radius: 0.8, ring: { r: 1.7, tilt: 0.9, speed: 0.6 } },
  geo: { body: 'earth', radius: 0.7, ring: { r: 2.1, tilt: 0, speed: 0.12 } },
  heo: { body: 'earth', radius: 0.7, ring: { r: 1.5, tilt: 1.1, stretch: 1.7, speed: 0.5 } },
  l2: { body: 'earth', radius: 0.45, ring: { r: 0.35, tilt: 1.2, speed: 0.8 }, far: true },
  lunar: { body: 'moon', radius: 0.9, ring: { r: 1.25, tilt: 0.6, speed: 1 } },
  asteroid: { body: 'asteroid', radius: 0.7, ring: { r: 1.1, tilt: 0.3, speed: 0.7 } },
  mars_orbit: { body: 'mars', radius: 1, ring: { r: 1.3, tilt: 0.8, speed: 1 } },
  mars_surf: { body: 'mars', radius: 1.2, surface: true },
  jupiter: { body: 'jupiter', radius: 1.2, ring: { r: 1.75, tilt: 0.25, speed: 0.6 } },
}

function Satellite({ r, speed, stretch = 1 }: { r: number; speed: number; stretch?: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * speed
    ref.current?.position.set(Math.cos(a) * r * stretch, 0, Math.sin(a) * r)
  })
  return (
    <group ref={ref}>
      <mesh><boxGeometry args={[0.09, 0.09, 0.09]} /><meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.5} /></mesh>
      <mesh><boxGeometry args={[0.34, 0.012, 0.08]} /><meshStandardMaterial color="#12306b" emissive="#1c67e3" emissiveIntensity={0.5} /></mesh>
    </group>
  )
}

function Pin({ id, radius }: { id: StationId; radius: number }) {
  const s = STATIONS[id]
  const lon = ((s.x / 100) * 360 - 180) * (Math.PI / 180)
  const lat = (90 - (s.y / 100) * 180) * (Math.PI / 180)
  const r = radius * 1.03
  return (
    <mesh position={[r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon)]}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshBasicMaterial color={s.network === 'dsn' ? '#ea6f24' : '#47da84'} />
    </mesh>
  )
}

/** The chosen destination: a low-poly world, the orbit ring, and the spacecraft flying along it. */
export default function OrbitView3D({ orbit, stations }: { orbit?: OrbitId; stations: StationId[] }) {
  const v: View = orbit ? VIEW[orbit] : { body: 'earth', radius: 1 }
  const spinRef = useRef<Group>(null)
  return (
    <Stage camera={[0, 1.6, 5.2]} fov={36}>
      <group position={v.far ? [-1.3, 0, 0] : [0, 0, 0]}>
        <group ref={spinRef}>
          <Planet body={v.body} radius={v.radius} />
        </group>
        {v.body === 'earth' && stations.map((id) => <Pin key={id} id={id} radius={v.radius} />)}
        {v.surface && (
          <mesh position={[0, v.radius * 0.72, v.radius * 0.72]}>
            <coneGeometry args={[0.09, 0.14, 6]} /><meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.6} />
          </mesh>
        )}
      </group>
      {v.ring && (
        <group position={v.far ? [1.5, 0, 0] : [0, 0, 0]} rotation={[v.ring.tilt, 0, 0.15]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[v.ring.stretch ?? 1, 1, 1]}>
            <torusGeometry args={[v.ring.r, 0.008, 6, 96]} />
            <meshBasicMaterial color="#f6f6f6" transparent opacity={0.7} />
          </mesh>
          <Satellite r={v.ring.r} speed={v.ring.speed} stretch={v.ring.stretch} />
          {v.far && <mesh><sphereGeometry args={[0.03, 8, 8]} /><meshBasicMaterial color="#ea6f24" /></mesh>}
        </group>
      )}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </Stage>
  )
}
