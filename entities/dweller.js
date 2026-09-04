import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  randomElement,
  randomSample,
  weightedPick,
  chance,
} from "../core/utils.js";
import { events } from "../core/events.js";
import { travel as travelBehaviour } from "../core/behaviours/travel.js";
import { tend as tendBehaviour } from "../core/behaviours/tend.js";

const behaviours = {
  travel: travelBehaviour,
  tend: tendBehaviour,
};

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

  reset() {}
}

class PeriodicNeed extends Need {
  constructor(type, frequency) {
    super(type);
    this.frequency = frequency;
    this.lastEvent = 0;
  }

  tick(dweller, t) {
    this.lastEvent++;
  }

  urgency(dweller) {
    return Math.min(1, this.lastEvent / this.frequency);
  }

  reset() {
    this.lastEvent = 0;
  }
}

class SurvivalNeed extends Need {
  constructor(frequency) {
    super("survival");
    this.frequency = frequency;
    this.amount = randomIntBetween(settings.needAmountMin, settings.needAmountMax);
    this.lastConsumption = randomIntBetween(0, frequency);
    this.shortageAnnounced = false;
    this.urgencyFrac = 0;
  }

  tick(dweller, t) {
    if (!dweller.place) return;
    this.lastConsumption++;
    if (this.lastConsumption <= this.frequency) return;

    if (this.hasEdibleFood(dweller)) {
      this.eatBest(dweller);
    } else {
      this.goHungry(dweller);
    }
  }

  hasEdibleFood(dweller) {
    return dweller.place.resources.some(
      (r) => r.type === "organic" && r.amount > 0 && dweller.knows(r.name)
    );
  }

  eatBest(dweller) {
    const edible = dweller.place.resources
      .filter((r) => r.type === "organic" && r.amount > 0 && dweller.knows(r.name))
      .sort((a, b) => dweller.tasteRank(a.name) - dweller.tasteRank(b.name));
    dweller.place.consumeResource(edible[0], this.amount);
    this.lastConsumption = 0;
    this.activity = "eating";
    this.urgencyFrac = 0;
    this.shortageAnnounced = false;
  }

  goHungry(dweller) {
    dweller.health -= settings.unmetNeedDamage;
    this.lastConsumption = 0;
    this.activity = "hungry";
    this.urgencyFrac = Math.min(
      3,
      this.urgencyFrac + settings.survivalUrgencyRamp
    );
    this.shortageAnnounced = true;
  }

  urgency(dweller) {
    return this.urgencyFrac;
  }

  weight(dweller) {
    return this.urgencyFrac * settings.survivalWeight;
  }

  knowFoodPlaces(dweller) {
    const foodPlaces = new Set();
    for (const places of dweller.suppliers.values()) {
      for (const place of places) {
        if (place !== dweller.place) foodPlaces.add(place);
      }
    }
    return foodPlaces;
  }

  seekReason(dweller) {
    for (const name of dweller.tastes) {
      if (dweller.suppliers.has(name)) return `seeking ${name}`;
    }
    return "seeking food";
  }

  behaviour(dweller) {
    if (!dweller.place || !this.shortageAnnounced) return null;
    if (this.hasEdibleFood(dweller)) return null;
    const foodPlaces = this.knowFoodPlaces(dweller);
    if (foodPlaces.size === 0) return null;

    const reason = this.seekReason(dweller);
    let bestRoute = null;
    let bestDistance = Infinity;
    for (const route of dweller.place.routes) {
      if (foodPlaces.has(route.destination)) {
        return { behaviour: "travel", route, reason, need: this };
      }
      for (const foodPlace of foodPlaces) {
        const dist = Math.hypot(
          route.destination.x - foodPlace.x,
          route.destination.y - foodPlace.y
        );
        if (dist < bestDistance) {
          bestDistance = dist;
          bestRoute = route;
        }
      }
    }
    if (bestRoute) {
      return { behaviour: "travel", route: bestRoute, reason, need: this };
    }
    return null;
  }
}

class ExplorationNeed extends PeriodicNeed {
  constructor(frequency) {
    super("exploration", frequency);
  }

