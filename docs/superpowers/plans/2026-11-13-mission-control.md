# Mission Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser game in which 1–4 players (Planner, Scientist, Designer, Radio Operator) plan, launch and debrief space missions, with every decision computed into mass, power, cost, data, time and science.

**Architecture:** One pure-TypeScript engine (`src/engine`), with no UI, holds every rule: catalog, mission evaluation, the state machine for the role flow, scoring and the campaign. React screens render the engine state. Solo and pass-and-play run the engine in one browser. Online mode runs it in the host's browser and syncs actions and state over Supabase Realtime broadcast.

**Tech Stack:** Vite 5 + React 18 + TypeScript 5 (strict), three.js + @react-three/fiber 8 + @react-three/drei 9 (low-poly 3D from primitives, lazy-loaded, 2D fallback), Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion 11, Vitest 2 + @testing-library/react, @supabase/supabase-js 2, fonts Inter / Public Sans / DM Mono (@fontsource), deployed on Vercel.

**Spec:** [docs/superpowers/specs/2026-11-13-mission-control-design.md](../specs/2026-11-13-mission-control-design.md) + [balance appendix](../specs/2026-11-13-mission-control-balance.md) + oracle [balance_reference.py](../specs/balance_reference.py)

## Global Constraints

- All numbers come from the balance appendix. `src/engine/data/*` must match `balance_reference.py` exactly; the oracle fixture test enforces this.
- The engine is pure: no `Math.random` (use the seeded `rng` in state), no `Date.now`, no DOM. Every rule lives in `src/engine`.
- Budgets are hard caps. Appeals are capped at 2 per request. Outcome is deterministic: any critical fault → failure, any major → partial, otherwise success.
- Verdicts stay hidden until the debrief. Raw stats are always shown. Fan-only hints: mass-vs-vehicle and power-vs-load gauges.
- Never use the NASA insignia, worm logotype or seal. Footer copy, exactly: "Fan-made for NASA Space Apps. Not affiliated with or endorsed by NASA or SpaceX. Elon Musk appears as parody."
- HDS tokens: `--nasa-red #f64137`, `--nasa-red-shade #b60109`, `--nasa-blue #1c67e3`, `--nasa-blue-tint #288bff`, `--active-green #47da84`, `--intl-orange #ea6f24`, `--carbon-90 #17171b`, `--carbon-black #000`, carbon scale `05 #f6f6f6 · 10 #e3e3e3 · 20 #d1d1d1 · 30 #b9b9bb · 40 #959599 · 50 #77777a · 60 #58585b · 70 #444447 · 80 #2e2e32`. Fonts: Inter for headings, Public Sans for body, DM Mono for numbers and labels.
- Every user-facing string goes through `t(key)` with keys in `src/i18n/en.json` (and `ar.json` in Phase 9). Use logical CSS properties (`ms-`/`me-`, `start`/`end`) everywhere so right-to-left layout works.
- Desktop and tablet first. At 375 px wide: no horizontal page scroll, no overlapping elements.

## Review Focus

1. **A choice changed after its approval** (e.g. a Designer swaps the antenna after the purchase was approved): the approval must reset, not carry over silently. Test: `applyAction` tests in Task 3.3, "editing design after purchase approval clears approval".
2. **A player holding several roles approves their own request in local or online mode:** this is allowed (the honour system), but solo mode must skip the request entirely. Test: Task 3.2, "solo mode never creates objective request".
3. **A funding request larger than the reserve:** approving it must fail with `insufficient_reserve`, never push the reserve negative. Test: Task 3.3.
4. **A campaign that can't afford another mission** (funds < $50M after a failure): it must end with the final report, not get stuck in PLANNING. Test: Task 4.2.
5. **An online action arrives that isn't valid in the current phase** (stale client): the host rejects it and resends state, and the client recovers. Test: Task 7.1, "host rejects stale action and rebroadcasts".

---

## Progress Tracker

Update the status after each task: ⬜ not started · 🟨 in progress · ✅ done (tests green + committed) · ⛔ blocked (note why).

| Phase | Goal | Tasks | Status | Exit check |
|---|---|---|---|---|
| 0 | Project skeleton, HDS theme, tooling | 0.1 | ✅ | `npm test` and `npm run build` pass |
| 1 | Catalog data matches oracle | 1.1 | ✅ | fixture test green |
| 2 | Mission evaluation (faults, science, cost, time) | 2.1, 2.2 | ⬜ | oracle parity on all reference designs |
| 3 | Game state machine (roles, approvals, appeals, design, integration, go poll) | 3.1–3.4 | ⬜ | full mission scripted in a test, solo and team |
| 4 | Scoring, awards, campaign, gamification | 4.1, 4.2 | ⬜ | campaign test: fail → refly → success → unlock |
| 5 | Local playable UI (solo + pass-and-play) | 5.1–5.5 | ⬜ | a complete Wildfire mission played in the browser |
| 6 | Launch / ops / debrief, Elon cartoon, campaign screen | 6.1–6.3 | ⬜ | failure, partial and success scenes all reachable |
| 7 | Online rooms + chat | 7.1, 7.2 | ⬜ | two browser windows complete a mission |
| 8 | Tutorial with Elon coach and scripted teammates | 8.1, 8.2 | ⬜ | tutorial completes: planted failure → fix → success |
| 9 | Arabic + RTL | 9.1 | ⬜ | Arabic toggle, no missing keys, layout mirrors |
| 10 | Sound, polish, deploy, final review | 10.1, 10.2 | ⬜ | Vercel URL plays end to end |

