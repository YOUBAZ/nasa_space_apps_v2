import { Planet, Spin, Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

/** Title-screen backdrop: the real Earth turning slowly, with a spacecraft drifting past. */
export default function HeroScene() {
  return (
    <Stage camera={[0, 0.4, 6]} fov={45} fill={0.3}>
      <group position={[3.5, -2.7, -1]}><Planet body="earth" radius={3.3} spin={0.025} /></group>
      <group position={[-2.5, 1.45, -1.2]} scale={0.5} rotation={[0.4, 0.6, 0.2]}>
        <Spin speed={0.22}>
          <SpacecraftModel design={{ structure: 'medium', power: 'deploy_solar', antenna: 'hga', propulsion: 'chemical', thermal: 'heaters', attitude: 'wheels_star', instruments: ['hires_cam', 'thermal_ir'] }} />
        </Spin>
      </group>
    </Stage>
  )
}
