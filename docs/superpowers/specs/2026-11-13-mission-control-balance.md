# Mission Control — Balance Appendix (numbers, tables, rules)

Companion to `2026-11-13-mission-control-design.md`. The executable source of truth for every number here is [`balance_reference.py`](balance_reference.py). The game engine's data files and its tests must reproduce it. Units: mass kg, power W, cost $M, data Gb/day, development months.

## 1. Verification result

The reference search tried every combination of orbit, 1–3 relevant instruments, power source, antenna and band. It filled the remaining slots with the cheapest option that fixes each fault, and picked the cheapest station set and launch vehicle that work. A design counts as **viable** if it gets a full success, has science ≥ 50%, costs no more than the difficulty's starting budget, and uses only gear that is unlocked at the start. Designs count as distinct if they differ in orbit, vehicle, power source or antenna.

| Objective | Fan | Nerd | Expert | Cheapest viable (cost $M) | Grant $M |
|---|---|---|---|---|---|
| Wildfire watch | 8 | 14 | 20 | 128–179 | 360 |
| Polar ice | – | 9 | 24 | 128–132 | 480 |
| Crops & water | – | – | 20 | 136 | 400 |
| IR telescope (L2) | 2 | 2 | 2 | 717–904 | 1,300 |
| Asteroid survey | – | 4 | 6 | 279 | 800 |
| Jupiter icy moons | – | – | 2 | 371 (large solar) / 381 (RTG) | 1,400 |
| Mars ice orbiter | 2 | 2 | 3 | 329–344 | 700 |
| Mars scout lander | – | 4 | 6 | 431–441 | 1,000 |
| Mars resource lander | – | – | 6 | 489 | 1,200 |

**All 18 objective × difficulty pairs have ≥ 2 viable designs.** The telescope, Jupiter and Mars-orbiter missions have only 2–3 viable designs each, so they are the hard puzzles, and that's intended.

Balancing changes made to get there:
- In Fan and Nerd, the automatic thermal choice now matches the destination: active cooling on the Mars surface, heaters everywhere else.
- Mars link distance factor is 0.005.

## 2. Launch vehicles

| id | Vehicle | LEO | SSO | High Earth | Escape | Cost | Fan | Nerd | Expert |
|---|---|---|---|---|---|---|---|---|---|
| electron | Electron | 300 | 200 | – | – | 8 | ✓ | ✓ | ✓ |
| pslv | PSLV-XL | 3,800 | 1,750 | 1,400 | – | 30 | ✓ | ✓ | ✓ |
| vega_c | Vega-C | 3,300 | 2,300 | – | – | 45 | | ✓ | ✓ |
| h3 | H3 | 9,000 | 4,000 | 6,500 | 1,000 | 60 | | ✓ | ✓ |
| falcon9 | Falcon 9 | 17,500 | 12,000 | 5,500 | 2,500 | 70 | ✓ | ✓ | ✓ |
| ariane64 | Ariane 64 | 21,600 | 15,000 | 11,500 | 4,000 | 115 | | ✓ | ✓ |
| atlas_v | Atlas V 551 | 18,800 | 15,000 | 8,900 | 4,000 | 150 | ✓ | ✓ | ✓ |
| vulcan | Vulcan Centaur | 27,200 | 20,000 | 15,000 | 6,000 | 120 | | | ✓ |
| new_glenn | New Glenn | 45,000 | 30,000 | 13,600 | 7,000 | 110 | | | ✓ |
| falcon_hvy | Falcon Heavy | 63,800 | 40,000 | 26,700 | 16,800 | 150 | ✓ | ✓ | ✓ |
| sls | SLS Block 1 | 95,000 | – | – | 27,000 | 900 | ✓ | ✓ | ✓ |

The vehicle's effective capacity is its value in the orbit's column × the orbit's capacity multiplier.

## 3. Orbits / destinations (11)

