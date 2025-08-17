import { numberoAleatorioEntre } from "./funciones.js";

export const ajustes = {
  cantLugares: 1,
  habitantesPorLugar: numberoAleatorioEntre(1, 1),
  recursosPorLugar: numberoAleatorioEntre(3, 3),
  tamanoDibujo: 30,
};
