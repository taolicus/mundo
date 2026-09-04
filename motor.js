import { obtenerLugar } from "./funciones.js";
import { ajustes } from "./ajustes.js";
import { Mundo } from "./mundo.js";
import { mostrarLugar, actualizarPanel, ocultarPanel } from "./panel.js";

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let mundo;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.textAlign = "center";
  ctx.font = ajustes.tamanoDibujo * 0.8 + "px 'IBM Plex Mono', sans-serif";
  ctx.letterSpacing = "2px";
  if (mundo) {
    mundo.width = canvas.width;
    mundo.height = canvas.height;
  }
}

resize();

mundo = new Mundo(canvas.width, canvas.height);
mundo.dibujar(ctx);

window.addEventListener("resize", () => {
  resize();
  mundo.dibujar(ctx, 0);
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const lugar = obtenerLugar(x, y, mundo.lugares);

  if (lugar) {
    mostrarLugar(lugar);
  } else {
    ocultarPanel();
  }
});

const tickBtn = document.getElementById("tick");
const pauseBtn = document.getElementById("pause");
const playBtn = document.getElementById("play");

const statTick = document.getElementById("statTick");
const statPoblacion = document.getElementById("statPoblacion");
const statRecursos = document.getElementById("statRecursos");
const statDescubrimientos = document.getElementById("statDescubrimientos");

function actualizarStats() {
  const poblacion = mundo.lugares.reduce(
    (sum, l) => sum + l.habitantes.length,
    0
  );
  const recursos = mundo.lugares.reduce(
    (sum, l) => sum + l.recursos.length,
    0
  );
  const descubrimientos = mundo.lugares.reduce(
    (sum, l) => sum + l.descubrimientos.length,
    0
  );
  statTick.textContent = mundo.tick;
  statPoblacion.textContent = poblacion;
  statRecursos.textContent = recursos;
  statDescubrimientos.textContent = descubrimientos;
}

actualizarStats();

const frameDuration = 1000 / ajustes.fps;
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
    mundo.actualizar();
    mundo.dibujar(ctx, 0);
    actualizarStats();
    actualizarPanel();
  }
}

function loop(currentTime) {
  let deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (deltaTime > 1000) deltaTime = frameDuration;

  accumulator += deltaTime;

  while (accumulator >= frameDuration) {
    mundo.actualizar();
    accumulator -= frameDuration;
  }

  const alpha = accumulator / frameDuration;
  mundo.dibujar(ctx, alpha);
  actualizarStats();
  actualizarPanel();

  animationId = requestAnimationFrame(loop);
}

pause();

tickBtn.addEventListener("click", tick);
pauseBtn.addEventListener("click", pause);
playBtn.addEventListener("click", play);
