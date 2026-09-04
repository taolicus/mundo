# Mundo

A sandbox for exploring **emergent narrative**. A minimal simulation of places, resources, dwellers, needs and behavior, designed to observe how simple rules produce stories — not to model reality with precision.

We deliberately keep systems small and honest. Features only earn their complexity once they demonstrably contribute to emergent behavior.

## Intent & design principles

- **Emergent narrative** is the goal: watch simple rules generate interesting, readable stories.
- **Simplify first, integrate later.** Avoid speculative machinery; build the minimal thing that works and extend only when it earns its place.
- **Needs drive behavior.** A need is any motivation to act (survive, explore, collect, meet people) — not just eating. Behaviors satisfy needs.
- **Natural generation for now.** Resources currently generate naturally by their generation rate; dweller-driven production was removed and will be revisited as a behavior.
- **Keep modules acyclic and single-purpose.** `world → region → dweller` stays as the core dependency spine.

## Target architecture — layers

The project is organized into three top-level directories by *concern* (layers, not feature-per-directory — intentional, since simulation is cross-cutting):

```
core/            — pure simulation + shared infra. NO DOM. Node-testable.
  settings.js    — centralized config
  utils.js       — pure helpers (randomness, names, distance, weighted pick)
  resources.js   — shared resource catalog (makeCatalog, drawCatalogSubset)
  environment.js — Climate: owns per-region temperature (cosmetic readout)
  behaviours/    — behaviour implementations, uniform perform(dweller, ctx) interface
    travel.js    — travel behaviour (start/step + settle rest on arrival)
entities/        — the nouns
  world.js       — World entity: holds regions/dwellers/travelers and its own tick;
                   calls each entity's update(tick). Has NO loop of its own.
  region.js      — Region, Resource, Route (delegates climate to core/environment)
  dweller.js     — Dweller, Need hierarchy (survival/exploration/gather)
  population.js  — helpers to create/populate dwellers
ui/              — browser concerns (canvas/DOM). The only layer touching browser APIs.
  index.html     — (repo root) canvas + top bar + inspection panel
  styles.css
  app.js         — browser adapter: owns RAF + fixed-timestep accumulator, canvas,
                   DOM/input/stats, hit-testing. Decides how many ticks per frame;
                   calls world.update() and renders on demand.
  render.js      — canvas drawing
  panel.js       — inspection panel
```

### Locked-in boundary decisions

- **Time is owned by `World`.** `World` self-contains its `tick` counter and increments it each `update()` call. Pacing — how many sim ticks run per real second — lives in the UI adapter (`ui/app.js` fixed-timestep accumulator at `settings.fps`). There is deliberately no separate engine module: the sim is driven by any caller that repeatedly calls `world.update()` (the browser adapter via RAF, or a headless node script). If pacing needs grow (deterministic batch runs, multiple sims, a headless CLI), extract `core/engine.js` to own tick+pacing and have `world.update(tick)` accept the passed tick.
- **UI owns RAF (mechanism); core stays pure JS.** The `ui` layer is the *only* place that calls browser APIs (RAF, canvas, DOM). Core/test code advances the sim by calling `world.update()` directly and reading state — no RAF, fully Node-testable.
- **Import graph is one-way:** `ui → core → entities`, never the reverse.
- **`habitants` → `population` rename applied.**

> `ui/index.html` lives at the repo root as `index.html` (referencing `./ui/app.js` + `./ui/styles.css`) because Acode's server does not serve files outside the opened directory.

## Current behavior

