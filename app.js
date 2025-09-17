/* Hammouda-Itani-Stiftung – app.js (Firebase-Realtime, v1.1)
   - Zentrale Speicherung: Firestore (Echtzeit)
   - Anonyme Auth (kommt aus firebase.js)
   - Startseite: nur Infotext (Absätze mit \n\n)
   - Dropdown: Stiftung zuerst
   - CSV/JSON-Export
   - Kinderarzt: Versichertennummer + Terminliste
   - Dark-Mode & letzte Seite gemerkt
*/

import { db, authReady } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ====== Einstellungen ====== */
const TENANT_ID = "stiftung"; // Mandant (Sammlungs-Namespace in Firestore)

/* ====== Hilfsfunktionen UI ====== */
const qs = (s) => document.querySelector(s);
const ce = (t, p = {}) => Object.assign(document.createElement(t), p);
const today = () => new Date().toISOString().slice(0,10);

/* ====== Seiten ====== */
const PAGES = [
  { id:"home",          title:"Hammouda-Itani Stiftung",      slogan:"Die Stiftung von uns für uns." },
  { id:"verwaltung",    title:"Hand in Hand Verwaltung",       slogan:"Zentrale Steuerung für starke Teams." },
  { id:"kita",          title:"Die drei Löwen Kindergarten",   slogan:"Der Kindergarten für echte Löwen." },
  { id:"krankenhaus",   title:"Mond-Krankenhaus",              slogan:"Medizin mit Herz – Tag & Nacht." },
  { id:"pflegeheim",    title:"Pflegeheim der Gemeinschaft",   slogan:"Würde. Nähe. Gemeinschaft." },
  { id:"ambulant",      title:"Ambulanter Pflegedienst zum Stern", slogan:"Hilfe, die zu Ihnen kommt." },
  { id:"ergo",          title:"Ergotherapeuten „Unart“",       slogan:"Ungewohnt gut – Therapie neu gedacht." },
  { id:"apotheke",      title:"Sonnen Apotheke",               slogan:"Die Apotheke mit dem Strahlen." },
  { id:"kinderarzt",    title:"Kinderarzt-Praxis",             slogan:"Mit Liebe, Ruhe und Wissen für die Kleinsten." },
];

/* ====== UI-Status (persistenter Zustand) ====== */
const UI_KEY = "stiftung-ui-v2";
function loadUI(){
  try {
    return JSON.parse(localStorage.getItem(UI_KEY)) || { lastPage:"home", dark:false };
  } catch { return { lastPage:"home", dark:false }; }
}
function saveUI(patch){ localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUI(), ...patch })); }
let CURRENT_PAGE = loadUI().lastPage || "home";

/* ====== In-Memory Store (wird von Firestore gespeist) ====== */
const STORE = {
  kita:       { kinder: [], beobachtungen: [], anwesenheit: [], eltern: [] },
  pflege:     { bewohner: [], berichte: [], vitals: [], medis: [], sturz: [] },
  krankenhaus:{ patienten: [], vitals: [] },
  ambulant:   { touren: [] },
  ergo:       { einheiten: [] },
  apotheke:   { abgaben: [] },
  kinderarzt: { patienten: [], besuche: [], termine: [] }
};

/* ====== Firestore-Sammlungen (Pfade) ====== */
const COL = {
  kita_kinder:           `tenants/${TENANT_ID}/kita_kinder`,
  kita_beobachtungen:    `tenants/${TENANT_ID}/kita_beobachtungen`,
  kita_anwesenheit:      `tenants/${TENANT_ID}/kita_anwesenheit`,
  kita_eltern:           `tenants/${TENANT_ID}/kita_eltern`,

  pflege_bewohner:       `tenants/${TENANT_ID}/pflege_bewohner`,
  pflege_berichte:       `tenants/${TENANT_ID}/pflege_berichte`,
  pflege_vitals:         `tenants/${TENANT_ID}/pflege_vitals`,
  pflege_medis:          `tenants/${TENANT_ID}/pflege_medis`,
  pflege_sturz:          `tenants/${TENANT_ID}/pflege_sturz`,

  kh_patienten:          `tenants/${TENANT_ID}/kh_patienten`,
  kh_vitals:             `tenants/${TENANT_ID}/kh_vitals`,

  amb_touren:            `tenants/${TENANT_ID}/amb_touren`,

  ergo_einheiten:        `tenants/${TENANT_ID}/ergo_einheiten`,

  apo_abgaben:           `tenants/${TENANT_ID}/apo_abgaben`,

  kid_patienten:         `tenants/${TENANT_ID}/kid_patienten`,
  kid_besuche:           `tenants/${TENANT_ID}/kid_besuche`,
  kid_termine:           `tenants/${TENANT_ID}/kid_termine`,
};

