import { useState } from 'react'
import { t, useLang } from './i18n/i18n'
import { GameProvider } from './net/useGame'
import type { Transport } from './net/transport'
import { GameScreens } from './ui/GameScreens'
import { Home } from './ui/screens/Home'

export default function App() {
  useLang()
  const [transport, setTransport] = useState<Transport | null>(null)
  const exit = () => {
    transport?.dispose()
    setTransport(null)
  }
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        {transport
          ? <GameProvider transport={transport}><GameScreens onExit={exit} /></GameProvider>
          : <Home onStart={setTransport} onTutorial={() => {}} />}
      </div>
      <footer className="px-4 py-3 text-center text-xs text-carbon-40">{t('app.footer')}</footer>
    </div>
  )
}
