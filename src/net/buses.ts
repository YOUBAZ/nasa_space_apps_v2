import { createClient } from '@supabase/supabase-js'
import type { Msg } from './protocol'
import type { Bus, BusFactory } from './roomTransport'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase Realtime: broadcast for messages, presence to notice who dropped. No database tables. */
export const supabaseBus: BusFactory = async (code, playerId) => {
  const client = createClient(URL!, KEY!, { auth: { persistSession: false } })
  const channel = client.channel(`room:${code}`, { config: { broadcast: { self: false }, presence: { key: playerId } } })
  let onMsg: ((m: Msg) => void) | undefined
  let onLeave: ((id: string) => void) | undefined
  channel.on('broadcast', { event: 'm' }, ({ payload }) => onMsg?.(payload as Msg))
  channel.on('presence', { event: 'leave' }, ({ key }) => { if (key) onLeave?.(key) })
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { void channel.track({ id: playerId }); resolve() }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error('bus_error'))
    })
  })
  const bus: Bus = {
    send(msg) { void channel.send({ type: 'broadcast', event: 'm', payload: msg }) },
    onMessage(cb) { onMsg = cb },
    onLeave(cb) { onLeave = cb },
    close() { void client.removeChannel(channel) },
  }
  return bus
}

/** No server configured: rooms work between tabs of the same browser (handy for demos and testing). */
export const tabBus: BusFactory = async (code) => {
  const channel = new BroadcastChannel(`mission-control-room-${code}`)
  return {
    send(msg) { channel.postMessage(msg) },
    onMessage(cb) { channel.onmessage = (e) => cb(e.data as Msg) },
    onLeave() { /* no presence here: members announce leaving with a 'bye' or 'closed' message */ },
    close() { channel.close() },
  }
}

export const hasServer = (): boolean => Boolean(URL && KEY)
export const defaultBus = (): BusFactory => (hasServer() ? supabaseBus : tabBus)
