"""Balancing checker for Mission Control. Encodes the spec's numbers and fault rules,
searches the design space per objective x difficulty, reports viable full-success designs."""
import itertools, json, sys

# ---------------- LAUNCH VEHICLES ----------------
# capacities kg: LEO, SSO, GTO(high earth), ESC(escape); None = cannot reach
VEH = {
 "electron":   dict(LEO=300,   SSO=200,   GTO=None,  ESC=None,  cost=8,   dev=0),
 "pslv":       dict(LEO=3800,  SSO=1750,  GTO=1400,  ESC=None,  cost=30,  dev=0),
 "vega_c":     dict(LEO=3300,  SSO=2300,  GTO=None,  ESC=None,  cost=45,  dev=0),
 "h3":         dict(LEO=9000,  SSO=4000,  GTO=6500,  ESC=1000,  cost=60,  dev=0),
 "falcon9":    dict(LEO=17500, SSO=12000, GTO=5500,  ESC=2500,  cost=70,  dev=0),
 "ariane64":   dict(LEO=21600, SSO=15000, GTO=11500, ESC=4000,  cost=115, dev=0),
 "atlas_v":    dict(LEO=18800, SSO=15000, GTO=8900,  ESC=4000,  cost=150, dev=0),
 "vulcan":     dict(LEO=27200, SSO=20000, GTO=15000, ESC=6000,  cost=120, dev=0),
 "new_glenn":  dict(LEO=45000, SSO=30000, GTO=13600, ESC=7000,  cost=110, dev=0),
 "falcon_hvy": dict(LEO=63800, SSO=40000, GTO=26700, ESC=16800, cost=150, dev=0),
 "sls":        dict(LEO=95000, SSO=None,  GTO=None,  ESC=27000, cost=900, dev=0),
}
VEH_BY_DIFF = {
 "fan":    ["electron","pslv","falcon9","atlas_v","falcon_hvy","sls"],
 "nerd":   ["electron","pslv","vega_c","h3","falcon9","ariane64","atlas_v","falcon_hvy","sls"],
 "expert": list(VEH),
}

# ---------------- ORBITS ----------------
# cls: capacity column; capMult: multiplier on that column; sun: sunlight factor; shadow: longest shadow h
# dist: link distance factor; tier: range tier; life: base years; capture: propulsion class needed
# dsn: only DSN stations count; rad: low/med/high; thermal: mild/cold/extreme; earth: magnetorquers work
ORB = {
 "leo":        dict(cls="LEO",capMult=1.0,sun=1.0, shadow=0.6, dist=1.0,  tier=1,life=2, capture=0,dsn=False,rad="low", thermal="mild",   earth=True, covMult=1.0),
 "sso":        dict(cls="SSO",capMult=1.0,sun=1.0, shadow=0.5, dist=1.0,  tier=1,life=8, capture=0,dsn=False,rad="low", thermal="mild",   earth=True, covMult=1.0),
 "meo":        dict(cls="GTO",capMult=1.0,sun=1.0, shadow=1.0, dist=0.3,  tier=2,life=15,capture=0,dsn=False,rad="med", thermal="mild",   earth=True, covMult=1.0),
 "geo":        dict(cls="GTO",capMult=1.0,sun=1.0, shadow=1.2, dist=0.3,  tier=2,life=15,capture=0,dsn=False,rad="low", thermal="mild",   earth=True, covMult=1.0),
 "heo":        dict(cls="GTO",capMult=1.0,sun=1.0, shadow=1.0, dist=0.3,  tier=2,life=10,capture=0,dsn=False,rad="med", thermal="mild",   earth=True, covMult=1.0),
 "l2":         dict(cls="ESC",capMult=1.0,sun=1.0, shadow=0.0, dist=0.02, tier=3,life=10,capture=1,dsn=True, rad="low", thermal="cold",   earth=False,covMult=1.0),
 "lunar":      dict(cls="ESC",capMult=1.0,sun=1.0, shadow=0.8, dist=0.05, tier=3,life=3, capture=2,dsn=True, rad="low", thermal="cold",   earth=False,covMult=1.0),
 "asteroid":   dict(cls="ESC",capMult=0.8,sun=0.5, shadow=0.0, dist=0.01, tier=4,life=5, capture=2,dsn=True, rad="low", thermal="cold",   earth=False,covMult=1.0),
 "mars_orbit": dict(cls="ESC",capMult=1.0,sun=0.43,shadow=0.7, dist=0.005,tier=4,life=10,capture=2,dsn=True, rad="low", thermal="cold",   earth=False,covMult=1.0),
 "mars_surf":  dict(cls="ESC",capMult=1.0,sun=0.35,shadow=12,  dist=0.005,tier=4,life=8, capture=0,dsn=True, rad="low", thermal="extreme",earth=False,covMult=0.5),
 "jupiter":    dict(cls="ESC",capMult=0.6,sun=0.04,shadow=0.0, dist=0.001,tier=5,life=6, capture=2,dsn=True, rad="high",thermal="cold",   earth=False,covMult=1.0),
}
ORB_BY_DIFF = {
 "fan":    ["leo","sso","meo","geo","l2","lunar","mars_orbit"],
 "nerd":   ["leo","sso","meo","geo","l2","lunar","mars_orbit","asteroid","mars_surf"],
 "expert": list(ORB),
}

