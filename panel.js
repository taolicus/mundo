const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

panelClose.addEventListener("click", ocultarPanel);

let volverLugar = null;
let seleccionActual = null;

function mostrarPanel(titulo, contenido) {
  panelTitle.textContent = titulo;
  panelBody.innerHTML = contenido;
  panel.style.display = "block";
}

function ocultarPanel() {
  panel.style.display = "none";
  seleccionActual = null;
}

export { ocultarPanel };

function actualizarPanel() {
  if (seleccionActual) {
    if (seleccionActual.tipo === "lugar") renderLugar(seleccionActual.lugar);
    else if (seleccionActual.tipo === "habitante") renderHabitante(seleccionActual.habitante);
  }
}

export { actualizarPanel };

function fila(etiqueta, valor) {
  return `<div class="row"><span>${etiqueta}</span><b>${valor}</b></div>`;
}

function barra(ratio) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
}

function enlaceHabitante(habitante) {
  return `<a href="#" data-hab="${habitante.nombre}" class="hab-link" style="color:#4a4;text-decoration:none">${habitante.nombre}</a>`;
}

export function mostrarLugar(lugar) {
  seleccionActual = { tipo: "lugar", lugar };
  renderLugar(lugar);
}

function renderLugar(lugar) {
  volverLugar = lugar;

  const recursos = lugar.recursos
    .map((r) => {
      const ratio = r.cantidad / r.capacidad;
      return (
        fila(r.nombre, `${r.cantidad} / ${r.capacidad}`) +
        barra(ratio) +
        fila("tipo", `${r.tipo} · tasa ${r.generacionRate} · temp ${r.sensibleTemperatura ? "sí" : "no"}`) +
        "<br>"
      );
    })
    .join("");

  const trabajadores = lugar.habitantes.filter((h) => h.trabajo).length;

  const listaHabitantes = lugar.habitantes
    .map((h) => fila(enlaceHabitante(h), h.trabajo ? h.trabajo.nombre : "sin trabajo"))
    .join("");

  mostrarPanel(
    `LUGAR · ${lugar.nombre}`,
    fila("temperatura", lugar.temperatura.toFixed(1) + "°C") +
      fila("habitantes", lugar.habitantes.length) +
      fila("trabajadores", trabajadores) +
      fila("recursos", lugar.recursos.length) +
      fila("descubrimientos", lugar.descubrimientos.length) +
      "<br><span style='color:#888'>recursos</span><br>" +
      recursos +
      (listaHabitantes
        ? "<span style='color:#888'>habitantes</span><br>" + listaHabitantes
        : "")
  );

  panelBody.querySelectorAll(".hab-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const h = lugar.habitantes.find((hab) => hab.nombre === a.dataset.hab);
      if (h) mostrarHabitante(h);
    });
  });
}

export function mostrarHabitante(habitante) {
  seleccionActual = { tipo: "habitante", habitante };
  renderHabitante(habitante);
}

function renderHabitante(habitante) {
  const necesidades = habitante.necesidades.length
    ? habitante.necesidades
        .map((n) => fila(n.recurso.nombre, `${n.cantidad}u / cada ${n.frecuencia}t`))
        .join("")
    : "";

  const relaciones = habitante.relaciones.length
    ? habitante.relaciones
        .map((r) => fila(r.tipo, r.con.nombre))
        .join("")
    : "";

  const volver = volverLugar
    ? `<a href="#" id="panelBack" style="color:#8af;text-decoration:none">&larr; ${volverLugar.nombre}</a><br>`
    : "";

  mostrarPanel(
    `HABITANTE · ${habitante.nombre}`,
    volver +
      fila("edad", habitante.edad) +
      fila("lugar", habitante.lugar ? habitante.lugar.nombre : "viajando") +
      fila("trabajo", habitante.trabajo ? habitante.trabajo.nombre : "ninguno") +
      fila("habilidad", habitante.habilidad.toFixed(1)) +
      (necesidades
        ? "<br><span style='color:#888'>necesidades</span><br>" + necesidades
        : "") +
      (relaciones
        ? "<br><span style='color:#888'>relaciones</span><br>" + relaciones
        : "")
  );

  const back = panelBody.querySelector("#panelBack");
  if (back) {
    back.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (volverLugar) mostrarLugar(volverLugar);
    });
  }
}
