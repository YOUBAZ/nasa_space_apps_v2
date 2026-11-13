# Mission Control

Team space-mission simulator for NASA Space Apps (fan-made, not affiliated with NASA).

- `npm run dev` — play locally
- `npm test` — engine + UI tests
- Design: `docs/superpowers/specs/`, plan: `docs/superpowers/plans/`

## Languages
English and Arabic (right-to-left). The Arabic text in `src/i18n/ar/` was machine-drafted: **have a native speaker review it before the event.** A test keeps the two languages' keys and placeholders in step (`tests/i18n/keys.test.ts`).

## Online play
Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (a free Supabase project; no tables needed). Without them, rooms only connect tabs of the same browser.