# ---------------- GROUND STATIONS (coverage fraction of day, per orbit) ----------------
NE = ["svalbard","kiruna","fairbanks","wallops","hawaii","santiago","hartebeesthoek","singapore"]
DSN = ["goldstone","madrid","canberra"]
STATION_COST = {**{s:3 for s in NE}, **{s:15 for s in DSN}}
COV = {
 "leo": dict(svalbard=.02,kiruna=.03,fairbanks=.04,wallops=.06,hawaii=.06,santiago=.06,hartebeesthoek=.06,singapore=.07,goldstone=.04,madrid=.04,canberra=.04),
 "sso": dict(svalbard=.15,kiruna=.10,fairbanks=.10,wallops=.05,hawaii=.04,santiago=.05,hartebeesthoek=.05,singapore=.04,goldstone=.05,madrid=.05,canberra=.05),
 "meo": {**{s:.30 for s in NE}, **{s:.30 for s in DSN}},
 "geo": {**{s:1.0 for s in NE}, "svalbard":0.0, **{s:1.0 for s in DSN}},   # GEO: max, not sum
 "heo": dict(svalbard=.6,kiruna=.6,fairbanks=.6,wallops=.4,hawaii=.1,santiago=.1,hartebeesthoek=.1,singapore=.1,goldstone=.4,madrid=.4,canberra=.1),
}
for o in ["l2","lunar","asteroid","mars_orbit","mars_surf","jupiter"]:
    COV[o] = {**{s:0.0 for s in NE}, "goldstone":.33,"madrid":.33,"canberra":.34}
RAINY = {"singapore","hawaii"}

def coverage(orbit, stations, band):
    t = COV[orbit]
    vals = [t[s] * (0.7 if band=="ka" and s in RAINY else 1.0) for s in stations]
    if not vals: return 0.0
    c = max(vals) if orbit=="geo" else min(1.0, sum(vals))
    return c * ORB[orbit]["covMult"]

