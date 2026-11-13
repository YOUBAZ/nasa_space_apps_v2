import { useEffect, type ReactNode } from 'react'
import { t } from '../../i18n/i18n'
import { Icon } from '../icons'

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose(): void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`panel flex max-h-[90vh] w-full flex-col ${wide ? 'max-w-4xl' : 'max-w-lg'} bg-carbon-90`}>
        <header className="flex items-center justify-between gap-3 border-b border-carbon-70 px-4 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded p-1 text-carbon-30 hover:bg-carbon-80 hover:text-white">
            <Icon name="x" />
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
