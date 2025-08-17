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
    this.enTransito = false;
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
    if (this.enTransito) return false;

    this.enTransito = true;
    this.destino = destino;
    this.rutaActual = {
      origen: this.lugar,
      destino: destino,
    };

    // Calcular tiempo de viaje basado en distancia (10px por tick)
    const distancia = Math.sqrt(
      Math.pow(destino.x - this.lugar.x, 2) +
        Math.pow(destino.y - this.lugar.y, 2)
    );
    this.tiempoViajeTotal = Math.max(1, Math.floor(distancia / 10));
    this.tiempoViajeTranscurrido = 0;
    this.progresoViaje = 0;

    return true;
  }

  viajar() {
    this.tiempoViajeTranscurrido++;
    this.progresoViaje = this.tiempoViajeTranscurrido / this.tiempoViajeTotal;
    if (this.tiempoViajeTranscurrido >= this.tiempoViajeTotal) {
      // Llegó al destino
      this.lugar.habitantes = this.lugar.habitantes.filter((h) => h !== this);
      this.lugar = this.destino;
      this.lugar.habitantes.push(this);
      this.enTransito = false;
      this.rutaActual = null;
      return true; // Viaje completado
    }
    return false; // Todavía en camino
  }

  actualizar() {
    if (this.enTransito) {
      this.viajar();
    } else {
      if (this.lugar.rutas.length > 0 && umbral(0.05)) {
        const destino = elementoAleatorio(this.lugar.rutas);
        this.iniciarViaje(destino);
      }
    }
  }
}