  weight(dweller) {
    return this.urgency(dweller) * settings.explorationWeight;
  }

  behaviour(dweller) {
    if (this.urgency(dweller) < settings.explorationThreshold) return null;
    if (!dweller.place || dweller.place.routes.length === 0) return null;
    const unvisited = dweller.place.routes.filter(
      (route) => !dweller.visitedPlaceNames.has(route.destination.name)
    );
    const route =
      unvisited.length > 0
        ? randomElement(unvisited)
        : randomElement(dweller.place.routes);
    return { behaviour: "travel", route, reason: "out of curiosity", need: this };
  }
}

class GatherNeed extends PeriodicNeed {
  constructor(frequency) {
    super("gather", frequency);
  }

  weight(dweller) {
    return this.urgency(dweller) * settings.gatherWeight;
  }

  behaviour(dweller) {
    if (this.urgency(dweller) < settings.behaviourThreshold) return null;
    if (!dweller.place || dweller.place.routes.length === 0) return null;
    const target = this.findGatherTarget(dweller);
    if (!target) return null;
    return {
      behaviour: "travel",
      route: target.route,
      reason: `to gather ${target.resource.name}`,
      need: this,
    };
  }

  findGatherTarget(dweller) {
    const localNames = new Set(dweller.place.resources.map((r) => r.name));
    const candidates = [];
    for (const route of dweller.place.routes) {
      if (route.destination === dweller.place) continue;
      const resource = route.destination.resources.find(
        (r) =>
          !localNames.has(r.name) &&
          dweller.knows(r.name) &&
          dweller.suppliers.get(r.name)?.has(route.destination)
      );
      if (resource) candidates.push({ route, resource });
    }
    if (candidates.length === 0) return null;
    return randomElement(candidates);
  }
}

class TendNeed extends PeriodicNeed {
  constructor(frequency) {
    super("tend", frequency);
    this.amount = randomIntBetween(settings.tendAmountMin, settings.tendAmountMax);
  }

  weight(dweller) {
    return this.urgency(dweller) * settings.tendWeight;
  }

  behaviour(dweller) {
    if (this.urgency(dweller) < settings.behaviourThreshold) return null;
    if (!dweller.place) return null;
    const local = dweller.place.resources.filter((r) => dweller.knows(r.name));
    if (local.length === 0) return null;
    const target = [...local].sort(
      (a, b) => a.amount - b.amount || dweller.tasteRank(a.name) - dweller.tasteRank(b.name)
    )[0];
    return { behaviour: "tend", resource: target, amount: this.amount, need: this };
  }
}

class OriginNeed extends PeriodicNeed {
  constructor(frequency) {
    super("homing", frequency);
  }

  weight(dweller) {
    return this.urgency(dweller) * settings.homeWeight;
  }

  behaviour(dweller) {
    if (!dweller.place || dweller.place === dweller.origin) return null;
    if (this.urgency(dweller) < settings.homingThreshold) return null;
    const origin = dweller.origin;
    let bestRoute = null;
    let bestDistance = Infinity;
    for (const route of dweller.place.routes) {
      const dist = Math.hypot(route.destination.x - origin.x, route.destination.y - origin.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestRoute = route;
      }
    }
    if (!bestRoute) return null;
    return { behaviour: "travel", route: bestRoute, reason: "heading home", need: this };
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

    this.route = null;
    this.travelProgress = 0;
    this.elapsedTravelTime = 0;
    this.totalTravelTime = 0;
    this.settleTicksRemaining = 0;

    this.needs = [];
    this.knowledge = new Set();
    this.suppliers = new Map();
    this.visitedPlaceNames = new Set();
    this.tastes = this.buildTastes(place);
    this.isCurious = chance(settings.explorationProb);
    this.homebody = Math.random();

    if (place) this.learnPlace(place);
    this.generateNeeds();
  }

  buildTastes(place) {
    const foods = place && place.catalog ? [...place.catalog.foods] : [];
    const ranked = foods.map((f) => ({ name: f.name, score: Math.random() }));
    ranked.sort((a, b) => a.score - b.score);
    return ranked.map((r) => r.name);
  }

