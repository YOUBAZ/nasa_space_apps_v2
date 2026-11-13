import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Stars } from '@react-three/drei'
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, IcosahedronGeometry, RepeatWrapping, SRGBColorSpace,
  TextureLoader, type Group, type Mesh, type Texture,
} from 'three'
import { BODIES, SKY_TEXTURE, textureUrl, type Body } from './bodies'

export type { Body } from './bodies'

// ---------------------------------------------------------------- textures

const cache = new Map<string, Texture>()

/** Loads a NASA image map once and shares it. Returns null until it arrives (or if it never does). */
export function useImageMap(file: string | undefined): Texture | null {
  const [tex, setTex] = useState<Texture | null>(() => (file ? cache.get(file) ?? null : null))
  useEffect(() => {
    if (!file) { setTex(null); return }
    const hit = cache.get(file)
    if (hit) { setTex(hit); return }
    let alive = true
    new TextureLoader().load(textureUrl(file), (t) => {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
      t.wrapS = RepeatWrapping // the map wraps around the globe, so no seam at the date line
      cache.set(file, t)
      if (alive) setTex(t)
    }, undefined, () => { /* keep the plain colour */ })
    return () => { alive = false }
  }, [file])
  return tex
}

/** Deterministic value noise, for surfaces drawn in code (asteroid rock, foil wrinkles). */
function noise2(x: number, y: number, seed: number): number {
  const h = (ix: number, iy: number) => {
    const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453
    return n - Math.floor(n)
  }
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
const fbm = (x: number, y: number, seed: number) =>
  noise2(x, y, seed) * 0.5 + noise2(x * 2.1, y * 2.1, seed + 1) * 0.25 + noise2(x * 4.3, y * 4.3, seed + 2) * 0.15 + noise2(x * 8.7, y * 8.7, seed + 3) * 0.1

const drawn = new Map<string, CanvasTexture>()
/** A greyscale texture painted from noise; `scale` sets how fine the grain is. */
export function noiseTexture(key: string, size: number, scale: number, seed: number, contrast = 1): CanvasTexture {
  const hit = drawn.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, (fbm((x / size) * scale, (y / size) * scale, seed) - 0.5) * contrast + 0.5))
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  drawn.set(key, tex)
  return tex
}

// ---------------------------------------------------------------- stage

/** The night sky: NASA's Tycho star map wrapped around the whole scene, plus a few twinkling points. */
function Sky() {
  const map = useImageMap(SKY_TEXTURE)
  return (
    <>
      {map && (
        <mesh scale={[-1, 1, 1]} rotation={[0.6, 0, 0.3]}>
          <sphereGeometry args={[90, 48, 32]} />
          <meshBasicMaterial map={map} side={BackSide} toneMapped={false} color="#aab6d6" />
        </mesh>
      )}
      <Stars radius={70} depth={20} count={map ? 350 : 2400} factor={2.2} fade speed={0.4} />
    </>
  )
}

/**
 * Shared canvas. One strong "sun" from the upper right so every world has a day and a night side,
 * a little fill so the dark side is not pure black, and soft studio panels that give metal something to reflect.
 */
