import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  chance,
  calculateDistance,
} from "../core/utils.js";
import { drawCatalogSubset } from "../core/resources.js";
import { Climate } from "../core/environment.js";
import { events } from "../core/events.js";
import { newDweller } from "./population.js";

class Resource {
  constructor(def, origin, tick = 0) {
    this.name = def.name;
    this.type = def.type;
    this.genRate = def.genRate;
    this.productionInterval = def.productionInterval;
    this.capacity = def.capacity;
    this.amount = Math.round(this.capacity * settings.initialStockRatio);
    this.nextProductionTick = tick + randomIntBetween(0, this.productionInterval);
  }
}

export class Route {
  constructor(origin, destination) {
    this.origin = origin;
    this.destination = destination;
    this.travelers = [];
    this.distance = calculateDistance(this.origin, this.destination);
    this.travelTime = Math.max(1, Math.floor(this.distance / settings.travelSpeedDivisor));
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
    this.climate = new Climate(this);
    this.resources = [];
    this.population = [];
    this.routes = [];
    this.catalog = catalog;
    this.generateResources(catalog, tick);
  }

  get temperature() {
    return this.climate.temperature;
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

  attemptBirth(t) {
    if (this.population.length >= settings.maxDwellersPerPlace) return;
    if (!chance(settings.birthRate)) return;

    const baby = newDweller(this, t);
    this.population.push(baby);
    events.emit("birth", { t, place: this.name, dweller: baby.name });
  }

  update(t) {
    this.climate.update(t);
    this.resources.forEach((resource) => {
      if (t < resource.nextProductionTick) return;
      resource.nextProductionTick = t + resource.productionInterval;
      if (resource.genRate <= 0) return;
      this.produceResource(resource, resource.genRate);
    });
    this.attemptBirth(t);
  }
}
