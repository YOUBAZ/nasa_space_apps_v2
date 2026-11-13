import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { t } from '../../i18n/i18n'
import { Scene3D } from '../three/Scene3D'

const ExpandedCtx = createContext(false)
/** True while the surrounding 3D box is expanded to fill the screen (scenes use it to allow zooming). */
export const useExpanded = () => useContext(ExpandedCtx)

export interface View3DProps {
  children: ReactNode
  fallback: ReactNode
  /** things drawn over the scene (labels, clocks) */
  overlay?: ReactNode
  className?: string
  background?: string
  testId?: string
  /** let the player drag the bottom edge to make the box taller */
  resizable?: boolean
}

/**
 * The frame every 3D scene sits in. It never scrolls inside, can be dragged taller,
 * and has a button to fill the whole screen.
 */
export function View3D({ children, fallback, overlay, className = '', background = '#000', testId, resizable = false }: View3DProps) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])
  const frame = expanded
    ? 'fixed inset-2 z-50 rounded-lg border-2 border-nasa-blue-tint shadow-2xl sm:inset-4'
    : `relative rounded border border-carbon-70 ${className}`
  return (
    <>
      {expanded && <div className="fixed inset-0 z-40 bg-black/85" onClick={() => setExpanded(false)} aria-hidden="true" />}
      <div data-testid={testId} data-expanded={expanded} className={`overflow-hidden transition-colors duration-[3000ms] ${frame}`}
        style={{ background, ...(resizable && !expanded ? { resize: 'vertical' as const } : {}) }}>
        <div className="absolute inset-0">
          <ExpandedCtx.Provider value={expanded}>
            <Scene3D fallback={fallback}>{children}</Scene3D>
          </ExpandedCtx.Provider>
        </div>
        {overlay}
        <button type="button" onClick={() => setExpanded(!expanded)} aria-label={t(expanded ? 'view.shrink' : 'view.expand')} title={t(expanded ? 'view.shrink' : 'view.expand')}
          className="absolute bottom-2 end-2 z-10 flex h-9 w-9 items-center justify-center rounded border border-carbon-60 bg-black/70 text-carbon-10 hover:border-nasa-blue-tint hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={expanded ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
          </svg>
        </button>
      </div>
    </>
  )
}
