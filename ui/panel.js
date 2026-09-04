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
  const actionBtn = e.target.closest("#menu button[data-action]");
  if (actionBtn) {
    menu.classList.remove("open");
    if (actionBtn.dataset.action === "regions") showRegionList();
    else if (actionBtn.dataset.action === "dwellers") showDwellerList();
    else if (actionBtn.dataset.action === "transit") showTransitList();
    return;
  }
  if (!e.target.closest("#menuBtnWrap")) {
    menu.classList.remove("open");
  }
});

export function showRegionList() {
  currentSelection = { type: "list", label: "Regions" };
  const items = selectedWorld.places
    .map(
      (p, i) =>
        `<div class="list-item" data-region="${i}"><span>${p.name}</span><b>${p.population.length}</b></div>`
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
  selectedWorld.places.forEach((p) => dwellers.push(...p.population));
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
      const wait =
        r.nextProductionTick == null
          ? 0
          : Math.max(0, r.nextProductionTick - selectedWorld.tick);
      return (
        row(r.name, `${r.amount} / ${r.capacity}`) +
        bar(ratio) +
        row("type", `${r.type} · rate ${r.genRate} · next ${wait}t`) +
        "<br>"
      );
    })
    .join("");

  const dwellerList = place.population
    .map(
      (h, i) =>
        `<div class="row"><a href="#" data-hab="${i}" class="hab-link" style="color:#4a4;text-decoration:none">${h.name}</a></div>`
    )
    .join("");

  const routes = place.routes
    .map((r) => {
      const neighbor =
        r.origin === place ? r.destination.name : r.origin.name;
      return row(neighbor, `traffic ${r.travelers.length}`);
    })
    .join("");

  showPanel(
    `PLACE · ${place.name}`,
    row("temperature", place.temperature.toFixed(1) + "°C") +
      row("dwellers", place.population.length) +
      row("routes", place.routes.length) +
      row("resources", place.resources.length) +
      "<br><span style='color:#888'>resources</span><br>" +
      resources +
      (routes ? "<span style='color:#888'>routes</span><br>" + routes : "") +
      (dwellerList
        ? "<span style='color:#888'>dwellers</span><br>" + dwellerList
        : "")
  );

  panelBody.querySelectorAll(".hab-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const h = place.population[Number(a.dataset.hab)];
      if (h) showDweller(h);
    });
  });
}

export function showDweller(dweller) {
  currentSelection = { type: "dweller", dweller };
  renderDweller(dweller);
  document.dispatchEvent(new CustomEvent("focus-dweller", { detail: dweller }));
}

function renderDweller(dweller) {
  const location = dweller.route
    ? `${dweller.route.origin.name} → ${dweller.route.destination.name}`
    : dweller.place
      ? dweller.place.name
      : "—";

  const needs = dweller.needs.length
    ? dweller.needs
        .map((n) => {
          const raw = n.urgency(dweller);
          const isHunger = n.type === "survival";
          const cycle = isHunger
            ? Math.max(0, Math.min(1, n.lastConsumption / n.frequency))
            : raw;
          const ratio = isHunger ? cycle : Math.max(0, Math.min(1, raw));
          const label =
            isHunger
              ? "hunger"
              : n.type === "exploration"
                ? "explore"
                : n.type === "gather"
                  ? "gather"
                  : n.type === "tend"
                    ? "tend"
                    : "homing";
          const value = isHunger
            ? `${Math.round(cycle * 100)}%` +
              (raw > 0 ? ` · starving ${raw.toFixed(1)}` : "")
            : `every ${n.frequency}t`;
          return row(`need · ${label}`, value) + bar(ratio);
        })
        .join("")
    : "";

  const likes = dweller.tastes && dweller.tastes.length ? dweller.tastes : [];
  const supplierCount = [...dweller.suppliers.entries()].reduce(
    (n, [, places]) => n + places.size,
    0
  );

  const progress = dweller.route
    ? `${Math.round(dweller.travelProgress * 100)}% of ${dweller.totalTravelTime}t`
    : dweller.settleTicksRemaining > 0
      ? `resting ${dweller.settleTicksRemaining}t`
      : "idle";

  const back = backPlace
    ? `<a href="#" id="panelBack" style="color:#8af;text-decoration:none">&larr; ${backPlace.name}</a><br>`
    : "";

  showPanel(
    `DWELLER · ${dweller.name}`,
    back +
      row("age", `${dweller.age} · health ${dweller.health}`) +
      row("temperament", dweller.isCurious ? "curious" : "settled") +
      row("homebody", dweller.homebody.toFixed(2)) +
      row("origin", dweller.origin.name) +
      row("place", location) +
      row("state", progress) +
      row("activity", dweller.activity || "resting") +
      (needs ? "<br><span style='color:#888'>needs</span><br>" + needs : "") +
      "<br><span style='color:#888'>knowledge</span><br>" +
      row("resource names", dweller.knowledge.size) +
      row("supplier links", supplierCount) +
      row("places visited", dweller.visitedPlaceNames.size) +
      row("likes", likes.slice(0, 4).join(", ") + (likes.length > 4 ? "…" : "—"))
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

export function showTransitList() {
  currentSelection = { type: "list", label: "In transit" };
  const travelers = selectedWorld.getTravelersInTransit();
  const items = travelers
    .map(
      (d, i) =>
        `<div class="list-item" data-hab="${i}"><span>${d.name}</span><b>${d.route.origin.name} → ${d.route.destination.name} ${Math.round(d.travelProgress * 100)}%</b></div>`
    )
    .join("");
  showPanel(
    travelers.length ? `IN TRANSIT · ${travelers.length}` : "IN TRANSIT",
    items || "<span style='color:#888'>no travelers</span>"
  );
  panelBody.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", () => {
      const d = travelers[Number(el.dataset.hab)];
      if (d) showDweller(d);
    });
  });
}
