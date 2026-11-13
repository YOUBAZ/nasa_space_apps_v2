import { render } from '@testing-library/react'
import type { GameState } from '../../src/engine/state'
import { GameProvider } from '../../src/net/useGame'
import { createLocalTransport } from '../../src/net/localTransport'
import { GameScreens } from '../../src/ui/GameScreens'
import { HandbookProvider } from '../../src/ui/handbook/Handbook'

/** Mounts the game screens on an existing engine state, seen from one player's device. */
export function mount(state: GameState, me = 'p1') {
  const transport = createLocalTransport({ mode: 'local', difficulty: state.difficulty, names: [], resume: state, persist: false, me })
  const view = render(
    <GameProvider transport={transport}>
      <HandbookProvider><GameScreens onExit={() => {}} /></HandbookProvider>
    </GameProvider>,
  )
  return { transport, ...view }
}
