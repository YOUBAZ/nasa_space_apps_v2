import { useState } from 'react'
import { OBJECTIVES } from '../../engine/catalog'
import type { ScheduleMode, Slot } from '../../engine/types'
import { spendOf } from '../../engine/spend'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { InfoTip } from '../handbook/Handbook'
import { money, objName, optName, slotName } from '../names'

const MODES: ScheduleMode[] = ['rush', 'standard', 'careful']

function Slider({ label, value, max, onChange, testId, step = 10 }:
  { label: string; value: number; max: number; onChange(n: number): void; testId?: string; step?: number }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="mono text-lg text-white" data-testid={testId} dir="ltr">{money(value)}</span>
      </span>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[#ea6f24]" />
    </label>
  )
}

function PlanForm() {
  const { state, act, can } = useGame()
  const solo = state.mode === 'solo'
  const funds = state.campaign.funds
  const round10 = (n: number) => Math.round(n / 10) * 10
  const [total, setTotal] = useState(Math.min(funds, round10(funds * 0.25)))
  const [designer, setDesigner] = useState(round10(Math.min(funds, funds * 0.25) * 0.6))
  const [radio, setRadio] = useState(round10(Math.min(funds, funds * 0.25) * 0.1))
  const [targetMonth, setTarget] = useState(state.campaign.month + 18)
  const [mode, setMode] = useState<ScheduleMode>('standard')
  const m = state.mission!
  const ob = m.objectiveId ? OBJECTIVES[m.objectiveId] : null
  const over = !solo && designer + radio > total
  const reserve = total - designer - radio
  const confirm = () => {
    act({ type: 'setPlan', total, designer, radio, targetMonth, scheduleMode: mode }, 'planner')
    act({ type: 'confirmPlan' }, 'planner')
  }
  const disabled = !can('planner')
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4" data-tut="plan">
      <p className="text-carbon-20">
        {t('plan.intro', { objective: ob ? objName(ob.id) : '', funds: money(funds) })}
      </p>
      <Slider label={t('plan.total')} value={total} max={funds} onChange={setTotal} />
      {!solo && (
        <>
          <Slider label={t('plan.designer')} value={designer} max={total} onChange={setDesigner} />
          <Slider label={t('plan.radio')} value={radio} max={total} onChange={setRadio} />
          <div className="flex items-baseline justify-between rounded border border-carbon-70 px-3 py-2">
            <span className="label flex items-center gap-1">{t('plan.reserve')}<InfoTip entryId="concept.budget" /></span>
            <span className={`mono text-lg ${over ? 'text-nasa-red-tint' : 'text-active-green'}`} data-testid="reserve" dir="ltr">{money(reserve)}</span>
          </div>
          {over && <p className="text-sm text-nasa-red-tint" role="alert">{t('plan.over')}</p>}
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label flex items-center gap-1">{t('plan.target')}<InfoTip entryId="concept.schedule" /></span>
          <input type="number" min={state.campaign.month + 1} value={targetMonth} onChange={(e) => setTarget(Number(e.target.value))}
            className="mono rounded border border-carbon-60 bg-black/60 px-3 py-2 text-white outline-none focus:border-nasa-blue-tint" />
          <span className="mono text-xs text-carbon-40">{t('plan.now', { n: state.campaign.month })}{ob?.type === 'mars' ? ` · ${t('plan.marsHint')}` : ''}</span>
        </label>
        <div className="flex flex-col gap-1">
          <span className="label">{t('plan.mode')}</span>
          <div className="grid grid-cols-3 gap-1">
            {MODES.map((x) => (
              <button key={x} type="button" aria-pressed={mode === x} onClick={() => setMode(x)}
                className={`rounded border px-2 py-1.5 text-sm font-bold ${mode === x ? 'border-intl-orange bg-intl-orange/20 text-white' : 'border-carbon-60 text-carbon-30'}`}>
                {t(`mode.${x}`)}
              </button>
            ))}
          </div>
          <span className="mono text-xs text-carbon-40">{t(`mode.${mode}.desc`)}</span>
        </div>
      </div>
      <div>
        <Button variant="primary" icon="check" disabled={disabled || over || total <= 0 || !(targetMonth > state.campaign.month)} onClick={confirm}>
          {t('plan.confirm')}
        </Button>
      </div>
    </fieldset>
  )
}

function Bar({ label, spent, alloc }: { label: string; spent: number; alloc: number }) {
  const frac = alloc > 0 ? Math.min(1, spent / alloc) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="mono text-sm text-carbon-10" dir="ltr">{money(spent)} / {money(alloc)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-carbon-80"><div className="h-full bg-intl-orange transition-all" style={{ width: `${frac * 100}%` }} /></div>
    </div>
  )
}

function BudgetOverview() {
  const { state, act, can } = useGame()
  const m = state.mission!
  const solo = state.mode === 'solo'
  const [amount, setAmount] = useState(10)
  const [from, setFrom] = useState<'reserve' | 'designer' | 'radio'>('reserve')
  const [to, setTo] = useState<'reserve' | 'designer' | 'radio'>('designer')
  const pots = ['reserve', 'designer', 'radio'] as const
  const spentD = spendOf(state, 'designer')
  const spentR = spendOf(state, 'radio')
  const openBackorders = m.backorders.filter((b) => b.status === 'open')
  return (
    <div className="flex flex-col gap-4" data-tut="budget">
      {solo
        ? <Bar label={t('plan.total')} spent={spentD + spentR + m.fees} alloc={m.budget.total} />
        : (
          <>
            <Bar label={t('plan.designer')} spent={spentD} alloc={m.budget.designer} />
            <Bar label={t('plan.radio')} spent={spentR} alloc={m.budget.radio} />
            <div className="flex items-baseline justify-between">
              <span className="label">{t('plan.reserve')}</span>
              <span className="mono text-lg text-active-green" dir="ltr">{money(m.budget.reserve)}</span>
            </div>
          </>
        )}
      <p className="mono text-xs text-carbon-30">
        {t('plan.summary', { target: m.targetMonth, mode: t(`mode.${m.scheduleMode}`) })}
      </p>

      {!solo && state.phase === 'design' && (
        <fieldset disabled={!can('planner')} className="flex flex-wrap items-end gap-2 rounded border border-carbon-70 p-3">
          <legend className="label px-1">{t('plan.move')}</legend>
          <input type="number" min={1} value={amount} aria-label={t('funds.amount')} onChange={(e) => setAmount(Number(e.target.value))}
            className="mono w-24 rounded border border-carbon-60 bg-black/60 px-2 py-1 text-white" />
          <select value={from} aria-label={t('plan.from')} onChange={(e) => setFrom(e.target.value as typeof from)} className="rounded border border-carbon-60 bg-black/60 px-2 py-1 text-white">
            {pots.map((p) => <option key={p} value={p}>{t(`pot.${p}`)}</option>)}
          </select>
          <span aria-hidden="true">→</span>
          <select value={to} aria-label={t('plan.to')} onChange={(e) => setTo(e.target.value as typeof to)} className="rounded border border-carbon-60 bg-black/60 px-2 py-1 text-white">
            {pots.map((p) => <option key={p} value={p}>{t(`pot.${p}`)}</option>)}
          </select>
          <Button size="sm" disabled={from === to || !(amount > 0)} onClick={() => act({ type: 'moveFunds', from, to, amount }, 'planner')}>{t('plan.moveGo')}</Button>
        </fieldset>
      )}

      {openBackorders.length > 0 && state.phase === 'design' && (
        <div className="flex flex-col gap-2" data-tut="backorders">
          <h3 className="label">{t('backorder.title')}</h3>
          {openBackorders.map((b) => (
            <div key={b.id} className="rounded border border-intl-orange/60 bg-black/40 p-3">
              <p className="text-sm">
                {t('backorder.text', { part: optName(b.slot as Slot, b.option), slot: slotName(b.slot as Slot) })}
                {m.design[b.slot] === b.option && <span className="ms-1 font-bold text-intl-orange">{t('backorder.inUse')}</span>}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['wait', 'express', 'substitute'] as const).map((choice) => (
                  <Button key={choice} size="sm" variant="ghost" disabled={!can('planner')}
                    onClick={() => act({ type: 'resolveBackorder', id: b.id, choice }, 'planner')}>
                    {t(`backorder.do.${choice}`)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PlannerPanel() {
  const { state } = useGame()
  if (!state.mission) return null
  if (state.phase === 'objective_proposal') return <p className="mono text-sm text-carbon-40">{t('wait.objective')}</p>
  if (state.phase === 'objective_review') return <p className="text-carbon-20">{t('plan.reviewHint')}</p>
  if (state.phase === 'planning') return <PlanForm />
  return <BudgetOverview />
}