# ---------------- COMPONENTS ----------------
# each option: mass kg, power W (draw; negative not used), cost $M, dev months, + slot stats
COMP = {
 "structure": {
   "small":  dict(mass=150, power=0, cost=15, dev=6,  supports=500),
   "medium": dict(mass=400, power=0, cost=45, dev=9,  supports=2000),
   "large":  dict(mass=1000,power=0, cost=110,dev=12, supports=6000),
 },
 "power": {
   "body_solar":  dict(mass=25, power=0, cost=5,  dev=3,  gen=400,  solar=True),
   "deploy_solar":dict(mass=120,power=0, cost=25, dev=6,  gen=2500, solar=True),
   "large_solar": dict(mass=350,power=0, cost=60, dev=9,  gen=8000, solar=True),
   "rtg":         dict(mass=60, power=0, cost=110,dev=18, gen=450,  solar=False),
 },
 "battery": {
   "small":  dict(mass=10, power=0, cost=2,  dev=3, wh=1000),
   "medium": dict(mass=35, power=0, cost=6,  dev=3, wh=4000),
   "large":  dict(mass=120,power=0, cost=15, dev=6, wh=15000),
 },
 "computer": {
   "basic":     dict(mass=3, power=15, cost=3,  dev=3, gbday=100,  radhard=False),
   "radhard":   dict(mass=6, power=25, cost=12, dev=6, gbday=300,  radhard=True),
   "highperf":  dict(mass=10,power=60, cost=25, dev=9, gbday=1500, radhard=False),
 },
 "attitude": {
   "magnetorquer": dict(mass=4, power=5,  cost=1,  dev=3, point=1),
   "wheels":       dict(mass=25,power=50, cost=8,  dev=6, point=2),
   "wheels_star":  dict(mass=40,power=80, cost=15, dev=9, point=3),
 },
 "thermal": {
   "passive":  dict(mass=5, power=0,  cost=1,  dev=2, handles={"mild"}),
   "heaters":  dict(mass=25,power=60, cost=5,  dev=4, handles={"mild","cold"}),
   "active":   dict(mass=60,power=150,cost=20, dev=8, handles={"mild","cold","extreme"}),
 },
 "propulsion": {
   "none":     dict(mass=0,  power=0,   cost=0,  dev=0,  cls=0),
   "cold_gas": dict(mass=20, power=0,   cost=3,  dev=3,  cls=1),
   "chemical": dict(mass=600,power=10,  cost=30, dev=9,  cls=2),
   "ion":      dict(mass=150,power=1500,cost=45, dev=12, cls=2),
 },
 "storage": {
   "small":  dict(mass=2, power=5,  cost=1, dev=2, gb=100),
   "medium": dict(mass=5, power=10, cost=3, dev=3, gb=500),
   "large":  dict(mass=12,power=20, cost=8, dev=4, gb=4000),
 },
 "protection": {
   "none":      dict(mass=0,  power=0, cost=0,  dev=0),
   "rad_shield":dict(mass=150,power=0, cost=20, dev=6),
   "sunshield": dict(mass=300,power=0, cost=80, dev=12),
   "mars_edl":  dict(mass=900,power=0, cost=180,dev=18),
 },
 "antenna": {
   "omni":   dict(mass=2, power=10, cost=1,  dev=3,  gain=0.2, tier=2, point=0),
   "medium": dict(mass=6, power=25, cost=4,  dev=4,  gain=1,   tier=3, point=1),
   "hga":    dict(mass=30,power=70, cost=12, dev=6,  gain=4,   tier=4, point=2),
   "dsa":    dict(mass=90,power=120,cost=35, dev=12, gain=15,  tier=5, point=3),
 },
 "band": {
   "uhf": dict(mass=0,power=0,cost=0,dev=0, rate=0.5, tier=1, needGain=0),
   "s":   dict(mass=0,power=0,cost=1,dev=0, rate=2,   tier=5, needGain=0),
   "x":   dict(mass=0,power=0,cost=3,dev=0, rate=10,  tier=5, needGain=0),
   "ka":  dict(mass=0,power=0,cost=6,dev=0, rate=40,  tier=5, needGain=4),
 },
}
# options per difficulty; slots missing from ACTIVE are auto-set to AUTO
OPTS = {
 "fan": dict(structure=["medium","large"], power=["deploy_solar","large_solar"], battery=["medium","large"],
             propulsion=["none","chemical"], protection=["none","sunshield"], antenna=["medium","dsa"]),
 "nerd": dict(structure=["small","medium","large"], power=["body_solar","deploy_solar","large_solar"],
              battery=["small","medium","large"], computer=["basic","radhard"], attitude=["magnetorquer","wheels","wheels_star"],
              propulsion=["none","cold_gas","chemical"], storage=["small","medium","large"],
              protection=["none","sunshield","mars_edl"], antenna=["medium","hga","dsa"], band=["uhf","s","x"]),
 "expert": dict(structure=["small","medium","large"], power=["body_solar","deploy_solar","large_solar","rtg"],
              battery=["small","medium","large"], computer=["basic","radhard","highperf"], attitude=["magnetorquer","wheels","wheels_star"],
              thermal=["passive","heaters","active"], propulsion=["none","cold_gas","chemical","ion"], storage=["small","medium","large"],
              protection=["none","rad_shield","sunshield","mars_edl"], antenna=["omni","medium","hga","dsa"], band=["uhf","s","x","ka"]),
}
AUTO = {
 "fan":  dict(computer="radhard", attitude="wheels_star", thermal="heaters", storage="medium", band="x"),
 "nerd": dict(thermal="heaters"),
 "expert": {},
}
LOCKED = {"highperf","ion","ka","hyperspectral"}   # unlocked by New Gear award; excluded from viability

