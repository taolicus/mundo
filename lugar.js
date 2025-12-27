import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  generarNombre,
  umbral,
  log,
} from "./funciones.js";
import { Habitante } from "./habitante.js";

class Recurso {
  constructor(nombre, origen) {
    this.nombre = nombre;
    this.peso = numberoAleatorioEntre(1, 99);
    this.cantidad = numberoAleatorioEntre(1, 99);
    this.origen = origen;
  }
}

export class Ruta {
  constructor(origen, destino) {
    this.origen = origen;
    this.destino = destino;
    this.viajantes = [];
    this.distancia = this.calcularDistancia();
    this.tiempoViaje = Math.max(1, Math.floor(this.distancia / 10));
  }

  calcularDistancia() {
    const dx = this.destino.x - this.origen.x;
    const dy = this.destino.y - this.origen.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  agregarViajante(habitante) {
    if (!this.viajantes.includes(habitante)) {
      this.viajantes.push(habitante);
    }
  }

  removerViajante(habitante) {
    this.viajantes = this.viajantes.filter((v) => v !== habitante);
  }

  obtenerPosicionEnRuta(progreso) {
    return {
      x: this.origen.x + (this.destino.x - this.origen.x) * progreso,
      y: this.origen.y + (this.destino.y - this.origen.y) * progreso,
    };
  }
}

export class Lugar {
  constructor(nombre, x, y) {
    this.nombre = nombre;
    this.x = x;
    this.y = y;
    this.temperatura = 0;
    this.recursos = [];
    this.habitantes = [];
    this.rutas = [];
    this.generarRecursos();
    this.generarHabitantes();
    this.habitantes.forEach((habitante) => {
      habitante.generarRelaciones();
    });
  }

  generarRecursos() {
    const cantidad = ajustes.recursosPorLugar;
    for (let i = 0; i < cantidad; i++) {
      const nombre = generarNombre();
      const recurso = new Recurso(nombre, this);
      this.recursos.push(recurso);
    }
  }

  generarHabitantes() {
    const cantidad = ajustes.habitantesPorLugar;
    for (let i = 0; i < cantidad; i++) {
      const nombre = generarNombre();
      const habitante = new Habitante(nombre, this, this);
      this.habitantes.push(habitante);
    }
  }

  calcularTemperatura(t, yEcuador = 500) {
    const diaActual = t / ajustes.horasDia;

    const distanciaEcuador = Math.abs(yEcuador - this.y);
    const tempBase =
      ajustes.TEMP_MAX_BASE - distanciaEcuador * ajustes.ENFRIAMIENTO_Y;

    const variacionAnual =
      Math.sin((2 * Math.PI * diaActual) / ajustes.diasEnAnio) *
      ajustes.AMPLITUD_ANUAL;

    const variacionDiaria =
      Math.sin((2 * Math.PI * (t - 6)) / ajustes.horasDia) *
      ajustes.AMPLITUD_DIARIA;

    this.temperatura = tempBase + variacionAnual + variacionDiaria;
  }

  actualizar(t) {
    this.calcularTemperatura(t);
    this.habitantes.forEach((habitante) => habitante.actualizar());
    // producir recursos nuevos
    this.recursos.forEach((recurso) => {
      if (umbral(0.1)) {
        const cantidad = numberoAleatorioEntre(1, 10);
        recurso.cantidad += cantidad;
        log(
          `${this.nombre} ha producido ${cantidad} nuevas unidades de ${recurso.nombre}`
        );
      }
    });
  }
}
