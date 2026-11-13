import { OrbitControls } from '@react-three/drei'
import type { Design } from '../../engine/types'
import { Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

/** The live spacecraft preview: it grows as the team picks parts. Drag to look around. */
export default function Spacecraft3D({ design }: { design: Partial<Design> }) {
  const wide = design.power === 'large_solar' ? 7.4 : design.power === 'deploy_solar' ? 5.6 : 4.4
  return (
    <Stage camera={[wide * 0.55, wide * 0.38, wide * 0.72]} fov={38}>
      <SpacecraftModel design={design} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.6} />
    </Stage>
  )
}