**48-hour cut line:** Phases 0–5 and 7 are must-have. 6 and 8 are should-have (at minimum a static debrief and a text-only tutorial). 9 and 10 shrink first.

---

## Phase 0 — Skeleton

### Task 0.1: Scaffold project, theme, test runner

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/ui/theme.css`, `src/i18n/i18n.ts`, `src/i18n/en.json`, `tests/smoke.test.ts`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: `t(key: string, vars?: Record<string,string|number>): string`; `setLang(lang: 'en'|'ar'): void` (sets `document.documentElement.dir` and `lang`); `useLang(): 'en'|'ar'`. CSS custom properties for every HDS token listed in Global Constraints. Tailwind theme maps `font-display` = Inter, `font-body` = Public Sans, `font-mono` = DM Mono.

- [ ] **Step 1:** `git init` at the project root. Scaffold with `npm create vite@5 . -- --template react-ts`. Install `tailwindcss@4 @tailwindcss/vite framer-motion@11 @fontsource/inter @fontsource/public-sans @fontsource/dm-mono @supabase/supabase-js@2`, plus dev deps `vitest@2 @testing-library/react @testing-library/jest-dom jsdom`.
- [ ] **Step 2:** Write `tests/smoke.test.ts`: `expect(t('app.title')).toBe('Mission Control')`, and that `t('missing.key')` returns `'missing.key'`.
- [ ] **Step 3:** Run `npx vitest run`. Expected: FAIL (no i18n module).
- [ ] **Step 4:** Implement `i18n.ts` (flat JSON lookup with `{var}` interpolation) and `theme.css` (tokens; dark background `--carbon-90`; starfield via CSS radial gradients). `App.tsx` renders the title and the legal footer.
- [ ] **Step 5:** Run `npx vitest run && npm run build`. Expected: PASS, build succeeds.
- [ ] **Step 6:** Commit `chore: scaffold Mission Control with HDS theme and i18n`.

---

## Phase 1 — Catalog

### Task 1.1: Engine types + catalog data + oracle fixtures

**Files:**
- Create: `src/engine/types.ts`, `src/engine/data/{vehicles,orbits,stations,components,instruments,objectives,difficulty}.ts`, `src/engine/catalog.ts`, `tests/fixtures/reference-designs.json`, `tests/engine/catalog.test.ts`
- Modify: `docs/superpowers/specs/balance_reference.py` (add `--dump` mode)

**Interfaces:**
- Produces (types.ts): `Role = 'planner'|'scientist'|'designer'|'radio'`; `Difficulty = 'fan'|'nerd'|'expert'`; `Slot = 'structure'|'power'|'battery'|'computer'|'attitude'|'thermal'|'propulsion'|'storage'|'protection'|'antenna'|'band'`; `Design = { orbit: OrbitId; vehicle: VehicleId; instruments: InstrumentId[]; stations: StationId[] } & Record<Slot, string>`; `Severity = 'critical'|'major'|'minor'`; `FaultCode` = the union of the oracle's codes (`vehicle_cannot_reach, over_capacity, structure_overloaded, wrong_destination, power_deficit, thin_power_margin, battery_short, no_capture_propulsion, no_landing_kit, radiation_fried, telescope_blinded, tumbling, pointing_too_coarse, no_link, no_station_in_view, coverage_low, downlink_bottleneck, computer_overloaded, storage_overflow, thermal_failure, short_lifetime, wasted_stations, irrelevant_instruments, schedule_overrun, missed_mars_window, unused_allocation`); `Fault = { severity: Severity; code: FaultCode; roles: Role[] }`.
- Produces (catalog.ts): `VEHICLES, ORBITS, STATIONS, COMPONENTS, INSTRUMENTS, OBJECTIVES` records keyed by id. `optionsFor(diff: Difficulty, slot: Slot, unlocked: string[]): string[]` (returns `[]` when the slot is auto). `autoOption(diff, slot, orbit: OrbitId): string | null` (destination-aware thermal). `vehiclesFor(diff)`, `orbitsFor(diff)`, `instrumentsFor(diff, unlocked)`, `objectivesFor(diff)`. `LOCKED_AT_START = ['highperf','ion','ka','hyperspectral']`. `STARTING_BUDGET = {fan:2000, nerd:1600, expert:1300}`.

- [ ] **Step 1:** Add `--dump out.json` to `balance_reference.py`. For every (difficulty, objective), write the 2 cheapest distinct viable designs, plus for each objective 3 deliberately broken variants (vehicle swapped for `electron`; battery downgraded to the smallest; antenna `medium` at a DSN destination). Each entry records `evaluate()`'s `outcome, fault codes, mass, cost, sci, downlink, cov, life`. Run it to `tests/fixtures/reference-designs.json`.
- [ ] **Step 2:** Write `catalog.test.ts`. Asserts: 11 vehicles, 11 orbits, 11 stations, 12 instruments, 9 objectives; `VEHICLES.falcon9.cap.ESC === 2500`; `optionsFor('fan','structure',[])` equals `['medium','large']`; `optionsFor('fan','computer',[])` equals `[]` and `autoOption('fan','computer','sso') === 'radhard'`; `autoOption('nerd','thermal','mars_surf') === 'active'`; `instrumentsFor('expert',[])` excludes `hyperspectral`; `objectivesFor('fan')` equals `['wildfire','telescope','mars_ice']`.
- [ ] **Step 3:** Run `npx vitest run tests/engine/catalog.test.ts`. Expected: FAIL.
- [ ] **Step 4:** Transcribe the appendix tables (§2–§7) into the data files, and implement the catalog helpers.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat(engine): catalog data and oracle fixtures`.