/* ====== Boot ====== */
document.addEventListener("DOMContentLoaded", async () => {
  // Dark Mode wiederherstellen / Systempräferenz berücksichtigen
  const ui = loadUI();
  if (ui.dark || (window.matchMedia?.('(prefers-color-scheme: dark)').matches && ui.dark !== false)) {
    document.documentElement.classList.add("dark");
  }

  // Header-UI
  setupDropdown("companyDropdown", "companyBtn", "companyMenu");
  setupDropdown("moreDropdown", "moreBtn", "moreMenu");
  buildCompanyMenu();

  // Druck
  qs("#printBtn")?.addEventListener("click", () => window.print());

  // Sonstiges
  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("#moreMenu button");
    if (!btn) return;
    const act = btn.dataset.action;
    if (act==="export-json") exportAllJSON();
    if (act==="dark") {
      document.documentElement.classList.toggle("dark");
      saveUI({ dark: document.documentElement.classList.contains("dark") });
    }
    if (act==="seed") seedDemo(); // Demo-Daten in Firestore schreiben
    if (act==="reset") alert("Bei zentraler Speicherung gibt es hier keinen ‚Alles löschen‘-Button.");
  });

  // Auf Auth warten → Realtime-Listener registrieren
  await authReady;
  await initRealtime();

  switchTo(CURRENT_PAGE);
});

/* ====== Firestore Realtime (onSnapshot) ====== */
async function initRealtime(){
  const asc = (path) => query(collection(db, path), orderBy("datum","asc"));
  const plain = (path) => collection(db, path);

  // Kita
  subscribe(plain(COL.kita_kinder), STORE.kita.kinder);
  subscribe(asc(COL.kita_beobachtungen), STORE.kita.beobachtungen);
  subscribe(asc(COL.kita_anwesenheit), STORE.kita.anwesenheit);
  subscribe(asc(COL.kita_eltern), STORE.kita.eltern);

  // Pflege
  subscribe(plain(COL.pflege_bewohner), STORE.pflege.bewohner);
  subscribe(asc(COL.pflege_berichte), STORE.pflege.berichte);
  subscribe(asc(COL.pflege_vitals), STORE.pflege.vitals);
  subscribe(asc(COL.pflege_medis), STORE.pflege.medis);
  subscribe(asc(COL.pflege_sturz), STORE.pflege.sturz);

  // Krankenhaus
  subscribe(plain(COL.kh_patienten), STORE.krankenhaus.patienten);
  subscribe(asc(COL.kh_vitals), STORE.krankenhaus.vitals);

  // Ambulant
  subscribe(asc(COL.amb_touren), STORE.ambulant.touren);

  // Ergo
  subscribe(asc(COL.ergo_einheiten), STORE.ergo.einheiten);

  // Apotheke
  subscribe(asc(COL.apo_abgaben), STORE.apotheke.abgaben);

  // Kinderarzt
  subscribe(plain(COL.kid_patienten), STORE.kinderarzt.patienten);
  subscribe(asc(COL.kid_besuche), STORE.kinderarzt.besuche);
  subscribe(asc(COL.kid_termine), STORE.kinderarzt.termine);
}

function subscribe(refOrQuery, targetArr){
  onSnapshot(refOrQuery, (snap)=>{
    targetArr.length = 0;
    snap.forEach(d => targetArr.push({ id:d.id, ...d.data() }));
    render(); // Live-Update der UI bei jeder Änderung
  });
}

async function addDocTo(path, data){
  try{
    return await addDoc(collection(db, path), { ...data, _ts: serverTimestamp() });
  }catch(err){
    console.error("Firestore add error:", err);
    alert("Speichern fehlgeschlagen: " + (err.message || err));
    throw err;
  }
}

