import { test } from "node:test";
import assert from "node:assert/strict";

import { Climate, seasonAt } from "../core/environment.js";
import { settings } from "../core/settings.js";

const closeTo = (got, want) => assert.ok(Math.abs(got - want) < 1e-9);

test("climate peaks at mid-summer noon and troughs at mid-winter midnight", () => {
  const equator = new Climate({ y: settings.equatorY });
  const solsticeNoon = Math.floor(settings.daysPerYear * 0.375) * settings.hoursPerDay + 12; // mid-summer
  const peak = equator.calculateTemperature(solsticeNoon);
  assert.ok(
    Math.abs(
      peak -
        (settings.tempBaseMax + settings.annualAmplitude + settings.dailyAmplitude)
    ) < 0.02
  );

  const polar = new Climate({ y: settings.equatorY + 1000 });
  const winterMidnight = Math.floor(settings.daysPerYear * 0.875) * settings.hoursPerDay + 0; // mid-winter
  const low = polar.calculateTemperature(winterMidnight);
  const expectBase = settings.tempBaseMax - 1000 * settings.yCooling;
  closeTo(low, expectBase - settings.annualAmplitude - settings.dailyAmplitude);
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

test("seasonAt buckets the year into four sequential seasons", () => {
  const Y = settings.ticksPerYear;
  const D = settings.hoursPerDay;
  assert.equal(seasonAt(0), "spring");
  assert.equal(seasonAt(D * 1), "spring");
  assert.equal(seasonAt(D * 90), "summer"); // day 91 onwards
  assert.equal(seasonAt(D * 90 + 1), "summer");
  assert.equal(seasonAt(D * 180), "autumn");
  assert.equal(seasonAt(D * 270), "winter");
  assert.equal(seasonAt(D * 359), "winter");
  assert.equal(seasonAt(Y), "spring");
  assert.equal(seasonAt(Y + D * 100), "summer");
  assert.equal(seasonAt(-1), "winter");
});

test("peak of summer and of winter sit in their matching seasons", () => {
  const Y = settings.ticksPerYear;
  const D = settings.hoursPerDay;
  assert.equal(seasonAt(D * 135), "summer"); // warmest day
  assert.equal(seasonAt(D * 315), "winter"); // coldest day
  const c = new Climate({ y: settings.equatorY });
  const warm = c.calculateTemperature(D * 135 + 12);
  const cold = c.calculateTemperature(D * 315);
  assert.ok(warm > cold);
});

test("climate.update sets a sane temperature on the member", () => {
  const c = new Climate({ y: settings.equatorY });
  c.update(12345);
  assert.ok(Number.isFinite(c.temperature));
  assert.ok(Math.abs(c.temperature - c.calculateTemperature(12345)) < 1e-9);
});