import { randomIntBetween } from "../../core/utils.js";
import { settings } from "../../core/settings.js";

export const travel = {
  id: "travel",

  perform(dweller, ctx) {
    this.start(dweller, ctx);
  },

  start(dweller, { route, reason }) {
    dweller.route = route;
    dweller.activity = reason;
    dweller.place.habitants = dweller.place.habitants.filter((h) => h !== dweller);
    route.addTraveler(dweller);
    dweller.place = null;
    dweller.totalTravelTime = route.travelTime;
    dweller.elapsedTravelTime = 0;
    dweller.travelProgress = 0;
  },

  step(dweller) {
    dweller.elapsedTravelTime++;
    dweller.travelProgress = dweller.elapsedTravelTime / dweller.totalTravelTime;
    if (dweller.elapsedTravelTime < dweller.totalTravelTime) return;
    const destination = dweller.route.destination;
    dweller.route.removeTraveler(dweller);
    dweller.place = destination;
    destination.habitants.push(dweller);
    dweller.route = null;
    dweller.activity = "resting";
    dweller.settleTicksRemaining = randomIntBetween(
      settings.settlePeriodMin,
      settings.settlePeriodMax
    );
    dweller.onArrival(destination);
  },
};
