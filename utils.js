import { settings } from "./settings.js";

export function randomIntBetween(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

export function randomLetter(offset) {
  return String.fromCharCode(offset + Math.floor(Math.random() * 26));
}

export function generateName() {
  const first = randomLetter(65);
  const second = randomLetter(97);
  const third = randomLetter(97);

  return first + second + third;
}

export function calculateDistance(placeA, placeB) {
  const dx = placeB.x - placeA.x;
  const dy = placeB.y - placeA.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getRegion(x, y, places) {
  for (const place of places) {
    const dist = Math.sqrt(
      Math.pow(x - place.x, 2) + Math.pow(y - place.y, 2)
    );
    if (dist <= settings.drawSize) {
      return place;
    }
  }
  return null;
}

export function getDweller(x, y, places) {
  for (const place of places) {
    for (const dweller of place.habitants) {
      const dist = Math.sqrt(
        Math.pow(x - place.x, 2) + Math.pow(y - place.y, 2)
      );
      if (dist <= settings.drawSize / 2) {
        return dweller;
      }
    }
  }
  return null;
}

export function randomIndex(collection) {
  return Math.floor(Math.random() * collection.length);
}

export function randomElement(collection) {
  return collection[randomIndex(collection)];
}

export function weightedPick(entries) {
  const total = entries.reduce((sum, [_, weight]) => sum + weight, 0);
  let r = Math.random() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function chance(pct) {
  return Math.random() < pct;
}

export const log = console.log;
