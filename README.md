# Mundo

A sandbox for exploring **emergent narrative**. A minimal simulation of places, resources, dwellers, needs and behavior, designed to observe how simple rules produce stories — not to model reality with precision.

We deliberately keep systems small and honest. Features only earn their complexity once they demonstrably contribute to emergent behavior.

## Intent & design principles

- **Emergent narrative** is the goal: watch simple rules generate interesting, readable stories.
- **Simplify first, integrate later.** Avoid speculative machinery; build the minimal thing that works and extend only when it earns its place.
- **Needs drive behavior.** A need is any motivation to act (survive, explore, collect, meet people) — not just eating. Behaviors satisfy needs.
- **Natural generation for now.** Resources currently generate naturally by their generation rate; dweller-driven production was removed and will be revisited as a behavior.
- **Keep modules acyclic and single-purpose.** `world → region → dweller` stays as the core dependency spine.

## Current architecture

```
index.html     — HTML shell: canvas + top bar (day, population) + inspection panel
engine.js      — game loop (fixed timestep @ 30fps), play/pause/tick, click-to-inspect, stats
world.js       — World: places, routes, the global tick, travel-in-transit query
region.js      — Region, Resource, Route (resources, production, temperature, births)
dweller.js     — Dweller, Need, Relation (age, health, needs, knowledge, travel)
population.js  — Population: initial population of places + newDweller factory
render.js      — canvas rendering (place color by temperature, routes, travelers)
panel.js       — inspection view (place / dweller), back-navigation, live updates
utils.js       — pure helpers (randomness, names, distance, weighted pick)
settings.js    — centralized simulation parameters
```

Note: several file names now lag the intended module vision (see checklist). The internal terminology is also in transition — `habitants` (array property) will become `population`, etc.

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
