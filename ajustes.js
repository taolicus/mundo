import { numberoAleatorioEntre } from "./funciones.js";

export const ajustes = {
  cantLugares: 8,
  habitantesPorLugar: () => numberoAleatorioEntre(10, 30),
  recursosPorLugar: () => numberoAleatorioEntre(2, 6),
  tamanoDibujo: 30,
  necesidadesPorHabitante: () => numberoAleatorioEntre(1, 4),
  TEMP_MAX_BASE: 30,
  AMPLITUD_ANUAL: 15, // Variación entre estaciones
  AMPLITUD_DIARIA: 5, // Variación entre día y noche
  ENFRIAMIENTO_Y: 0.05,
  horasDia: 24,
  diasEnAnio: 360,
  CAPACIDAD_BASE_MIN: 50,
  CAPACIDAD_BASE_MAX: 200,
  TASA_BASE_MIN: 1,
  TASA_BASE_MAX: 5,
  SENSIBILIDAD_TEMPERATURA: 0.01,
  TEMP_OPTIMA: 15,
};
