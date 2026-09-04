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

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateDistance(placeA, placeB) {
  return distance(placeA.x, placeA.y, placeB.x, placeB.y);
}

export function randomIndex(collection) {
  return Math.floor(Math.random() * collection.length);
}

export function randomElement(collection) {
  return collection[randomIndex(collection)];
}

export function randomSample(collection, count) {
  const pool = [...collection];
  const out = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(randomIndex(pool), 1)[0]);
  }
  return out;
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