- A **World** is a set of **Regions** connected by **Routes**.
- Each **Region** has **Resources** that regenerate naturally over time by `genRate` (temperature does not currently affect production).
- Each **Dweller** has typed **Needs** (behavioral drivers). **survival** needs target resources it *knows* and that exist locally (only `organic` type is consumed); unmet survival needs drain health, and zero health dies of malnutrition. Each dweller also has an **exploration** need that drives periodic travel to unvisited places. Dwellers age and die.
- Dwellers **travel** along routes as a *behaviour* driven by needs: a **survival** need (travels to seek a resource it knows exists elsewhere) or the **exploration** need (travels out of curiosity, preferring unvisited places). Each travel carries a **reason** shown in the log (`Sah left Kal to seeking Nwo` / `...to out of curiosity`), providing a minimal narrative read.
- **Births** use a flat rate (`settings.birthRate` chance per region per tick), capped per region by `settings.maxDwellersPerPlace`.
- **Structured events** (`core/events.js`): `World`/`Region`/`Dweller`/behaviours emit typed records (`birth`, `death`, `travel`, `arrive`, `gossip`, `tend`) into a shared `EventLog` (bounded, `events.recent`/`recentFor`/`count`). `events.debug` is `false` by default; the UI turns it on with `?debug` in the URL or `window.__DEBUG__`, which logs each event to the console. Events are the inspection surface for emergent behavior — narrative stays in the observer's head.
- **Partial-knowledge gossip:** `chat` shares a random subset (`gossipShareMin/Max`) of knowledge with one random co-dweller, so awareness spreads organically and *variably* — how much you know depends on who you happened to talk to.
- **Personality traits:** `homebody` (0..1, rolled once) makes a dweller rest *longer* at its origin (`1 + homebody`) and *shorter* away from it (`1 − 0.5·homebody`) when settling after travel. `tastes`, `isCurious`, and `homebody` together give dwellers individual behaviour, not just identical rules.
- **Homing drive:** the `OriginNeed` periodically fires *only while away from the origin*, routing the dweller home; arriving there resets the need. Wanderers drift back.
- **Tending behaviour:** the `TendNeed` periodically boosts the most-depleted local resource it knows (`produceResource`), a light dweller-driven production in the old "*stay in the world*" natural model's place.

## Work checklist

### Module: Behavior (core rework)
- ✅ **Increment 1 (thin slice) done.** A behavior module exists: `core/behaviours/travel.js` exposes a uniform `perform(dweller, ctx)` interface. A need states what behaviour it wants via `Need.behaviour(dweller)` → `{ behaviour, route, reason }`; `Dweller.decideBehaviour` gathers intents and dispatches to the behaviour registry.
- ✅ **Weighted urgency competition done.** Each need reports an `urgency(dweller)`; `decideBehaviour` weighted-picks among all pressing needs' intents. Survival ramps its urgency while a shortage persists and multiplies it by `survivalWeight:3` — heavily weighted but *competitive* (validated: urgency 1.0 → survival wins ~75%, urgency 0.5 → ~60%, urgency 2.0 → ~85%; below `behaviourThreshold` no trip). An intent that loses competition is *not* reset, so it stays pending.
- ✅ **Travel-reason rebalance + pacing done (leisure rare, movement visible).** `ExplorationNeed` gates its intent at a high `explorationThreshold` (0.97, only fires near full maturity) and is a **stable per-dweller trait** (`isCurious` rolled once at construction, `chance(explorationProb:0.35)`) — not re-rolled per travel. `onArrival` no longer wipes needs (needs are place-agnostic now that hunger is substitutable), so wanderlust and hunger accumulate across travel instead of resetting. To keep movement visible without perpetual motion, dwellers get a **settle rest on arrival** (`settlePeriodMin/Max`), travel is faster (`travelSpeedDivisor: 3`), and gather fires every 360-900 ticks. Sampled over 40k ticks: **0 deaths**, population grows, **curiosity ~2.8%** of trips, resources ~97% — travel is mostly for resources with leisure as a rare occasion, and most dwellers visibly rest/settle between trips.
- **Design rule:** a need *triggers* a behaviour; travelling is just one type of behaviour (eating, gathering, social later).
- ✅ **Traversal mechanics refactor done.** `start`/`step` (depart, advance progress, arrive) moved out of `Dweller` into `core/behaviours/travel.js`; `travel.perform` delegates to `start`. `Dweller` keeps only travel *state* (`route`/`travelProgress`/`elapsedTravelTime`/`totalTravelTime`) plus an `onArrival(destination)` lifecycle hook (learn place + regenerate needs).
- **Next (planned):**
  - **More behaviours** — add production later, plugging into the same interface.

