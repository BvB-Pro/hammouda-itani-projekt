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
      ["apotheke","Sonnen Apotheke","Abgabe-Übungen (Training)."]
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
    const line = ce("div"); line.innerHTML = `<strong>${k.vorname} ${k.nachname}</strong> — geb. ${k.geburtstag||"—"} ${k.gruppe?badge(k.gruppe):""}`;
    kinder.appendChild(line);
  });
  const f1 = ce("form");
  f1.innerHTML = `
    <label>Vorname<input name="vorname" required></label>
    <label>Nachname<input name="nachname" required></label>
    <label>Geburtstag<input type="date" name="geburtstag"></label>
    <label>Gruppe<input name="gruppe" placeholder="Sonnen / Sterne / Löwen …"></label>
    <button class="btn primary" style="margin-top:10px">Kind hinzufügen</button>`;
  f1.onsubmit = (e)=>{ e.preventDefault(); STORE.kita.kinder.push(Object.fromEntries(new FormData(f1))); save(); render(); };
  kinder.appendChild(f1);
  app.appendChild(kinder);

  // Beobachtungen
  const beob = ce("div",{className:"card"});
  beob.innerHTML = `<h3>Beobachtungen</h3>`;
  if (!STORE.kita.beobachtungen.length) beob.appendChild(emptyMsg());
  STORE.kita.beobachtungen.forEach(b=>{
    const line = ce("div"); line.innerHTML = `<strong>${b.kindId}</strong> • ${b.bereich||"—"} — <em>${b.datum||"—"}</em><br>${b.text||"—"}`;
    beob.appendChild(line);
  });
  const f2 = ce("form");
  f2.innerHTML = `
    <label>Kind
      <select name="kindId">
        ${STORE.kita.kinder.map(k=>`<option value="${k.vorname} ${k.nachname}">${k.vorname} ${k.nachname}</option>`).join("")}
      </select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Bereich
      <select name="bereich">
        <option>Sprache</option><option>Motorik</option><option>Sozial</option><option>Kognition</option><option>Emotional</option>
      </select>
    </label>
    <label>Text<textarea name="text"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Beobachtung speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.kita.beobachtungen,'kita-beobachtungen.csv')">CSV exportieren</button>
    </div>`;
  f2.onsubmit=(e)=>{ e.preventDefault(); STORE.kita.beobachtungen.push(Object.fromEntries(new FormData(f2))); save(); render(); };
  beob.appendChild(f2);
  app.appendChild(beob);

  // Anwesenheit
  const anwv = ce("div",{className:"card"});
  anwv.innerHTML = `<h3>Anwesenheit</h3>`;
  if (!STORE.kita.anwesenheit.length) anwv.appendChild(emptyMsg());
  STORE.kita.anwesenheit.forEach(a=>{
    const line = ce("div"); line.innerHTML = `<strong>${a.kindId}</strong> — ${a.status||"—"} am <em>${a.datum||"—"}</em> ${a.abholer?("• Abholer: "+a.abholer):""}`;
    anwv.appendChild(line);
  });
  const f3 = ce("form");
  f3.innerHTML = `
    <label>Kind
      <select name="kindId">
        ${STORE.kita.kinder.map(k=>`<option value="${k.vorname} ${k.nachname}">${k.vorname} ${k.nachname}</option>`).join("")}
      </select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Status
      <select name="status"><option>anwesend</option><option>abwesend</option></select>
    </label>
    <label>Abholer (optional)<input name="abholer" placeholder="Mutter / Vater / Oma …"></label>
    <div class="toolbar">
      <button class="btn primary">Eintrag speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.kita.anwesenheit,'kita-anwesenheit.csv')">CSV exportieren</button>
    </div>`;
  f3.onsubmit=(e)=>{ e.preventDefault(); STORE.kita.anwesenheit.push(Object.fromEntries(new FormData(f3))); save(); render(); };
  anwv.appendChild(f3);
  app.appendChild(anwv);

  // Elternkommunikation
  const eltern = ce("div",{className:"card"});
  eltern.innerHTML = `<h3>Elternkommunikation</h3>`;
  if (!STORE.kita.eltern.length) eltern.appendChild(emptyMsg());
  STORE.kita.eltern.forEach(x=>{
    const line = ce("div"); line.innerHTML = `<strong>${x.kindId}</strong> • ${x.kanal||"—"} — <em>${x.datum||"—"}</em><br>${x.inhalt||"—"}`;
    eltern.appendChild(line);
  });
  const f4 = ce("form");
  f4.innerHTML = `
    <label>Kind
      <select name="kindId">
        ${STORE.kita.kinder.map(k=>`<option value="${k.vorname} ${k.nachname}">${k.vorname} ${k.nachname}</option>`).join("")}
      </select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Kanal
      <select name="kanal"><option>Tür-und-Angel</option><option>Telefon</option><option>E-Mail</option><option>Elterngespräch</option></select>
    </label>
    <label>Inhalt<textarea name="inhalt"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Eintrag speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.kita.eltern,'kita-elternkommunikation.csv')">CSV exportieren</button>
    </div>`;
  f4.onsubmit=(e)=>{ e.preventDefault(); STORE.kita.eltern.push(Object.fromEntries(new FormData(f4))); save(); render(); };
  eltern.appendChild(f4);
  app.appendChild(eltern);
}

