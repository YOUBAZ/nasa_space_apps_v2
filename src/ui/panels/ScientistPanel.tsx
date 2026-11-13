import { useEffect, useState } from 'react'
import { INSTRUMENTS, OBJECTIVES, instrumentsFor, objectivesFor } from '../../engine/catalog'
import type { InstrumentId, MissionType, ObjectiveId } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
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
  const toggle = (id: InstrumentId) => setDraft(draft.includes(id) ? draft.filter((x) => x !== id) : [...draft, id])
  const same = draft.length === m.instrumentRequest.length && draft.every((x) => m.instrumentRequest.includes(x))
  const sum = (key: 'mass' | 'power' | 'cost' | 'gb') => draft.reduce((n, i) => n + INSTRUMENTS[i][key], 0)
  const editable = can('scientist') && state.phase !== 'launch'
  return (
    <div className="flex flex-col gap-3" data-tut="instruments">
      <p className="text-carbon-20">{t('sci.instIntro', { objective: m.objectiveId ? objName(m.objectiveId) : '' })}</p>
      {!solo && m.instrumentStatus !== 'none' && (
        <div className={`rounded border px-3 py-2 text-sm ${m.instrumentStatus === 'pushed_back' ? 'border-intl-orange text-intl-orange' : m.instrumentStatus === 'accepted' ? 'border-active-green text-active-green' : 'border-carbon-60 text-carbon-20'}`}>
          <p className="font-bold">{t(`sci.status.${m.instrumentStatus}`)}</p>
          {m.instrumentStatus === 'pushed_back' && m.pushbackReason && <p className="text-carbon-10">“{m.pushbackReason}”</p>}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {instrumentsFor(state.difficulty, state.campaign.unlocked).map((id) => (
          <OptionCard key={id} name={instName(id)} entryId={`inst.${id}`} color="#47da84" chips={instrumentChips(id)}
            selected={draft.includes(id)} disabled={!editable} onPick={() => toggle(id)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono text-sm text-carbon-20" dir="ltr">
          {num(sum('mass'))} kg · {num(sum('power'))} W · {money(sum('cost'))} · {num(sum('gb'), 1)} Gb/d
        </span>
        <Button icon="send" disabled={!editable || draft.length === 0 || (same && m.instrumentStatus !== 'none' && m.instrumentStatus !== 'pushed_back')}
          onClick={() => act({ type: 'requestInstruments', list: draft }, 'scientist')}>
          {solo ? t('sci.fit') : m.instrumentStatus === 'pushed_back' ? t('sci.resend') : t('sci.request')}
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
