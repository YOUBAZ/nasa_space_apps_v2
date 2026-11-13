import { Planet, Spin, Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

/** Title-screen backdrop: a low-poly Earth with a spacecraft drifting past. */
export default function HeroScene() {
  return (
    <Stage camera={[0, 0.4, 6]} fov={45}>
      <group position={[3.4, -2.6, -1]}><Planet body="earth" radius={3.2} spin={0.04} /></group>
      <group position={[-2.6, 1.5, -1.5]} scale={0.55} rotation={[0.4, 0.6, 0.2]}>
        <Spin speed={0.25}>
          <SpacecraftModel design={{ structure: 'medium', power: 'deploy_solar', antenna: 'hga', propulsion: 'chemical', instruments: ['hires_cam', 'thermal_ir'] }} />
        </Spin>
      </group>
    </Stage>
  )
}
