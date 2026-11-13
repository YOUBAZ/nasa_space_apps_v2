/** Online play needs a Supabase project; without one the buttons are hidden. */
export function onlineAvailable(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
