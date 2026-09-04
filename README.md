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

The project is reorganizing into three top-level directories by *concern* (layers, not feature-per-directory — intentional, since simulation is cross-cutting):

```
core/            — pure simulation + shared infra. NO DOM. Node-testable.
  settings.js    — centralized config
  utils.js       — pure helpers (randomness, names, distance, weighted pick)
  events.js      — pub/sub event bus (thin)
  logging.js     — consumes events, behind a feature flag
  engine.js      — THE engine. Owns time/tick. Drives world.update(tick).
                   Pure JS; orchestrates the UI as a component, does not call RAF.
entities/        — the nouns; owned/managed by core engine
  world.js       — World entity: holds regions/dwellers/travelers; calls each entity's
                   update(tick). Has NO loop of its own.
  region.js      — Region, Resource, Route
  dweller.js     — Dweller, Need
  population.js  — Population (aggregate/statistics)
ui/              — browser concerns (canvas/DOM). The only layer touching browser APIs.
  index.html     — shell: canvas + top bar (day, population) + inspection panel
  styles.css
  app.js         — browser adapter: owns RAF, canvas, DOM/input/stats.
                   Calls engine.advance() each frame and renders on demand.
  render.js      — canvas drawing
  panel.js       — inspection panel
```

### Locked-in boundary decisions

- **Engine owns time.** `core/engine.js` holds the `tick` counter and decides pacing (fixed timestep); it passes `tick` into `world.update(tick)`. World is a passive state holder that calls its entities' update methods — it has no loop.
- **Engine owns UI (orchestration); UI owns RAF (mechanism).** Core engine is pure JS and drives the UI as a component (decides when/what to show + pace). The `ui` layer is the browser adapter and is the *only* place that calls browser APIs (RAF, canvas, DOM). The UI's RAF loop calls `engine.advance()`, and core decides how many sim ticks to run. This keeps core testable and UI a thin adapter.
- **Import graph is one-way:** `ui → core → entities`, never the reverse.
- **`habitants` array property** will be renamed to `population` as part of the terminology transition.

> The files have been moved into these directories; the target architecture above is now the live layout. `ui/index.html` was moved to the repo root as `index.html` (referencing `./ui/app.js` + `./ui/styles.css`) because Acode's server does not serve files outside the opened directory.

## Current behavior

- A **World** is a set of **Regions** connected by **Routes**.
- Each **Region** has **Resources** that regenerate naturally over time by `genRate` (temperature does not currently affect production).
- Each **Dweller** has typed **Needs** (behavioral drivers). **survival** needs target resources it *knows* and that exist locally (only `organic` type is consumed); unmet survival needs drain health, and zero health dies of malnutrition. Each dweller also has an **exploration** need that drives periodic travel to unvisited places. Dwellers age and die.
- Dwellers **travel** along routes as a *behaviour* driven by needs: a **survival** need (travels to seek a resource it knows exists elsewhere) or the **exploration** need (travels out of curiosity, preferring unvisited places). Each travel carries a **reason** shown in the log (`Sah left Kal to seeking Nwo` / `...to out of curiosity`), providing a minimal narrative read.
- **Births** use a flat rate (`settings.birthRate` chance per region per tick), capped per region by `settings.maxDwellersPerPlace`.

## Work checklist

### Module: Behavior (core rework)
- ✅ **Increment 1 (thin slice) done.** A behavior module exists: `core/behaviours/travel.js` exposes a uniform `perform(dweller, ctx)` interface. A need states what behaviour it wants via `Need.behaviour(dweller)` → `{ behaviour, route, reason }`; `Dweller.decideBehaviour` gathers intents and dispatches to the behaviour registry.
- ✅ **Weighted urgency competition done.** Each need reports an `urgency(dweller)`; `decideBehaviour` weighted-picks among all pressing needs' intents. Survival ramps its urgency while a shortage persists and multiplies it by `survivalWeight:3` — heavily weighted but *competitive* (validated: urgency 1.0 → survival wins ~75%, urgency 0.5 → ~60%, urgency 2.0 → ~85%; below `behaviourThreshold` no trip). An intent that loses competition is *not* reset, so it stays pending.
- **Design rule:** a need *triggers* a behaviour; travelling is just one type of behaviour (eating, gathering, social later).
- ✅ **Traversal mechanics refactor done.** `start`/`step` (depart, advance progress, arrive) moved out of `Dweller` into `core/behaviours/travel.js`; `travel.perform` delegates to `start`. `Dweller` keeps only travel *state* (`route`/`travelProgress`/`elapsedTravelTime`/`totalTravelTime`) plus an `onArrival(destination)` lifecycle hook (learn place + regenerate needs).
- **Next (planned):**
  - **More behaviours** — add production/gathering later, plugging into the same interface.

