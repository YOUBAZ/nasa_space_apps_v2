import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Icon } from '../icons'
import { logText } from './ActivityLog'

/** Team chat with every request and decision woven in as system lines. */
export function ChatDock({ always = false }: { always?: boolean }) {
  const { state, me, transport } = useGame()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const latest = state.chat.length ? state.chat[state.chat.length - 1].n : 0
  const [seen, setSeen] = useState(latest)
  const end = useRef<HTMLLIElement>(null)

  const items = useMemo(() => {
    const chat = state.chat.map((c) => ({ n: c.n, kind: 'chat' as const, c }))
    const sys = state.log.map((e) => ({ n: e.n, kind: 'sys' as const, e }))
    return [...chat, ...sys].sort((a, b) => a.n - b.n).slice(-80)
  }, [state.chat, state.log])

  useEffect(() => {
    if (!open) return
    setSeen(latest)
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [open, latest, items.length])

  if (state.mode !== 'online' && !always) return null
  const unread = state.chat.filter((c) => c.n > seen && c.playerId !== me).length
  const send = () => {
    const msg = text.trim()
    if (!msg) return
    transport.dispatch({ type: 'chat', text: msg })
    setText('')
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label={t('chat.open')} data-tut="chat"
        className="fixed bottom-4 end-4 z-30 flex items-center gap-2 rounded-full border border-nasa-blue-tint bg-carbon-90 px-4 py-2.5 text-white shadow-lg hover:bg-carbon-80">
        <Icon name="chat" />
        <span className={`mono rounded-full px-1.5 text-xs ${unread ? 'bg-nasa-red text-white' : 'bg-carbon-70 text-carbon-20'}`}>{unread}</span>
      </button>
    )
  }
  return (
    <section data-testid="chat" data-tut="chat"
      className="panel fixed bottom-4 end-4 z-30 flex h-[26rem] max-h-[70vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col bg-carbon-90 shadow-2xl">
      <header className="flex items-center justify-between border-b border-carbon-70 px-3 py-2">
        <h2 className="label">{t('chat.title')}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={t('chat.close')} className="rounded p-1 text-carbon-30 hover:bg-carbon-80 hover:text-white">
          <Icon name="x" size={16} />
        </button>
      </header>
      <ol className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2">
        {items.map((it) => it.kind === 'chat'
          ? (
            <li key={`c${it.n}`} className={`max-w-[85%] rounded px-2.5 py-1.5 text-sm ${it.c.playerId === me ? 'self-end bg-nasa-blue-shade' : 'self-start bg-carbon-80'}`}>
              {it.c.playerId !== me && <span className="mono block text-[0.65rem] text-intl-orange">{it.c.name}</span>}
              <span className="break-words">{it.c.text}</span>
            </li>
          )
          : <li key={`s${it.n}`} className="mono self-center text-center text-[0.68rem] text-carbon-40">{logText(it.e)}</li>)}
        <li ref={end} aria-hidden="true" />
      </ol>
      <form className="flex gap-2 border-t border-carbon-70 p-2" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} aria-label={t('chat.message')} placeholder={t('chat.placeholder')}
          className="min-w-0 flex-1 rounded border border-carbon-60 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-nasa-blue-tint" />
        <button type="submit" aria-label={t('chat.send')} disabled={!text.trim()}
          className="rounded bg-nasa-blue px-3 text-white hover:bg-nasa-blue-tint disabled:opacity-40"><Icon name="send" size={16} /></button>
      </form>
    </section>
  )
}