---

## Phase 2 — Mission evaluation

### Task 2.1: `evaluateDesign` — physics, faults, science, cost (oracle parity)

**Files:**
- Create: `src/engine/evaluate.ts`, `tests/engine/evaluate.test.ts`

**Interfaces:**
- Consumes: catalog (Task 1.1).
- Produces: `evaluateDesign(design: Design, objective: ObjectiveId, diff: Difficulty, ctx?: { unlocked?: string[]; scheduleMode?: 'rush'|'standard'|'careful' }): MissionReport`, where `MissionReport = { outcome: 'success'|'partial'|'failure'; faults: Fault[]; mass: number; capacity: number; powerDraw: number; powerGen: number; dataGenerated: number; downlink: number; coverage: number; lifeYears: number; science: number /*0..1*/; cost: number; devMonths: number }`. Also `coverage(orbit, stations, band): number` and `liveTotals(partial: Partial<Design>): { mass, powerDraw, powerGen, cost, dataGenerated }` (for gauges; it tolerates missing slots).

- [ ] **Step 1:** Write `evaluate.test.ts`. A table-driven test loads every fixture and asserts `outcome`, the sorted fault codes, `mass`, `cost`, and `science` (to 2 decimals) equal the oracle's. Also add single-rule tests: GEO with 2 stations → `wasted_stations` minor; Svalbard alone for GEO → coverage 0 → `no_station_in_view`; Mars surface with solar and the small battery → `battery_short` **critical**; Jupiter without `rad_shield` → `radiation_fried`; Careful mode → `devMonths` = (max item months + 6) × 1.25, and cost × 0.95.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Port `evaluate()` from `balance_reference.py` line for line (appendix §8 formulas). Add the cost and dev-time schedule multipliers (Rush ×1.2 cost / ×0.75 time; Careful ×0.95 / ×1.25). With Careful, the first minor fault is removed from the list.
- [ ] **Step 4:** Run it. Expected: PASS, every fixture at parity.
- [ ] **Step 5:** Commit `feat(engine): mission evaluation at oracle parity`.

### Task 2.2: Debrief explanations

**Files:**
- Create: `src/engine/explain.ts`, `tests/engine/explain.test.ts`; Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: `explainFault(f: Fault, report: MissionReport, design: Design): { titleKey: string; whatKey: string; whyKey: string; fixKey: string; learnUrl: string; vars: Record<string,string|number> }`. Each `FaultCode` maps to i18n keys `fault.<code>.{title,what,why,fix}` and one NASA URL (JPL Basics of Space Flight, NASA Space Place, NASA SmallSat SOA, NASA DSN, NASA Earth Observatory).

- [ ] **Step 1:** Test: every `FaultCode` has all 4 keys present in `en.json` and a URL starting with `https://`. Also `explainFault(over_capacity)` has `vars.mass` and `vars.capacity` filled in.
- [ ] **Step 2:** Run it → FAIL. **Step 3:** Write the mapping, plus plain-language copy for every fault: one sentence each, no jargon, and the concept named once. **Step 4:** Run it → PASS. **Step 5:** Commit `feat(engine): plain-language fault explanations`.

---

## Phase 3 — Game state machine

### Task 3.1: State model, lobby, roles, chat

**Files:**
- Create: `src/engine/state.ts`, `src/engine/rng.ts`, `src/engine/game.ts`, `tests/engine/lobby.test.ts`

**Interfaces:**
- Produces:
  - `Mode = 'solo'|'local'|'online'`.
  - `Phase = 'lobby'|'objective_proposal'|'objective_review'|'planning'|'design'|'integration'|'go_poll'|'launch'|'operations'|'debrief'|'campaign'|'campaign_over'`.
  - `GameState = { mode; difficulty; seed: number; players: Player[]; campaign: Campaign; mission: Mission | null; chat: ChatMsg[] /*≤200*/; log: LogEntry[] }`.
  - `Player = { id; name; roles: Role[]; connected: boolean; xp: number; badges: string[] }`.
  - `Campaign = { funds; launches; month; unlocked: string[]; history: MissionResult[]; patches: Patch[] }`.
  - `Mission`: see Task 3.2.
  - `Action`: a discriminated union on `type`. `ActionResult = { ok: true; state: GameState } | { ok: false; error: string }`.
  - `createGame(opts: { mode: Mode; difficulty: Difficulty; seed: number; hostName: string }): GameState`.
  - `applyAction(state: GameState, action: Action, actorId: string): ActionResult`. It never mutates its input.
  - `rolesOf(state, playerId): Role[]`.
  - `nextRandom(seed): [number, number]` (mulberry32).