### Gather behaviour — ✅ done
- A `GatherNeed` (type `gather`) drives travel to a **known place** (visited) that carries a resource *name* absent from the current place; reason `to gather <name>`.
- Distinct from exploration (curiosity, unvisited) and survival (consume-when-short). Urgency ramps like exploration; weight `gatherWeight:1.5` lands between idle curiosity (1.0) and severe survival (up to ~9) in the weighted competition.
- (Sampling is superseded by the current short-smoke metrics in `test/`; see below.)

### Module: Needs (generalize)
- ✅ **Partially done.** `Need` is now a typed **behavioral driver** hierarchy: `SurvivalNeed` (consume known local resource on a shortage timer) and `ExplorationNeed` (periodic drive to visit unvisited places) are implemented and each owns its `tick` + `behaviour(intent)` logic. `collection`/`social` reserved (not built).
- Exploration replaced the passive `exploreProb` dice roll; dwellers track `visitedPlaceNames` and prefer unvisited route destinations.
- `Dweller.decideBehaviour` gathers each need's urgency-weighted intent and dispatches by behaviour id — the seam future need/behaviour types plug into.

### Module: Environment (extract + simplify) — ✅ done
- A separate **environment module** exists: `core/environment.js` (`Climate`) owns temperature per region; `Region` delegates (`region.climate.update(t)`), exposing temperature via a getter for UI coloring/display only.
- **The temperature-sensitive resource multiplier is removed** — regions produce resources purely by `genRate`. Temperature is now a cosmetic readout (region color + panel), decoupled from simulation outcomes.
- Cleaned up associated dead settings (`resourcesPerPlaceMin/Max`, `temperatureSensitivity`, `optimalTemp`, `temperatureSensitivityProb`, `sensitivityByType`). `Climate` was re-anchored to the **world boundaries**: instead of a fixed `equatorY` pixel, `World.generatePlaces` derives `equatorY = height × equatorFrac` (0.6) and `yCooling = tempBaseMax / (equatorY − drawSize)`, so base temperature spans 0 °C at the top edge → `tempBaseMax` at the equator no matter the canvas size or device-pixel ratio (previously a tall phone canvas froze solid below y≈500 and a desktop went uniformly mild). `Region`/`Climate` accept the profile via constructor env; standalone `Climate({ y })` falls back to the old `settings.equatorY`/`yCooling`.
- Extendable to weather/seasons later by growing `Climate`. A `seasonAt(t)` helper (`core/environment.js`) buckets the 360-day year into equal 90-day seasons — **spring 1–90, summer 91–180, autumn 181–270, winter 271–360** — and the annual temperature sine is phase-shifted (`-daysPerYear/8`) so its peak (+amplitude) lands at mid-summer (day 135) and its trough at mid-winter (day 315). The UI surfaces the season as a **SEASON** readout (color-coded) in the top bar, alongside **YEAR · DAY** (tick / `hoursPerDay`), and as a faint seasonal tint behind the world canvas. (`world.tick` is in world-hours: 1 tick = 1 hour, 24 ticks/day, 360 days/year.)

### Births: simple rate on Population
- ✅ **Done.** Births come from a flat attribute (`settings.birthRate`, chance per region per tick), capped by `settings.maxDwellersPerPlace`. No gender/demographics; the old surplus + adult-age-gated mechanic was removed. Model population dynamics properly later.

### Remove Relations
- ✅ **Done.** The unused `Relation` machinery was removed (class, `addRelation`, `generateRelations`, settings, and panel display). Rebuild inside the behavior module only when social behavior actually needs it.

### Naming: `habitants` → `population` — ✅ done
- Locked-in decision applied: the `habitants` array property is now `population` across all modules (`Region.population`, panel/app reads, travel arrival/departure). `data-hab`/`hab-link` DOM identifiers were left unchanged (they are presentation-only).

### Knowledge / indirect discovery (open thread)
- ✅ **Knowledge spread channel added.** Dwellers gossip (`Dweller.shareKnowledgeWith`, chance `gossipProb:0.05` per co-located tick): a dweller at a place occasionally shares its `knowledge` (resource names) and `suppliers` map with a random co-dweller. This decouples "...you need what you already have locally" — awareness now propagates across the network without requiring personal visits. Verified: avg ~30 supplier entries per dweller on an 8-place map.
- `visitedPlaceNames` remains purely physical (not spread), so exploration's "unvisited" selection is unaffected.

