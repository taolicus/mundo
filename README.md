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

> Note: as of this writing the flat files have not yet been moved into these dirs; this section is the target the cleanup step works toward.

## Current behavior

- A **World** is a set of **Regions** connected by **Routes**.
- Each **Region** has **Resources** that regenerate naturally over time by `genRate` (temperature does not currently affect production).
- Each **Dweller** has **Needs**, generated from resources it *knows* and that exist locally (only `organic` type is consumed). Unmet needs drain health; zero health dies of malnutrition. Dwellers also age and die.
- Dwellers **travel** along routes for two reasons: a known need with no local supply has a known supplier elsewhere, or random exploration (`exploreProb`).
- **Births** exist but currently use a surplus/age-gated mechanic that is slated to be replaced.

## Work checklist

### Module: Behavior (core rework)
- Introduce a **behavior module** with a standard, simple interface for defining new behaviors.
- Move **travel** and **production** (renamed from "work") into it. Future behaviors plug into the same interface.
- Currently no behavior module exists; travel/work logic is inline in `Dweller`.

### Module: Needs (generalize)
- Generalize `Need` from "a resource-consumption timer" into a general **behavioral driver**.
- Need types: **survival** (consume known local resource), **exploration** (see new places), **collection** (acquire things not held), **social** (meet people).
- Build the shared structure now; implement **survival + exploration**; leave collection/social as future types.

### Module: Environment (extract + simplify)
- Create a separate **environment module** owning climate (temperature) per region, extendable to weather/seasons later.
- **Region delegates** temperature to it.
- **Remove the temperature-sensitive resource multiplier** — regions produce resources purely by `genRate`.
- Currently temperature lives inline in `Region` and still multiplies production.

### Births: simple rate on Population
- Birth rate becomes a **flat attribute of the Population module** (not of Dwellers). No gender/demographics yet.
- Replace the current surplus + adult-age-gated birth mechanic with births generated from that simple rate.
- Model population dynamics properly later.

### Remove Relations
- `Relation` is currently unused and not well scoped.
- Remove it. Rebuild inside the behavior module only when social behavior actually needs it.

### Knowledge / indirect discovery (open thread)
- Knowledge system stays as-is for now but needs more work.
- Open problem: knowledge currently *inhibits* travel (you only need what you already have locally). Indirect knowledge — learning of resources/places from other traveled dwellers — is what should genuinely *drive* travel and discovery.
- Design a natural channel for knowledge to spread between dwellers.

### UI (lower priority)
- A **UI module** would separate rendering of controls/stats/panel from game logic. Not urgent.
- Change **play/pause** from two buttons to a **single toggle button**.

## Repository / sharing notes

This README is the reference context for a fresh LLM session. On starting work, read it plus the module files, then run a syntax check and a quick `World`-construction smoke test (see prior session practice: `node --check <file>` for each module, plus instantiating `World` with node to confirm the module graph resolves).

## Historical roadmap (older phases, kept for reference)

Features previously explored and since simplified away: a temperature-sensitive resource multiplier, dweller work/production/skill, and emergent crafting ("discoveries") — all removed in favor of the simpler natural-generation model described above.
