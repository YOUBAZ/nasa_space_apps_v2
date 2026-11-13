import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, DoubleSide, LatheGeometry, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'
import type { Design, InstrumentId } from '../../engine/types'
import { noiseTexture } from './common'

const BUS = { small: 0.55, medium: 0.8, large: 1.15 } as const
const GOLD = '#e0a526'
const STEEL = '#b9bec7'
const DARK = '#22262e'

// ------------------------------------------------------------ painted surfaces

let cells: CanvasTexture | null = null
/** Solar cells: dark blue squares with fine silver bus bars, as on a real array. */
function cellTexture(): CanvasTexture {
  if (cells) return cells
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#c9ced6'
  g.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const grad = g.createLinearGradient(x * 64, y * 64, x * 64 + 64, y * 64 + 64)
      grad.addColorStop(0, '#16307a')
      grad.addColorStop(1, '#0a1c52')
      g.fillStyle = grad
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60)
      g.strokeStyle = 'rgba(190,205,235,0.35)'
      g.lineWidth = 1
      for (let k = 1; k < 4; k++) {
        g.beginPath(); g.moveTo(x * 64 + 2, y * 64 + k * 16); g.lineTo(x * 64 + 62, y * 64 + k * 16); g.stroke()
      }
    }
  }
  cells = new CanvasTexture(c)
  cells.colorSpace = SRGBColorSpace
  cells.wrapS = cells.wrapT = RepeatWrapping
  cells.anisotropy = 8
  return cells
}

/** Crinkled gold thermal blanket: the look of most real spacecraft bodies. */
function Foil({ color = GOLD }: { color?: string }) {
  const wrinkles = useMemo(() => noiseTexture('foil', 256, 22, 3, 2.2), [])
  return <meshStandardMaterial color={color} metalness={0.72} roughness={0.36} bumpMap={wrinkles} bumpScale={0.035} envMapIntensity={2.2} emissive={color} emissiveIntensity={0.16} />
}
const Metal = ({ color = STEEL, rough = 0.35 }: { color?: string; rough?: number }) =>
  <meshStandardMaterial color={color} metalness={0.9} roughness={rough} envMapIntensity={1.2} />
const Paint = ({ color = '#f2f3f5' }: { color?: string }) => <meshStandardMaterial color={color} metalness={0.1} roughness={0.55} />

// ------------------------------------------------------------ parts

