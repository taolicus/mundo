import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  randomElement,
  weightedPick,
  generateName,
  chance,
  log,
} from "../core/utils.js";
import { newDweller } from "./population.js";

function pickType() {
  const types = settings.resourceTypes;
  return weightedPick(
    Object.entries(types).map(([type, cfg]) => [type, cfg.weight])
  );
}

class Resource {
  constructor(name, origin, tick = 0, type = pickType()) {
    this.name = name;
    this.weight = randomIntBetween(1, 99);
    this.origin = origin;
    this.type = type;
    const config = settings.resourceTypes[type] || {};
    this.genRate = randomIntBetween(config.rateMin ?? 1, config.rateMax ?? 4);
    this.productionInterval = Math.round(
      settings.productionTickInterval * (config.intervalMultiplier ?? 1)
    );
    this.capacity = randomIntBetween(settings.capacityBaseMin, settings.capacityBaseMax);
    this.amount = Math.round(this.capacity * settings.initialStockRatio);
    this.temperatureSensitive = chance(
      settings.sensitivityByType[type] ?? settings.temperatureSensitivityProb
    );
    this.nextProductionTick = tick + randomIntBetween(0, this.productionInterval);
  }
}

export class Route {
  constructor(origin, destination) {
    this.origin = origin;
    this.destination = destination;
    this.travelers = [];
    this.distance = this.calcDistance();
    this.travelTime = Math.max(1, Math.floor(this.distance / settings.travelSpeedDivisor));
  }

  calcDistance() {
    const dx = this.destination.x - this.origin.x;
    const dy = this.destination.y - this.origin.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  addTraveler(dweller) {
    if (!this.travelers.includes(dweller)) {
      this.travelers.push(dweller);
    }
  }

  removeTraveler(dweller) {
    this.travelers = this.travelers.filter((v) => v !== dweller);
  }

  getPositionOnRoute(progress) {
    return {
      x: this.origin.x + (this.destination.x - this.origin.x) * progress,
      y: this.origin.y + (this.destination.y - this.origin.y) * progress,
    };
  }
}

export class Region {
  constructor(name, x, y) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.temperature = 0;
    this.resources = [];
    this.habitants = [];
    this.routes = [];
    this.generateResources();
  }

  generateResources() {
    const count = randomIntBetween(settings.resourcesPerPlaceMin, settings.resourcesPerPlaceMax);
    for (let i = 0; i < count; i++) {
      const name = generateName();
      const resource = new Resource(name, this);
      this.resources.push(resource);
    }
  }

  calcTemperature(t, equatorY = 500) {
    const day = t / settings.hoursPerDay;

    const distEquator = Math.abs(equatorY - this.y);
    const base =
      settings.tempBaseMax - distEquator * settings.yCooling;

    const annual =
      Math.sin((2 * Math.PI * day) / settings.daysPerYear) *
      settings.annualAmplitude;

    const daily =
      Math.sin((2 * Math.PI * (t - 6)) / settings.hoursPerDay) *
      settings.dailyAmplitude;

    this.temperature = base + annual + daily;
  }

  consumeResource(resource, amount) {
    if (!this.resources.includes(resource)) return false;
    resource.amount -= amount;
    if (resource.amount < 0) resource.amount = 0;
    return true;
  }

  produceResource(resource, amount) {
    if (!this.resources.includes(resource)) return false;
    resource.amount = Math.min(resource.amount + amount, resource.capacity);
    return true;
  }

  temperatureFactor(resource) {
    if (!resource.temperatureSensitive) return 1;
    return 1 + (this.temperature - settings.optimalTemp) * settings.temperatureSensitivity;
  }

  hasOrganicSurplus() {
    return this.resources.some(
      (r) => r.type === "organic" && r.amount > r.capacity * settings.birthStockRatio
    );
  }

  attemptBirth(t) {
    if (this.habitants.length >= settings.maxDwellersPerPlace) return;
    if (this.habitants.length === 0) return;
    if (!this.hasOrganicSurplus()) return;

    const hasAdult = this.habitants.some((h) => h.age >= settings.reproductionAge);
    if (!hasAdult) return;

    if (!chance(settings.birthProb)) return;

    const baby = newDweller(this, t);
    this.habitants.push(baby);
    log(`👶 ${baby.name} was born in ${this.name}`);
  }

  update(t) {
    this.calcTemperature(t);
    this.resources.forEach((resource) => {
      if (t < resource.nextProductionTick) return;
      resource.nextProductionTick = t + resource.productionInterval;

      const factor = this.temperatureFactor(resource);
      const amount = Math.max(
        0,
        Math.floor(resource.genRate * factor)
      );
      if (amount > 0) {
        this.produceResource(resource, amount);
        log(
          `${this.name} produced ${amount} new units of ${resource.name}`
        );
      }
    });
    this.attemptBirth(t);
  }
}
