import type { SVGProps } from 'react'

const P: Record<string, string> = {
  planner: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5',
  scientist: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
  designer: 'M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2zM6 18h.01',
  radio: 'M4 10a8 8 0 0 0 10 10zM9 15l5-5M14 6a4 4 0 0 1 4 4M14 2a8 8 0 0 1 8 8',
  rocket: 'M12 2c4 3 5 8 4 13H8c-1-5 0-10 4-13zM8 15l-3 3v-5l3-2M16 15l3 3v-5l-3-2M10 19l2 3 2-3M12 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  chat: 'M4 5h16v11H9l-5 4z',
  book: 'M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h10',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.5-2.5-1.500M12 6v2M12 16v2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  star: 'M12 3l2.7 5.8 6.3.800-4.6 4.3 1.2 6.200L12 17l-5.6 3.1 1.2-6.200L3 9.600l6.3-.800z',
  users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0-1-5.800M16 14a6 6 0 0 1 6 6',
  play: 'M7 4l13 8-13 8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  snowflake: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3',
  leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l8-8',
  rock: 'M4 14l3-7 6-3 6 4 1 7-5 5H8z',
  planet: 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM3 15c-1.5-1 2-4 8-6s11-2 11 0-3 4-8 6',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6',
  drill: 'M9 3h6v6H9zM10 9l2 12 2-12M9 13h6M9.5 17h5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  weight: 'M9 7a3 3 0 1 1 6 0M6 7h12l2 13H4z',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  trophy: 'M8 4h8v6a4 4 0 0 1-8 0zM8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 14v4M8 20h8',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.500a8 8 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.700M20 4v5h-5',
  send: 'M3 11l18-8-8 18-2-8z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
}

export type IconName = keyof typeof P

const DIRECTIONAL = ['arrow', 'back', 'send']

export function Icon({ name, size = 18, className = '', ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  // arrows point the way the text reads
  const flip = DIRECTIONAL.includes(name as string) ? 'rtl:-scale-x-100' : ''
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`${flip} ${className}`.trim() || undefined} {...rest}>
      <path d={P[name] ?? P.info} />
    </svg>
  )
}
