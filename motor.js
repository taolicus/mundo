import { log, obtenerLugar } from "./funciones.js";
import { ajustes } from "./ajustes.js";
import { Mundo } from "./mundo.js";

const dpr = window.devicePixelRatio || 1;

const canvas = document.getElementById("canvas");

const width = 800;
const height = 600;

canvas.style.width = width + "px";
canvas.style.height = height + "px";

canvas.width = width * dpr;
canvas.height = height * dpr;

const ctx = canvas.getContext("2d");
ctx.textAlign = "center";
ctx.font = ajustes.tamanoDibujo * 0.8 + "px 'IBM Plex Mono', sans-serif";
ctx.letterSpacing = "2px";

const mundo = new Mundo(canvas.width, canvas.height);
mundo.dibujar(ctx);

canvas.addEventListener("click", (event) => {
  // Obtener coordenadas del click considerando el device pixel ratio
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const lugar = obtenerLugar(x, y, mundo.lugares);

  if (lugar) log(lugar);
});

const tickBtn = document.getElementById("tick");
const pauseBtn = document.getElementById("pause");
const playBtn = document.getElementById("play");

const fps = 30;
const frameDuration = 2000 / fps;
let lastTime;
let accumulator = 0;
let animationId;
let isPaused = true; // Track pause state

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
    // Execute exactly one frame's worth of updates
    mundo.actualizar(frameDuration);

    // Render with alpha = 0 (no interpolation since we're doing exact steps)
    mundo.dibujar(ctx, 0);
  }
}

function loop(currentTime) {
  // Calculate how much time has passed
  let deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Avoid spiral of death with large deltaTime
  if (deltaTime > 1000) deltaTime = frameDuration;

  // Accumulate the time that hasn't been simulated yet
  accumulator += deltaTime;

  // Simulate the game state in fixed steps
  while (accumulator >= frameDuration) {
    mundo.actualizar(frameDuration); // Fixed timestep
    accumulator -= frameDuration;
  }

  // Calculate interpolation factor for smooth rendering
  const alpha = accumulator / frameDuration;
  mundo.dibujar(ctx, alpha);

  animationId = requestAnimationFrame(loop);
}

pause();

tickBtn.addEventListener("click", tick);
pauseBtn.addEventListener("click", pause);
playBtn.addEventListener("click", play);
