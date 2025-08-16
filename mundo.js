const log = console.log;

function numberoAleatorioEntre(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function letraAleatoria(desplazamiento) {
  return String.fromCharCode(desplazamiento + Math.floor(Math.random() * 26));
}

function generarNombre() {
  const primeraLetra = letraAleatoria(65);
  const segundaLetra = letraAleatoria(97);
  const terceraLetra = letraAleatoria(97);

  return primeraLetra + segundaLetra + terceraLetra;
}

function calcularDistancia(lugarA, lugarB) {
  const dx = lugarB.x - lugarA.x;
  const dy = lugarB.y - lugarA.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const RELACION_HABITANTES = ["familiar", "amistad", "colega", "contacto"];

const ajustes = {
  cantLugares: 2,
  habitantesPorLugar: 1, //numberoAleatorioEntre(10, 30),
  recursosPorLugar: 1, //numberoAleatorioEntre(2, 6),
  tamanoDibujo: 40,
};

class Recurso {
  constructor(nombre, origen) {
    this.nombre = nombre;
    this.peso = 0;
    this.cantidad = 0;
    this.origen = origen;
  }
}

class Necesidad {
  constructor(recurso, frecuencia) {
    this.recurso = recurso;
    this.cantidad = 0;
    this.ultimoConsumo = 0;
    this.frecuencia = frecuencia;
  }
}

class Relacion {
  constructor(tipo, con) {
    this.tipo = tipo;
    this.con = con;
    this.intensidad = 1;
  }
}

class Habitante {
  constructor(nombre, origen, lugar) {
    this.nombre = nombre;
    this.edad = 1;
    this.origen = origen;
    this.vive = true;
    this.necesidades = [];
    this.relaciones = [];
    this.lugar = lugar;
    this.enTransito = false;
    this.rutaActual = null;
    this.progresoViaje = 0;
    this.tiempoViajeTotal = 0;
    this.tiempoViajeTranscurrido = 0;
  }

  agregarRelacion(habitante, tipo, intensidad) {
    const relacion = new Relacion(tipo, habitante);
    relacion.intensidad = intensidad;
    this.relaciones.push(relacion);
  }

  generarRelaciones() {
    const habitantesDelLugar = this.lugar.habitantes.filter((h) => h !== this);
    const maxRelaciones = Math.ceil(habitantesDelLugar.length * 0.1);
    const cantidadRelaciones = numberoAleatorioEntre(0, maxRelaciones);

    // Seleccionar habitantes aleatorios para relacionarse
    const habitantesRelacionados = [];
    while (
      habitantesRelacionados.length < cantidadRelaciones &&
      habitantesDelLugar.length > 0
    ) {
      // Seleccionar un habitante aleatorio
      const indiceAleatorio = numberoAleatorioEntre(
        0,
        habitantesDelLugar.length - 1
      );
      const posibleRelacion = habitantesDelLugar[indiceAleatorio];

      // Verificar que no tenga ya una relación con este habitante
      if (!this.relaciones.some((r) => r.con === posibleRelacion)) {
        habitantesRelacionados.push(posibleRelacion);
        habitantesDelLugar.splice(indiceAleatorio, 1); // Evitar duplicados
      }
    }

    for (const habitanteRelacionado of habitantesRelacionados) {
      const indiceRelacion = numberoAleatorioEntre(
        0,
        RELACION_HABITANTES.length - 1
      );
      const tipoRelacion = RELACION_HABITANTES[indiceRelacion];
      const intensidad = numberoAleatorioEntre(1, 3);

      // Crear relación bidireccional
      this.agregarRelacion(habitanteRelacionado, tipoRelacion, intensidad);
      habitanteRelacionado.agregarRelacion(this, tipoRelacion, intensidad);
    }
  }

  generarNecesidad(recursosDisponibles) {
    const umbral = 5; // % de probabilidad de genearar una nueva necesidad
    if (numberoAleatorioEntre(1, 100) <= umbral) {
      const recursoAleatorio =
        recursosDisponibles[
          numberoAleatorioEntre(0, recursosDisponibles.length - 1)
        ];

      const necesidad = new Necesidad(recursoAleatorio);
      necesidad.cantidad = numberoAleatorioEntre(1, 5);
      // necesidad.frecuencia = numberoAleatorioEntre(1, 3);

      this.necesidades.push(necesidad);
      // log(
      //   `${this.nombre} (${this.lugar.nombre}) necesita ${necesidad.cantidad} unidades de ${necesidad.recurso.nombre} (${necesidad.recurso.origen.nombre})`
      // );
    }
  }

  iniciarDesplazamiento(destino) {
    if (this.enTransito) return false;

    this.enTransito = true;
    this.destino = destino;
    this.rutaActual = {
      origen: this.lugar,
      destino: destino,
    };

    // Calcular tiempo de viaje basado en distancia (10px por tick)
    const distancia = Math.sqrt(
      Math.pow(destino.x - this.lugar.x, 2) +
        Math.pow(destino.y - this.lugar.y, 2)
    );
    this.tiempoViajeTotal = Math.max(1, Math.floor(distancia / 10));
    this.tiempoViajeTranscurrido = 0;
    this.progresoViaje = 0;

    return true;
  }

  actualizarViaje() {
    if (!this.enTransito) return false;

    this.tiempoViajeTranscurrido++;
    this.progresoViaje = this.tiempoViajeTranscurrido / this.tiempoViajeTotal;

    if (this.tiempoViajeTranscurrido >= this.tiempoViajeTotal) {
      // Llegó al destino
      this.lugar.habitantes = this.lugar.habitantes.filter((h) => h !== this);
      this.lugar = this.destino;
      this.lugar.habitantes.push(this);
      this.enTransito = false;
      this.rutaActual = null;
      return true; // Viaje completado
    }

    return false; // Todavía en camino
  }
}

class Lugar {
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
      recurso.peso = numberoAleatorioEntre(1, 99);
      recurso.cantidad = numberoAleatorioEntre(1, 99);
      this.recursos.push(recurso);
    }
  }

  generarHabitantes() {
    const cantidad = ajustes.habitantesPorLugar;
    for (let i = 0; i < cantidad; i++) {
      const nombre = generarNombre();
      const habitante = new Habitante(nombre, this, this);
      // habitante.edad = numberoAleatorioEntre(1, 100);
      this.habitantes.push(habitante);
    }
  }
}

