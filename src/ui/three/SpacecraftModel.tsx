import { DoubleSide } from 'three'
import type { Design, InstrumentId } from '../../engine/types'

const BUS = { small: 0.55, medium: 0.8, large: 1.15 } as const
const INSTRUMENT_COLOR: Record<InstrumentId, string> = {
  hires_cam: '#f6f6f6', multispectral: '#47da84', hyperspectral: '#b97cf3', thermal_ir: '#f64137', sar: '#ea6f24',
  gpr: '#288bff', spectrometer: '#ffd166', magnetometer: '#9a9aa0', radiation: '#ff5c52', weather: '#7fdbff',
  ir_telescope: '#d4af37', drill: '#8d6e63',
}
const PANEL = '#1b4bb0'
const FOIL = '#e8b82e'

function Wing({ side, length, width }: { side: 1 | -1; length: number; width: number }) {
  const segs = Math.max(1, Math.round(length / 0.8))
  return (
    <group>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} position={[side * (length / segs) * (i + 0.5), 0, 0]}>
          <boxGeometry args={[length / segs - 0.04, 0.03, width]} />
          <meshStandardMaterial color={PANEL} metalness={0.6} roughness={0.3} emissive="#0b2a66" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function Dish({ r }: { r: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI, 0, 0]} position={[0, r * 0.55, 0]}>
        <sphereGeometry args={[r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        <meshStandardMaterial color="#f6f6f6" side={DoubleSide} roughness={0.5} />
      </mesh>
      <mesh position={[0, r * 0.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, r * 0.9, 6]} />
        <meshStandardMaterial color="#959599" />
      </mesh>
    </group>
  )
}

/** The spacecraft, assembled from simple shapes according to the parts chosen so far. */
export function SpacecraftModel({ design }: { design: Partial<Design> }) {
  const s = BUS[(design.structure as keyof typeof BUS) ?? 'medium'] ?? BUS.medium
  const hasBus = Boolean(design.structure)
  const instruments = design.instruments ?? []
  const half = s / 2
  const lander = design.protection === 'mars_edl'
  return (
    <group>
      {/* bus */}
      <mesh>
        <boxGeometry args={[s, s * 1.15, s]} />
        {hasBus
          ? <meshStandardMaterial color={FOIL} metalness={0.35} roughness={0.45} emissive={FOIL} emissiveIntensity={0.18} flatShading />
          : <meshBasicMaterial color="#58585b" wireframe />}
      </mesh>
      {design.protection === 'rad_shield' && (
        <mesh>
          <boxGeometry args={[s * 1.12, s * 1.27, s * 1.12]} />
          <meshStandardMaterial color="#444447" metalness={0.9} roughness={0.4} transparent opacity={0.75} />
        </mesh>
      )}

      {/* power */}
      {design.power === 'body_solar' && [0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * (half + 0.012), 0, Math.cos((i * Math.PI) / 2) * (half + 0.012)]}>
          <planeGeometry args={[s * 0.82, s * 0.95]} />
          <meshStandardMaterial color={PANEL} metalness={0.6} roughness={0.3} side={DoubleSide} />
        </mesh>
      ))}
      {(design.power === 'deploy_solar' || design.power === 'large_solar') && ([1, -1] as const).map((side) => (
        <group key={side} position={[side * half, 0, 0]}>
          <Wing side={side} length={design.power === 'large_solar' ? 2.6 : 1.4} width={design.power === 'large_solar' ? 0.75 : 0.55} />
        </group>
      ))}
      {design.power === 'rtg' && (
        <group position={[-(half + 0.45), -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh><cylinderGeometry args={[0.1, 0.1, 0.8, 8]} /><meshStandardMaterial color="#2e2e32" emissive="#ea6f24" emissiveIntensity={0.6} /></mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
              <boxGeometry args={[0.36, 0.7, 0.015]} /><meshStandardMaterial color="#444447" />
            </mesh>
          ))}
        </group>
      )}

      {/* communications */}
      <group position={[0, s * 0.575, 0]}>
        {design.antenna === 'omni' && <mesh position={[half * 0.6, 0.2, half * 0.6]}><cylinderGeometry args={[0.012, 0.012, 0.4, 6]} /><meshStandardMaterial color="#f6f6f6" /></mesh>}
        {design.antenna === 'medium' && <mesh position={[half * 0.5, 0.03, half * 0.5]}><boxGeometry args={[0.22, 0.04, 0.22]} /><meshStandardMaterial color="#f6f6f6" /></mesh>}
        {design.antenna === 'hga' && <group position={[half * 0.3, 0, -half * 0.3]}><Dish r={0.34} /></group>}
        {design.antenna === 'dsa' && <Dish r={Math.max(0.75, s * 0.8)} />}
      </group>

      {/* propulsion */}
      <group position={[0, -s * 0.575, 0]}>
        {design.propulsion === 'cold_gas' && [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x * half * 0.8, -0.03, z * half * 0.8]}><coneGeometry args={[0.04, 0.09, 8]} /><meshStandardMaterial color="#959599" /></mesh>
        ))}
        {design.propulsion === 'chemical' && (
          <mesh position={[0, -0.16, 0]}><coneGeometry args={[s * 0.28, 0.34, 14, 1, true]} /><meshStandardMaterial color="#58585b" metalness={0.8} roughness={0.3} side={DoubleSide} /></mesh>
        )}
        {design.propulsion === 'ion' && (
          <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[s * 0.22, 0.04, 8, 20]} /><meshStandardMaterial color="#288bff" emissive="#288bff" emissiveIntensity={1.6} /></mesh>
        )}
      </group>

      {/* protection */}
      {design.protection === 'sunshield' && (
        <mesh position={[0, -s * 0.9, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[s * 2.4, s * 2.4]} />
          <meshStandardMaterial color="#d9c7f0" metalness={0.9} roughness={0.2} side={DoubleSide} />
        </mesh>
      )}
      {lander && (
        <mesh position={[0, -s * 0.75, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[s * 1.25, s * 0.5, 20, 1, true]} />
          <meshStandardMaterial color="#b98a5a" roughness={0.9} side={DoubleSide} flatShading />
        </mesh>
      )}

      {/* instruments: coloured blocks on the front face; a telescope is a big tube */}
      {instruments.map((id, i) => {
        const cols = Math.ceil(Math.sqrt(instruments.length))
        const x = ((i % cols) - (cols - 1) / 2) * (s / cols)
        const y = (Math.floor(i / cols) - (Math.ceil(instruments.length / cols) - 1) / 2) * (s / cols) * 0.9
        if (id === 'ir_telescope') {
          return (
            <mesh key={id} position={[0, 0, half + 0.45]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[s * 0.42, s * 0.36, 0.9, 16, 1, true]} />
              <meshStandardMaterial color={INSTRUMENT_COLOR[id]} metalness={0.8} roughness={0.25} side={DoubleSide} />
            </mesh>
          )
        }
        const size = Math.min(0.22, (s / cols) * 0.7)
        return (
          <mesh key={id} position={[x, y, half + size / 2]}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial color={INSTRUMENT_COLOR[id]} emissive={INSTRUMENT_COLOR[id]} emissiveIntensity={0.25} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}
