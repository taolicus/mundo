import { settings } from "../core/settings.js";
import {
  randomIntBetween,
  generateName,
  calculateDistance,
  segmentsOverlap,
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
    const places = this.places;
    const candidates = [];
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const dist = calculateDistance(places[i], places[j]);
        if (dist <= settings.maxRouteDistance) {
          candidates.push([i, j, dist]);
        }
      }
    }
    candidates.sort((a, b) => a[2] - b[2]);

    const accepted = [];
    const overlaps = (i, j) =>
      accepted.some(([a, b]) =>
        segmentsOverlap(
          places[a].x, places[a].y, places[b].x, places[b].y,
          places[i].x, places[i].y, places[j].x, places[j].y
        )
      );
    for (const [i, j] of candidates) {
      if (overlaps(i, j)) continue;
      accepted.push([i, j]);
    }

    const parent = places.map((_, idx) => idx);
    const find = (x) => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a, b) => {
      parent[find(a)] = find(b);
    };
    for (const [i, j] of accepted) union(i, j);

    for (const [i, j] of candidates) {
      if (find(i) === find(j)) continue;
      if (overlaps(i, j)) continue;
      accepted.push([i, j]);
      union(i, j);
    }
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        if (find(i) === find(j)) continue;
        accepted.push([i, j]);
        union(i, j);
      }
    }

    for (const [i, j] of accepted) {
      places[i].routes.push(new Route(places[i], places[j]));
      places[j].routes.push(new Route(places[j], places[i]));
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
