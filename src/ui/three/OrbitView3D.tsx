import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { AdditiveBlending, type Group } from 'three'
import { STATIONS } from '../../engine/catalog'
import type { Design, OrbitId, StationId } from '../../engine/types'
import { useExpanded } from '../components/View3D'
import { ORBIT_VIEW, type OrbitLook } from './bodies'
import { Beacon, onSurface, Planet, Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

const DEMO: Partial<Design> = { structure: 'small', power: 'deploy_solar', antenna: 'hga' }

/** The orbit drawn as a crisp line with a soft glow, so it reads at any zoom. */
function Ring({ r, stretch = 1 }: { r: number; stretch?: number }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={[stretch, 1, 1]}>
      <mesh><torusGeometry args={[r, 0.0045, 8, 256]} /><meshBasicMaterial color="#dfe9ff" toneMapped={false} /></mesh>
      <mesh><torusGeometry args={[r, 0.02, 8, 256]} /><meshBasicMaterial color="#5aa7ff" transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>
  )
}

/** The team's own spacecraft flying the orbit, always facing along its path. */
function Flyer({ r, speed, stretch = 1, design }: { r: number; speed: number; stretch?: number; design: Partial<Design> }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * speed
    if (!ref.current) return
    ref.current.position.set(Math.cos(a) * r * stretch, 0, Math.sin(a) * r)
    ref.current.rotation.y = -a
  })
  return (
    <group ref={ref}>
      <group scale={0.09} rotation={[0, 0, Math.PI / 2]}><SpacecraftModel design={design} /></group>
      <mesh><sphereGeometry args={[0.035, 12, 10]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.35} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>
  )
}

/** The chosen destination: the real world it orbits, the orbit itself, and the spacecraft flying it. */
export default function OrbitView3D({ orbit, stations, design }: { orbit?: OrbitId; stations: StationId[]; design?: Partial<Design> }) {
  const expanded = useExpanded()
  const v: OrbitLook = orbit ? ORBIT_VIEW[orbit] : { body: 'earth', radius: 1, distance: 4.2 }
  const craft = design?.structure ? design : DEMO
  const offset: [number, number, number] = v.far ? [-1.5, 0, 0] : [0, 0, 0]
  return (
    <Stage camera={[v.distance * 0.25, v.distance * 0.32, v.distance]} fov={34}>
      <group position={offset}>
        <Planet body={v.body} radius={v.radius}>
          {v.body === 'earth' && stations.map((id) => {
            const s = STATIONS[id]
            const lon = (s.x / 100) * 360 - 180
            const lat = 90 - (s.y / 100) * 180
            return <Beacon key={id} position={onSurface(lat, lon, v.radius * 1.008)} color={s.network === 'dsn' ? '#ff8a3d' : '#47da84'} size={v.radius * 0.02} />
          })}
          {v.surface && (
            <group position={onSurface(18, 77, v.radius * 1.01)}>
              <Beacon position={[0, 0, 0]} color="#ffd27a" size={0.03} />
            </group>
          )}
        </Planet>
      </group>
      {v.ring && (
        <group position={v.far ? [1.6, 0, 0] : [0, 0, 0]} rotation={[v.ring.tilt, 0, 0.12]}>
          <Ring r={v.ring.r} stretch={v.ring.stretch} />
          <Flyer r={v.ring.r} speed={v.ring.speed} stretch={v.ring.stretch} design={craft} />
          {v.far && <mesh><sphereGeometry args={[0.02, 12, 10]} /><meshBasicMaterial color="#ff8a3d" toneMapped={false} /></mesh>}
        </group>
      )}
      <OrbitControls enablePan={false} enableZoom={expanded} minDistance={v.radius * 1.6} maxDistance={v.distance * 2.2} autoRotate autoRotateSpeed={0.35} />
    </Stage>
  )
}
