export type Sfx = 'beep' | 'rumble' | 'boom' | 'static' | 'fanfare' | 'argh' | 'click'

/** Sound arrives in Phase 10; until then this is silent. */
export function sfx(_name: Sfx): void {}
export function isMuted(): boolean { return true }
export function setMuted(_m: boolean): void {}
