/* Hammouda-Itani-Stiftung – app.js (Firebase-Realtime, v2.0)
   - Zentrale Speicherung: Firestore (Echtzeit)
   - Startseite: Infotext + Personenbox + News
   - Seiten: erst Subjekt wählen, dann Tabs (Pflegedoku, Anordnungen, Maßnahmen, Sturz, Wunde, Vital, Medikation, Flüssigkeit, Lagerung/Mobi, Schmerz)
   - Kinderarzt heißt "Lieblings-Kinder"
   - Leitungsbox pro Unternehmen
   - Auto-Submit-Button, CSV/JSON-Export, Dark-Mode, Absatz-Logik
*/

import { db, authReady } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ====== Einstellungen ====== */
const TENANT_ID = "stiftung";

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
  { id:"kinderarzt",    title:"Lieblings-Kinder",              slogan:"Mit Liebe, Ruhe und Wissen für die Kleinsten." },
];

/* Leitungen pro Unternehmen */
const LEADS = {
  kinderarzt: "Jessica",
  krankenhaus: "Samira",
  pflegeheim: "Evan",
  ergo: "Artika",
  kita: "Amadu",
  apotheke: "Shams",
  ambulant: "Josy",
};

/* ====== UI-Status (persistenter Zustand) ====== */
const UI_KEY = "stiftung-ui-v3";
function loadUI(){
  try { return JSON.parse(localStorage.getItem(UI_KEY)) || { lastPage:"home", dark:false }; }
  catch { return { lastPage:"home", dark:false }; }
}
function saveUI(patch){ localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUI(), ...patch })); }
let CURRENT_PAGE = loadUI().lastPage || "home";

/* ====== In-Memory Store (wird von Firestore gespeist) ====== */
const STORE = {
  // Kita
  kita: { kinder: [], beobachtungen: [], anwesenheit: [], eltern: [] },

  // Pflegeheim
  pflege: {
    bewohner: [], doku: [], anordnungen: [], massnahmen: [], sturz: [],
    wunden: [], vitals: [], medis: [], fluessigkeit: [], lagerung: [], schmerz: []
  },

  // Krankenhaus
  krankenhaus: {
    patienten: [], doku: [], anordnungen: [], massnahmen: [], sturz: [],
    wunden: [], vitals: [], medis: [], fluessigkeit: [], lagerung: [], schmerz: []
  },

  // Ambulant
  ambulant: {
    klienten: [], touren: [],
    doku: [], anordnungen: [], massnahmen: [], sturz: [],
    wunden: [], vitals: [], medis: [], fluessigkeit: [], lagerung: [], schmerz: []
  },

  // Ergo
  ergo: { einheiten: [] },

  // Apotheke
  apotheke: { abgaben: [] },

  // Kinderarzt
  kinderarzt: { patienten: [], besuche: [], termine: [] }
};

/* ====== Firestore-Sammlungen (Pfade) ====== */
const pref = (p) => `tenants/${TENANT_ID}/${p}`;
const COL = {
  // Kita
  kita_kinder:           pref(`kita_kinder`),
  kita_beobachtungen:    pref(`kita_beobachtungen`),
  kita_anwesenheit:      pref(`kita_anwesenheit`),
  kita_eltern:           pref(`kita_eltern`),

  // Pflegeheim
  pflege_bewohner:       pref(`pflege_bewohner`),
  pflege_doku:           pref(`pflege_doku`),
  pflege_anordnungen:    pref(`pflege_anordnungen`),
  pflege_massnahmen:     pref(`pflege_massnahmen`),
  pflege_sturz:          pref(`pflege_sturz`),
  pflege_wunden:         pref(`pflege_wunden`),
  pflege_vitals:         pref(`pflege_vitals`),
  pflege_medis:          pref(`pflege_medis`),
  pflege_fluessigkeit:   pref(`pflege_fluessigkeit`),
  pflege_lagerung:       pref(`pflege_lagerung`),
  pflege_schmerz:        pref(`pflege_schmerz`),

  // Krankenhaus
  kh_patienten:          pref(`kh_patienten`),
  kh_doku:               pref(`kh_doku`),
  kh_anordnungen:        pref(`kh_anordnungen`),
  kh_massnahmen:         pref(`kh_massnahmen`),
  kh_sturz:              pref(`kh_sturz`),
  kh_wunden:             pref(`kh_wunden`),
  kh_vitals:             pref(`kh_vitals`),
  kh_medis:              pref(`kh_medis`),
  kh_fluessigkeit:       pref(`kh_fluessigkeit`),
  kh_lagerung:           pref(`kh_lagerung`),
  kh_schmerz:            pref(`kh_schmerz`),

  // Ambulant
  amb_klienten:          pref(`amb_klienten`),
  amb_touren:            pref(`amb_touren`),
  amb_doku:              pref(`amb_doku`),
  amb_anordnungen:       pref(`amb_anordnungen`),
  amb_massnahmen:        pref(`amb_massnahmen`),
  amb_sturz:             pref(`amb_sturz`),
  amb_wunden:            pref(`amb_wunden`),
  amb_vitals:            pref(`amb_vitals`),
  amb_medis:             pref(`amb_medis`),
  amb_fluessigkeit:      pref(`amb_fluessigkeit`),
  amb_lagerung:          pref(`amb_lagerung`),
  amb_schmerz:           pref(`amb_schmerz`),

  // Ergo / Apotheke / Kinderarzt
  ergo_einheiten:        pref(`ergo_einheiten`),
  apo_abgaben:           pref(`apo_abgaben`),
  kid_patienten:         pref(`kid_patienten`),
  kid_besuche:           pref(`kid_besuche`),
  kid_termine:           pref(`kid_termine`),
};

