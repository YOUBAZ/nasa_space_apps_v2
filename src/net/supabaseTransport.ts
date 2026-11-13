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

export async function createClientTransport(opts: { code: string; name: string }): Promise<Transport> {
  // Keep the same player id for this room so a returning player (refresh or new tab) gets their seat back.
  let playerId: string | undefined
  try { playerId = store().getItem(idKey(opts.code)) ?? undefined } catch { /* storage unavailable */ }
  const transport = await room.createClientTransport({ ...opts, playerId }, defaultBus())
  try { store().setItem(idKey(opts.code), transport.me) } catch { /* storage unavailable */ }
  return disposeOnExit(transport)
}
