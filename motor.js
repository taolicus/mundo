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

function tick() {
  mundo.actualizar();
  mundo.dibujar(ctx);
}

const tickBtn = document.getElementById("tick");
tickBtn.addEventListener("click", tick);
