import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Color, SRGBColorSpace, TextureLoader, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type Texture } from 'three'
import { ELON_HEAD_URL } from './head'
import type { ElonPose } from './poses'
import { elonRig } from './rig'

const SKIN = new Color('#e9bd9a')
const FLUSHED = new Color('#e2664f')
const HAIR = '#33241b'
const SHIRT = '#15161a'
const JEANS = '#27303f'
const SHOE = '#0b0b0d'

// proportions of an adult, in metres
const HIP = 0.95
const SHOULDER = 1.46
const UPPER = 0.29
const FORE = 0.27
const THIGH = 0.45
const SHIN = 0.45

function Skin({ refs }: { refs: React.MutableRefObject<MeshStandardMaterial[]> }) {
  return <meshStandardMaterial ref={(m) => { if (m && !refs.current.includes(m)) refs.current.push(m) }} color={SKIN} roughness={0.62} metalness={0} />
}

let headCache: Texture | null = null
/** The cut-out photo of the real face. Null until it loads; the modelled head is used meanwhile. */
function useHeadPhoto(): Texture | null {
  const [tex, setTex] = useState<Texture | null>(headCache)
  useEffect(() => {
    if (headCache) { setTex(headCache); return } // another figure on the page already loaded it
    let alive = true
    new TextureLoader().load(ELON_HEAD_URL, (t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 8; headCache = t; if (alive) setTex(t) }, undefined, () => {})
    return () => { alive = false }
  }, [])
  return tex
}
const CALM = new Color('#ffffff')
const RED_FACE = new Color('#ff9c8c')

