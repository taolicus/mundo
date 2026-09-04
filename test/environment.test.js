import { test } from "node:test";
import assert from "node:assert/strict";

import { Climate } from "../core/environment.js";
import { settings } from "../core/settings.js";

const closeTo = (got, want) => assert.ok(Math.abs(got - want) < 1e-9);

test("climate at the equator at t=0 sits at base minus day-night trough", () => {
  const c = new Climate({ y: settings.equatorY });
  closeTo(c.calculateTemperature(0), 25); // 30 base - 5 nightly dip
});

test("climate far from the equator is colder", () => {
  const equator = new Climate({ y: settings.equatorY });
  const cold = new Climate({ y: settings.equatorY + 1000 });
  const eq = equator.calculateTemperature(1000);
  const north = cold.calculateTemperature(1000);
  assert.ok(north < eq);
  closeTo(north, eq - 50); // 0.05 per unit of latitude
});

test("climate flips warm in the day and cold at night", () => {
  const c = new Climate({ y: settings.equatorY });
  const noon = c.calculateTemperature(12); // daily peak
  const midnight = c.calculateTemperature(0); // daily trough
  assert.ok(noon > midnight);
});

test("climate.update sets a sane temperature on the member", () => {
  const c = new Climate({ y: settings.equatorY });
  c.update(12345);
  assert.ok(Number.isFinite(c.temperature));
  assert.ok(Math.abs(c.temperature - c.calculateTemperature(12345)) < 1e-9);
});