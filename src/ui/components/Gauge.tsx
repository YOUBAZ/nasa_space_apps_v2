export type Hint = 'ok' | 'warn' | 'bad'
const HINT_COLOR: Record<Hint, string> = { ok: '#47da84', warn: '#ea6f24', bad: '#f64137' }

export interface GaugeProps {
  label: string
  value: number
  unit: string
  /** only passed when the rules allow showing a limit */
  max?: number
  hint?: Hint
  sub?: string
}

const R = 42
const LEN = Math.PI * R

/** A half-dial with a monospace readout. With no `max` it shows the number alone. */
export function Gauge({ label, value, unit, max, hint, sub }: GaugeProps) {
  const hasMax = max !== undefined
  const frac = hasMax && max > 0 ? Math.min(1, value / max) : hasMax ? 1 : 0
  const color = hint ? HINT_COLOR[hint] : '#288bff'
  const shown = Math.round(value * 10) / 10
  return (
    <div role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0}
      {...(hasMax ? { 'aria-valuemax': Math.round(max) } : {})}
      className="flex flex-col items-center rounded border border-carbon-70 bg-black/40 px-2 pb-2 pt-1">
      <svg viewBox="0 0 100 56" className="w-full max-w-[120px]" aria-hidden="true">
        <path d="M8 50 A42 42 0 0 1 92 50" fill="none" stroke="#2e2e32" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={hasMax ? undefined : '2 6'} />
        {hasMax && (
          <path d="M8 50 A42 42 0 0 1 92 50" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${LEN * frac} ${LEN}`} style={{ transition: 'stroke-dasharray 500ms ease, stroke 300ms' }} />
        )}
      </svg>
      <div className="-mt-6 text-center leading-tight">
        <span className="mono text-lg font-medium text-white" dir="ltr">{shown.toLocaleString('en-US')}</span>
        <span className="mono ms-1 text-xs text-carbon-30">{unit}</span>
      </div>
      <span className="label mt-0.5">{label}</span>
      {sub && <span className="mono text-[0.68rem] text-carbon-40" dir="ltr">{sub}</span>}
    </div>
  )
}
