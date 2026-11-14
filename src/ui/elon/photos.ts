import type { ElonPose } from './poses'

export interface ElonPhoto {
  /** Cut-out in public/textures. Only the background was removed; the person is untouched. */
  file: string
  /** How wide the cut-out is compared with its height. */
  aspect: number
  nasaId: string
  credit: string
}

/**
 * One real NASA photograph per pose. See public/textures/CREDITS.md.
 * There is no photo of a tantrum, so that pose is a heated moment at a news conference
 * that the game shakes as a whole. Nothing inside any photo is ever redrawn.
 */
export const ELON_PHOTOS: Record<ElonPose, ElonPhoto> = {
  idle: { file: 'elon-idle.webp', aspect: 0.544, nasaId: 'NHQ202005300110', credit: 'NASA/Joel Kowsky' },
  point: { file: 'elon-point.webp', aspect: 0.689, nasaId: 'KSC-2014-2727', credit: 'NASA/Dimitri Gerondidakis' },
  celebrate: { file: 'elon-celebrate.webp', aspect: 0.45, nasaId: 'NHQ201910100009', credit: 'NASA/Aubrey Gemignani' },
  shrug: { file: 'elon-shrug.webp', aspect: 0.783, nasaId: 'KSC-2014-2736', credit: 'NASA/Dimitri Gerondidakis' },
  tantrum: { file: 'elon-tantrum.webp', aspect: 1.06, nasaId: 'KSC-20180206-PH_KLS03_0099', credit: 'NASA/Kim Shiflett' },
}

export const elonPhotoUrl = (pose: ElonPose) => `${import.meta.env.BASE_URL}textures/${ELON_PHOTOS[pose].file}`

/**
 * How big a pose's photo is drawn inside a box `size` wide and 1.3 x `size` tall.
 * The photo keeps its own proportions; a wide one may spill a little past the sides rather than shrink.
 */
export function elonFit(pose: ElonPose, size: number): { width: number; height: number } {
  const { aspect } = ELON_PHOTOS[pose]
  const height = Math.min(size * 1.3, (size * 1.25) / aspect)
  return { width: height * aspect, height }
}