export function Stage({ children, camera = [0, 1.2, 5], fov = 40, sky = true, fill = 0.22 }:
  { children: ReactNode; camera?: [number, number, number]; fov?: number; sky?: boolean; /** how bright the shadow side is */ fill?: number }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: camera, fov, near: 0.05, far: 400 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <ambientLight intensity={fill} />
      <directionalLight position={[8, 5, 6]} intensity={3.4} color="#fff6e6" />
      <directionalLight position={[-6, -3, -5]} intensity={0.35} color="#4d7fd6" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={5} position={[6, 5, 4]} scale={[10, 10, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2.4} position={[-6, 2, -4]} scale={[10, 8, 1]} color="#9fc0ff" />
        <Lightformer form="rect" intensity={2} position={[0, 6, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={1.5} position={[0, -6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={6} color="#2a3550" />
      </Environment>
      {sky && <Sky />}
      {children}
    </Canvas>
  )
}

export function Spin({ children, speed = 0.3, tilt = 0 }: { children: ReactNode; speed?: number; tilt?: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed })
  return <group rotation={[tilt, 0, 0]}><group ref={ref}>{children}</group></group>
}

// ---------------------------------------------------------------- worlds

/** A soft glowing rim: brightest at the edge of the disc, invisible face-on. */
function Atmosphere({ radius, color }: { radius: number; color: string }) {
  const uniforms = useMemo(() => ({ glow: { value: new Color(color) } }), [color])
  return (
    <mesh scale={1.028}>
      <sphereGeometry args={[radius, 64, 48]} />
      <shaderMaterial
        key={color} uniforms={uniforms} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending}
        vertexShader={`varying vec3 vN; varying vec3 vV;
          void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`}
        fragmentShader={`uniform vec3 glow; varying vec3 vN; varying vec3 vV;
          void main() { float rim = pow(1.0 - abs(dot(vN, vV)), 3.2); gl_FragColor = vec4(glow, 1.0) * rim * 0.55; }`}
      />
    </mesh>
  )
}

/** An irregular rock: a finely divided sphere pushed in and out by noise, with craters of shade. */
function AsteroidRock({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const g = new IcosahedronGeometry(radius, 24)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const lumps = fbm(x * 1.6 + 5, y * 1.6 + z * 1.3, 11) - 0.5
      const grit = fbm(x * 7 + z * 5, y * 7 - z * 3, 23) - 0.5
      const k = 1 + lumps * 0.55 + grit * 0.07
      pos.setXYZ(i, x * k * 1.25, y * k * 0.82, z * k)
    }
    g.computeVertexNormals()
    return g
  }, [radius])
  const grain = useMemo(() => noiseTexture('rock', 256, 14, 7, 1.6), [])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={BODIES.asteroid.color} roughness={0.95} metalness={0.05} bumpMap={grain} bumpScale={0.05} map={grain} />
    </mesh>
  )
}

/**
 * A world, drawn from NASA imagery on a smooth sphere, turning on a tilted axis.
 * Anything passed as children (station pins, a lander) turns with the surface.
 */
export function Planet({ body, radius = 1, spin = 0.06, children }: { body: Body; radius?: number; spin?: number; children?: ReactNode }) {
  const look = BODIES[body]
  const map = useImageMap(look.texture)
  const turning = useRef<Group>(null)
  useFrame((_, dt) => { if (turning.current) turning.current.rotation.y += dt * spin })
  return (
    <group rotation={[0, 0, look.tilt]}>
      <group ref={turning}>
        {body === 'asteroid'
          ? <AsteroidRock radius={radius} />
          : (
            <mesh scale={[1, look.squash, 1]}>
              <sphereGeometry args={[radius, 96, 64]} />
              <meshStandardMaterial key={map ? 'mapped' : 'plain'} map={map ?? undefined} color={map ? '#ffffff' : look.color}
                bumpMap={look.bump && map ? map : undefined} bumpScale={look.bump} roughness={body === 'earth' ? 0.7 : 0.95} metalness={0} />
            </mesh>
          )}
        {children}
      </group>
      {look.atmosphere && <Atmosphere radius={radius} color={look.atmosphere} />}
    </group>
  )
}

/** Where a latitude and longitude sit on a Planet of the given radius (matches the image maps). */
export function onSurface(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)]
}

/** A small glowing dot with a slowly pulsing halo, used for ground stations and landers. */
export function Beacon({ position, color, size = 0.022 }: { position: [number, number, number]; color: string; size?: number }) {
  const halo = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!halo.current) return
    const k = 1 + ((clock.elapsedTime * 0.8) % 1) * 2.2
    halo.current.scale.setScalar(k)
    const m = halo.current.material as { opacity: number }
    m.opacity = 0.55 * (1 - (k - 1) / 2.2)
  })
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh ref={halo}><sphereGeometry args={[size * 1.3, 16, 12]} /><meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>
  )
}
