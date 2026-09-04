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
  let r, g, b;
  if (temp <= settings.coldTempMax) {
    r = 255; g = 255; b = 255;
  } else if (temp <= settings.mildTempMax) {
    const t = (temp - settings.coldTempMax) / (settings.mildTempMax - settings.coldTempMax);
    r = Math.round(255 + (0 - 255) * t);
    g = Math.round(255 + (255 - 255) * t);
    b = Math.round(255 + (0 - 255) * t);
  } else {
    const t = Math.min(1, (temp - settings.mildTempMax) / settings.hotTempRange);
    r = Math.round(0 + (255 - 0) * t);
    g = Math.round(255 + (255 - 255) * t);
    b = Math.round(0 + (0 - 0) * t);
  }
  return `rgb(${r},${g},${b})`;
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
