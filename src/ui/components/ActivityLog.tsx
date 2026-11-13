import type { LogEntry } from '../../engine/state'
import type { ObjectiveId, Slot } from '../../engine/types'
import { t } from '../../i18n/i18n'
import { useGame } from '../../net/useGame'
import { objName, optName } from '../names'

/** Turns a log entry's raw ids into readable names before translating it. */
export function logText(e: LogEntry): string {
  const v: Record<string, string | number> = { ...e.vars }
  if (typeof v.objective === 'string' && v.objective) v.objective = objName(v.objective as ObjectiveId)
  if (typeof v.slot === 'string' && typeof v.option === 'string') v.option = optName(v.slot as Slot, v.option)
  if (typeof v.kind === 'string') v.kind = t(`req.kind.${v.kind}`)
  if (typeof v.choice === 'string') v.choice = t(`backorder.${v.choice}`)
  const text = t(e.key, v)
  return e.role ? `${t(`role.${e.role}`)}: ${text}` : text
}

export function ActivityLog({ limit = 12 }: { limit?: number }) {
  const { state } = useGame()
  const rows = state.log.slice(-limit).reverse()
  return (
    <section>
      <h3 className="label mb-2">{t('log.title')}</h3>
      <ol className="flex max-h-52 flex-col gap-1 overflow-y-auto pe-1">
        {rows.map((e) => <li key={e.n} className="mono text-xs text-carbon-30">{logText(e)}</li>)}
      </ol>
    </section>
  )
}
