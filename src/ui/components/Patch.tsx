import type { Patch as PatchData } from '../../engine/state'
import { objName } from '../names'

const SHAPE: Record<PatchData['shape'], string> = {
  circle: 'M50 4 a46 46 0 1 0 0.01 0 z',
  shield: 'M8 10 h84 v42 q0 30 -42 44 q-42 -14 -42 -44 z',
  hexagon: 'M50 3 L92 27 V73 L50 97 L8 73 V27 Z',
  triangle: 'M50 4 L96 90 H4 Z',
}
const ICON: Record<string, string> = {
  flame: 'M50 30c3 12 15 15 15 30a15 15 0 0 1-30 0c0-6 3-9 6-12 0 6 3 9 6 9 0-9-3-15 3-27z',
  snowflake: 'M50 28v44M31 39l38 22M31 61l38-22',
  leaf: 'M34 68c0-22 12-34 34-34 0 24-12 36-32 36M34 68l18-18',
  star: 'M50 28l6.5 14 15 2-11 10.5 3 15L50 62l-13.5 7.5 3-15-11-10.5 15-2z',
  rock: 'M32 54l7-16 14-6 14 9 2 16-12 11H40z',
  planet: 'M50 36a14 14 0 1 0 0 28 14 14 0 0 0 0-28zM28 56c-3-3 5-9 18-14s26-5 26 0-7 9-18 14',
  drop: 'M50 28c9 11 14 18 14 25a14 14 0 0 1-28 0c0-7 5-14 14-25z',
  flag: 'M38 72V30M38 32h24l-4 9 4 9H38',
  drill: 'M43 28h14v14H43zM46 42l4 28 4-28',
}

/** A mission patch, drawn from the engine's deterministic recipe. Failed missions are greyed. */
export function Patch({ patch, size = 96 }: { patch: PatchData; size?: number }) {
  const lost = patch.outcome === 'failure'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={objName(patch.objectiveId)}
      style={{ filter: lost ? 'grayscale(1) opacity(0.6)' : undefined }}>
      <path d={SHAPE[patch.shape]} fill={patch.colorA} stroke="#f6f6f6" strokeWidth="3" />
      <path d={SHAPE[patch.shape]} fill="none" stroke={patch.colorB} strokeWidth="2.5" transform="translate(9 9) scale(0.82)" />
      <path d={ICON[patch.icon] ?? ICON.star} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        transform={patch.shape === 'triangle' ? 'translate(0 12) scale(0.9) translate(5.5 0)' : undefined} />
      {patch.outcome === 'partial' && <circle cx="80" cy="20" r="7" fill="#ea6f24" stroke="#fff" strokeWidth="2" />}
    </svg>
  )
}
