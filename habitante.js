import {
  numberoAleatorioEntre,
  elementoAleatorio,
  umbral,
  log,
} from "./funciones.js";

const RELACION_HABITANTES = ["familiar", "amistad", "colega", "contacto"];

class Necesidad {
  constructor(recurso, frecuencia = 0) {
    this.recurso = recurso;
    this.cantidad = numberoAleatorioEntre(1, 5);
    this.ultimoConsumo = 0;
    this.frecuencia = frecuencia;
  }
}

class Relacion {
  constructor(tipo, con, intensidad) {
    this.tipo = tipo;
    this.con = con;
    this.intensidad = intensidad;
  }
}

export class Habitante {
  constructor(nombre, origen, lugar) {
    this.nombre = nombre;
    this.edad = numberoAleatorioEntre(1, 100);
    this.origen = origen;
    this.vive = true;
    this.necesidades = [];
    this.relaciones = [];
    this.lugar = lugar;
    this.rutaActual = null;
    this.progresoViaje = 0;
    this.tiempoViajeTotal = 0;
    this.tiempoViajeTranscurrido = 0;
  }

  agregarRelacion(habitante, tipo, intensidad) {
    const relacion = new Relacion(tipo, habitante, intensidad);
    this.relaciones.push(relacion);
  }

  generarRelaciones() {
    const otrosHabitantes = this.lugar.habitantes.filter((h) => h !== this);
    const maxRelaciones = Math.ceil(otrosHabitantes.length * 0.1);
    const cantidadRelaciones = numberoAleatorioEntre(0, maxRelaciones);

    // Seleccionar habitantes aleatorios para relacionarse
    const habitantesRelacionados = [];
    while (
      habitantesRelacionados.length < cantidadRelaciones &&
      otrosHabitantes.length > 0
    ) {
      const nuevaRelacion = elementoAleatorio(otrosHabitantes);

      // Verificar que no tenga ya una relación con este habitante
      if (!this.relaciones.some((r) => r.con === nuevaRelacion)) {
        habitantesRelacionados.push(nuevaRelacion);
        otrosHabitantes.splice(otrosHabitantes.indexOf(nuevaRelacion), 1); // Evitar duplicados
      }
    }

    for (const habitanteRelacionado of habitantesRelacionados) {
      const tipoRelacion = elementoAleatorio(RELACION_HABITANTES);
      const intensidad = numberoAleatorioEntre(1, 3);

      // Crear relación bidireccional
      this.agregarRelacion(habitanteRelacionado, tipoRelacion, intensidad);
      habitanteRelacionado.agregarRelacion(this, tipoRelacion, intensidad);
    }
  }

  generarNecesidad(recursos) {
    if (umbral(0.05)) {
      const recurso = elementoAleatorio(recursos);
      const necesidad = new Necesidad(recurso);
      this.necesidades.push(necesidad);
      log(
        `${this.nombre} (${this.lugar.nombre}) necesita ${necesidad.cantidad} unidades de ${necesidad.recurso.nombre} (${necesidad.recurso.origen.nombre})`
      );
    }
  }

  iniciarViaje(destino) {
    this.rutaActual = {
      origen: this.lugar,
      destino: destino,
    };
    this.lugar.habitantes = this.lugar.habitantes.filter((h) => h !== this);
    this.lugar.rutas
      .find((ruta) => ruta.destino === this.rutaActual.destino)
      .viajantes.push(this);
    this.lugar = null;

    // Calcular tiempo de viaje basado en distancia (10px por tick)
    const distancia = Math.sqrt(
      Math.pow(destino.x - this.rutaActual.origen.x, 2) +
        Math.pow(destino.y - this.rutaActual.origen.y, 2)
    );
    this.tiempoViajeTotal = Math.max(1, Math.floor(distancia / 10));
    this.tiempoViajeTranscurrido = 0;
    this.progresoViaje = 0;
    log(
      `${this.nombre} ha iniciado un viaje desde ${this.rutaActual.origen.nombre} hacia ${this.rutaActual.destino.nombre}`
    );
  }

  viajar() {
    this.tiempoViajeTranscurrido++;
    this.progresoViaje = this.tiempoViajeTranscurrido / this.tiempoViajeTotal;
    if (this.tiempoViajeTranscurrido >= this.tiempoViajeTotal) {
      const ruta = this.rutaActual.origen.rutas.find(
        (ruta) => ruta.destino === this.rutaActual.destino
      );
      ruta.viajantes = ruta.viajantes.filter((v) => v !== this);
      this.lugar = this.rutaActual.destino;
      this.lugar.habitantes.push(this);
      log(
        `${this.nombre} ha llegado a ${this.rutaActual.destino.nombre} desde ${this.rutaActual.origen.nombre}`
      );
      this.rutaActual = null;
    }
  }

  actualizar() {
    if (this.rutaActual) {
      this.viajar();
    } else {
      if (this.lugar.rutas.length > 0 && umbral(0.001)) {
        const destino = elementoAleatorio(this.lugar.rutas).destino;
        this.iniciarViaje(destino);
      }
    }
  }
}
