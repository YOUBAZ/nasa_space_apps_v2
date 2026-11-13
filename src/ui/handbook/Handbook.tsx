import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { t } from '../../i18n/i18n'
import { Modal } from '../components/Modal'
import { Icon } from '../icons'
import { entryTitle, entryUrl, handbookSections } from './entries'

interface HandbookApi { open(entryId?: string): void }
const Ctx = createContext<HandbookApi>({ open: () => {} })
export const useHandbook = () => useContext(Ctx)

function Entry({ id }: { id: string }) {
  return (
    <article className="flex flex-col gap-3">
      <div>
        <p className="label">{t('hb.what')}</p>
        <p className="text-carbon-05">{t(`hb.${id}.what`)}</p>
      </div>
      <div>
        <p className="label">{t('hb.why')}</p>
        <p className="text-carbon-05">{t(`hb.${id}.why`)}</p>
      </div>
      <a href={entryUrl(id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-nasa-blue-tint underline">
        <Icon name="arrow" size={14} />{t('common.learnMore')}
      </a>
      <p className="text-xs text-carbon-40">{t('hb.simplified')}</p>
    </article>
  )
}

export function HandbookProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null | undefined>(undefined)
  const open = useCallback((id?: string) => setOpenId(id ?? null), [])
  const api = useMemo(() => ({ open }), [open])
  const sections = useMemo(() => (openId === null ? handbookSections() : []), [openId])
  return (
    <Ctx.Provider value={api}>
      {children}
      {typeof openId === 'string' && (
        <Modal title={entryTitle(openId)} onClose={() => setOpenId(undefined)}>
          <Entry id={openId} />
          <button type="button" className="mt-4 text-sm text-carbon-30 underline" onClick={() => setOpenId(null)}>{t('hb.browse')}</button>
        </Modal>
      )}
      {openId === null && (
        <Modal title={t('hb.title')} onClose={() => setOpenId(undefined)} wide>
          <div className="flex flex-col gap-5">
            {sections.map((s) => (
              <section key={s.key}>
                <h3 className="label mb-2">{t(`hb.section.${s.key}`)}</h3>
                <div className="flex flex-wrap gap-2">
                  {s.ids.map((id) => (
                    <button key={id} type="button" onClick={() => setOpenId(id)}
                      className="rounded border border-carbon-70 px-2.5 py-1 text-sm text-carbon-10 hover:border-nasa-blue-tint">
                      {entryTitle(id)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  )
}

/** The small "i" next to anything in the game: opens its handbook entry. */
export function InfoTip({ entryId }: { entryId: string }) {
  const { open } = useHandbook()
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); open(entryId) }}
      aria-label={t('hb.whatIs', { name: entryTitle(entryId) })}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-carbon-40 hover:bg-carbon-80 hover:text-nasa-blue-tint">
      <Icon name="info" size={16} />
    </button>
  )
}
