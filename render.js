import { settings } from "./settings.js";

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

export function drawWorld(ctx, world, alpha, routesDrawing) {
  ctx.clearRect(0, 0, world.width, world.height);

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.stroke(routesDrawing);

  ctx.fillStyle = "#0f0";
  world.getTravelersInTransit().forEach((traveler) => {
    const currentProgress = traveler.travelProgress;
    const nextProgress = Math.min(
      1,
      (traveler.elapsedTravelTime + 1) / traveler.totalTravelTime
    );

    const currentPos =
      traveler.route.getPositionOnRoute(currentProgress);
    const nextPos =
      traveler.route.getPositionOnRoute(nextProgress);

    const interpX =
      currentPos.x + (nextPos.x - currentPos.x) * alpha;
    const interpY =
      currentPos.y + (nextPos.y - currentPos.y) * alpha;

    ctx.beginPath();
    ctx.arc(interpX, interpY, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  for (const place of world.places) {
    ctx.fillStyle = tempColor(place.temperature);
    ctx.beginPath();
    ctx.arc(place.x, place.y, settings.drawSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(place.name, place.x, place.y + settings.drawSize * 2);
  }
}