/* ====== Boot ====== */
document.addEventListener("DOMContentLoaded", async () => {
  const ui = loadUI();
  if (ui.dark || (window.matchMedia?.('(prefers-color-scheme: dark)').matches && ui.dark !== false)) {
    document.documentElement.classList.add("dark");
  }

  setupDropdown("companyDropdown", "companyBtn", "companyMenu");
  setupDropdown("moreDropdown", "moreBtn", "moreMenu");
  buildCompanyMenu();

  qs("#printBtn")?.addEventListener("click", () => window.print());

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("#moreMenu button");
    if (!btn) return;
    const act = btn.dataset.action;
    if (act==="export-json") exportAllJSON();
    if (act==="dark") { document.documentElement.classList.toggle("dark"); saveUI({ dark: document.documentElement.classList.contains("dark") }); }
    if (act==="seed") seedDemo();
    if (act==="reset") alert("Bei zentraler Speicherung gibt es hier keinen ‚Alles löschen‘-Button.");
  });

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
  subscribe(asc(COL.pflege_doku), STORE.pflege.doku);
  subscribe(asc(COL.pflege_anordnungen), STORE.pflege.anordnungen);
  subscribe(asc(COL.pflege_massnahmen), STORE.pflege.massnahmen);
  subscribe(asc(COL.pflege_sturz), STORE.pflege.sturz);
  subscribe(asc(COL.pflege_wunden), STORE.pflege.wunden);
  subscribe(asc(COL.pflege_vitals), STORE.pflege.vitals);
  subscribe(asc(COL.pflege_medis), STORE.pflege.medis);
  subscribe(asc(COL.pflege_fluessigkeit), STORE.pflege.fluessigkeit);
  subscribe(asc(COL.pflege_lagerung), STORE.pflege.lagerung);
  subscribe(asc(COL.pflege_schmerz), STORE.pflege.schmerz);

  // KH
  subscribe(plain(COL.kh_patienten), STORE.krankenhaus.patienten);
  subscribe(asc(COL.kh_doku), STORE.krankenhaus.doku);
  subscribe(asc(COL.kh_anordnungen), STORE.krankenhaus.anordnungen);
  subscribe(asc(COL.kh_massnahmen), STORE.krankenhaus.massnahmen);
  subscribe(asc(COL.kh_sturz), STORE.krankenhaus.sturz);
  subscribe(asc(COL.kh_wunden), STORE.krankenhaus.wunden);
  subscribe(asc(COL.kh_vitals), STORE.krankenhaus.vitals);
  subscribe(asc(COL.kh_medis), STORE.krankenhaus.medis);
  subscribe(asc(COL.kh_fluessigkeit), STORE.krankenhaus.fluessigkeit);
  subscribe(asc(COL.kh_lagerung), STORE.krankenhaus.lagerung);
  subscribe(asc(COL.kh_schmerz), STORE.krankenhaus.schmerz);

  // Ambulant
  subscribe(plain(COL.amb_klienten), STORE.ambulant.klienten);
  subscribe(asc(COL.amb_touren), STORE.ambulant.touren);
  subscribe(asc(COL.amb_doku), STORE.ambulant.doku);
  subscribe(asc(COL.amb_anordnungen), STORE.ambulant.anordnungen);
  subscribe(asc(COL.amb_massnahmen), STORE.ambulant.massnahmen);
  subscribe(asc(COL.amb_sturz), STORE.ambulant.sturz);
  subscribe(asc(COL.amb_wunden), STORE.ambulant.wunden);
  subscribe(asc(COL.amb_vitals), STORE.ambulant.vitals);
  subscribe(asc(COL.amb_medis), STORE.ambulant.medis);
  subscribe(asc(COL.amb_fluessigkeit), STORE.ambulant.fluessigkeit);
  subscribe(asc(COL.amb_lagerung), STORE.ambulant.lagerung);
  subscribe(asc(COL.amb_schmerz), STORE.ambulant.schmerz);

  // Ergo / Apo / Kinderarzt
  subscribe(asc(COL.ergo_einheiten), STORE.ergo.einheiten);
  subscribe(asc(COL.apo_abgaben), STORE.apotheke.abgaben);
  subscribe(plain(COL.kid_patienten), STORE.kinderarzt.patienten);
  subscribe(asc(COL.kid_besuche), STORE.kinderarzt.besuche);
  subscribe(asc(COL.kid_termine), STORE.kinderarzt.termine);
}

