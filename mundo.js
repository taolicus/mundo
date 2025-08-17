import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  generarNombre,
  calcularDistancia,
  log,
} from "./funciones.js";
import { Lugar } from "./lugar.js";

export class Mundo {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.lugares = [];
    this.tick = 0;
    this.viajes = [];
    this.dibujoRutas = new Path2D();
    this.generarLugares();
  }

  agregarLugar(distanciaMinima = 200) {
    let intentos = 0;
    const maxIntentos = 100;

    while (intentos < maxIntentos) {
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
          calcularDistancia(lugar, lugarExistente) < distanciaMinima
      );

      if (!demasiadoCerca || this.lugares.length === 0) {
        this.lugares.push(lugar);
        return;
      }

      intentos++;
    }
  }

  generarRutas(distanciaMaxima = 600) {
    for (let i = 0; i < this.lugares.length; i++) {
      for (let j = i + 1; j < this.lugares.length; j++) {
        const distancia = calcularDistancia(this.lugares[i], this.lugares[j]);
        if (distancia <= distanciaMaxima) {
          this.lugares[i].rutas.push(this.lugares[j]);
          this.lugares[j].rutas.push(this.lugares[i]);
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
  }

  actualizar() {
    this.tick++;
    log("T:", this.tick);

    this.lugares.forEach((lugar) => lugar.actualizar());

    // Generar necesidades
    const recursos = this.lugares.flatMap((lugar) => lugar.recursos);
    this.lugares
      .flatMap((lugar) => lugar.habitantes)
      .forEach((habitante) => {
        habitante.generarNecesidad(recursos);
      });

    // Calcular viajes
    this.viajes = this.lugares
      .flatMap((lugar) => lugar.habitantes)
      .filter((habitante) => habitante.enTransito);
  }

  dibujar(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    // Rutas
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.stroke(this.dibujoRutas);

    // Viajes
    ctx.fillStyle = "green";
    this.viajes.forEach((habitante) => {
      const ruta = habitante.rutaActual;
      const progreso = habitante.progresoViaje;

      const x = ruta.origen.x + (ruta.destino.x - ruta.origen.x) * progreso;
      const y = ruta.origen.y + (ruta.destino.y - ruta.origen.y) * progreso;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Lugares
    ctx.fillStyle = "#fff";
    for (const lugar of this.lugares) {
      ctx.beginPath();
      ctx.arc(lugar.x, lugar.y, ajustes.tamanoDibujo, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(lugar.nombre, lugar.x, lugar.y + ajustes.tamanoDibujo * 2);
    }
  }
}
