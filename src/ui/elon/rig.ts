import type { ElonPose } from './poses'

/** Joint angles in radians. `raise` swings an arm forward and up; `out` lifts it sideways; `swing` kicks a leg forward. */
export interface Limb { raise: number; out: number; elbow: number }
export interface Leg { swing: number; knee: number }
export interface Rig {
  /** how far the whole body is off the ground */
  lift: number
  /** side-to-side lean and turn of the torso */
  lean: number
  turn: number
  head: { turn: number; tilt: number; nod: number }
  /** 0 closed … 1 wide open */
  mouth: number
  /** 0 calm … 1 red in the face */
  anger: number
  armL: Limb
  armR: Limb
  legL: Leg
  legR: Leg
}

export const REST: Rig = {
  lift: 0, lean: 0, turn: 0,
  head: { turn: 0, tilt: 0, nod: 0 },
  mouth: 0.08, anger: 0,
  armL: { raise: 0.06, out: 0.1, elbow: 0.15 },
  armR: { raise: 0.06, out: 0.1, elbow: 0.15 },
  legL: { swing: 0, knee: 0 },
  legR: { swing: 0, knee: 0 },
}

const wave = (t: number, perSecond: number) => Math.sin(t * perSecond * Math.PI * 2)

/** Where every joint is at time `t` (seconds) for a pose. Pure, so the motion can be tested without a browser. */
export function elonRig(pose: ElonPose, t: number): Rig {
  const breathe = wave(t, 0.3) * 0.02
  switch (pose) {
    case 'idle':
      return {
        ...REST, lean: wave(t, 0.15) * 0.02,
        head: { turn: wave(t, 0.12) * 0.12, tilt: 0, nod: breathe },
        armL: { ...REST.armL, raise: REST.armL.raise + breathe }, armR: { ...REST.armR, raise: REST.armR.raise + breathe },
      }
    case 'point': {
      const tap = wave(t, 0.9) * 0.08
      return {
        ...REST, turn: -0.15, lean: 0.03,
        head: { turn: -0.2, tilt: 0, nod: 0.05 + breathe }, mouth: 0.25 + 0.15 * Math.max(0, wave(t, 2.2)),
        armL: { raise: 0.1, out: 0.12, elbow: 0.3 },
        armR: { raise: 1.35 + tap, out: 0.15, elbow: 0.12 },
      }
    }
    case 'celebrate': {
      const hop = Math.abs(wave(t, 1.1))
      return {
        ...REST, lift: 0.04 + hop * 0.16, lean: wave(t, 1.1) * 0.06,
        head: { turn: 0, tilt: wave(t, 1.1) * 0.08, nod: -0.15 }, mouth: 0.7,
        armL: { raise: 2.75 + wave(t, 2.2) * 0.15, out: 0.35, elbow: 0.25 },
        armR: { raise: 2.75 - wave(t, 2.2) * 0.15, out: 0.35, elbow: 0.25 },
        legL: { swing: -0.05, knee: 0.25 * (1 - hop) }, legR: { swing: -0.05, knee: 0.25 * (1 - hop) },
      }
    }
    case 'tantrum': {
      // wind up, kick the ground out in front, stamp down: about twice a second
      const beat = (t * 2.1) % 1
      const kick = beat < 0.45 ? Math.sin((beat / 0.45) * Math.PI) : 0
      const stamp = beat >= 0.45 && beat < 0.6 ? 1 : 0
      const shake = wave(t, 9)
      return {
        lift: stamp * 0.01, lean: -0.08 + shake * 0.03, turn: shake * 0.05,
        head: { turn: wave(t, 5.5) * 0.28, tilt: shake * 0.05, nod: -0.12 }, mouth: 0.75 + 0.25 * Math.abs(wave(t, 4)), anger: 1,
        armL: { raise: 1.75 + shake * 0.2, out: 0.55, elbow: 1.9 },
        armR: { raise: 1.75 - shake * 0.2, out: 0.55, elbow: 1.9 },
        legL: { swing: -0.05, knee: 0.1 + stamp * 0.1 },
        legR: { swing: kick * 1.15, knee: 0.9 * (1 - kick) * (beat < 0.45 ? 1 : 0) + stamp * 0.05 },
      }
    }
    case 'shrug': {
      const up = 0.5 + 0.5 * wave(t, 0.45)
      return {
        ...REST, lean: 0.02,
        head: { turn: 0.05, tilt: 0.14 + up * 0.08, nod: 0.03 }, mouth: 0.05,
        armL: { raise: 0.25, out: 0.62 + up * 0.18, elbow: 1.35 + up * 0.25 },
        armR: { raise: 0.25, out: 0.62 + up * 0.18, elbow: 1.35 + up * 0.25 },
      }
    }
  }
}
