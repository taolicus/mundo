import { distance } from "../core/utils.js";
import { settings } from "../core/settings.js";
import { events } from "../core/events.js";
import { World } from "../entities/world.js";
import { drawWorld, buildRoutesPath } from "./render.js";
import { showPlace, showDweller, updatePanel, hidePanel, setWorld } from "./panel.js";

events.debug = Boolean(window.__DEBUG__) || location.search.includes("debug");

function getRegion(x, y, places) {
  for (const place of places) {
    if (distance(x, y, place.x, place.y) <= settings.drawSize) {
      return place;
    }
  }
  return null;
}

function getTravelerPos(traveler) {
  const pos = traveler.route.getPositionOnRoute(traveler.travelProgress);
  return { x: pos.x, y: pos.y };
}

function hitTestTraveler(x, y, world) {
  for (const traveler of world.getTravelersInTransit()) {
    const pos = getTravelerPos(traveler);
    if (distance(x, y, pos.x, pos.y) <= 14) return traveler;
  }
  return null;
}

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let world;
let routesDrawing;
let focusDweller = null;

document.addEventListener("focus-dweller", (e) => {
  focusDweller = e.detail;
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.textAlign = "center";
  ctx.font = settings.drawSize * 0.8 + "px 'IBM Plex Mono', sans-serif";
  ctx.letterSpacing = "2px";
  if (world) {
    world.width = canvas.width;
    world.height = canvas.height;
  }
}

resize();

world = new World(canvas.width, canvas.height);
setWorld(world);
routesDrawing = buildRoutesPath(world);
drawWorld(ctx, world, 0, routesDrawing, focusDweller);

window.addEventListener("resize", () => {
  resize();
  drawWorld(ctx, world, 0, routesDrawing, focusDweller);
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const place = getRegion(x, y, world.places);

  if (place) {
    focusDweller = null;
    showPlace(place);
  } else {
    const traveler = hitTestTraveler(x, y, world);
    if (traveler) {
      focusDweller = traveler;
      showDweller(traveler);
    } else {
      focusDweller = null;
      hidePanel();
    }
  }
});

const tickBtn = document.getElementById("tick");
const toggleBtn = document.getElementById("toggle");

const statTick = document.getElementById("statTick");
const statPopulation = document.getElementById("statPopulation");

function updateStats() {
  const population =
    world.places.reduce((sum, p) => sum + p.population.length, 0) +
    world.getTravelersInTransit().length;
  statTick.textContent = world.tick;
  statPopulation.textContent = population;
}

updateStats();

const frameDuration = 1000 / settings.fps;
let lastTime;
let accumulator = 0;
let animationId;
let isRunning = false;

function toggle() {
  if (isRunning) {
    cancelAnimationFrame(animationId);
    isRunning = false;
    tickBtn.disabled = false;
    toggleBtn.textContent = "Play";
  } else {
    lastTime = performance.now();
    accumulator = 0;
    isRunning = true;
    animationId = requestAnimationFrame(loop);
    tickBtn.disabled = true;
    toggleBtn.textContent = "Pause";
  }
}

function tick() {
  if (!isRunning) {
    world.update();
    drawWorld(ctx, world, 0, routesDrawing, focusDweller);
    updateStats();
    updatePanel();
  }
}

function loop(currentTime) {
  let deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (deltaTime > 1000) deltaTime = frameDuration;

  accumulator += deltaTime;

  while (accumulator >= frameDuration) {
    world.update();
    accumulator -= frameDuration;
  }

  const alpha = accumulator / frameDuration;
  drawWorld(ctx, world, alpha, routesDrawing, focusDweller);
  updateStats();
  updatePanel();

  animationId = requestAnimationFrame(loop);
}

tickBtn.addEventListener("click", tick);
toggleBtn.addEventListener("click", toggle);
