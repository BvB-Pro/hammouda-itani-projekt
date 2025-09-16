/* Hammouda-Itani-Stiftung – schöne, volle Trainingsversion
   - Bunter, lebendiger Hintergrund
   - Hero pro Seite (Titel + Slogan)
   - Großer „Unternehmen“-Dropdown (alle Einrichtungen)
   - „Sonstiges“-Dropdown (Daten, Export, Dark Mode, Löschen)
   - Druckansicht-Button immer oben rechts
   - Je Seite kurzer Infotext
   - Neue Einrichtung: Kinderarzt-Praxis
   - Lokale Speicherung (localStorage)
*/

const qs = (s) => document.querySelector(s);
const ce = (t, p = {}) => Object.assign(document.createElement(t), p);
const today = () => new Date().toISOString().slice(0,10);

const PAGES = [
  { id:"home",          title:"Hammouda-Itani Stiftung", slogan:"Die Stiftung von uns für uns." },
  { id:"verwaltung",    title:"Hand in Hand Verwaltung", slogan:"Zentrale Steuerung für starke Teams." },
  { id:"kita",          title:"Die drei Löwen Kindergarten", slogan:"Der Kindergarten für echte Löwen." },
  { id:"krankenhaus",   title:"Mond-Krankenhaus", slogan:"Medizin mit Herz – Tag & Nacht." },
  { id:"pflegeheim",    title:"Pflegeheim der Gemeinschaft", slogan:"Würde. Nähe. Gemeinschaft." },
  { id:"ambulant",      title:"Ambulanter Pflegedienst zum Stern", slogan:"Hilfe, die zu Ihnen kommt." },
  { id:"ergo",          title:"Ergotherapeuten „Unart“", slogan:"Ungewohnt gut – Therapie neu gedacht." },
  { id:"apotheke",      title:"Sonnen Apotheke", slogan:"Die Apotheke mit dem Strahlen." },
  { id:"kinderarzt",    title:"Kinderarzt-Praxis", slogan:"Mit Liebe, Ruhe und Wissen für die Kleinsten." },
];

const state = { page: "home", storeKey: "stiftung-store-v3" };
let STORE = initStore();

function initStore() {
  const raw = localStorage.getItem(state.storeKey);
  if (raw) return JSON.parse(raw);
  const seed = {
    meta: { version: 3, created: new Date().toISOString() },
    kita: { kinder: [], beobachtungen: [], anwesenheit: [], eltern: [] },
    pflege: { bewohner: [], berichte: [], vitals: [], medis: [], sturz: [] },
    krankenhaus: { patienten: [], vitals: [] },
    ambulant: { touren: [] },
    ergo: { einheiten: [] },
    apotheke: { abgaben: [] },
    kinderarzt: { patienten: [], besuche: [] }
  };
  localStorage.setItem(state.storeKey, JSON.stringify(seed));
  return seed;
}
function save(){ localStorage.setItem(state.storeKey, JSON.stringify(STORE)); }

