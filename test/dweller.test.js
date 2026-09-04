import { test } from "node:test";
import assert from "node:assert/strict";

import { Dweller } from "../entities/dweller.js";
import { settings } from "../core/settings.js";

function res(name, type = "organic", amount = 10) {
  return { name, type, genRate: 5, productionInterval: 10, capacity: 100, amount };
}

function makePlace(name, resources = []) {
  return {
    name,
    x: 0,
    y: 0,
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

test("constructor builds needs and learns the home place", () => {
  const p = makePlace("A", [res("r1"), res("r2")]);
  const d = new Dweller("D", p, p, 0);
  assert.equal(d.isCurious, d.needs.some((n) => n.type === "exploration"));
  assert.ok(d.needs.some((n) => n.type === "survival"));
  assert.ok(d.needs.some((n) => n.type === "gather"));
  assert.ok(d.visitedPlaceNames.has("A"));
  assert.ok(d.knows("r1") && d.knows("r2"));
  assert.equal(d.suppliers.get("r1").has(p), true);
  assert.ok(d.tastes.length >= 1);
});

test("survival need eats from local food when urgent", () => {
  const p = makePlace("A", [res("r1"), res("r2")]);
  const d = new Dweller("D", p, p, 0);
  const need = d.needs.find((n) => n.type === "survival");
  const before = p.resources.reduce((s, r) => s + r.amount, 0);
  need.lastConsumption = need.frequency;
  need.tick(d, 1);
  assert.equal(need.activity, "eating");
  assert.equal(need.shortageAnnounced, false);
  const after = p.resources.reduce((s, r) => s + r.amount, 0);
  assert.equal(before - after, need.amount);
});

test("survival need goes hungry and escalates when no food", () => {
  const p = makePlace("A", [res("r1", "organic", 0)]);
  const d = new Dweller("D", p, p, 0);
  const need = d.needs.find((n) => n.type === "survival");
  const health = d.health;
  need.lastConsumption = need.frequency;
  need.tick(d, 1);
  assert.equal(need.activity, "hungry");
  assert.equal(need.shortageAnnounced, true);
  assert.equal(d.health, health - settings.unmetNeedDamage);
  const u1 = need.urgency(d);
  need.goHungry(d);
  assert.ok(need.urgency(d) > u1);
});

test("survival need seeks the nearest known food place", () => {
  const a = makePlace("A", [res("r1", "organic", 0)]);
  const b = makePlace("B", [res("r2")]);
  const ab = { origin: a, destination: b };
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b);
  const need = d.needs.find((n) => n.type === "survival");
  need.shortageAnnounced = true;
  need.urgencyFrac = 1;
  const intent = need.behaviour(d);
  assert.ok(intent);
  assert.equal(intent.behaviour, "travel");
  assert.equal(intent.route.destination, b);
  assert.ok(intent.reason.startsWith("seeking"));
});

test("exploration need prefers unvisited places", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const ab = { origin: a, destination: b };
  a.routes.push(ab);
  let d;
  for (let i = 0; i < 50; i++) {
    const candidate = new Dweller("D", a, a, 0);
    if (candidate.isCurious) {
      d = candidate;
      break;
    }
  }
  const need = d.needs.find((n) => n.type === "exploration");
  assert.ok(need, "expected a curious dweller");
  need.lastEvent = need.frequency;
  const intent = need.behaviour(d);
  assert.ok(intent);
  assert.equal(intent.reason, "out of curiosity");
  assert.equal(intent.route.destination, b);
});

test("gather need targets a known resource missing locally", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r1"), res("r2")]);
  const ab = { origin: a, destination: b };
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b);
  const need = d.needs.find((n) => n.type === "gather");
  need.lastEvent = need.frequency;
  const intent = need.behaviour(d);
  assert.ok(intent);
  assert.equal(intent.reason, "to gather r2");
});

test("learnPlace records knowledge and suppliers without repetition", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b);
  assert.ok(d.knows("r2"));
  assert.equal(d.suppliers.get("r2").has(b), true);
  d.learnPlace(b);
  assert.equal(d.visitedPlaceNames.has("B"), true);
});

test("shareKnowledgeWith transfers knowledge and suppliers", () => {
  const a = makePlace("A", [res("ronlyAtA")]);
  const b = makePlace("B", [res("ronlyAtB")]);
  const da = new Dweller("A", a, a, 0);
  const db = new Dweller("B", b, b, 0);
  da.shareKnowledgeWith(db);
  assert.ok(db.knows("ronlyAtA"));
  assert.ok(db.suppliers.get("ronlyAtA").has(a));
});

test("ageOneYear advances once per year boundary", () => {
  const p = makePlace("A", [res("r1")]);
  const d = new Dweller("D", p, p, 0);
  d.age = 10;
  d.nextYear = 0;
  d.ageOneYear(20000);
  assert.equal(d.age, 13); // boundaries crossed: 0, 8640, 17280
});

test("die removes a dweller from its place", () => {
  const p = makePlace("A", [res("r1")]);
  const d = new Dweller("D", p, p, 0);
  p.population.push(d);
  d.die("old age");
  assert.equal(d.alive, false);
  assert.equal(p.population.includes(d), false);
});

test("die removes a travelling dweller from its route", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const ab = {
    origin: a,
    destination: b,
    travelers: [],
    removeTraveler(x) {
      this.travelers = this.travelers.filter((y) => y !== x);
    },
  };
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  d.route = ab;
  d.place = null;
  ab.travelers.push(d);
  d.die("malnutrition");
  assert.equal(ab.travelers.includes(d), false);
  assert.equal(d.route, null);
});

test("tasteRank returns the ordering index for a taste", () => {
  const p = makePlace("A", [res("r1"), res("r2"), res("r3")]);
  const d = new Dweller("D", p, p, 0);
  assert.equal(d.tasteRank(d.tastes[0]), 0);
});