| id | Column | Cap × | Sunlight | Longest shadow h | Link distance | Range tier | Base life yrs | Capture propulsion | Ground network | Radiation | Thermal | Fan/Nerd/Expert |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| leo | LEO | 1 | 1.0 | 0.6 | 1.0 | 1 | 2 (8 with propulsion ≥ cold gas) | 0 | near-Earth | low | mild | ✓✓✓ |
| sso | SSO | 1 | 1.0 | 0.5 | 1.0 | 1 | 8 | 0 | near-Earth | low | mild | ✓✓✓ |
| meo | High Earth | 1 | 1.0 | 1.0 | 0.3 | 2 | 15 | 0 | near-Earth | med | mild | ✓✓✓ |
| geo | High Earth | 1 | 1.0 | 1.2 | 0.3 | 2 | 15 | 0 | near-Earth | low | mild | ✓✓✓ |
| heo | High Earth | 1 | 1.0 | 1.0 | 0.3 | 2 | 10 | 0 | near-Earth | med | mild | ––✓ |
| l2 | Escape | 1 | 1.0 | 0 | 0.02 | 3 | 10 | 1 | DSN | low | cold | ✓✓✓ |
| lunar | Escape | 1 | 1.0 | 0.8 | 0.05 | 3 | 3 | 2 | DSN | low | cold | ✓✓✓ |
| asteroid | Escape | 0.8 | 0.5 | 0 | 0.01 | 4 | 5 | 2 | DSN | low | cold | –✓✓ |
| mars_orbit | Escape | 1 | 0.43 | 0.7 | 0.005 | 4 | 10 | 2 | DSN | low | cold | ✓✓✓ |
| mars_surf | Escape | 1 | 0.35 | 12 | 0.005 | 4 | 8 (3 if solar: dust) | 0 (needs landing kit) | DSN × 0.5 | low | extreme | –✓✓ |
| jupiter | Escape | 0.6 | 0.04 | 0 | 0.001 | 5 | 6 | 2 | DSN | high | cold | ––✓ |

## 4. Ground stations: coverage fraction of the day

Near-Earth stations cost $3M each and Deep Space Network (DSN) stations $15M each. Coverage is the sum of the stations, capped at 1, except GEO, where it is the **maximum** of the stations, so any station beyond one is wasted. Mars surface coverage is multiplied by 0.5. Ka-band at Singapore and Hawaii is multiplied by 0.7 (rain fade).

| Station | LEO | SSO | MEO | GEO | HEO | L2 / Moon / Asteroid / Mars / Jupiter |
|---|---|---|---|---|---|---|
| Svalbard | .02 | .15 | .30 | **0** (too far north) | .60 | 0 |
| Kiruna | .03 | .10 | .30 | 1 | .60 | 0 |
| Fairbanks | .04 | .10 | .30 | 1 | .60 | 0 |
| Wallops | .06 | .05 | .30 | 1 | .40 | 0 |
| Hawaii | .06 | .04 | .30 | 1 | .10 | 0 |
| Santiago | .06 | .05 | .30 | 1 | .10 | 0 |
| Hartebeesthoek | .06 | .05 | .30 | 1 | .10 | 0 |
| Singapore | .07 | .04 | .30 | 1 | .10 | 0 |
| Goldstone (DSN) | .04 | .05 | .30 | 1 | .40 | .33 |
| Madrid (DSN) | .04 | .05 | .30 | 1 | .40 | .33 |
| Canberra (DSN) | .04 | .05 | .30 | 1 | .10 | .34 |

## 5. Components (11 slots)

Columns: mass · power draw · cost · dev months · slot stat. **L** = locked until the New Gear award unlocks it. The Fan/Nerd/Expert columns show which options each difficulty offers. **auto** means the game sets that slot automatically.

