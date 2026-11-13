import { useState } from 'react'
import { t, useLang } from './i18n/i18n'
import { GameProvider } from './net/useGame'
import type { Transport } from './net/transport'
import { GameScreens } from './ui/GameScreens'
import { Home } from './ui/screens/Home'
import { HandbookProvider } from './ui/handbook/Handbook'
import { TutorialGame } from './ui/tutorial/TutorialGame'
import { MuteToggle } from './ui/components/MuteToggle'
import { LangToggle } from './ui/components/LangToggle'
import { CrashBoundary } from './ui/components/CrashBoundary'
import { FlightGallery } from './ui/screens/FlightGallery'

export default function App() {
  useLang()
  const [transport, setTransport] = useState<Transport | null>(null)
  const [training, setTraining] = useState(false)
  // #gallery opens the review page for every flight animation
  const [gallery, setGallery] = useState(() => typeof window !== 'undefined' && window.location.hash === '#gallery')
  const exit = () => {
    transport?.dispose()
    setTransport(null)
  }
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <CrashBoundary>
        {gallery
          ? <FlightGallery onExit={() => { window.location.hash = ''; setGallery(false) }} />
          : training
          ? <TutorialGame onExit={() => setTraining(false)} />
          : transport
          ? <GameProvider transport={transport}><HandbookProvider><GameScreens onExit={exit} /></HandbookProvider></GameProvider>
          : <Home onStart={setTransport} onTutorial={() => setTraining(true)} />}
        </CrashBoundary>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 text-center text-xs text-carbon-40">
        <span>{t('app.footer')}</span>
        <span className="flex items-center gap-2"><MuteToggle />{(transport || training) && <LangToggle />}</span>
      </footer>
    </div>
  )
}
