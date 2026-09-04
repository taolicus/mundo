import { test } from "node:test";
import assert from "node:assert/strict";

import { Dweller } from "../entities/dweller.js";
import { tend } from "../core/behaviours/tend.js";
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
    produceResource(r, amount) {
      r.amount = Math.min(r.amount + amount, r.capacity);
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

test("shareKnowledgeWith(count) shares a bounded subset", () => {
  const a = makePlace("A", [res("r1"), res("r2"), res("r3")]);
  const b = makePlace("B", [res("r4")]);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b); // d knows r1..r4
  const peer = new Dweller("P", a, a, 0); // peer knows r1..r3
  const shared = d.shareKnowledgeWith(peer, 2);
  assert.equal(shared.length, 2);
  const allowed = new Set([...d.knowledge]);
  assert.ok(shared.every((name) => allowed.has(name)));
  assert.ok(peer.knowledge.size >= 3 && peer.knowledge.size <= 5);
});

test("tend need targets the most-depleted known local resource", () => {
  const p = makePlace("A", [res("r1", "organic", 2), res("r2", "organic", 8)]);
  const d = new Dweller("D", p, p, 0);
  const need = d.needs.find((n) => n.type === "tend");
  need.lastEvent = need.frequency;
  const intent = need.behaviour(d);
  assert.ok(intent, "expected a tend intent");
  assert.equal(intent.behaviour, "tend");
  assert.equal(intent.resource.name, "r1");
  const before = intent.resource.amount;
  tend.perform(d, intent, 1);
  assert.equal(intent.resource.amount, before + intent.amount);
});

test("tending never overflows resource capacity", () => {
  const p = makePlace("A", [res("r1", "organic", 10)]);
  p.resources[0].capacity = 10;
  p.resources[0].amount = 9;
  const d = new Dweller("D", p, p, 0);
  const need = d.needs.find((n) => n.type === "tend");
  need.lastEvent = need.frequency;
  const intent = need.behaviour(d);
  tend.perform(d, intent, 1);
  assert.equal(p.resources[0].amount, 10);
});

test("homing need routes a dweller toward its origin", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const ba = { origin: b, destination: a };
  b.routes.push(ba);
  const d = new Dweller("D", a, b, 0); // lives in B, origin A
  const need = d.needs.find((n) => n.type === "homing");
  need.lastEvent = need.frequency;
  const intent = need.behaviour(d);
  assert.ok(intent, "expected a homing intent");
  assert.equal(intent.behaviour, "travel");
  assert.equal(intent.reason, "heading home");
  assert.equal(intent.route.destination, a);
});

test("homing is dormant at the origin", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const d = new Dweller("D", a, a, 0);
  const need = d.needs.find((n) => n.type === "homing");
  need.lastEvent = need.frequency;
  assert.equal(need.behaviour(d), null);
});

test("arriving at the origin resets the homing need", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const d = new Dweller("D", a, b, 0);
  const need = d.needs.find((n) => n.type === "homing");
  need.lastEvent = 7;
  d.onArrival(a, 100);
  assert.equal(need.lastEvent, 0);
});

test("homebody trait is a stable 0..1 personality", () => {
  const a = makePlace("A", [res("r1")]);
  const d1 = new Dweller("D", a, a, 0);
  const h1 = d1.homebody;
  for (let i = 0; i < 20; i++) {
    d1.update(i);
    assert.equal(d1.homebody, h1);
  }
  assert.ok(d1.homebody >= 0 && d1.homebody <= 1);
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

test("mobility declines from 1 toward the floor as a dweller ages", () => {
  const p = makePlace("A", [res("r1")]);
  const young = new Dweller("Y", p, p, 0);
  young.age = 0;
  young.maxAge = 100;
  const elder = new Dweller("E", p, p, 0);
  elder.age = 100;
  elder.maxAge = 100;
  assert.equal(young.mobility(), 1);
  assert.ok(Math.abs(elder.mobility() - settings.ageMobilityFloor) < 1e-9);
  assert.ok(elder.mobility() < young.mobility());
});

test("natural death chance rises with age and is zero for the young", () => {
  const p = makePlace("A", [res("r1")]);
  const d = new Dweller("D", p, p, 0);
  d.maxAge = 100;
  d.age = 10;
  const young = d.naturalDeathChance();
  assert.ok(young > 0 && young < 1e-6);
  d.age = 100;
  const old = d.naturalDeathChance();
  assert.equal(old, settings.agingDeathRate / settings.ticksPerYear);
  assert.ok(old > young);
});

test("aged elders no longer explore out of curiosity", () => {
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
  assert.ok(d, "expected a curious dweller");
  d.age = 100;
  d.maxAge = 100;
  const need = d.needs.find((n) => n.type === "exploration");
  need.lastEvent = need.frequency;
  assert.equal(need.behaviour(d, 0), null);
});

test("gather is gated when every candidate route is hostile (frozen)", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r1"), res("r2")]);
  a.climate = { temperature: -30 };
  b.climate = { temperature: -30 };
  const ab = { origin: a, destination: b };
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b);
  const need = d.needs.find((n) => n.type === "gather");
  need.lastEvent = need.frequency;
  assert.equal(need.behaviour(d, 0), null);
});

test("gather is gated when every candidate route is hostile (scorching)", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r1"), res("r2")]);
  a.climate = { temperature: 45 };
  b.climate = { temperature: 45 };
  const ab = { origin: a, destination: b };
  a.routes.push(ab);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(b);
  const need = d.needs.find((n) => n.type === "gather");
  need.lastEvent = need.frequency;
  assert.equal(need.behaviour(d, 0), null);
});

test("gather heads to warmth in deep winter and to cool in high summer", () => {
  const a = makePlace("A", [res("r1")]);
  const north = makePlace("N", [res("r1"), res("r2")]);
  const south = makePlace("S", [res("r1"), res("r2")]);
  a.climate = { temperature: 10 };
  north.climate = { temperature: 0 };
  south.climate = { temperature: 20 };
  const aNorth = { origin: a, destination: north };
  const aSouth = { origin: a, destination: south };
  a.routes.push(aNorth, aSouth);
  const d = new Dweller("D", a, a, 0);
  d.learnPlace(north);
  d.learnPlace(south);
  const need = d.needs.find((n) => n.type === "gather");
  need.lastEvent = need.frequency;
  const D = settings.hoursPerDay;

  const winter = need.behaviour(d, D * 315);
  assert.ok(winter);
  assert.equal(winter.route.destination, south);

  const summer = need.behaviour(d, D * 135);
  assert.ok(summer);
  assert.equal(summer.route.destination, north);
});

test("homing pull strengthens in both extreme seasons", () => {
  const a = makePlace("A", [res("r1")]);
  const b = makePlace("B", [res("r2")]);
  const d = new Dweller("D", a, b, 0);
  const need = d.needs.find((n) => n.type === "homing");
  need.lastEvent = need.frequency;
  const D = settings.hoursPerDay;
  const spring = need.weight(d, D * 45);
  const summer = need.weight(d, D * 135);
  const winter = need.weight(d, D * 315);
  assert.ok(winter > spring);
  assert.ok(summer > spring);
  assert.ok(Math.abs(winter - summer) < 1e-9);
});