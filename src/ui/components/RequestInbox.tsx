import { useState } from 'react'
import type { Request } from '../../engine/state'
import { MAX_APPEALS } from '../../engine/state'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from './Button'
import { InstrumentRuling } from './InstrumentTalk'
import { RoleBadge } from './RoleBadge'
import { money, objName } from '../names'

function title(r: Request): string {
  if (r.kind === 'objective') return t('req.objective', { name: r.objectiveId ? objName(r.objectiveId) : '' })
  if (r.kind === 'funding') return t('req.funding', { amount: money(r.amount ?? 0), role: t(`role.${r.target ?? 'designer'}`) })
  return t('req.purchase', { amount: money(r.amount ?? 0) })
}

function ReasonForm({ label, send, onSend, onCancel }: { label: string; send: string; onSend(text: string): void; onCancel(): void }) {
  const [text, setText] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="label">{label}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300}
          className="rounded border border-carbon-60 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-nasa-blue-tint" />
      </label>
      <div className="flex gap-2">
        <Button size="sm" disabled={!text.trim()} onClick={() => onSend(text.trim())}>{send}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  )
}

function RequestCard({ r }: { r: Request }) {
  const { act, can } = useGame()
  const [form, setForm] = useState<'reject' | 'appeal' | null>(null)
  const left = MAX_APPEALS - r.appeals
  const statusColor = r.status === 'approved' ? 'text-active-green' : r.status === 'rejected' ? 'text-nasa-red-tint' : 'text-intl-orange'
  return (
    <li className="rounded border border-carbon-70 bg-black/40 p-3" data-tut={`request-${r.kind}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold">{title(r)}</p>
          <RoleBadge role={r.from} size="sm" />
        </div>
        <span className={`mono text-xs uppercase ${statusColor}`}>{t(`req.status.${r.status}`)}</span>
      </div>
      {r.reasons.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-s-2 border-carbon-70 ps-2">
          {r.reasons.map((x, i) => (
            <li key={i} className="text-sm">
              <span className="mono text-xs text-carbon-40">{t(`role.${x.by}`)}: </span>
              <span>{x.text}</span>
            </li>
          ))}
        </ul>
      )}
      {r.status === 'rejected' && (
        <p className="mono mt-2 text-xs text-carbon-30">
          {left > 0 ? <span>{t('app.appealsLeft', { n: left })}</span> : <span>{t('req.noAppeals')}</span>}
        </p>
      )}
      <div className="mt-2">
        {r.status === 'pending' && can('planner') && form === null && (
          <div className="flex gap-2">
            <Button size="sm" variant="go" icon="check" onClick={() => act({ type: 'review', requestId: r.id, decision: 'approve' }, 'planner')}>{t('req.approve')}</Button>
            <Button size="sm" variant="danger" icon="x" onClick={() => setForm('reject')}>{t('req.reject')}</Button>
          </div>
        )}
        {r.status === 'pending' && !can('planner') && <p className="mono text-xs text-carbon-40">{t('req.waitingPlanner')}</p>}
        {form === 'reject' && (
          <ReasonForm label={t('req.reason')} send={t('req.sendRejection')} onCancel={() => setForm(null)}
            onSend={(reason) => { act({ type: 'review', requestId: r.id, decision: 'reject', reason }, 'planner'); setForm(null) }} />
        )}
        {r.status === 'rejected' && can(r.from) && left > 0 && form === null && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setForm('appeal')}>{t('req.appeal')}</Button>
            {r.kind !== 'objective' && (
              <Button size="sm" variant="ghost" onClick={() => act({ type: 'withdraw', requestId: r.id }, r.from)}>{t('req.withdraw')}</Button>
            )}
          </div>
        )}
        {form === 'appeal' && (
          <ReasonForm label={t('req.reason')} send={t('req.sendAppeal')} onCancel={() => setForm(null)}
            onSend={(reason) => { act({ type: 'appeal', requestId: r.id, reason }, r.from); setForm(null) }} />
        )}
      </div>
    </li>
  )
}

/** Everyone sees every request; only the right role gets the buttons. */
export function RequestInbox() {
  const { state } = useGame()
  const m = state.mission
  if (!m || state.mode === 'solo') return null
  const open = m.requests.filter((r) => r.status === 'pending' || r.status === 'rejected')
  const lastDone = [...m.requests].reverse().find((r) => r.status === 'approved')
  const list = lastDone && !open.includes(lastDone) ? [...open, lastDone] : open
  // An instrument dispute the Designer took to the Planner sits at the top until the Scientist's final list is in.
  const dispute = m.instrumentStatus === 'escalated' || m.instrumentStatus === 'capped'
  return (
    <section data-testid="inbox" data-tut="inbox">
      <h3 className="label mb-2">{t('req.title')}</h3>
      {list.length === 0 && !dispute
        ? <p className="mono text-xs text-carbon-40">{t('req.empty')}</p>
        : (
          <ul className="flex flex-col gap-2">
            {dispute && <InstrumentRuling key={`ruling-${m.instrumentCap ?? 'open'}`} />}
            {list.map((r) => <RequestCard key={r.id} r={r} />)}
          </ul>
        )}
    </section>
  )
}
