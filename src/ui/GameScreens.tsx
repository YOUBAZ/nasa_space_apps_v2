import { useGame } from '../net/useGame'
import { Campaign, CampaignOver } from './screens/Campaign'
import { Debrief } from './screens/Debrief'
import { Launch } from './screens/Launch'
import { Lobby } from './screens/Lobby'
import { MissionBoard } from './screens/MissionBoard'
import { Operations } from './screens/Operations'

/** Picks the screen for the current phase of the game. */
export function GameScreens({ onExit, boardExtra }: { onExit: () => void; boardExtra?: React.ReactNode }) {
  const { state } = useGame()
  switch (state.phase) {
    case 'lobby': return <Lobby onExit={onExit} />
    case 'launch': return <Launch key={state.campaign.launches} />
    case 'operations': return <Operations />
    case 'debrief': return <Debrief />
    case 'campaign': return <Campaign />
    case 'campaign_over': return <CampaignOver onExit={onExit} />
    default: return <MissionBoard onExit={onExit} extra={boardExtra} />
  }
}
