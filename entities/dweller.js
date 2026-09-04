import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  randomElement,
  weightedPick,
  chance,
  log,
} from "../core/utils.js";
import { travel as travelBehaviour } from "../core/behaviours/travel.js";

class Need {
  constructor(type) {
    this.type = type;
    this.activity = "resting";
  }

  tick(dweller, t) {}

  urgency(dweller) {
    return 0;
  }

  weight(dweller) {
    return this.urgency(dweller);
  }

  behaviour(dweller) {
    return null;
  }
}

class SurvivalNeed extends Need {
  constructor(resource, amount, frequency) {
    super("survival");
    this.resource = resource;
    this.amount = amount;
    this.frequency = frequency;
    this.lastConsumption = randomIntBetween(0, frequency);
    this.shortageAnnounced = false;
    this.urgencyFrac = 0;
  }

  tick(dweller, t) {
    if (!dweller.place) return;
    this.lastConsumption++;
    if (this.lastConsumption <= this.frequency) return;

    const name = this.resource.name;
    const available = dweller.place.resources.find(
      (r) => r.name === name && r.amount > 0
    );

    if (available) {
      dweller.place.consumeResource(available, this.amount);
      this.lastConsumption = 0;
      this.activity = "eating";
      this.urgencyFrac = 0;
      this.shortageAnnounced = false;
    } else {
      dweller.health -= settings.unmetNeedDamage;
      this.lastConsumption = 0;
      this.activity = "hungry";
      this.urgencyFrac = Math.min(
        3,
        this.urgencyFrac + settings.survivalUrgencyRamp
      );
      if (!this.shortageAnnounced) {
        log(`${dweller.place.name} needs ${name} but there is not enough`);
        this.shortageAnnounced = true;
      }
    }
  }

  urgency(dweller) {
    return this.urgencyFrac;
  }

  weight(dweller) {
    return this.urgencyFrac * settings.survivalWeight;
  }

  behaviour(dweller) {
    if (!dweller.place || !this.shortageAnnounced) return null;
    const name = this.resource.name;
    if (!dweller.suppliers.has(name)) return null;
    const suppliers = dweller.suppliers.get(name);
    for (const route of dweller.place.routes) {
      if (suppliers.has(route.destination) && route.destination !== dweller.place) {
        return { behaviour: "travel", route, reason: `seeking ${name}` };
      }
    }
    let bestRoute = null;
    let bestDist = Infinity;
    for (const route of dweller.place.routes) {
      for (const supplier of suppliers) {
        if (supplier === dweller.place) continue;
        const dist = Math.hypot(
          route.destination.x - supplier.x,
          route.destination.y - supplier.y
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestRoute = route;
        }
      }
    }
    if (bestRoute) {
      return { behaviour: "travel", route: bestRoute, reason: `seeking ${name}` };
    }
    return null;
  }
}

class ExplorationNeed extends Need {
  constructor(frequency) {
    super("exploration");
    this.frequency = frequency;
    this.lastExplored = 0;
  }

  tick(dweller, t) {
    this.lastExplored++;
  }

  urgency(dweller) {
    return Math.min(1, this.lastExplored / this.frequency);
  }

  behaviour(dweller) {
    if (this.urgency(dweller) < settings.behaviourThreshold) return null;
    if (!dweller.place || dweller.place.routes.length === 0) return null;
    const unvisited = dweller.place.routes.filter(
      (route) => !dweller.visitedPlaceNames.has(route.destination.name)
    );
    const route = unvisited.length > 0 ? randomElement(unvisited) : randomElement(dweller.place.routes);
    return { behaviour: "travel", route, reason: "out of curiosity", need: this };
  }
}

class GatherNeed extends Need {
  constructor(frequency) {
    super("gather");
    this.frequency = frequency;
    this.lastGather = 0;
  }

  tick(dweller, t) {
    this.lastGather++;
  }

  urgency(dweller) {
    return Math.min(1, this.lastGather / this.frequency);
  }

  weight(dweller) {
    return this.urgency(dweller) * settings.gatherWeight;
  }

  behaviour(dweller) {
    if (this.urgency(dweller) < settings.behaviourThreshold) return null;
    if (!dweller.place || dweller.place.routes.length === 0) return null;
    const localNames = new Set(dweller.place.resources.map((r) => r.name));
    const candidates = [];
    for (const route of dweller.place.routes) {
      if (route.destination === dweller.place) continue;
      const missing = route.destination.resources.find(
        (r) =>
          !localNames.has(r.name) &&
          dweller.knows(r.name) &&
          dweller.suppliers.get(r.name)?.has(route.destination)
      );
      if (missing) candidates.push({ route, resource: missing });
    }
    if (candidates.length === 0) return null;
    const pick = randomElement(candidates);
    return {
      behaviour: "travel",
      route: pick.route,
      reason: `to gather ${pick.resource.name}`,
      need: this,
    };
  }
}

