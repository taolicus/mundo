import { ajustes } from "./ajustes.js";
import {
  numberoAleatorioEntre,
  elementoAleatorio,
  seleccionPesada,
  generarNombre,
  umbral,
  log,
} from "./funciones.js";

function seleccionarTipo() {
  const tipos = ajustes.tiposRecurso;
  return seleccionPesada(
    Object.entries(tipos).map(([tipo, cfg]) => [tipo, cfg.pesoProbabilidad])
  );
}

class Recurso {
  constructor(nombre, origen, tick = 0, tipo = seleccionarTipo()) {
    this.nombre = nombre;
    this.peso = numberoAleatorioEntre(1, 99);
    this.origen = origen;
    this.tipo = tipo;
    const configTipo = ajustes.tiposRecurso[tipo] || {};
    this.generacionRate = numberoAleatorioEntre(configTipo.tasaMin ?? 1, configTipo.tasaMax ?? 4);
    this.intervaloProduccion = Math.round(
      ajustes.tickIntervaloProduccion * (configTipo.intervaloMultiplicador ?? 1)
    );
    this.capacidad = numberoAleatorioEntre(ajustes.capacidadBaseMin, ajustes.capacidadBaseMax);
    this.cantidad = Math.round(this.capacidad * ajustes.stockInicialRatio);
    this.sensibleTemperatura = umbral(
      ajustes.probabilidadSensiblePorTipo[tipo] ?? ajustes.probSensibilidadTemperatura
    );
    this.proximoTickProduccion = tick + numberoAleatorioEntre(0, this.intervaloProduccion);
  }
}

export class Ruta {
  constructor(origen, destino) {
    this.origen = origen;
    this.destino = destino;
    this.viajantes = [];
    this.distancia = this.calcularDistancia();
    this.tiempoViaje = Math.max(1, Math.floor(this.distancia / ajustes.velocidadViajeDivisor));
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
    this.descubrimientos = [];
    this.generarRecursos();
  }

  generarRecursos() {
    const cantidad = numberoAleatorioEntre(ajustes.recursosPorLugarMin, ajustes.recursosPorLugarMax);
    for (let i = 0; i < cantidad; i++) {
      const nombre = generarNombre();
      const recurso = new Recurso(nombre, this);
      this.recursos.push(recurso);
    }
  }

  calcularTemperatura(t, yEcuador = 500) {
    const diaActual = t / ajustes.horasDia;

    const distanciaEcuador = Math.abs(yEcuador - this.y);
    const tempBase =
      ajustes.tempMaxBase - distanciaEcuador * ajustes.enfriamientoY;

    const variacionAnual =
      Math.sin((2 * Math.PI * diaActual) / ajustes.diasEnAnio) *
      ajustes.amplitudAnual;

    const variacionDiaria =
      Math.sin((2 * Math.PI * (t - 6)) / ajustes.horasDia) *
      ajustes.amplitudDiaria;

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
    return 1 + (this.temperatura - ajustes.tempOptima) * ajustes.sensibilidadTemperatura;
  }

  intentarDescubrimiento(t) {
    if (this.recursos.length < 2 || !umbral(ajustes.probDescubrimiento)) return;

    const recursoA = elementoAleatorio(this.recursos);
    const recursoB = elementoAleatorio(this.recursos.filter((r) => r !== recursoA));

    if (!recursoA || !recursoB) return;

    const par = [recursoA.nombre, recursoB.nombre].sort().join("+");
    if (this.descubrimientos.includes(par)) return;

    if (recursoA.cantidad > recursoA.capacidad * ajustes.umbralStockDescubrimiento &&
        recursoB.cantidad > recursoB.capacidad * ajustes.umbralStockDescubrimiento) {
      this.descubrimientos.push(par);

      const nombre = generarNombre();
      const nuevoRecurso = new Recurso(nombre, this, t);
      nuevoRecurso.peso = Math.floor((recursoA.peso + recursoB.peso) / 2);
      nuevoRecurso.tipo = recursoA.tipo === recursoB.tipo ? recursoA.tipo : "hibrido";
      nuevoRecurso.generacionRate = Math.max(1, Math.floor((recursoA.generacionRate + recursoB.generacionRate) / 2));
      nuevoRecurso.capacidad = Math.floor((recursoA.capacidad + recursoB.capacidad) / 2);
      nuevoRecurso.cantidad = Math.floor((recursoA.cantidad + recursoB.cantidad) / 4);
      nuevoRecurso.proximoTickProduccion = t + numberoAleatorioEntre(0, nuevoRecurso.intervaloProduccion);

      recursoA.cantidad = Math.floor(recursoA.cantidad * (1 - ajustes.costoDescubrimiento));
      recursoB.cantidad = Math.floor(recursoB.cantidad * (1 - ajustes.costoDescubrimiento));

      this.recursos.push(nuevoRecurso);
      log(
        `${this.nombre} ha descubierto ${nombre} usando ${recursoA.nombre} y ${recursoB.nombre}`
      );
    }
  }

  actualizar(t) {
    this.calcularTemperatura(t);
    this.recursos.forEach((recurso) => {
      if (t < recurso.proximoTickProduccion) return;
      recurso.proximoTickProduccion = t + recurso.intervaloProduccion;

      const factor = this.calcularFactorTemperatura(recurso);
      const trabajadores = this.habitantes.filter((h) => h.trabajo === recurso);
      const sumaHabilidades = trabajadores.reduce((sum, h) => sum + h.habilidad, 0);
      const cantidad = Math.max(
        0,
        Math.floor(recurso.generacionRate * factor * (1 + sumaHabilidades * ajustes.contribucionTrabajador))
      );
      if (cantidad > 0) {
        this.producirRecurso(recurso, cantidad);
        log(
          `${this.nombre} ha producido ${cantidad} nuevas unidades de ${recurso.nombre}`
        );
      }
    });
    this.intentarDescubrimiento(t);
  }
}