- Lobby actions: `join{name}`, `claimRole{role}`, `releaseRole{role}`, `setConnected{playerId, connected}` (host only; disconnecting releases that player's roles), `startCampaign{}` (needs all 4 roles claimed), `chat{text}` (1–300 chars, trimmed).

- [ ] **Step 1: Tests.**
  - solo `createGame` gives one player holding all 4 roles.
  - `claimRole` on a taken role → error `role_taken`.
  - `startCampaign` with 3 roles claimed → `roles_unclaimed`.
  - In online mode, `setConnected(false)` releases roles and every phase action needing that role errors `role_unclaimed` until it's reclaimed.
  - Chat over 200 messages keeps the last 200.
  - `startCampaign` → `funds === STARTING_BUDGET[diff]` and phase `objective_proposal`.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS → **Step 5:** Commit `feat(engine): game state, lobby and roles`.

### Task 3.2: Objective proposal, request/approve/reject/appeal, planning

**Files:**
- Create: `src/engine/requests.ts`, `src/engine/phases/objective.ts`, `src/engine/phases/planning.ts`, `tests/engine/objective.test.ts`

**Interfaces:**
- Produces:
  - `Request = { id; kind: 'objective'|'funding'|'purchase'; from: Role; amount?: number; target?: 'designer'|'radio'; status: 'pending'|'approved'|'rejected'|'closed'; appeals: number; reasons: string[] }`.
  - `Mission = { phase; objectiveId?; pitch?; requests: Request[]; budget: { total; designer; radio; reserve }; targetMonth?; scheduleMode: 'rush'|'standard'|'careful'; design: Partial<Design>; instrumentRequest: InstrumentId[]; instrumentStatus: 'none'|'pending'|'accepted'|'pushed_back'|'final'; ready: Record<'scientist'|'designer'|'radio', boolean>; pairing: { designer: boolean; radio: boolean }; purchaseApproved: boolean; votes: Partial<Record<Role,'go'|'nogo'>>; backorders: Backorder[]; report?: MissionReport; result?: MissionResult }`.
  - Actions: `proposeObjective{objectiveId, pitch}` (scientist), `review{requestId, decision:'approve'|'reject', reason?}` (planner), `appeal{requestId, reason}` (the requester; allowed while `appeals < 2` and status is `rejected`), `withdraw{requestId}`, `setPlan{total, designer, radio, targetMonth, scheduleMode}` (planner; `designer + radio ≤ total ≤ campaign.funds`, reserve = remainder), `confirmPlan{}`.
- [ ] **Step 1: Tests.**
  - Proposing then rejecting → status `rejected`. Appeal → `pending`, appeals 1. A second rejection then appeal → appeals 2. A third rejection makes `appeal` error `appeals_exhausted`. Withdrawing or proposing a different objective closes the old request.
  - Approving moves to `planning`.
  - `setPlan` with designer + radio > total → `allocation_exceeds_total`; total > funds → `exceeds_funds`.
  - `confirmPlan` → `design`.
  - **Solo mode never creates an objective request**: `proposeObjective` goes straight to `planning`.
  - A non-planner calling `review` → `not_your_role`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(engine): objective approvals, appeals and planning`.

### Task 3.3: Design phase — slots, instruments review, funding, backorders, hard caps, ready

**Files:**
- Create: `src/engine/phases/design.ts`, `src/engine/spend.ts`, `tests/engine/design.test.ts`

**Interfaces:**
- Produces:
  - `spendOf(mission, role: 'designer'|'radio'): number`. Designer = slots + accepted instruments + vehicle. Radio = stations.
  - `Backorder = { id; slot: Slot; option: string; status: 'open'|'wait'|'express'|'substitute' }`.
  - Actions:
    - `setSlot{slot, option}` (designer; `antenna`/`band` = radio; must be in `optionsFor`).
    - `setVehicle{vehicle}` (designer); `setOrbit{orbit}` (radio); `setStations{stations}` (radio).
    - `requestInstruments{list}` (scientist).
    - `reviewInstruments{decision:'accept'|'pushback', reason?}` (designer; a push-back is only allowed when status is `pending`, not `final`).
    - `requestFunds{target, amount, reason}` (designer|radio).
    - `resolveBackorder{id, choice:'wait'|'express'|'substitute'}` (planner).
    - `moveFunds{from, to, amount}` (planner).
    - `setReady{ready}` (scientist|designer|radio).
- Rules:
  - A pick that would make `spendOf > allocation` errors `over_allocation`.
  - Accepting instruments also checks the designer cap.
  - A resend after a push-back sets status `final`, and accept is then forced (accept is the only valid review).
  - Approving funding moves money from reserve. If the amount is above the reserve → `insufficient_reserve`.
  - On entering design: Nerd creates 1 backorder and Expert creates 2. Each is drawn with the rng from that difficulty's available non-`none` options. `wait` adds 6 months; `express` adds $10M from the reserve; `substitute` makes that option unselectable.
  - `setReady(true)` errors `pending_items` while the role has a pending request or open review (scientist: instrument status `pending`/`pushed_back`; designer: open backorder on a chosen option).
  - Any edit by a role clears that role's ready flag.
  - When all 3 are ready → `integration`.
  - Solo: no reviews or funding requests; `requestInstruments` is accepted directly; the cap is the single total.
- [ ] **Step 1: Tests.** Cover each rule above, one test each:
  - `over_allocation`
  - push-back → resend → `final` → `reviewInstruments{pushback}` errors `already_final`
  - funding approve, then `insufficient_reserve`
  - funding rejected twice with appeals, then `appeals_exhausted`
  - backorder `express` deducts $10M
  - `setReady` blocked by a pending instrument review
  - edit clears ready
  - all ready → integration
  - the same seed gives the same backorders
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(engine): design phase with hard caps, reviews and backorders`.

### Task 3.4: Integration, go poll, launch, operations → report

**Files:**
- Create: `src/engine/phases/integration.ts`, `tests/engine/integration.test.ts`, `tests/engine/full-mission.test.ts`

**Interfaces:**
- Produces actions:
  - `agreePairing{agree: boolean}` (designer|radio).
  - `submitPurchase{}` (designer; creates a `purchase` request).
  - `vote{vote:'go'|'nogo'}` (each role; a player holding several roles votes once per role).
  - `launch{}` (planner, after 4 go votes; runs `evaluateDesign`, stores `mission.report`, deducts cost, applies the Mars-window wait).
  - `advanceOps{}` (radio; `operations` → `debrief`).
- Rules:
  - Both agree + purchase approved → `go_poll`.
  - `un-agree` or a `nogo` vote → back to `design`, clearing pairing, purchase approval, votes and ready flags (accepted instruments and approved funding are kept).
  - Any design edit during integration → back to `design` with the same clearing.
  - Mars objectives: launch month = next value of `month ≡ 0 (mod 26)` that's ≥ `campaign.month + devMonths`. The waiting months × $4M are paid from reserve, then funds, and logged as a minor `missed_mars_window` fault (Planner) when the wait is > 0 and `targetMonth` is earlier than launch.
  - `schedule_overrun` minor when the ready month is past `targetMonth`. `unused_allocation` minor when > 30% of the allocation is unspent.
  - Solo: pairing, purchase and poll are skipped (`integration` → `launch` directly).
- [ ] **Step 1: Tests.**
  - "editing design after purchase approval clears approval".
  - `nogo` returns to design and keeps the accepted instruments.
  - Launch deducts exactly `report.cost`.
  - The Mars window case: month 0, devMonths 30 → launch month 52, wait 22 months, +$88M.
  - `full-mission.test.ts`: a scripted 4-role team flies the cheapest Fan wildfire fixture design to `debrief` with outcome `success`; the same flow in solo mode takes fewer than half as many actions.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(engine): integration, go/no-go and launch`.

---

## Phase 4 — Scoring & campaign

### Task 4.1: Role scores, awards, team points

**Files:**
- Create: `src/engine/scoring.ts`, `tests/engine/scoring.test.ts`

**Interfaces:**
- Produces: `scoreMission(mission: Mission, report: MissionReport, diff: Difficulty): MissionResult`, where `MissionResult = { objectiveId; outcome; roleScores: Record<Role, number /*0..100*/>; teamPoints: 0|400|1000; awards: Award[]; grant: number; cost: number; faults: Fault[] }` and `Award = { id: 'cost_efficiency'|'scientific_value'|'new_gear'|'effective_decision'; role?: Role; unlock?: string }`.
- Formulas: spec §10, exactly.
  - Margin scores: ideal band → 100, linear falloff to 0 at margin 0 or at 2× the band's upper bound.
  - Planner decision quality = 100 − 20 × (approved requests whose subject later carried a blamed fault) − 10 × (appeals accepted after the first rejection).
  - Fault penalties: −30/−15/−5, split across the blamed roles.
  - Grant: success = `objective.grant × science`; partial = half of that.
  - New Gear picks the first still-locked id from `LOCKED_AT_START` (ordered list).
- [ ] **Step 1: Tests.** Over-capacity failure → designer score ≤ 70 and team points 0. Perfect fixture design → all awards except where the thresholds miss. Shared blame splits the penalty (designer −15, radio −15 on `vehicle_cannot_reach`). Scores are clamped to 0–100.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(engine): role scoring and awards`.

### Task 4.2: Campaign flow + gamification (XP, ranks, badges, patches)

**Files:**
- Create: `src/engine/campaign.ts`, `src/engine/gamify.ts`, `tests/engine/campaign.test.ts`

**Interfaces:**
- Produces actions: `finishDebrief{}` (any player; applies the result: funds += grant, `launches++`, `month = launch month`, unlocks, XP, badges, patch; → `campaign`, or `campaign_over` when `launches === 5 || funds < 50`), and `nextMission{flyAgain: boolean}` (planner; `flyAgain` pre-fills the previous design, minus options that are now unavailable).
- Gamify: `xpFor(roleScore): number` (= the score). `rankOf(xp)`: Cadet < 300 ≤ Flight Engineer < 800 ≤ Mission Specialist < 1500 ≤ Flight Director. `badgesFor(history, result): string[]` with ids `penny_pincher, data_hoarder, nailed_the_landing, rapid_unscheduled_disassembly, comeback_kid, one_station_wonder`. `makePatch(seed, objectiveId, teamName): Patch` (shape, 2 colours from HDS tokens, icon id).
- [ ] **Step 1: Tests.**
  - Fail → `rapid_unscheduled_disassembly` badge.
  - `nextMission{flyAgain:true}` → success → `comeback_kid`, and `new_gear` unlocks `highperf`.
  - Funds 40 after a failure → `campaign_over`.
  - Five launches → `campaign_over`.
  - Patch generation is deterministic for the same seed.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(engine): campaign, XP, badges and patches`.

---

## Phase 5 — Local playable UI

All screens read `GameState` through `useGame()` and dispatch `Action`s. Verification is component tests for key interactions, plus playing it in the browser with the `run` skill.

### Task 5.1: Game store + transport interface + home/lobby

**Files:**
- Create: `src/net/transport.ts`, `src/net/localTransport.ts`, `src/net/useGame.tsx`, `src/ui/screens/Home.tsx`, `src/ui/screens/Lobby.tsx`, `src/ui/components/{Button,Card,RoleBadge}.tsx`, `tests/ui/lobby.test.tsx`

**Interfaces:**
- Produces:
  - `interface Transport { state: GameState | null; me: string; dispatch(a: Action): void; subscribe(cb: (s: GameState, err?: string) => void): () => void; dispose(): void }`.
  - `createLocalTransport(opts: { mode: 'solo'|'local'; difficulty; names: string[] }): Transport` (pass-and-play: `me` = whoever holds the active role tab; it persists to localStorage key `mc.save.v1` after every action and resumes on load).
  - `GameProvider` / `useGame(): { state; me; dispatch; lastError }`.
- Home: Solo / Pass-and-play / Host online / Join online, a difficulty picker, a Tutorial button, and a resume banner when a save exists.
- [ ] **Step 1:** Test: rendering Lobby in local mode with 2 players, claiming all 4 roles and pressing Start shows the Objective screen. The Start button is disabled while roles are unclaimed.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(ui): local transport, home and lobby`.

### Task 5.2: Mission board shell — role tabs, telemetry gauges, request inbox, activity log

**Files:**
- Create: `src/ui/screens/MissionBoard.tsx`, `src/ui/components/{Gauge,RoleTabs,RequestInbox,ActivityLog,InfoTip}.tsx`, `src/ui/handbook/Handbook.tsx`, `src/ui/handbook/entries.ts`, `tests/ui/gauges.test.tsx`

**Interfaces:**
- `Gauge{label, value, unit, max?: number, hint?: 'ok'|'warn'|'bad'}`: DM Mono number plus an animated arc. `max` and `hint` are passed **only** when the Fan hints apply (mass vs capacity, power draw vs generation), via `liveTotals`.
- `InfoTip{entryId}` opens a Handbook entry (What is it / Why it matters / NASA link). There is an entry for every option id in the catalog.
- Everyone sees all panels. Inputs are disabled unless `rolesOf(state, me)` includes the panel's role.
- [ ] **Step 1:** Tests: Fan shows the mass gauge with a max, Expert shows the gauge without a max or hint; a panel is read-only for a non-owner; every catalog option id has a Handbook entry.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(ui): mission board, gauges and handbook`.

### Task 5.3: Scientist + Planner panels

**Files:**
- Create: `src/ui/panels/ScientistPanel.tsx`, `src/ui/panels/PlannerPanel.tsx`, `src/ui/components/{ObjectiveCard,InstrumentCard,BudgetSplitter,ReviewDialog}.tsx`, `tests/ui/approvals.test.tsx`
- Scientist: three mission-type columns with objective cards (icon, one-line science story, grant), a pitch field, instrument cards with raw stats, a request button, and push-back reasons shown inline.
- Planner: objective review (approve, or reject with a required reason), a budget splitter (three linked sliders with a reserve readout), target launch month, schedule-mode toggle, inbox for funding and purchase requests, backorder cards (wait / express / substitute).
- [ ] **Step 1:** Test: propose → reject with reason → appeal is visible with "1 of 2 appeals left" → approve → planning panel appears.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(ui): scientist and planner panels`.

### Task 5.4: Designer + Radio panels, integration and go poll screens

**Files:**
- Create: `src/ui/panels/DesignerPanel.tsx`, `src/ui/panels/RadioPanel.tsx`, `src/ui/components/{SlotPicker,VehicleCard,OrbitCard,StationMap}.tsx`, `src/ui/screens/{Integration,GoPoll}.tsx`, `tests/ui/design.test.tsx`
- Designer: a **3D spacecraft** (`src/ui/three/Spacecraft3D.tsx`, rebuilt from the chosen parts, auto-rotating, drag to orbit) with a 2D fallback, slot pickers (option cards with stats; disabled with "Request funds" when over the cap), vehicle cards with the capacity table, the instrument review box.
- Radio: orbit cards (trait chips), a **3D orbit view** (`src/ui/three/OrbitView3D.tsx`: planet, orbit ring, moving spacecraft), band and antenna pickers, a flat world-map SVG with clickable station pins and a live coverage % readout, and cost.
- Integration: the pairing lock (two toggles side by side) and a purchase-order summary.
- GoPoll: four role consoles, Go/No-Go buttons, then a red hold-to-launch button (1.5 s).
- [ ] **Step 1:** Test: choosing an over-cap slot shows "Request funds" and does not dispatch `setSlot`; un-agreeing returns to design; the hold-to-launch button only fires after 1.5 s (fake timers).
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(ui): designer, radio, integration and go poll`.

### Task 5.5: Static debrief + campaign screen, end-to-end local play

**Files:**
- Create: `src/ui/screens/{Debrief,Campaign,CampaignOver}.tsx`, `src/ui/components/{FaultCard,ScoreBars,AwardChip,Patch}.tsx`
- Debrief: an outcome banner, a `FaultCard` per fault from `explainFault` (what → why → whose decision → fix → Learn more), money in and out, per-role score bars, awards, badges.
- Campaign: funds, the month calendar, the patch wall, unlocked gear, and Next mission / Fly again.
- [ ] **Step 1:** Using the `run` skill, play a Fan solo mission in the browser: a wildfire design with the small battery, then the fixed design. Expected: a partial debrief naming `battery_short` and the Designer, then a success, with a patch on the wall. Screenshot both.
- [ ] **Step 2:** Run `npx vitest run && npm run build`. Expected: green.
- [ ] **Step 3:** Commit `feat(ui): debrief and campaign screens — local game playable`.

---

## Phase 6 — Cinematics & Elon

### Task 6.1: Elon Musk cartoon SVG (poses)

**Files:**
- Create: `src/ui/elon/Elon.tsx`, `src/ui/elon/poses.ts`
- `Elon{pose: 'idle'|'point'|'celebrate'|'tantrum'|'shrug', size?: number}`: flat-vector caricature (big head, dark swept hair, black T-shirt, team cap). Pose = limb rotations driven by Framer Motion variants. No photos, no logos.
- [ ] **Step 1:** Storybook-free check: a dev-only `/#elon` page renders all 5 poses. Take a screenshot with the `run` skill. **Step 2:** Commit `feat(ui): Elon cartoon with poses`.

### Task 6.2: Launch + operations cinematics

**Files:**
- Create: `src/ui/screens/{Launch,Operations}.tsx`, `src/ui/cinematics/{Rocket,Starfield,Timeline,SignalMeter}.tsx`
- Launch: a **3D scene** (`src/ui/three/LaunchScene3D.tsx`: low-poly rocket sized by vehicle, pad, smoke particles, Earth curve) with a 10-second countdown in DM Mono, liftoff, staging, and orbit insertion. The break point comes from the worst fault: pad explosion for `over_capacity`/`vehicle_cannot_reach`, otherwise a nominal climb.
- Operations: a timeline of beats (deploy, instruments on, first light, downlink). Radio presses "Send commands" and "Downlink data" to advance. The data counter tweens to `report.downlink`. Skippable.
- [ ] **Step 1:** Using `run`, launch the over-capacity fixture and a success fixture; both reach the debrief. **Step 2:** Commit `feat(ui): launch and operations cinematics`.

### Task 6.3: Outcome scenes

**Files:**
- Create: `src/ui/cinematics/OutcomeScene.tsx`
- Failure: Elon in the `tantrum` pose (kicks the ground, screams "ARGH", throws his cap). There are 3 variants by the worst fault group (launch / comms / power-thermal), each ~4 s, skippable, ending with a quip from `en.json`. Partial: `shrug`, "Not bad, not great." Success: `celebrate`, confetti, patch stamp.
- [ ] **Step 1:** Run all three outcomes with `run`. **Step 2:** Commit `feat(ui): outcome scenes with Elon`.

---

## Phase 7 — Online

### Task 7.1: Supabase host/client transport

**Files:**
- Create: `src/net/supabaseTransport.ts`, `src/net/protocol.ts`, `tests/net/protocol.test.ts`, `.env.example`

**Interfaces:**
- Protocol messages on channel `room:<CODE>` (6-char code, `A–Z` without `O`/`I`, plus `2–9`):
  - `{t:'action', from, action, seq}`
  - `{t:'state', state, rev, err?: {to, error}}`
  - `{t:'hello', playerId, name}`
  - `{t:'snapshot_req', playerId}`
- Pure helper: `hostReduce(state, rev, msg): { state; rev; reply: Msg[] }`, which wraps `applyAction`. A failure replies with the current state plus an `err` for the sender.
- `createHostTransport({difficulty, name}): Promise<Transport & {code}>`, `createClientTransport({code, name}): Promise<Transport>`.
- Presence `leave` for a client → the host dispatches `setConnected(false)`. Host leaves → clients show "Host ended the room".
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. When they're missing, the online buttons are hidden with a tooltip.
- [ ] **Step 1: Tests (pure):** "host rejects stale action and rebroadcasts" (a `vote` during `design` → reply carries the state plus `err.error === 'wrong_phase'`). `rev` increases by 1 per accepted action. A `snapshot_req` replies with the state.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** With `run`: two browser windows (host + client) on the real Supabase project complete a Fan mission. Then close the client mid-design → its roles show as unclaimed → the host claims them → the mission continues.
- [ ] **Step 6:** Commit `feat(net): online rooms over Supabase Realtime`.

### Task 7.2: Chat panel

**Files:**
- Create: `src/ui/components/ChatPanel.tsx`
- A collapsible side panel (online only): messages with role badges, system lines for every request and decision (generated from `state.log`), and an unread counter.
- [ ] **Step 1:** Component test: sending dispatches `chat`, and system lines render distinctly. **Step 2:** Commit `feat(ui): in-game chat`.

---

## Phase 8 — Tutorial

### Task 8.1: Tutorial script engine + scripted teammates

**Files:**
- Create: `src/tutorial/script.ts`, `src/tutorial/runner.ts`, `tests/tutorial/runner.test.ts`

**Interfaces:**
- `TutorialStep = { id; coachKey: string; pose: ElonPose; spotlight?: string /*data-tut attr*/; expect?: (a: Action) => boolean; actor?: { role: Role; action: Action; chatKey: string } }`.
- `runTutorialAction(tState, action): { tState; game: GameState; advanced: boolean }`.
- The tutorial game is `local` mode with all 4 roles on one player. Scripted actor actions are applied with a bot `actorId` so the approval flow runs.
- Script: wildfire objective → **scripted Planner rejects ("too pricey")** → player appeals → approved. The player sets the budget as Planner. As Scientist, the player requests 2 instruments → **scripted Designer pushes back** → the player resends. As Designer, the player picks a pre-filled design with the **small battery** (planted flaw) → requests funds → approves as Planner. As Radio, the player picks SSO, Svalbard and Kiruna. Then the go poll and launch → partial result (battery). The debrief tour → Fly again → fix the battery → success.
- [ ] **Step 1:** Test: feeding the expected actions in order reaches `debrief` with `battery_short`, then a second debrief with `success`. An unexpected action does not advance the step.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(tutorial): script engine and scripted teammates`.

### Task 8.2: Tutorial overlay with Elon coach

**Files:**
- Create: `src/ui/tutorial/{TutorialOverlay,Spotlight,CoachBubble}.tsx`; Modify: panels to add `data-tut` attributes; `en.json` coach lines.
- The coach is the Elon cartoon with speech bubbles. Each concept gets one sentence (orbital altitude, payload capacity, power, data rate, coverage, lifetime, trade-offs) with an optional "Learn more" link.
- [ ] **Step 1:** Play the tutorial with `run` from start to finish (target ≤ 12 min). **Step 2:** Commit `feat(ui): tutorial overlay with Elon coach`.

---

## Phase 9 — Arabic

### Task 9.1: Arabic strings + RTL

**Files:**
- Create: `src/i18n/ar.json`, `tests/i18n/keys.test.ts`; Modify: `Home.tsx` (language toggle)
- [ ] **Step 1:** Test: `ar.json` has exactly the key set of `en.json`, and no value is empty.
- [ ] **Step 2:** FAIL → draft all Arabic strings (with Western digits) → PASS.
- [ ] **Step 3:** With `run`: toggle to Arabic and check that the layout mirrors, gauges and numbers stay left-to-right, and the world map is not mirrored. Flag `ar.json` for review by a native speaker in the README.
- [ ] **Step 4:** Commit `feat(i18n): Arabic with RTL layout`.

---

## Phase 10 — Polish & ship

### Task 10.1: Sound + achievement toasts + responsive pass

**Files:**
- Create: `src/ui/sound.ts` (WebAudio-synthesised beeps, rumble, static, fanfare, argh; no asset files), `src/ui/components/{Toast,MuteToggle}.tsx`
- [ ] **Step 1:** With `run`: sounds play at countdown, launch, debrief and outcome, and mute persists in localStorage. At 375 px: no horizontal scroll on any screen. **Step 2:** Commit `feat(ui): sound, toasts, responsive fixes`.

### Task 10.2: Deploy + final review

- [ ] **Step 1:** `npm run build`. Add `vercel.json` (SPA rewrite). Deploy with the `vercel` CLI, using the Supabase env vars from the user.
- [ ] **Step 2:** Smoke-test the deployed URL: solo mission, tutorial, and an online room across 2 devices.
- [ ] **Step 3:** Whole-branch review (superpowers:requesting-code-review), fix the findings, and commit `chore: release v1`.
- [ ] **Step 4:** Mark every phase ✅ in the Progress Tracker.
