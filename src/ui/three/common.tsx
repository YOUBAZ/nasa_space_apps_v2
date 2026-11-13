import { useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import type { Group, Mesh } from 'three'

/** Shared canvas: transparent background, soft key light, a little starfield. */
export function Stage({ children, camera = [0, 1.2, 5], fov = 40, stars = true }:
  { children: ReactNode; camera?: [number, number, number]; fov?: number; stars?: boolean }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: camera, fov }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 6, 4]} intensity={3} />
      <directionalLight position={[-3, 2, 5]} intensity={1.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#288bff" />
      {stars && <Stars radius={60} depth={30} count={1200} factor={3} fade speed={0.6} />}
      {children}
    </Canvas>
  )
}

export function Spin({ children, speed = 0.3, tilt = 0 }: { children: ReactNode; speed?: number; tilt?: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed })
  return <group rotation={[tilt, 0, 0]}><group ref={ref}>{children}</group></group>
}

export type Body = 'earth' | 'mars' | 'jupiter' | 'moon' | 'asteroid'
const BODY: Record<Body, { color: string; accent: string; detail: number }> = {
  earth: { color: '#1c67e3', accent: '#47da84', detail: 3 },
  mars: { color: '#c1552d', accent: '#e8a06a', detail: 3 },
  jupiter: { color: '#d8b48a', accent: '#a9683f', detail: 4 },
  moon: { color: '#9a9aa0', accent: '#6e6e75', detail: 2 },
  asteroid: { color: '#77777a', accent: '#58585b', detail: 0 },
}

/** A low-poly world: a faceted sphere with a second, slightly larger faceted shell for land or bands. */
export function Planet({ body, radius = 1, spin = 0.12 }: { body: Body; radius?: number; spin?: number }) {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * spin })
  const b = BODY[body]
  return (
    <mesh ref={ref} scale={body === 'asteroid' ? [1.25, 0.85, 1] : 1}>
      <icosahedronGeometry args={[radius, b.detail]} />
      <meshStandardMaterial color={b.color} flatShading roughness={0.85} />
      {body === 'earth' && (
        <>
          <mesh rotation={[0.4, 1.1, 0.2]}>
            <icosahedronGeometry args={[radius * 1.012, 1]} />
            <meshStandardMaterial color={b.accent} flatShading transparent opacity={0.55} roughness={1} />
          </mesh>
          <mesh>
            <sphereGeometry args={[radius * 1.06, 24, 16]} />
            <meshBasicMaterial color="#288bff" transparent opacity={0.08} />
          </mesh>
        </>
      )}
      {body === 'jupiter' && [-0.45, -0.1, 0.3].map((y) => (
        <mesh key={y} position={[0, y * radius, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.sqrt(1 - y * y) * radius * 1.005, radius * 0.06, 6, 32]} />
          <meshStandardMaterial color={b.accent} flatShading roughness={1} />
        </mesh>
      ))}
      {body === 'mars' && (
        <mesh position={[0, radius * 0.93, 0]}>
          <sphereGeometry args={[radius * 0.32, 8, 6]} />
          <meshStandardMaterial color="#f6f6f6" flatShading />
        </mesh>
      )}
    </mesh>
  )
}