// ---------- PFLEGE ----------
function renderPflege(app){
  app.appendChild(info("Pflegeheim der Gemeinschaft", "Training: Bewohner, Pflegeberichte, Vitalwerte, Medigabe (Übung), Sturzmeldungen."));

  // Bewohner
  const bw = section("Bewohner", "");
  if (!STORE.pflege.bewohner.length) bw.appendChild(emptyMsg());
  STORE.pflege.bewohner.forEach(p=>{
    const d=ce("div"); d.innerHTML=`<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.zimmer?badge("Zimmer "+p.zimmer):""} ${p.pflegegrad?badge("PG "+p.pflegegrad):""}`;
    bw.appendChild(d);
  });
  const f1 = ce("form"); f1.innerHTML = `
    <label>Vorname<input name="vorname" required></label>
    <label>Nachname<input name="nachname" required></label>
    <label>Geburt<input type="date" name="geburt"></label>
    <label>Zimmer<input name="zimmer"></label>
    <label>Pflegegrad<input type="number" name="pflegegrad" min="1" max="5"></label>
    <button class="btn primary" style="margin-top:10px">Bewohner hinzufügen</button>`;
  f1.onsubmit=(e)=>{e.preventDefault(); const o=Object.fromEntries(new FormData(f1)); o.pflegegrad=o.pflegegrad?Number(o.pflegegrad):undefined; STORE.pflege.bewohner.push(o); save(); render();};
  bw.appendChild(f1);
  app.appendChild(bw);

  // Pflegeberichte
  const pb = section("Pflegeberichte", "");
  if (!STORE.pflege.berichte.length) pb.appendChild(emptyMsg());
  STORE.pflege.berichte.forEach(b=>{
    const d=ce("div"); d.innerHTML=`<strong>${b.bewohnerId}</strong> • ${b.bereich||"—"} — <em>${b.datum||"—"}</em><br>${b.text||"—"}`;
    pb.appendChild(d);
  });
  const f2 = ce("form"); f2.innerHTML = `
    <label>Bewohner
      <select name="bewohnerId">${STORE.pflege.bewohner.map(p=>`<option>${p.vorname} ${p.nachname}</option>`).join("")}</select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Bereich
      <select name="bereich">
        <option>ATL: Atmen</option><option>ATL: Sich bewegen</option><option>ATL: Essen/Trinken</option>
        <option>AEDL: Ruhen/Schlafen</option><option>ASE: Wahrnehmung</option>
      </select>
    </label>
    <label>Text (objektiv/subjektiv/Plan/Evaluation)<textarea name="text"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Bericht speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.pflege.berichte,'pflege-berichte.csv')">CSV exportieren</button>
    </div>`;
  f2.onsubmit=(e)=>{e.preventDefault(); STORE.pflege.berichte.push(Object.fromEntries(new FormData(f2))); save(); render();};
  pb.appendChild(f2);
  app.appendChild(pb);

  // Vitalwerte
  const vv = section("Vitalwerte", "");
  if (!STORE.pflege.vitals.length) vv.appendChild(emptyMsg());
  STORE.pflege.vitals.forEach(v=>{
    const d=ce("div"); d.innerHTML=`<strong>${v.bewohnerId}</strong> — ${v.puls||"?"}/min, RR ${v.rr||"?"}, Temp ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% <em>(${v.datum||"—"})</em>`;
    vv.appendChild(d);
  });
  const f3 = ce("form"); f3.innerHTML = `
    <label>Bewohner
      <select name="bewohnerId">${STORE.pflege.bewohner.map(p=>`<option>${p.vorname} ${p.nachname}</option>`).join("")}</select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Puls (/min)<input type="number" name="puls"></label>
    <label>RR (z. B. 120/80)<input name="rr" placeholder="120/80"></label>
    <label>Temperatur (°C)<input type="number" step="0.1" name="temp"></label>
    <label>SpO₂ (%)<input type="number" name="spo2"></label>
    <div class="toolbar">
      <button class="btn primary">Werte speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.pflege.vitals,'pflege-vitalwerte.csv')">CSV exportieren</button>
    </div>`;
  f3.onsubmit=(e)=>{e.preventDefault(); const o=Object.fromEntries(new FormData(f3)); ["puls","temp","spo2"].forEach(k=>o[k]=o[k]?Number(o[k]):undefined); STORE.pflege.vitals.push(o); save(); render();};
  vv.appendChild(f3);
  app.appendChild(vv);

  // Medigabe (Training)
  const mg = section("Medigabe – Trainingszwecke", "");
  if (!STORE.pflege.medis.length) mg.appendChild(emptyMsg());
  STORE.pflege.medis.forEach(m=>{
    const d=ce("div"); d.innerHTML=`<strong>${m.bewohnerId}</strong> — ${m.medikament||"—"} um ${m.uhrzeit||"—"} • ${m.status||"—"} <em>(${m.datum||"—"})</em> ${m.bemerkung?("<br>"+m.bemerkung):""}`;
    mg.appendChild(d);
  });
  const f4 = ce("form"); f4.innerHTML = `
    <label>Bewohner
      <select name="bewohnerId">${STORE.pflege.bewohner.map(p=>`<option>${p.vorname} ${p.nachname}</option>`).join("")}</select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Medikament (Platzhalter)<input name="medikament" placeholder="z. B. Metoprolol 47,5 mg"></label>
    <label>Uhrzeit<input type="time" name="uhrzeit" value="08:00"></label>
    <label>Status<select name="status"><option>gegeben</option><option>nicht gegeben</option></select></label>
    <label>Bemerkung<textarea name="bemerkung" placeholder="Training: keine echten Medigaben dokumentieren!"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Eintrag speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.pflege.medis,'pflege-medigabe.csv')">CSV exportieren</button>
    </div>`;
  f4.onsubmit=(e)=>{e.preventDefault(); STORE.pflege.medis.push(Object.fromEntries(new FormData(f4))); save(); render();};
  mg.appendChild(f4);
  app.appendChild(mg);

  // Sturzmeldungen
  const st = section("Sturzmeldungen", "");
  if (!STORE.pflege.sturz.length) st.appendChild(emptyMsg());
  STORE.pflege.sturz.forEach(s=>{
    const d=ce("div"); d.innerHTML=`<strong>${s.bewohnerId}</strong> — ${s.ort||"—"} am <em>${s.datum||"—"}</em><br>Folgen: ${s.folgen||"—"} • Arzt: ${s.arzt||"—"} • Meldung: ${s.meldung||"—"}`;
    st.appendChild(d);
  });
  const f5 = ce("form"); f5.innerHTML = `
    <label>Bewohner
      <select name="bewohnerId">${STORE.pflege.bewohner.map(p=>`<option>${p.vorname} ${p.nachname}</option>`).join("")}</select>
    </label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Ort<input name="ort" placeholder="Bad, Zimmer, Flur …"></label>
    <label>Folgen<textarea name="folgen"></textarea></label>
    <label>Arzt informiert?<select name="arzt"><option>ja</option><option>nein</option></select></label>
    <label>Meldung/Infofluss<textarea name="meldung" placeholder="Team/Angehörige informiert …"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Meldung speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.pflege.sturz,'pflege-sturzmeldungen.csv')">CSV exportieren</button>
    </div>`;
  f5.onsubmit=(e)=>{e.preventDefault(); STORE.pflege.sturz.push(Object.fromEntries(new FormData(f5))); save(); render();};
  st.appendChild(f5);
  app.appendChild(st);
}

