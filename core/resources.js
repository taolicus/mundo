import { settings } from "./settings.js";
import {
  generateName,
  randomIntBetween,
  chance,
} from "./utils.js";

function makeDef(type, cfg) {
  return {
    name: generateName(),
    type,
    genRate: randomIntBetween(cfg.rateMin ?? 1, cfg.rateMax ?? 4),
    productionInterval: Math.round(
      settings.productionTickInterval * (cfg.intervalMultiplier ?? 1)
    ),
    capacity: randomIntBetween(settings.capacityBaseMin, settings.capacityBaseMax),
    temperatureSensitive: chance(
      settings.sensitivityByType[type] ?? settings.temperatureSensitivityProb
    ),
  };
}

export function makeCatalog() {
  const foods = [];
  const foodCount = randomIntBetween(settings.catalogFoodMin, settings.catalogFoodMax);
  for (let i = 0; i < foodCount; i++) {
    foods.push(makeDef("organic", settings.resourceTypes.organic));
  }

  const minerals = [];
  const mineralCount = randomIntBetween(settings.catalogMineralMin, settings.catalogMineralMax);
  for (let i = 0; i < mineralCount; i++) {
    minerals.push(makeDef("mineral", settings.resourceTypes.mineral));
  }

  return { foods, minerals };
}

export function drawCatalogSubset(catalog, count) {
  const picked = [];
  const pool = [...catalog];
  while (picked.length < count && pool.length > 0) {
    const idx = randomIntBetween(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