# ---------------- INSTRUMENTS ----------------
INST = {
 "hires_cam":    dict(mass=60, power=40, cost=25, dev=9,  gb=50,  point=2, surface=False),
 "multispectral":dict(mass=50, power=45, cost=30, dev=9,  gb=40,  point=2, surface=False),
 "hyperspectral":dict(mass=80, power=70, cost=45, dev=12, gb=120, point=2, surface=False),
 "thermal_ir":   dict(mass=45, power=50, cost=25, dev=9,  gb=20,  point=1, surface=False),
 "sar":          dict(mass=300,power=600,cost=70, dev=15, gb=200, point=2, surface=False),
 "gpr":          dict(mass=40, power=60, cost=35, dev=12, gb=10,  point=1, surface=False),
 "spectrometer": dict(mass=30, power=25, cost=30, dev=9,  gb=5,   point=2, surface=False),
 "magnetometer": dict(mass=5,  power=4,  cost=8,  dev=6,  gb=0.1, point=0, surface=False),
 "radiation":    dict(mass=10, power=8,  cost=10, dev=6,  gb=0.2, point=0, surface=False),
 "weather":      dict(mass=15, power=15, cost=12, dev=6,  gb=0.5, point=0, surface=True),
 "ir_telescope": dict(mass=800,power=300,cost=400,dev=24, gb=60,  point=3, surface=False),
 "drill":        dict(mass=60, power=120,cost=60, dev=15, gb=1,   point=0, surface=True),
}
INST_BY_DIFF = {
 "fan":   ["hires_cam","multispectral","thermal_ir","spectrometer","gpr","ir_telescope"],
 "nerd":  ["hires_cam","multispectral","thermal_ir","spectrometer","gpr","ir_telescope","magnetometer","weather","sar"],
 "expert": list(INST),
}

