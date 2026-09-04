import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  generarNombre,
  calcularDistancia,
  log,
} from "./funciones.js";
import { Lugar, Ruta } from "./lugar.js";
import { poblarLugares } from "./poblacion.js";

export class Mundo {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.lugares = [];
    this.tick = 0;
    this.generarLugares();
  }

  generarRutas() {
    for (let i = 0; i < this.lugares.length; i++) {
      for (let j = i + 1; j < this.lugares.length; j++) {
        const distancia = calcularDistancia(this.lugares[i], this.lugares[j]);
        if (distancia <= ajustes.distanciaMaximaRuta) {
          this.lugares[i].rutas.push(new Ruta(this.lugares[i], this.lugares[j]));
          this.lugares[j].rutas.push(new Ruta(this.lugares[j], this.lugares[i]));
        }
      }
    }
  }

  generarLugares() {
    for (let i = 0; i < ajustes.cantLugares; i++) {
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
          break;
        }

        intentos++;
      }
    }
    this.generarRutas();
    poblarLugares(this.lugares);
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
      lugar.habitantes.forEach((habitante) => habitante.actualizar(this.tick));
    });

    this.obtenerViajantesEnTransito().forEach((viajante) => viajante.actualizar(this.tick));
  }
}
