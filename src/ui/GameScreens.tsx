import { useGame } from '../net/useGame'
import { Lobby } from './screens/Lobby'
import { MissionBoard } from './screens/MissionBoard'

/** Picks the screen for the current phase of the game. */
export function GameScreens({ onExit }: { onExit: () => void }) {
  const { state } = useGame()
  switch (state.phase) {
    case 'lobby': return <Lobby onExit={onExit} />
    default: return <MissionBoard />
  }
}
