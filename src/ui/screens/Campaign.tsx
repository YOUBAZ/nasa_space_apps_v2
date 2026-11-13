import { UNLOCKS } from '../../engine/catalog'
import { RANKS, rankOf } from '../../engine/gamify'
import { unlockName } from '../../engine/scoring'
import type { GameState } from '../../engine/state'
import { t } from '../../i18n/i18n'
import { clearSave } from '../../net/localTransport'
import { useGame } from '../../net/useGame'
import { Button } from '../components/Button'
import { Patch } from '../components/Patch'
import { Elon } from '../elon/Elon'
import { Icon } from '../icons'
import { money, objName } from '../names'

function Leaderboard({ state }: { state: GameState }) {
  const players = [...state.players].sort((a, b) => b.xp - a.xp)
  return (
    <section className="panel p-4">
      <h2 className="label mb-2">{t('camp.crew')}</h2>
      <ol className="flex flex-col gap-2">
        {players.map((p, i) => {
          const rank = rankOf(p.xp)
          const next = RANKS.find((r) => r.from > p.xp)
          return (
            <li key={p.id} className="flex items-center gap-3 rounded border border-carbon-70 bg-black/40 px-3 py-2">
              <span className="mono w-5 text-carbon-40">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-bold">{p.name}</span>
                <span className="mono block text-xs text-intl-orange">{t(`rank.${rank}`)}{next ? ` · ${t('camp.toNext', { n: next.from - p.xp })}` : ''}</span>
                {p.badges.length > 0 && <span className="mono block truncate text-xs text-nasa-blue-tint">{p.badges.map((b) => t(`badge.${b}`)).join(' · ')}</span>}
              </span>
              <span className="mono text-xl" dir="ltr">{p.xp}<span className="text-xs text-carbon-40"> XP</span></span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function PatchWall({ state }: { state: GameState }) {
  return (
    <section className="panel p-4">
      <h2 className="label mb-2">{t('camp.patches')}</h2>
      <ul className="flex flex-wrap gap-4">
        {state.campaign.patches.map((p, i) => (
          <li key={i} className="flex w-24 flex-col items-center gap-1 text-center">
            <Patch patch={p} size={84} />
            <span className="mono text-[0.65rem] leading-tight text-carbon-30">{objName(p.objectiveId)}</span>
          </li>
        ))}
        {Array.from({ length: Math.max(0, 5 - state.campaign.patches.length) }, (_, i) => (
          <li key={`e${i}`} className="flex h-[84px] w-24 items-center justify-center rounded-full border border-dashed border-carbon-60 text-carbon-60"><Icon name="rocket" /></li>
        ))}
      </ul>
    </section>
  )
}

function Stats({ state }: { state: GameState }) {
  const c = state.campaign
  const points = c.history.reduce((n, h) => n + h.teamPoints, 0)
  const items = [
    { label: t('board.funds'), value: money(c.funds), tone: 'text-active-green' },
    { label: t('camp.launches'), value: `${c.launches}/5`, tone: '' },
    { label: t('board.month'), value: String(c.month), tone: '' },
    { label: t('camp.points'), value: String(points), tone: 'text-intl-orange' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((x) => (
        <div key={x.label} className="panel px-3 py-2">
          <p className="label">{x.label}</p>
          <p className={`mono text-2xl ${x.tone}`} dir="ltr">{x.value}</p>
        </div>
      ))}
    </div>
  )
}

/** Between missions: money left, patches earned, gear unlocked, and what to fly next. */
export function Campaign() {
  const { state, act, can } = useGame()
  const c = state.campaign
  const last = c.history[c.history.length - 1]
  const locked = UNLOCKS[state.difficulty].filter((id) => !c.unlocked.includes(id))
  const newGear = last?.awards.find((a) => a.id === 'new_gear')?.unlock
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4">
      <header>
        <p className="label">{c.teamName} · {t(`diff.${state.difficulty}`)}</p>
        <h1 className="text-3xl font-black">{t('stage.campaign')}</h1>
      </header>
      <Stats state={state} />
      {newGear && (
        <div className="unlock-pop panel flex items-center gap-3 border-2 border-active-green p-4" role="status">
          <Icon name="lock" size={28} className="text-active-green" />
          <div>
            <p className="label text-active-green">{t('camp.unlocked')}</p>
            <p className="font-display text-xl font-bold">{unlockName(newGear)}</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <PatchWall state={state} />
        <section className="panel p-4">
          <h2 className="label mb-2">{t('camp.gear')}</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {c.unlocked.map((id) => <li key={id} className="flex items-center gap-2 text-active-green"><Icon name="check" size={14} />{unlockName(id)}</li>)}
            {locked.map((id) => <li key={id} className="flex items-center gap-2 text-carbon-50"><Icon name="lock" size={14} />{unlockName(id)}</li>)}
          </ul>
          <p className="mono mt-2 text-xs text-carbon-40">{t('camp.gearHint')}</p>
        </section>
      </div>
      <Leaderboard state={state} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {can('planner') ? (
          <>
            {last && last.outcome !== 'success' && (
              <Button variant="ghost" icon="refresh" onClick={() => act({ type: 'nextMission', flyAgain: true }, 'planner')}>{t('camp.flyAgain')}</Button>
            )}
            <Button variant="primary" size="lg" icon="rocket" onClick={() => act({ type: 'nextMission', flyAgain: false }, 'planner')}>{t('camp.next')}</Button>
            {last && last.outcome === 'success' && (
              <Button variant="ghost" icon="refresh" onClick={() => act({ type: 'nextMission', flyAgain: true }, 'planner')}>{t('camp.flyAgain')}</Button>
            )}
          </>
        ) : <p className="mono text-sm text-carbon-30">{t('camp.waitPlanner')}</p>}
      </div>
    </div>
  )
}

/** Final report when the money or the five launches run out. */
export function CampaignOver({ onExit }: { onExit(): void }) {
  const { state } = useGame()
  const c = state.campaign
  const wins = c.history.filter((h) => h.outcome === 'success').length
  const broke = c.launches < 5
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4">
      <header className="panel flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-start">
        <Elon pose={wins >= 3 ? 'celebrate' : wins >= 1 ? 'idle' : 'shrug'} size={130} />
        <div>
          <p className="label">{c.teamName}</p>
          <h1 className="text-4xl font-black">{t('stage.campaign_over')}</h1>
          <p className="mt-1 text-lg text-carbon-10">{t(broke ? 'over.broke' : 'over.done', { wins, launches: c.launches })}</p>
        </div>
      </header>
      <Stats state={state} />
      <section className="panel overflow-x-auto p-4">
        <h2 className="label mb-2">{t('over.history')}</h2>
        <table className="mono w-full min-w-[30rem] text-sm">
          <thead className="text-carbon-40">
            <tr><th className="text-start font-normal">#</th><th className="text-start font-normal">{t('over.objective')}</th><th className="text-start font-normal">{t('over.result')}</th><th className="text-end font-normal">{t('debrief.cost')}</th><th className="text-end font-normal">{t('debrief.grant')}</th></tr>
          </thead>
          <tbody>
            {c.history.map((h, i) => (
              <tr key={i} className="border-t border-carbon-70">
                <td>{i + 1}</td><td>{objName(h.objectiveId)}</td>
                <td className={h.outcome === 'success' ? 'text-active-green' : h.outcome === 'partial' ? 'text-intl-orange' : 'text-nasa-red-tint'}>{t(`outcome.${h.outcome}`)}</td>
                <td className="text-end" dir="ltr">{money(h.cost)}</td><td className="text-end" dir="ltr">{money(h.grant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <PatchWall state={state} />
        <Leaderboard state={state} />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" size="lg" icon="back" onClick={() => { clearSave(); onExit() }}>{t('over.menu')}</Button>
      </div>
    </div>
  )
}
