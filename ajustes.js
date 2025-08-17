import { numberoAleatorioEntre } from "./funciones.js";

export const ajustes = {
  cantLugares: 8,
  habitantesPorLugar: numberoAleatorioEntre(10, 30),
  recursosPorLugar: numberoAleatorioEntre(2, 6),
  tamanoDibujo: 40,
};
