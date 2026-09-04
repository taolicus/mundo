import { getRegion } from "./utils.js";
import { settings } from "./settings.js";
import { World } from "./world.js";
import { drawWorld, buildRoutesPath } from "./render.js";
import { showPlace, updatePanel, hidePanel } from "./panel.js";

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let world;
let routesDrawing;

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
routesDrawing = buildRoutesPath(world);
drawWorld(ctx, world, 0, routesDrawing);

window.addEventListener("resize", () => {
  resize();
  drawWorld(ctx, world, 0, routesDrawing);
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const place = getRegion(x, y, world.places);

  if (place) {
    showPlace(place);
  } else {
    hidePanel();
  }
});

const tickBtn = document.getElementById("tick");
const pauseBtn = document.getElementById("pause");
const playBtn = document.getElementById("play");

const statTick = document.getElementById("statTick");
const statPopulation = document.getElementById("statPopulation");

function updateStats() {
  const population =
    world.places.reduce((sum, p) => sum + p.habitants.length, 0) +
    world.getTravelersInTransit().length;
  statTick.textContent = world.tick;
  statPopulation.textContent = population;
}

updateStats();

const frameDuration = 1000 / settings.fps;
let lastTime;
let accumulator = 0;
let animationId;
let isPaused = true;

function play() {
  if (isPaused) {
    lastTime = performance.now();
    accumulator = 0;
    isPaused = false;
    animationId = requestAnimationFrame(loop);
    tickBtn.disabled = true;
  }
}

function pause() {
  if (!isPaused) {
    cancelAnimationFrame(animationId);
    isPaused = true;
    tickBtn.disabled = false;
  }
}

function tick() {
  if (isPaused) {
    world.update();
    drawWorld(ctx, world, 0, routesDrawing);
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
  drawWorld(ctx, world, alpha, routesDrawing);
  updateStats();
  updatePanel();

  animationId = requestAnimationFrame(loop);
}

pause();

tickBtn.addEventListener("click", tick);
pauseBtn.addEventListener("click", pause);
playBtn.addEventListener("click", play);
