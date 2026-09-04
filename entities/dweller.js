import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  randomElement,
  weightedPick,
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
    if (!dweller.place || this.urgencyFrac < settings.behaviourThreshold) return null;
    const name = this.resource.name;
    if (!dweller.suppliers.has(name)) return null;
    const suppliers = dweller.suppliers.get(name);
    for (const route of dweller.place.routes) {
      if (suppliers.has(route.destination) && route.destination !== dweller.place) {
        return { behaviour: "travel", route, reason: `seeking ${name}` };
      }
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

  startTravel(route, reason) {
    this.route = route;
    this.activity = reason;
    this.place.habitants = this.place.habitants.filter((h) => h !== this);
    this.route.addTraveler(this);
    this.place = null;
    this.totalTravelTime = this.route.travelTime;
    this.elapsedTravelTime = 0;
    this.travelProgress = 0;
    log(
      `${this.name} left ${this.route.origin.name} to ${reason}`
    );
  }

  travel() {
    this.elapsedTravelTime++;
    this.travelProgress = this.elapsedTravelTime / this.totalTravelTime;
    if (this.elapsedTravelTime >= this.totalTravelTime) {
      this.route.removeTraveler(this);
      this.place = this.route.destination;
      this.place.habitants.push(this);
      this.learnPlace(this.place);
      this.needs = [];
      this.generateNeeds();
      log(
        `${this.name} arrived in ${this.route.destination.name}`
      );
      this.route = null;
      this.activity = "resting";
    }
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
      this.travel();
    } else if (this.place) {
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
    if (chosen.need && chosen.need.type === "exploration") {
      chosen.need.lastExplored = 0;
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
