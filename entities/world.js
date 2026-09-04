import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  generateName,
  calculateDistance,
} from "../core/utils.js";
import { Region, Route } from "./region.js";
import { populatePlaces } from "./population.js";
import { makeCatalog } from "../core/resources.js";

export class World {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.places = [];
    this.tick = 0;
    this.catalog = makeCatalog();
    this.generatePlaces();
  }

  generateRoutes() {
    for (let i = 0; i < this.places.length; i++) {
      for (let j = i + 1; j < this.places.length; j++) {
        const dist = calculateDistance(this.places[i], this.places[j]);
        if (dist <= settings.maxRouteDistance) {
          this.places[i].routes.push(new Route(this.places[i], this.places[j]));
          this.places[j].routes.push(new Route(this.places[j], this.places[i]));
        }
      }
    }
  }

  generatePlaces() {
    const equatorY = Math.round(this.height * settings.equatorFrac);
    const yCooling =
      settings.tempBaseMax / Math.max(1, equatorY - settings.drawSize);

    for (let i = 0; i < settings.placeCount; i++) {
      let attempts = 0;
      while (attempts < settings.maxPlacementAttempts) {
        const place = new Region(
          generateName(),
          randomIntBetween(
            settings.drawSize,
            this.width - settings.drawSize * 2
          ),
          randomIntBetween(
            settings.drawSize,
            this.height - settings.drawSize * 2
          ),
          this.catalog,
          0,
          { equatorY, yCooling }
        );

        const tooClose = this.places.some(
          (existing) =>
            calculateDistance(place, existing) < settings.minDistanceBetweenPlaces
        );

        if (!tooClose || this.places.length === 0) {
          this.places.push(place);
          break;
        }

        attempts++;
      }
    }
    this.generateRoutes();
    populatePlaces(this.places);
  }

  getTravelersInTransit() {
    return this.places.flatMap((p) => p.routes).flatMap((r) => r.travelers)
      .filter((v) => v.travelProgress >= 0 && v.travelProgress < 1);
  }

  update() {
    this.tick++;

    this.places.forEach((place) => place.update(this.tick));

    this.places.forEach((place) => {
      place.population.forEach((dweller) => dweller.update(this.tick));
    });

    this.getTravelersInTransit().forEach((traveler) => traveler.update(this.tick));
  }
}
