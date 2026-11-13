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

export default function App() {
  useLang()
  const [transport, setTransport] = useState<Transport | null>(null)
  const [training, setTraining] = useState(false)
  const exit = () => {
    transport?.dispose()
    setTransport(null)
  }
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        {training
          ? <TutorialGame onExit={() => setTraining(false)} />
          : transport
          ? <GameProvider transport={transport}><HandbookProvider><GameScreens onExit={exit} /></HandbookProvider></GameProvider>
          : <Home onStart={setTransport} onTutorial={() => setTraining(true)} />}
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 text-center text-xs text-carbon-40">
        <span>{t('app.footer')}</span>
        <span className="flex items-center gap-2"><MuteToggle />{(transport || training) && <LangToggle />}</span>
      </footer>
    </div>
  )
}
