# Mission Control — Team Space Mission Simulator (Design)

*Working title. Date: 2026-11-13. Built for a NASA Space Apps hackathon (~48 hours).*

## 1. Intent

A gamified simulator where **non-technical people who love space** learn how real missions are planned by *making the trade-offs themselves*. Up to four players split the jobs of a real mission team, negotiate over money, mass, power, data and time, then launch. The game never blocks a bad design: the mission flies anyway, and the debrief explains **what broke, why, and whose decision caused it**. Learning comes from consequences, not from being told "wrong".

It must be: **fun, simple, mildly challenging, interactive**. There is rarely one perfect answer — several combinations of rocket, orbit, spacecraft and instruments can achieve the same objective.

### Success looks like
- A first-time player finishes the tutorial and one real mission in ~25 minutes and can explain *why* their mission succeeded or failed (e.g. "we didn't carry enough battery for the night side of the orbit").
- Four people on four laptops can play one mission together in a room code, chatting in-game.
- Judges see a polished demo: role screens, a negotiation (reject → appeal), a launch, a funny failure, a clear debrief, per-role scores.

### Goals
- 4 roles with distinct responsibilities and per-role scoring.
- 3 mission types, 3 difficulty levels, campaign with carried-over budget and gear unlocks.
- Every major decision changes computed numbers (mass, power, cost, data, time, coverage, lifetime).
- Hidden compatibility rules revealed only in the post-mission debrief, with blame per role.
- Tutorial that teaches the concepts and the team decision process.
- Online multiplayer (own devices + chat), pass-and-play on one screen, and solo.
- English + Arabic (right-to-left).

### Non-goals (for the hackathon build)
- User accounts, logins, cloud-saved progress.
- Server-authoritative play, anti-cheat, host migration.
- Real orbital mechanics simulation (we use simplified, table-driven rules).
- Voice chat; a phone-first layout (target is laptop/tablet; must not break on phone).
- Interactive post-launch gameplay (operations are cinematic — see §9).

### Anti-goals (would be a failure even if it "works")
- Feels like filling in a spreadsheet or doing homework.
- Failures feel random or unfair — every failure must be traceable to a decision.
- A player sits idle with nothing to do for long stretches.
- Unexplained jargon.
- Cruel or defamatory humour: the Elon Musk caricature is affectionate parody (tantrums, catchphrases), never insults about real life.

## 2. Constraints

- **48 hours** of build time → a single shared game engine, table-driven content, no video or downloaded model assets. **3D (added by the team 2026-11-13):** simple low-poly 3D built from basic shapes in code (three.js via react-three-fiber) for the spacecraft, the rocket and launch, and the planet/orbit view. Menus and panels stay 2D.
- Content numbers are **approximate public figures rounded and simplified for gameplay**; this must be stated in-game ("Simplified for play — see NASA sources").
- All tunable numbers live in data files so balancing doesn't touch logic.

## 3. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | One pure-TypeScript engine; the **host's browser** runs it. Local modes run it in one browser; online mode relays actions/state over **Supabase Realtime** (broadcast + presence, no DB tables). | Fastest path to both modes; engine fully unit-testable. If the host closes the tab the room ends (acceptable for a demo). |
| B | Same engine on a room server (PartyKit/Colyseus). | Survives host leaving, cheat-resistant; +~1 day of infra the timeline can't afford. Engine ports over later unchanged. |
| C | Supabase tables as the game state. | Free persistence; schema + sync work too slow for 48h; campaign is one sitting anyway. |

Picked by the team: **A**.

## 4. Decisions made with the team

- Multiplayer: **both** online (own devices, room code, chat) and pass-and-play; plus solo.
- Game loop: **campaign** — team budget carries over; each launch spends money; failures lose it but teach; successes earn grants and unlock gear.
- Failure character: **a cartoon Elon Musk** (the "Flight Director") who kicks the ground and screams. *(Team changed this from the original character on 2026-11-13.)*
- Coach character: **the same cartoon Elon Musk** leads the tutorial instead of CAPCOM.
- Visual theme: **NASA's Horizon Design System look** (colours, fonts, mission-control feel), made as game-like as possible.
- Instruments: **Scientist requests, Designer can push back**; Scientist decides on resend.
- Appeals: **2 appeals** per rejected request, then the requester must choose another option.
- Solo mode: **approvals skipped entirely**; one player makes every choice.
- Languages: **English + Arabic (RTL)**.
- Outcome: **severity-based and deterministic**; debrief lists **all** faults with responsible role(s).
- Post-launch: **mostly cinematic**; Radio Operator narrates the debrief.
- Pacing: **phase-based, no timer**.
- Information: **show raw stats, hide verdicts** — every option always shows its numbers (capacity per destination, watts, data rates, distance, sunlight factor); the game never says "this won't work". Careful teams can reason it out.
- Tutorial: **scripted teammates** perform the roles the player isn't currently acting as.
- Budgets are **hard caps** (from the brief: "disapproval means appeal or stick with another option"). A choice that would exceed the role's allocation can't be bought until a funding request is approved.
- Stack: builder's call (see §12).