| Slot | Option | Mass | W | $M | Months | Stat | Fan | Nerd | Expert |
|---|---|---|---|---|---|---|---|---|---|
| Structure | small | 150 | 0 | 15 | 6 | carries 500 kg | | ✓ | ✓ |
| | medium | 400 | 0 | 45 | 9 | carries 2,000 kg | ✓ | ✓ | ✓ |
| | large | 1,000 | 0 | 110 | 12 | carries 6,000 kg | ✓ | ✓ | ✓ |
| Power | body solar | 25 | – | 5 | 3 | 400 W × sunlight | | ✓ | ✓ |
| | deployable solar | 120 | – | 25 | 6 | 2,500 W × sunlight | ✓ | ✓ | ✓ |
| | large solar | 350 | – | 60 | 9 | 8,000 W × sunlight | ✓ | ✓ | ✓ |
| | RTG | 60 | – | 110 | 18 | 450 W anywhere; keeps a lander warm | | | ✓ |
| Batteries | small | 10 | 0 | 2 | 3 | 1,000 Wh | | ✓ | ✓ |
| | medium | 35 | 0 | 6 | 3 | 4,000 Wh | ✓ | ✓ | ✓ |
| | large | 120 | 0 | 15 | 6 | 15,000 Wh | ✓ | ✓ | ✓ |
| Computer | basic | 3 | 15 | 3 | 3 | 100 Gb/day | | ✓ | ✓ |
| | rad-hardened | 6 | 25 | 12 | 6 | 300 Gb/day, radiation-proof | auto | ✓ | ✓ |
| | high-performance **L** | 10 | 60 | 25 | 9 | 1,500 Gb/day | | | ✓ |
| Attitude | magnetorquers | 4 | 5 | 1 | 3 | pointing 1 (Earth orbit only, else 0) | | ✓ | ✓ |
| | reaction wheels | 25 | 50 | 8 | 6 | pointing 2 | | ✓ | ✓ |
| | wheels + star trackers | 40 | 80 | 15 | 9 | pointing 3 | auto | ✓ | ✓ |
| Thermal | passive | 5 | 0 | 1 | 2 | mild | | | ✓ |
| | heaters + radiators | 25 | 60 | 5 | 4 | mild, cold | auto | auto | ✓ |
| | active loop | 60 | 150 | 20 | 8 | mild, cold, extreme | auto (Mars surface) | auto (Mars surface) | ✓ |
| Propulsion | none | 0 | 0 | 0 | 0 | class 0 | ✓ | ✓ | ✓ |
| | cold gas | 20 | 0 | 3 | 3 | class 1 | | ✓ | ✓ |
| | chemical | 600 | 10 | 30 | 9 | class 2 | ✓ | ✓ | ✓ |
| | ion **L** | 150 | 1,500 | 45 | 12 | class 2 | | | ✓ |
| Storage | small | 2 | 5 | 1 | 2 | 100 Gb | | ✓ | ✓ |
| | medium | 5 | 10 | 3 | 3 | 500 Gb | auto | ✓ | ✓ |
| | large | 12 | 20 | 8 | 4 | 4,000 Gb | | ✓ | ✓ |
| Protection | none | 0 | 0 | 0 | 0 | – | ✓ | ✓ | ✓ |
| | radiation shielding | 150 | 0 | 20 | 6 | Jupiter, Van Allen belts | | | ✓ |
| | sunshield | 300 | 0 | 80 | 12 | infrared telescope | ✓ | ✓ | ✓ |
| | Mars landing kit | 900 | 0 | 180 | 18 | Mars surface | | ✓ | ✓ |
| Comms antenna | omni | 2 | 10 | 1 | 3 | gain 0.2, range tier 2, pointing 0 | | | ✓ |
| | medium-gain | 6 | 25 | 4 | 4 | gain 1, tier 3, pointing 1 | ✓ | ✓ | ✓ |
| | high-gain 1 m | 30 | 70 | 12 | 6 | gain 4, tier 4, pointing 2 | | ✓ | ✓ |
| | deep-space 3 m | 90 | 120 | 35 | 12 | gain 15, tier 5, pointing 3 | ✓ | ✓ | ✓ |
| Comms band | UHF | – | – | 0 | – | 0.5 Gb/h, tier 1 only | | ✓ | ✓ |
| | S | – | – | 1 | – | 2 Gb/h | | ✓ | ✓ |
| | X | – | – | 3 | – | 10 Gb/h | auto | ✓ | ✓ |
| | Ka **L** | – | – | 6 | – | 40 Gb/h, needs gain ≥ 4, rain fade | | | ✓ |

## 6. Instruments (12)

| id | Instrument | Mass | W | $M | Months | Gb/day | Pointing | Fan | Nerd | Expert |
|---|---|---|---|---|---|---|---|---|---|---|
| hires_cam | High-res camera | 60 | 40 | 25 | 9 | 50 | 2 | ✓ | ✓ | ✓ |
| multispectral | Multispectral imager | 50 | 45 | 30 | 9 | 40 | 2 | ✓ | ✓ | ✓ |
| hyperspectral **L** | Hyperspectral imager | 80 | 70 | 45 | 12 | 120 | 2 | | | ✓ |
| thermal_ir | Thermal IR camera | 45 | 50 | 25 | 9 | 20 | 1 | ✓ | ✓ | ✓ |
| sar | Synthetic aperture radar | 300 | 600 | 70 | 15 | 200 | 2 | | ✓ | ✓ |
| gpr | Ground-penetrating radar | 40 | 60 | 35 | 12 | 10 | 1 | ✓ | ✓ | ✓ |
| spectrometer | Spectrometer | 30 | 25 | 30 | 9 | 5 | 2 | ✓ | ✓ | ✓ |
| magnetometer | Magnetometer | 5 | 4 | 8 | 6 | 0.1 | 0 | | ✓ | ✓ |
| radiation | Radiation detector | 10 | 8 | 10 | 6 | 0.2 | 0 | | | ✓ |
| weather | Weather station (surface) | 15 | 15 | 12 | 6 | 0.5 | 0 | | ✓ | ✓ |
| ir_telescope | Infrared telescope | 800 | 300 | 400 | 24 | 60 | 3 | ✓ | ✓ | ✓ |
| drill | Drill & analyzer (surface) | 60 | 120 | 60 | 15 | 1 | 0 | | | ✓ |

