import { settings } from "../core/settings.js";

export function buildRoutesPath(world) {
  const path = new Path2D();
  for (const place of world.places) {
    for (const route of place.routes) {
      if (place !== route.origin) continue;
      path.moveTo(route.origin.x, route.origin.y);
      path.lineTo(route.destination.x, route.destination.y);
    }
  }
  return path;
}

function tempColor(temp) {
  const stops = [
    [-1, [255, 255, 255]],
    [0, [170, 210, 255]],
    [1, [64, 142, 76]],
    [2, [170, 135, 70]],
    [3, [224, 94, 44]],
  ];

  const coldWidth =
    settings.mildTempMax - settings.coldTempMax;
  const extremeCold = settings.coldTempMax - coldWidth;

  let at;
  if (temp <= settings.coldTempMax) {
    at = (temp - extremeCold) / (settings.coldTempMax - extremeCold) - 1;
  } else if (temp <= settings.mildTempMax) {
    at = (temp - settings.coldTempMax) / coldWidth;
  } else {
    at = 1 + ((temp - settings.mildTempMax) / settings.hotTempRange) * 2;
  }
  at = Math.max(-1, Math.min(3, at));

  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (at >= stops[i][0] && at <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0];
  const t = span === 0 ? 1 : (at - lo[0]) / span;
  const rgb = lo[1].map((c, i) =>
    Math.round(c + (hi[1][i] - c) * t)
  );
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

export function drawWorld(ctx, world, alpha, routesDrawing, focus) {
  ctx.clearRect(0, 0, world.width, world.height);

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.stroke(routesDrawing);

  ctx.fillStyle = "#0f0";
  world.getTravelersInTransit().forEach((traveler) => {
    const pos = interpolatedPos(traveler, alpha);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  if (focus && focus.alive) {
    let pos = null;
    if (focus.route) {
      pos = interpolatedPos(focus, alpha);
    } else if (focus.place) {
      pos = { x: focus.place.x, y: focus.place.y };
    }
    if (pos) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const place of world.places) {
    ctx.fillStyle = tempColor(place.temperature);
    ctx.beginPath();
    ctx.arc(place.x, place.y, settings.drawSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(place.name, place.x, place.y + settings.drawSize * 2);
  }
}

function interpolatedPos(traveler, alpha) {
  const currentProgress = traveler.travelProgress;
  const nextProgress = Math.min(
    1,
    (traveler.elapsedTravelTime + 1) / traveler.totalTravelTime
  );

  const currentPos = traveler.route.getPositionOnRoute(currentProgress);
  const nextPos = traveler.route.getPositionOnRoute(nextProgress);

  return {
    x: currentPos.x + (nextPos.x - currentPos.x) * alpha,
    y: currentPos.y + (nextPos.y - currentPos.y) * alpha,
  };
}
