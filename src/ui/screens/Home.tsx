import { lazy, Suspense, useState } from 'react'
import type { Difficulty } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { clearSave, createLocalTransport, loadSave } from '../../net/localTransport'
import type { Transport } from '../../net/transport'
import { Button } from '../components/Button'
import { Icon } from '../icons'
import { onlineAvailable } from '../../net/online'
import { LangToggle } from '../components/LangToggle'

const HeroScene = lazy(() => import('../three/HeroScene'))
const DIFFS: Difficulty[] = ['fan', 'nerd', 'expert']

export interface HomeProps {
  onStart(transport: Transport): void
  onTutorial(): void
}

export function Home({ onStart, onTutorial }: HomeProps) {
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('fan')
  const [mode, setMode] = useState<'solo' | 'local' | 'online'>('solo')
  const [others, setOthers] = useState<string[]>([''])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [save, setSave] = useState(() => loadSave())
  const myName = name.trim() || t('home.player', { n: 1 })

  const startLocal = () => {
    if (mode === 'solo') return onStart(createLocalTransport({ mode: 'solo', difficulty, names: [myName] }))
    const names = [myName, ...others.map((n, i) => n.trim() || t('home.player', { n: i + 2 }))]
    onStart(createLocalTransport({ mode: 'local', difficulty, names }))
  }
  const startOnline = async (kind: 'host' | 'join') => {
    setBusy(true)
    setError(null)
    try {
      const net = await import('../../net/supabaseTransport')
      const transport = kind === 'host'
        ? await net.createHostTransport({ difficulty, name: myName })
        : await net.createClientTransport({ code: code.trim().toUpperCase(), name: myName })
      onStart(transport)
    } catch {
      setError(t('home.joinFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
        <Suspense fallback={null}><HeroScene /></Suspense>
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="label">{t('home.kicker')}</p>
            <h1 className="text-5xl font-black leading-none sm:text-7xl">{t('app.title')}</h1>
            <p className="mt-2 max-w-md text-lg text-carbon-20">{t('app.tagline')}</p>
          </div>
          <LangToggle />
        </header>

        {save && (
          <div className="panel flex flex-wrap items-center justify-between gap-3 border-active-green p-3">
            <span className="mono text-sm">{t('home.resume')} · {save.campaign.teamName}</span>
            <span className="flex gap-2">
              <Button size="sm" variant="go" icon="play"
                onClick={() => onStart(createLocalTransport({ mode: save.mode === 'solo' ? 'solo' : 'local', difficulty: save.difficulty, names: [], resume: save }))}>
                {t('home.start')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { clearSave(); setSave(null) }}>{t('home.resume.discard')}</Button>
            </span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="panel flex flex-col gap-4 p-5">
            <label className="flex flex-col gap-1">
              <span className="label">{t('home.name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={t('home.player', { n: 1 })}
                className="rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
            </label>
            <div>
              <p className="label mb-1">{t('home.difficulty')}</p>
              <div className="grid gap-2">
                {DIFFS.map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}
                    className={`rounded border px-3 py-2 text-start transition ${difficulty === d ? 'border-nasa-blue-tint bg-nasa-blue-shade/60' : 'border-carbon-70 hover:border-carbon-40'}`}>
                    <span className="block font-display font-bold">{t(`diff.${d}`)}</span>
                    <span className="block text-sm text-carbon-30">{t(`diff.${d}.desc`)}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={onTutorial}
              className="flex items-center gap-3 rounded border border-intl-orange px-3 py-3 text-start transition hover:bg-intl-orange/15">
              <Icon name="book" size={26} className="shrink-0 text-intl-orange" />
              <span>
                <span className="block font-display font-bold text-intl-orange">{t('home.tutorial')}</span>
                <span className="block text-sm text-carbon-30">{t('home.tutorial.desc')}</span>
              </span>
            </button>
          </section>

          <section className="panel flex flex-col gap-4 p-5">
            <div className="grid grid-cols-3 gap-2" role="tablist">
              {(['solo', 'local', 'online'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                  className={`rounded border px-2 py-3 text-center transition ${mode === m ? 'border-nasa-red bg-nasa-red/15' : 'border-carbon-70 hover:border-carbon-40'}`}>
                  <Icon name={m === 'solo' ? 'rocket' : m === 'local' ? 'users' : 'globe'} size={24} className="mx-auto mb-1" />
                  <span className="block font-display text-sm font-bold">{t(`home.${m}`)}</span>
                </button>
              ))}
            </div>
            <p className="text-carbon-30">{t(`home.${mode}.desc`)}</p>

            {mode === 'local' && (
              <div className="flex flex-col gap-2">
                <p className="label">{t('home.players')}</p>
                <input value={myName} readOnly className="rounded border border-carbon-70 bg-black/40 px-3 py-2 text-carbon-30" />
                {others.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={n} maxLength={24} placeholder={t('home.player', { n: i + 2 })}
                      onChange={(e) => setOthers(others.map((x, j) => (j === i ? e.target.value : x)))}
                      className="min-w-0 flex-1 rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
                    {others.length > 1 && (
                      <Button variant="ghost" size="sm" icon="x" aria-label={t('common.close')} onClick={() => setOthers(others.filter((_, j) => j !== i))} />
                    )}
                  </div>
                ))}
                {others.length < 3 && (
                  <Button variant="ghost" size="sm" icon="plus" onClick={() => setOthers([...others, ''])}>{t('home.addPlayer')}</Button>
                )}
              </div>
            )}

            {mode === 'online' && (onlineAvailable() ? (
              <div className="flex flex-col gap-3">
                <Button variant="primary" icon="globe" disabled={busy} onClick={() => startOnline('host')}>{t('home.host')}</Button>
                <div className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder={t('home.code')}
                    aria-label={t('home.code')}
                    className="mono min-w-0 flex-1 rounded border border-carbon-60 bg-black/60 px-3 py-2 uppercase tracking-[0.3em] text-white outline-none focus:border-nasa-blue-tint" />
                  <Button disabled={busy || code.trim().length !== 6} onClick={() => startOnline('join')}>{t('home.join')}</Button>
                </div>
                {busy && <p className="mono text-sm text-carbon-30">{t('home.connecting')}</p>}
                {error && <p className="text-sm text-nasa-red-tint" role="alert">{error}</p>}
              </div>
            ) : <p className="text-sm text-carbon-40">{t('home.onlineOff')}</p>)}

            {mode !== 'online' && (
              <Button variant="primary" size="lg" icon="arrow" className="mt-auto" onClick={startLocal}>{t('home.start')}</Button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