export class Dweller {
  constructor(name, origin, place, tick = 0) {
    this.name = name;
    this.origin = origin;
    this.place = place;
    this.alive = true;
    this.age = randomIntBetween(settings.initialAgeMin, settings.initialAgeMax);
    this.health = randomIntBetween(settings.initialHealthMin, settings.initialHealthMax);
    this.maxAge = randomIntBetween(settings.maxAgeMin, settings.maxAgeMax);
    this.nextYear = tick + this.nextBirthday();
    this.needs = [];
    this.route = null;
    this.travelProgress = 0;
    this.totalTravelTime = 0;
    this.elapsedTravelTime = 0;
    this.knowledge = new Set();
    this.suppliers = new Map();
    this.visitedPlaceNames = new Set();
    if (place) this.learnPlace(place);
    this.generateNeeds();
  }

  nextBirthday() {
    return randomIntBetween(0, settings.ticksPerYear);
  }

  learnPlace(place) {
    this.visitedPlaceNames.add(place.name);
    for (const resource of place.resources) {
      this.knowledge.add(resource.name);
      if (!this.suppliers.has(resource.name)) {
        this.suppliers.set(resource.name, new Set());
      }
      this.suppliers.get(resource.name).add(place);
    }
  }

  knows(name) {
    return this.knowledge.has(name);
  }

  shareKnowledgeWith(other) {
    for (const name of this.knowledge) other.knowledge.add(name);
    for (const [name, places] of this.suppliers) {
      let target = other.suppliers.get(name);
      if (!target) {
        target = new Set();
        other.suppliers.set(name, target);
      }
      for (const place of places) target.add(place);
    }
  }

  localEdibleResources() {
    if (!this.place) return [];
    return this.place.resources.filter((r) => r.type === "organic");
  }

  knownLocalEdibleResources() {
    return this.localEdibleResources().filter((r) => this.knows(r.name));
  }

  generateNeeds() {
    if (!this.place) return;
    let available = [...this.knownLocalEdibleResources()];
    const count = randomIntBetween(settings.needsPerDwellerMin, settings.needsPerDwellerMax);
    for (let i = 0; i < count; i++) {
      const selected = randomElement(available);
      if (!selected) break;
      available = available.filter(
        (r) => r !== selected
      );
      this.needs.push(
        new SurvivalNeed(
          selected,
          randomIntBetween(settings.needAmountMin, settings.needAmountMax),
          randomIntBetween(settings.needFrequencyMin, settings.needFrequencyMax)
        )
      );
    }

    this.needs.push(
      new ExplorationNeed(
        randomIntBetween(
          settings.explorationFrequencyMin,
          settings.explorationFrequencyMax
        )
      )
    );

    this.needs.push(
      new GatherNeed(
        randomIntBetween(
          settings.gatherFrequencyMin,
          settings.gatherFrequencyMax
        )
      )
    );
  }

  ageOneYear(t) {
    while (t >= this.nextYear) {
      this.age++;
      this.nextYear += settings.ticksPerYear;
    }
  }

  die(cause) {
    if (!this.alive) return;
    this.alive = false;
    const location = this.place ? this.place.name : "traveling";
    log(`☠ ${this.name} (${this.age} years, ${location}) died of ${cause}`);

    if (this.place) {
      this.place.habitants = this.place.habitants.filter((h) => h !== this);
    }
    if (this.route) {
      this.route.removeTraveler(this);
      this.route = null;
    }
  }

  onArrival(destination) {
    this.learnPlace(destination);
    this.needs = [];
    this.generateNeeds();
  }

  update(t) {
    if (!this.alive) return;

    this.ageOneYear(t);

    if (this.age >= this.maxAge) {
      this.die("old age");
      return;
    }

    this.needs.forEach((need) => need.tick(this, t));

    if (this.health <= 0) {
      this.die("malnutrition");
      return;
    }

    if (this.route) {
      travelBehaviour.step(this);
    } else if (this.place) {
      if (
        this.place.habitants.length > 1 &&
        chance(settings.gossipProb)
      ) {
        const peers = this.place.habitants.filter((h) => h !== this);
        this.shareKnowledgeWith(randomElement(peers));
      }
      this.decideBehaviour();
    }
  }

  decideBehaviour() {
    const candidates = [];
    for (const need of this.needs) {
      const intent = need.behaviour(this);
      if (!intent) continue;
      const weight = need.weight(this);
      if (weight <= 0) continue;
      candidates.push([intent, weight]);
    }

    if (candidates.length === 0) return;

    const chosen = weightedPick(candidates);
    if (chosen.need) {
      if (chosen.need.type === "exploration") chosen.need.lastExplored = 0;
      else if (chosen.need.type === "gather") chosen.need.lastGather = 0;
    }
    switch (chosen.behaviour) {
      case "travel":
        travelBehaviour.perform(this, chosen);
        break;
      default:
        break;
    }
  }
}