function subscribe(refOrQuery, targetArr){
  onSnapshot(refOrQuery, (snap)=>{
    targetArr.length = 0;
    snap.forEach(d => targetArr.push({ id:d.id, ...d.data() }));
    render();
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

  document.dispatchEvent(new CustomEvent('stiftung:pagechange',{detail:{title:page.title,slogan:page.slogan}}));

  const hero = qs("#hero");
  hero.innerHTML = `<div class="card"><h1>${page.title}</h1><p>${page.slogan}</p></div>`;

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

Stiftungs-Präsident: Z. Bremkens; Stiftungs-Vorsitzende: B. Terhardt-Hammouda; Stiftungs-Vorsitzender: A.R. Itani; Geschäftsführerin der Stiftung: V. Lauth`
  ));

  // Personen-Box
  app.appendChild(personsGrid([
    { role:"Stiftungspräsident", name:"Z. Bremkens" },
    { role:"Stiftungs-Vorsitzende", name:"B. Terhardt-Hammouda" },
    { role:"Stiftungs-Vorsitzender", name:"A.R. Itani" },
    { role:"Stiftungs-Geschäftsführerin", name:"V. Lauth" },
  ]));

  // News
  app.appendChild(cardInfo("News",
`Wir laden euch recht herzlich ein, am Donnerstag den 18.09.2025 mit uns gemeinsam zum Kindergarten an der Krabblerstr. in Essen zu kommen. Dort wird die Stiftung sich präsentieren und mit seinen Kooperationspartnern sich austauschen. 

Um 10 Uhr treffen wir uns dafür in der Boje an der Elisenstr., um gemeinsam den Tag zu beginnen und Vorbereitungen zu treffen. Anschließend werden wir nach einem gemeinsamen Mittagessen zum Kindergarten fahren. 

Bitte beachtet auch die geänderten Arbeitszeiten.`));

  // Stiftungs-E-Mail
  const mail = ce("div",{className:"card"});
  mail.innerHTML = `<h3>Kontakt</h3><p class="muted">E-Mail: <a href="mailto:bvb-pro@die-boje.de">bvb-pro@die-boje.de</a></p>`;
  app.appendChild(mail);
}

function personsGrid(items){
  const d = ce("div",{className:"card"});
  const grid = items.map((p,i)=>`
    <div class="person">
      <strong>${i+1}. ${p.role}: ${p.name}</strong>
      <div class="muted">Tel.: —&nbsp;&nbsp;Dienst. Handy: —&nbsp;&nbsp;E-Mail: —</div>
    </div>
  `).join("");
  d.innerHTML = `<h3>Stiftungs-Team</h3>
    <div class="grid-2">${grid}</div>`;
  return d;
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

/* ====== Seiten: Leitungsbox Helper ====== */
function leadBox(pageId){
  const leader = LEADS[pageId];
  if (!leader) return null;
  const d = ce("div",{className:"card"});
  d.innerHTML = `<h3>Leitung</h3><p class="muted">Verantwortlich: <strong>${leader}</strong></p>`;
  return d;
}

/* ====== Kita ====== */
function renderKita(app){
  app.appendChild(leadBox("kita") || ce("div"));
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
      </div>
    `,
    onSubmit: data => addDocTo(COL.kita_beobachtungen, data)
  }));
}

