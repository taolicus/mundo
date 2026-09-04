import { test } from "node:test";
import assert from "node:assert/strict";

import { World } from "../entities/world.js";
import { segmentsOverlap } from "../core/utils.js";

test("world invariants hold over a run", () => {
  const w = new World(1200, 800);
  const reasons = new Set();
  const shares = [];
  const totals = [];
  let maxTravelers = 0;

  for (let t = 1; t <= 4000; t++) {
    w.update();

    if (t % 100 === 0) {
      const seen = new Set();
      let residents = 0;
      let travelTotal = 0;

      for (const p of w.places) {
        for (const d of p.population) {
          assert.ok(d.alive, "dead dweller resident in a place");
          assert.equal(d.place, p, "place mismatch on a resident");
          assert.ok(!seen.has(d), "dweller appears in more than one place");
          seen.add(d);
          residents++;
        }
        for (const r of p.routes) {
          for (const d of r.travelers) {
            assert.ok(d.alive, "dead dweller travelling");
            assert.equal(d.place, null, "traveller still has a place");
            assert.ok(!seen.has(d), "dweller both travelling and resident");
            seen.add(d);
            reasons.add(d.activity);
          }
          travelTotal += r.travelers.length;
        }
      }
      maxTravelers = Math.max(maxTravelers, travelTotal);
      shares.push(residents / (residents + travelTotal));
      totals.push(residents + travelTotal);
    }
  }

  assert.ok(shares.length > 10, "expected many samples");
  assert.ok(maxTravelers >= 1, "no one ever travelled");
  for (const s of totals) {
    assert.ok(s >= 1, "world emptied out");
  }
  const endShare = shares[shares.length - 1];
  assert.ok(endShare >= 0.45, `dwellers not living mostly at home (share ${endShare.toFixed(2)})`);

  const gathered = [...reasons].some((r) => r && r.startsWith("to gather"));
  assert.ok(gathered, "gather reason never fired");
});

test("world route network is fully connected with no overlapping segments", () => {
  for (let w = 0; w < 25; w++) {
    const world = new World(1200, 800);

    const reachable = new Set([world.places[0]]);
    const stack = [world.places[0]];
    while (stack.length > 0) {
      const place = stack.pop();
      for (const route of place.routes) {
        if (!reachable.has(route.destination)) {
          reachable.add(route.destination);
          stack.push(route.destination);
        }
      }
    }
    assert.equal(reachable.size, world.places.length, "world is not fully connected");

    const segments = [];
    for (const place of world.places) {
      for (const route of place.routes) {
        segments.push([place, route.destination]);
      }
    }
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const [a1, a2] = segments[i];
        const [b1, b2] = segments[j];
        if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
        assert.ok(
          !segmentsOverlap(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y, b2.x, b2.y),
          "route segments overlap"
        );
      }
    }
  }
});