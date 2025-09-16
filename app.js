/* Hammouda-Itani-Stiftung – Trainingsseite (Local-Only)
   Features:
   - Schöne Startseite mit Kacheln
   - Module: Kita (Kinder, Beobachtungen, Anwesenheit, Elternkommunikation)
             Pflegeheim (Bewohner, Pflegeberichte, Vitalwerte, Medigabe-Training, Sturzmeldungen)
             Weitere Einrichtungen als Platzhalterformulare
   - Demo-Daten laden, CSV/JSON-Export, Druckansicht, Dark-Mode
*/

const qs = (s) => document.querySelector(s);
const ce = (t, p = {}) => Object.assign(document.createElement(t), p);

const state = { page: "home", storeKey: "stiftung-store-v2", dark: false };
let STORE = initStore();

function initStore() {
  const raw = localStorage.getItem(state.storeKey);
  if (raw) return JSON.parse(raw);
  const seed = { meta: { version: 2, created: new Date().toISOString() },
    kita: { kinder: [], beobachtungen: [], anwesenheit: [], eltern: [] },
    pflege: { bewohner: [], berichte: [], vitals: [], medis: [], sturz: [] },
    krankenhaus: { patienten: [], vitals: [] },
    ambulant: { touren: [] },
    ergo: { einheiten: [] },
    apotheke: { abgaben: [] },
  };
  localStorage.setItem(state.storeKey, JSON.stringify(seed));
  return seed;
}
function save() { localStorage.setItem(state.storeKey, JSON.stringify(STORE)); }

// ---------- Utilities ----------
function today() { return new Date().toISOString().slice(0,10); }
function toCSV(rows) {
  if (!rows?.length) return "";
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.map(esc).join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n");
}
function exportCSV(rows, name="export.csv") {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = ce("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function exportJSON(obj, name="export.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = ce("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function badge(txt){ return `<span class="badge">${txt}</span>`; }
function section(title, bodyHTML){ const d=ce("div",{className:"card"}); d.innerHTML=`<h3>${title}</h3>${bodyHTML||""}`; return d; }
function info(title, text){ const d=ce("div",{className:"card"}); d.innerHTML=`<h2>${title}</h2><p class="muted">${text||""}</p>`; return d; }
function emptyMsg(msg="Noch keine Daten."){ const p=ce("p",{className:"muted"}); p.textContent=msg; return p; }
function selectOpts(arr, valKey, labelKey) {
  return arr.map(o => `<option value="${o[valKey]}">${o[labelKey]}</option>`).join("");
}

// ---------- Header & Tabs ----------
document.addEventListener("DOMContentLoaded", () => {
  qs("#tabs").addEventListener("click", (e) => {
    if (e.target.matches("button[data-page]")) {
      qs("#tabs").querySelectorAll("button").forEach(b=>b.classList.remove("active"));
      e.target.classList.add("active");
      state.page = e.target.dataset.page;
      render();
    }
  });

  // Dropdown actions
  document.body.addEventListener("click", (e)=>{
    if (e.target.matches(".dropdown .menu button")) {
      const act = e.target.dataset.action;
      if (act==="seed") seedDemo();
      if (act==="export-json") exportJSON(STORE, "stiftung-export.json");
      if (act==="print") window.print();
      if (act==="reset") {
        if (confirm("Wirklich alle lokalen Daten löschen?")) {
          localStorage.removeItem(state.storeKey); STORE = initStore(); render();
        }
      }
    }
  });

  // Dark mode toggle
  const darkBtn = qs("#darkToggle");
  const pref = localStorage.getItem("stiftung-dark");
  if (pref === "1") document.documentElement.classList.add("dark");
  darkBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("stiftung-dark", document.documentElement.classList.contains("dark") ? "1" : "0");
  });

  render();
});

// ---------- Render ----------
function render() {
  const app = qs("#app"); app.innerHTML = "";

  if (state.page === "home") {
    app.appendChild(info("Willkommen", `Wähle eine Einrichtung oder lade ${badge("Demo-Daten")} über „Daten ▾“ oben. Alle Einträge werden lokal gespeichert (localStorage).`));
    const grid = ce("div", { className: "grid" });
    [
      ["verwaltung","Hand in Hand Verwaltung","Zentrale Infos & Vorlagen (Platzhalter)."],
      ["kita","Die drei Löwen Kindergarten","Kinder, Beobachtungen, Anwesenheit, Elternkommunikation."],
      ["krankenhaus","Mond-Krankenhaus","Aufnahme & Vitalwerte (Training, Platzhalter erweitert)."],
      ["pflegeheim","Pflegeheim der Gemeinschaft","Bewohner, Pflegeberichte, Vitalwerte, Medigabe, Sturzmeldungen."],
      ["ambulant","Ambulanter Pflegedienst zum Stern","Einfache Touren- & Einsatzdoku."],
      ["ergo","Ergotherapeuten „Unart“","Befunde, Ziele, Einheiten (Training)."],
      ["apotheke","Sonnen-Apotheke","Abgabe-Übungen (Training)."]
    ].forEach(([id, title, desc])=>{
      const a = ce("a",{className:"kachel", href:"#", onclick:(e)=>{e.preventDefault(); switchTo(id);} });
      a.innerHTML = `<div class="icon">★</div><div><strong>${title}</strong><div class="muted">${desc}</div></div>`;
      grid.appendChild(a);
    });
    app.appendChild(grid);
    return;
  }

  if (state.page === "verwaltung") {
    app.appendChild(info("Hand in Hand Verwaltung", "Zentrale Verwaltung – hier später Richtlinien, Checklisten, Vorlagen."));
    app.appendChild(section("Export / Backup", `
      <div class="toolbar">
        <button class="btn primary" onclick="exportJSON(STORE,'stiftung-export.json')">Als JSON exportieren</button>
      </div>
    `));
    return;
  }

  if (state.page === "kita") return renderKita(app);
  if (state.page === "pflegeheim") return renderPflege(app);
  if (state.page === "krankenhaus") return renderKrankenhaus(app);
  if (state.page === "ambulant") return renderAmbulant(app);
  if (state.page === "ergo") return renderErgo(app);
  if (state.page === "apotheke") return renderApotheke(app);
}

function switchTo(id){
  state.page=id;
  qs("#tabs").querySelectorAll("button").forEach(b=>b.classList.toggle("active", b.dataset.page===id));
  render();
}

// ---------- KITA ----------
function renderKita(app){
  app.appendChild(info("Die drei Löwen Kindergarten", "Dokumentation für Trainingszwecke. Keine echten Personendaten verwenden."));

  // Kinder
  const kinder = ce("div",{className:"card"});
  kinder.innerHTML = `<h3>Kinder</h3>`;
  if (!STORE.kita.kinder.length) kinder.appendChild(emptyMsg("Noch keine Kinder angelegt."));
  STORE.kita.kinder.forEach(k=>{
    const line
