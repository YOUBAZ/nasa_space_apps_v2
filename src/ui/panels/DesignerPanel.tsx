import { useState } from 'react'
import { COMPONENTS, INSTRUMENTS, optionsFor, vehiclesFor } from '../../engine/catalog'
import type { GameState } from '../../engine/state'
import { RADIO_SLOTS, SLOTS, type Slot } from '../../engine/types'
import { spendOf, withAutoSlots } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { FundsDialog } from '../components/FundsDialog'
import { OptionCard } from '../components/OptionCard'
import { ReadyBar } from '../components/ReadyBar'
import { InfoTip } from '../handbook/Handbook'
import { instName, money, num, optName, slotName, vehName } from '../names'
import { optionChips, vehicleChips } from '../stats'

/** How much more allocation the Designer would need to make this change. */
export function shortfall(state: GameState, change: Partial<Record<Slot | 'vehicle', string>>): number {
  const m = state.mission!
  const next: GameState = { ...state, mission: { ...m, design: { ...m.design, ...change } as typeof m.design } }
  return Math.ceil(spendOf(next, 'designer') - m.budget.designer - 1e-9)
}

export function SlotPicker({ slot, role }: { slot: Slot; role: 'designer' | 'radio' }) {
  const { state, act, can, probe } = useGame()
  const [ask, setAsk] = useState<number | null>(null)
  const m = state.mission!
  const solo = state.mode === 'solo'
  const options = optionsFor(state.difficulty, slot, state.campaign.unlocked)
  return (
    <section data-tut={`slot-${slot}`}>
      <h3 className="label mb-1.5 flex items-center gap-1">{slotName(slot)}<InfoTip entryId={`slot.${slot}`} /></h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((id) => {
          const name = optName(slot, id)
          const selected = m.design[slot] === id
          const error = selected ? null : probe({ type: 'setSlot', slot, option: id }, role)
          const overCap = error === 'over_allocation'
          const backorder = m.backorders.find((b) => b.slot === slot && b.option === id)
          const banned = error === 'substituted'
          return (
            <OptionCard key={id} name={name} entryId={`opt.${slot}.${id}`} chips={optionChips(slot, id)} selected={selected}
              disabled={!can(role) || overCap || banned} onPick={() => act({ type: 'setSlot', slot, option: id }, role)}
              badge={
                banned ? <span className="mono mt-1 text-xs text-nasa-red-tint">{t('backorder.banned')}</span>
                  : backorder?.status === 'open' ? <span className="mono mt-1 text-xs text-intl-orange">{t('backorder.badge')}</span>
                    : backorder?.status === 'wait' ? <span className="mono mt-1 text-xs text-intl-orange">{t('backorder.waitBadge')}</span>
                      : undefined
              }
              footer={overCap && can(role) ? (
                solo ? <span className="mono text-xs text-intl-orange">{t('design.overBudget')}</span>
                  : <Button size="sm" variant="ghost" icon="coin" onClick={() => setAsk(shortfall(state, { [slot]: id }))}>{t('funds.requestFor', { name })}</Button>
              ) : undefined} />
          )
        })}
      </div>
      {/* every spacecraft part, the antenna included, is paid from the Designer's allocation */}
      {ask !== null && <FundsDialog from={role} target="designer" amount={ask} onClose={() => setAsk(null)} />}
    </section>
  )
}

