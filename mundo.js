import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  generarNombre,
  calcularDistancia,
  log,
} from "./funciones.js";
import { Lugar, Ruta } from "./lugar.js";
import { Habitante } from "./habitante.js";

export class Mundo {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.lugares = [];
    this.tick = 0;
    this.dibujoRutas = new Path2D();
    this.generarLugares();
  }

  agregarLugar() {
    let intentos = 0;

    while (intentos < ajustes.maxIntentosColocacion) {
      const lugar = new Lugar(
        generarNombre(),
        numberoAleatorioEntre(
          ajustes.tamanoDibujo,
          this.width - ajustes.tamanoDibujo * 2
        ),
        numberoAleatorioEntre(
          ajustes.tamanoDibujo,
          this.height - ajustes.tamanoDibujo * 2
        )
      );

      const demasiadoCerca = this.lugares.some(
        (lugarExistente) =>
          calcularDistancia(lugar, lugarExistente) < ajustes.distanciaMinimaLugares
      );

      if (!demasiadoCerca || this.lugares.length === 0) {
        this.lugares.push(lugar);
        return;
      }

      intentos++;
    }
  }

  generarRutas() {
    for (let i = 0; i < this.lugares.length; i++) {
      for (let j = i + 1; j < this.lugares.length; j++) {
        const distancia = calcularDistancia(this.lugares[i], this.lugares[j]);
        if (distancia <= ajustes.distanciaMaximaRuta) {
          this.lugares[i].rutas.push(new Ruta(this.lugares[i], this.lugares[j]));
          this.lugares[j].rutas.push(new Ruta(this.lugares[j], this.lugares[i]));
          this.dibujoRutas.moveTo(this.lugares[i].x, this.lugares[i].y);
          this.dibujoRutas.lineTo(this.lugares[j].x, this.lugares[j].y);
        }
      }
    }
  }

  generarLugares() {
    for (let i = 0; i < ajustes.cantLugares; i++) {
      this.agregarLugar();
    }
    this.generarRutas();

    this.lugares.forEach((lugar) => {
      const cantidad = numberoAleatorioEntre(ajustes.habitantesPorLugarMin, ajustes.habitantesPorLugarMax);
      for (let i = 0; i < cantidad; i++) {
        const nombre = generarNombre();
        const habitante = new Habitante(nombre, lugar, lugar);
        lugar.habitantes.push(habitante);
      }
    });

    this.lugares.forEach((lugar) => {
      lugar.habitantes.forEach((habitante) => {
        habitante.generarRelaciones();
        habitante.asignarTrabajo();
      });
    });
  }

  obtenerViajantesEnTransito() {
    return this.lugares.flatMap((l) => l.rutas).flatMap((r) => r.viajantes)
      .filter((v) => v.progresoViaje >= 0 && v.progresoViaje < 1);
  }

  actualizar() {
    this.tick++;
    log("T:", this.tick);

    this.lugares.forEach((lugar) => lugar.actualizar(this.tick));

    this.lugares.forEach((lugar) => {
      lugar.habitantes.forEach((habitante) => habitante.actualizar());
    });

    this.obtenerViajantesEnTransito().forEach((viajante) => viajante.actualizar());
  }

  colorTemperatura(temp) {
    let r, g, b;
    if (temp <= ajustes.TEMP_FRIO_MAX) {
      r = 68; g = 136; b = 255;
    } else if (temp <= ajustes.TEMP_TEMPLADO_MAX) {
      const t = (temp - ajustes.TEMP_FRIO_MAX) / (ajustes.TEMP_TEMPLADO_MAX - ajustes.TEMP_FRIO_MAX);
      r = Math.round(68 + (255 - 68) * t);
      g = Math.round(136 + (255 - 136) * t);
      b = Math.round(255 + (255 - 255) * t);
    } else {
      const t = Math.min(1, (temp - ajustes.TEMP_TEMPLADO_MAX) / ajustes.TEMP_CALUROSO_RANGO);
      r = Math.round(255 + (255 - 255) * t);
      g = Math.round(255 + (68 - 255) * t);
      b = Math.round(255 + (68 - 255) * t);
    }
    return `rgb(${r},${g},${b})`;
  }

  dibujar(ctx, alpha) {
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.stroke(this.dibujoRutas);

    ctx.fillStyle = "#0f0";
    this.obtenerViajantesEnTransito().forEach((viajante) => {
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

    for (const lugar of this.lugares) {
      ctx.fillStyle = this.colorTemperatura(lugar.temperatura);
      ctx.beginPath();
      ctx.arc(lugar.x, lugar.y, ajustes.tamanoDibujo, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(lugar.nombre, lugar.x, lugar.y + ajustes.tamanoDibujo * 2);
    }
  }
}