## 5. Roles

| Role | Owns | Scored on |
|---|---|---|
| **Planner** (planner + logistics) | Approves objective; sets total budget split and reserve; sets schedule mode; approves funding requests and the purchase order; handles backorders. Manages the team. | Budget adherence, schedule/time adherence, decision quality |
| **Scientist** | Mission objective; scientific instrument list; science value | Science value achieved, instrument fit, objective/orbit fit |
| **Designer** | Spacecraft bus components (10 slots), launch vehicle; reviews instrument list | Mass margin, power margin, cost vs allocation |
| **Radio Operator** | Orbit, frequency band, antenna (the communications slot), ground stations; the only voice to the spacecraft after launch; presents the debrief | Coverage-per-cost, data downlinked vs generated, link feasibility |

**Role assignment:** in the lobby each player claims one or more roles; the mission can't start until all four are claimed. A player holding several roles sees a role switcher. Solo = one player holds all four.

**Visibility:** everyone sees every decision live (a shared "Mission Board"); only a role's holder can change that role's panel.

## 6. Game flow (state machine)

```
LOBBY
 → OBJECTIVE_PROPOSAL      Scientist picks mission type + specific objective, writes a one-line pitch
 → OBJECTIVE_REVIEW        Planner: Approve | Reject (reason)
                            reject → Scientist: Appeal (≤2, with reason) | Pick another objective
 → PLANNING                Planner: set this mission's budget (≤ campaign funds), split it into
                            Spacecraft (Designer: components + instruments + vehicle) / Ground & Comms (Radio) / Reserve;
                            set target launch month; choose schedule mode (Rush / Standard / Careful)
 → DESIGN (parallel)
     Scientist  → instrument request → Designer: Accept | Push back (reason) → Scientist: resend (final)
     Designer   → 10 bus slots + launch vehicle
     Radio      → orbit, band, antenna, ground stations
     Any of Designer/Radio → Funding request → Planner: Approve | Reject → Appeal (≤2) | choose cheaper option
     Event (Nerd/Expert): 1–2 items backordered → Planner: Wait (+months) | Pay express (+cost) | Ask Designer to substitute
 → INTEGRATION
     Launch pairing lock: Designer (vehicle) and Radio (orbit) both press "Agree" — either can un-agree to renegotiate
     Purchase order: full bill of materials → Planner: Approve | Reject → Appeal (≤2)
 → GO / NO-GO POLL         each role says "Go" (real NASA ritual); any "No-Go" returns to DESIGN
 → LAUNCH                  cinematic
 → OPERATIONS              cinematic timeline; Radio presses ceremonial "Send commands" / "Downlink data" buttons
 → DEBRIEF                 Radio Operator's transmission: outcome, faults, blame, lessons, scores, awards
 → CAMPAIGN SCREEN         budget left, unlocks; "Next mission" or "Fly again with fixes" (copies last config)
```

