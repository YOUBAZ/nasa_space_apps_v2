import { useEffect, useState } from 'react'
import { INSTRUMENTS, OBJECTIVES, instrumentsFor, objectivesFor } from '../../engine/catalog'
import { instrumentCost } from '../../engine/phases/design'
import { MAX_PUSHBACKS } from '../../engine/state'
import type { InstrumentId, MissionType, ObjectiveId } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { InstrumentTalk } from '../components/InstrumentTalk'
import { OptionCard } from '../components/OptionCard'
import { ReadyBar } from '../components/ReadyBar'
import { Icon, type IconName } from '../icons'
import { instName, money, num, objName } from '../names'
import { instrumentChips } from '../stats'

const TYPES: MissionType[] = ['eo', 'deep', 'mars']
const TYPE_ICON: Record<MissionType, IconName> = { eo: 'globe', deep: 'star', mars: 'planet' }

function ObjectivePicker() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const solo = state.mode === 'solo'
  const [picked, setPicked] = useState<ObjectiveId | null>(null)
  const [pitch, setPitch] = useState('')
  const ids = objectivesFor(state.difficulty)
  return (
    <div className="flex flex-col gap-4" data-tut="objectives">
      <p className="text-carbon-20">{t('sci.pickIntro')}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {TYPES.map((type) => (
          <div key={type} className="flex flex-col gap-2">
            <h3 className="label flex items-center gap-1.5"><Icon name={TYPE_ICON[type]} size={14} />{t(`type.${type}`)}</h3>
            {ids.filter((id) => OBJECTIVES[id].type === type).map((id) => {
              const o = OBJECTIVES[id]
              const dead = m.rejectedObjectives.includes(id)
              return (
                <OptionCard key={id} name={objName(id)} entryId={`obj.${id}`} color="#47da84"
                  selected={picked === id} disabled={!can('scientist') || dead} onPick={() => setPicked(id)}
                  chips={[
                    { icon: 'trophy', text: t('sci.grant', { n: num(o.grant) }) },
                    { icon: 'clock', text: t('sci.needsLife', { n: o.life }) },
                    { icon: 'eye', text: t('sci.needsCov', { n: Math.round(o.minCov * 100) }) },
                  ]}
                  badge={dead ? <span className="mono mt-1 text-xs text-nasa-red-tint">{t('sci.turnedDown')}</span> : undefined} />
              )
            })}
          </div>
        ))}
      </div>
      {!solo && (
        <label className="flex flex-col gap-1">
          <span className="label">{t('sci.pitch')}</span>
          <input value={pitch} onChange={(e) => setPitch(e.target.value)} maxLength={200} placeholder={t('sci.pitchHint')}
            className="rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
        </label>
      )}
      <div>
        <Button variant="primary" icon="send" disabled={!picked || !can('scientist')}
          onClick={() => picked && act({ type: 'proposeObjective', objectiveId: picked, pitch }, 'scientist')}>
          {solo ? t('sci.choose') : t('sci.send')}
        </Button>
      </div>
    </div>
  )
}