# ---------------- OBJECTIVES ----------------
# orbits: fit multiplier (1 = best); absent = invalid; rel: instrument relevance 0..3
OBJ = {
 "wildfire":   dict(type="eo", diff="fan", orbits=dict(sso=1.0, leo=0.9, geo=0.6, meo=0.5), life=3, minCov=0.20, grant=360,
                    rel=dict(thermal_ir=3, multispectral=2, hires_cam=2, sar=2, hyperspectral=1)),
 "polar_ice":  dict(type="eo", diff="nerd", orbits=dict(sso=1.0, heo=0.8, leo=0.3), life=5, minCov=0.10, grant=480,
                    rel=dict(sar=3, thermal_ir=2, gpr=2, multispectral=1, spectrometer=1, hires_cam=1)),
 "crops":      dict(type="eo", diff="expert", orbits=dict(sso=1.0, leo=0.8, geo=0.4, meo=0.4), life=5, minCov=0.10, grant=400,
                    rel=dict(multispectral=3, hyperspectral=3, thermal_ir=2, sar=2, hires_cam=1)),
 "telescope":  dict(type="deep", diff="fan", orbits=dict(l2=1.0, leo=0.3), life=5, minCov=0.30, grant=1300,
                    rel=dict(ir_telescope=3, spectrometer=2)),
 "asteroid":   dict(type="deep", diff="nerd", orbits=dict(asteroid=1.0), life=3, minCov=0.30, grant=800,
                    rel=dict(spectrometer=3, hires_cam=2, gpr=2, hyperspectral=2, magnetometer=1, multispectral=1, thermal_ir=1)),
 "jupiter":    dict(type="deep", diff="expert", orbits=dict(jupiter=1.0), life=4, minCov=0.30, grant=1400,
                    rel=dict(magnetometer=3, gpr=3, spectrometer=2, hires_cam=2, radiation=1, thermal_ir=1)),
 "mars_ice":   dict(type="mars", diff="fan", orbits=dict(mars_orbit=1.0), life=4, minCov=0.30, grant=700,
                    rel=dict(gpr=3, spectrometer=2, thermal_ir=2, hyperspectral=2, hires_cam=1, multispectral=1)),
 "mars_scout": dict(type="mars", diff="nerd", orbits=dict(mars_surf=1.0, mars_orbit=0.5), life=2, minCov=0.20, grant=1000,
                    rel=dict(weather=3, hires_cam=2, radiation=2, spectrometer=1, multispectral=1)),
 "mars_isru":  dict(type="mars", diff="expert", orbits=dict(mars_surf=1.0), life=2, minCov=0.20, grant=1200,
                    rel=dict(drill=3, spectrometer=2, gpr=2, weather=1, radiation=1)),
}
OBJ_BY_DIFF = {"fan":["wildfire","telescope","mars_ice"],
               "nerd":["wildfire","polar_ice","telescope","asteroid","mars_ice","mars_scout"],
               "expert":list(OBJ)}
BUDGET = {"fan":2000, "nerd":1600, "expert":1300}
WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]

def max_science(obj, diff):
    rels = sorted([OBJ[obj]["rel"].get(i,0) for i in INST_BY_DIFF[diff] if i not in LOCKED], reverse=True)[:4]
    return sum(r*w for r,w in zip(rels, WEIGHTS))