function SolarPanel({ w, h, repeat }: { w: number; h: number; repeat: [number, number] }) {
  const map = useMemo(() => {
    const t = cellTexture().clone()
    t.repeat.set(repeat[0], repeat[1])
    t.needsUpdate = true
    return t
  }, [repeat[0], repeat[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <mesh><boxGeometry args={[w, 0.022, h]} /><Metal color="#8d939c" rough={0.5} /></mesh>
      <mesh position={[0, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.97, h * 0.95]} />
        <meshStandardMaterial map={map} metalness={0.75} roughness={0.22} envMapIntensity={1.6} emissive="#0a1c52" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function Wing({ side, length, width }: { side: 1 | -1; length: number; width: number }) {
  const segs = Math.max(2, Math.round(length / 0.62))
  const seg = length / segs
  return (
    <group>
      {/* yoke */}
      <mesh position={[side * 0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.014, 0.014, 0.22, 12]} /><Metal /></mesh>
      {Array.from({ length: segs }, (_, i) => (
        <group key={i} position={[side * (0.22 + seg * (i + 0.5)), 0, 0]}>
          <SolarPanel w={seg - 0.03} h={width} repeat={[Math.max(1, Math.round((seg / width) * 3)), 3]} />
        </group>
      ))}
    </group>
  )
}

/** A parabolic dish with a feed horn on three struts. */
function Dish({ r }: { r: number }) {
  const geometry = useMemo(() => {
    const pts = Array.from({ length: 17 }, (_, i) => {
      const x = (i / 16) * r
      return new Vector2(x, (x * x) / (r * 2.2))
    })
    return new LatheGeometry(pts, 56)
  }, [r])
  const depth = r / 2.2
  return (
    <group>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[r * 0.1, r * 0.14, 0.06, 20]} /><Metal /></mesh>
      <group position={[0, 0.06, 0]}>
        <mesh geometry={geometry}><meshStandardMaterial color="#f4f5f7" metalness={0.35} roughness={0.4} side={DoubleSide} envMapIntensity={1.1} /></mesh>
        <mesh position={[0, depth + r * 0.5, 0]}><cylinderGeometry args={[r * 0.07, r * 0.045, r * 0.16, 16]} /><Metal color={DARK} /></mesh>
        {[0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3
          return (
            <mesh key={i} position={[Math.cos(a) * r * 0.42, depth * 0.72 + r * 0.25, Math.sin(a) * r * 0.42]}
              rotation={[Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95]}>
              <cylinderGeometry args={[0.006, 0.006, r * 0.95, 6]} /><Metal />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** A bell-shaped rocket nozzle. */
function Bell({ r, len }: { r: number; len: number }) {
  const geometry = useMemo(() => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13
      return new Vector2(r * (0.28 + 0.72 * Math.pow(t, 0.6)), -t * len)
    })
    return new LatheGeometry(pts, 40)
  }, [r, len])
  return <mesh geometry={geometry}><meshStandardMaterial color="#3a3d44" metalness={0.95} roughness={0.28} side={DoubleSide} envMapIntensity={1.3} /></mesh>
}

function Lens({ r, len, glass = '#1b3a8a' }: { r: number; len: number; glass?: string }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, len / 2, 0]}><cylinderGeometry args={[r, r * 1.08, len, 28]} /><Metal color={DARK} rough={0.45} /></mesh>
      <mesh position={[0, len + 0.002, 0]}><cylinderGeometry args={[r * 0.82, r * 0.82, 0.006, 28]} />
        <meshStandardMaterial color={glass} metalness={1} roughness={0.05} envMapIntensity={2.2} emissive={glass} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/** Each science instrument has its own recognisable shape. All sit on the +Z ("front") face. */
function Instrument({ id, s }: { id: InstrumentId; s: number }) {
  const u = s * 0.2
  switch (id) {
    case 'hires_cam': return <Lens r={u * 0.62} len={u * 1.9} />
    case 'multispectral': return <group><Lens r={u * 0.42} len={u * 1.1} glass="#1f6b4a" /><mesh position={[0, 0, u * 0.25]}><boxGeometry args={[u * 1.3, u * 1.3, u * 0.5]} /><Paint color="#dfe3ea" /></mesh></group>
    case 'hyperspectral': return <group><Lens r={u * 0.5} len={u * 1.3} glass="#5a2a8a" /><mesh position={[0, 0, u * 0.3]}><boxGeometry args={[u * 1.5, u * 1.2, u * 0.6]} /><Foil color="#b08ae0" /></mesh></group>
    case 'thermal_ir': return <group><Lens r={u * 0.5} len={u * 1.2} glass="#8a1b1b" /><mesh position={[0, u * 0.75, u * 0.5]}><boxGeometry args={[u * 1.2, u * 0.25, u]} /><Paint /></mesh></group>
    case 'sar': return (
      <group position={[0, 0, u * 0.25]} rotation={[0.5, 0, 0]}>
        <mesh><boxGeometry args={[s * 2.3, u * 1.5, 0.03]} /><Metal color="#c9a15a" rough={0.5} /></mesh>
        {[-0.75, -0.25, 0.25, 0.75].map((x) => <mesh key={x} position={[x * s * 1.15, 0, 0.018]}><boxGeometry args={[0.012, u * 1.5, 0.008]} /><Metal color={DARK} /></mesh>)}
      </group>
    )
    case 'gpr': return (
      <group>
        <mesh position={[0, 0, u * 0.3]}><boxGeometry args={[u, u * 0.7, u * 0.6]} /><Paint color="#cfd6e4" /></mesh>
        {([1, -1] as const).map((side) => <mesh key={side} position={[side * s * 0.95, 0, u * 0.3]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.007, 0.007, s * 1.7, 8]} /><Metal /></mesh>)}
      </group>
    )
    case 'spectrometer': return (
      <group position={[0, 0, u * 0.35]}>
        <mesh><boxGeometry args={[u * 1.1, u * 0.9, u * 0.7]} /><Foil color="#f1cf5b" /></mesh>
        <mesh position={[0, 0, u * 0.36]}><boxGeometry args={[u * 0.7, u * 0.08, 0.01]} /><meshBasicMaterial color="#05070c" /></mesh>
      </group>
    )
    case 'magnetometer': return (
      <group>
        <mesh position={[0, 0, s * 0.75]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.008, 0.008, s * 1.5, 8]} /><Metal /></mesh>
        <mesh position={[0, 0, s * 1.5]}><boxGeometry args={[u * 0.45, u * 0.45, u * 0.7]} /><Paint color="#e9edf5" /></mesh>
      </group>
    )
    case 'radiation': return <mesh position={[0, 0, u * 0.1]}><sphereGeometry args={[u * 0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Metal color="#d86a5a" rough={0.4} /></mesh>
    case 'weather': return (
      <group>
        <mesh position={[0, u * 1.4, u * 0.3]}><cylinderGeometry args={[0.008, 0.008, u * 2.8, 8]} /><Metal /></mesh>
        <mesh position={[0, u * 2.8, u * 0.3]}><boxGeometry args={[u * 1.1, 0.012, u * 0.35]} /><Paint color="#9fd8ff" /></mesh>
        <mesh position={[0, u * 2.3, u * 0.3]}><sphereGeometry args={[u * 0.2, 16, 12]} /><Paint /></mesh>
      </group>
    )
    case 'drill': return (
      <group position={[0, -u, u * 0.5]}>
        <mesh rotation={[0.9, 0, 0]}><cylinderGeometry args={[0.014, 0.014, u * 2.4, 10]} /><Metal /></mesh>
        <mesh position={[0, -u * 1.2, u * 0.9]}><coneGeometry args={[u * 0.2, u * 1.1, 14]} /><Metal color="#7c5a44" rough={0.5} /></mesh>
      </group>
    )
    case 'ir_telescope': return null // drawn separately: it is as big as the spacecraft
  }
}

/** A large infrared telescope: gold segmented mirror at the bottom of a baffle tube. */
function Telescope({ s }: { s: number }) {
  const r = s * 0.48
  return (
    <group position={[0, 0, s / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, r * 1.1, 0]}><cylinderGeometry args={[r, r * 0.92, r * 2.2, 48, 1, true]} /><meshStandardMaterial color="#14161b" metalness={0.6} roughness={0.5} side={DoubleSide} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[r * 0.9, r * 0.9, 0.03, 6]} /><meshStandardMaterial color="#f0c040" metalness={1} roughness={0.08} envMapIntensity={2.4} /></mesh>
      <mesh position={[0, r * 1.7, 0]}><cylinderGeometry args={[r * 0.16, r * 0.16, 0.05, 20]} /><Metal color={DARK} /></mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * r * 0.5, r * 1.7, Math.sin((i * Math.PI * 2) / 3) * r * 0.5]} rotation={[0, -(i * Math.PI * 2) / 3, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, r, 6]} /><Metal />
        </mesh>
      ))}
    </group>
  )
}

