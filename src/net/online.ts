/** Rooms need a channel between browsers: Supabase when configured, otherwise tabs of this browser. */
export function onlineAvailable(): boolean {
  return hasServer() || typeof BroadcastChannel !== 'undefined'
}
export function hasServer(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
