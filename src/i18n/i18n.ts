import { useSyncExternalStore } from 'react'
import { en } from './en'
import { ar } from './ar'

export type Lang = 'en' | 'ar'
const tables: Record<Lang, Record<string, string>> = { en, ar }
const STORE = 'mc.lang'
function initial(): Lang {
  try { return localStorage.getItem(STORE) === 'ar' ? 'ar' : 'en' } catch { return 'en' }
}
let current: Lang = 'en'
const listeners = new Set<() => void>()

/** Translate a key; falls back to English, then to the key itself. `{var}` placeholders are interpolated. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = tables[current][key] ?? tables.en[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

export function hasKey(key: string): boolean {
  return key in tables.en
}

export function setLang(lang: Lang): void {
  current = lang
  try { localStorage.setItem(STORE, lang) } catch { /* storage unavailable */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }
  listeners.forEach((l) => l())
}

export function getLang(): Lang {
  return current
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
  )
}

/** Restore the language chosen last time (called once at startup). */
export function restoreLang(): void {
  const lang = initial()
  if (lang !== current) setLang(lang)
}
