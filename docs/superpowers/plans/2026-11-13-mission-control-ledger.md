# SDD ledger — plan: /home/si-ai/Downloads/nasa space apps v2/docs/superpowers/plans/2026-11-13-mission-control.md
Spec: docs/superpowers/specs/2026-11-13-mission-control-design.md (+ balance appendix, balance_reference.py oracle)
Pre-flight:
- 1.1→2.1 catalog types/helpers → evaluateDesign: consistent (Design, Slot, FaultCode).
- 2.1→3.4 evaluateDesign(design, objective, diff, ctx) → launch: consistent; launch adds missed_mars_window/schedule_overrun/unused_allocation faults on top of report.faults (codes declared in 1.1 union).
- 3.2 Mission type ← used by 3.3/3.4/4.1: consistent.
- 4.1 MissionResult → 4.2 finishDebrief: consistent.
- 5.1 Transport → 7.1 host/client transports implement same interface: consistent.
- 6.1 ElonPose → 8.1 TutorialStep.pose: plan uses ElonPose type in 8.1 but 6.1 only lists poses as literal union. Ruling: export `type ElonPose` from src/ui/elon/poses.ts in 6.1 — trivial — cost if wrong: none.
Ruling: execution on branch build/mission-control (repo had an existing 'First commit' on main) — keeps main clean — cost if wrong: none.
Task 0.1: complete (commits 68f059f..fa5923d, tests: npx vitest run →    Duration  1.39s (transform 74ms, setup 95ms, collect 43ms, tests 4ms, environment 600ms, prepare 176ms))
Task 1.1: complete (commits fa5923d..28bb908, tests: npx vitest run →    Duration  1.39s (transform 173ms, setup 184ms, collect 205ms, tests 14ms, environment 1.17s, prepare 314ms))
Task 1.1: Ruling: added catalog constants (CAMPAIGN_MAX_LAUNCHES, MARS_WINDOW_MONTHS, EXPRESS_FEE, etc.) and Station map x/y + Vehicle names beyond plan's Interfaces — needed by later tasks/UI — cost if wrong: none.
PAUSED 2026-11-13 by user request (model switch). RESUME AT: Task 2.1 (evaluateDesign). Fixtures ready: tests/fixtures/reference-designs.json. Oracle: docs/superpowers/specs/balance_reference.py evaluate(). Executor skill: superpowers:executing-plans; TDD each task; task-start/task-done scripts in executing-plans/scripts.
RESUMED on Fable. User added requirement: "gamified experience (3D, simple, and fun)".
Ruling: add low-poly 3D via three + @react-three/fiber@8 + drei@9 (primitives only, no model assets), for spacecraft builder (5.4), orbit view (5.4), launch/ops (6.2); lazy-loaded with 2D fallback (WebGL missing / jsdom tests). Spec §2/§9/§15 + plan updated. Elon stays a 2D SVG cartoon overlay — cheapest route to a recognisable caricature — cost if wrong: user wanted Elon in 3D too; can be added later.
Task 2.1: complete (commits 4c3fb33..137138b, tests: npx vitest run →    Duration  1.57s (transform 410ms, setup 359ms, collect 611ms, tests 71ms, environment 1.85s, prepare 486ms))
Task 2.2: Ruling: i18n strings live in TS modules (src/i18n/en/*.ts merged in en/index.ts; ar/ mirrors) instead of en.json/ar.json — easier to author large copy without JSON escaping; key-parity test in 9.1 compares the merged objects — cost if wrong: none.
Task 2.2: Ruling: explainFault takes (fault, report, design, objective, extra?) — objective needed for copy vars; extra carries schedule/mars numbers — cost if wrong: none.
Task 2.2: complete (commits 137138b..e974c4a, tests: npx vitest run →    Duration  1.64s (transform 528ms, setup 377ms, collect 912ms, tests 96ms, environment 2.70s, prepare 782ms))
Task 3.1/3.2: Ruling: implemented together in one commit (lobby test needs proposeObjective); phase lives on GameState (not Mission) since lobby/campaign have no mission; role-specific actions carry an explicit role (setReady, agreePairing, vote, requestFunds.from) because one player may hold several roles — cost if wrong: none.
Task 3.1: complete (commits e974c4a..288f124, tests: npx vitest run →    Duration  1.79s (transform 889ms, setup 641ms, collect 1.54s, tests 231ms, environment 4.30s, prepare 1.01s))
Task 3.2: complete (commits e974c4a..288f124, tests: npx vitest run →    Duration  1.73s (transform 766ms, setup 723ms, collect 1.39s, tests 191ms, environment 4.14s, prepare 1.04s))
Task 3.3: Ruling: 'Fly again' pre-fill is a Mission.template re-applied piece by piece when design opens (each piece skipped if it breaks a cap/availability) rather than seeding Mission.design directly — keeps hard caps true — cost if wrong: a re-flown design may come back partly empty when the new budget is smaller.
Task 3.3: Ruling: auto-set slots (and the Radio Operator's antenna/band) count in the Designer's spend from the start; choosing a Mars-surface orbit raises auto thermal cost — matches spec 'counts in the Designer's totals' — cost if wrong: surprising over_allocation on an orbit pick (UI explains).
Task 3.3: complete (commits 288f124..cb4b13c, tests: npx vitest run →    Duration  2.08s (transform 925ms, setup 767ms, collect 2.17s, tests 226ms, environment 6.28s, prepare 1.52s))
Task 3.4: complete (commits cb4b13c..9713e92, tests: npx vitest run →    Duration  2.28s (transform 1.36s, setup 1.34s, collect 3.53s, tests 481ms, environment 7.99s, prepare 1.68s))
Task 4.1: Ruling: over-built margins ease from 100 to a floor of 70 (plan said linear to 0 at 2× the band) — parts/rockets come in coarse sizes, so on Fan the smallest solar array already gives 900% margin and a zero would punish an unavoidable choice — cost if wrong: over-building is under-penalised.
Task 4.1: Ruling: New Gear unlocks are per difficulty (UNLOCKS: fan hga/sar/body_solar/magnetometer, nerd rtg/radiation/rad_shield/hyperspectral, expert = LOCKED_AT_START) — the four locked parts are Expert-only so Fan/Nerd would otherwise unlock nothing — cost if wrong: balance on Fan/Nerd shifts slightly after unlocks (more options only).
Task 4.1: Ruling: scoreMission(state) reads mission from state and is stored as mission.result at launch; Designer 'cost vs allocation' = 100 − 10 per funding request raised (hard caps make overspend impossible); Planner shares blame through the decision-quality score rather than as a named role on the fault — cost if wrong: Planner not listed on debrief fault cards.
Task 4.1: complete (commits 9713e92..de3ddec, tests: npx vitest run →    Duration  2.33s (transform 1.14s, setup 1.14s, collect 3.36s, tests 578ms, environment 9.92s, prepare 1.89s))
Task 4.2: complete (commits de3ddec..09ce3ff, tests: npx vitest run →    Duration  2.54s (transform 1.37s, setup 1.59s, collect 4.51s, tests 718ms, environment 10.99s, prepare 2.64s))
Task 5.1: complete (commits 09ce3ff..12f38d5, tests: npx vitest run →    Duration  2.57s (transform 1.45s, setup 2.19s, collect 4.82s, tests 838ms, environment 13.64s, prepare 1.99s))
Task 5.2–5.4: Ruling: built together (board shell, four panels, integration/poll cards share components); budget inputs are labelled range sliders (one control per value); over-cap detection uses an engine dry run (useGame.probe) so the UI can never disagree with the rules; 3D scenes are lazy components behind Scene3D with a 2D fallback — cost if wrong: none.
Task 5.2: complete (commits 12f38d5..989043b, tests: npx vitest run →    Duration  4.34s (transform 1.99s, setup 1.97s, collect 8.31s, tests 4.37s, environment 18.29s, prepare 3.24s))
Task 5.3: complete (commits 12f38d5..989043b, tests: npx vitest run →    Duration  3.92s (transform 1.85s, setup 1.91s, collect 8.38s, tests 4.20s, environment 15.32s, prepare 2.64s))
Task 5.4–6.3: Ruling: debrief/campaign/launch/operations/outcome/Elon screens were built in one pass and verified in a real browser (solo fail → tantrum → fly again → success → campaign, screenshots in scratchpad) with component tests added after (tests/ui/endgame.test.tsx) — the visuals needed eyes first; engine rules behind them were TDD'd — cost if wrong: UI regressions less tightly pinned than engine rules.
Task 6.2: Ruling: Operations beats run locally on each device (Radio drives with buttons, others auto-follow); only the final advance is a game action — keeps the engine to one 'operations' phase — cost if wrong: beats can be out of step between devices by a second or two.
Task 6.1: Ruling: Elon poses are CSS keyframes on SVG limb groups (not Framer Motion variants) — transform-box: fill-box gives reliable limb pivots — cost if wrong: none.
Task 5.4: complete (commits 989043b..cc17cd9, tests: npx vitest run →    Duration  6.57s (transform 3.60s, setup 3.95s, collect 17.03s, tests 7.58s, environment 24.89s, prepare 4.05s))
Task 5.5: complete (commits 989043b..cc17cd9, tests: npx vitest run →    Duration  5.24s (transform 2.53s, setup 2.85s, collect 12.64s, tests 5.83s, environment 19.16s, prepare 3.52s))
Task 6.1: complete (commits 989043b..cc17cd9, tests: npx vitest run →    Duration  6.40s (transform 3.52s, setup 3.01s, collect 16.68s, tests 6.79s, environment 24.69s, prepare 4.14s))
Task 6.2: complete (commits 989043b..cc17cd9, tests: npx vitest run →    Duration  5.17s (transform 2.80s, setup 2.31s, collect 12.46s, tests 6.00s, environment 18.65s, prepare 3.30s))
Task 6.3: complete (commits 989043b..cc17cd9, tests: npx vitest run →    Duration  5.16s (transform 2.53s, setup 2.30s, collect 12.52s, tests 5.89s, environment 20.33s, prepare 3.50s))
Task 7.1: Ruling: transports are bus-agnostic (src/net/roomTransport.ts) with three buses: Supabase Realtime (when VITE_SUPABASE_* set), BroadcastChannel between tabs of one browser (fallback, labelled in the UI), and an in-memory bus for tests — lets online play be verified end to end without credentials — cost if wrong: none; Supabase path itself is NOT yet verified against a real project (no keys provided).
Task 7.1: verified in browser with two tabs (BroadcastChannel bus): host+guest full mission incl. reject→appeal→approve, chat, go poll, launch, debrief; guest closing tab frees roles on host.
Task 7.2: Ruling: chat is a floating dock on every screen in online games (not only the board), merging chat messages and log entries by id — cost if wrong: none.
Task 7.1: complete (commits cc17cd9..efa77d5, tests: npx vitest run →    Duration  4.69s (transform 2.15s, setup 2.64s, collect 11.63s, tests 5.94s, environment 17.95s, prepare 3.03s))
Task 7.2: complete (commits cc17cd9..efa77d5, tests: npx vitest run →    Duration  4.69s (transform 2.07s, setup 2.34s, collect 11.05s, tests 6.04s, environment 18.01s, prepare 3.47s))
Task 8.1: Ruling: the planted flaw is an under-sized rocket (Electron → over_capacity failure), not a small battery as the plan said — Space Fan has no small battery, and a launch failure shows the Elon tantrum and the red mass gauge — cost if wrong: none (still fail → debrief → fix → success).
Task 8.1: Ruling: scripted teammates act through the player's own id (player holds all four roles in a local game) and speak via coach-side bubbles, not engine chat — avoids bot players in engine state — cost if wrong: teammate lines are not in the chat log.
Task 8.2: verified in browser: all 27 steps played by clicking, fail → tantrum debrief → fly again → success → back to menu, zero console errors.
Task 8.1: complete (commits efa77d5..bc8defc, tests: npx vitest run →    Duration  10.45s (transform 5.24s, setup 5.91s, collect 26.20s, tests 16.20s, environment 44.99s, prepare 7.14s))
Task 8.2: complete (commits efa77d5..bc8defc, tests: npx vitest run →    Duration  10.50s (transform 5.58s, setup 6.41s, collect 27.30s, tests 15.07s, environment 43.43s, prepare 9.45s))
Task 9.1: Arabic: 958 keys, parity + placeholder + digits tests green; verified in browser (solo mission in Arabic, RTL, zero horizontal overflow). Ruling: Arabic money uses the same "$nM" form as English — mixed "$157 مليون" reorders badly inside left-to-right number spans — cost if wrong: less natural Arabic money wording. Ruling: language choice persists in localStorage (mc.lang). Rocket names stay in Latin script.
Task 9.1: complete (commits bc8defc..5d191d4, tests: npx vitest run →    Duration  6.02s (transform 3.32s, setup 3.04s, collect 16.57s, tests 9.12s, environment 22.40s, prepare 4.13s))
Task 10.1: sound is synthesised with WebAudio (no assets), mute persists (mc.muted); unlock card on campaign screen; phone-width audit (375px) of 13 screens: zero horizontal overflow, zero console errors.
Task 10.2: Ruling: deployment to Vercel is NOT done — it publishes to an outside account and needs the user's login and Supabase keys; vercel.json (SPA rewrite) and .env.example are in place — cost if wrong: none; user deploys with `npx vercel`.
Task 10.1: complete (commits 5d191d4..60c965f, tests: npx vitest run →    Duration  5.59s (transform 2.86s, setup 3.16s, collect 15.40s, tests 8.35s, environment 22.22s, prepare 3.88s))
Final review: fresh reviewer (Fable), verdict "with fixes". ONE fix pass, each fix RED→GREEN, suite 338/338, then browser re-runs (online two-tab incl. role re-claim, tutorial, Arabic solo, phone audit) clean.
Final: fixed C1 roles un-claimable after lobby — tests/ui/review-fixes "a role freed by a dropped player can be claimed from the board" + engine "returning player gets back roles" RED→GREEN.
Final: fixed C2 tutorial dead-ends — tests/tutorial "only the two lesson instruments", "rushed schedule refused", "smallest budgets still reach the end" RED→GREEN.
Final: fixed I1 budget soft-locks — allocation floor, topUp action, per-difficulty campaign floor (minLaunchCost) RED→GREEN.
Final: fixed I2 scientist draft wiped; I3 rejoin (seat takeover, id storage); I4 client resync timer + presence debounce; I5 online auto-assign hidden; I6 radio thrift; I7 appeal cap bypass (objective, funding, purchase); I8 debrief closed by Radio only; I9 funds dialog target — each with a test RED→GREEN.
Final: re-graded to Important and fixed: no-op edit cancelling votes; old approved purchases double-counted; chat non-string TypeError; save version (mc.save.v2) + crash boundary; ErrorToast on every screen; pagehide disposer removal.
Final: Ruling: reviewer disagreed with "Designer cost = 100 − 10 per funding request" — accepted; now scored on overshoot beyond the first allocation — cost if wrong: a Designer given a tiny first allocation is marked down for the Planner's choice.
Final: Ruling: client impersonation (client-supplied `from`) stands — anti-cheat is a stated non-goal — cost if wrong: a malicious player on the room code can act as another role.
Final: Ruling: host refresh/close ends the room and loses the online campaign — accepted by the spec (approach A) — cost if wrong: one host mistake ends a demo; mitigation is to host from a stable laptop.
Final: Ruling: balance values stay as the oracle has them (e.g. a 52%-science Fan telescope success nets negative money; unlocking gear raises the science ceiling) — appendix is binding — cost if wrong: telescope feels unrewarding at low science.
Final: Ruling: Mars waiting fee is charged whenever the craft waits for a window, even when ready early; the "missed window" fault only when the target month was before the launch — cost if wrong: an early team pays a fee the spec words as "if ready late".
Final: Ruling: Supabase path, NASA "Learn more" links and Arabic quality remain unverified by me — need the user's keys / a network check / a native speaker — cost if wrong: online play, links or wording fail at the event.
Final: minor (deferred): solo launch ignores open backorders (no delay/fee in solo on Nerd/Expert).
Final: minor (deferred): on Fan, nine rejections can exhaust all three objectives with no way forward.
Final: minor (deferred): a Planner "substitute" ban on the only part that avoids a critical fault still blames the Designer.
Final: minor (deferred): starting a new local game overwrites the saved one without asking.
Final: minor (deferred): the host's Exit button ends the room for everyone without confirmation.
Final: minor (deferred): an exhausted funding request stays in the inbox until withdrawn.
Final: minor (deferred): Expert shows a spent-vs-budget dial with colour (spec said totals only; budget is not a hidden verdict).
Final: minor (deferred): debrief has no per-player average for multi-role players; no shareable summary card; mission patch has no team name on it.
Final: minor (deferred): tutorial teammates speak in coach bubbles, not the chat panel.
Final: minor (deferred): Planner's budget sliders are local until confirmed, so others don't see the plan forming.
Final: minor (deferred): no notice when "fly again" drops parts that no longer fit the budget.
Final: minor (deferred): 7 eslint fast-refresh warnings.

## After the plan: team change requests (2026-11-14)
Ruling: planets use real NASA imagery downloaded into public/textures (NASA SVS Blue Marble and LRO Moon kit, Cassini PIA07782, NASA 3D Resources Mars and Tycho star map) — the user asked for high-resolution planets and NASA images are free to use with credit — cost if wrong: +3.5 MB of assets; credit wording may need the team's check.
Ruling: "fly again" skips the planning stage entirely when the old budget is still affordable — the user asked that it not change the previous data — cost if wrong: the Planner cannot shrink the budget on a re-flight except by not spending it.
Ruling: with no radio link the first command goes unanswered and the conversation ends (previously three healthy replies came first) — truer to "nobody was listening" — cost if wrong: shorter operations scene on that failure.
Ruling: Requests and Activity moved to the left column so the 3D column never scrolls; tutorial coach moved to bottom centre.
Verified in browser: Expert Jupiter mission through every new screen (screenshots), launch frames for a good and a failed flight, tutorial end to end, two-tab online mission, Arabic solo, phone-width audit. 369 tests pass.
Not verified: the new 3D on a real GPU or a phone (checked with software rendering only); frame rate on low-end devices.

## Flight animation rebuild (2026-11-14)
Ruling: "3 outcomes" read as success, partial success and failure; partial follows the success journey with amber replies — the user described only success and failure in detail — cost if wrong: partial needs its own animation.
Ruling: "accurately timed" = real mission time, distance and signal delay on the readouts, with a time-lapse whose length grows with distance (log scale, 5–26 s) — real time is minutes to years, so it cannot be played literally — cost if wrong: user wanted a different scaling.
Ruling: design effects on timing (load slows the climb, spare capacity shortens the trip, ion engine lengthens it) are my own simplified rules, not from the balance appendix — the user asked for timing "constrained by design" — cost if wrong: numbers need the team's sign-off; they affect only the animation, not scores or money.
Ruling: with several mission-ending faults the animation shows the earliest in flight order; debrief still lists all.
Ruling: a #gallery review page was added (not linked from the menu) so all 14 animations can be checked quickly.
Verified in browser (software rendering): all 14 stories in the gallery with a frame each; tutorial end to end; two-tab online mission; Arabic solo; phone-width audit. 387 tests pass.
Not verified: frame rate on real hardware; the fly-past, fireball and scan-cone moments were seen only as single frames.

## Real-photo Flight Director (2026-11-14)
Ruling: "real Elon Musk, whichever of 2D or 3D is more realistic" → a real NASA photo of his face (2D, the most realistic option) on the animated 3D body — keeps the kick-and-scream animation the brief asked for and stays obviously a parody collage — cost if wrong: user wanted a full-body photo or a fully modelled 3D head.
Ruling: the face is not altered or animated (no generated expressions) — I will not fabricate realistic imagery of a real person doing things he did not do — cost if wrong: the mouth does not move when he "screams".
Ruling: used a public-domain NASA photo found via images.nasa.gov rather than a press photo — no copyright issue; likeness-rights and NASA "no implied endorsement" risks remain and are the team's call (flagged to the user).
Verified in browser: all five poses show the photo head; tutorial end to end. 394 tests pass.

## Full-body real photos (2026-11-14)
Ruling: "make the full body realistic" → the 3D puppet body is removed; each of the five poses is a whole real NASA photo with the background cut away (table in spec §19) — cost if wrong: user wanted one consistent outfit or a head-to-toe figure; NASA has no such set.
Ruling: no generated or edited body, and no kick — a realistic picture of a real person kicking and screaming would be fabricated footage; the tantrum is a real news-conference photo that the game stamps and shakes as a whole, with glow, steam marks, "ARGH!" and sound — cost if wrong: the failure scene is less slapstick than the brief's "kicks the ground".
Ruling: dropped the Demo-2 T-shirt photo because the shirt carries a NASA mission emblem (the project never shows NASA insignia).
Ruling: `Elon3D.tsx`, `rig.ts` and the rig test were deleted; the drawn cartoon stays only as the fallback when photos fail to load.
Verified in browser: five poses in `#gallery`; tutorial end to end (coach and failure debrief). 403 tests pass; build succeeds.
Not verified: how the cut-out edges look on a high-density phone screen.

## Instrument negotiation, Designer approves (2026-11-14)
Ruling: built exactly the user's scenario (table in spec §20): up to two push-backs, escalation only at the Designer's third decision, Planner sets the Scientist's instrument budget, final list must be accepted.
Ruling: "Designer always responsible, not the Scientist" → removed both Scientist blame shares (mass after insisting; power when instruments draw over half) — cost if wrong: user meant only mass.
Ruling: the Scientist still answers for `irrelevant_instruments` — it is a science choice, not a craft-compatibility one — cost if wrong: user wants that on the Designer too (one line in `evaluate.ts`).
Ruling: after a Planner ruling the Designer alone is still blamed for mass/power — the user said "always"; the Designer still controls the bus, power and rocket — cost if wrong: the Planner should share after imposing a list.
Ruling: the limit must be ≥ the cheapest instrument, so the Scientist can always send something — cost if wrong: none seen.
Ruling: the limit persists for the mission and the Planner cannot drain the Designer's allocation below it — follows "he must commit to it" and "does not exceed the Designer's allocation".
Ruling: push-backs do not reset when an approved list is changed later — otherwise the negotiation could loop for ever — cost if wrong: a late change gives the Designer fewer chances to object.
Ruling: "must accept" is still an explicit Approve click (the only button), and it still checks the allocation — keeps the Designer as the approver; the Designer may need to free money first.
Ruling: old saves are upgraded on load (new fields filled; an old "final" list becomes "pending").
Verified in browser: the whole nine-step negotiation between two tabs; tutorial end to end; two-tab online mission; Arabic solo. 427 tests pass.
Not verified: the Arabic wording of the new text (needs a native speaker); the Requests box with a long conversation on a phone.

