import { randomIntBetween, generateName } from "../core/utils.js";
import { Dweller } from "./dweller.js";
import { settings } from "../core/settings.js";

export function populatePlaces(places) {
  places.forEach((place) => {
    const count = randomIntBetween(
      settings.dwellersPerPlaceMin,
      settings.dwellersPerPlaceMax
    );
    for (let i = 0; i < count; i++) {
      place.habitants.push(newDweller(place, 0));
    }
  });
}

export function newDweller(place, tick) {
  const name = generateName();
  return new Dweller(name, place, place, tick);
}
