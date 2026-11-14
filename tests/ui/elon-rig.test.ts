import { elonRig, REST } from '../../src/ui/elon/rig'
import { ELON_POSES } from '../../src/ui/elon/poses'

const sample = (pose: Parameters<typeof elonRig>[0]) => Array.from({ length: 120 }, (_, i) => elonRig(pose, i / 30))
const max = (xs: number[]) => Math.max(...xs)
const min = (xs: number[]) => Math.min(...xs)

describe('3D Elon rig', () => {
  it('every pose gives finite joint angles at any time', () => {
    for (const pose of ELON_POSES) {
      for (const r of sample(pose)) {
        const flat = [r.lift, r.lean, r.turn, r.head.turn, r.head.tilt, r.head.nod, r.mouth, r.anger,
          r.armL.raise, r.armL.out, r.armL.elbow, r.armR.raise, r.armR.out, r.armR.elbow, r.legL.swing, r.legL.knee, r.legR.swing, r.legR.knee]
        expect(flat.every(Number.isFinite)).toBe(true)
      }
    }
  })
  it('idle stays close to standing still', () => {
    for (const r of sample('idle')) {
      expect(Math.abs(r.armL.raise - REST.armL.raise)).toBeLessThan(0.15)
      expect(Math.abs(r.legR.swing)).toBeLessThan(0.05)
      expect(r.anger).toBe(0)
    }
  })
  it('tantrum: the right leg kicks hard, the fists are up, the head shakes and the mouth is open', () => {
    const frames = sample('tantrum')
    expect(max(frames.map((r) => r.legR.swing))).toBeGreaterThan(0.9) // a real kick forward
    expect(min(frames.map((r) => r.legR.swing))).toBeLessThan(0.1) // and back down to stamp
    expect(min(frames.map((r) => r.armL.raise))).toBeGreaterThan(1.2)
    expect(max(frames.map((r) => r.head.turn)) - min(frames.map((r) => r.head.turn))).toBeGreaterThan(0.3)
    expect(min(frames.map((r) => r.mouth))).toBeGreaterThan(0.5)
    expect(frames[0].anger).toBe(1)
  })
  it('celebrate: both arms overhead and the whole body jumps', () => {
    const frames = sample('celebrate')
    expect(min(frames.map((r) => Math.min(r.armL.raise, r.armR.raise)))).toBeGreaterThan(2.2)
    expect(max(frames.map((r) => r.lift))).toBeGreaterThan(0.12)
    expect(min(frames.map((r) => r.lift))).toBeGreaterThanOrEqual(0)
  })
  it('point: only the right arm reaches forward', () => {
    const frames = sample('point')
    expect(min(frames.map((r) => r.armR.raise))).toBeGreaterThan(1.1)
    expect(max(frames.map((r) => r.armL.raise))).toBeLessThan(0.4)
  })
  it('shrug: both arms out to the sides with bent elbows, head tilted', () => {
    const frames = sample('shrug')
    expect(min(frames.map((r) => Math.min(r.armL.out, r.armR.out)))).toBeGreaterThan(0.5)
    expect(min(frames.map((r) => Math.min(r.armL.elbow, r.armR.elbow)))).toBeGreaterThan(1)
    expect(max(frames.map((r) => Math.abs(r.head.tilt)))).toBeGreaterThan(0.1)
  })
})
