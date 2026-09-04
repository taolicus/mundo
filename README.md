# Mundo

Un sandbox de exploración de narrativa emergente. Una simulación mínima con lugares, recursos, habitantes, necesidades y relaciones — diseñada para observar cómo reglas simples producen historias, no para modelar la realidad con precisión.

## Arquitectura

```
index.html   — shell HTML + canvas + panel de inspección
motor.js     — motor / bucle del juego (timestep, input, stats)
mundo.js     — estado y dinámica del mundo (lugares, rutas, tick)
lugar.js     — Lugar, Recurso, Ruta (clima, recursos, descubrimientos)
habitante.js — Habitante, Necesidad, Relacion (necesidades, trabajo, viajes)
poblacion.js — generación inicial de habitantes por lugar
render.js    — renderizado (canvas, color por temperatura, rutas, viajantes)
panel.js     — vista de inspección (lugar / habitante)
funciones.js — utilidades puras (aleatoriedad, nombres, distancia)
ajustes.js   — parámetros de simulación centralizados (fácil de ajustar)
```

## Roadmap

### ✅ Fase 1: Tasas de generación y capacidad — implementado

`Recurso` tiene `generacionRate`, `capacidad`, `tipo` y `sensibleTemperatura`. La producción respeta la capacidad y los recursos sensibles a temperatura modulan su tasa según la temperatura del lugar.

### ✅ Fase 2: Producción de habitantes — implementado

Los habitantes se asignan a un `trabajo` y producen ese recurso según su `habilidad`. La producción de cada recurso es `rate × factorTemperatura × (1 + sumaHabilidades × contribucionTrabajador)`, con un techo de almacenamiento. La asignación de trabajo ocurre inicialmente y al llegar a un lugar.

### ✅ Fase 3: Crafting emergente — implementado

Cuando un lugar acumula suficiente stock de 2+ recursos, hay una chance de descubrir un recurso nuevo que hereda rasgos de sus componentes (peso promedio, tipo combinado, promedios de tasa y capacidad). Cada descubrimiento se registra como evento narrativo.

### ⬜ Fase 4: Ciclo de vida — siguiente

Hacer que los habitantes se sientan vivos y que la población sea dinámica:

- **Envejecimiento** y **muerte**: `edad` avanza con el tick; los habitantes mueren por vejez y por necesidades insatisfechas prolongadas (el campo `vive` aún no se usa).
- **Nacimiento**: nuevos habitantes aparecen cuando el lugar tiene recursos en superávit.
- **Población dinámica**: permitir que la población suba y baje según el balance recursos/necesidades.

### ⬜ Fase 5: Viaje por necesidad

Hacer que el viaje tenga propósito y no sea puramente aleatorio:

- Los habitantes eligen destinos según sus **necesidades** (recursos que faltan en su lugar, oportunidades de trabajo).
- Migración entre lugares en respuesta a escasez o abundancia, impulsando narrativas emergentes reales.

### ⬜ Fase 6: Mundo físico

Dar consecuencias tangibles al clima y al terreno:

- **Efectos de temperatura** sobre necesidades (climas fríos requieren más recursos) y sobre el confort/decisiones de los habitantes.
- **Meteorología**: variable climática regional que perturba temperatura y tasas de recurso.
- **Especialización de lugares**: no todos pueden producir los mismos tipos (agricultura vs. minería), para incentivar el comercio y el viaje.
- **Rendimientos decrecientes / agotamiento**: sobre-explotación reduce la capacidad a largo plazo; el abandono permite recuperarla.

### ⬜ Fase 7: Economía (ambicioso)

- **Valor / precio** según escasez, para que el viaje y el intercambio tengan lógica económica.
- **Relaciones que evolucionan**: la intensidad cambia con la proximidad y las necesidades satisfechas.
- Preferencia de **trabajo por habilidad** en lugar de asignación aleatoria.
