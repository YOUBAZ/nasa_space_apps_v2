import { useEffect, useState } from 'react'
import { t } from '../i18n/i18n'
import { useGame } from '../net/useGame'
import type { Role } from '../engine/types'
import { Button } from './components/Button'
import { ChatDock } from './components/ChatDock'
import { Campaign, CampaignOver } from './screens/Campaign'
import { Debrief } from './screens/Debrief'
import { Flight } from './screens/Flight'
import { Lobby } from './screens/Lobby'
import { ErrorToast, MissionBoard } from './screens/MissionBoard'

interface Focus { focusRole?: Role; focusKey?: string }

function Screen({ onExit, focusRole, focusKey }: { onExit: () => void } & Focus) {
  const { state } = useGame()
  // Looking back at the last debrief is a private view on this device; it changes nothing in the game.
  const [reviewing, setReviewing] = useState(false)
  const between = state.phase === 'campaign' || state.phase === 'campaign_over'
  useEffect(() => { if (!between) setReviewing(false) }, [between])
  const canReview = between && Boolean(state.mission?.result && state.mission.finalDesign)
  const back = canReview ? () => setReviewing(true) : undefined
  if (between && reviewing && canReview) return <Debrief onForward={() => setReviewing(false)} />
  switch (state.phase) {
    case 'lobby': return <Lobby onExit={onExit} />
    // launch and operations share one page, so the view and the radio transcript stay put
    case 'launch':
    case 'operations': return <Flight key={state.campaign.launches} />
    case 'debrief': return <Debrief />
    case 'campaign': return <Campaign onBack={back} />
    case 'campaign_over': return <CampaignOver onExit={onExit} onBack={back} />
    default: return <MissionBoard onExit={onExit} focusRole={focusRole} focusKey={focusKey} />
  }
}

/** Picks the screen for the current phase of the game, plus the things that float over every screen. */
export function GameScreens({ onExit, chat = false, focusRole, focusKey }: { onExit: () => void; chat?: boolean } & Focus) {
  const { closed } = useGame()
  return (
    <>
      <Screen onExit={onExit} focusRole={focusRole} focusKey={focusKey} />
      <ChatDock always={chat} />
      <ErrorToast />
      {closed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="alertdialog" aria-label={t('room.closed')}>
          <div className="panel flex max-w-sm flex-col items-center gap-4 bg-carbon-90 p-6 text-center">
            <h2 className="text-2xl font-black">{t('room.closed')}</h2>
            <p className="text-carbon-20">{t('room.closedHint')}</p>
            <Button variant="primary" icon="back" onClick={onExit}>{t('common.exit')}</Button>
          </div>
        </div>
      )}
    </>
  )
}