class Mundo {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.lugares = [];
    this.tick = 0;
    this.desplazamientos = [];
    this.dibujoRutas = new Path2D();
    this.generarLugares();
  }

  actualizar() {
    this.tick++;
    log("T:", this.tick);

    // generar necesidades
    const recursos = this.lugares.flatMap((lugar) => lugar.recursos);
    this.lugares
      .flatMap((lugar) => lugar.habitantes)
      .forEach((habitante) => {
        habitante.generarNecesidad(recursos);

        // Decidir si iniciar desplazamiento (umbral del 5%)
        if (Math.random() < 0.05 && habitante.lugar.rutas.length > 0) {
          const destinoIndex = Math.floor(
            Math.random() * habitante.lugar.rutas.length
          );
          const destino = habitante.lugar.rutas[destinoIndex];
          habitante.iniciarDesplazamiento(destino);
        }
      });

    // calcular desplazamientos
    this.desplazamientos = this.lugares
      .flatMap((lugar) => lugar.habitantes)
      .filter((habitante) => habitante.enTransito);

    this.desplazamientos.forEach((habitante) => habitante.actualizarViaje());
  }

  dibujar(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    // Rutas
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.stroke(this.dibujoRutas);

    // Desplazamientos
    ctx.fillStyle = "green";
    this.desplazamientos.forEach((habitante) => {
      const ruta = habitante.rutaActual;
      const progreso = habitante.progresoViaje;

      const x = ruta.origen.x + (ruta.destino.x - ruta.origen.x) * progreso;
      const y = ruta.origen.y + (ruta.destino.y - ruta.origen.y) * progreso;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Lugares
    ctx.fillStyle = "#fff";
    for (const lugar of this.lugares) {
      ctx.beginPath();
      ctx.arc(lugar.x, lugar.y, ajustes.tamanoDibujo, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(lugar.nombre, lugar.x, lugar.y + ajustes.tamanoDibujo * 2);
    }
  }

  agregarLugar(distanciaMinima = 200) {
    let intentos = 0;
    const maxIntentos = 100;

    while (intentos < maxIntentos) {
      const lugar = new Lugar(
        generarNombre(),
        numberoAleatorioEntre(
          ajustes.tamanoDibujo,
          this.width - ajustes.tamanoDibujo * 2
        ),
        numberoAleatorioEntre(
          ajustes.tamanoDibujo,
          this.height - ajustes.tamanoDibujo * 2
        )
      );

      const demasiadoCerca = this.lugares.some(
        (lugarExistente) =>
          calcularDistancia(lugar, lugarExistente) < distanciaMinima
      );

      if (!demasiadoCerca || this.lugares.length === 0) {
        this.lugares.push(lugar);
        return;
      }

      intentos++;
    }
  }

  generarRutas(distanciaMaxima = 600) {
    for (let i = 0; i < this.lugares.length; i++) {
      for (let j = i + 1; j < this.lugares.length; j++) {
        const distancia = calcularDistancia(this.lugares[i], this.lugares[j]);
        if (distancia <= distanciaMaxima) {
          this.lugares[i].rutas.push(this.lugares[j]);
          this.lugares[j].rutas.push(this.lugares[i]);
          this.dibujoRutas.moveTo(this.lugares[i].x, this.lugares[i].y);
          this.dibujoRutas.lineTo(this.lugares[j].x, this.lugares[j].y);
        }
      }
    }
  }

  obtenerLugar(x, y) {
    for (const lugar of this.lugares) {
      const distancia = Math.sqrt(
        Math.pow(x - lugar.x, 2) + Math.pow(y - lugar.y, 2)
      );
      if (distancia <= ajustes.tamanoDibujo) {
        return lugar;
      }
    }
    return null;
  }

  generarLugares() {
    for (let i = 0; i < ajustes.cantLugares; i++) {
      this.agregarLugar();
    }
    this.generarRutas();
  }
}

const dpr = window.devicePixelRatio || 1;

const canvas = document.getElementById("canvas");

const width = 800;
const height = 600;

canvas.style.width = width + "px";
canvas.style.height = height + "px";

canvas.width = width * dpr;
canvas.height = height * dpr;

const ctx = canvas.getContext("2d");
ctx.textAlign = "center";
ctx.font = ajustes.tamanoDibujo * 0.8 + "px 'IBM Plex Mono', sans-serif";
ctx.letterSpacing = "2px";

const mundo = new Mundo(canvas.width, canvas.height);
mundo.dibujar(ctx);

canvas.addEventListener("click", (event) => {
  // Obtener coordenadas del click considerando el device pixel ratio
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const lugar = mundo.obtenerLugar(x, y);

  if (lugar) log(lugar);
});

function tick() {
  mundo.actualizar();
  mundo.dibujar(ctx);
}

const tickBtn = document.getElementById("tick");
tickBtn.addEventListener("click", tick);
