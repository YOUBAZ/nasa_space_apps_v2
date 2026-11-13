import { useEffect, useRef, useState, type ReactNode } from 'react'

/** A button that must be held down: launching a rocket should feel deliberate. */
export function HoldButton({ onDone, children, ms = 1500, disabled = false }:
  { onDone(): void; children: ReactNode; ms?: number; disabled?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [holding, setHolding] = useState(false)
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }
  const start = () => {
    if (disabled || timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setHolding(false)
      onDone()
    }, ms)
  }
  useEffect(() => stop, [])
  return (
    <button type="button" disabled={disabled}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start() }} onKeyUp={stop} onBlur={stop}
      className="relative select-none overflow-hidden rounded-full border-4 border-nasa-red-shade bg-nasa-red px-10 py-5 font-display text-xl font-black uppercase tracking-widest text-white shadow-[0_0_40px_#f6413766] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ touchAction: 'none' }}>
      <span className="absolute inset-y-0 start-0 bg-white/30"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${ms}ms linear` : 'width 150ms' }} aria-hidden="true" />
      <span className="relative">{children}</span>
    </button>
  )
}
