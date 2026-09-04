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

const EPS = 1e-9;

function orientation(ax, ay, bx, by, cx, cy) {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(v) < EPS) return 0;
  return v > 0 ? 1 : -1;
}

export function segmentsOverlap(x1, y1, x2, y2, x3, y3, x4, y4) {
  const o1 = orientation(x1, y1, x2, y2, x3, y3);
  const o2 = orientation(x1, y1, x2, y2, x4, y4);
  const o3 = orientation(x3, y3, x4, y4, x1, y1);
  const o4 = orientation(x3, y3, x4, y4, x2, y2);

  if (o1 * o2 < 0 && o3 * o4 < 0) {
    return true;
  }

  if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
    const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
    const pts1 = horizontal
      ? [Math.min(x1, x2), Math.max(x1, x2)]
      : [Math.min(y1, y2), Math.max(y1, y2)];
    const pts2 = horizontal
      ? [Math.min(x3, x4), Math.max(x3, x4)]
      : [Math.min(y3, y4), Math.max(y3, y4)];
    return Math.min(pts1[1], pts2[1]) - Math.max(pts1[0], pts2[0]) > EPS;
  }

  return false;
}
