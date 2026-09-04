const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

panelClose.addEventListener("click", hidePanel);

let backPlace = null;
let currentSelection = null;

function showPanel(title, content) {
  panelTitle.textContent = title;
  panelBody.innerHTML = content;
  panel.style.display = "block";
}

function hidePanel() {
  panel.style.display = "none";
  currentSelection = null;
}

export { hidePanel };

function updatePanel() {
  if (currentSelection) {
    if (currentSelection.type === "place") renderPlace(currentSelection.place);
    else if (currentSelection.type === "dweller") renderDweller(currentSelection.dweller);
  }
}

export { updatePanel };

function row(label, value) {
  return `<div class="row"><span>${label}</span><b>${value}</b></div>`;
}

function bar(ratio) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
}

function dwellerLink(dweller) {
  return `<a href="#" data-hab="${dweller.name}" class="hab-link" style="color:#4a4;text-decoration:none">${dweller.name}</a>`;
}

export function showPlace(place) {
  currentSelection = { type: "place", place };
  renderPlace(place);
}

function renderPlace(place) {
  backPlace = place;

  const resources = place.resources
    .map((r) => {
      const ratio = r.amount / r.capacity;
      return (
        row(r.name, `${r.amount} / ${r.capacity}`) +
        bar(ratio) +
        row("type", `${r.type} · rate ${r.genRate} · temp ${r.temperatureSensitive ? "yes" : "no"}`) +
        "<br>"
      );
    })
    .join("");

  const workers = place.habitants.filter((h) => h.job).length;

  const dwellerList = place.habitants
    .map((h) => row(dwellerLink(h), h.job ? h.job.name : "no job"))
    .join("");

  showPanel(
    `PLACE · ${place.name}`,
    row("temperature", place.temperature.toFixed(1) + "°C") +
      row("dwellers", place.habitants.length) +
      row("workers", workers) +
      row("resources", place.resources.length) +
      row("discoveries", place.discoveries.length) +
      "<br><span style='color:#888'>resources</span><br>" +
      resources +
      (dwellerList
        ? "<span style='color:#888'>dwellers</span><br>" + dwellerList
        : "")
  );

  panelBody.querySelectorAll(".hab-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const h = place.habitants.find((d) => d.name === a.dataset.hab);
      if (h) showDweller(h);
    });
  });
}

export function showDweller(dweller) {
  currentSelection = { type: "dweller", dweller };
  renderDweller(dweller);
}

function renderDweller(dweller) {
  const needs = dweller.needs.length
    ? dweller.needs
        .map((n) => row(n.resource.name, `${n.amount}u / every ${n.frequency}t`))
        .join("")
    : "";

  const relations = dweller.relations.length
    ? dweller.relations
        .map((r) => row(r.type, r.with_.name))
        .join("")
    : "";

  const back = backPlace
    ? `<a href="#" id="panelBack" style="color:#8af;text-decoration:none">&larr; ${backPlace.name}</a><br>`
    : "";

  showPanel(
    `DWELLER · ${dweller.name}`,
    back +
      row("age", dweller.age) +
      row("place", dweller.place ? dweller.place.name : "traveling") +
      row("job", dweller.job ? dweller.job.name : "none") +
      row("skill", dweller.skill.toFixed(1)) +
      (needs
        ? "<br><span style='color:#888'>needs</span><br>" + needs
        : "") +
      (relations
        ? "<br><span style='color:#888'>relations</span><br>" + relations
        : "")
  );

  const backBtn = panelBody.querySelector("#panelBack");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (backPlace) showPlace(backPlace);
    });
  }
}