/* ====== Dropdown / Navigation ====== */
function setupDropdown(wrapperId, buttonId, menuId){
  const wrap = qs("#"+wrapperId);
  const btn  = qs("#"+buttonId);
  const menu = qs("#"+menuId);
  const close= ()=>{ wrap.classList.remove("open"); btn?.setAttribute("aria-expanded","false"); };

  btn?.addEventListener("click", (e)=>{ 
    e.stopPropagation(); 
    wrap.classList.toggle("open"); 
    btn.setAttribute("aria-expanded", wrap.classList.contains("open") ? "true":"false");
    if (wrap.classList.contains("open")) menu?.focus();
  });
  document.addEventListener("click", (e)=>{ if (!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e)=>{ if (e.key==="Escape") close(); });
}

function buildCompanyMenu(){
  const menu = qs("#companyMenu"); if (!menu) return;
  menu.innerHTML = "";
  const order = [ PAGES.find(p=>p.id==="home"), ...PAGES.filter(p=>p.id!=="home") ];
  order.forEach(p=>{
    const a = ce("a",{href:"#", className:"kachel", role:"menuitem"});
    a.innerHTML = `<div class="icon">★</div>
      <div><strong>${p.title}</strong><div class="muted">${p.slogan}</div></div>`;
    a.addEventListener("click",(ev)=>{
      ev.preventDefault();
      switchTo(p.id);
      qs("#companyDropdown")?.classList.remove("open");
      qs("#companyBtn")?.setAttribute("aria-expanded","false");
    });
    menu.appendChild(a);
  });
}

function switchTo(id){
  CURRENT_PAGE = id;
  saveUI({ lastPage:id });
  render();
}

/* ====== Render ====== */
function render(){
  const page = PAGES.find(p=>p.id===CURRENT_PAGE) || PAGES[0];

  // (Optional) großes Bild-Hero oben synchronisieren, falls in index.html Listener existiert
  document.dispatchEvent(new CustomEvent('stiftung:pagechange',{detail:{title:page.title,slogan:page.slogan}}));

  // Karten-Hero
  const hero = qs("#hero");
  hero.innerHTML = `<div class="card"><h1>${page.title}</h1><p>${page.slogan}</p></div>`;

  // Inhalt
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

/* ====== Seiten: Home / Verwaltung ====== */
function renderHome(app){
  app.appendChild(cardInfo(
    "Liebe Mitarbeitenden,",
    `es ist uns eine große Freude, euch als Team und Mitbegründer in unserer Unternehmensgruppe willkommen zu heißen.

Diese Trainings-Website ermöglicht realistische Dokumentationsübungen – sicher, modern und zentral synchronisiert.

Gemeinsam wachsen wir: verantwortungsvoll, kompetent und mit Herz für die Menschen, die wir begleiten.

Hier findet ihr in Zukunft wertvolle News, aktuelle Nachrichten, kurze Infos und Fortbildungen und vieles Spannendes rund um unsere Unternehmensgruppe.

Stiftungs-Präsident: Z. Bremkens; Stiftungs-Vorsitzenden: B. Hammouda und A.R. Itani; Geschäftsführerin der Stiftung V. Lauth`
  ));
}

function renderVerwaltung(app){
  app.appendChild(cardInfo("Hinweis",
    "Zentrale Verwaltung: Hier können später Richtlinien, Checklisten und Vorlagen liegen (Training/Platzhalter)."));
  const tools = ce("div",{className:"card"});
  tools.innerHTML = `<h3>Werkzeuge</h3>
    <div class="toolbar">
      <button class="btn primary" id="exportAllBtn">Gesamtexport (JSON)</button>
    </div>`;
  tools.querySelector("#exportAllBtn").addEventListener("click", exportAllJSON);
  app.appendChild(tools);
}

/* ====== Kita ====== */
function renderKita(app){
  app.appendChild(cardInfo("Info",
    "Die drei Löwen Kindergarten: Bitte nur Übungsdaten verwenden. Alle Einträge werden zentral gespeichert."));

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
    onSubmit: data => addDocTo(COL.kita_kinder, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kita-beobachtungen.csv')})(${JSON.stringify(STORE.kita.beobachtungen)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kita_beobachtungen, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kita-anwesenheit.csv')})(${JSON.stringify(STORE.kita.anwesenheit)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kita_anwesenheit, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kita-elternkommunikation.csv')})(${JSON.stringify(STORE.kita.eltern)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kita_eltern, data)
  }));
}