function exportCSV(rows, name="export.csv"){
  if (!rows?.length) { alert("Keine Daten zum Exportieren."); return; }
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.map(esc).join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = ce("a", { href:url, download:name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 300);
}
function exportJSON(obj, name="export.json"){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = ce("a", { href:url, download:name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 300);
}

document.addEventListener("DOMContentLoaded", () => {
  buildCompanyMenu();
  render(); // initial

  // Sonstiges-Aktionen
  document.body.addEventListener("click", (e)=>{
    if (e.target.matches(".dropdown .menu button")) {
      const act = e.target.dataset.action;
      if (act==="seed") seedDemo();
      if (act==="export-json") exportJSON(STORE, "stiftung-export.json");
      if (act==="dark") document.documentElement.classList.toggle("dark");
      if (act==="reset") {
        if (confirm("Wirklich alle lokalen Daten löschen?")) {
          localStorage.removeItem(state.storeKey); STORE = initStore(); render();
        }
      }
    }
  });

  // Druckansicht
  qs("#printBtn").addEventListener("click", () => window.print());
});

function buildCompanyMenu(){
  const menu = document.querySelector(".dropdown.mega .menu.grid");
  menu.innerHTML = "";
  PAGES.filter(p=>p.id!=="home").forEach(p=>{
    const a = ce("a", { href:"#", className:"kachel" });
    a.innerHTML = `<div class="icon">★</div><div><strong>${p.title}</strong><div class="muted">${p.slogan}</div></div>`;
    a.onclick = (ev)=>{ ev.preventDefault(); switchTo(p.id); };
    menu.appendChild(a);
  });
}

function switchTo(id){
  state.page = id;
  render();
}

function render(){
  const page = PAGES.find(p=>p.id===state.page) || PAGES[0];

  // Hero
  const hero = qs("#hero");
  hero.innerHTML = `
    <div class="card">
      <h1>${page.title}</h1>
      <p>${page.slogan}</p>
    </div>
  `;

  // Main content
  const app = qs("#app"); app.innerHTML = "";
  if (page.id==="home") return renderHome(app);
  if (page.id==="verwaltung") return renderVerwaltung(app);
  if (page.id==="kita") return renderKita(app);
  if (page.id==="pflegeheim") return renderPflege(app);
  if (page.id==="krankenhaus") return renderKrankenhaus(app);
  if (page.id==="ambulant") return renderAmbulant(app);
  if (page.id==="ergo") return renderErgo(app);
  if (page.id==="apotheke") return renderApotheke(app);
  if (page.id==="kinderarzt") return renderKinderarzt(app);
}

/* ---------- Seiten ---------- */
function renderHome(app){
  // Infotext
  const info = ce("div",{className:"card"});
  info.innerHTML = `
    <h2>Liebe Mitarbeitenden,</h2>
    <p class="muted">
      es ist uns eine große Freude, euch als Team in unserer Unternehmensgruppe willkommen zu heißen.
      Diese Trainings-Website ermöglicht realistische Dokumentationsübungen – sicher, modern und vollständig lokal gespeichert.
      Gemeinsam wachsen wir: verantwortungsvoll, kompetent und mit Herz für die Menschen, die wir begleiten.
    </p>`;
  app.appendChild(info);

  // Kacheln zu allen Unternehmen
  const grid = ce("div",{className:"grid"});
  PAGES.filter(p=>p.id!=="home").forEach(p=>{
    const a = ce("a",{href:"#", className:"kachel"});
    a.innerHTML = `<div class="icon">★</div><div><strong>${p.title}</strong><div class="muted">${p.slogan}</div></div>`;
    a.onclick = (ev)=>{ ev.preventDefault(); switchTo(p.id); };
    grid.appendChild(a);
  });
  app.appendChild(grid);
}

function renderVerwaltung(app){
  app.appendChild(cardInfo("Hinweis",
    "Zentrale Verwaltung: Hier können später Richtlinien, Checklisten und Vorlagen liegen (Training/Platzhalter)."));

  const tools = ce("div",{className:"card"});
  tools.innerHTML = `
    <h3>Werkzeuge</h3>
    <div class="toolbar">
      <button class="btn primary" onclick="exportJSON(STORE,'stiftung-export.json')">Gesamtexport (JSON)</button>
    </div>`;
  app.appendChild(tools);
}

/* ---------- Kita ---------- */
function renderKita(app){
  app.appendChild(cardInfo("Info",
    "Die drei Löwen Kindergarten: Bitte nur Übungsdaten verwenden. Alle Einträge werden lokal gespeichert."));

  // Kinder
  app.appendChild(listFormCard({
    title:"Kinder",
    list: STORE.kita.kinder,
    renderLine: k => `<strong>${k.vorname} ${k.nachname}</strong> — geb. ${k.geburtstag||"—"} ${k.gruppe?badge(k.gruppe):""}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburtstag","geburtstag",false,"date")}
      ${input("Gruppe","gruppe",false,"text","Sonnen / Sterne / Löwen …")}
    `,
    onSubmit: data => { STORE.kita.kinder.push(data); save(); }
  }));

  // Beobachtungen
  app.appendChild(listFormCard({
    title:"Beobachtungen",
    list: STORE.kita.beobachtungen,
    renderLine: b => `<strong>${b.kindId}</strong> • ${b.bereich||"—"} — <em>${b.datum||"—"}</em><br>${b.text||"—"}`,
    formHTML: `
      ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${select("Bereich","bereich", ["Sprache","Motorik","Sozial","Kognition","Emotional"])}
      ${textarea("Text","text")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.kita.beobachtungen,'kita-beobachtungen.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.kita.beobachtungen.push(data); save(); }
  }));

  // Anwesenheit
  app.appendChild(listFormCard({
    title:"Anwesenheit",
    list: STORE.kita.anwesenheit,
    renderLine: a => `<strong>${a.kindId}</strong> — ${a.status||"—"} am <em>${a.datum||"—"}</em> ${a.abholer?("• Abholer: "+a.abholer):""}`,
    formHTML: `
      ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${select("Status","status", ["anwesend","abwesend"])}
      ${input("Abholer (optional)","abholer",false)}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.kita.anwesenheit,'kita-anwesenheit.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.kita.anwesenheit.push(data); save(); }
  }));

  // Elternkommunikation
  app.appendChild(listFormCard({
    title:"Elternkommunikation",
    list: STORE.kita.eltern,
    renderLine: x => `<strong>${x.kindId}</strong> • ${x.kanal||"—"} — <em>${x.datum||"—"}</em><br>${x.inhalt||"—"}`,
    formHTML: `
      ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${select("Kanal","kanal", ["Tür-und-Angel","Telefon","E-Mail","Elterngespräch"])}
      ${textarea("Inhalt","inhalt")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.kita.eltern,'kita-elternkommunikation.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.kita.eltern.push(data); save(); }
  }));
}

/* ---------- Pflegeheim ---------- */
function renderPflege(app){
  app.appendChild(cardInfo("Info",
    "Pflegeheim der Gemeinschaft: Training für Bewohner, Berichte, Vitalwerte, Medigabe (nur Übung!) und Sturzmeldungen."));

  // Bewohner
  app.appendChild(listFormCard({
    title:"Bewohner",
    list: STORE.pflege.bewohner,
    renderLine: p => `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.zimmer?badge("Zimmer "+p.zimmer):""} ${p.pflegegrad?badge("PG "+p.pflegegrad):""}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburt","geburt",false,"date")}
      ${input("Zimmer","zimmer",false)}
      ${input("Pflegegrad","pflegegrad",false,"number")}
    `,
    onSubmit: data => { if(data.pflegegrad) data.pflegegrad=Number(data.pflegegrad); STORE.pflege.bewohner.push(data); save(); }
  }));

  // Berichte
  app.appendChild(listFormCard({
    title:"Pflegeberichte",
    list: STORE.pflege.berichte,
    renderLine: b => `<strong>${b.bewohnerId}</strong> • ${b.bereich||"—"} — <em>${b.datum||"—"}</em><br>${b.text||"—"}`,
    formHTML: `
      ${select("Bewohner","bewohnerId", STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${select("Bereich","bereich", ["ATL: Atmen","ATL: Sich bewegen","ATL: Essen/Trinken","AEDL: Ruhen/Schlafen","ASE: Wahrnehmung"])}
      ${textarea("Text (objektiv/subjektiv/Plan/Evaluation)","text")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.pflege.berichte,'pflege-berichte.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.pflege.berichte.push(data); save(); }
  }));

  // Vitalwerte
  app.appendChild(listFormCard({
    title:"Vitalwerte",
    list: STORE.pflege.vitals,
    renderLine: v => `<strong>${v.bewohnerId}</strong> — ${v.puls||"?"}/min, RR ${v.rr||"?"}, ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% <em>(${v.datum||"—"})</em>`,
    formHTML: `
      ${select("Bewohner","bewohnerId", STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${input("Puls (/min)","puls",false,"number")}
      ${input("RR (z. B. 120/80)","rr")}
      ${input("Temperatur (°C)","temp",false,"number","",{"step":"0.1"})}
      ${input("SpO₂ (%)","spo2",false,"number")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.pflege.vitals,'pflege-vitalwerte.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => {
      ["puls","temp","spo2"].forEach(k=>data[k]=data[k]?Number(data[k]):undefined);
      STORE.pflege.vitals.push(data); save();
    }
  }));

  // Medigabe (Training)
  app.appendChild(listFormCard({
    title:"Medigabe – Trainingszwecke",
    list: STORE.pflege.medis,
    renderLine: m => `<strong>${m.bewohnerId}</strong> — ${m.medikament||"—"} um ${m.uhrzeit||"—"} • ${m.status||"—"} <em>(${m.datum||"—"})</em>${m.bemerkung?("<br>"+m.bemerkung):""}`,
    formHTML: `
      ${select("Bewohner","bewohnerId", STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${input("Medikament (Platzhalter)","medikament")}
      ${input("Uhrzeit","uhrzeit",false,"time","08:00")}
      ${select("Status","status", ["gegeben","nicht gegeben"])}
      ${textarea("Bemerkung","bemerkung","Training: keine echten Medigaben dokumentieren!")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.pflege.medis,'pflege-medigabe.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.pflege.medis.push(data); save(); }
  }));

  // Sturzmeldungen
  app.appendChild(listFormCard({
    title:"Sturzmeldungen",
    list: STORE.pflege.sturz,
    renderLine: s => `<strong>${s.bewohnerId}</strong> — ${s.ort||"—"} am <em>${s.datum||"—"}</em><br>Folgen: ${s.folgen||"—"} • Arzt: ${s.arzt||"—"} • Meldung: ${s.meldung||"—"}`,
    formHTML: `
      ${select("Bewohner","bewohnerId", STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${input("Ort","ort",false,"text","Bad, Zimmer, Flur …")}
      ${textarea("Folgen","folgen")}
      ${select("Arzt informiert?","arzt", ["ja","nein"])}
      ${textarea("Meldung/Infofluss","meldung","Team/Angehörige informiert …")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.pflege.sturz,'pflege-sturzmeldungen.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.pflege.sturz.push(data); save(); }
  }));
}

/* ---------- Krankenhaus ---------- */
function renderKrankenhaus(app){
  app.appendChild(cardInfo("Info",
    "Mond-Krankenhaus: Einfache Aufnahme & Vitalwerte als Trainingsbeispiel."));

  // Aufnahme
  app.appendChild(listFormCard({
    title:"Aufnahme",
    list: STORE.krankenhaus.patienten,
    renderLine: p => `<strong>${p.name}</strong> — ${p.fach||"—"} • ${p.datum||"—"}`,
    formHTML: `
      ${input("Patientenname","name",true)}
      ${input("Geburt","geburt",false,"date")}
      ${select("Fachbereich","fach", ["Innere","Chirurgie","Geriatrie"])}
      ${input("Aufnahmedatum","datum",false,"date",today())}
    `,
    onSubmit: data => { STORE.krankenhaus.patienten.push(data); save(); }
  }));

  // Vitalwerte
  app.appendChild(listFormCard({
    title:"Vitalwerte",
    list: STORE.krankenhaus.vitals,
    renderLine: v => `<strong>${v.pat}</strong> — ${v.puls||"?"}/min, RR ${v.rr||"?"}, ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% (${v.datum||"—"})`,
    formHTML: `
      ${select("Patient","pat", STORE.krankenhaus.patienten.map(p=>p.name))}
      ${input("Datum","datum",false,"date",today())}
      ${input("Puls (/min)","puls",false,"number")}
      ${input("RR","rr",false,"text","120/80")}
      ${input("Temp (°C)","temp",false,"number","",{"step":"0.1"})}
      ${input("SpO₂ (%)","spo2",false,"number")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.krankenhaus.vitals,'kh-vitalwerte.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { ["puls","temp","spo2"].forEach(k=>data[k]=data[k]?Number(data[k]):undefined); STORE.krankenhaus.vitals.push(data); save(); }
  }));
}

/* ---------- Ambulant ---------- */
function renderAmbulant(app){
  app.appendChild(cardInfo("Info",
    "Ambulanter Pflegedienst zum Stern: Einfache Touren- & Einsatzdoku (Training)."));

  app.appendChild(listFormCard({
    title:"Touren",
    list: STORE.ambulant.touren,
    renderLine: x => `<strong>${x.klient}</strong> — ${x.leistung||"—"} am <em>${x.datum||"—"}</em> • Zeit: ${x.von||"--"}–${x.bis||"--"}`,
    formHTML: `
      ${input("Klient","klient",true)}
      ${input("Datum","datum",false,"date",today())}
      ${input("Leistung","leistung",false,"text","z. B. SGB XI LK …")}
      ${input("Von","von",false,"time","08:00")}
      ${input("Bis","bis",false,"time","08:30")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.ambulant.touren,'ambulant-touren.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.ambulant.touren.push(data); save(); }
  }));
}

/* ---------- Ergo ---------- */
function renderErgo(app){
  app.appendChild(cardInfo("Info",
    "Ergotherapeuten „Unart“: Einheiten & Ziele – Trainingszwecke."));

  app.appendChild(listFormCard({
    title:"Einheiten",
    list: STORE.ergo.einheiten,
    renderLine: x => `<strong>${x.klient}</strong> — Ziel: ${x.ziel||"—"} • <em>${x.datum||"—"}</em><br>${x.inhalt||"—"}`,
    formHTML: `
      ${input("Klient","klient",true)}
      ${input("Datum","datum",false,"date",today())}
      ${input("Ziel","ziel",false,"text","Feinmotorik, ADL, Kognition …")}
      ${textarea("Inhalt/Übung","inhalt")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.ergo.einheiten,'ergo-einheiten.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.ergo.einheiten.push(data); save(); }
  }));
}

/* ---------- Apotheke ---------- */
function renderApotheke(app){
  app.appendChild(cardInfo("Info",
    "Sonnen Apotheke: Abgabe-Übungen – ausschließlich Trainingsdaten verwenden."));

  app.appendChild(listFormCard({
    title:"Abgaben",
    list: STORE.apotheke.abgaben,
    renderLine: x => `<strong>${x.name}</strong> — ${x.praeparat||"—"} • ${x.dosis||"—"} <em>(${x.datum||"—"})</em>`,
    formHTML: `
      ${input("Name","name",true)}
      ${input("Datum","datum",false,"date",today())}
      ${input("Präparat","praeparat",false,"text","Platzhalterpräparat")}
      ${input("Dosis/Anweisung","dosis",false,"text","z. B. 1-0-1, nach dem Essen")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.apotheke.abgaben,'apotheke-abgaben.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.apotheke.abgaben.push(data); save(); }
  }));
}

/* ---------- Kinderarzt-Praxis ---------- */
function renderKinderarzt(app){
  app.appendChild(cardInfo("Info",
    "Kinderarzt-Praxis: Aufnahme & Besuchsdokumentation – kindgerecht, klar und kurz (Training)."));

  // Patienten (Kinder)
  app.appendChild(listFormCard({
    title:"Patienten",
    list: STORE.kinderarzt.patienten,
    renderLine: p => `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.kasse?badge(p.kasse):""}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburt","geburt",false,"date")}
      ${input("Krankenkasse","kasse")}
    `,
    onSubmit: data => { STORE.kinderarzt.patienten.push(data); save(); }
  }));

  // Besuche
  app.appendChild(listFormCard({
    title:"Besuche",
    list: STORE.kinderarzt.besuche,
    renderLine: b => `<strong>${b.patient}</strong> — Grund: ${b.grund||"—"} • <em>${b.datum||"—"}</em><br>Befund: ${b.befund||"—"} • Therapie: ${b.therapie||"—"}`,
    formHTML: `
      ${select("Patient","patient", STORE.kinderarzt.patienten.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",false,"date",today())}
      ${input("Grund (z. B. U6, Fieber, Impfung)","grund")}
      ${textarea("Befund","befund")}
      ${textarea("Therapie/Empfehlung","therapie")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" onclick="exportCSV(STORE.kinderarzt.besuche,'kinderarzt-besuche.csv')">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => { STORE.kinderarzt.besuche.push(data); save(); }
  }));
}

/* ---------- Bausteine ---------- */
function cardInfo(title, text){
  const d=ce("div",{className:"card"});
  d.innerHTML = `<h3>${title}</h3><p class="muted">${text}</p>`;
  return d;
}
function badge(txt){ return `<span class="badge">${txt}</span>`; }
function input(label, name, required=false, type="text", value="", extraAttrs={}){
  const attrs = Object.entries(extraAttrs).map(([k,v])=>`${k}="${v}"`).join(" ");
  return `<label>${label}<input name="${name}" type="${type}" value="${value||""}" ${required?"required":""} ${attrs}></label>`;
}
function textarea(label, name, value=""){ return `<label>${label}<textarea name="${name}">${value||""}</textarea></label>`; }
function select(label, name, options=[]){
  const opts = options.map(o=>`<option value="${o}">${o}</option>`).join("");
  return `<label>${label}<select name="${name}">${opts}</select></label>`;
}
function listFormCard({title, list, renderLine, formHTML, onSubmit}){
  const wrap = ce("div",{className:"card"});
  wrap.innerHTML = `<h3>${title}</h3>`;
  if (!list || !list.length) {
    const p = ce("p",{className:"muted"}); p.textContent="Noch keine Einträge."; wrap.appendChild(p);
  } else {
    list.forEach(item => { const d=ce("div"); d.innerHTML=renderLine(item); wrap.appendChild(d); });
  }
  const form = ce("form"); form.innerHTML = formHTML;
  form.onsubmit=(e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(form)); onSubmit(data); render(); };
  wrap.appendChild(form);
  return wrap;
}

/* ---------- Demo-Daten ---------- */
function seedDemo(){
  // Kita
  STORE.kita.kinder = [
    { vorname:"Mila", nachname:"Klein", geburtstag:"2020-04-18", gruppe:"Sonnen" },
    { vorname:"Yunus", nachname:"Aziz", geburtstag:"2019-11-02", gruppe:"Löwen" },
  ];
  STORE.kita.beobachtungen = [
    { kindId:"Mila Klein", datum: today(), bereich:"Sprache", text:"Zwei- bis Dreiwortsätze, benennt Farben." }
  ];
  STORE.kita.anwesenheit = [{ kindId:"Mila Klein", datum: today(), status:"anwesend", abholer:"Mutter" }];
  STORE.kita.eltern = [{ kindId:"Mila Klein", datum: today(), kanal:"Tür-und-Angel", inhalt:"Schlafenszeit besprochen." }];

  // Pflege
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

  // Krankenhaus
  STORE.krankenhaus.patienten = [
    { name:"Franz Meier", geburt:"1958-02-21", fach:"Innere", datum: today() }
  ];
  STORE.krankenhaus.vitals = [
    { pat:"Franz Meier", datum: today(), puls:82, rr:"128/76", temp:36.8, spo2:98 }
  ];

  // Ambulant
  STORE.ambulant.touren = [
    { klient:"Emine Kaya", datum: today(), leistung:"LK 3 – große Morgenpflege", von:"08:00", bis:"08:45" }
  ];

  // Ergo
  STORE.ergo.einheiten = [
    { klient:"Nora Lehmann", datum: today(), ziel:"Feinmotorik", inhalt:"Perlen sortieren, Knetübung, Pinzettengriff." }
  ];

  // Apotheke
  STORE.apotheke.abgaben = [
    { name:"Paul Weber", datum: today(), praeparat:"Platzhalterpräparat", dosis:"1-0-1 nach dem Essen" }
  ];

  // Kinderarzt
  STORE.kinderarzt.patienten = [
    { vorname:"Lina", nachname:"Yilmaz", geburt:"2021-06-12", kasse:"AOK" }
  ];
  STORE.kinderarzt.besuche = [
    { patient:"Lina Yilmaz", datum: today(), grund:"U6", befund:"altersgerecht, unauffällig", therapie:"Beratung Ernährung & Schlaf" }
  ];

  save(); render();
}