/* ====== Pflegeheim – Subjekt => Tabs ====== */
function renderPflege(app){
  app.appendChild(leadBox("pflegeheim") || ce("div"));
  app.appendChild(cardInfo("Info",
    "Pflegeheim der Gemeinschaft: Bitte einen Bewohner wählen, dann einen Reiter öffnen."));

  // Bewohner-Auswahl
  const sel = selectorCard("Bewohner wählen", STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`));
  app.appendChild(sel.wrap);

  // Tabs erscheinen erst, wenn Bewohner gewählt
  const tabs = tabsHost();
  app.appendChild(tabs);

  sel.onChange((bewohner)=>{
    tabs.innerHTML = "";
    if (!bewohner) return;
    tabs.appendChild(
      tabsComponent([
        pflegeDokuModule("Pflegedokumentation", bewohner, COL.pflege_doku, STORE.pflege.doku, "bewohner"),
        anordnungenModule("Ärztliche Anordnungen", bewohner, COL.pflege_anordnungen, STORE.pflege.anordnungen, "bewohner"),
        massnahmenModule("Maßnahmen (abhakbar)", bewohner, COL.pflege_massnahmen, STORE.pflege.massnahmen, "bewohner"),
        sturzModule("Sturzprotokoll", bewohner, COL.pflege_sturz, STORE.pflege.sturz, "bewohner"),
        wundModule("Wundbericht", bewohner, COL.pflege_wunden, STORE.pflege.wunden, "bewohner"),
        vitalModule("Vitalwerte", bewohner, COL.pflege_vitals, STORE.pflege.vitals, "bewohner"),
        medModule("Medikationen", bewohner, COL.pflege_medis, STORE.pflege.medis, "bewohner"),
        fluidModule("Flüssigkeitsbilanz", bewohner, COL.pflege_fluessigkeit, STORE.pflege.fluessigkeit, "bewohner"),
        lagerungModule("Lagerung/Mobilisation", bewohner, COL.pflege_lagerung, STORE.pflege.lagerung, "bewohner"),
        schmerzModule("Schmerzbeobachtung", bewohner, COL.pflege_schmerz, STORE.pflege.schmerz, "bewohner"),
      ])
    );
  });
}

/* ====== Krankenhaus – Subjekt => Tabs ====== */
function renderKrankenhaus(app){
  app.appendChild(leadBox("krankenhaus") || ce("div"));
  app.appendChild(cardInfo("Info",
    "Mond-Krankenhaus: Bitte Patient wählen, dann Reiter öffnen."));

  // Patient-Auswahl
  const sel = selectorCard("Patient wählen", STORE.krankenhaus.patienten.map(p=>p.name || `${p.vorname||""} ${p.nachname||""}`.trim()).filter(Boolean));
  app.appendChild(sel.wrap);

  // Tabs
  const tabs = tabsHost();
  app.appendChild(tabs);

  sel.onChange((patient)=>{
    tabs.innerHTML = "";
    if (!patient) return;
    tabs.appendChild(
      tabsComponent([
        pflegeDokuModule("Pflegedokumentation", patient, COL.kh_doku, STORE.krankenhaus.doku, "patient"),
        anordnungenModule("Ärztliche Anordnungen", patient, COL.kh_anordnungen, STORE.krankenhaus.anordnungen, "patient"),
        massnahmenModule("Maßnahmen (abhakbar)", patient, COL.kh_massnahmen, STORE.krankenhaus.massnahmen, "patient"),
        sturzModule("Sturzprotokoll", patient, COL.kh_sturz, STORE.krankenhaus.sturz, "patient"),
        wundModule("Wundbericht", patient, COL.kh_wunden, STORE.krankenhaus.wunden, "patient"),
        vitalModule("Vitalwerte", patient, COL.kh_vitals, STORE.krankenhaus.vitals, "patient"),
        medModule("Medikationen", patient, COL.kh_medis, STORE.krankenhaus.medis, "patient"),
        fluidModule("Flüssigkeitsbilanz", patient, COL.kh_fluessigkeit, STORE.krankenhaus.fluessigkeit, "patient"),
        lagerungModule("Lagerung/Mobilisation", patient, COL.kh_lagerung, STORE.krankenhaus.lagerung, "patient"),
        schmerzModule("Schmerzbeobachtung", patient, COL.kh_schmerz, STORE.krankenhaus.schmerz, "patient"),
      ])
    );
  });

  // Mini-Aufnahme (Patient hinzufügen)
  app.appendChild(listFormCard({
    title:"Aufnahme (Patient anlegen)",
    list: STORE.krankenhaus.patienten,
    renderLine: p => `<strong>${p.name || (p.vorname+" "+p.nachname)}</strong> — ${p.fach||"—"} • ${p.datum||"—"}`,
    formHTML: `
      ${input("Patientenname","name",true)}
      ${select("Fachbereich","fach", ["Innere","Chirurgie","Geriatrie"])}
      ${input("Aufnahmedatum","datum",false,"date",today())}
    `,
    onSubmit: data => addDocTo(COL.kh_patienten, data)
  }));
}

/* ====== Ambulant – Subjekt => Tabs ====== */
function renderAmbulant(app){
  app.appendChild(leadBox("ambulant") || ce("div"));
  app.appendChild(cardInfo("Info",
    "Ambulanter Pflegedienst zum Stern: Bitte Klient wählen, dann Reiter öffnen."));

  // Klienten-Auswahl (+ Möglichkeit, neuen Klienten anzulegen)
  const sel = selectorCard("Klient wählen", STORE.ambulant.klienten.map(x=>x.name || x.klient || "").filter(Boolean));
  app.appendChild(sel.wrap);

  // Tabs
  const tabs = tabsHost();
  app.appendChild(tabs);

  sel.onChange((klient)=>{
    tabs.innerHTML = "";
    if (!klient) return;
    tabs.appendChild(
      tabsComponent([
        pflegeDokuModule("Pflegedokumentation", klient, COL.amb_doku, STORE.ambulant.doku, "klient"),
        anordnungenModule("Ärztliche Anordnungen", klient, COL.amb_anordnungen, STORE.ambulant.anordnungen, "klient"),
        massnahmenModule("Maßnahmen (abhakbar)", klient, COL.amb_massnahmen, STORE.ambulant.massnahmen, "klient"),
        sturzModule("Sturzprotokoll", klient, COL.amb_sturz, STORE.ambulant.sturz, "klient"),
        wundModule("Wundbericht", klient, COL.amb_wunden, STORE.ambulant.wunden, "klient"),
        vitalModule("Vitalwerte", klient, COL.amb_vitals, STORE.ambulant.vitals, "klient"),
        medModule("Medikationen", klient, COL.amb_medis, STORE.ambulant.medis, "klient"),
        fluidModule("Flüssigkeitsbilanz", klient, COL.amb_fluessigkeit, STORE.ambulant.fluessigkeit, "klient"),
        lagerungModule("Lagerung/Mobilisation", klient, COL.amb_lagerung, STORE.ambulant.lagerung, "klient"),
        schmerzModule("Schmerzbeobachtung", klient, COL.amb_schmerz, STORE.ambulant.schmerz, "klient"),
      ])
    );
  });

  // Klient anlegen
  app.appendChild(listFormCard({
    title:"Klient anlegen",
    list: STORE.ambulant.klienten,
    renderLine: x => `<strong>${x.name || x.klient}</strong> — ${x.hinweis||"—"}`,
    formHTML: `
      ${input("Name","name",true)}
      ${input("Hinweis (optional)","hinweis",false)}
    `,
    onSubmit: data => addDocTo(COL.amb_klienten, data)
  }));

  // (bestehendes) Touren-Beispiel
  app.appendChild(listFormCard({
    title:"Touren (Beispiel)",
    list: STORE.ambulant.touren,
    renderLine: x => `<strong>${x.klient}</strong> — ${x.leistung||"—"} am <em>${x.datum||"—"}</em> • Zeit: ${x.von||"--"}–${x.bis||"--"}`,
    formHTML: `
      ${input("Klient","klient",true)}
      ${input("Datum","datum",false,"date",today())}
      ${input("Leistung","leistung",false,"text","z. B. SGB XI LK …")}
      ${input("Von","von",false,"time","08:00")}
      ${input("Bis","bis",false,"time","08:30")}
      <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
    `,
    onSubmit: data => addDocTo(COL.amb_touren, data)
  }));
}

/* ====== Ergo ====== */
function renderErgo(app){
  app.appendChild(leadBox("ergo") || ce("div"));
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
      <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
    `,
    onSubmit: data => addDocTo(COL.ergo_einheiten, data)
  }));
}