/* ====== Pflegeheim ====== */
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
    onSubmit: data => addDocTo(COL.pflege_bewohner, { ...data, pflegegrad: data.pflegegrad?Number(data.pflegegrad):undefined })
  }));

  // Pflegeberichte
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'pflege-berichte.csv')})(${JSON.stringify(STORE.pflege.berichte)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.pflege_berichte, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'pflege-vitalwerte.csv')})(${JSON.stringify(STORE.pflege.vitals)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.pflege_vitals, {
      ...data,
      puls: data.puls?Number(data.puls):undefined,
      temp: data.temp?Number(data.temp):undefined,
      spo2: data.spo2?Number(data.spo2):undefined
    })
  }));

  // Medigabe
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'pflege-medigabe.csv')})(${JSON.stringify(STORE.pflege.medis)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.pflege_medis, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'pflege-sturzmeldungen.csv')})(${JSON.stringify(STORE.pflege.sturz)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.pflege_sturz, data)
  }));
}

/* ====== Krankenhaus ====== */
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
    onSubmit: data => addDocTo(COL.kh_patienten, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kh-vitalwerte.csv')})(${JSON.stringify(STORE.krankenhaus.vitals)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kh_vitals, {
      ...data,
      puls: data.puls?Number(data.puls):undefined,
      temp: data.temp?Number(data.temp):undefined,
      spo2: data.spo2?Number(data.spo2):undefined
    })
  }));
}

/* ====== Ambulant ====== */
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'ambulant-touren.csv')})(${JSON.stringify(STORE.ambulant.touren)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.amb_touren, data)
  }));
}

/* ====== Ergo ====== */
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'ergo-einheiten.csv')})(${JSON.stringify(STORE.ergo.einheiten)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.ergo_einheiten, data)
  }));
}

/* ====== Apotheke ====== */
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'apotheke-abgaben.csv')})(${JSON.stringify(STORE.apotheke.abgaben)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.apo_abgaben, data)
  }));
}

/* ====== Kinderarzt ====== */
function renderKinderarzt(app){
  app.appendChild(cardInfo("Info",
    "Kinderarzt-Praxis: Aufnahme & Besuchsdokumentation – kindgerecht, klar und kurz (Training)."));

  // Patienten inkl. Versichertennummer
  app.appendChild(listFormCard({
    title:"Patienten",
    list: STORE.kinderarzt.patienten,
    renderLine: p => `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.kasse?badge(p.kasse):""} ${p.versnr?badge("Vers.-Nr. "+p.versnr):""}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburt","geburt",false,"date")}
      ${input("Krankenkasse","kasse")}
      ${input("Versichertennummer","versnr",false,"text","z. B. A123456789")}
    `,
    onSubmit: data => addDocTo(COL.kid_patienten, data)
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
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kinderarzt-besuche.csv')})(${JSON.stringify(STORE.kinderarzt.besuche)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kid_besuche, data)
  }));

  // Termine (einfacher Kalender)
  app.appendChild(listFormCard({
    title:"Termine",
    list: STORE.kinderarzt.termine.slice().sort((a,b)=> (a.datum+a.zeit).localeCompare(b.datum+b.zeit)),
    renderLine: t => `<strong>${t.patient}</strong> — ${t.grund||"Termin"} am <em>${t.datum||"—"}</em> um <em>${t.zeit||"--:--"}</em>${t.notiz?("<br>"+t.notiz):""}`,
    formHTML: `
      ${select("Patient","patient", STORE.kinderarzt.patienten.map(p=>`${p.vorname} ${p.nachname}`))}
      ${input("Datum","datum",true,"date",today())}
      ${input("Uhrzeit","zeit",true,"time","09:00")}
      ${input("Grund","grund",false,"text","z. B. U6, Impfung, Fieber")}
      ${textarea("Notiz","notiz")}
      <div class="toolbar">
        <button class="btn primary" type="submit">Termin speichern</button>
        <button class="btn" type="button" onclick="(${(x)=>exportCSV(x,'kinderarzt-termine.csv')})(${JSON.stringify(STORE.kinderarzt.termine)})">CSV exportieren</button>
      </div>
    `,
    onSubmit: data => addDocTo(COL.kid_termine, data)
  }));
}

