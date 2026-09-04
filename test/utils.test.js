import { test } from "node:test";
import assert from "node:assert/strict";

import {
  randomIntBetween,
  distance,
  calculateDistance,
  randomElement,
  randomSample,
  weightedPick,
  chance,
  generateName,
  segmentsOverlap,
} from "../core/utils.js";

test("randomIntBetween stays within inclusive bounds", () => {
  for (let i = 0; i < 500; i++) {
    const n = randomIntBetween(3, 7);
    assert.ok(n >= 3 && n <= 7);
  }
});

test("randomIntBetween with equal bounds is constant", () => {
  assert.equal(randomIntBetween(5, 5), 5);
});

test("distance computes euclidean distance", () => {
  assert.equal(distance(0, 0, 3, 4), 5);
  assert.equal(distance(1, 1, 1, 1), 0);
});

test("calculateDistance works on {x,y} objects", () => {
  assert.equal(calculateDistance({ x: 0, y: 0 }, { x: 6, y: 8 }), 10);
});

test("randomElement of a singleton returns that element", () => {
  const arr = ["only"];
  assert.equal(randomElement(arr), "only");
});

test("randomSample returns unique items up to the count", () => {
  for (let i = 0; i < 50; i++) {
    const s = randomSample([1, 2, 3, 4, 5], 3);
    assert.equal(s.length, 3);
    assert.equal(new Set(s).size, 3);
    const allowed = new Set([1, 2, 3, 4, 5]);
    assert.ok(s.every((x) => allowed.has(x)));
  }
  assert.equal(randomSample([1, 2, 3], 10).length, 3);
  assert.equal(randomSample([], 3).length, 0);
});

test("weightedPick of a single entry returns it", () => {
  assert.equal(weightedPick([["only", 1]]), "only");
});

test("weightedPick ignores zero-weight entries", () => {
  assert.equal(weightedPick([["a", 1], ["b", 0]]), "a");
});

test("weightedPick picks among all positive-weight entries", () => {
  for (let i = 0; i < 100; i++) {
    const pick = weightedPick([["a", 1], ["b", 1]]);
    assert.ok(pick === "a" || pick === "b");
  }
});

test("chance(0) never fires and chance(1) always fires", () => {
  assert.equal(chance(0), false);
  assert.equal(chance(1), true);
});

test("generateName produces a three-letter name (upper, lower, lower)", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(generateName(), /^[A-Z][a-z]{2}$/);
  }
});

test("segmentsOverlap detects proper crossings", () => {
  assert.equal(segmentsOverlap(0, 0, 10, 10, 0, 10, 10, 0), true);
  assert.equal(segmentsOverlap(0, 0, 10, 0, 5, 5, 15, 5), false);
});

test("segmentsOverlap detects collinear overlaps", () => {
  assert.equal(segmentsOverlap(0, 0, 10, 0, 4, 0, 9, 0), true);
  assert.equal(segmentsOverlap(0, 0, 10, 0, 12, 0, 18, 0), false);
});

test("segmentsOverlap allows edges that merely share an endpoint", () => {
  assert.equal(segmentsOverlap(0, 0, 10, 0, 0, 0, 0, 10), false);
  assert.equal(segmentsOverlap(0, 0, 10, 0, 10, 0, 10, 10), false);
});

test("segmentsOverlap treats collinear chains touching at one point as separate", () => {
  assert.equal(segmentsOverlap(0, 0, 10, 0, 10, 0, 20, 0), false);
});