  tasteRank(name) {
    const idx = this.tastes.indexOf(name);
    return idx === -1 ? this.tastes.length : idx;
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

  shareKnowledgeWith(other, count) {
    const names =
      count != null
        ? randomSample([...this.knowledge], count)
        : [...this.knowledge];
    const shared = [];
    for (const name of names) {
      other.knowledge.add(name);
      let target = other.suppliers.get(name);
      if (!target) {
        target = new Set();
        other.suppliers.set(name, target);
      }
      const places = this.suppliers.get(name);
      if (places) {
        for (const place of places) target.add(place);
      }
      shared.push(name);
    }
    return shared;
  }

  chat(t) {
    if (this.place.population.length <= 1) return;
    if (!chance(settings.gossipProb)) return;
    const peers = this.place.population.filter((h) => h !== this);
    const peer = randomElement(peers);
    const shared = this.shareKnowledgeWith(
      peer,
      randomIntBetween(settings.gossipShareMin, settings.gossipShareMax)
    );
    if (shared.length > 0) {
      events.emit("gossip", {
        t,
        dweller: this.name,
        peer: peer.name,
        place: this.place.name,
        names: shared,
      });
    }
  }

  generateNeeds() {
    if (!this.place) return;
    this.needs.push(
      new SurvivalNeed(
        randomIntBetween(settings.needFrequencyMin, settings.needFrequencyMax)
      )
    );

    if (this.isCurious) {
      this.needs.push(
        new ExplorationNeed(
          randomIntBetween(
            settings.explorationFrequencyMin,
            settings.explorationFrequencyMax
          )
        )
      );
    }

    this.needs.push(
      new GatherNeed(
        randomIntBetween(
          settings.gatherFrequencyMin,
          settings.gatherFrequencyMax
        )
      )
    );

    this.needs.push(
      new TendNeed(
        randomIntBetween(
          settings.tendFrequencyMin,
          settings.tendFrequencyMax
        )
      )
    );

    this.needs.push(
      new OriginNeed(
        randomIntBetween(
          settings.homingFrequencyMin,
          settings.homingFrequencyMax
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

  die(cause, t) {
    if (!this.alive) return;
    this.alive = false;
    const location = this.place ? this.place.name : "traveling";
    events.emit("death", {
      t,
      dweller: this.name,
      age: this.age,
      cause: cause,
      place: location,
    });

    if (this.place) {
      this.place.population = this.place.population.filter((h) => h !== this);
    }
    if (this.route) {
      this.route.removeTraveler(this);
      this.route = null;
    }
  }

  onArrival(destination, t) {
    this.learnPlace(destination);
    const home = this.needs.find((n) => n.type === "homing");
    if (destination === this.origin && home) {
      home.reset();
    }
    events.emit("arrive", { t, dweller: this.name, at: destination.name });
  }

  update(t) {
    if (!this.alive) return;

    this.ageOneYear(t);

    if (this.age >= this.maxAge) {
      this.die("old age", t);
      return;
    }

    this.needs.forEach((need) => need.tick(this, t));

    if (this.settleTicksRemaining > 0) this.settleTicksRemaining--;

    if (this.health <= 0) {
      this.die("malnutrition", t);
      return;
    }

    if (this.route) {
      travelBehaviour.step(this, t);
    } else if (this.place) {
      this.chat(t);
      this.decideBehaviour(t);
    }
  }

  decideBehaviour(t) {
    const settling = this.settleTicksRemaining > 0;
    const candidates = [];
    for (const need of this.needs) {
      if (settling && need.type !== "survival") continue;
      const intent = need.behaviour(this);
      if (!intent) continue;
      const weight = need.weight(this);
      if (weight <= 0) continue;
      candidates.push([intent, weight]);
    }

    if (candidates.length === 0) return;

    const chosen = weightedPick(candidates);
    chosen.need.reset();
    behaviours[chosen.behaviour]?.perform(this, chosen, t);
  }
}