def evaluate(d, obj, diff):
    """d: dict of slot->option plus orbit, vehicle, instruments(list), stations(list). Returns report."""
    o = ORB[d["orbit"]]; ob = OBJ[obj]
    parts = [COMP[s][d[s]] for s in ["structure","power","battery","computer","attitude","thermal","propulsion","storage","protection","antenna","band"]]
    insts = [INST[i] for i in d["instruments"]]
    faults = []
    def F(sev, code, roles): faults.append((sev, code, roles))
    # mass
    bus_other = sum(p["mass"] for p in parts) - COMP["structure"][d["structure"]]["mass"] + sum(i["mass"] for i in insts)
    mass = bus_other + COMP["structure"][d["structure"]]["mass"]
    v = VEH[d["vehicle"]]; cap = v[o["cls"]]
    if cap is None: F("critical","vehicle_cannot_reach",["designer","radio"]); cap = 0
    else: cap = cap * o["capMult"]
    if mass > cap and cap > 0: F("critical","over_capacity",["designer"])
    if bus_other > COMP["structure"][d["structure"]]["supports"]: F("critical","structure_overloaded",["designer"])
    # orbit fit
    fit = ob["orbits"].get(d["orbit"], 0)
    if fit == 0: F("critical","wrong_destination",["scientist","radio"])
    # power
    pw = COMP["power"][d["power"]]
    gen = pw["gen"] * (o["sun"] if pw["solar"] else 1.0)
    draw = sum(p["power"] for p in parts) + sum(i["power"] for i in insts)
    if gen < draw: F("critical","power_deficit",["designer"])
    elif (gen-draw)/draw < 0.10: F("minor","thin_power_margin",["designer"])
    need_wh = draw * o["shadow"] if pw["solar"] else 0
    if COMP["battery"][d["battery"]]["wh"] < need_wh:
        F("critical" if o["shadow"] >= 6 else "major", "battery_short", ["designer"])
    # surface instruments
    on_surface = d["orbit"] == "mars_surf"
    # propulsion / capture
    pc = COMP["propulsion"][d["propulsion"]]["cls"]
    if pc < o["capture"]: F("critical" if o["capture"]==2 else "major","no_capture_propulsion",["designer"])
    # protection
    if d["orbit"]=="mars_surf" and d["protection"]!="mars_edl": F("critical","no_landing_kit",["designer"])
    if d["orbit"]=="jupiter" and d["protection"]!="rad_shield": F("critical","radiation_fried",["designer"])
    has_tel = "ir_telescope" in d["instruments"]
    if has_tel and d["protection"]!="sunshield": F("major","telescope_blinded",["designer","scientist"])
    # pointing
    point = COMP["attitude"][d["attitude"]]["point"]
    if d["attitude"]=="magnetorquer" and not o["earth"]: point = 0
    if point == 0 and not (d["attitude"]=="magnetorquer" and o["earth"]):
        F("critical","tumbling",["designer"])
    need_point = max([i["point"] for i in insts] + [COMP["antenna"][d["antenna"]]["point"]])
    if point < need_point: F("major","pointing_too_coarse",["designer"])
    # comms link
    ant = COMP["antenna"][d["antenna"]]; band = COMP["band"][d["band"]]
    link_ok = ant["tier"] >= o["tier"] and band["tier"] >= o["tier"] and ant["gain"] >= band["needGain"]
    if not link_ok: F("critical","no_link",["radio"])
    if any(s in DSN for s in []): pass
    cov = coverage(d["orbit"], d["stations"], d["band"])
    if cov == 0: F("critical","no_station_in_view",["radio"])
    elif cov < ob["minCov"]: F("major","coverage_low",["radio"])
    downlink = band["rate"] * ant["gain"] * o["dist"] * cov * 24 if link_ok else 0
    gen_data = sum(i["gb"] for i in insts)
    frac = 1.0 if gen_data == 0 else min(1.0, downlink / gen_data)
    if gen_data > 0 and frac < 0.5: F("major","downlink_bottleneck",["radio","scientist"])
    if COMP["computer"][d["computer"]]["gbday"] < gen_data: F("major","computer_overloaded",["designer"])
    if COMP["storage"][d["storage"]]["gb"] < gen_data * (1 - cov): F("major","storage_overflow",["designer"])
    # lifetime
    life = o["life"]
    if d["orbit"]=="leo" and pc >= 1: life = 8
    if o["rad"]=="med" and not (d["protection"]=="rad_shield" or COMP["computer"][d["computer"]]["radhard"]): life *= 0.3
    if o["rad"]=="high" and not COMP["computer"][d["computer"]]["radhard"]: life *= 0.3
    if o["thermal"] not in COMP["thermal"][d["thermal"]]["handles"] and not (d["power"]=="rtg" and o["thermal"]=="extreme"):
        life *= 0.5; F("major","thermal_failure",["designer"])
    if on_surface and pw["solar"]: life = min(life, 3)
    if life < ob["life"]: F("major","short_lifetime",["designer","radio"])
    # extra stations (waste)
    if d["orbit"]=="geo" and len(d["stations"])>1: F("minor","wasted_stations",["radio"])
    # science
    rels = []
    for name in d["instruments"]:
        r = ob["rel"].get(name, 0)
        if INST[name]["surface"] and not on_surface: r = 0
        if name=="ir_telescope" and d["protection"]!="sunshield": r = 0
        rels.append(r)
    rels.sort(reverse=True)
    raw = sum(r*w for r,w in zip(rels, WEIGHTS))
    sci = min(1.0, raw / max_science(obj, diff)) * fit * frac * min(1.0, life/ob["life"])
    irrelevant = sum(1 for r in rels if r == 0)
    if irrelevant: F("minor","irrelevant_instruments",["scientist"])
    cost = sum(p["cost"] for p in parts) + sum(i["cost"] for i in insts) + v["cost"] + sum(STATION_COST[s] for s in d["stations"])
    sev = {f[0] for f in faults}
    outcome = "failure" if "critical" in sev else "partial" if "major" in sev else "success"
    return dict(outcome=outcome, faults=faults, mass=mass, cap=cap, draw=draw, gen=gen, cost=cost,
                data=gen_data, downlink=downlink, cov=cov, life=life, sci=sci)

