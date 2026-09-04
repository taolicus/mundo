import { numberoAleatorioEntre, generarNombre } from "./funciones.js";
import { Habitante } from "./habitante.js";
import { ajustes } from "./ajustes.js";

export function poblarLugares(lugares) {
  lugares.forEach((lugar) => {
    const cantidad = numberoAleatorioEntre(
      ajustes.habitantesPorLugarMin,
      ajustes.habitantesPorLugarMax
    );
    for (let i = 0; i < cantidad; i++) {
      lugar.habitantes.push(nuevoHabitante(lugar, 0));
    }
  });

  lugares.forEach((lugar) => {
    lugar.habitantes.forEach((habitante) => {
      habitante.generarRelaciones();
      habitante.asignarTrabajo();
    });
  });
}

export function nuevoHabitante(lugar, tick) {
  const nombre = generarNombre();
  return new Habitante(nombre, lugar, lugar, tick);
}
