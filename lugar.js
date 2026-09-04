import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  elementoAleatorio,
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
    this.generacionRate = numberoAleatorioEntre(ajustes.TASA_BASE_MIN, ajustes.TASA_BASE_MAX);
    this.capacidad = numberoAleatorioEntre(ajustes.CAPACIDAD_BASE_MIN, ajustes.CAPACIDAD_BASE_MAX);
    this.tipo = elementoAleatorio(["organico", "mineral"]);
    this.sensibleTemperatura = umbral(0.3);
  }
}

export class Ruta {
  constructor(origen, destino) {
    this.origen = origen;
    this.destino = destino;
    this.viajantes = [];
    this.distancia = this.calcularDistancia();
    this.tiempoViaje = Math.max(1, Math.floor(this.distancia / 10));
    this.onViajanteAdded = null;
    this.onViajanteRemoved = null;
  }

  calcularDistancia() {
    const dx = this.destino.x - this.origen.x;
    const dy = this.destino.y - this.origen.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  agregarViajante(habitante) {
    if (!this.viajantes.includes(habitante)) {
      this.viajantes.push(habitante);
      if (this.onViajanteAdded) this.onViajanteAdded(habitante);
    }
  }

  removerViajante(habitante) {
    this.viajantes = this.viajantes.filter((v) => v !== habitante);
    if (this.onViajanteRemoved) this.onViajanteRemoved(habitante);
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
    this.descubrimientos = [];
    this.generarRecursos();
    this.generarHabitantes();
    this.habitantes.forEach((habitante) => {
      habitante.generarRelaciones();
    });
  }

  generarRecursos() {
    const cantidad = ajustes.recursosPorLugar();
    for (let i = 0; i < cantidad; i++) {
      const nombre = generarNombre();
      const recurso = new Recurso(nombre, this);
      this.recursos.push(recurso);
    }
  }

  generarHabitantes() {
    const cantidad = ajustes.habitantesPorLugar();
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

  consumirRecurso(recurso, cantidad) {
    if (!this.recursos.includes(recurso)) return false;
    recurso.cantidad -= cantidad;
    if (recurso.cantidad < 0) recurso.cantidad = 0;
    return true;
  }

  producirRecurso(recurso, cantidad) {
    if (!this.recursos.includes(recurso)) return false;
    recurso.cantidad = Math.min(recurso.cantidad + cantidad, recurso.capacidad);
    return true;
  }

  calcularFactorTemperatura(recurso) {
    if (!recurso.sensibleTemperatura) return 1;
    return 1 + (this.temperatura - ajustes.TEMP_OPTIMA) * ajustes.SENSIBILIDAD_TEMPERATURA;
  }

  intentarDescubrimiento() {
    if (this.recursos.length < 2 || !umbral(0.005)) return;

    const recursoA = elementoAleatorio(this.recursos);
    const recursoB = elementoAleatorio(this.recursos.filter((r) => r !== recursoA));

    if (!recursoA || !recursoB) return;

    const par = [recursoA.nombre, recursoB.nombre].sort().join("+");
    if (this.descubrimientos.includes(par)) return;

    if (recursoA.cantidad > recursoA.capacidad * 0.5 &&
        recursoB.cantidad > recursoB.capacidad * 0.5) {
      this.descubrimientos.push(par);

      const nombre = generarNombre();
      const nuevoRecurso = new Recurso(nombre, this);
      nuevoRecurso.peso = Math.floor((recursoA.peso + recursoB.peso) / 2);
      nuevoRecurso.tipo = recursoA.tipo === recursoB.tipo ? recursoA.tipo : "hibrido";
      nuevoRecurso.generacionRate = Math.max(1, Math.floor((recursoA.generacionRate + recursoB.generacionRate) / 2));
      nuevoRecurso.capacidad = Math.floor((recursoA.capacidad + recursoB.capacidad) / 2);
      nuevoRecurso.cantidad = Math.floor((recursoA.cantidad + recursoB.cantidad) / 4);

      recursoA.cantidad = Math.floor(recursoA.cantidad * 0.75);
      recursoB.cantidad = Math.floor(recursoB.cantidad * 0.75);

      this.recursos.push(nuevoRecurso);
      log(
        `${this.nombre} ha descubierto ${nombre} usando ${recursoA.nombre} y ${recursoB.nombre}`
      );
    }
  }

  actualizar(t) {
    this.calcularTemperatura(t);
    this.habitantes.forEach((habitante) => habitante.actualizar());
    // producir recursos según tasa base + contribución de trabajadores
    this.recursos.forEach((recurso) => {
      const factor = this.calcularFactorTemperatura(recurso);
      const trabajadores = this.habitantes.filter((h) => h.trabajo === recurso);
      const sumaHabilidades = trabajadores.reduce((sum, h) => sum + h.habilidad, 0);
      const cantidad = Math.max(0, Math.floor(recurso.generacionRate * factor * (1 + sumaHabilidades)));
      if (cantidad > 0) {
        this.producirRecurso(recurso, cantidad);
        log(
          `${this.nombre} ha producido ${cantidad} nuevas unidades de ${recurso.nombre}`
        );
      }
    });
    this.intentarDescubrimiento();
  }
}