/* ====== UI-Bausteine ====== */
function cardInfo(title, text){
  const d = ce("div",{className:"card"});
  // \n\n → neuer Absatz
  const htmlText = text
    .split("\n\n")
    .map(t => `<p class="muted">${t}</p>`)
    .join("");
  d.innerHTML = `<h3>${title}</h3>${htmlText}`;
  return d;
}

// ▼ UI-Helper (für Formulare & Badges)
function badge(txt){ 
  return `<span class="badge">${txt}</span>`; 
}
function input(label,name,required=false,type="text",value="",extraAttrs={}){
  const attrs = Object.entries(extraAttrs).map(([k,v])=>`${k}="${v}"`).join(" ");
  return `<label>${label}<input name="${name}" type="${type}" value="${value||""}" ${required?"required":""} ${attrs}></label>`;
}
function textarea(label,name,value=""){ 
  return `<label>${label}<textarea name="${name}">${value||""}</textarea></label>`; 
}
function select(label,name,options=[]){
  const opts = options.map(o=>`<option value="${o}">${o}</option>`).join("");
  return `<label>${label}<select name="${name}">${opts}</select></label>`;
}

function listFormCard({title, list, renderLine, formHTML, onSubmit}){
  const wrap = ce("div",{className:"card"});
  wrap.innerHTML = `<h3>${title}</h3>`;

  // Liste rendern
  if (!list?.length){
    const p = ce("p",{className:"muted"}); p.textContent = "Noch keine Einträge."; wrap.appendChild(p);
  } else {
    list.forEach(item => { const d=ce("div"); d.innerHTML = renderLine(item); wrap.appendChild(d); });
  }

  // Formular
  const form = ce("form"); form.innerHTML = formHTML;

  // Falls KEIN Submit-Button im formHTML vorhanden ist → automatisch hinzufügen
  const hasSubmit = !!form.querySelector('button[type="submit"]');
  if (!hasSubmit){
    const bar = ce("div",{className:"toolbar"});
    const submit = ce("button",{className:"btn primary", type:"submit", textContent:"Speichern"});
    bar.appendChild(submit);
    form.appendChild(bar);
  }

  // Submit-Handling (mit einfachem Ladezustand)
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn?.textContent;
    if (btn){ btn.disabled = true; btn.textContent = "Speichern…"; }
    try{
      await onSubmit(data);
      form.reset();
    }catch(err){
      console.error("Speichern fehlgeschlagen:", err);
      alert("Speichern fehlgeschlagen: " + (err.message || err));
    }finally{
      if (btn){ btn.disabled = false; btn.textContent = orig || "Speichern"; }
    }
  });

  wrap.appendChild(form);
  return wrap;
}

/* ====== Export (Gesamt) ====== */
function exportAllJSON(){
  // id/_ts entfernen für sauberes Trainings-JSON
  const strip = (arr)=> arr.map(({id,_ts, ...rest})=>rest);
  const out = {
    kita: {
      kinder: strip(STORE.kita.kinder),
      beobachtungen: strip(STORE.kita.beobachtungen),
      anwesenheit: strip(STORE.kita.anwesenheit),
      eltern: strip(STORE.kita.eltern),
    },
    pflege: {
      bewohner: strip(STORE.pflege.bewohner),
      berichte: strip(STORE.pflege.berichte),
      vitals: strip(STORE.pflege.vitals),
      medis: strip(STORE.pflege.medis),
      sturz: strip(STORE.pflege.sturz),
    },
    krankenhaus: {
      patienten: strip(STORE.krankenhaus.patienten),
      vitals: strip(STORE.krankenhaus.vitals),
    },
    ambulant: {
      touren: strip(STORE.ambulant.touren),
    },
    ergo: {
      einheiten: strip(STORE.ergo.einheiten),
    },
    apotheke: {
      abgaben: strip(STORE.apotheke.abgaben),
    },
    kinderarzt: {
      patienten: strip(STORE.kinderarzt.patienten),
      besuche: strip(STORE.kinderarzt.besuche),
      termine: strip(STORE.kinderarzt.termine),
    }
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)], {type:"application/json"}));
  const a = ce("a", {href:url, download:"stiftung-export.json"}); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 300);
}

