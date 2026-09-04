import { settings } from "./settings.js";
import {
  randomIntBetween,
  randomElement,
  chance,
  log,
} from "./utils.js";

const RELATION_TYPES = ["family", "friendship", "colleague", "acquaintance"];

class Need {
  constructor(resource, amount, frequency = 0) {
    this.resource = resource;
    this.amount = amount;
    this.lastConsumption = 0;
    this.frequency = frequency;
    this.shortageAnnounced = false;
  }
}

class Relation {
  constructor(type, with_, intensity) {
    this.type = type;
    this.with_ = with_;
    this.intensity = intensity;
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
    this.relations = [];
    this.route = null;
    this.travelProgress = 0;
    this.totalTravelTime = 0;
    this.elapsedTravelTime = 0;
    this.job = null;
    this.knowledge = new Set();
    this.suppliers = new Map();
    this.skill = randomIntBetween(settings.skillMin, settings.skillMax) / settings.skillDivisor;
    if (place) this.learnPlace(place);
    this.generateBasicNeeds();
  }

  nextBirthday() {
    return randomIntBetween(0, settings.ticksPerYear);
  }

  learnPlace(place) {
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

  addRelation(dweller, type, intensity) {
    const relation = new Relation(type, dweller, intensity);
    this.relations.push(relation);
  }

  generateRelations() {
    if (!this.place) return;
    const others = this.place.habitants.filter((h) => h !== this);
    const maxRelations = Math.ceil(others.length * settings.maxRelationsRatio);
    const count = randomIntBetween(0, maxRelations);

    const related = [];
    while (
      related.length < count &&
      others.length > 0
    ) {
      const pick = randomElement(others);

      if (!this.relations.some((r) => r.with_ === pick)) {
        related.push(pick);
        others.splice(others.indexOf(pick), 1);
      }
    }

    for (const other of related) {
      const relType = randomElement(RELATION_TYPES);
      const intensity = randomIntBetween(settings.relationIntensityMin, settings.relationIntensityMax);

      this.addRelation(other, relType, intensity);
      other.addRelation(this, relType, intensity);
    }
  }

  localEdibleResources() {
    if (!this.place) return [];
    return this.place.resources.filter((r) => r.type === "organic");
  }

  knownLocalEdibleResources() {
    return this.localEdibleResources().filter((r) => this.knows(r.name));
  }

  generateBasicNeeds() {
    if (!this.place) return;
    let available = [...this.knownLocalEdibleResources()];
    const count = randomIntBetween(settings.needsPerDwellerMin, settings.needsPerDwellerMax);
    for (let i = 0; i < count; i++) {
      const selected = randomElement(available);
      if (!selected) break;
      available = available.filter(
        (r) => r !== selected
      );
      const need = new Need(
        selected,
        randomIntBetween(settings.needAmountMin, settings.needAmountMax),
        randomIntBetween(settings.needFrequencyMin, settings.needFrequencyMax)
      );
      this.needs.push(need);
    }
  }

  canSatisfyLocally(need) {
    return (
      need.resource.amount > 0 ||
      this.place.resources.some(
        (r) => r.name === need.resource.name && r.amount > 0
      )
    );
  }

  pickRouteByNeed() {
    if (!this.place || !this.place.routes || this.place.routes.length === 0) return null;

    const localSupplies = new Set(
      this.place.resources.filter((r) => r.amount > 0).map((r) => r.name)
    );

    for (const need of this.needs) {
      const name = need.resource.name;
      if (localSupplies.has(name)) continue;
      if (!this.suppliers.has(name)) continue;

      const suppliers = this.suppliers.get(name);
      for (const route of this.place.routes) {
        if (suppliers.has(route.destination) && route.destination !== this.place) {
          return route;
        }
      }
    }
    return null;
  }

  assignJob() {
    if (!this.place || this.place.resources.length === 0) return;
    if (this.job && chance(settings.retainJobProb)) return;

    const knownNeeds = new Set(
      this.needs.map((n) => n.resource.name)
    );

    const preferred = this.place.resources.filter((r) =>
      knownNeeds.has(r.name)
    );

    const resource = preferred.length > 0
      ? randomElement(preferred)
      : randomElement(this.place.resources);

    this.job = resource;
    log(`${this.name} assigned to work at ${resource.name}`);
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
      this.place.habitants.forEach((h) => {
        h.relations = h.relations.filter((r) => r.with_ !== this);
      });
    }
    if (this.route) {
      this.route.removeTraveler(this);
      this.route = null;
    }
  }

  startTravel(route) {
    this.route = route;
    this.job = null;
    this.place.habitants = this.place.habitants.filter((h) => h !== this);
    this.route.addTraveler(this);
    this.place = null;
    this.totalTravelTime = this.route.travelTime;
    this.elapsedTravelTime = 0;
    this.travelProgress = 0;
    log(
      `${this.name} started traveling from ${this.route.origin.name} to ${this.route.destination.name}`
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
      this.generateBasicNeeds();
      this.assignJob();
      log(
        `${this.name} arrived at ${this.route.destination.name} from ${this.route.origin.name}`
      );
      this.route = null;
    }
  }

  update(t) {
    if (!this.alive) return;

    this.ageOneYear(t);

    if (this.age >= this.maxAge) {
      this.die("old age");
      return;
    }

    if (this.place) {
      this.needs.forEach((need) => {
        need.lastConsumption++;
        if (need.lastConsumption > need.frequency) {
          const available = this.place.resources.find(
            (r) => r.name === need.resource.name && r.amount > 0
          );
          if (available) {
            this.place.consumeResource(available, need.amount);
            need.lastConsumption = 0;
            if (need.shortageAnnounced) {
              log(
                `${this.place.name} ${need.resource.name} is available again`
              );
              need.shortageAnnounced = false;
            }
            log(
              `${this.name} consumed ${need.amount} units of ${need.resource.name}`
            );
          } else {
            this.health -= settings.unmetNeedDamage;
            need.lastConsumption = 0;
            if (!need.shortageAnnounced) {
              log(
                `${this.place.name} needs ${need.resource.name} but there is not enough`
              );
              need.shortageAnnounced = true;
            }
          }
        }
      });

      if (this.health <= 0) {
        this.die("malnutrition");
        return;
      }
    }

    if (this.route) {
      this.travel();
    } else if (this.place) {
      const routeByNeed = this.pickRouteByNeed();
      if (routeByNeed) {
        this.startTravel(routeByNeed);
      } else if (
        this.place.routes &&
        this.place.routes.length > 0 &&
        chance(settings.exploreProb)
      ) {
        const route = randomElement(this.place.routes);
        this.startTravel(route);
      }
    }
  }
}
