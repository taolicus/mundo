import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  elementoAleatorio,
  umbral,
  log,
} from "./funciones.js";

const RELACION_HABITANTES = ["familiar", "amistad", "colega", "contacto"];

class Necesidad {
  constructor(recurso, cantidad, frecuencia = 0) {
    this.recurso = recurso;
    this.cantidad = cantidad;
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
  constructor(nombre, origen, lugar, tick = 0) {
    this.nombre = nombre;
    this.origen = origen;
    this.lugar = lugar;
    this.vive = true;
    this.edad = numberoAleatorioEntre(ajustes.edadInicialMin, ajustes.edadInicialMax);
    this.salud = numberoAleatorioEntre(ajustes.saludInicialMin, ajustes.saludInicialMax);
    this.edadMaxima = numberoAleatorioEntre(ajustes.edadMaximaMin, ajustes.edadMaximaMax);
    this.proxAnio = tick + this.proxCumpleanios();
    this.necesidades = [];
    this.relaciones = [];
    this.ruta = null;
    this.progresoViaje = 0;
    this.tiempoViajeTotal = 0;
    this.tiempoViajeTranscurrido = 0;
    this.trabajo = null;
    this.habilidad = numberoAleatorioEntre(ajustes.habilidadMin, ajustes.habilidadMax) / ajustes.habilidadDivisor;
    this.generarNecesidadesBasicas();
  }

  proxCumpleanios() {
    return numberoAleatorioEntre(0, ajustes.tickPorAnio);
  }

  agregarRelacion(habitante, tipo, intensidad) {
    const relacion = new Relacion(tipo, habitante, intensidad);
    this.relaciones.push(relacion);
  }

  generarRelaciones() {
    if (!this.lugar) return;
    const otrosHabitantes = this.lugar.habitantes.filter((h) => h !== this);
    const maxRelaciones = Math.ceil(otrosHabitantes.length * ajustes.maxRelacionesRatio);
    const cantidadRelaciones = numberoAleatorioEntre(0, maxRelaciones);

    const habitantesRelacionados = [];
    while (
      habitantesRelacionados.length < cantidadRelaciones &&
      otrosHabitantes.length > 0
    ) {
      const nuevaRelacion = elementoAleatorio(otrosHabitantes);

      if (!this.relaciones.some((r) => r.con === nuevaRelacion)) {
        habitantesRelacionados.push(nuevaRelacion);
        otrosHabitantes.splice(otrosHabitantes.indexOf(nuevaRelacion), 1);
      }
    }

    for (const habitanteRelacionado of habitantesRelacionados) {
      const tipoRelacion = elementoAleatorio(RELACION_HABITANTES);
      const intensidad = numberoAleatorioEntre(ajustes.relacionIntensidadMin, ajustes.relacionIntensidadMax);

      this.agregarRelacion(habitanteRelacionado, tipoRelacion, intensidad);
      habitanteRelacionado.agregarRelacion(this, tipoRelacion, intensidad);
    }
  }

  generarNecesidad(recursos) {
    if (umbral(ajustes.probNecesidad)) {
      const recurso = elementoAleatorio(recursos);
      const necesidad = new Necesidad(recurso);
      this.necesidades.push(necesidad);
      log(
        `${this.nombre} (${this.lugar.nombre}) necesita ${necesidad.cantidad} unidades de ${necesidad.recurso.nombre} (${necesidad.recurso.origen.nombre})`
      );
    }
  }

  recursosComestibles() {
    if (!this.lugar) return [];
    return this.lugar.recursos.filter((r) => r.tipo === "organico");
  }

  generarNecesidadesBasicas() {
    if (!this.lugar) return;
    let recursosDisponibles = [...this.recursosComestibles()];
    const cantidad = numberoAleatorioEntre(ajustes.necesidadesPorHabitanteMin, ajustes.necesidadesPorHabitanteMax);
    for (let i = 0; i < cantidad; i++) {
      const recursoSeleccionado = elementoAleatorio(recursosDisponibles);
      if (!recursoSeleccionado) break;
      recursosDisponibles = recursosDisponibles.filter(
        (recurso) => recurso !== recursoSeleccionado
      );
      const necesidad = new Necesidad(
        recursoSeleccionado,
        numberoAleatorioEntre(ajustes.necesidadCantidadMin, ajustes.necesidadCantidadMax),
        numberoAleatorioEntre(ajustes.necesidadFrecuenciaMin, ajustes.necesidadFrecuenciaMax)
      );
      this.necesidades.push(necesidad);
    }
  }

  asignarTrabajo() {
    if (!this.lugar || this.lugar.recursos.length === 0) return;
    if (this.trabajo && umbral(ajustes.probRetenerTrabajo)) return;

    const recurso = elementoAleatorio(this.lugar.recursos);
    this.trabajo = recurso;
    log(`${this.nombre} ha sido asignado a trabajar en ${recurso.nombre}`);
  }

  envejecer(t) {
    while (t >= this.proxAnio) {
      this.edad++;
      this.proxAnio += ajustes.tickPorAnio;
    }
  }

  morir(causa) {
    if (!this.vive) return;
    this.vive = false;
    const ubicacion = this.lugar ? this.lugar.nombre : "viajando";
    log(`☠ ${this.nombre} (${this.edad} años, ${ubicacion}) ha muerto de ${causa}`);

    if (this.lugar) {
      this.lugar.habitantes = this.lugar.habitantes.filter((h) => h !== this);
      this.lugar.habitantes.forEach((h) => {
        h.relaciones = h.relaciones.filter((r) => r.con !== this);
      });
    }
    if (this.ruta) {
      this.ruta.removerViajante(this);
      this.ruta = null;
    }
  }

  iniciarViaje(ruta) {
    this.ruta = ruta;
    this.trabajo = null;
    this.lugar.habitantes = this.lugar.habitantes.filter((h) => h !== this);
    this.ruta.agregarViajante(this);
    this.lugar = null;
    this.tiempoViajeTotal = this.ruta.tiempoViaje;
    this.tiempoViajeTranscurrido = 0;
    this.progresoViaje = 0;
    log(
      `${this.nombre} ha iniciado un viaje desde ${this.ruta.origen.nombre} hacia ${this.ruta.destino.nombre}`
    );
  }

  viajar() {
    this.tiempoViajeTranscurrido++;
    this.progresoViaje = this.tiempoViajeTranscurrido / this.tiempoViajeTotal;
    if (this.tiempoViajeTranscurrido >= this.tiempoViajeTotal) {
      this.ruta.removerViajante(this);
      this.lugar = this.ruta.destino;
      this.lugar.habitantes.push(this);
      this.necesidades = [];
      this.generarNecesidadesBasicas();
      this.asignarTrabajo();
      log(
        `${this.nombre} ha llegado a ${this.ruta.destino.nombre} desde ${this.ruta.origen.nombre}`
      );
      this.ruta = null;
    }
  }

  actualizar(t) {
    if (!this.vive) return;

    this.envejecer(t);

    if (this.edad >= this.edadMaxima) {
      this.morir("vejez");
      return;
    }

    if (this.lugar) {
      this.necesidades.forEach((necesidad) => {
        necesidad.ultimoConsumo++;
        if (necesidad.ultimoConsumo > necesidad.frecuencia) {
          if (necesidad.recurso.cantidad > 0) {
            this.lugar.consumirRecurso(necesidad.recurso, necesidad.cantidad);
            necesidad.ultimoConsumo = 0;
            log(
              `${this.nombre} ha consumido ${necesidad.cantidad} unidades de ${necesidad.recurso.nombre}`
            );
          } else {
            this.salud -= ajustes.danyoNecesidadInsatisfecha;
            necesidad.ultimoConsumo = 0;
            log(
              `${this.lugar.nombre} necesita consumir ${necesidad.recurso.nombre} pero no hay suficiente`
            );
          }
        }
      });

      if (this.salud <= 0) {
        this.morir("desnutrición");
        return;
      }
    }

    if (this.ruta) {
      this.viajar();
    } else if (this.lugar) {
      if (this.lugar.rutas && this.lugar.rutas.length > 0 && umbral(ajustes.probViajar)) {
        const ruta = elementoAleatorio(this.lugar.rutas);
        this.iniciarViaje(ruta);
      }
    }
  }
}