function InstrumentReview() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const [reason, setReason] = useState<string | null>(null)
  if (m.instrumentStatus !== 'pending' && m.instrumentStatus !== 'final') return null
  const list = m.instrumentRequest
  const sum = (key: 'mass' | 'power' | 'cost') => list.reduce((n, i) => n + INSTRUMENTS[i][key], 0)
  const final = m.instrumentStatus === 'final'
  const overCap = can('designer') && state.phase === 'design'
    && spendOf({ ...state, mission: { ...m, design: { ...m.design, instruments: list } } }, 'designer') > m.budget.designer + 1e-9
  return (
    <section className="rounded border border-active-green/60 bg-black/40 p-3" data-tut="instrument-review">
      <h3 className="label mb-1">{t(final ? 'design.reviewFinal' : 'design.review')}</h3>
      <p className="text-sm">{list.map(instName).join(' · ')}</p>
      <p className="mono mt-1 text-xs text-carbon-30" dir="ltr">+{num(sum('mass'))} kg · +{num(sum('power'))} W · +{money(sum('cost'))}</p>
      {overCap && <p className="mt-1 text-sm text-intl-orange">{t('design.reviewOver')}</p>}
      {reason === null ? (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="go" icon="check" disabled={!can('designer')} onClick={() => act({ type: 'reviewInstruments', decision: 'accept' }, 'designer')}>{t('design.accept')}</Button>
          {!final && <Button size="sm" variant="danger" disabled={!can('designer')} onClick={() => setReason('')}>{t('design.pushback')}</Button>}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">{t('req.reason')}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300}
              className="rounded border border-carbon-60 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-nasa-blue-tint" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={!reason.trim()} onClick={() => { act({ type: 'reviewInstruments', decision: 'pushback', reason: reason.trim() }, 'designer'); setReason(null) }}>{t('design.sendPushback')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setReason(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}
    </section>
  )
}

function VehiclePicker() {
  const { state, act, can, probe } = useGame()
  const [ask, setAsk] = useState<number | null>(null)
  const m = state.mission!
  const solo = state.mode === 'solo'
  return (
    <section data-tut="vehicles">
      <h3 className="label mb-1.5 flex items-center gap-1">{t('design.vehicle')}<InfoTip entryId="concept.payload" /></h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {vehiclesFor(state.difficulty).map((id) => {
          const selected = m.design.vehicle === id
          const overCap = !selected && probe({ type: 'setVehicle', vehicle: id }, 'designer') === 'over_allocation'
          return (
            <OptionCard key={id} name={vehName(id)} entryId={`veh.${id}`} chips={vehicleChips(id)} selected={selected} color="#f64137"
              disabled={!can('designer') || overCap} onPick={() => act({ type: 'setVehicle', vehicle: id }, 'designer')}
              footer={overCap && can('designer') ? (
                solo ? <span className="mono text-xs text-intl-orange">{t('design.overBudget')}</span>
                  : <Button size="sm" variant="ghost" icon="coin" onClick={() => setAsk(shortfall(state, { vehicle: id }))}>{t('funds.requestFor', { name: vehName(id) })}</Button>
              ) : undefined} />
          )
        })}
      </div>
      {ask !== null && <FundsDialog from="designer" amount={ask} onClose={() => setAsk(null)} />}
    </section>
  )
}

export function DesignerPanel() {
  const { state } = useGame()
  const m = state.mission
  if (!m) return null
  if (!['design', 'integration', 'go_poll'].includes(state.phase)) {
    return <p className="mono text-sm text-carbon-40">{t('wait.design')}</p>
  }
  const mine = SLOTS.filter((s) => !RADIO_SLOTS.includes(s) && optionsFor(state.difficulty, s, state.campaign.unlocked).length > 0)
  const d = withAutoSlots(m.design, state.difficulty)
  const auto = SLOTS.filter((s) => !RADIO_SLOTS.includes(s) && optionsFor(state.difficulty, s, state.campaign.unlocked).length === 0)
  const comms = RADIO_SLOTS.filter((s) => d[s]).map((s) => COMPONENTS[s].options[d[s]!])
  return (
    <div className="flex flex-col gap-4">
      <InstrumentReview />
      {mine.map((slot) => <SlotPicker key={slot} slot={slot} role="designer" />)}
      <VehiclePicker />
      {(auto.length > 0 || comms.length > 0 || (d.instruments ?? []).length > 0) && (
        <section className="rounded border border-carbon-70 p-3 text-sm">
          <h3 className="label mb-1">{t('design.alsoAboard')}</h3>
          <ul className="mono flex flex-col gap-0.5 text-xs text-carbon-20">
            {auto.map((s) => d[s] && <li key={s}>{slotName(s)}: {optName(s, d[s]!)} <span className="text-carbon-40">· {t('design.standard')}</span></li>)}
            {RADIO_SLOTS.map((s) => d[s] && <li key={s}>{slotName(s)}: {optName(s, d[s]!)} <span className="text-carbon-40">· {t('design.byRadio')}</span></li>)}
            {(d.instruments ?? []).map((i) => <li key={i}>{instName(i)} <span className="text-carbon-40">· {t('design.byScientist')}</span></li>)}
          </ul>
        </section>
      )}
      <ReadyBar role="designer" />
    </div>
  )
}
