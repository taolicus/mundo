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
      const nombre = generarNombre();
      lugar.habitantes.push(new Habitante(nombre, lugar, lugar));
    }
  });

  lugares.forEach((lugar) => {
    lugar.habitantes.forEach((habitante) => {
      habitante.generarRelaciones();
      habitante.asignarTrabajo();
    });
  });
}