/* ====== Apotheke ====== */
function renderApotheke(app){
  app.appendChild(leadBox("apotheke") || ce("div"));
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
      <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
    `,
    onSubmit: data => addDocTo(COL.apo_abgaben, data)
  }));
}

/* ====== Lieblings-Kinder ====== */
function renderKinderarzt(app){
  app.appendChild(leadBox("kinderarzt") || ce("div"));
  app.appendChild(cardInfo("Info",
    "Lieblings-Kinder: Aufnahme & Besuchsdokumentation – kindgerecht, klar und kurz (Training)."));

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
      <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
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
      <div class="toolbar"><button class="btn primary" type="submit">Termin speichern</button></div>
    `,
    onSubmit: data => addDocTo(COL.kid_termine, data)
  }));
}

/* ====== Module-Builder (Tabs) ====== */
function tabsHost(){ return ce("div",{className:"card"}); }

function tabsComponent(items){
  const wrap = ce("div",{});
  const tabs = ce("div",{className:"tabs"});
  const panels = ce("div",{});

  items.forEach((item, idx)=>{
    const btn = ce("button",{className:"tab"+(idx===0?" active":""), textContent:item.title});
    const panel = ce("div",{className:"panel"+(idx===0?" show":"" )});
    panel.appendChild(item.content);
    btn.addEventListener("click", ()=>{
      tabs.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      panels.querySelectorAll(".panel").forEach(p=>p.classList.remove("show"));
      btn.classList.add("active");
      panel.classList.add("show");
    });
    tabs.appendChild(btn);
    panels.appendChild(panel);
  });

  wrap.appendChild(tabs);
  wrap.appendChild(panels);
  return wrap;
}

