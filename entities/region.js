import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  chance,
  log,
} from "../core/utils.js";
import { drawCatalogSubset } from "../core/resources.js";
import { newDweller } from "./population.js";

class Resource {
  constructor(def, origin, tick = 0) {
    this.name = def.name;
    this.type = def.type;
    this.genRate = def.genRate;
    this.productionInterval = def.productionInterval;
    this.capacity = def.capacity;
    this.amount = Math.round(this.capacity * settings.initialStockRatio);
    this.temperatureSensitive = def.temperatureSensitive;
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
  constructor(name, x, y, catalog, tick = 0) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.temperature = 0;
    this.resources = [];
    this.habitants = [];
    this.routes = [];
    this.catalog = catalog;
    this.generateResources(catalog, tick);
  }

  generateResources(catalog, tick = 0) {
    const foodDefs = drawCatalogSubset(
      catalog.foods,
      randomIntBetween(settings.foodsPerPlaceMin, settings.foodsPerPlaceMax)
    );
    const mineralDefs = drawCatalogSubset(
      catalog.minerals,
      randomIntBetween(settings.mineralsPerPlaceMin, settings.mineralsPerPlaceMax)
    );
    for (const def of foodDefs) {
      this.resources.push(new Resource(def, this, tick));
    }
    for (const def of mineralDefs) {
      this.resources.push(new Resource(def, this, tick));
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

  attemptBirth(t) {
    if (this.habitants.length >= settings.maxDwellersPerPlace) return;
    if (!chance(settings.birthRate)) return;

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
