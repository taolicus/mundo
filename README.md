# Mundo

Un sandbox de exploración de narrativa emergente. Una simulación mínima con lugares, recursos, habitantes, necesidades y relaciones — diseñada para observar cómo reglas simples producen historias, no para modelar la realidad con precisión.

## Roadmap — Sistema de Recursos

### Fase 1: Tasas de generación y capacidad

Cada recurso tiene una tasa base de generación y una capacidad máxima de almacenamiento.

- `Recurso` obtiene: `generacionRate`, `capacidad`, `tipo`, `sensibleTemperatura`
- Producción respetando capacidad: `min(cantidad + rate, capacidad)`
- Recursos sensibles a temperatura modulan su tasa según la temperatura del lugar

### Fase 2: Producción de habitantes (asignación explícita)

Los habitantes se asignan a trabajar en un recurso específico, produciéndolo con un multiplicador personal.

- `Habitante.trabajo` — referencia al recurso asignado
- `Habitante.habilidad` — multiplicador aleatorio (0.5–2.0)
- Al llegar a un lugar, el habitante evalúa qué recurso necesita más trabajadores
- Producción del lugar = suma de habilidades × tasa base del recurso

### Fase 3: Crafting emergente

Nuevos tipos de recursos surgen de combinaciones, no de recetas predefinidas.

- Cuando un lugar acumula suficiente de 2+ tipos, hay chance de descubrir un nuevo recurso
- El nuevo recurso hereda rasgos de sus componentes (peso promedio, tipo combinado)
- Descubrimiento registrado como evento narrativo
- Recursos descubridos pueden ser producidos por habitantes con habilidad adecuada
