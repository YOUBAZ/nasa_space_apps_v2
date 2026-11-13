import type { Difficulty } from '../engine/types'
import { defaultBus } from './buses'
import * as room from './roomTransport'
import type { Transport } from './transport'

const idKey = (code: string) => `mc.player.${code}`

/** Leaving the page should free the player's roles (client) or close the room (host). */
function disposeOnExit(transport: Transport): Transport {
  window.addEventListener('pagehide', () => transport.dispose(), { once: true })
  return transport
}

export async function createHostTransport(opts: { difficulty: Difficulty; name: string }): Promise<Transport> {
  return disposeOnExit(await room.createHostTransport(opts, defaultBus()))
}

export async function createClientTransport(opts: { code: string; name: string }): Promise<Transport> {
  // Keep the same player id across a refresh so a returning player gets their seat back.
  let playerId: string | undefined
  try { playerId = sessionStorage.getItem(idKey(opts.code)) ?? undefined } catch { /* storage unavailable */ }
  const transport = await room.createClientTransport({ ...opts, playerId }, defaultBus())
  try { sessionStorage.setItem(idKey(opts.code), transport.me) } catch { /* storage unavailable */ }
  return disposeOnExit(transport)
}
