import { ajustes } from "./ajustes.js";

export function numberoAleatorioEntre(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

export function letraAleatoria(desplazamiento) {
  return String.fromCharCode(desplazamiento + Math.floor(Math.random() * 26));
}

export function generarNombre() {
  const primeraLetra = letraAleatoria(65);
  const segundaLetra = letraAleatoria(97);
  const terceraLetra = letraAleatoria(97);

  return primeraLetra + segundaLetra + terceraLetra;
}

export function calcularDistancia(lugarA, lugarB) {
  const dx = lugarB.x - lugarA.x;
  const dy = lugarB.y - lugarA.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function obtenerLugar(x, y, lugares) {
  for (const lugar of lugares) {
    const distancia = Math.sqrt(
      Math.pow(x - lugar.x, 2) + Math.pow(y - lugar.y, 2)
    );
    if (distancia <= ajustes.tamanoDibujo) {
      return lugar;
    }
  }
  return null;
}

export function indiceAleatorio(coleccion) {
  return Math.floor(Math.random() * coleccion.length);
}

export function elementoAleatorio(collecion) {
  return collecion[indiceAleatorio(collecion)];
}

export function umbral(porcentaje) {
  return Math.random() < porcentaje;
}

export const log = console.log;
