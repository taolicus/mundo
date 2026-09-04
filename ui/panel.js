const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

panelClose.addEventListener("click", hidePanel);

let backPlace = null;
let currentSelection = null;
let selectedWorld = null;

export function setWorld(world) {
  selectedWorld = world;
}

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

const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#menuBtnWrap")) {
    menu.classList.remove("open");
  }
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("#menu button[data-action]");
  if (!b) return;
  menu.classList.remove("open");
  if (b.dataset.action === "regions") showRegionList();
  else if (b.dataset.action === "dwellers") showDwellerList();
});

export function showRegionList() {
  currentSelection = { type: "list", label: "Regions" };
  const items = selectedWorld.places
    .map(
      (p, i) =>
        `<div class="list-item" data-region="${i}"><span>${p.name}</span><b>${p.habitants.length}</b></div>`
    )
    .join("");
  showPanel("REGIONS", items);
  panelBody.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", () => {
      const place = selectedWorld.places[Number(el.dataset.region)];
      if (place) showPlace(place);
    });
  });
}

export function showDwellerList() {
  currentSelection = { type: "list", label: "Dwellers" };
  const dwellers = getAllDwellers();
  const items = dwellers
    .map(
      (d, i) =>
        `<div class="list-item" data-hab="${i}"><span>${d.name}</span><b>${d.place ? d.place.name : "traveling"}</b></div>`
    )
    .join("");
  showPanel("DWELLERS", items);
  panelBody.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", () => {
      const d = dwellers[Number(el.dataset.hab)];
      if (d) showDweller(d);
    });
  });
}

function getAllDwellers() {
  const dwellers = [];
  selectedWorld.places.forEach((p) => dwellers.push(...p.habitants));
  selectedWorld.getTravelersInTransit().forEach((t) => dwellers.push(t));
  return dwellers;
}

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

  const dwellerList = place.habitants
    .map(
      (h, i) =>
        `<div class="row"><a href="#" data-hab="${i}" class="hab-link" style="color:#4a4;text-decoration:none">${h.name}</a></div>`
    )
    .join("");

  showPanel(
    `PLACE · ${place.name}`,
    row("temperature", place.temperature.toFixed(1) + "°C") +
      row("dwellers", place.habitants.length) +
      row("resources", place.resources.length) +
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
      const h = place.habitants[Number(a.dataset.hab)];
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
        .map((n) => {
          if (n.type === "exploration") {
            return row("explore", `every ${n.frequency}t`);
          }
          return row(n.resource.name, `${n.amount}u / every ${n.frequency}t`);
        })
        .join("")
    : "";

  const back = backPlace
    ? `<a href="#" id="panelBack" style="color:#8af;text-decoration:none">&larr; ${backPlace.name}</a><br>`
    : "";

  showPanel(
    `DWELLER · ${dweller.name}`,
    back +
      row("age", dweller.age) +
      row("activity", dweller.activity || "resting") +
      row("place", dweller.route
        ? `${dweller.route.origin.name} → ${dweller.route.destination.name}`
        : dweller.place
          ? dweller.place.name
          : "—") +
      (needs
        ? "<br><span style='color:#888'>needs</span><br>" + needs
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
