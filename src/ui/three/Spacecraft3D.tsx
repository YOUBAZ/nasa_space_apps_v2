import { OrbitControls } from '@react-three/drei'
import type { Design } from '../../engine/types'
import { useExpanded } from '../components/View3D'
import { Stage } from './common'
import { SpacecraftModel } from './SpacecraftModel'

/** The live spacecraft preview: it grows as the team picks parts. Drag to look around; zoom when expanded. */
export default function Spacecraft3D({ design }: { design: Partial<Design> }) {
  const expanded = useExpanded()
  const wide = design.power === 'large_solar' ? 8.4 : design.power === 'deploy_solar' ? 5.8 : 4.2
  return (
    <Stage camera={[wide * 0.5, wide * 0.36, wide * 0.72]} fov={36} fill={0.7}>
      <SpacecraftModel design={design} />
      <OrbitControls enablePan={false} enableZoom={expanded} minDistance={1.6} maxDistance={16} autoRotate autoRotateSpeed={1.2} />
    </Stage>
  )
}