// ---------- Krankenhaus (Platzhalter mit Formularen) ----------
function renderKrankenhaus(app){
  app.appendChild(info("Mond-Krankenhaus", "Einfache Aufnahme & Vitalwerte – Trainingszwecke."));
  // Aufnahme
  const auf = section("Aufnahme", "");
  const f1 = ce("form"); f1.innerHTML = `
    <label>Patientenname<input name="name" required></label>
    <label>Geburt<input type="date" name="geburt"></label>
    <label>Fachbereich<select name="fach"><option>Innere</option><option>Chirurgie</option><option>Geriatrie</option></select></label>
    <label>Aufnahmedatum<input type="date" name="datum" value="${today()}"></label>
    <button class="btn primary" style="margin-top:10px">Aufnahme speichern</button>`;
  const list = ce("div"); if (!STORE.krankenhaus.patienten.length) list.appendChild(emptyMsg());
  STORE.krankenhaus.patienten.forEach(p=>{ const d=ce("div"); d.innerHTML=`<strong>${p.name}</strong> — ${p.fach||"—"} • ${p.datum||"—"}`; list.appendChild(d); });
  f1.onsubmit=(e)=>{e.preventDefault(); STORE.krankenhaus.patienten.push(Object.fromEntries(new FormData(f1))); save(); render();};
  auf.appendChild(list); auf.appendChild(f1); app.appendChild(auf);

  // Vitalwerte
  const vv = section("Vitalwerte", "");
  const f2 = ce("form"); f2.innerHTML = `
    <label>Patient<select name="pat">${STORE.krankenhaus.patienten.map(p=>`<option>${p.name}</option>`).join("")}</select></label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Puls (/min)<input type="number" name="puls"></label>
    <label>RR<input name="rr" placeholder="120/80"></label>
    <label>Temp (°C)<input type="number" step="0.1" name="temp"></label>
    <label>SpO₂ (%)<input type="number" name="spo2"></label>
    <div class="toolbar">
      <button class="btn primary">Werte speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.krankenhaus.vitals,'kh-vitalwerte.csv')">CSV exportieren</button>
    </div>`;
  const list2 = ce("div"); if (!STORE.krankenhaus.vitals.length) list2.appendChild(emptyMsg());
  STORE.krankenhaus.vitals.forEach(v=>{ const d=ce("div"); d.innerHTML=`<strong>${v.pat}</strong> — ${v.puls||"?"}/min, RR ${v.rr||"?"}, ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% (${v.datum||"—"})`; list2.appendChild(d); });
  f2.onsubmit=(e)=>{e.preventDefault(); const o=Object.fromEntries(new FormData(f2)); ["puls","temp","spo2"].forEach(k=>o[k]=o[k]?Number(o[k]):undefined); STORE.krankenhaus.vitals.push(o); save(); render();};
  vv.appendChild(list2); vv.appendChild(f2); app.appendChild(vv);
}