### Shared resources + substitutable foods + preferences — ✅ done
- **Shared resource catalog** (`core/resources.js`, per World): ~6-9 foods + 3-5 minerals with shared names; each place draws a subset (`drawCatalogSubset` in `Region`), so the same food exists in multiple places. Verified: 27 of 28 place-pairs share ≥1 food, so a shortage in one place can be relieved from a neighbor.
- **Substitutable foods:** `SurvivalNeed` is now generic hunger — eats *any* local known organic resource; goes hungry only if none is available; then seeks the nearest known place with food (multi-hop: head toward the neighbor closest to a food place), reason `seeking <preferred food>` / `seeking food`.
- **Food preferences:** each dweller has `tastes` — a stable randomized ranking of catalog foods (index 0 = favourite). Used for (a) consumption choice (eats its highest-ranked available food) and (b) the seeking reason. Dweller panel shows a `likes` row.
- **Result:** all three travel reasons now fire together — `out of curiosity`, `to gather <name>`, and `seeking <food>` — with healthier survival (population grows).

### UI
- ✅ **Layer separation done.** `ui/` is the browser adapter (canvas/DOM/controls/panel); `core/` has no DOM. Rendering is `render.js`; controls/stats/panel in `ui/`.
- ✅ **Done:** single toggle Play/Pause (`#toggle`).
- ✅ **Done:** menu button (☰) with **Regions** list and **Dwellers** list (incl. travellers); clicking an item opens the same info as the corresponding canvas click; dweller details show current action/reason; place field shows `origin → destination` while travelling.
- ✅ **Reverted:** per-traveler canvas action labels (too cluttered) — reasons shown on the dweller panel instead.
- ✅ **Inspection surfaces (phase 3):** clicking a **traveller dot** (or a dweller in any list) opens a deep dweller inspect and a gold dashed ring follows that dweller across travel. The dweller panel is live (re-rendered every tick): age/health, `temperament` (curious/settled), `homebody`, origin, place or `origin → destination`, state (`resting Nt` countdown, `X% of Nt`, idle), activity, **5 needs with urgency bars** (hunger shows raw urgency), and knowledge (`resource names`, `supplier links`, `places visited`, top `likes`). **Region economy** shows resource bars with `rate` + `next Nt` production wait, routes with live `traffic` counts, and resident links. Menu adds **In transit**, listing travellers with `origin → destination` and progress.

## Tests

- Node's built-in test runner, no dependencies: run **`node --test`** from the repo root.
- `test/utils.test.js` — randomness/distance/name helpers incl. `randomSample` bounds.
- `test/environment.test.js` — `Climate` (temp range, cosmetic-only).
- `test/dweller.test.js` — need hierarchy, weighted competition, survival seeking (fix: gated on no local edible food), gather targeting, gossip subsetting, **tend** (most-depleted known local resource, no overflow), **homing** (routes toward origin, dormant at origin, resets on origin arrival), settle/`homebody` stability, death/age.
- `test/travel.test.js` — departure/arrival, mid-route, multi-hop selection, **homebody settle scaling**.
- `test/world.test.js` — world invariants over a 4k-tick horizon: travellers/residents buckets disjoint, all alive, never-empty world, gather fires, `endShare >= 0.5` at origin.
- Expectations: green, deterministic-ish (randomness seeded per test run by the runner), typically run 3× for confidence.

## Repository / sharing notes

This README is the reference context for a fresh LLM session. On starting work, read it plus the module files, then run a syntax check and a quick `World`-construction smoke test (see prior session practice: `node --check <file>` for each module, plus instantiating `World` with node to confirm the module graph resolves).

## Historical roadmap (older phases, kept for reference)

Features previously explored and since simplified away: a temperature-sensitive resource multiplier, dweller work/production/skill, and emergent crafting ("discoveries") — all removed in favor of the simpler natural-generation model described above.
