import { randomIntBetween } from "../../core/utils.js";
import { settings } from "../../core/settings.js";
import { events } from "../../core/events.js";
import { routeMeanTemperature, travelTimeMultiplier } from "../../core/environment.js";

export const travel = {
  id: "travel",

  perform(dweller, ctx, t) {
    this.start(dweller, ctx, t);
  },

  start(dweller, { route, reason }, t) {
    dweller.route = route;
    dweller.activity = reason;
    dweller.place.population = dweller.place.population.filter((h) => h !== dweller);
    route.addTraveler(dweller);
    dweller.place = null;
    dweller.totalTravelTime = this.tripTime(dweller, route);
    dweller.elapsedTravelTime = 0;
    dweller.travelProgress = 0;
    events.emit("travel", {
      t,
      dweller: dweller.name,
      reason,
      from: route.origin.name,
      to: route.destination.name,
    });
  },

  tripTime(dweller, route) {
    const base = route.distance / settings.travelSpeedDivisor;
    const tempMult = travelTimeMultiplier(routeMeanTemperature(route));
    const speed = Math.max(settings.ageMobilityFloor, dweller.mobility());
    return Math.max(1, Math.round((base * tempMult) / speed));
  },

  step(dweller, t) {
    dweller.elapsedTravelTime++;
    dweller.travelProgress = dweller.elapsedTravelTime / dweller.totalTravelTime;
    if (dweller.elapsedTravelTime < dweller.totalTravelTime) return;
    const destination = dweller.route.destination;
    dweller.route.removeTraveler(dweller);
    dweller.place = destination;
    destination.population.push(dweller);
    dweller.route = null;
    const baseSettle = randomIntBetween(
      settings.settlePeriodMin,
      settings.settlePeriodMax
    );
    const restFactor =
      destination === dweller.origin
        ? 1 + dweller.homebody
        : 1 - 0.5 * dweller.homebody;
    dweller.settleTicksRemaining = Math.max(1, Math.round(baseSettle * restFactor));
    dweller.activity = "resting";
    dweller.onArrival(destination, t);
  },
};