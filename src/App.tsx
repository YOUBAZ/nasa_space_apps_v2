import { t, useLang } from './i18n/i18n'

export default function App() {
  useLang()
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="label">NASA Space Apps · Team Mission Simulator</p>
        <h1 className="text-5xl font-black">{t('app.title')}</h1>
        <p className="text-carbon-20">{t('app.tagline')}</p>
      </main>
      <footer className="px-4 py-3 text-center text-xs text-carbon-40">{t('app.footer')}</footer>
    </div>
  )
}