function selectorCard(title, options){
  const wrap = ce("div",{className:"card"});
  wrap.innerHTML = `<h3>${title}</h3>`;
  const sel = ce("select",{});
  sel.innerHTML = `<option value="">— bitte auswählen —</option>` + options.map(o=>`<option>${o}</option>`).join("");
  wrap.appendChild(sel);
  const handlers = [];
  sel.addEventListener("change", ()=> handlers.forEach(h=>h(sel.value)));
  return { wrap, onChange: (fn)=>handlers.push(fn) };
}

/* ====== Einzelmodule ====== */
function filterBy(arr, key, value){ return arr.filter(x => (x[key]||"")===value); }

function pflegeDokuModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: x => `<strong>${x[keyName]}</strong> • ${x.bereich||"—"} — <em>${x.datum||"—"}</em><br>${x.text||"—"}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${select("Bereich","bereich", ["ATL/AEDL","Mobilität","Ernährung","Ausscheidung","Kommunikation","Sonstiges"])}
        ${textarea("Text","text")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj })
    })
  };
}

function anordnungenModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: x => `<strong>${x[keyName]}</strong> — <em>${x.datum||"—"}</em><br>${x.text||"—"} ${x.von?badge("von: "+x.von):""}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Angeordnet von","von",false,"text","Dr. …")}
        ${textarea("Anordnung","text")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj })
    })
  };
}

function massnahmenModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: x => `${x.done?badge("erledigt"):badge("offen")} <strong>${x[keyName]}</strong> — ${x.massnahme||"—"} • <em>${x.datum||"—"}</em> ${x.von?("• Anordnung: "+x.von):""}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Maßnahme","massnahme",true,"text","z. B. RR 2× tgl., Mobilisation …")}
        ${input("Anordnung durch","von",false,"text","Dr. …")}
        ${select("Status","done", ["offen","erledigt"])}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj, done: data.done==="erledigt" })
    })
  };
}

function sturzModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: s => `<strong>${s[keyName]}</strong> — ${s.ort||"—"} am <em>${s.datum||"—"}</em><br>Folgen: ${s.folgen||"—"} • Arzt: ${s.arzt||"—"} • Meldung: ${s.meldung||"—"}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Ort","ort",false,"text","Bad, Zimmer, Flur …")}
        ${textarea("Folgen","folgen")}
        ${select("Arzt informiert?","arzt", ["ja","nein"])}
        ${textarea("Meldung/Infofluss","meldung","Team/Angehörige informiert …")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj })
    })
  };
}

function wundModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: w => `<strong>${w[keyName]}</strong> — ${w.lokalisation||"—"} (${w.stadium||"?"}) <em>${w.datum||"—"}</em><br>Größe: ${w.groesse||"?"} • Exsudat: ${w.exsudat||"?"} • Verband: ${w.verband||"—"}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Lokalisation","lokalisation",false,"text","z. B. Sakral, Ferse")}
        ${input("Stadium/Art","stadium",false,"text","z. B. Dekubitus II")}
        ${input("Größe (cm)","groesse",false,"text","L×B×T")}
        ${input("Exsudat","exsudat",false,"text","gering/mittel/stark")}
        ${input("Verband","verband",false,"text","z. B. Alginat, Folie")}
        ${input("Foto-URL (optional)","foto",false,"url")}
        ${textarea("Bemerkung","bemerkung")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj })
    })
  };
}

function vitalModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: v => `<strong>${v[keyName]}</strong> — Puls ${v.puls||"?"}/min, RR ${v.rr||"?"}, Temp ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% (${v.datum||"—"})`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Puls (/min)","puls",false,"number")}
        ${input("RR","rr",false,"text","120/80")}
        ${input("Temp (°C)","temp",false,"number","",{"step":"0.1"})}
        ${input("SpO₂ (%)","spo2",false,"number")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, {
        ...data, [keyName]: subj,
        puls: data.puls?Number(data.puls):undefined,
        temp: data.temp?Number(data.temp):undefined,
        spo2: data.spo2?Number(data.spo2):undefined
      })
    })
  };
}

function medModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: m => `<strong>${m[keyName]}</strong> — ${m.wirkstoff||m.praeparat||"Med."} • ${m.dosis||"—"} (${m.darreichung||"—"}, ${m.anwendung||"—"}) <em>${m.datum||"—"}</em><br>Hersteller: ${m.hersteller||"—"} • Grund: ${m.grund||"—"}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Präparat","praeparat",false,"text")}
        ${input("Wirkstoff","wirkstoff",false,"text")}
        ${input("Dosis","dosis",false,"text","z. B. 1-0-1")}
        ${input("Darreichungsform","darreichung",false,"text","Tablette, Tropfen …")}
        ${input("Anwendungsform","anwendung",false,"text","p.o., i.v., topisch …")}
        ${input("Hersteller","hersteller",false,"text")}
        ${input("Grund der Anwendung","grund",false,"text")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj })
    })
  };
}

function fluidModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: f => {
        const ein = Number(f.einfuhr_ml||0), aus = Number(f.ausfuhr_ml||0);
        const bilanz = (ein - aus);
        return `<strong>${f[keyName]}</strong> — ${f.datum||"—"} • Einfuhr: ${ein} ml, Ausfuhr: ${aus} ml, Bilanz: ${bilanz} ml${f.kommentar?(" — "+f.kommentar):""}`;
      },
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Einfuhr (ml)","einfuhr_ml",false,"number")}
        ${input("Ausfuhr (ml)","ausfuhr_ml",false,"number")}
        ${input("Kommentar","kommentar",false,"text")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, {
        ...data, [keyName]: subj,
        einfuhr_ml: data.einfuhr_ml?Number(data.einfuhr_ml):undefined,
        ausfuhr_ml: data.ausfuhr_ml?Number(data.ausfuhr_ml):undefined
      })
    })
  };
}

function lagerungModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: l => `<strong>${l[keyName]}</strong> — ${l.art||"—"}: ${l.technik||"—"} • ${l.dauer_min?l.dauer_min+" min":"—"} <em>${l.datum||"—"}</em>`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${select("Art","art", ["Lagerung","Mobilisation"])}
        ${input("Lagerung/Mobilisation (Technik)","technik",false,"text","z. B. 30°-Lagerung, Mobilisation an die Bettkante")}
        ${input("Dauer (Minuten)","dauer_min",false,"number")}
        ${textarea("Bemerkung","bemerkung")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj, dauer_min: data.dauer_min?Number(data.dauer_min):undefined })
    })
  };
}

function schmerzModule(title, subj, col, storeArr, keyName){
  const list = filterBy(storeArr, keyName, subj);
  return {
    title,
    content: listFormCard({
      title,
      list,
      renderLine: s => `<strong>${s[keyName]}</strong> — NRS: ${s.nrs??"?"} • Ort: ${s.ort||"—"} • Art: ${s.charakter||"—"} <em>${s.datum||"—"}</em><br>Maßnahmen: ${s.massnahmen||"—"} • Erfolg: ${s.erfolg||"—"}`,
      formHTML: `
        ${input("Datum","datum",false,"date",today())}
        ${input("Schmerzskala (0–10)","nrs",false,"number")}
        ${input("Ort","ort",false,"text")}
        ${input("Charakter","charakter",false,"text","stechend, dumpf …")}
        ${textarea("Maßnahmen","massnahmen")}
        ${input("Erfolg (z. B. NRS ↓)","erfolg",false,"text")}
        ${hidden(keyName, subj)}
        <div class="toolbar"><button class="btn primary" type="submit">Speichern</button></div>
      `,
      onSubmit: data => addDocTo(col, { ...data, [keyName]: subj, nrs: data.nrs?Number(data.nrs):undefined })
    })
  };
}