Rules:
- Appeals are counted per request; after 2 rejections of appeals, the Appeal button disappears.
- **Hard caps:** each role's running cost is shown against its allocation; picks that would exceed it are disabled with "Request funds". Allocations always sum to ≤ mission budget ≤ campaign funds, so the campaign balance never goes negative.
- **Leaving DESIGN** *(builder's call)*: each of Scientist, Designer and Radio presses "Ready". Ready is disabled while that role has an open request or pending review. Changing anything clears that role's Ready. When all three are Ready → INTEGRATION.
- **Instruments after acceptance** *(builder's call)*: the Scientist may edit during DESIGN, but any edit re-opens Designer review (push-back allowed again, Scientist's resend is final again).
- **Going back** *(builder's call)*: a No-Go, or either side pressing "Un-agree" on the pairing, returns to DESIGN and clears the pairing lock, purchase-order approval and all Ready flags. Accepted instrument lists, approved funding and spent appeal counters on closed requests are kept; new requests get fresh appeal counters.
- If the Reserve is empty, a funding request can only be rejected, or the Planner can move money between allocations.
- Solo: OBJECTIVE_REVIEW, push-back, funding requests, purchase approval, pairing lock and Go/No-Go are skipped; the player edits one total budget.
- Pass-and-play: all four panels on one screen via role tabs (honour system); chat hidden, activity log shown.
- Chat (online only): free text plus automatic system lines for every request/decision. Last 200 messages kept in state.
- **Disconnects** *(builder's call)*: when a non-host player drops, their roles become unclaimed and play pauses on any step needing those roles. Anyone in the room (including the host) can claim them; a returning player can reclaim. If the host drops, the room ends.

## 7. Content catalog

Difficulty controls what's available:

| | Space Fan | Space Nerd | Space Expert |
|---|---|---|---|
| Objectives per mission type | 1 | 2 | 3 |
| Launch vehicles | 6 | 9 | 11 |
| Orbits/destinations | 7 | 9 | 11 |
| Active bus slots (others auto-set to sensible defaults) | 6 | 9 | 10 + comms |
| Options per slot | 2 | 3 | 3–4 |
| Instruments | 6 | 9 | 12 |
| Backorder events | none | 1 | 2 |
| Live gauges shown | totals + mass-vs-rocket + power-vs-load hints | totals + budget | totals only |
| Starting campaign budget | $2,000M | $1,600M | $1,300M |

**Always shown:** each option's raw stats (mass, power, cost, dev months, capacity per destination class, sunlight factor, distance, data rates, coverage contribution). **Hidden until the debrief** at every level: the *verdicts* — whether objective↔orbit fits, the vehicle can carry it there (except the Space Fan mass gauge), solar is enough at distance, the comms link closes, lifetime is enough, radiation/thermal are handled, data flows without bottlenecks.

### 7.1 Mission objectives
| Type | Objectives (Fan gets the first) |
|---|---|
| Earth Observation | Wildfire & disaster watch · Polar ice & climate monitoring · Crops & water resources |
| Deep Space | Infrared space telescope at L2 · Asteroid survey · Jupiter's icy moons |
| Mars Colonization | Water-ice mapping orbiter · Landing-site scout & weather lander · Resource test lander (drill/ISRU) |

Each objective defines: best / acceptable / invalid orbits; relevant instrument tags with weights; required mission lifetime (years); target data volume; base science value; base success grant.

### 7.2 Launch vehicles (Designer) — 11
Capacity (kg) by destination class; cost $M. Approximate, simplified.

| # | Vehicle | LEO | SSO | High Earth (GTO) | Escape (Moon/L2/Mars) | Cost |
|---|---|---|---|---|---|---|
| 1 | Electron | 300 | 200 | – | – | 8 |
| 2 | PSLV-XL | 3,800 | 1,750 | 1,400 | – | 30 |
| 3 | Vega-C | 3,300 | 2,300 | – | – | 45 |
| 4 | H3 | 9,000 | 4,000 | 6,500 | 1,000 | 60 |
| 5 | Falcon 9 | 17,500 | 12,000 | 5,500 | 2,500 | 70 |
| 6 | Ariane 64 | 21,600 | 15,000 | 11,500 | 4,000 | 115 |
| 7 | Atlas V 551 | 18,800 | 15,000 | 8,900 | 4,000 | 150 |
| 8 | Vulcan Centaur | 27,200 | 20,000 | 15,000 | 6,000 | 120 |
| 9 | New Glenn | 45,000 | 30,000 | 13,600 | 7,000 | 110 |
| 10 | Falcon Heavy | 63,800 | 40,000 | 26,700 | 16,800 | 150 |
| 11 | SLS Block 1 | 95,000 | – | – | 27,000 | 900 |

Outer-planet trajectories use Escape × 0.6. "–" = cannot reach (critical fault).

### 7.3 Orbits / destinations (Radio Operator) — 11
| Orbit | Class | Good for | Key traits |
|---|---|---|---|
| Low Earth Orbit (400 km) | LEO | close-up imaging | sharp images, short station passes, ~35% of each orbit in shadow (needs batteries), air drag → short life without propulsion |
| Sun-Synchronous (700 km) | SSO | Earth observation | same lighting every day, passes over poles (polar stations see every orbit), long life |
| Medium Earth Orbit | High Earth | wide regional views | long passes, lower resolution |
| Geostationary | High Earth | weather / constant watch of one region | one station sees it 100% of the time; poor detail; no polar view |
| Highly Elliptical (Molniya) | High Earth | high-latitude watch | long dwell over the north |
| Sun–Earth L2 | Escape | space telescopes | very stable, cold, far (1.5M km) → Deep Space Network only |
| Lunar orbit | Escape | Moon science, practice | needs propulsion to capture |
| Mars orbit | Escape | Mars mapping, relay | needs propulsion to capture; Mars launch window every 26 months; sunlight 43% of Earth's |
| Mars surface | Escape | landers | needs Mars landing kit; 12-hour nights (big batteries); dust and cold (thermal) |
| Asteroid rendezvous | Escape × 0.8 | asteroid survey | needs propulsion to match the asteroid; sunlight 50%; far |
| Outer planets (Jupiter) | Escape × 0.6 | icy moons | sunlight 4% (solar nearly useless → RTG), heavy radiation, very far |

### 7.4 Spacecraft — 11 component slots
Slots 1–10 are the Designer's; slot 11 (Communications) is chosen by the Radio Operator but counts in the Designer's mass/power/cost totals (a built-in negotiation). Instruments sit in the payload bay (Scientist).

| # | Slot | Options (Basic → Advanced) | What it trades |
|---|---|---|---|
| 1 | Structure (bus) | Small / Medium / Large | dry mass vs how much payload it can carry |
| 2 | Power source | Body solar / Deployable arrays / Large arrays / RTG | watts vs mass, cost; solar scales with sunlight at destination |
| 3 | Batteries | Small / Medium / Large | energy for shadow/night vs mass |
| 4 | Onboard computer | Basic / Radiation-hardened / High-performance | data it can process per day, radiation survival |
| 5 | Attitude control | Magnetorquers / Reaction wheels / Wheels + star trackers | pointing accuracy (needed by sharp cameras, telescopes, big antennas) |
| 6 | Thermal control | Passive / Heaters + radiators / Active fluid loop | survives cold/hot destinations vs power |
| 7 | Propulsion | None / Cold gas / Chemical / Electric (ion) | orbit capture, lifetime in LEO, mass, power (ion) |
| 8 | Data storage | Small / Medium / Large | holds data between station passes |
| 9 | Protection | None / Radiation shielding / Sunshield / Mars landing kit | required by Jupiter / telescope / Mars surface |
| 10 | Payload bay | (filled by Scientist's instruments) | instruments' mass, power, cost, data |
| 11 | Communications | Omni / Medium-gain / High-gain 1 m / Deep-space 3 m dish + band (UHF / S / X / Ka) | data rate and range vs mass, power, cost, pointing needs |

Each option carries: mass (kg), power draw or generation (W), cost ($M), development months, plus slot-specific stats (payload support, Wh, Gb/day, pointing level, etc.). Advanced options are **unlockable** via the New Gear award (some start locked).

### 7.5 Instruments (Scientist) — 12
| Instrument | Mass kg | Power W | Cost $M | Data Gb/day | Tags |
|---|---|---|---|---|---|
| High-res optical camera | 60 | 40 | 25 | 50 | imaging |
| Multispectral imager | 50 | 45 | 30 | 40 | imaging, vegetation, water |
| Hyperspectral imager | 80 | 70 | 45 | 120 | minerals, vegetation, water |
| Thermal infrared camera | 45 | 50 | 25 | 20 | fire, ice, climate |
| Synthetic aperture radar | 300 | 600 | 70 | 200 | all-weather, ice, disaster |
| Ground-penetrating radar | 40 | 60 | 35 | 10 | subsurface ice |
| Spectrometer | 30 | 25 | 30 | 5 | composition, atmosphere |
| Magnetometer | 5 | 4 | 8 | 0.1 | magnetic field, ocean moons |
| Radiation detector | 10 | 8 | 10 | 0.2 | radiation, crew safety |
| Weather station (surface only) | 15 | 15 | 12 | 0.5 | atmosphere, surface |
| Infrared telescope | 800 | 300 | 400 | 60 | astronomy |
| Drill & sample analyzer (surface only) | 60 | 120 | 60 | 1 | resources, surface |

Science value = Σ relevance(instrument, objective) × orbit-fit multiplier × fraction of data actually downlinked. Duplicate tags give 50% value; irrelevant instruments add cost/mass for ~0 value. Surface-only instruments in orbit = 0 value.

### 7.6 Ground stations (Radio Operator)
- **Near-Earth network** ($3M each): Svalbard, Kiruna, Fairbanks, Wallops, Hawaii, Santiago, Hartebeesthoek, Singapore.
- **Deep Space Network** ($15M each): Goldstone, Madrid, Canberra — the only stations that count beyond High Earth.
- Coverage % = per-orbit contribution table per station, saturating at 100%. Examples to encode: polar stations dominate SSO; any one suitable station gives GEO 100% (more = waste); three DSN stations ≈ 100% for deep space. Ka-band at tropical stations (Singapore, Hawaii) loses 30% to rain.
- Daily downlink = band × antenna rate × distance factor × coverage hours.

## 8. Consequence model (what the engine computes)

| Quantity | Computed from |
|---|---|
| Mass | bus + all components + instruments + comms; vs launch-vehicle capacity for the destination class; payload vs bus support |
| Power | generation (source × sunlight factor) vs total draw; battery Wh vs draw × shadow/night hours |
| Cost | components + instruments + vehicle + ground stations + schedule-mode modifier + express fees; vs allocations and total |
| Data | instruments' Gb/day vs computer capacity, storage, and daily downlink |
| Communications | band/antenna range vs distance; antenna pointing needs vs attitude control; coverage % |
| Time | development months (slowest item + integration) × schedule mode (Rush ×0.75 time / ×1.2 cost; Careful ×1.25 time / ×0.95 cost and one minor fault forgiven) + backorder waits; vs Planner's target launch month. **Mars windows** *(builder's call)*: Mars missions can only launch in a window every 26 months; if ready late, the launch waits for the next window and the team pays $4M per month of waiting (taken from Reserve, then campaign funds), logged as a minor Planner fault |
| Lifetime | orbit drag (LEO), propulsion, radiation vs shielding, thermal vs destination; vs objective requirement |

### Faults, outcome and blame
- **Critical** (mission lost): over launch capacity; destination unreachable by vehicle; power generation < draw; no viable comms link; objective's orbit invalid; missing landing kit on surface; Jupiter without radiation shielding; solar power at Jupiter; payload exceeds bus support.
- **Major** (partial success, reduced science): downlink < 50% of data; coverage below objective need; storage/computer bottleneck; battery short for shadow; lifetime < required; pointing too coarse for instrument/antenna.
- **Minor** (score penalty only): thin margins (< 10%), schedule overrun vs target, missed Mars window, wasteful extra stations, irrelevant instruments, large unused allocation (> 30% left unspent).
- **Outcome:** any critical → **Failure**; else any major → **Partial success**; else **Full success**. Deterministic.
- **Blame** (each fault names 1–2 roles): mass/structure → Designer (shared with Scientist if Scientist overrode a push-back); power → Designer (+Scientist if instruments > 50% of draw); vehicle–orbit mismatch → Designer + Radio (they locked the pairing together); comms/coverage → Radio; wrong instrument or orbit for objective → Scientist (+Radio for orbit); budget/schedule → Planner; approved request that led to a fault → Planner shares.

### Money in the campaign
- On launch the full mission cost is deducted.
- Success: science grant (objective base × science score). Partial: half. Failure: nothing.
- Campaign ends after 5 launches or when funds < $50M → final report.
- *(builder's calls)* Difficulty is chosen once per campaign. Mission type is a free pick each mission. "Fly again with fixes" pre-fills the last configuration but is a new mission: full price, counts as a launch. Local and solo campaigns autosave to the browser (localStorage) and survive a refresh; online campaigns live only while the host's tab is open. A simple campaign calendar (month counter) carries across missions for schedule and Mars windows.

## 9. Launch, operations, debrief
- **Launch cinematic:** countdown, liftoff, staging, orbit insertion (3D scene: low-poly rocket, pad, Earth). Failure type picks the break point (e.g. over-mass → rocket can't reach orbit).
- **Operations cinematic:** timeline with signal-quality meter and data counter; Radio Operator presses "Send commands" and "Downlink data" to advance (no failure possible here).
- **Failure:** the **cartoon Elon Musk** Flight Director kicks the ground, screams, and throws his cap. There are 3 variants picked by the worst fault (explosion on the pad = over capacity; "we lost the signal" = comms; slow freeze = power or thermal). Each is about 4 seconds, can be skipped, and ends with a quip ("Okay, okay… rapid unscheduled disassembly.").
- **Success:** the cartoon Elon Musk celebrates, with confetti and a mission patch stamped with the team name.
- **Partial:** a shrug and a "Not bad, not great" pose.
- **Debrief** ("Transmission from the Radio Operator"): outcome; each fault as *What happened → Why (plain-language concept) → Whose decision → How to fix → Learn more (NASA link)*; money lost/earned; per-role scores; awards.

## 10. Scoring and awards
Per role, 0–100:
- **Scientist:** 50% science achieved ÷ possible · 30% instrument fit · 20% objective–orbit fit.
- **Designer:** 35% mass margin (ideal 10–30%) · 35% power margin (ideal 10–40%) · 30% cost vs allocation.
- **Planner:** 40% total cost vs mission budget · 30% schedule vs target launch month · 30% decision quality (approvals that didn't lead to faults, rejections that avoided waste).
- **Radio Operator:** 40% coverage ÷ cost efficiency · 40% data downlinked ÷ generated · 20% link feasibility.
- Fault penalty on blamed roles: critical −30, major −15, minor −5 (split when shared).
- A player holding several roles sees each role's score plus their average.

**Team:** Full success +1000 pts, partial +400, failure 0.
**Awards:** Cost Efficiency (success and cost ≤ 85% of budget) · Scientific Value (science ≥ 80% of possible) · New Gear (on success, unlock one advanced component) · Effective Decision (per player: role score ≥ 80 and no critical fault blamed on them).

## 11. Tutorial and learning
- **Training Mission** (Space Fan, Wildfire watch), led by the coach, **a cartoon Elon Musk** with speech bubbles, encouraging and a bit over-the-top. The player acts as each role in turn; **scripted teammates** (named characters posting in the chat panel) play the other side when needed: a scripted **Planner rejection → player appeals as Scientist**, a **Designer push-back** on the player's instrument list, and a **funding request** the player approves as Planner. The script is a fixed list of steps (spotlight target, coach text, expected action, scripted actor action) run on the normal engine.
- The tutorial launches with a **planted flaw** (batteries too small for LEO shadow) → failure → debrief explains eclipse → "Fly again with fixes" → success. Teaches that the game won't warn you, and how to read a debrief.
- Concepts introduced in context, one sentence each, with an optional "Learn more": orbital altitude, payload capacity, power consumption, data rate, communications coverage, lifetime, trade-offs.
- **Mission Handbook** (always available): glossary + every option's "What is it / Why it matters", linking to NASA sources (NASA Space Place, JPL *Basics of Space Flight*, NASA *Small Spacecraft Technology State of the Art*, NASA Deep Space Network, NASA Earth Observatory).
- Tutorial is played locally (solo or with the team around one screen).

## 12. Technical design (builder's calls, stated)
- React + TypeScript + Vite; Tailwind; Framer Motion / CSS for animation; Vitest for engine tests; deploy on Vercel.
- `engine/`: pure functions, no UI — `createGame(config)`, `applyAction(state, action, actorRoles) → state | error` (validates phase and role ownership), `evaluateMission(state) → {outcome, faults[], scores, awards, money}`. Fully unit-tested.
- `data/`: catalog JSON (vehicles, orbits, components, instruments, stations, objectives, relevance matrix, difficulty tables) + `i18n/en.json`, `i18n/ar.json`.
- **Online:** Supabase Realtime channel `room:<code>`; presence for players/roles; clients broadcast `action`; host runs `applyAction` and broadcasts the full `state` snapshot; joiners request a snapshot. Host leaving ends the room with a clear message.
- **Arabic:** `dir="rtl"` toggle, logical CSS properties, Western digits; Arabic strings drafted then reviewed by a native speaker on the team.

## 13. Build priority (cut lines for 48h)
1. Engine + catalog + consequence/fault/score logic (tested).
2. Local play (solo/pass-and-play), Earth Observation end to end with debrief.
3. Deep Space + Mars content, difficulty levels, campaign screen.
4. Online rooms + chat.
5. Tutorial + Handbook.
6. Launch/failure animations polish.
7. Arabic.
If time runs short, items 6–7 shrink first; nothing above item 4 is cut.

## 14. Numbers and balance
All per-option numbers, coverage tables, the relevance matrix, grants and formulas are in [2026-11-13-mission-control-balance.md](2026-11-13-mission-control-balance.md). They are verified by [balance_reference.py](balance_reference.py): **all 18 objective × difficulty pairs have ≥ 2 viable designs** using starting gear. The engine's data files must match that script, and its tests reuse the script's reference designs.

## 15. Look, feel and gamification

**NASA Horizon Design System styling.** HDS Core is public domain (CC0); its fonts are under the SIL OFL.
- Colours (HDS tokens): background `carbon-90 #17171b` / `carbon-black #000`. Primary action = NASA red `#f64137` (shade `#b60109`, used for "go somewhere" actions like Launch). On-page interactions = NASA blue `#1c67e3` (tint `#288bff`). Status OK = active-green `#47da84`. Accent = international orange `#ea6f24`. Greys use the carbon scale (`#f6f6f6` → `#2e2e32`).
- Fonts: **Inter** for headings and big display text, **Public Sans** for body text, **DM Mono** for numbers, gauges and small labels (the "technical" look).
- Dark mission-control UI: starfield background, thin grid lines, monospace telemetry, countdown clocks.
- **Legal guardrails:** never use the NASA "meatball" insignia, the "worm" logotype or the NASA seal (NASA forbids non-NASA use). No wording that implies NASA endorsement. Footer: "Fan-made for NASA Space Apps. Not affiliated with or endorsed by NASA or SpaceX. Elon Musk appears as parody." The Space Apps logo may be used per Space Apps brand guidelines. NASA photos are usable with credit, but not NASA logos.

**Elon Musk cartoon.** Original SVG caricature drawn by the team: a flat vector style with a big head and a few poses (idle, pointing, celebrating, tantrum, shrug). No real photos and no voice clone. Lines are written as text bubbles.

**Gamification**
- Mission patch generator: each mission gets a patch (shape, colours, team name, objective icon). Patches fill the campaign's "patch wall".
- XP and ranks per player: Cadet → Flight Engineer → Mission Specialist → Flight Director. XP comes from role scores.
- Achievement badges, e.g. "Penny Pincher" (cost award), "Data Hoarder" (science award), "Nailed the Landing", "Rapid Unscheduled Disassembly" (first failure), "Comeback Kid" (success right after a failure), "One Station Wonder" (GEO with one station).
- Live telemetry gauges: mass, power, cost and data as animated DM Mono dials. Visible verdict hints follow the difficulty rules only.
- Go/No-Go poll with a dramatic countdown and the launch button (red, hold to confirm).
- Unlock moments: a "New gear unlocked" card animation.
- Final leaderboard: the campaign report ranks players by XP, with a shareable summary card.
- Sound *(stretch)*: countdown beeps, launch rumble, radio static for the Radio Operator's debrief, a success fanfare, and a tantrum "argh". Royalty-free or generated, with a mute toggle.


**3D scenes** (simple, low-poly, generated from shapes in code):
- **Spacecraft builder:** a rotating 3D spacecraft that changes as the Designer picks parts (bus size, solar panels or RTG, dish size, engine, instruments as coloured blocks).
- **Orbit view:** a 3D planet (Earth, Mars, Jupiter or the L2 point) with the chosen orbit ring, the spacecraft moving along it, and ground-station pins on Earth.
- **Launch and operations:** a 3D rocket sized by the chosen vehicle lifts off, stages and reaches orbit, or fails at the break point.
- Every 3D scene has a plain 2D fallback when WebGL isn't available (and in tests).

## 16. Changes after the final review (2026-11-14)

An independent review of the finished build led to these rule changes. Where they differ from earlier sections, this section wins.

- **Reconnecting online.** A role freed by a dropped player can be taken from the mission board ("Take the … role"). A player who returns gets back any of their roles that nobody took. A new device can take a disconnected player's seat in a full room. Clients ask the host for the current state every few seconds, so a lost message heals itself.
- **Budgets can't strand a mission.** The Planner can't allocate less than the standard equipment already costs. During design the Planner can add campaign money to the mission ("Add from campaign funds").
- **Campaign end.** The campaign ends after 5 launches, or when the funds can't pay for the cheapest complete spacecraft at that difficulty (about $144M on Space Fan, $50M on Space Nerd, $43M on Space Expert). This replaces the flat $50M.
- **Appeals.** Coming back to a rejected objective, or asking again for the same money or more, counts as an appeal. Asking for less money is a new request. A rejected purchase order is answered by appealing or by changing the design.
- **Debrief.** Only the Radio Operator, who presents it, can close the debrief.
- **Scoring.** The Designer is no longer marked down for asking for funds; the score looks at how far spending went beyond the first allocation. The Radio Operator is no longer marked down for stations the data needed.
- **Small fixes.** Re-selecting the part already chosen does nothing (it used to cancel the team's votes). Saved games carry a version, and a crash offers "clear saved game and restart".
- **Tutorial.** The lesson accepts only the two lesson instruments and the Standard schedule, so no step can become impossible.

## 17. Changes requested by the team (2026-11-14)

- **Higher-detail 3D.** The earlier "simple shapes only" rule is dropped. Earth, Mars, Jupiter, the Moon and the star background use real NASA images (credits in `public/textures/CREDITS.md`). The spacecraft, rockets, launch pad and asteroid are modelled in code with smooth geometry, solar-cell and gold-foil surfaces, and a distinct shape for every instrument. Orbits are drawn as glowing rings with the team's own spacecraft flying them.
- **One flight page.** Launch and operations share a single page: the 3D view on one side and the Radio Operator's console on the other. The console keeps one transcript, from the countdown calls to each command and the spacecraft's reply. With no radio link, the first command already goes unanswered.
- **Bigger, expandable 3D boxes.** Every 3D box has an expand button (fills the screen, zoom enabled, Escape to close) and can be dragged taller. None of them scrolls inside. On the mission board the 3D preview and gauges sit alone in the right column; Requests and Activity moved under the role tabs on the left.
- **Looking back at the debrief.** From the campaign screen and the final report, any player can go back to the last debrief and forward again. It is a private view and changes nothing in the game.
- **"Fly again with fixes" changes nothing.** The mission restarts in the design stage with the same objective, budget split (including money the Planner added), schedule and every part and instrument. The team applies only its fix. If the campaign can no longer afford the same budget, the Planner re-plans starting from the old numbers.
- **Pass and play.** Player 1 can be renamed in the player list.
- **Tutorial.** The coach sits at the bottom centre so it never covers Requests; the re-plan step is gone because fly again keeps the budget.

## 18. The flight animation (requested 2026-11-14, replaces "one flight page" in §17)

The flight is one continuous time-lapse on one page, with the Radio Operator's console beside it.

**Stages.** Countdown → climb to space → (wait for the Radio Operator) → cruise → arrival → conversation on arrival. The Radio Operator's "Contact the spacecraft" button appears only once the rocket has passed 100 km and left the atmosphere. From then on the Radio Operator tracks the spacecraft: the console logs check-ins at 25%, 50% and 75% of the way, with distance from Earth and signal delay.

**Timing follows distance and design** (`src/engine/flight.ts`, tested):
- Real figures per destination: distance from Earth and normal trip time (about 8.5 minutes to a low orbit, 3 days to the Moon, 7 months to Mars, 5 years to Jupiter).
- The readouts show real mission time, distance, one-way signal delay and sunlight.
- The animation is a time-lapse whose length grows with the trip (about 5 s for a low orbit, 21 s for Mars, 25 s for Jupiter).
- The design bends the times: a rocket loaded near its limit climbs more slowly (130–214 real seconds to space); spare rocket capacity shortens the trip by up to 15% and a full load lengthens it by up to 15%; an ion engine makes a trip beyond Earth 50% longer.

**Three outcomes.**
- *Success*: the whole journey, arrival into orbit (or a landing), then four commands and replies.
- *Partial success*: the same journey, arriving with amber warnings in the replies.
- *Failure*: one of twelve animations, each striking at the moment it would really happen. If a design has several mission-ending problems, the animation shows the one that comes first; the debrief lists all of them.

| # | Problem | When | What is shown |
|---|---|---|---|
| 1 | Rocket can't get there | climb | engine flickers out, the rocket coasts, tips over and falls back glowing |
| 2 | Too heavy for the rocket | climb | barely lifts, wobbles, sinks back onto the pad and explodes there |
| 3 | Frame buckled | climb | the top folds in mid-climb and the payload spills out in pieces |
| 4 | Wrong destination | arrival | arrives and orbits; the instrument scan sweeps the surface and turns red |
| 5 | Not enough power | cruise | lights dim as the Sun shrinks, then the craft goes dark and drifts |
| 6 | Froze overnight | arrival | lands safely, night covers the site, the beacon turns blue and goes out |
| 7 | Couldn't stop | arrival | comes in and flies straight past the planet |
| 8 | No way to land | arrival | dives at Mars and burns up in a fireball |
| 9 | Fried by radiation | arrival | orbits inside Jupiter's glowing belts, sparks, then goes dark |
| 10 | Tumbling | cruise | spins out of control soon after leaving Earth |
| 11 | No radio contact | cruise | the signal beam to Earth thins with distance and dies |
| 12 | Nobody listening | cruise | calls home right after reaching space; a red marker shows no station hears it |

**Review page.** Opening the game with `#gallery` at the end of the address shows every animation without playing a mission.
