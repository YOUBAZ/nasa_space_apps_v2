import type { GameState } from '../state'

export function enterDesign(s: GameState): void {
  s.phase = 'design'
}
