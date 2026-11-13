import { useCallback, useEffect, useRef, useState } from 'react'
import type { FlightPlan } from '../../engine/flight'

export type TimelineStage = 'countdown' | 'ascent' | 'space' | 'cruise' | 'arrival' | 'end'
export type AnimStage = 'countdown' | 'ascent' | 'cruise' | 'arrival'

export const COUNT_TICK_MS = 550
/** how long a failure plays out before the flight is declared over */
export const FAIL_TAIL_S = 4.5

export interface Timeline {
  stage: TimelineStage
  /** the stage whose animation is (or was last) playing; 'space' and 'end' keep the previous one */
  animStage: AnimStage
  /** wall-clock time (ms) at which that animation started */
  animStart: number
  /** seconds left on the countdown */
  count: number
  /** progress through the current animation, 0..1 */
  p: number
  /** the story's failure has happened */
  lost: boolean
  /** jump to the end of whatever is playing */
  skip(): void
  /** the Radio Operator has made contact: the cruise may begin once the craft is in space */
  contact(): void
}

interface State { stage: TimelineStage; animStage: AnimStage; animStart: number }

/**
 * Runs the flight as a time-lapse: countdown, ascent to space, a wait for the Radio Operator,
 * the cruise, and the arrival. A failing story stops in its own stage, part-way through.
 */
export function useFlightTimeline(plan: FlightPlan, opts: { countFrom?: number; startInCruise?: boolean } = {}): Timeline {
  const countFrom = opts.countFrom ?? 10
  const [state, setState] = useState<State>(() => opts.startInCruise
    ? { stage: 'cruise', animStage: 'cruise', animStart: Date.now() }
    : { stage: 'countdown', animStage: 'countdown', animStart: Date.now() })
  const [now, setNow] = useState(() => Date.now())
  const contacted = useRef(Boolean(opts.startInCruise))

  const durationOf = useCallback((stage: AnimStage): number => {
    if (stage === 'countdown') return (countFrom * COUNT_TICK_MS) / 1000
    const base = plan.anim[stage]
    return plan.stage === stage && plan.failAt < 1 ? base * plan.failAt + FAIL_TAIL_S : base
  }, [plan, countFrom])

  const advance = useCallback((s: State, at: number): State => {
    if (s.stage === 'end') return s
    if (s.stage === 'space') return contacted.current ? { stage: 'cruise', animStage: 'cruise', animStart: at } : s
    const anim = s.stage as AnimStage
    if ((at - s.animStart) / 1000 < durationOf(anim)) return s
    if (anim === 'countdown') return { stage: 'ascent', animStage: 'ascent', animStart: at }
    const failsHere = plan.stage === anim && plan.failAt < 1
    if (failsHere) return { ...s, stage: 'end' }
    if (anim === 'ascent') return contacted.current ? { stage: 'cruise', animStage: 'cruise', animStart: at } : { ...s, stage: 'space' }
    if (anim === 'cruise') return { stage: 'arrival', animStage: 'arrival', animStart: at }
    return { ...s, stage: 'end' }
  }, [plan, durationOf])

  useEffect(() => {
    const id = setInterval(() => {
      const at = Date.now()
      setNow(at)
      setState((s) => advance(s, at))
    }, 100)
    return () => clearInterval(id)
  }, [advance])

  const skip = useCallback(() => {
    const at = Date.now()
    setNow(at)
    setState((s) => {
      if (s.stage === 'end' || s.stage === 'space') return s
      // pretend the whole stage has already played, then let it move on
      const done = { ...s, animStart: at - durationOf(s.stage as AnimStage) * 1000 - 1 }
      return advance(done, at)
    })
  }, [advance, durationOf])

  const contact = useCallback(() => {
    contacted.current = true
    const at = Date.now()
    setState((s) => advance(s, at))
  }, [advance])

  const elapsed = Math.max(0, (now - state.animStart) / 1000)
  const anim = state.animStage
  const base = anim === 'countdown' ? (countFrom * COUNT_TICK_MS) / 1000 : plan.anim[anim]
  const failsHere = anim !== 'countdown' && plan.stage === anim && plan.failAt < 1
  const cap = failsHere ? plan.failAt : 1
  const p = Math.min(cap, elapsed / base)
  return {
    ...state,
    count: anim === 'countdown' ? Math.max(0, Math.ceil(countFrom - (elapsed * 1000) / COUNT_TICK_MS)) : 0,
    p,
    lost: failsHere && elapsed / base >= plan.failAt,
    skip,
    contact,
  }
}
