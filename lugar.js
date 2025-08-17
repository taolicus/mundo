import { ajustes } from "./ajustes.js";
import { numberoAleatorioEntre, generarNombre } from "./funciones.js";
import { Habitante } from "./habitante.js";

class Recurso {
  constructor(nombre, origen) {
    this.nombre = nombre;
    this.peso = numberoAleatorioEntre(1, 99);
    this.cantidad = numberoAleatorioEntre(1, 99);
    this.origen = origen;
  }
}

export class Lugar {
  constructor(nombre, x, y) {
    this.nombre = nombre;
    this.x = x;
    this.y = y;
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

  actualizar() {
    this.habitantes.forEach((habitante) => habitante.actualizar());
  }
}