function InstrumentPicker() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const solo = state.mode === 'solo'
  const [draft, setDraft] = useState<InstrumentId[]>(m.instrumentRequest)
  // Re-sync only when the requested list itself changes, not on every unrelated game update.
  const requestedKey = m.instrumentRequest.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(m.instrumentRequest), [requestedKey])
  const [note, setNote] = useState('')
  const toggle = (id: InstrumentId) => setDraft(draft.includes(id) ? draft.filter((x) => x !== id) : [...draft, id])
  const same = draft.length === m.instrumentRequest.length && draft.every((x) => m.instrumentRequest.includes(x))
  const sum = (key: 'mass' | 'power' | 'cost' | 'gb') => draft.reduce((n, i) => n + INSTRUMENTS[i][key], 0)
  const editable = can('scientist') && state.phase !== 'launch'
  const status = m.instrumentStatus
  const cap = solo ? undefined : m.instrumentCap
  const cost = instrumentCost(state, draft)
  const overCap = cap !== undefined && cost > cap + 1e-9
  const lastPushback = m.instrumentPushbacks >= MAX_PUSHBACKS
  // The same list is worth sending only as a first request, as "I insist", or as the final list after the ruling.
  const resendable = status === 'none' || status === 'pushed_back' || status === 'capped'
  const sendLabel = solo ? t('sci.fit')
    : cap !== undefined ? t('sci.sendFinal')
      : status === 'none' ? t('sci.request')
        : status === 'pushed_back' && same ? t('sci.insist') : t('sci.sendChanged')
  const statusText = status === 'pushed_back'
    ? (lastPushback ? t('sci.status.pushed_back_last') : t('sci.status.pushed_back', { n: m.instrumentPushbacks, max: MAX_PUSHBACKS }))
    : status === 'escalated' ? t('sci.status.escalated')
      : status === 'capped' ? t('sci.status.capped', { amount: money(cap ?? 0) })
        : status === 'final' ? t('sci.status.final')
          : status === 'accepted' ? t('sci.status.accepted') : t('sci.status.pending')
  const tone = status === 'pushed_back' || status === 'capped' || status === 'escalated' ? 'border-intl-orange text-intl-orange'
    : status === 'accepted' ? 'border-active-green text-active-green' : 'border-carbon-60 text-carbon-20'
  const submit = () => {
    act({ type: 'requestInstruments', list: draft, note: note.trim() || undefined }, 'scientist')
    setNote('')
  }
  return (
    <div className="flex flex-col gap-3" data-tut="instruments">
      <p className="text-carbon-20">{t('sci.instIntro', { objective: m.objectiveId ? objName(m.objectiveId) : '' })}</p>
      {!solo && status !== 'none' && (
        <div className={`rounded border px-3 py-2 text-sm ${tone}`} data-testid="instrument-status">
          <p className="font-bold">{statusText}</p>
          {status === 'pushed_back' && m.pushbackReason && <p className="text-carbon-10">“{m.pushbackReason}”</p>}
          {cap === undefined && status !== 'accepted' && status !== 'escalated' && (
            <p className="mono mt-1 text-xs text-carbon-30">{t('sci.look', { n: Math.min(3, m.instrumentPushbacks + 1) })}</p>
          )}
        </div>
      )}
      {!solo && m.instrumentThread.length > 1 && <InstrumentTalk />}
      <div className="grid gap-2 sm:grid-cols-2">
        {instrumentsFor(state.difficulty, state.campaign.unlocked).map((id) => (
          <OptionCard key={id} name={instName(id)} entryId={`inst.${id}`} color="#47da84" chips={instrumentChips(id)}
            selected={draft.includes(id)} disabled={!editable || status === 'escalated'} onPick={() => toggle(id)} />
        ))}
      </div>
      {cap !== undefined && (
        <p className={`mono text-sm ${overCap ? 'text-nasa-red-tint' : 'text-active-green'}`} data-testid="instrument-cap">
          <span dir="ltr">{t('sci.capLine', { cost: money(cost), cap: money(cap) })}</span>
          {overCap && <span className="ms-2 font-sans">{t('sci.overCap')}</span>}
        </p>
      )}
      {!solo && status === 'pushed_back' && editable && (
        <label className="flex flex-col gap-1">
          <span className="label">{t('sci.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
            className="rounded border border-carbon-60 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-nasa-blue-tint" />
        </label>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono text-sm text-carbon-20" dir="ltr">
          {num(sum('mass'))} kg · {num(sum('power'))} W · {money(sum('cost'))} · {num(sum('gb'), 1)} Gb/d
        </span>
        <Button icon="send" disabled={!editable || draft.length === 0 || status === 'escalated' || overCap || (same && !resendable)} onClick={submit}>
          {sendLabel}
        </Button>
      </div>
      <ReadyBar role="scientist" />
    </div>
  )
}

export function ScientistPanel() {
  const { state } = useGame()
  const m = state.mission
  if (!m) return null
  if (state.phase === 'objective_proposal') return <ObjectivePicker />
  if (state.phase === 'objective_review' || state.phase === 'planning') {
    return (
      <div className="flex flex-col gap-2">
        <p className="label">{t('sci.proposed')}</p>
        <p className="text-xl font-bold text-active-green">{m.objectiveId ? objName(m.objectiveId) : ''}</p>
        {m.pitch && <p className="text-carbon-20">“{m.pitch}”</p>}
        <p className="mono text-sm text-carbon-40">{t(state.phase === 'planning' ? 'wait.planning' : 'wait.review')}</p>
      </div>
    )
  }
  return <InstrumentPicker />
}
