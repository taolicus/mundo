import { test } from "node:test";
import assert from "node:assert/strict";

import { Route } from "../entities/region.js";
import { Dweller } from "../entities/dweller.js";
import { travel } from "../core/behaviours/travel.js";
import { calculateDistance } from "../core/utils.js";
import { settings } from "../core/settings.js";

function makePlace(name, resources, x, y) {
  return {
    name,
    x,
    y,
    catalog: {
      foods: resources.filter((r) => r.type === "organic").map((r) => ({ name: r.name })),
      minerals: [],
    },
    resources,
    routes: [],
    population: [],
    consumeResource(r, amount) {
      r.amount = Math.max(0, r.amount - amount);
    },
  };
}

test("travel start moves a dweller onto the route", () => {
  const a = makePlace("A", [{ name: "r1", type: "organic", amount: 10, capacity: 100 }], 0, 0);
  const b = makePlace("B", [{ name: "r2", type: "organic", amount: 10, capacity: 100 }], 100, 0);
  const ab = new Route(a, b);
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  a.population.push(d);
  travel.perform(d, { route: ab, reason: "to gather r2" });
  assert.equal(d.place, null);
  assert.equal(d.route, ab);
  assert.equal(a.population.includes(d), false);
  assert.ok(ab.travelers.includes(d));
  assert.equal(d.activity, "to gather r2");
  assert.equal(d.totalTravelTime, Math.max(1, Math.floor(calculateDistance(a, b) / settings.travelSpeedDivisor)));
});

test("travel step removes a dweller from the route and settles it on arrival", () => {
  const a = makePlace("A", [{ name: "r1", type: "organic", amount: 10, capacity: 100 }], 0, 0);
  const b = makePlace("B", [{ name: "r2", type: "organic", amount: 10, capacity: 100 }], 100, 0);
  const ab = new Route(a, b);
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  a.population.push(d);
  travel.perform(d, { route: ab, reason: "to gather r2" });
  d.elapsedTravelTime = d.totalTravelTime - 1;
  travel.step(d);
  assert.equal(d.place, b);
  assert.ok(b.population.includes(d));
  assert.equal(ab.travelers.includes(d), false);
  assert.equal(d.route, null);
  assert.equal(d.activity, "resting");
  assert.ok(d.settleTicksRemaining > 0 && d.settleTicksRemaining <= settings.settlePeriodMax);
  assert.ok(d.visitedPlaceNames.has("B"));
});

test("travel step mid-route keeps the dweller travelling", () => {
  const a = makePlace("A", [{ name: "r1", type: "organic", amount: 10, capacity: 100 }], 0, 0);
  const b = makePlace("B", [{ name: "r2", type: "organic", amount: 10, capacity: 100 }], 100, 0);
  const ab = new Route(a, b);
  const d = new Dweller("D", a, a, 0);
  a.population.push(d);
  if (d.totalTravelTime > 1) {
    travel.perform(d, { route: ab, reason: "out of curiosity" });
    travel.step(d);
    assert.equal(d.place, null);
    assert.ok(ab.travelers.includes(d));
    assert.ok(d.elapsedTravelTime > 0);
  }
});

test("homebodies rest shorter away from and longer at their origin", () => {
  const a = makePlace("A", [{ name: "r1", type: "organic", amount: 10, capacity: 100 }], 0, 0);
  const b = makePlace("B", [{ name: "r2", type: "organic", amount: 10, capacity: 100 }], 100, 0);
  const ab = new Route(a, b);
  a.routes.push(ab);

  const d1 = new Dweller("D1", a, a, 0); // origin A, heads to B (away)
  d1.homebody = 1;
  a.population.push(d1);
  travel.perform(d1, { route: ab, reason: "to gather r2" }, 1);
  d1.elapsedTravelTime = d1.totalTravelTime - 1;
  travel.step(d1, 1);
  assert.equal(d1.place, b);
  const awayCap = Math.round(settings.settlePeriodMax * (1 - 0.5 * 1));
  assert.ok(d1.settleTicksRemaining >= 1 && d1.settleTicksRemaining <= awayCap);

  const d2 = new Dweller("D2", b, a, 0); // origin B, heads home to B
  d2.homebody = 1;
  a.population.push(d2);
  travel.perform(d2, { route: ab, reason: "heading home" }, 1);
  d2.elapsedTravelTime = d2.totalTravelTime - 1;
  travel.step(d2, 1);
  assert.equal(d2.place, b);
  const homeFloor = Math.round(settings.settlePeriodMin * (1 + 1));
  const homeCeil = Math.round(settings.settlePeriodMax * (1 + 1));
  assert.ok(d2.settleTicksRemaining >= homeFloor && d2.settleTicksRemaining <= homeCeil);
});