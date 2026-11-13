export const SFX_NAMES = ['beep', 'rumble', 'boom', 'static', 'fanfare', 'argh', 'click'] as const
export type Sfx = (typeof SFX_NAMES)[number]

const STORE = 'mc.muted'
let muted: boolean | null = null
const listeners = new Set<() => void>()

export function isMuted(): boolean {
  if (muted === null) {
    try { muted = localStorage.getItem(STORE) === '1' } catch { muted = false }
  }
  return muted
}
export function setMuted(m: boolean): void {
  muted = m
  try { localStorage.setItem(STORE, m ? '1' : '0') } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}
export function onMuteChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

type Ctx = AudioContext
let ctx: Ctx | null = null
function audio(): Ctx | null {
  if (ctx) return ctx
  const Ctor = typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined
  if (!Ctor) return null
  try { ctx = new Ctor() } catch { ctx = null }
  return ctx
}

function tone(c: Ctx, type: OscillatorType, from: number, to: number, start: number, dur: number, gain: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, c.currentTime + start)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), c.currentTime + start + dur)
  g.gain.setValueAtTime(gain, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.02)
}

function noise(c: Ctx, dur: number, gain: number, filter: BiquadFilterType, freq: number, fadeIn = 0.01) {
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buffer
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, c.currentTime)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + fadeIn)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start()
}

/** Small synthesised sound effects: no audio files to load. Silent when muted or unsupported. */
export function sfx(name: Sfx): void {
  if (isMuted()) return
  const c = audio()
  if (!c) return
  try {
    if (c.state === 'suspended') void c.resume()
    switch (name) {
      case 'beep': tone(c, 'sine', 880, 880, 0, 0.09, 0.12); break
      case 'click': tone(c, 'triangle', 520, 320, 0, 0.06, 0.1); break
      case 'rumble': noise(c, 5.5, 0.35, 'lowpass', 220, 0.6); break
      case 'boom': noise(c, 1.6, 0.6, 'lowpass', 500); tone(c, 'sine', 120, 30, 0, 1.2, 0.5); break
      case 'static': noise(c, 0.35, 0.08, 'bandpass', 2400); tone(c, 'sine', 1400, 1400, 0.28, 0.08, 0.06); break
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(c, 'triangle', f, f, i * 0.13, 0.32, 0.14)); break
      case 'argh':
        tone(c, 'sawtooth', 420, 160, 0, 0.7, 0.14)
        tone(c, 'sawtooth', 430, 170, 0.03, 0.7, 0.1)
        break
    }
  } catch { /* audio is a nicety, never a reason to break the game */ }
}