/* ====== Demo-Daten in Firestore schreiben (optional aus dem Menü „Sonstiges“) ====== */
async function seedDemo(){
  // Kita
  await addDocTo(COL.kita_kinder, { vorname:"Mila", nachname:"Klein", geburtstag:"2020-04-18", gruppe:"Sonnen" });
  await addDocTo(COL.kita_kinder, { vorname:"Yunus", nachname:"Aziz", geburtstag:"2019-11-02", gruppe:"Löwen" });
  await addDocTo(COL.kita_beobachtungen, { kindId:"Mila Klein", datum: today(), bereich:"Sprache", text:"Zwei- bis Dreiwortsätze, benennt Farben." });
  await addDocTo(COL.kita_anwesenheit, { kindId:"Mila Klein", datum: today(), status:"anwesend", abholer:"Mutter" });
  await addDocTo(COL.kita_eltern, { kindId:"Mila Klein", datum: today(), kanal:"Tür-und-Angel", inhalt:"Schlafenszeit besprochen." });

  // Pflege
  await addDocTo(COL.pflege_bewohner, { vorname:"Karl", nachname:"Schmidt", geburt:"1941-07-12", zimmer:"2.14", pflegegrad:3 });
  await addDocTo(COL.pflege_bewohner, { vorname:"Hanne", nachname:"Vogel", geburt:"1938-03-03", zimmer:"1.07", pflegegrad:2 });
  await addDocTo(COL.pflege_berichte, { bewohnerId:"Karl Schmidt", datum: today(), bereich:"ATL: Sich bewegen", text:"Mobilisation mit Rollator; wach, kooperativ." });
  await addDocTo(COL.pflege_vitals, { bewohnerId:"Karl Schmidt", datum: today(), puls:78, rr:"132/78", temp:36.6, spo2:97 });
  await addDocTo(COL.pflege_medis, { bewohnerId:"Karl Schmidt", datum: today(), medikament:"Metoprolol 47,5 mg", uhrzeit:"08:00", status:"gegeben", bemerkung:"—" });
  await addDocTo(COL.pflege_sturz, { bewohnerId:"Hanne Vogel", datum: today(), ort:"Bad", folgen:"Hämatom li. Unterarm", arzt:"nein", meldung:"Team & Angehörige informiert" });

  // Krankenhaus
  await addDocTo(COL.kh_patienten, { name:"Franz Meier", geburt:"1958-02-21", fach:"Innere", datum: today() });
  await addDocTo(COL.kh_vitals, { pat:"Franz Meier", datum: today(), puls:82, rr:"128/76", temp:36.8, spo2:98 });

  // Ambulant
  await addDocTo(COL.amb_touren, { klient:"Emine Kaya", datum: today(), leistung:"LK 3 – große Morgenpflege", von:"08:00", bis:"08:45" });

  // Ergo
  await addDocTo(COL.ergo_einheiten, { klient:"Nora Lehmann", datum: today(), ziel:"Feinmotorik", inhalt:"Perlen sortieren, Knetübung, Pinzettengriff." });

  // Apotheke
  await addDocTo(COL.apo_abgaben, { name:"Paul Weber", datum: today(), praeparat:"Platzhalterpräparat", dosis:"1-0-1 nach dem Essen" });

  // Kinderarzt
  await addDocTo(COL.kid_patienten, { vorname:"Lina", nachname:"Yilmaz", geburt:"2021-06-12", kasse:"AOK", versnr:"A123456789" });
  await addDocTo(COL.kid_besuche, { patient:"Lina Yilmaz", datum: today(), grund:"U6", befund:"altersgerecht, unauffällig", therapie:"Beratung Ernährung & Schlaf" });
  await addDocTo(COL.kid_termine, { patient:"Lina Yilmaz", datum: today(), zeit:"10:30", grund:"Impfung", notiz:"Aufklärung zu Nebenwirkungen." });
}

/* ====== Optional: kleiner Diagnose-Test – kann später entfernt werden ====== */
authReady.then(async ()=>{
  try {
    const ref = await addDoc(
      collection(db, "tenants/stiftung/_diagnose"),
      { ok: true, _ts: serverTimestamp() }
    );
    console.log("Firestore Test OK, doc id:", ref.id);
  } catch(err) {
    console.error("Firestore Test FEHLER:", err);
  }
});