// ------------------------------------------------------------ the spacecraft

/** The spacecraft, assembled from the parts chosen so far. Every option changes what you see. */
export function SpacecraftModel({ design }: { design: Partial<Design> }) {
  const s = BUS[(design.structure as keyof typeof BUS) ?? 'medium'] ?? BUS.medium
  const hasBus = Boolean(design.structure)
  const half = s / 2
  const h = s * 1.15
  const instruments = design.instruments ?? []
  const small = instruments.filter((i) => i !== 'ir_telescope')
  const lander = design.protection === 'mars_edl'
  const cols = Math.max(1, Math.ceil(Math.sqrt(small.length)))
  const rows = Math.max(1, Math.ceil(small.length / cols))

  const shield = useMemo(() => new LatheGeometry(
    Array.from({ length: 12 }, (_, i) => new Vector2((i / 11) * s * 1.35, -Math.pow(i / 11, 1.6) * s * 0.42 + s * 0.42)), 56), [s])

  return (
    <group>
      {/* body */}
      {hasBus ? (
        <group>
          <RoundedBox args={[s, h, s]} radius={s * 0.035} smoothness={4}><Foil /></RoundedBox>
          <mesh position={[0, h / 2 + 0.006, 0]}><boxGeometry args={[s * 0.96, 0.012, s * 0.96]} /><Metal color="#d9dde4" rough={0.45} /></mesh>
          <mesh position={[0, -h / 2 - 0.006, 0]}><boxGeometry args={[s * 0.96, 0.012, s * 0.96]} /><Metal color={DARK} /></mesh>
          {/* access panels on the back face */}
          <mesh position={[0, 0, -half - 0.004]}><boxGeometry args={[s * 0.6, h * 0.5, 0.008]} /><Metal color="#c7ccd4" rough={0.5} /></mesh>
        </group>
      ) : (
        <mesh><boxGeometry args={[s, h, s]} /><meshBasicMaterial color="#6b7280" wireframe /></mesh>
      )}

      {design.protection === 'rad_shield' && (
        <RoundedBox args={[s * 1.14, h * 1.1, s * 1.14]} radius={s * 0.05} smoothness={4}>
          <meshStandardMaterial color="#5b616b" metalness={1} roughness={0.25} transparent opacity={0.55} envMapIntensity={1.5} />
        </RoundedBox>
      )}

      {/* thermal: white radiator panels */}
      {(design.thermal === 'heaters' || design.thermal === 'active') && hasBus && (
        <mesh position={[0, h * 0.12, -half - 0.012]}><boxGeometry args={[s * 0.82, h * 0.42, 0.012]} /><Paint /></mesh>
      )}
      {design.thermal === 'active' && hasBus && [-1, 1].map((x) => (
        <mesh key={x} position={[x * (half + 0.012), -h * 0.15, 0]}><boxGeometry args={[0.012, h * 0.4, s * 0.7]} /><Paint /></mesh>
      ))}

      {/* attitude: star trackers and thruster quads */}
      {design.attitude === 'wheels_star' && hasBus && [-1, 1].map((x) => (
        <group key={x} position={[x * half * 0.6, h / 2 + 0.03, -half * 0.55]} rotation={[-0.5, 0, x * 0.3]}>
          <mesh><cylinderGeometry args={[0.03, 0.022, 0.09, 16]} /><Metal color={DARK} /></mesh>
        </group>
      ))}

      {/* power */}
      {design.power === 'body_solar' && [0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <group position={[0, 0, half + 0.014]} rotation={[Math.PI / 2, 0, 0]}><SolarPanel w={s * 0.86} h={h * 0.86} repeat={[3, 4]} /></group>
        </group>
      ))}
      {(design.power === 'deploy_solar' || design.power === 'large_solar') && ([1, -1] as const).map((side) => (
        <group key={side} position={[side * half, 0, 0]}>
          <Wing side={side} length={design.power === 'large_solar' ? 2.7 : 1.45} width={design.power === 'large_solar' ? 0.78 : 0.56} />
        </group>
      ))}
      {design.power === 'rtg' && (
        <group position={[-(half + 0.5), -h * 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.012, 0.012, 0.4, 8]} /><Metal /></mesh>
          <mesh><cylinderGeometry args={[0.085, 0.085, 0.62, 24]} /><meshStandardMaterial color="#2a2c31" metalness={0.8} roughness={0.4} emissive="#ff5a1f" emissiveIntensity={0.35} /></mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 4, 0]} position={[Math.cos((i * Math.PI) / 4) * 0.13, 0, -Math.sin((i * Math.PI) / 4) * 0.13]}>
              <boxGeometry args={[0.1, 0.56, 0.008]} /><Metal color="#3a3d44" rough={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {/* communications, on the top deck */}
      <group position={[0, h / 2 + 0.012, 0]}>
        {design.antenna === 'omni' && (
          <group position={[half * 0.6, 0, half * 0.55]}>
            <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.007, 0.007, 0.4, 8]} /><Metal /></mesh>
            <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.018, 12, 10]} /><Paint /></mesh>
          </group>
        )}
        {design.antenna === 'medium' && (
          <group position={[half * 0.45, 0, half * 0.45]}>
            <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.24, 0.035, 0.24]} /><Paint /></mesh>
            <mesh position={[0, 0.045, 0]}><boxGeometry args={[0.2, 0.012, 0.2]} /><Metal color="#c9a15a" rough={0.5} /></mesh>
          </group>
        )}
        {design.antenna === 'hga' && <group position={[half * 0.25, 0, -half * 0.25]} rotation={[0.25, 0, -0.2]}><Dish r={0.36} /></group>}
        {design.antenna === 'dsa' && <Dish r={Math.max(0.78, s * 0.85)} />}
      </group>

      {/* propulsion, on the bottom deck */}
      <group position={[0, -h / 2 - 0.012, 0]}>
        {design.propulsion === 'cold_gas' && [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x * half * 0.82, 0, z * half * 0.82]}><Bell r={0.035} len={0.07} /></group>
        ))}
        {design.propulsion === 'chemical' && (
          <group>
            <mesh position={[0, -0.02, 0]}><sphereGeometry args={[s * 0.3, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Foil color="#d99a1e" /></mesh>
            <group position={[0, -s * 0.28, 0]}><Bell r={s * 0.24} len={s * 0.36} /></group>
          </group>
        )}
        {design.propulsion === 'ion' && (
          <group position={[0, -0.03, 0]}>
            <mesh><cylinderGeometry args={[s * 0.2, s * 0.24, 0.07, 32]} /><Metal color={DARK} /></mesh>
            <mesh position={[0, -0.04, 0]}><cylinderGeometry args={[s * 0.17, s * 0.17, 0.01, 32]} /><meshBasicMaterial color="#7fd0ff" toneMapped={false} /></mesh>
            <mesh position={[0, -0.22, 0]}><coneGeometry args={[s * 0.16, 0.36, 24, 1, true]} /><meshBasicMaterial color="#4aa8ff" transparent opacity={0.28} depthWrite={false} side={DoubleSide} /></mesh>
          </group>
        )}
      </group>

      {/* protection */}
      {design.protection === 'sunshield' && [0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -h / 2 - 0.3 - i * 0.045, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[1, 1.5, 1]}>
          <circleGeometry args={[s * (1.55 - i * 0.07), 4]} />
          <meshStandardMaterial color={i === 0 ? '#e9d7ff' : '#cdb7ee'} metalness={1} roughness={0.12} side={DoubleSide} envMapIntensity={2} />
        </mesh>
      ))}
      {lander && (
        <group position={[0, -h / 2 - s * 0.42, 0]}>
          <mesh geometry={shield}><meshStandardMaterial color="#a8794c" roughness={0.9} metalness={0.05} side={DoubleSide} /></mesh>
          {[0, 1, 2].map((i) => {
            const a = (i * Math.PI * 2) / 3
            return (
              <mesh key={i} position={[Math.cos(a) * s * 0.75, s * 0.25, Math.sin(a) * s * 0.75]} rotation={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]}>
                <cylinderGeometry args={[0.012, 0.012, s * 0.75, 8]} /><Metal />
              </mesh>
            )
          })}
        </group>
      )}

      {/* science payload */}
      {instruments.includes('ir_telescope') && <Telescope s={s} />}
      {small.map((id, i) => {
        const x = ((i % cols) - (cols - 1) / 2) * (s / cols) * 0.82
        const y = ((rows - 1) / 2 - Math.floor(i / cols)) * (h / rows) * 0.7
        return <group key={id} position={[x, y, half + 0.004]}><Instrument id={id} s={s / Math.max(1, cols * 0.75)} /></group>
      })}
    </group>
  )
}
