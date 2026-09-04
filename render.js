import { ajustes } from "./ajustes.js";

export function construirRutasPath(mundo) {
  const path = new Path2D();
  for (const lugar of mundo.lugares) {
    for (const ruta of lugar.rutas) {
      if (lugar !== ruta.origen) continue;
      path.moveTo(ruta.origen.x, ruta.origen.y);
      path.lineTo(ruta.destino.x, ruta.destino.y);
    }
  }
  return path;
}

function colorTemperatura(temp) {
  let r, g, b;
  if (temp <= ajustes.TEMP_FRIO_MAX) {
    r = 255; g = 255; b = 255;
  } else if (temp <= ajustes.TEMP_TEMPLADO_MAX) {
    const t = (temp - ajustes.TEMP_FRIO_MAX) / (ajustes.TEMP_TEMPLADO_MAX - ajustes.TEMP_FRIO_MAX);
    r = Math.round(255 + (0 - 255) * t);
    g = Math.round(255 + (255 - 255) * t);
    b = Math.round(255 + (0 - 255) * t);
  } else {
    const t = Math.min(1, (temp - ajustes.TEMP_TEMPLADO_MAX) / ajustes.TEMP_CALUROSO_RANGO);
    r = Math.round(0 + (255 - 0) * t);
    g = Math.round(255 + (255 - 255) * t);
    b = Math.round(0 + (0 - 0) * t);
  }
  return `rgb(${r},${g},${b})`;
}

export function dibujarMundo(ctx, mundo, alpha, dibujoRutas) {
  ctx.clearRect(0, 0, mundo.width, mundo.height);

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.stroke(dibujoRutas);

  ctx.fillStyle = "#0f0";
  mundo.obtenerViajantesEnTransito().forEach((viajante) => {
    const progresoActual = viajante.progresoViaje;
    const progresoSiguiente = Math.min(
      1,
      (viajante.tiempoViajeTranscurrido + 1) / viajante.tiempoViajeTotal
    );

    const posicionActual =
      viajante.ruta.obtenerPosicionEnRuta(progresoActual);
    const posicionSiguiente =
      viajante.ruta.obtenerPosicionEnRuta(progresoSiguiente);

    const posicionInterpoladaX =
      posicionActual.x + (posicionSiguiente.x - posicionActual.x) * alpha;
    const posicionInterpoladaY =
      posicionActual.y + (posicionSiguiente.y - posicionActual.y) * alpha;

    ctx.beginPath();
    ctx.arc(posicionInterpoladaX, posicionInterpoladaY, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  for (const lugar of mundo.lugares) {
    ctx.fillStyle = colorTemperatura(lugar.temperatura);
    ctx.beginPath();
    ctx.arc(lugar.x, lugar.y, ajustes.tamanoDibujo, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(lugar.nombre, lugar.x, lugar.y + ajustes.tamanoDibujo * 2);
  }
}