function Figure({ pose }: { pose: ElonPose }) {
  const photo = useHeadPhoto()
  const face = useRef<MeshBasicMaterial>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const mouth = useRef<Mesh>(null)
  const browL = useRef<Mesh>(null)
  const browR = useRef<Mesh>(null)
  const shadow = useRef<Mesh>(null)
  const arm = { l: useRef<Group>(null), r: useRef<Group>(null), le: useRef<Group>(null), re: useRef<Group>(null) }
  const leg = { l: useRef<Group>(null), r: useRef<Group>(null), lk: useRef<Group>(null), rk: useRef<Group>(null) }
  const skin = useRef<MeshStandardMaterial[]>([])
  const tint = useRef(new Color())

  useFrame(({ clock }) => {
    const r = elonRig(pose, clock.elapsedTime)
    if (body.current) {
      body.current.position.y = r.lift
      body.current.rotation.set(0, r.turn, r.lean)
    }
    // a flat photo cannot turn sideways, so a head shake becomes a side-to-side rock
    if (head.current) head.current.rotation.set(photo ? 0 : r.head.nod, photo ? 0 : r.head.turn, r.head.tilt + (photo ? r.head.turn * 0.6 : 0))
    if (face.current) face.current.color.copy(CALM).lerp(RED_FACE, r.anger)
    // the figure faces the viewer (+z); its left arm is on the viewer's right (+x)
    arm.l.current?.rotation.set(-r.armL.raise, 0, r.armL.out)
    arm.r.current?.rotation.set(-r.armR.raise, 0, -r.armR.out)
    arm.le.current?.rotation.set(-r.armL.elbow, 0, 0)
    arm.re.current?.rotation.set(-r.armR.elbow, 0, 0)
    leg.l.current?.rotation.set(-r.legL.swing, 0, 0)
    leg.r.current?.rotation.set(-r.legR.swing, 0, 0)
    leg.lk.current?.rotation.set(r.legL.knee, 0, 0)
    leg.rk.current?.rotation.set(r.legR.knee, 0, 0)
    if (mouth.current) mouth.current.scale.set(1 + r.mouth * 0.25, 0.25 + r.mouth * 1.5, 1)
    const frown = r.anger * 0.45
    if (browL.current) browL.current.rotation.z = -frown
    if (browR.current) browR.current.rotation.z = frown
    tint.current.copy(SKIN).lerp(FLUSHED, r.anger * 0.75)
    for (const m of skin.current) m.color.copy(tint.current)
    if (shadow.current) shadow.current.scale.setScalar(1 - r.lift * 1.6)
  })

  const Arm = ({ side, shoulder, elbow }: { side: 1 | -1; shoulder: React.RefObject<Group>; elbow: React.RefObject<Group> }) => (
    <group ref={shoulder} position={[side * 0.215, SHOULDER, 0]}>
      {/* short sleeve, then bare arm */}
      <mesh position={[0, -0.09, 0]}><capsuleGeometry args={[0.062, 0.1, 8, 16]} /><meshStandardMaterial color={SHIRT} roughness={0.85} /></mesh>
      <mesh position={[0, -UPPER * 0.62, 0]}><capsuleGeometry args={[0.048, UPPER * 0.5, 8, 16]} /><Skin refs={skin} /></mesh>
      <group ref={elbow} position={[0, -UPPER, 0]}>
        <mesh position={[0, -FORE / 2, 0]}><capsuleGeometry args={[0.042, FORE - 0.08, 8, 16]} /><Skin refs={skin} /></mesh>
        <mesh position={[0, -FORE - 0.03, 0]} scale={[1, 1.15, 0.75]}><sphereGeometry args={[0.052, 16, 12]} /><Skin refs={skin} /></mesh>
      </group>
    </group>
  )
  const Leg = ({ side, hip, knee }: { side: 1 | -1; hip: React.RefObject<Group>; knee: React.RefObject<Group> }) => (
    <group ref={hip} position={[side * 0.095, HIP, 0]}>
      <mesh position={[0, -THIGH / 2, 0]}><capsuleGeometry args={[0.082, THIGH - 0.14, 8, 16]} /><meshStandardMaterial color={JEANS} roughness={0.9} /></mesh>
      <group ref={knee} position={[0, -THIGH, 0]}>
        <mesh position={[0, -SHIN / 2, 0]}><capsuleGeometry args={[0.066, SHIN - 0.12, 8, 16]} /><meshStandardMaterial color={JEANS} roughness={0.9} /></mesh>
        <mesh position={[0, -SHIN - 0.01, 0.05]} scale={[1, 0.55, 1.9]}><sphereGeometry args={[0.075, 16, 12]} /><meshStandardMaterial color={SHOE} roughness={0.5} /></mesh>
      </group>
    </group>
  )

  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.36, 32]} /><meshBasicMaterial color="#000" transparent opacity={0.4} />
      </mesh>
      <group ref={body}>
        <Leg side={1} hip={leg.l} knee={leg.lk} />
        <Leg side={-1} hip={leg.r} knee={leg.rk} />

        {/* torso: black T-shirt with a small red rocket */}
        <mesh position={[0, 1.2, 0]} scale={[1, 1, 0.62]}><capsuleGeometry args={[0.205, 0.3, 10, 24]} /><meshStandardMaterial color={SHIRT} roughness={0.85} /></mesh>
        <mesh position={[0, HIP + 0.03, 0]} scale={[1, 0.6, 0.66]}><sphereGeometry args={[0.2, 20, 14]} /><meshStandardMaterial color={JEANS} roughness={0.9} /></mesh>
        <group position={[0, 1.29, 0.128]}>
          <mesh><coneGeometry args={[0.028, 0.09, 12]} /><meshStandardMaterial color="#f64137" roughness={0.5} /></mesh>
          <mesh position={[0, 0.005, 0.02]}><sphereGeometry args={[0.009, 10, 8]} /><meshBasicMaterial color="#fff" /></mesh>
        </group>

        <Arm side={1} shoulder={arm.l} elbow={arm.le} />
        <Arm side={-1} shoulder={arm.r} elbow={arm.re} />

        {/* neck and head */}
        <mesh position={[0, 1.555, 0]}><cylinderGeometry args={[0.052, 0.06, 0.1, 16]} /><Skin refs={skin} /></mesh>
        <group ref={head} position={[0, 1.6, 0]}>
          {photo ? (
            // the real face: a cut-out NASA photo, oversized, as satire puppets are, so it reads at small sizes; chin at the neck
            <mesh position={[0.015, 0.235, 0.03]}>
              <planeGeometry args={[0.52 * (480 / 570), 0.52]} />
              <meshBasicMaterial ref={face} map={photo} transparent alphaTest={0.04} toneMapped={false} />
            </mesh>
          ) : (
          <group position={[0, 0.115, 0]}>
              {/* skull, a broad jaw, ears, nose */}
              <mesh scale={[0.92, 1.12, 1]}><sphereGeometry args={[0.112, 32, 24]} /><Skin refs={skin} /></mesh>
              <mesh position={[0, -0.062, 0.012]} scale={[0.86, 0.62, 0.9]}><sphereGeometry args={[0.105, 24, 16]} /><Skin refs={skin} /></mesh>
              {[1, -1].map((s) => <mesh key={s} position={[s * 0.103, -0.005, -0.005]} scale={[0.45, 1, 0.75]}><sphereGeometry args={[0.03, 12, 10]} /><Skin refs={skin} /></mesh>)}
              <mesh position={[0, -0.018, 0.108]} scale={[0.8, 1.25, 1]}><sphereGeometry args={[0.02, 12, 10]} /><Skin refs={skin} /></mesh>
              {/* dark hair, swept to one side */}
              <mesh position={[0, 0.022, -0.012]} scale={[0.97, 1.08, 1.04]}>
                <sphereGeometry args={[0.118, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} /><meshStandardMaterial color={HAIR} roughness={0.75} />
              </mesh>
              <mesh position={[0.03, 0.098, 0.062]} rotation={[0.5, 0, -0.35]} scale={[1.5, 0.5, 0.9]}><sphereGeometry args={[0.05, 16, 12]} /><meshStandardMaterial color={HAIR} roughness={0.75} /></mesh>
              <mesh position={[0, -0.01, -0.07]} scale={[0.98, 1, 0.8]}><sphereGeometry args={[0.112, 20, 14]} /><meshStandardMaterial color={HAIR} roughness={0.75} /></mesh>
              {/* eyes and brows */}
              {[1, -1].map((s) => (
                <group key={s} position={[s * 0.04, 0.012, 0.098]}>
                  <mesh scale={[1.25, 0.8, 0.5]}><sphereGeometry args={[0.016, 12, 10]} /><meshStandardMaterial color="#f4f4f4" roughness={0.3} /></mesh>
                  <mesh position={[0, 0, 0.008]}><sphereGeometry args={[0.008, 10, 8]} /><meshStandardMaterial color="#3a4a52" roughness={0.3} /></mesh>
                </group>
              ))}
              <mesh ref={browL} position={[0.04, 0.04, 0.103]}><boxGeometry args={[0.04, 0.008, 0.01]} /><meshStandardMaterial color={HAIR} /></mesh>
              <mesh ref={browR} position={[-0.04, 0.04, 0.103]}><boxGeometry args={[0.04, 0.008, 0.01]} /><meshStandardMaterial color={HAIR} /></mesh>
              {/* mouth: grows when he shouts */}
              <mesh ref={mouth} position={[0, -0.062, 0.1]} scale={[1, 0.3, 1]}><sphereGeometry args={[0.022, 16, 12]} /><meshStandardMaterial color="#4a1512" roughness={0.6} /></mesh>
            </group>
          )}
        </group>
      </group>
    </>
  )
}

/** The Flight Director: a real photo of Elon Musk's face on an animated 3D body, in the tradition of photo-head satire puppets. */
export default function Elon3D({ pose, size }: { pose: ElonPose; size: number }) {
  return (
    <Canvas dpr={[1, 2]} style={{ width: size, height: size * 1.3 }} camera={{ position: [0.5, 1.3, 3.35], fov: 36 }}
      gl={{ antialias: true, alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 1.12, 0)}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 4]} intensity={2.4} color="#fff4e6" />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#7aa7ff" />
      <Figure pose={pose} />
    </Canvas>
  )
}