/* ====== UI-Bausteine ====== */
function cardInfo(title, text){
  const d = ce("div",{className:"card"});
  const htmlText = text.split("\n\n").map(t => `<p class="muted">${t}</p>`).join("");
  d.innerHTML = `<h3>${title}</h3>${htmlText}`;
  return d;
}
function badge(txt){ return `<span class="badge">${txt}</span>`; }
function hidden(name, value){ return `<input type="hidden" name="${name}" value="${value}">`; }
function input(label,name,required=false,type="text",value="",extraAttrs={}){
  const attrs = Object.entries(extraAttrs).map(([k,v])=>`${k}="${v}"`).join(" ");
  return `<label>${label}<input name="${name}" type="${type}" value="${value||""}" ${required?"required":""} ${attrs}></label>`;
}
function textarea(label,name,value=""){ return `<label>${label}<textarea name="${name}">${value||""}</textarea></label>`; }
function select(label,name,options=[]){
  const opts = options.map(o=>`<option value="${o}">${o}</option>`).join("");
  return `<label>${label}<select name="${name}">${opts}</select></label>`;
}

function listFormCard({title, list, renderLine, formHTML, onSubmit}){
  const wrap = ce("div",{className:"card"});
  wrap.innerHTML = `<h3>${title}</h3>`;

  if (!list?.length){
    const p = ce("p",{className:"muted"}); p.textContent = "Noch keine Einträge."; wrap.appendChild(p);
  } else {
    list.forEach(item => { const d=ce("div"); d.innerHTML = renderLine(item); wrap.appendChild(d); });
  }

  const form = ce("form"); form.innerHTML = formHTML;

  const hasSubmit = !!form.querySelector('button[type="submit"]');
  if (!hasSubmit){
    const bar = ce("div",{className:"toolbar"});
    const submit = ce("button",{className:"btn primary", type:"submit", textContent:"Speichern"});
    bar.appendChild(submit);
    form.appendChild(bar);
  }

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
      doku: strip(STORE.pflege.doku),
      anordnungen: strip(STORE.pflege.anordnungen),
      massnahmen: strip(STORE.pflege.massnahmen),
      sturz: strip(STORE.pflege.sturz),
      wunden: strip(STORE.pflege.wunden),
      vitals: strip(STORE.pflege.vitals),
      medis: strip(STORE.pflege.medis),
      fluessigkeit: strip(STORE.pflege.fluessigkeit),
      lagerung: strip(STORE.pflege.lagerung),
      schmerz: strip(STORE.pflege.schmerz),
    },
    krankenhaus: {
      patienten: strip(STORE.krankenhaus.patienten),
      doku: strip(STORE.krankenhaus.doku),
      anordnungen: strip(STORE.krankenhaus.anordnungen),
      massnahmen: strip(STORE.krankenhaus.massnahmen),
      sturz: strip(STORE.krankenhaus.sturz),
      wunden: strip(STORE.krankenhaus.wunden),
      vitals: strip(STORE.krankenhaus.vitals),
      medis: strip(STORE.krankenhaus.medis),
      fluessigkeit: strip(STORE.krankenhaus.fluessigkeit),
      lagerung: strip(STORE.krankenhaus.lagerung),
      schmerz: strip(STORE.krankenhaus.schmerz),
    },
    ambulant: {
      klienten: strip(STORE.ambulant.klienten),
      touren: strip(STORE.ambulant.touren),
      doku: strip(STORE.ambulant.doku),
      anordnungen: strip(STORE.ambulant.anordnungen),
      massnahmen: strip(STORE.ambulant.massnahmen),
      sturz: strip(STORE.ambulant.sturz),
      wunden: strip(STORE.ambulant.wunden),
      vitals: strip(STORE.ambulant.vitals),
      medis: strip(STORE.ambulant.medis),
      fluessigkeit: strip(STORE.ambulant.fluessigkeit),
      lagerung: strip(STORE.ambulant.lagerung),
      schmerz: strip(STORE.ambulant.schmerz),
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

/* ====== Demo-Daten (optional) ====== */
async function seedDemo(){
  // Pflegeheim: Bewohner
  await addDocTo(COL.pflege_bewohner, { vorname:"Karl", nachname:"Schmidt" });
  await addDocTo(COL.pflege_bewohner, { vorname:"Hanne", nachname:"Vogel" });

  // KH: Patienten
  await addDocTo(COL.kh_patienten, { name:"Franz Meier", fach:"Innere", datum: today() });

  // Ambulant: Klienten
  await addDocTo(COL.amb_klienten, { name:"Emine Kaya" });
}

/* ====== Kleiner Diagnose-Test (optional) ====== */
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
