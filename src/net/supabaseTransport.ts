import type { Difficulty } from '../engine/types'
import { defaultBus, hasServer } from './buses'
import * as room from './roomTransport'
import type { Transport } from './transport'

const idKey = (code: string) => `mc.player.${code}`
// With a real server each browser is one player, so the id is kept across tabs and restarts.
// In same-browser play every tab is a different player, so the id must stay per tab.
const store = (): Storage => (hasServer() ? localStorage : sessionStorage)

/** Leaving the page should free the player's roles (client) or close the room (host). */
function disposeOnExit(transport: Transport): Transport {
  const onHide = () => transport.dispose()
  window.addEventListener('pagehide', onHide, { once: true })
  const dispose = transport.dispose.bind(transport)
  transport.dispose = () => { window.removeEventListener('pagehide', onHide); dispose() }
  return transport
}

export async function createHostTransport(opts: { difficulty: Difficulty; name: string }): Promise<Transport> {
  return disposeOnExit(await room.createHostTransport(opts, defaultBus()))
}

/** One token per browser tab. It survives a refresh, and a second tab gets a different one. */
function tabToken(): string | undefined {
  try {
    const hit = sessionStorage.getItem('mc.tab')
    if (hit) return hit
    const made = 't' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('mc.tab', made)
    return made
  } catch { return undefined /* storage unavailable */ }
}

export async function createClientTransport(opts: { code: string; name: string }): Promise<Transport> {
  // Keep the same player id for this room so a returning player (refresh or new tab) gets their seat back.
  let playerId: string | undefined
  try { playerId = store().getItem(idKey(opts.code)) ?? undefined } catch { /* storage unavailable */ }
  const tab = tabToken()
  let transport: Transport
  try {
    transport = await room.createClientTransport({ ...opts, playerId, tab }, defaultBus())
  } catch (e) {
    // The remembered seat is being played in another tab of this browser: join as a new player instead.
    if (!(e instanceof Error) || e.message !== 'seat_in_use') throw e
    transport = await room.createClientTransport({ ...opts, tab }, defaultBus())
  }
  try { store().setItem(idKey(opts.code), transport.me) } catch { /* storage unavailable */ }
  return disposeOnExit(transport)
}
