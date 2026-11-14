import { useState } from 'react'
import type { InstrumentStep } from '../../engine/state'
import { cheapestInstrument, instrumentCost } from '../../engine/phases/design'
import { spendOf } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from './Button'
import { instName, money } from '../names'

const LINE: Record<InstrumentStep['kind'], string> = {
  list: 'talk.list', insist: 'talk.insist', change: 'talk.change', pushback: 'talk.pushback',
  escalate: 'talk.escalate', cap: 'talk.cap', accept: 'talk.accept',
}

/** The Scientist–Designer conversation about instruments, oldest first, with every reason given. */
export function InstrumentTalk({ limit }: { limit?: number }) {
  const { state } = useGame()
  const thread = state.mission?.instrumentThread ?? []
  if (thread.length === 0) return null
  const shown = limit ? thread.slice(-limit) : thread
  return (
    <div data-testid="instrument-talk">
      <p className="label mb-1">{t('talk.title')}</p>
      <ol className="flex flex-col gap-1 border-s-2 border-carbon-70 ps-2">
        {shown.map((x, i) => (
          <li key={i} className="text-sm">
            <span className="mono text-xs text-carbon-40">{t(`role.${x.by}`)} </span>
            <span className="text-carbon-20">
              {t(LINE[x.kind], { list: (x.list ?? []).map(instName).join(' · '), amount: money(x.amount ?? 0) })}
            </span>
            {x.text && <span className="text-white">: “{x.text}”</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Shown to everyone once the Designer has taken the disagreement to the Planner.
 * The Planner settles it with one number: the most the Scientist's instruments may cost.
 */
export function InstrumentRuling() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const escalated = m.instrumentStatus === 'escalated'
  const min = Math.ceil(cheapestInstrument(state))
  const max = Math.floor(m.budget.designer)
  const cost = instrumentCost(state, m.instrumentRequest)
  // What the Designer could pay today if the instruments now on the craft were taken off.
  const free = m.budget.designer - (spendOf(state, 'designer') - instrumentCost(state, m.design.instruments ?? []))
  const suggestion = Math.max(min, Math.min(max, Math.floor(Math.min(cost, free))))
  const [text, setText] = useState(String(m.instrumentCap ?? suggestion))
  const amount = Number(text)
  const valid = text.trim() !== '' && Number.isFinite(amount) && amount >= min && amount <= max
  return (
    <li className="rounded border border-intl-orange/70 bg-black/40 p-3" data-tut="request-instruments" data-testid="instrument-ruling">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-bold">{t('ruling.title')}</p>
        <span className={`mono text-xs uppercase ${escalated ? 'text-intl-orange' : 'text-active-green'}`}>
          {t(escalated ? 'req.status.pending' : 'req.status.approved')}
        </span>
      </div>
      {/* the Scientist and Designer already have the conversation in their own panels */}
      {can('planner') && <div className="mt-2"><InstrumentTalk /></div>}
      {!escalated && <p className="mt-2 text-sm text-active-green">{t('ruling.done', { amount: money(m.instrumentCap ?? 0) })}</p>}
      {can('planner') ? (
        <div className="mt-2 flex flex-col gap-2">
          {escalated && <p className="text-sm text-carbon-20">{t('ruling.intro')}</p>}
          <p className="text-sm text-carbon-20">{t('ruling.facts', { cost: money(cost), allocation: money(m.budget.designer), free: money(Math.max(0, free)) })}</p>
          <label className="flex flex-col gap-1">
            <span className="label">{t('ruling.amount')}</span>
            <input type="number" inputMode="numeric" dir="ltr" min={min} max={max} step={1} value={text} onChange={(e) => setText(e.target.value)}
              className="mono w-32 rounded border border-carbon-60 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-nasa-blue-tint" />
          </label>
          <p className={`mono text-xs ${valid ? 'text-carbon-40' : 'text-intl-orange'}`}>{t('ruling.range', { min: money(min), max: money(max) })}</p>
          <div>
            <Button size="sm" variant={escalated ? 'go' : 'ghost'} icon="check" disabled={!valid || (!escalated && amount === m.instrumentCap)}
              onClick={() => act({ type: 'capInstruments', amount }, 'planner')}>
              {t(escalated ? 'ruling.set' : 'ruling.update')}
            </Button>
          </div>
        </div>
      ) : escalated && <p className="mono mt-2 text-xs text-carbon-40">{t('ruling.waiting')}</p>}
    </li>
  )
}