### Module: Needs (generalize)
- ✅ **Partially done.** `Need` is now a typed **behavioral driver** hierarchy: `SurvivalNeed` (consume known local resource on a shortage timer) and `ExplorationNeed` (periodic drive to visit unvisited places) are implemented and each owns its `tick` + `behaviour(intent)` logic. `collection`/`social` reserved (not built).
- Exploration replaced the passive `exploreProb` dice roll; dwellers track `visitedPlaceNames` and prefer unvisited route destinations.
- `Dweller.decideBehaviour` gathers each need's urgency-weighted intent and dispatches by behaviour id — the seam future need/behaviour types plug into.

### Module: Environment (extract + simplify) — **not started**
- Create a separate **environment module** owning climate (temperature) per region, extendable to weather/seasons later.
- **Region delegates** temperature to it.
- **Remove the temperature-sensitive resource multiplier** — regions produce resources purely by `genRate`.
- Currently temperature lives inline in `Region` and still multiplies production (`region.js:calcTemperature`/`temperatureFactor`/`update`).

### Births: simple rate on Population
- ✅ **Done.** Births come from a flat attribute (`settings.birthRate`, chance per region per tick), capped by `settings.maxDwellersPerPlace`. No gender/demographics; the old surplus + adult-age-gated mechanic was removed. Model population dynamics properly later.

### Remove Relations
- ✅ **Done.** The unused `Relation` machinery was removed (class, `addRelation`, `generateRelations`, settings, and panel display). Rebuild inside the behavior module only when social behavior actually needs it.

### Naming: `habitants` → `population` — **pending**
- Locked-in decision: rename the `habitants` array property to `population` (terminology transition). Referenced in `core/utils.js`, `entities/world.js`, `entities/region.js`, `entities/dweller.js`, `entities/population.js`, `ui/app.js`, `ui/panel.js`. Mechanical, low-risk.
- (Note: there is also a future *Population module* — an aggregate/statistics owner — separate from this rename.)

### Knowledge / indirect discovery (open thread)
- Knowledge system stays as-is for now but needs more work.
- Open problem: knowledge currently *inhibits* travel (you only need what you already have locally). Indirect knowledge — learning of resources/places from other traveled dwellers — is what should genuinely *drive* travel and discovery.
- Design a natural channel for knowledge to spread between dwellers.

### UI
- ✅ **Layer separation done.** `ui/` is the browser adapter (canvas/DOM/controls/panel); `core/` has no DOM. Rendering is `render.js`; controls/stats/panel in `ui/`.
- ✅ **Done:** single toggle Play/Pause (`#toggle`).
- ✅ **Done:** menu button (☰) with **Regions** list and **Dwellers** list (incl. travellers); clicking an item opens the same info as the corresponding canvas click; dweller details show current action/reason; place field shows `origin → destination` while travelling.
- ✅ **Reverted:** per-traveler canvas action labels (too cluttered) — reasons shown on the dweller panel instead.

## Repository / sharing notes

This README is the reference context for a fresh LLM session. On starting work, read it plus the module files, then run a syntax check and a quick `World`-construction smoke test (see prior session practice: `node --check <file>` for each module, plus instantiating `World` with node to confirm the module graph resolves).

## Historical roadmap (older phases, kept for reference)

Features previously explored and since simplified away: a temperature-sensitive resource multiplier, dweller work/production/skill, and emergent crafting ("discoveries") — all removed in favor of the simpler natural-generation model described above.
