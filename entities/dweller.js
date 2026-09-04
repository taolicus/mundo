import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  randomElement,
  log,
} from "../core/utils.js";

class Need {
  constructor(type, resource = null, amount = 0, frequency = 0) {
    this.type = type;
    this.resource = resource;
    this.amount = amount;
    this.lastConsumption = 0;
    this.frequency = frequency;
    this.shortageAnnounced = false;
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
      const need = new Need(
        "survival",
        selected,
        randomIntBetween(settings.needAmountMin, settings.needAmountMax),
        randomIntBetween(settings.needFrequencyMin, settings.needFrequencyMax)
      );
      this.needs.push(need);
    }

    this.needs.push(
      new Need(
        "exploration",
        null,
        0,
        randomIntBetween(
          settings.explorationFrequencyMin,
          settings.explorationFrequencyMax
        )
      )
    );
  }

  canSatisfyLocally(need) {
    if (!need.resource) return true;
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
      if (need.type !== "survival") continue;
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

  pickExplorationRoute() {
    if (!this.place || !this.place.routes || this.place.routes.length === 0) return null;

    const unvisited = this.place.routes.filter(
      (route) => !this.visitedPlaceNames.has(route.destination.name)
    );
    if (unvisited.length > 0) {
      return randomElement(unvisited);
    }
    return randomElement(this.place.routes);
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

  startTravel(route) {
    this.route = route;
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
      this.generateNeeds();
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
        if (need.type !== "survival") return;
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
      } else if (this.wantsToExplore()) {
        const exploreRoute = this.pickExplorationRoute();
        if (exploreRoute) {
          this.startTravel(exploreRoute);
        }
      }
    }
  }

  wantsToExplore() {
    let ready = false;
    this.needs.forEach((need) => {
      if (need.type !== "exploration") return;
      need.lastConsumption++;
      if (need.lastConsumption > need.frequency) {
        ready = true;
      }
    });
    return ready;
  }
}