> Note: the Nerd Mars scout lander needs the radiation detector to score well, but it's only available in Expert, and the checker still finds 4 viable Nerd designs without it (weather station only). Builder's call: keep it this way. Nerd players get a simpler lander.

## 7. Objectives: orbit fit, relevance matrix (0–3), requirements, grants

| Objective | Diff | Orbit fit (absent = wrong destination) | Life yrs | Min coverage | Grant $M |
|---|---|---|---|---|---|
| wildfire | Fan+ | sso 1.0 · leo 0.9 · geo 0.6 · meo 0.5 | 3 | 0.20 | 360 |
| polar_ice | Nerd+ | sso 1.0 · heo 0.8 · leo 0.3 | 5 | 0.10 | 480 |
| crops | Expert | sso 1.0 · leo 0.8 · geo 0.4 · meo 0.4 | 5 | 0.10 | 400 |
| telescope | Fan+ | l2 1.0 · leo 0.3 | 5 | 0.30 | 1,300 |
| asteroid | Nerd+ | asteroid 1.0 | 3 | 0.30 | 800 |
| jupiter | Expert | jupiter 1.0 | 4 | 0.30 | 1,400 |
| mars_ice | Fan+ | mars_orbit 1.0 | 4 | 0.30 | 700 |
| mars_scout | Nerd+ | mars_surf 1.0 · mars_orbit 0.5 | 2 | 0.20 | 1,000 |
| mars_isru | Expert | mars_surf 1.0 | 2 | 0.20 | 1,200 |

Relevance (blank = 0):

| | hires | multi | hyper | therm | sar | gpr | spec | mag | rad | weath | tele | drill |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| wildfire | 2 | 2 | 1 | 3 | 2 | | | | | | | |
| polar_ice | 1 | 1 | | 2 | 3 | 2 | 1 | | | | | |
| crops | 1 | 3 | 3 | 2 | 2 | | | | | | | |
| telescope | | | | | | | 2 | | | | 3 | |
| asteroid | 2 | 1 | 2 | 1 | | 2 | 3 | 1 | | | | |
| jupiter | 2 | | | 1 | | 3 | 2 | 3 | 1 | | | |
| mars_ice | 1 | 1 | 2 | 2 | | 3 | 2 | | | | | |
| mars_scout | 2 | 1 | | | | | 1 | | 2 | 3 | | |
| mars_isru | | | | | | 2 | 2 | | 1 | 1 | | 3 |

## 8. Formulas

- **Mass** = all components + instruments. A critical fault if it's over the vehicle's effective capacity, or if non-structure mass is over what the structure can carry.
- **Power**: generation = source W × sunlight (solar only). Draw = Σ W. Generation < draw → critical. Margin < 10% → minor.
- **Battery**: needed Wh = draw × longest shadow (solar only). If capacity is short: critical when the shadow is ≥ 6 h (frozen night), otherwise major.
- **Link closes** if antenna tier ≥ orbit tier, band tier ≥ orbit tier, and antenna gain ≥ the band's required gain. Otherwise critical.
- **Downlink Gb/day** = band rate × antenna gain × link distance × coverage × 24. Downlinked fraction = min(1, downlink ÷ data generated). Below 0.5 → major.
- **Computer**: Gb/day capacity < data generated → major. **Storage** < data generated × (1 − coverage) → major.
- **Pointing**: attitude pointing < the highest need of instruments and antenna → major. Pointing 0 → critical (tumbling).
- **Propulsion**: class < the orbit's capture class → critical when class 2 is needed, major when class 1 is needed.
- **Protection**: Mars surface without the landing kit → critical. Jupiter without shielding → critical. Telescope without a sunshield → major, and the telescope's relevance drops to 0.
- **Lifetime**: start from base life. LEO with propulsion → 8. Medium radiation without shielding or a rad-hardened computer → × 0.3. High radiation without a rad-hardened computer → × 0.3. Wrong thermal → × 0.5 and major (an RTG counts as active thermal for extreme cold). Solar on the Mars surface → max 3. Life < required → major.
- **Science** = min(1, Σ sorted relevance × weights[1, .8, .6, .4, .3, .2, .1…] ÷ best possible score from 4 unlocked instruments) × orbit fit × downlinked fraction × min(1, life ÷ required). Surface instruments in orbit count 0.
- **Cost** = components + instruments + vehicle + stations, × schedule mode (Rush ×1.2, Careful ×0.95), + express fees + Mars-window waiting ($4M per month).
- **Dev time** = slowest item's months + 6 integration months, × schedule mode (Rush ×0.75, Careful ×1.25), + backorder waits.
- **Grant**: success = grant × science. Partial = half of that. Failure = 0.