// ---------- Ambulant ----------
function renderAmbulant(app){
  app.appendChild(info("Ambulanter Pflegedienst zum Stern", "Einfache Touren- und Einsatzdokumentation (Training)."));
  const t = section("Touren", "");
  const list = ce("div"); if (!STORE.ambulant.touren.length) list.appendChild(emptyMsg());
  STORE.ambulant.touren.forEach(x=>{ const d=ce("div"); d.innerHTML=`<strong>${x.klient}</strong> — ${x.leistung||"—"} am <em>${x.datum||"—"}</em> • Zeit: ${x.von||"--"}–${x.bis||"--"}`; list.appendChild(d); });
  const f = ce("form"); f.innerHTML = `
    <label>Klient<input name="klient" required></label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Leistung<input name="leistung" placeholder="z. B. SGB XI LK …"></label>
    <label>Von<input type="time" name="von" value="08:00"></label>
    <label>Bis<input type="time" name="bis" value="08:30"></label>
    <div class="toolbar">
      <button class="btn primary">Einsatz speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.ambulant.touren,'ambulant-touren.csv')">CSV exportieren</button>
    </div>`;
  f.onsubmit=(e)=>{e.preventDefault(); STORE.ambulant.touren.push(Object.fromEntries(new FormData(f))); save(); render();};
  t.appendChild(list); t.appendChild(f); app.appendChild(t);
}

// ---------- Ergo ----------
function renderErgo(app){
  app.appendChild(info("Ergotherapeuten „Unart“", "Einheiten & Ziele – Trainingszwecke."));
  const s = section("Einheiten", "");
  const list = ce("div"); if (!STORE.ergo.einheiten.length) list.appendChild(emptyMsg());
  STORE.ergo.einheiten.forEach(x=>{ const d=ce("div"); d.innerHTML=`<strong>${x.klient}</strong> — Ziel: ${x.ziel||"—"} • <em>${x.datum||"—"}</em><br>${x.inhalt||"—"}`; list.appendChild(d); });
  const f = ce("form"); f.innerHTML = `
    <label>Klient<input name="klient" required></label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Ziel<input name="ziel" placeholder="Feinmotorik, ADL, Kognition …"></label>
    <label>Inhalt/Übung<textarea name="inhalt"></textarea></label>
    <div class="toolbar">
      <button class="btn primary">Einheit speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.ergo.einheiten,'ergo-einheiten.csv')">CSV exportieren</button>
    </div>`;
  f.onsubmit=(e)=>{e.preventDefault(); STORE.ergo.einheiten.push(Object.fromEntries(new FormData(f))); save(); render();};
  s.appendChild(list); s.appendChild(f); app.appendChild(s);
}