# ---------------- SEARCH ----------------
def opts(diff, slot):
    if slot in OPTS[diff]: return [x for x in OPTS[diff][slot] if x not in LOCKED]
    return [AUTO[diff][slot]]

def cheapest_stations(orbit, need, band, diff):
    pool = [s for s in NE+DSN if COV[orbit][s] > 0]
    best = None
    for k in range(1, 4):
        for combo in itertools.combinations(pool, k):
            c = coverage(orbit, combo, band)
            if c >= need:
                cost = sum(STATION_COST[s] for s in combo)
                if best is None or cost < best[0]: best = (cost, list(combo))
        if best: return best[1]
    return list(pool[:3])


FIX = {"structure_overloaded":"structure","battery_short":"battery","computer_overloaded":"computer",
       "pointing_too_coarse":"attitude","tumbling":"attitude","thermal_failure":"thermal",
       "no_capture_propulsion":"propulsion","storage_overflow":"storage"}
def by_cost(diff, slot):
    return sorted(opts(diff, slot), key=lambda x: COMP[slot][x]["cost"])

def search(obj, diff):
    ob = OBJ[obj]
    inst_pool = [i for i in INST_BY_DIFF[diff] if i not in LOCKED and ob["rel"].get(i,0) >= 1]
    inst_sets = [list(c) for k in (1,2,3) for c in itertools.combinations(inst_pool, k)]
    found = []
    for orbit in [x for x in ob["orbits"] if x in ORB_BY_DIFF[diff]]:
      for ins in inst_sets:
        for pw in opts(diff,"power"):
          for ant in opts(diff,"antenna"):
            for band in opts(diff,"band"):
              d = {s: by_cost(diff,s)[0] for s in ["structure","battery","computer","attitude","thermal","propulsion","storage"]}
              d.update(power=pw, antenna=ant, band=band, orbit=orbit, instruments=ins)
              if "thermal" not in OPTS[diff]:
                  d["thermal"] = "active" if ORB[orbit]["thermal"]=="extreme" else "heaters"
              prot = "none"
              if orbit=="mars_surf": prot="mars_edl"
              elif orbit=="jupiter": prot="rad_shield"
              elif "ir_telescope" in ins: prot="sunshield"
              if prot not in opts(diff,"protection"): continue
              d["protection"]=prot
              for need in (ob["minCov"], 0.6, 1.0):
                d["stations"] = cheapest_stations(orbit, need, band, diff)
                for _ in range(12):
                  for veh in sorted(VEH_BY_DIFF[diff], key=lambda x: VEH[x]["cost"]):
                    d["vehicle"] = veh
                    r = evaluate(d, obj, diff)
                    if not any(f[1] in ("over_capacity","vehicle_cannot_reach") for f in r["faults"]): break
                  codes = [f[1] for f in r["faults"] if f[0] != "minor"]
                  changed = False
                  for c in codes:
                    slot = FIX.get(c)
                    if c == "short_lifetime":
                      if orbit=="leo" and d["propulsion"]=="none": slot="propulsion"
                      elif ORB[orbit]["rad"] in ("med","high"): slot="computer"
                    if slot:
                      lst = by_cost(diff, slot)
                      if slot=="computer" and c=="short_lifetime":
                        if "radhard" in lst and d["computer"]!="radhard": d["computer"]="radhard"; changed=True
                        continue
                      i = lst.index(d[slot])
                      if i+1 < len(lst): d[slot] = lst[i+1]; changed=True
                  if not changed: break
                if r["outcome"]=="success" and r["sci"] >= 0.5 and r["cost"] <= BUDGET[diff]:
                  found.append((r["cost"], dict(d), r)); break
    return found

def distinct(found):
    """designs that differ in orbit, vehicle, power or antenna — 'genuinely different'"""
    found.sort(key=lambda x: x[0]); seen = {}; out = []
    for cost, d, r in found:
        key = (d["orbit"], d["vehicle"], d["power"], d["antenna"])
        if key not in seen: seen[key] = 1; out.append((cost, d, r))
    return out

def dump(path):
    out = []
    for diff in ["fan","nerd","expert"]:
        for obj in OBJ_BY_DIFF[diff]:
            f = distinct(search(obj, diff))[:2]
            for i,(cost,d,r) in enumerate(f):
                out.append(dict(name=f"{diff}/{obj}/viable{i}", diff=diff, objective=obj, design=d, expect=pack(r)))
            if f:
                base = f[0][1]
                variants = {
                    "electron": dict(base, vehicle="electron"),
                    "small_battery": dict(base, battery=sorted(opts(diff,"battery"), key=lambda x: COMP["battery"][x]["wh"])[0]),
                    "medium_antenna": dict(base, antenna="medium"),
                }
                for k,v in variants.items():
                    out.append(dict(name=f"{diff}/{obj}/{k}", diff=diff, objective=obj, design=v, expect=pack(evaluate(v,obj,diff))))
    json.dump(out, open(path,"w"), indent=1)
    print(f"wrote {len(out)} fixtures to {path}")

def pack(r):
    return dict(outcome=r["outcome"], faults=sorted(f[1] for f in r["faults"]), mass=r["mass"], cost=r["cost"],
                science=r["sci"], downlink=r["downlink"], coverage=r["cov"], life=r["life"], powerDraw=r["draw"], powerGen=r["gen"])

if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[1] == "--dump":
    dump(sys.argv[2]); sys.exit(0)

if __name__ == "__main__":
    summary = {}
    for diff in ["fan","nerd","expert"]:
        for obj in OBJ_BY_DIFF[diff]:
            f = distinct(search(obj, diff))
            summary[(diff,obj)] = f
            print(f"\n=== {diff:6} {obj:11} distinct viable designs: {len(f)}  budget {BUDGET[diff]}  grant {OBJ[obj]['grant']}")
            for cost, d, r in f[:2]:
                print(f"  ${cost}M sci={r['sci']} {d['orbit']} {d['vehicle']} pw={d['power']} bat={d['battery']} st={d['structure']} "
                      f"prop={d['propulsion']} prot={d['protection']} ant={d['antenna']}/{d['band']} comp={d['computer']} att={d['attitude']} "
                      f"th={d['thermal']} sto={d['storage']} inst={d['instruments']} stations={d['stations']}")
                print(f"      mass {r['mass']}/{r['cap']:.0f} power {r['draw']}/{r['gen']} data {r['data']}->{r['downlink']} cov {r['cov']} life {r['life']} faults {r['faults']}")