// ---------- Apotheke ----------
function renderApotheke(app){
  app.appendChild(info("Sonnen Apotheke", "Abgabe-Übungen (Training)."));
  const a = section("Abgaben", "");
  const list = ce("div"); if (!STORE.apotheke.abgaben.length) list.appendChild(emptyMsg());
  STORE.apotheke.abgaben.forEach(x=>{ const d=ce("div"); d.innerHTML=`<strong>${x.name}</strong> — ${x.praeparat||"—"} • ${x.dosis||"—"} <em>(${x.datum||"—"})</em>`; list.appendChild(d); });
  const f = ce("form"); f.innerHTML = `
    <label>Name<input name="name" required></label>
    <label>Datum<input type="date" name="datum" value="${today()}"></label>
    <label>Präparat<input name="praeparat" placeholder="Platzhalterpräparat"></label>
    <label>Dosis/Anweisung<input name="dosis" placeholder="z. B. 1-0-1, nach dem Essen"></label>
    <div class="toolbar">
      <button class="btn primary">Abgabe speichern</button>
      <button type="button" class="btn" onclick="exportCSV(STORE.apotheke.abgaben,'apotheke-abgaben.csv')">CSV exportieren</button>
    </div>`;
  f.onsubmit=(e)=>{e.preventDefault(); STORE.apotheke.abgaben.push(Object.fromEntries(new FormData(f))); save(); render();};
  a.appendChild(list); a.appendChild(f); app.appendChild(a);
}

// ---------- Demo-Daten ----------
function seedDemo(){
  STORE.kita.kinder = [
    { vorname:"Mila", nachname:"Klein", geburtstag:"2020-04-18", gruppe:"Sonnen" },
    { vorname:"Yunus", nachname:"Aziz", geburtstag:"2019-11-02", gruppe:"Löwen" },
  ];
  STORE.kita.beobachtungen = [
    { kindId:"Mila Klein", datum: today(), bereich:"Sprache", text:"Zwei- bis Dreiwortsätze, benennt Farben." }
  ];
  STORE.kita.anwesenheit = [{ kindId:"Mila Klein", datum: today(), status:"anwesend", abholer:"Mutter" }];
  STORE.kita.eltern = [{ kindId:"Mila Klein", datum: today(), kanal:"Tür-und-Angel", inhalt:"Schlafenszeit besprochen." }];

  STORE.pflege.bewohner = [
    { vorname:"Karl", nachname:"Schmidt", geburt:"1941-07-12", zimmer:"2.14", pflegegrad:3 },
    { vorname:"Hanne", nachname:"Vogel", geburt:"1938-03-03", zimmer:"1.07", pflegegrad:2 },
  ];
  STORE.pflege.berichte = [
    { bewohnerId:"Karl Schmidt", datum: today(), bereich:"ATL: Sich bewegen", text:"Mobilisation mit Rollator; wach, kooperativ." }
  ];
  STORE.pflege.vitals = [
    { bewohnerId:"Karl Schmidt", datum: today(), puls:78, rr:"132/78", temp:36.6, spo2:97 }
  ];
  STORE.pflege.medis = [
    { bewohnerId:"Karl Schmidt", datum: today(), medikament:"Metoprolol 47,5 mg", uhrzeit:"08:00", status:"gegeben", bemerkung:"—" }
  ];
  STORE.pflege.sturz = [
    { bewohnerId:"Hanne Vogel", datum: today(), ort:"Bad", folgen:"Hämatom li. Unterarm", arzt:"nein", meldung:"Team & Angehörige informiert" }
  ];

  STORE.krankenhaus.patienten = [
    { name:"Franz Meier", geburt:"1958-02-21", fach:"Innere", datum: today() }
  ];
  STORE.krankenhaus.vitals = [
    { pat:"Franz Meier", datum: today(), puls:82, rr:"128/76", temp:36.8, spo2:98 }
  ];

  STORE.ambulant.touren = [
    { klient:"Emine Kaya", datum: today(), leistung:"LK 3 – große Morgenpflege", von:"08:00", bis:"08:45" }
  ];

  STORE.ergo.einheiten = [
    { klient:"Nora Lehmann", datum: today(), ziel:"Feinmotorik", inhalt:"Perlen sortieren, Knetübung, Pinzettengriff." }
  ];

  STORE.apotheke.abgaben = [
    { name:"Paul Weber", datum: today(), praeparat:"Platzhalterpräparat", dosis:"1-0-1 nach dem Essen" }
  ];
  save(); render();
}


