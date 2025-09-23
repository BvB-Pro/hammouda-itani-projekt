/* Hammouda-Itani-Stiftung – app.js (Tabs statt Dropdown)
   - Oben: Unternehmens-Leiste (Tabs)
   - Home: Infotext → Stiftungsleitung (Cards) → E-Mail-Box → Krabblerstraße-News
   - Unterseiten: Leadership-Tabelle + Module
*/

import { db, authReady, loginWithUsername, logout, auth } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, updateDoc, doc, where, getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { storage } from "./firebase.js";


/* ====== Seiten ====== */
const PAGES = [
  { id:"home",        title:"Hammouda-Itani Stiftung",  slogan:"Die Stiftung von uns für uns.", logo:"assets/logos/Hammouda-Itani-Stiftung-Logo.PNG" },
  { id:"verwaltung",  title:"Hand in Hand Verwaltung",  slogan:"Zentrale Steuerung für starke Teams.", logo:"assets/logos/Hand-in-Hand-Verwaltung-Logo.jpeg" },
  { id:"kita",        title:"Die drei Löwen Kindergarten", slogan:"Der Kindergarten für echte Löwen.", logo:"assets/logos/Kindergarten-logo.PNG" },
  { id:"kinderarzt",  title:"Lieblings-Kinder", slogan:"Mit Liebe, Ruhe und Wissen für die Kleinsten.", logo:"assets/logos/Lieblingskinder-logo.PNG" },
  { id:"krankenhaus", title:"Mond-Krankenhaus", slogan:"Medizin mit Herz – Tag & Nacht.", logo:"assets/logos/Mond-Krankenhaus-logo.PNG" },
  { id:"pflegeheim",  title:"Pflegeheim der Gemeinschaft", slogan:"Würde. Nähe. Gemeinschaft.", logo:"assets/logos/Pflegeheim-logo.PNG" },
  { id:"ambulant",    title:"Ambulanter Pflegedienst zum Stern", slogan:"Hilfe, die zu Ihnen kommt.", logo:"assets/logos/ambulant-Logo.png" },
  { id:"ergo",        title:"Ergotherapeuten „Unart“", slogan:"Ungewohnt gut – Therapie neu gedacht.", logo:"assets/logos/Unart-logo.PNG" },
  { id:"apotheke",    title:"Sonnen Apotheke", slogan:"Die Apotheke mit dem Strahlen.", logo:"assets/logos/Sonnen-Apotheke-Logo.PNG" },
];

/* ====== Leadership (nur Unterseiten) ====== */
const LEADERSHIP = {
  krankenhaus: { title:"Leitung Krankenhaus", rows:[{ name:"Samira", role:"Leitung Krankenhaus", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"samira@stiftung.de" }] },
  kita:        { title:"Leitung Kindergarten", rows:[{ name:"Amadu", role:"Leitung Kindergarten", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"amadu@stiftung.de" }] },
  pflegeheim:  { title:"Leitung Altenheim / Pflegeheim", rows:[{ name:"Evan", role:"Leitung Altenheim/Pflegeheim", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"evan@stiftung.de" }] },
  ambulant:    { title:"Leitung Ambulanter Pflegedienst", rows:[{ name:"Josy", role:"Leitung Ambulante Pflege", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"josy@stiftung.de" }] },
  apotheke:    { title:"Leitung Apotheke", rows:[{ name:"Shams", role:"Leitung Apotheke", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"shams@stiftung.de" }] },
  verwaltung:  { title:"Hand in Hand Verwaltung", rows:[
    { name:"Markus", role:"Lager",     phone:"☎ 0201 12 51 74 - 28", mobile:"—", email:"markus@stiftung.de" },
    { name:"Ghina",  role:"Personal",  phone:"☎ 0201 12 51 74 - 28", mobile:"—", email:"ghina@stiftung.de" },
    { name:"Ali",    role:"Marketing", phone:"☎ 0201 12 51 74 - 28", mobile:"—", email:"ali@stiftung.de" },
  ]},
  kinderarzt:  { title:"Leitung Kinderarzt", rows:[{ name:"Jessica", role:"Leitung Kinderarzt", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"jessica@stiftung.de" }] },
  ergo:        { title:"Leitung Ergotherapie", rows:[{ name:"Artika", role:"Leitung Ergotherapie", phone:"☎ 0201 12 51 74 - 12", mobile:"—", email:"artika@stiftung.de" }] }
};

/* ====== Einstellungen & Helfer ====== */
const TENANT_ID = "stiftung";
const qs = (s) => document.querySelector(s);
const ce = (t, p = {}) => Object.assign(document.createElement(t), p);
const today = () => new Date().toISOString().slice(0,10);
const esc = (s="") => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const UI_KEY = "stiftung-ui-v3";
function loadUI(){ try{return JSON.parse(localStorage.getItem(UI_KEY))||{lastPage:"home",dark:false}}catch{return{lastPage:"home",dark:false}}}
function saveUI(patch){ localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUI(), ...patch })); }
let CURRENT_PAGE = loadUI().lastPage || "home";

function ensureGalleryStyles(){
  if (document.getElementById("galleryStyles")) return;
  const css = `
  .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
  .gallery-grid .thumb{display:block;border:0;background:none;padding:0;cursor:pointer}
  .gallery-grid img{width:100%;height:110px;object-fit:cover;border-radius:10px}
  .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:9999}
  .lightbox.open{display:flex}
  .lightbox img{max-width:92vw;max-height:86vh;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
  .lb-btn{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.15);padding:.6rem 1rem;border-radius:12px;cursor:pointer;font-size:1.1rem;color:#fff}
  .lb-prev{left:20px} .lb-next{right:20px}
  .lb-close{position:absolute;top:14px;right:14px;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:1rem;padding:.4rem .7rem;border-radius:10px;cursor:pointer}
  `;
  const style = ce("style",{id:"galleryStyles",textContent:css});
  document.head.appendChild(style);
}

// erzeugt/verwaltet eine einfache Lightbox
function ensureLightbox(imageList){
  if (document.getElementById("lightbox")) return;
  let idx = 0;

  const box = ce("div",{id:"lightbox",className:"lightbox","aria-modal":"true",role:"dialog"});
  const img = ce("img",{alt:"Foto"});
  const btnPrev = ce("button",{className:"lb-btn lb-prev",type:"button",innerText:"‹"});
  const btnNext = ce("button",{className:"lb-btn lb-next",type:"button",innerText:"›"});
  const btnClose= ce("button",{className:"lb-close",type:"button",innerText:"Schließen"});

  function show(i){
    idx = (i+imageList.length)%imageList.length;
    img.src = imageList[idx];
  }
  window.openLightbox = function(i=0){
    show(i);
    box.classList.add("open");
    btnClose.focus();
  };
  function close(){ box.classList.remove("open"); }
  function next(){ show(idx+1); }
  function prev(){ show(idx-1); }

  btnNext.addEventListener("click", next);
btnPrev.addEventListener("click", prev);
btnPrev.addEventListener("keydown", (e)=>{ if (e.key === "Enter" || e.key === " ") prev(); });
  btnClose.addEventListener("click", close);
  box.addEventListener("click",(e)=>{ if(e.target===box) close(); });
  document.addEventListener("keydown",(e)=>{
    if(!box.classList.contains("open")) return;
    if(e.key==="Escape") close();
    if(e.key==="ArrowRight") next();
    if(e.key==="ArrowLeft") prev();
  });

  box.appendChild(img);
  box.appendChild(btnPrev);
  box.appendChild(btnNext);
  box.appendChild(btnClose);
  document.body.appendChild(box);
}

/* ====== Firestore Pfade ====== */
const base = (name) => `tenants/${TENANT_ID}/${name}`;
const COL = {
     // Verwaltung
  verw_news:   base("verw_news"),
  verw_orders: base("verw_orders"),
  // Kita
  kita_kinder: base("kita_kinder"),
  kita_beobachtungen: base("kita_beobachtungen"),
  kita_anwesenheit: base("kita_anwesenheit"),
  kita_eltern: base("kita_eltern"),
  // Pflegeheim
  pflege_bewohner: base("pflege_bewohner"),
  pflege_anordnungen: base("pflege_anordnungen"),
  pflege_massnahmen: base("pflege_massnahmen"),
  pflege_sturz: base("pflege_sturz"),
  pflege_wunden: base("pflege_wunden"),
  pflege_vitals: base("pflege_vitals"),
  pflege_medis: base("pflege_medis"),
  pflege_fluess: base("pflege_fluess"),
  pflege_lagerung: base("pflege_lagerung"),
  pflege_schmerz: base("pflege_schmerz"),
  pflege_berichte: base("pflege_berichte"),
  // Krankenhaus
  kh_patienten: base("kh_patienten"),
  kh_anordnungen: base("kh_anordnungen"),
  kh_massnahmen: base("kh_massnahmen"),
  kh_sturz: base("kh_sturz"),
  kh_wunden: base("kh_wunden"),
  kh_vitals: base("kh_vitals"),
  kh_medis: base("kh_medis"),
  kh_fluess: base("kh_fluess"),
  kh_lagerung: base("kh_lagerung"),
  kh_schmerz: base("kh_schmerz"),
   kh_berichte: base("kh_berichte"),
  // Ambulant
  amb_klienten: base("amb_klienten"),
  amb_anordnungen: base("amb_anordnungen"),
  amb_massnahmen: base("amb_massnahmen"),
  amb_sturz: base("amb_sturz"),
  amb_wunden: base("amb_wunden"),
  amb_vitals: base("amb_vitals"),
  amb_medis: base("amb_medis"),
  amb_fluess: base("amb_fluess"),
  amb_lagerung: base("amb_lagerung"),
  amb_schmerz: base("amb_schmerz"),
     amb_berichte: base("amb_berichte"),
  // Ergo
  ergo_klienten: base("ergo_klienten"),
  ergo_einheiten: base("ergo_einheiten"),
     ergo_berichte: base("ergo_berichte"),
  // Apotheke
  apo_kunden: base("apo_kunden"),
  apo_abgaben: base("apo_abgaben"),
  // Kinderarzt
  kid_patienten: base("kid_patienten"),
  kid_besuche: base("kid_besuche"),
  kid_termine: base("kid_termine"),
   // Postfach
 postfach:        base("postfach"),      // ⬅️ NEU
};

/* ====== Store ====== */
const STORE = {
     verwaltung:{ news:[], orders:[] },
  kita:{kinder:[],beobachtungen:[],anwesenheit:[],eltern:[]},
  pflege:{bewohner:[],anordnungen:[],massnahmen:[],sturz:[],wunden:[],vitals:[],medis:[],fluess:[],lagerung:[],schmerz:[],berichte:[]},
  krankenhaus:{patienten:[],anordnungen:[],massnahmen:[],sturz:[],wunden:[],vitals:[],medis:[],fluess:[],lagerung:[],schmerz:[], berichte:[]},
  ambulant:{klienten:[],anordnungen:[],massnahmen:[],sturz:[],wunden:[],vitals:[],medis:[],fluess:[],lagerung:[],schmerz:[], berichte:[]},
  ergo:{klienten:[],einheiten:[], berichte:[]},
  apotheke:{kunden:[],abgaben:[]},
  kinderarzt:{patienten:[],besuche:[],termine:[]},
 postfach: [],   
};

/* ====== Boot ====== */
document.addEventListener("DOMContentLoaded", async () => {
  const ui = loadUI();
  if (ui.dark === true) document.documentElement.classList.add("dark");
setupDropdown("moreDropdown","moreBtn","moreMenu");
setupDropdown("userMenu","userBtn","userMenuItems");
   function ensureNotificationBadges(){
  // 1) Benutzer-Button (oben rechts)
  const userBtn = document.getElementById("userBtn");
  if (userBtn && !userBtn.querySelector(".noti-badge")) {
    const b = document.createElement("span");
    b.className = "noti-badge noti-hide";
    b.id = "badgeUserBtn";
    b.textContent = "0";
    userBtn.appendChild(b);
  }
  // 2) Eintrag "Postfach" im Dropdown
  const postfachBtn = document.querySelector('#userMenuItems button[data-action="postfach"]');
  if (postfachBtn && !postfachBtn.querySelector(".noti-badge")) {
    const b = document.createElement("span");
    b.className = "noti-badge noti-hide";
    b.id = "badgeMenuPostfach";
    b.textContent = "0";
    postfachBtn.appendChild(b);
  }
}
ensureNotificationBadges();

// kleine Helferfunktion zum Setzen
function setUnreadCount(n){
  const apply = (el)=> {
    if (!el) return;
    el.textContent = String(n);
    el.classList.toggle("noti-hide", n<=0);
  };
  apply(document.getElementById("badgeUserBtn"));
  apply(document.getElementById("badgeMenuPostfach"));
}


  buildCompanyTabs();

  // Login/Logout-UI
const loginCard = document.getElementById("loginCard");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

// Login-Formular absenden
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  const btn = loginForm.querySelector('button[type="submit"]');
  const t = btn.textContent;
  try{
    btn.disabled = true; btn.textContent = "Anmelden…";
    await loginWithUsername(data.username, data.password);
    loginForm.reset();
  }catch(err){
    alert("Login fehlgeschlagen: " + (err.code || err.message || err));
  }finally{
    btn.disabled = false; btn.textContent = t;
  }
});

// Logout
logoutBtn?.addEventListener("click", async ()=>{ await logout(); });

// Sichtbarkeit von App/Login steuern
// Sichtbarkeit von App/Login steuern
function updateAuthUI(){
  const isIn = !!auth.currentUser;

  // Login-Card zeigen/verstecken
  document.getElementById("loginCard")?.style && (
    document.getElementById("loginCard").style.display = isIn ? "none" : "block"
  );

  // Logout-Button nur für Eingeloggte
  document.getElementById("logoutBtn")?.style && (
    document.getElementById("logoutBtn").style.display = isIn ? "inline-flex" : "none"
  );

  // Hero, Tabs, App IMMER anzeigen (Gast darf alles sehen)
  document.getElementById("hero")?.style && (document.getElementById("hero").style.display = "");
  document.getElementById("companyTabs")?.style && (document.getElementById("companyTabs").style.display = "");
  document.getElementById("app")?.style && (document.getElementById("app").style.display = "");

  // Benutzeranzeige (oben in der Kopfzeile, falls Element existiert)
  const ud = document.getElementById("userDisplay");
  if (ud) {
    if (isIn) {
      const u = auth.currentUser;
      const name = u.displayName || (u.email ? u.email.split("@")[0] : "Unbekannt");
      ud.textContent = `Benutzer: ${name}`;
    } else {
      ud.textContent = "Gast";
    }
  }
}


  qs("#printBtn")?.addEventListener("click", () => window.print());
  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("#moreMenu button"); if (!btn) return;
    const act = btn.dataset.action;
    if (act==="export-json") exportAllJSON();
    if (act==="dark"){ document.documentElement.classList.toggle("dark"); saveUI({dark:document.documentElement.classList.contains("dark")}); }
    if (act==="reset") alert("Bei zentraler Speicherung gibt es hier keinen ‚Alles löschen‘-Button.");
  });
   document.body.addEventListener("click", (e)=>{
  const btn = e.target.closest("#userMenuItems button"); 
  if (!btn) return;
  const act = btn.dataset.action;

  if (act === "postfach") {
    switchTo("home");     // oder auf aktueller Seite bleiben
    renderPostfach(qs("#app"));
  }
  if (act === "logout") {
    logout();
  }
  if (act === "settings") {
    alert("Einstellungen kommen noch 😊");
  }
  if (act === "pw-change") {
    alert("Passwort ändern kommt noch 😊");
  }
});


  ensureLeadershipPanel();

  await authReady;
 // 🔐 Auth-Änderungen verdrahten (⟵ diesen ganzen Block ersetzen)
let authUnsubs = []; // aktive Listener für die aktuelle Session

onAuthStateChanged(auth, (u) => {
  // Alte Listener (z. B. vom vorherigen User) schließen
  authUnsubs.forEach(fn => { try { fn(); } catch(_){} });
  authUnsubs = [];

  updateAuthUI();

  if (u) {
    ensureUserProfile(u);
    startPostfachRealtimeForUser(u);
    switchTo(CURRENT_PAGE);

    // 🔔 Unread-Counter (nur empfangene & ungelesene)
    const qUnread = query(
      collection(db, COL.postfach),
      where("toUid", "==", u.uid),
      where("read", "==", false)
    );
    const unsubUnread = onSnapshot(
      qUnread,
      snap => setUnreadCount(snap.size || 0),
      err => console.error("Unread listener error:", err)
    );
    authUnsubs.push(unsubUnread);

  } else {
    // Logout: Postfach stoppen + UI bereinigen + Badge nullen
    startPostfachRealtimeForUser(null);
    STORE.postfach.length = 0;
    render();
    setUnreadCount(0);
  }
});

async function ensureUserProfile(u){
  if (!u) return;
  const username = (u.email || "").split("@")[0].toLowerCase();
  await setDoc(
    doc(db, base("users"), u.uid),
    {
      username,
      displayName: u.displayName || username,
      _ts: serverTimestamp()
    },
    { merge: true }
  );
   setUnreadCount(0);

}


  await initRealtime().catch(console.warn);

  switchTo(CURRENT_PAGE);
});

/* ====== Unternehmens-Leiste (Tabs) ====== */
function buildCompanyTabs(){
  const wrap = qs("#companyTabs"); if (!wrap) return;
  wrap.innerHTML = "";
  const ordered = [ "home", ...PAGES.filter(p=>p.id!=="home").map(p=>p.id) ];
  ordered.forEach(pid=>{
    const p = PAGES.find(x=>x.id===pid);
    const a = ce("button",{
      className:"tab",
      role:"tab",
      "aria-selected": (pid===CURRENT_PAGE)?"true":"false",
      title: p.title
    });
    a.innerHTML = `<span class="dot" aria-hidden="true"></span>${p.title}`;
    if (pid===CURRENT_PAGE) a.classList.add("active");
    a.addEventListener("click",()=>{ switchTo(pid); updateActiveTabs(); });
    wrap.appendChild(a);
  });
}
function updateActiveTabs(){
  const wrap = qs("#companyTabs"); if (!wrap) return;
  const tabs = [...wrap.querySelectorAll(".tab")];
  tabs.forEach((t,i)=>{
    const pid = (i===0) ? "home" : PAGES.filter(p=>p.id!=="home")[i-1].id;
    t.classList.toggle("active", pid===CURRENT_PAGE);
    t.setAttribute("aria-selected", pid===CURRENT_PAGE ? "true":"false");
  });
}

/* ====== Dropdown (nur „Mehr“) ====== */
function setupDropdown(wrapperId, buttonId, menuId){
  const wrap = qs("#"+wrapperId), btn=qs("#"+buttonId), menu=qs("#"+menuId);
  const close=()=>{wrap?.classList.remove("open");btn?.setAttribute("aria-expanded","false")};
  btn?.addEventListener("click",(e)=>{
    e.stopPropagation();
    wrap.classList.toggle("open");
    btn.setAttribute("aria-expanded", wrap.classList.contains("open")?"true":"false");
    if (wrap.classList.contains("open")) menu?.focus();
  });
  document.addEventListener("click",(e)=>{ if (!wrap?.contains(e.target)) close(); });
  document.addEventListener("keydown",(e)=>{ if (e.key==="Escape") close(); });
}

let stopPostfach = null;

function startPostfachRealtimeForUser(u){
  if (typeof stopPostfach === "function") { stopPostfach(); stopPostfach = null; }

  // Bei Logout: Postfach leeren & Badges auf 0
  if (!u) {
    STORE.postfach.length = 0;
    setUnreadCount(0);
    render();
    return;
  }

  const unsubs = [];

  // Eingehend
  unsubs.push(onSnapshot(
    query(collection(db, COL.postfach), where("toUid","==",u.uid)),
    snap=>{
      const incoming = [];
      snap.forEach(d=> incoming.push({ id:d.id, ...d.data() }));
      mergeAndRender(incoming);
    }
  ));

  // Ausgehend
  unsubs.push(onSnapshot(
    query(collection(db, COL.postfach), where("fromUid","==",u.uid)),
    snap=>{
      const outgoing = [];
      snap.forEach(d=> outgoing.push({ id:d.id, ...d.data() }));
      mergeAndRender(outgoing);
    }
  ));

  function mergeAndRender(part){
    const map = new Map(STORE.postfach.map(m=>[m.id,m]));
    part.forEach(m=> map.set(m.id,m));
    STORE.postfach.length = 0;
    map.forEach(v=> STORE.postfach.push(v));
    render();
  }

  stopPostfach = ()=> unsubs.forEach(fn=>fn());
}


/* ====== Realtime ====== */
async function initRealtime(){
  const ascByDate = (path) => query(collection(db, path), orderBy("datum","asc"));
  const plain     = (path) => collection(db, path);


  // Kita
  subscribe(plain(COL.kita_kinder), STORE.kita.kinder);
  subscribe(ascByDate(COL.kita_beobachtungen), STORE.kita.beobachtungen);
  subscribe(ascByDate(COL.kita_anwesenheit), STORE.kita.anwesenheit);
  subscribe(ascByDate(COL.kita_eltern), STORE.kita.eltern);
   
     // Verwaltung
  subscribe(ascByDate(COL.verw_news),   STORE.verwaltung.news);
  subscribe(ascByDate(COL.verw_orders), STORE.verwaltung.orders);


  // Pflegeheim
  subscribe(plain(COL.pflege_bewohner), STORE.pflege.bewohner);
  subscribe(ascByDate(COL.pflege_anordnungen), STORE.pflege.anordnungen);
  subscribe(plain(COL.pflege_massnahmen), STORE.pflege.massnahmen);
 subscribe(ascByDate(COL.pflege_sturz),    STORE.pflege.sturz);
subscribe(ascByDate(COL.pflege_wunden),   STORE.pflege.wunden);
subscribe(ascByDate(COL.pflege_vitals),   STORE.pflege.vitals);
subscribe(ascByDate(COL.pflege_medis),    STORE.pflege.medis);
subscribe(ascByDate(COL.pflege_fluess),   STORE.pflege.fluess);
subscribe(ascByDate(COL.pflege_lagerung), STORE.pflege.lagerung);
subscribe(ascByDate(COL.pflege_schmerz),  STORE.pflege.schmerz);

  subscribe(ascByDate(COL.pflege_berichte), STORE.pflege.berichte);

  // Krankenhaus
  subscribe(plain(COL.kh_patienten), STORE.krankenhaus.patienten);
  subscribe(ascByDate(COL.kh_anordnungen), STORE.krankenhaus.anordnungen);
  subscribe(plain(COL.kh_massnahmen), STORE.krankenhaus.massnahmen);
  subscribe(ascByDate(COL.kh_sturz), STORE.krankenhaus.sturz);
  subscribe(ascByDate(COL.kh_wunden), STORE.krankenhaus.wunden);
  subscribe(ascByDate(COL.kh_vitals), STORE.krankenhaus.vitals);
  subscribe(ascByDate(COL.kh_medis), STORE.krankenhaus.medis);
  subscribe(ascByDate(COL.kh_fluess), STORE.krankenhaus.fluess);
  subscribe(ascByDate(COL.kh_lagerung), STORE.krankenhaus.lagerung);
  subscribe(ascByDate(COL.kh_schmerz), STORE.krankenhaus.schmerz);
    subscribe(ascByDate(COL.kh_berichte), STORE.krankenhaus.berichte);

  // Ambulant
  subscribe(plain(COL.amb_klienten), STORE.ambulant.klienten);
  subscribe(ascByDate(COL.amb_anordnungen), STORE.ambulant.anordnungen);
  subscribe(plain(COL.amb_massnahmen), STORE.ambulant.massnahmen);
  subscribe(ascByDate(COL.amb_sturz), STORE.ambulant.sturz);
  subscribe(ascByDate(COL.amb_wunden), STORE.ambulant.wunden);
  subscribe(ascByDate(COL.amb_vitals), STORE.ambulant.vitals);
  subscribe(ascByDate(COL.amb_medis), STORE.ambulant.medis);
  subscribe(ascByDate(COL.amb_fluess), STORE.ambulant.fluess);
  subscribe(ascByDate(COL.amb_lagerung), STORE.ambulant.lagerung);
  subscribe(ascByDate(COL.amb_schmerz), STORE.ambulant.schmerz);
     subscribe(ascByDate(COL.amb_berichte), STORE.ambulant.berichte);

  // Ergo
  subscribe(plain(COL.ergo_klienten), STORE.ergo.klienten);
  subscribe(ascByDate(COL.ergo_einheiten), STORE.ergo.einheiten);
     subscribe(ascByDate(COL.ergo_berichte), STORE.ergo.berichte);

  // Apotheke
  subscribe(plain(COL.apo_kunden), STORE.apotheke.kunden);
  subscribe(ascByDate(COL.apo_abgaben), STORE.apotheke.abgaben);

  // Kinderarzt
  subscribe(plain(COL.kid_patienten), STORE.kinderarzt.patienten);
  subscribe(ascByDate(COL.kid_besuche), STORE.kinderarzt.besuche);
  subscribe(ascByDate(COL.kid_termine), STORE.kinderarzt.termine);}
  

function subscribe(refOrQuery, targetArr){
  onSnapshot(refOrQuery, (snap)=>{
    targetArr.length = 0;
    snap.forEach(d => targetArr.push({ id:d.id, ...d.data() }));
    render();
  });
}

async function addDocTo(path, data){
  const u = auth.currentUser;
  if (!u) throw new Error("Nur mit Login speicherbar (Gastmodus).");
  const by = {
    uid: u.uid,
    username: (u.email || "").split("@")[0],
    displayName: u.displayName || (u.email || "").split("@")[0]
  };
  return addDoc(collection(db, path), { ...data, _by: by, _ts: serverTimestamp() });
}



/* ====== Routing ====== */
function switchTo(id){
  CURRENT_PAGE = id;
  saveUI({ lastPage:id });
  render();
  updateActiveTabs();
}

/* ====== Leadership-Bar (nur Unterseiten) ====== */
function ensureLeadershipPanel(){
  if (qs("#leadership-panel")) return;
  const hero = qs("#hero") || document.body.firstElementChild;
  const sec = ce("section",{id:"leadership-panel",className:"table-wrap"});
  sec.innerHTML = `
    <table class="board-table" aria-label="Leitung">
      <thead><tr><th>Name</th><th>Rolle</th><th>Telefon</th><th>Handy</th><th>E-Mail</th></tr></thead>
      <tbody id="leadership-body"></tbody>
    </table>`;
  hero?.parentNode?.insertBefore(sec, hero);
}
function renderLeadership(pageId){
  const panel = qs("#leadership-panel"); if (!panel) return;
  const bodyEl = qs("#leadership-body");
  const cfg = LEADERSHIP[pageId];
  if (!cfg){ panel.style.display="none"; bodyEl.innerHTML=""; return; }
  panel.style.display="block";
  bodyEl.innerHTML = (cfg.rows||[]).map(r=>`
    <tr>
      <td>${esc(r.name)}</td>
      <td>${esc(r.role||"—")}</td>
      <td>${esc(r.phone||"—")}</td>
      <td>${esc(r.mobile||"—")}</td>
      <td>${r.email?`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`:"—"}</td>
    </tr>`).join("");
}

/* ====== UI-Bausteine ====== */
function cardInfo(title, text){
  const d = ce("div",{className:"card"});
  const htmlText = (text||"").split("\n\n").map(t=>`<p class="muted">${t}</p>`).join("");
  d.innerHTML = `<h3>${title}</h3>${htmlText}`;
  return d;
}
function badge(txt){ return `<span class="badge">${txt}</span>`; }
function byLine(obj){
  const n = obj?._by?.displayName || obj?._by?.username;
  return n ? ` <span class="doc-author" title="Erstellt von">${esc(n)}</span>` : "";
}

function input(label,name,required=false,type="text",value="",extraAttrs={}){ const attrs=Object.entries(extraAttrs).map(([k,v])=>`${k}="${v}"`).join(" "); return `<label>${label}<input name="${name}" type="${type}" value="${value||""}" ${required?"required":""} ${attrs}></label>`; }
function textarea(label,name,value=""){ return `<label>${label}<textarea name="${name}">${value||""}</textarea></label>`; }
function select(label,name,options=[]){ const opts=options.map(o=>`<option value="${o}">${o}</option>`).join(""); return `<label>${label}<select name="${name}">${opts}</select></label>`; }
function listFormCard({title,list,renderLine,formHTML,onSubmit}){
  const wrap=ce("div",{className:"card"}); wrap.innerHTML=`<h3>${title}</h3>`;
  if (!list?.length){ wrap.appendChild(ce("p",{className:"muted",textContent:"Noch keine Einträge."})); }
  else { list.forEach(item=>{ const d=ce("div"); d.innerHTML=renderLine(item); wrap.appendChild(d); }); }
   const form = ce("form"); 
form.innerHTML = formHTML || "";
// 🔒 Nur Lesen für Gäste (kein eingeloggter User)
const isGuest = !auth?.currentUser;
if (isGuest) {
  // Hinweis einblenden
  const note = ce("p",{className:"muted",textContent:"Gastmodus: Inhalte sind sichtbar, aber Änderungen sind ohne Login nicht möglich."});
  form.insertBefore(note, form.firstChild);

  // Alle Eingaben & der Submit-Button werden deaktiviert
  [...form.querySelectorAll('input, select, textarea, button[type="submit"]')].forEach(el=>{
    if (el) el.disabled = true;
  });
}



// 🔒 Sicherstellen, dass IMMER ein Submit-Button existiert
let submitBtn = form.querySelector('button[type="submit"]');
if (!submitBtn) {
  const bar = ce("div",{className:"toolbar"});
  submitBtn = ce("button",{className:"btn primary",type:"submit",textContent:"Speichern"});
  bar.appendChild(submitBtn);
  form.appendChild(bar);
}

   form.addEventListener("submit",async(e)=>{
  e.preventDefault();
  e.stopPropagation();   // 🚫 verhindert, dass Browser doch refresht
  const data = Object.fromEntries(new FormData(form));

const btn=form.querySelector('button[type="submit"]'); const orig=btn?.textContent; if (btn){btn.disabled=true;btn.textContent="Speichern…"} try{await onSubmit(data); form.reset()}catch(err){alert("Speichern fehlgeschlagen: "+(err.message||err))}finally{if (btn){btn.disabled=false;btn.textContent=orig||"Speichern"}}});
  wrap.appendChild(form); return wrap;
}
function collapsibleCard(title, buildBody){ const card=ce("div",{className:"card"}); const btn=ce("button",{className:"btn",textContent:title}); btn.style.marginBottom="6px"; const body=ce("div",{className:"panel"}); btn.addEventListener("click",()=>{ const open=body.classList.toggle("show"); btn.classList.toggle("active",open); if (open && typeof buildBody==="function" && !body._built){ buildBody(body); body._built=true; } }); card.appendChild(btn); card.appendChild(body); return card; }

/* ====== Render ====== */
function render(){
  const page = PAGES.find(p=>p.id===CURRENT_PAGE) || PAGES[0];

  // Leadership: nur Unterseiten
  if (CURRENT_PAGE==="home") renderLeadership(undefined);
  else renderLeadership(CURRENT_PAGE);

  // Hero
  const hero = qs("#hero");
const logoSrc = page.logo ? encodeURI(page.logo) : "";
hero.innerHTML = `
  <div class="card hero-card">
    ${page.logo ? `<img src="${logoSrc}" alt="${page.title} Logo" class="hero-logo" onerror="this.style.display='none'">` : ""}
    <div>
      <h1>${page.title}</h1>
      <p>${page.slogan}</p>
    </div>
  </div>`;

  // Page
  const app = qs("#app");
  app.innerHTML = "";

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

/* ====== HOME ====== */
/* ====== HOME ====== */
function renderHome(app){
  // 1) Infotext
  app.appendChild(cardInfo("Liebe Kolleginnen und Kollegen,",
`Es ist uns eine große Freude, euch als Team und Mitbegründer unserer Unternehmensgruppe willkommen zu heißen.

Diese Trainings-Website ermöglicht realistische Dokumentationsübungen – sicher, modern und zentral synchronisiert.

Gemeinsam wachsen wir: verantwortungsvoll, kompetent und mit Herz für die Menschen, die wir begleiten.`));

  // 2) Stiftungsleitung nebeneinander
  const grid = ce("section",{className:"board-grid"});
  grid.setAttribute("aria-label","Stiftungsleitung");
  grid.innerHTML = `
    <div class="board-card">
      <h4>Präsident</h4>
      <div class="name">Z. Bremkens</div>
      <div>☎ 0201 12 51 74 - 31</div>
      <div>📱 0175 722 0577</div>
      <div><a href="mailto:z.bremkens@die-boje.de">z.bremkens@die-boje.de</a></div>
    </div>
    <div class="board-card">
      <h4>Vorsitzende</h4>
      <div class="name">B. Terhard-Hammouda</div>
      <div>☎ 0201 12 51 74 - 28</div>
      <div><a href="mailto:b.terhard-hammouda@die-boje.de">b.terhard-hammouda@die-boje.de</a></div>
    </div>
    <div class="board-card">
      <h4>Vorsitzender</h4>
      <div class="name">A.R. Itani</div>
      <div>☎ 0201 12 51 74 - 12</div>
      <div><a href="mailto:a.itani@die-boje.de">a.itani@die-boje.de</a></div>
    </div>
    <div class="board-card">
      <h4>Geschäftsführung</h4>
      <div class="name">V. Lauth</div>
      <div>☎ —</div><div>📱 —</div><div>—</div>
    </div>
  `;
  app.appendChild(grid);

  // 3) Kontakt-Box
  const mailBox = ce("section",{className:"card"});
  mailBox.innerHTML = `
    <h3>Kontakt</h3>
    <p class="muted">Zentrale E-Mail-Adressen:</p>
    <p><strong>BVB Pro:</strong> <a href="mailto:bvbpro@die-boje.de">bvbpro@die-boje.de</a></p>
    <p><strong>Stiftung:</strong> folgt</p>
  `;
  app.appendChild(mailBox);
   
  // 4) News-Text (aktualisiert)
  const news = ce("article",{className:"card", id:"foundationNote"});
  news.innerHTML = `
    <h3>News – Krabblerstraße</h3>
    <p>
      Mit großem Erfolg waren wir gemeinsam bei unseren Kooperationspartnern im Kindergarten der
      <strong>AWO an der Krabblerstraße in Essen</strong>. Neben einem Gespräch mit dem Oberbürgermeister
      <strong>Thomas Kufen</strong> konnten wir – insbesondere unsere Leitung des Drei-Löwen-Kindergartens
      <strong>Amadu</strong> – viele wertvolle Eindrücke gewinnen. Wir sind uns sicher, dass dieser Termin
      dazu beitragen wird, unsere Unternehmen weiter zu verbessern und die Zukunft der Stiftung gemeinsam aufzubauen.
    </p>
  `;
  app.appendChild(news);

  // 5) Fotogalerie + Lightbox
  const IMAGES = [
    "assets/fotos/IMG_4348.jpg",
    "assets/fotos/IMG_4349.jpg",
    "assets/fotos/IMG_4350.jpg",
    "assets/fotos/IMG_4351.jpg",
    "assets/fotos/IMG_4352.jpg",
    "assets/fotos/IMG_4353.jpg",
    "assets/fotos/IMG_4361.jpg",
    "assets/fotos/IMG_4362.jpg",
    "assets/fotos/IMG_4360.jpg"
  ];

  // Galerie-Card
  const gal = ce("section",{className:"card"});
  gal.innerHTML = `<h3>Impressionen</h3>`;
  const gridWrap = ce("div",{className:"gallery-grid"});
  IMAGES.forEach((src, idx)=>{
    const a = ce("button", { className:"thumb", type:"button", "aria-label":`Foto ${idx+1}` });
    a.innerHTML = `<img loading="lazy" src="${src}" alt="Foto ${idx+1} – Besuch im Kindergarten Krabblerstraße">`;
    a.addEventListener("click", ()=> openLightbox(idx));
    gridWrap.appendChild(a);
  });
  gal.appendChild(gridWrap);
  app.appendChild(gal);

  // Lightbox nur 1× in den <head> / <body> hängen
  ensureGalleryStyles();
  ensureLightbox(IMAGES);
}


/* ====== Verwaltung ====== */
   function renderVerwaltung(app){
  // (A) Info-News (erste Nachricht wie gewünscht, zusätzlich Firestore-kompatibel)
  const newsCard = ce("div",{className:"card"});
  newsCard.innerHTML = `<h3>Hand-in-Hand Verwaltung – News</h3>`;
  // feste Start-News
  const fixed = ce("div");
  fixed.innerHTML = `
    <p class="muted"><strong>17.09.2025</strong> Liebe KollegInnen, aktuell arbeiten wir an der digitalen Lohnabrechnung. Hierzu wird in Kürze durch unseren Kaufmann für IT-System-Mananagement Furkan eine Login-Seite für die Mitarbeitenden eingestellt, in der dann personalisierte Informationen und Lohnabrechnungen am Ende des Monats abrufbar sind.</p>
    <p class="muted">Bitte beachtet auch, dass wir ein neues Bestellformular haben. Tragt hier bitte eure Bestellungen ein, diese werden anschließend von uns bearbeitet. <strong>Wichtig:</strong> Der Ansprechpartner und das Unternehmen müssen immer angegeben werden. Die Artikelnummer ist empfehlenswert, wenn eine vorhanden ist. Ansonsten bitte einen Link anfügen zum entsprechenden Produkt.</p>
    <p class="muted"><em>Eure Hand-in-Hand Verwaltung</em></p>
    <hr>
  `;
  newsCard.appendChild(fixed);

  // optionale weitere News aus Firestore (COL.verw_news)
  if (STORE.verwaltung.news.length){
    STORE.verwaltung.news
      .slice() // defensiv
      .sort((a,b)=> (b.datum||"").localeCompare(a.datum||"")) // neueste zuerst
      .forEach(n=>{
        const d = ce("div");
        d.innerHTML = `<p class="muted"><strong>${esc(n.datum||"")}</strong> ${esc(n.text||"")}</p>`;
        newsCard.appendChild(d);
      });
  } else {
    const hint = ce("p",{className:"muted"});
    hint.textContent = "Weitere News folgen automatisch, sobald Einträge in Firestore (verw_news) vorhanden sind.";
    newsCard.appendChild(hint);
  }
  app.appendChild(newsCard);

  // (B) Bestellformular (Unternehmen, Ansprechpartner, Positionen-Tabelle)
  const orderCard = ce("div",{className:"card"});
  orderCard.innerHTML = `<h3>Bestellung aufgeben</h3>`;
  const form = ce("form");
  form.innerHTML = `
    ${select("Unternehmen","unternehmen", PAGES.filter(p=>p.id!=="home").map(p=>p.title))}
    ${input("Ansprechpartner*in","ansprechpartner",true)}
    <div class="table-wrap" style="margin:8px 0 12px 0">
      <table>
        <thead><tr>
          <th style="width:90px">Menge</th>
          <th>Artikelbeschreibung</th>
          <th style="width:160px">Artikelnummer</th>
          <th>Link</th>
          <th style="width:42px">—</th>
        </tr></thead>
        <tbody id="orderItems"></tbody>
      </table>
    </div>
    <div class="toolbar">
      <button type="button" class="btn" id="addRowBtn">+ Position</button>
      <button type="submit" class="btn primary">Senden & speichern</button>
    </div>
  `;
  orderCard.appendChild(form);
  app.appendChild(orderCard);

  const itemsTbody = form.querySelector("#orderItems");
  const addRow = (pref={})=>{
    const tr = ce("tr");
    tr.innerHTML = `
      <td><input name="menge" type="number" min="1" value="${esc(pref.menge??1)}"></td>
      <td><input name="beschreibung" type="text" value="${esc(pref.beschreibung||"")}" placeholder="Artikel / Variante"></td>
      <td><input name="artikelnummer" type="text" value="${esc(pref.artikelnummer||"")}"></td>
      <td><input name="link" type="url" value="${esc(pref.link||"")}" placeholder="https://…"></td>
      <td><button type="button" class="btn ghost" title="Zeile entfernen">🗑️</button></td>
    `;
    itemsTbody.appendChild(tr);
  };
  // mind. eine Startzeile
  addRow();

  form.querySelector("#addRowBtn").addEventListener("click", ()=> addRow());
  itemsTbody.addEventListener("click",(e)=>{
    const btn = e.target.closest("button"); if (!btn) return;
    const tr = btn.closest("tr"); if (tr && itemsTbody.children.length>1) tr.remove();
  });

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    // Items aus der Tabelle einsammeln
    const rows = [...itemsTbody.querySelectorAll("tr")].map(tr=>{
      const get = (sel)=> tr.querySelector(sel)?.value?.trim() || "";
      return {
        menge: Number(get('input[name="menge"]')||1),
        beschreibung: get('input[name="beschreibung"]'),
        artikelnummer: get('input[name="artikelnummer"]'),
        link: get('input[name="link"]')
      };
    }).filter(r=> r.beschreibung || r.link || r.artikelnummer);

    if (!data.unternehmen || !data.ansprechpartner || rows.length===0){
      alert("Bitte Unternehmen, Ansprechpartner*in und mindestens eine Position angeben.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]'); const orig=btn.textContent;
    btn.disabled=true; btn.textContent="Speichere…";
    try{
      await addDocTo(COL.verw_orders, {
        unternehmen: data.unternehmen,
        ansprechpartner: data.ansprechpartner,
        datum: today(),
        items: rows,
        status: "eingegangen",    // Startstatus
        orderNumber: ""           // kann später manuell ergänzt werden
      });
      form.reset();
      itemsTbody.innerHTML = "";
      addRow();
      alert("Bestellung gespeichert.");
    }catch(err){
      alert("Konnte Bestellung nicht speichern: " + (err.message||err));
    }finally{
      btn.disabled=false; btn.textContent=orig;
    }
  });

  // (C) Bestellübersicht & Bearbeitung (Status, Bestellnummer)
  const listCard = ce("div",{className:"card"});
  listCard.innerHTML = `<h3>Bestellungen – Verwaltung</h3>`;

  if (!STORE.verwaltung.orders.length){
    listCard.appendChild(ce("p",{className:"muted",textContent:"Noch keine Bestellungen vorhanden."}));
  } else {
    STORE.verwaltung.orders
      .slice()
      .sort((a,b)=> (b.datum||"").localeCompare(a.datum||""))
      .forEach(o=>{
        const box = ce("div");
        const num = o.orderNumber && String(o.orderNumber).trim() ? esc(o.orderNumber) : "— (noch nicht vergeben)";
        const statusOpts = ["eingegangen","in Bearbeitung","versandt","abgeschlossen"]
          .map(s=> `<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`).join("");
        const itemsHTML = (o.items||[]).map(it=>
          `<li>${esc(it.menge||1)}× ${esc(it.beschreibung||"")} ${it.artikelnummer?`<span class="badge">#${esc(it.artikelnummer)}</span>`:""} ${it.link?`<a href="${esc(it.link)}" target="_blank" rel="noopener">Link</a>`:""}</li>`
        ).join("");

        box.innerHTML = `
          <div class="muted" style="margin-bottom:6px">${esc(o.datum||"")}</div>
          <strong>${esc(o.unternehmen||"-")}</strong> • ${esc(o.ansprechpartner||"-")}${byLine(o)}
          <div style="margin:.4rem 0"><ul style="margin:.2rem 0 .4rem 1.2rem">${itemsHTML}</ul></div>
          <div class="toolbar">
            <label>Bestellnummer: <input type="text" class="ordernr" value="${o.orderNumber?esc(o.orderNumber):""}" placeholder="z. B. HI-2025-123"></label>
            <label>Status: 
              <select class="orderstatus">${statusOpts}</select>
            </label>
            <button class="btn primary save-order" data-id="${o.id}">Speichern</button>
          </div>
          <hr>
        `;
        listCard.appendChild(box);
      });

    // Delegierter Handler zum Speichern einzelner Bestellungen
    listCard.addEventListener("click", async (e)=>{
      const btn = e.target.closest(".save-order"); if (!btn) return;
      const id = btn.dataset.id;
      const wrap = btn.closest("div.card > div") || btn.parentElement;
      const ordernr = wrap.querySelector(".ordernr")?.value?.trim() || "";
      const status  = wrap.querySelector(".orderstatus")?.value || "eingegangen";
      const orig = btn.textContent; btn.disabled=true; btn.textContent="Sichere…";
      try{
        await updateDoc(doc(db, COL.verw_orders, id), { orderNumber: ordernr, status, _ts: serverTimestamp() });
        alert("Bestellung aktualisiert.");
      }catch(err){
        alert("Konnte Bestellung nicht aktualisieren: " + (err.message||err));
      }finally{
        btn.disabled=false; btn.textContent=orig;
      }
    });
  }
  app.appendChild(listCard);
}



/* ---------- Kita ---------- */
function renderKita(app){

  app.appendChild(cardInfo("Info",
    "Die drei Löwen Kindergarten: Bitte nur Übungsdaten verwenden. Alle Einträge werden zentral gespeichert."));
  app.appendChild(listFormCard({
    title:"Kinder",
    list: STORE.kita.kinder,
  renderLine: k => `<strong>${k.vorname} ${k.nachname}</strong> — geb. ${k.geburtstag||"—"} ${k.gruppe?badge(k.gruppe):""}${byLine(k)}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburtstag","geburtstag",false,"date")}
      ${input("Gruppe","gruppe",false,"text","Sonnen / Sterne / Löwen …")}
    `,
    onSubmit: data => addDocTo(COL.kita_kinder, data)
  }));
  app.appendChild(collapsibleCard("Weitere Module …",(body)=>{
    body.appendChild(listFormCard({
      title:"Beobachtungen",
      list: STORE.kita.beobachtungen,
      renderLine: b => `<strong>${b.kindId}</strong> • ${b.bereich||"—"} — <em>${b.datum||"—"}</em>${byLine(b)}<br>${b.text||"—"}`,
      formHTML: `
        ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
        ${input("Datum","datum",false,"date",today())}
        ${select("Bereich","bereich", ["Sprache","Motorik","Sozial","Kognition","Emotional"])}
        ${textarea("Text","text")}
      `,
      onSubmit: data => addDocTo(COL.kita_beobachtungen, data)
    }));
    body.appendChild(listFormCard({
      title:"Anwesenheit",
      list: STORE.kita.anwesenheit,
      renderLine: a => `<strong>${a.kindId}</strong> — ${a.status||"—"} am <em>${a.datum||"—"}</em>${byLine(a)} ${a.abholer?("• Abholer: "+a.abholer):""}`,
      formHTML: `
        ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
        ${input("Datum","datum",false,"date",today())}
        ${select("Status","status", ["anwesend","abwesend"])}
        ${input("Abholer (optional)","abholer",false)}
      `,
      onSubmit: data => addDocTo(COL.kita_anwesenheit, data)
    }));

   body.appendChild(listFormCard({
  title:"Elternkommunikation",
  list: STORE.kita.eltern,
  renderLine: x => `<strong>${x.kindId}</strong> • ${x.kanal||"—"} — <em>${x.datum||"—"}</em>${byLine(x)}<br>${x.inhalt||"—"}`,
  formHTML: `
    ${select("Kind","kindId", STORE.kita.kinder.map(k=>`${k.vorname} ${k.nachname}`))}
    ${input("Datum","datum",false,"date",today())}
    ${select("Kanal","kanal", ["Tür-und-Angel","Telefon","E-Mail","Elterngespräch"])}
    ${textarea("Inhalt","inhalt")}
  `,
  onSubmit: data => addDocTo(COL.kita_eltern, data)
}));
  }));
}

/* ---------- Pflegeheim ---------- */
function renderPflege(app){
  app.appendChild(cardInfo("Info",
    "Pflegeheim der Gemeinschaft: Stammdaten unter ‚Bewohner‘, weitere Dokumentation als Module."));
  app.appendChild(listFormCard({
    title:"Bewohner",
    list: STORE.pflege.bewohner,
    // Bewohner
renderLine: p => `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.zimmer?badge("Zimmer "+p.zimmer):""} ${p.pflegegrad?badge("PG "+p.pflegegrad):""}${byLine(p)}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburt","geburt",false,"date")}
      ${input("Zimmer","zimmer",false)}
      ${input("Pflegegrad","pflegegrad",false,"number")}
    `,
    onSubmit: data => addDocTo(COL.pflege_bewohner, { ...data, pflegegrad: data.pflegegrad?Number(data.pflegegrad):undefined })
  }));
  app.appendChild(collapsibleCard("Dokumentation & Module …",(body)=>{
    buildCommonModules(body, {
      people: STORE.pflege.bewohner.map(p=>`${p.vorname} ${p.nachname}`),
      anordPath: COL.pflege_anordnungen,
      massnPath: COL.pflege_massnahmen,
      sturzPath: COL.pflege_sturz,
      wundePath: COL.pflege_wunden,
      vitPath: COL.pflege_vitals,
      mediPath: COL.pflege_medis,
      flPath: COL.pflege_fluess,
      lagPath: COL.pflege_lagerung,
      schPath: COL.pflege_schmerz,
      whoLabel: "Bewohner",
         docPath: COL.pflege_berichte,

    });
  }));
}

/* ---------- Krankenhaus ---------- */
function renderKrankenhaus(app){
  app.appendChild(cardInfo("Info",
    "Mond-Krankenhaus: Erst Patienten aufnehmen, weitere Dokumentation aufklappbar."));
  app.appendChild(listFormCard({
    title:"Patienten",
    list: STORE.krankenhaus.patienten,
    // Patienten
renderLine: p => `<strong>${p.name}</strong> — ${p.fach||"—"} • ${p.datum||"—"}${byLine(p)}`,
    formHTML: `
      ${input("Patientenname","name",true)}
      ${input("Geburt","geburt",false,"date")}
      ${select("Fachbereich","fach", ["Innere","Chirurgie","Geriatrie"])}
      ${input("Aufnahmedatum","datum",false,"date",today())}
    `,
    onSubmit: data => addDocTo(COL.kh_patienten, data)
  }));
  app.appendChild(collapsibleCard("Dokumentation & Module …",(body)=>{
    buildCommonModules(body, {
      people: STORE.krankenhaus.patienten.map(p=>p.name),
      anordPath: COL.kh_anordnungen,
      massnPath: COL.kh_massnahmen,
      sturzPath: COL.kh_sturz,
      wundePath: COL.kh_wunden,
      vitPath: COL.kh_vitals,
      mediPath: COL.kh_medis,
      flPath: COL.kh_fluess,
      lagPath: COL.kh_lagerung,
      schPath: COL.kh_schmerz,
      whoLabel: "Patient",
      docPath: COL.kh_berichte,

    });
  }));
}

/* ---------- Ambulant ---------- */
function renderAmbulant(app){
  app.appendChild(cardInfo("Info",
    "Ambulanter Pflegedienst zum Stern: Erst Klienten erfassen, dann Dokumentation aufklappen."));
  app.appendChild(listFormCard({
    title:"Klienten",
    list: STORE.ambulant.klienten,
   // Klienten
renderLine: x => `<strong>${x.name}</strong> — ${x.adresse||"—"} ${x.pflegegrad?badge("PG "+x.pflegegrad):""}${byLine(x)}`,
    formHTML: `
      ${input("Name","name",true)}
      ${input("Adresse","adresse")}
      ${input("Pflegegrad","pflegegrad",false,"number")}
    `,
    onSubmit: data => addDocTo(COL.amb_klienten, { ...data, pflegegrad: data.pflegegrad?Number(data.pflegegrad):undefined })
  }));
  app.appendChild(collapsibleCard("Dokumentation & Module …",(body)=>{
    buildCommonModules(body, {
      people: STORE.ambulant.klienten.map(p=>p.name),
      anordPath: COL.amb_anordnungen,
      massnPath: COL.amb_massnahmen,
      sturzPath: COL.amb_sturz,
      wundePath: COL.amb_wunden,
      vitPath: COL.amb_vitals,
      mediPath: COL.amb_medis,
      flPath: COL.amb_fluess,
      lagPath: COL.amb_lagerung,
      schPath: COL.amb_schmerz,
      whoLabel: "Klient",
         docPath: COL.amb_berichte,

    });
  }));
}

/* ---------- Ergo ---------- */
function renderErgo(app){
  app.appendChild(cardInfo("Info",
    "Ergotherapeuten „Unart“: Erst Klienten, Einheiten aufklappbar."));
app.appendChild(listFormCard({
  title:"Klienten (inkl. Verordnung)",
  list: STORE.ergo.klienten,
  renderLine: k => `
  <strong>${k.name}</strong> — Ziel: ${k.ziel||"—"}${byLine(k)}
  ${k.ver_icd || k.ver_diagnose ? `<br><span class="muted">Verordnung: ${k.ver_icd?`ICD ${esc(k.ver_icd)} `:""}${k.ver_diagnose?`– ${esc(k.ver_diagnose)}`:""}</span>` : ""}
`,
  formHTML: `
    ${input("Name","name",true)}
    ${input("Ziel (optional)","ziel")}

    <hr>
    <h4 style="margin:.4rem 0">Verordnung (Heilmittel)</h4>
    <div class="grid-2">
      ${input("Krankenkasse","ver_kasse",false,"text","z. B. AOK Nordwest")}
      ${input("Versichertennummer","ver_versnr",false,"text")}
      ${input("ICD-10 Code","ver_icd",false,"text","z. B. F82.0")}
      ${input("Diagnose / Leitsymptomatik","ver_diagnose",false,"text","z. B. Motorische Störungen")}
      ${input("Therapieart / Inhalte","ver_therapie",false,"text","Feinmotorik-Training, ADL …")}
      ${input("Anzahl Einheiten gesamt","ver_einheiten",false,"number")}
      ${input("Frequenz (pro Woche)","ver_freq",false,"text","z. B. 2x wöchentlich")}
      ${input("Behandlungsbeginn","ver_start",false,"date")}
      ${input("Ziele laut Verordnung","ver_ziele",false,"text","kurz stichwortartig")}
      ${select("Hausbesuch","ver_hausbesuch",["nein","ja"])}
      ${select("Dringlicher Behandlungsbedarf","ver_dringlich",["nein","ja"])}
      ${input("Verordnungsdatum","ver_datum",false,"date")}
      ${input("Betriebsstätten-Nr. (BSNR)","ver_bsnr",false,"text")}
      ${input("Arzt-Nr. (LANR)","ver_arzt",false,"text")}
    </div>
  `,
  onSubmit: data => addDocTo(COL.ergo_klienten, data)
}));

  app.appendChild(collapsibleCard("Einheiten …",(body)=>{
    body.appendChild(listFormCard({
      title:"Einheiten",
      list: STORE.ergo.einheiten,
      renderLine: x => `<strong>${x.klient}</strong> — Ziel: ${x.ziel||"—"} • <em>${x.datum||"—"}</em>${byLine(x)}<br>${x.inhalt||"—"}`,
      formHTML: `
        ${select("Klient","klient", STORE.ergo.klienten.map(k=>k.name))}
        ${input("Datum","datum",false,"date",today())}
        ${input("Ziel","ziel",false,"text","Feinmotorik, ADL, Kognition …")}
        ${textarea("Inhalt/Übung","inhalt")}
      `,
      onSubmit: data => addDocTo(COL.ergo_einheiten, data)
    }));
  }));
     // Freie Dokumentation / Bericht (Ergo)
  app.appendChild(collapsibleCard("Dokumentation / Bericht …", (body)=>{
    body.appendChild(listFormCard({
      title:"Dokumentation / Bericht",
      list: STORE.ergo.berichte,
      renderLine: b => `<strong>${b.person}</strong> — <em>${b.datum || "—"}</em>${byLine(b)}<br>${(b.text || "—")}`,
      formHTML: `
        ${select("Klient","person", STORE.ergo.klienten.map(k=>k.name))}
        ${input("Datum","datum",false,"date",today())}
        ${textarea("Eintrag (Freitext)","text")}
      `,
      onSubmit: data => addDocTo(COL.ergo_berichte, data)
    }));
  }));

}

/* ---------- Apotheke ---------- */
function renderApotheke(app){
  // Info
  app.appendChild(cardInfo("Info",
    "Sonnen Apotheke: Erst Kunden erfassen, Abgaben aufklappbar."));

  // Kunden anlegen
  app.appendChild(listFormCard({
    title:"Kunden",
    list: STORE.apotheke.kunden,
    renderLine: k => `<strong>${k.name}</strong> — ${k.geburt||"Geburt unbekannt"}${byLine(k)}`,
    formHTML: `
      ${input("Name","name",true)}
      ${input("Geburt (optional)","geburt",false,"date")}
    `,
    onSubmit: data => addDocTo(COL.apo_kunden, data)
  }));

  // Abgaben mit UX-Toggling
  app.appendChild(collapsibleCard("Abgaben …",(body)=>{
    const abgabenCard = listFormCard({
      title:"Abgaben",
      list: STORE.apotheke.abgaben,
      renderLine: x => {
  const rcp = (x.rezept_vorhanden === "ja") ? badge("Rezept") : badge("ohne Rezept");
  return `<strong>${x.kunde}</strong> — ${x.praeparat||"—"} • ${x.dosis||"—"} ${x.menge?`• ${x.menge}`:""} ${rcp} <em>(${x.datum||"—"})</em>${byLine(x)}`;
},
      formHTML: `
        ${select("Kunde","kunde", STORE.apotheke.kunden.map(k=>k.name))}
        ${input("Datum","datum",false,"date",today())}
        ${input("Präparat","praeparat",false,"text","Platzhalterpräparat")}
        ${input("Dosis/Anweisung","dosis",false,"text","z. B. 1-0-1, nach dem Essen")}
        ${input("Packungsgröße / Menge","menge",false,"text","z. B. N3, 100 Tbl.")}

        <hr>
        ${select("Rezept vorhanden?","rezept_vorhanden",["ja","nein"])}

        <div class="grid-2">
          ${input("Krankenkasse","kasse",false,"text","z. B. AOK Nordwest")}
          ${input("Versichertennummer","versnr",false,"text")}
          ${input("Status","status",false,"text","z. B. 1")}
          ${input("Geburtsdatum des/der Versicherten","geburt",false,"date")}
          ${input("Betriebsstätten-Nr. (BSNR)","bsnr",false,"text")}
          ${input("Arzt-Nr. (LANR)","arzt_nr",false,"text")}
          ${input("Verordnungsdatum","verord_datum",false,"date")}
          ${select("Arbeitsunfall?","arbeitsunfall",["nein","ja"])}
          ${input("Unfalltag (falls AU)","unfalltag",false,"date")}
        </div>
      `,
      onSubmit: data => addDocTo(COL.apo_abgaben, data)
    });

    body.appendChild(abgabenCard);

    // === UX: Rezept-Details nur zeigen, wenn "Rezept vorhanden? = ja" ===
    const form = abgabenCard.querySelector("form");

    function toggleRezeptDetails() {
      const sel = form.querySelector('select[name="rezept_vorhanden"]');
      const show = sel?.value === "ja";
      const detailNames = [
        "kasse","versnr","status","geburt",
        "bsnr","arzt_nr","verord_datum",
        "arbeitsunfall","unfalltag"
      ];
      [...form.querySelectorAll("label")].forEach(l => {
        const ctrl = l.querySelector("input,select");
        if (ctrl && detailNames.includes(ctrl.name)) {
          l.style.display = show ? "" : "none";
        }
      });
    }

    // Initial schalten & bei Änderung reagieren
    toggleRezeptDetails();
    form.addEventListener("change", (e)=>{
      if (e.target.matches('select[name="rezept_vorhanden"]')) toggleRezeptDetails();
    });
  }));
}


/* ---------- Kinderarzt ---------- */
function renderKinderarzt(app){
  app.appendChild(cardInfo("Info",
    "Lieblings-Kinder: Erst Patienten erfassen, Besuche/Termine aufklappbar."));
  app.appendChild(listFormCard({
    title:"Patienten",
    list: STORE.kinderarzt.patienten,
    renderLine: p => `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt||"—"} ${p.kasse?badge(p.kasse):""} ${p.versnr?badge("Vers.-Nr. "+p.versnr):""}${byLine(p)}`,
    formHTML: `
      ${input("Vorname","vorname",true)}
      ${input("Nachname","nachname",true)}
      ${input("Geburt","geburt",false,"date")}
      ${input("Krankenkasse","kasse")}
      ${input("Versichertennummer","versnr",false,"text","z. B. A123456789")}
    `,
    onSubmit: data => addDocTo(COL.kid_patienten, data)
  }));
  app.appendChild(collapsibleCard("Besuche & Termine …",(body)=>{
    body.appendChild(listFormCard({
      title:"Besuche",
      list: STORE.kinderarzt.besuche,
      renderLine: b => `<strong>${b.patient}</strong> — Grund: ${b.grund||"—"} • <em>${b.datum||"—"}</em>${byLine(b)}<br>Befund: ${b.befund||"—"} • Therapie: ${b.therapie||"—"}`,
      formHTML: `
        ${select("Patient","patient", STORE.kinderarzt.patienten.map(p=>`${p.vorname} ${p.nachname}`))}
        ${input("Datum","datum",false,"date",today())}
        ${input("Grund (z. B. U6, Fieber, Impfung)","grund")}
        ${textarea("Befund","befund")}
        ${textarea("Therapie/Empfehlung","therapie")}
      `,
      onSubmit: data => addDocTo(COL.kid_besuche, data)
    }));
    body.appendChild(listFormCard({
      title:"Termine",
      list: STORE.kinderarzt.termine.slice().sort((a,b)=>(a.datum+a.zeit).localeCompare(b.datum+b.zeit)),
      renderLine: t => `<strong>${t.patient}</strong> — ${t.grund||"Termin"} am <em>${t.datum||"—"}</em> um <em>${t.zeit||"--:--"}</em>${byLine(t)}${t.notiz?("<br>"+t.notiz):""}`,
      formHTML: `
        ${select("Patient","patient", STORE.kinderarzt.patienten.map(p=>`${p.vorname} ${p.nachname}`))}
        ${input("Datum","datum",true,"date",today())}
        ${input("Uhrzeit","zeit",true,"time","09:00")}
        ${input("Grund","grund",false,"text","z. B. U6, Impfung, Fieber")}
        ${textarea("Notiz","notiz")}
      `,
      onSubmit: data => addDocTo(COL.kid_termine, data)
    }));
  }));
}

//Postfach
function renderPostfach(app){
  app.innerHTML = "";

  const info = ce("div",{className:"card"});
  info.innerHTML = `
    <h3>Postfach</h3>
    <p class="muted">
      Private 1:1-Nachrichten zwischen Benutzerkonten.
      Gäste können das Postfach nicht einsehen und nicht senden.
    </p>
    <hr>
  `;
  app.appendChild(info);

  if (!auth.currentUser) {
    const hint = ce("p",{className:"muted", textContent:"Bitte anmelden, um Ihr Postfach zu öffnen."});
    const box = ce("div",{className:"card"}); box.appendChild(hint);
    app.appendChild(box);
    return;
  }

  // --- Filter-Zustand: "inbox" oder "sent"
  let MAIL_FILTER = localStorage.getItem("postfachFilter") || "inbox";
  const setFilter = (f)=>{ MAIL_FILTER=f; localStorage.setItem("postfachFilter", f); renderList(); 
//Button nur zeigen, wenn "inbox"
      const markBtn = document.querySelector("#markAllReadBtn");
  if (markBtn) markBtn.style.display = (MAIL_FILTER==="inbox") ? "" : "none";
};

  // --- UI: Filterleiste
  const filterCard = ce("div",{className:"card"});
  filterCard.innerHTML = `
    <div class="filterbar" role="tablist" aria-label="Postfach-Filter">
      <button type="button" class="pill ${MAIL_FILTER==="inbox"?"active":""}" data-filter="inbox">Eingang</button>
      <button type="button" class="pill ${MAIL_FILTER==="sent"?"active":""}" data-filter="sent">Gesendet</button>
      <span style="flex:1"></span>
      <button type="button" class="btn" id="markAllReadBtn" title="Alle sichtbaren als gelesen markieren">Alle als gelesen</button>
    </div>
  `;
   // Anfangs direkt korrekt setzen:
filterCard.querySelector("#markAllReadBtn").style.display = (MAIL_FILTER==="inbox") ? "" : "none";

  filterCard.addEventListener("click",(e)=>{
    const p = e.target.closest(".pill"); if (!p) return;
    [...filterCard.querySelectorAll(".pill")].forEach(x=>x.classList.remove("active"));
    p.classList.add("active");
    setFilter(p.dataset.filter);
  });
  filterCard.querySelector("#markAllReadBtn").addEventListener("click", async ()=>{
    const u = auth.currentUser; if (!u) return;
    // Sichtbare ungelesene Nachrichten (inbox only sinnvoll)
    const visible = STORE.postfach.filter(m=>{
      const isInbox = m.toUid===u.uid;
      const pass = MAIL_FILTER==="inbox" ? isInbox : (m.fromUid===u.uid);
      return pass && m.read===false;
    });
    try{
      await Promise.all(visible.map(m=> updateDoc(doc(db, COL.postfach, m.id), { read:true, readAt: serverTimestamp(), _ts: serverTimestamp() })));
    }catch(err){ alert("Konnte nicht alles markieren: " + (err.message||err)); }
  });
  app.appendChild(filterCard);

  // --- Formular: Mehrfachanhänge + Username-Empfänger
  const postfachCard = listFormCard({
    title: "Nachrichten",
    list: [], // Rendering übernehmen wir selbst
    renderLine(){ return ""; }, // ungenutzt
    formHTML: `
      ${input("Empfänger (Benutzername)","toUser",true,"text","")}
      ${input("Betreff","betreff",true,"text","")}
      ${textarea("Nachricht","text","")}
      <label>PDF-Anhänge (optional)
        <input name="pdfs" type="file" accept="application/pdf" multiple>
      </label>
      ${input("Datum","datum",false,"date",today())}
      <div class="toolbar">
        <button type="submit" class="btn primary">Senden</button>
      </div>
    `,
    onSubmit: sendMessageWithAttachments
  });

  // Wir hängen unten unsere eigene Liste an
  const listHost = ce("div");
  postfachCard.appendChild(listHost);
  app.appendChild(postfachCard);

  // --- Renderer für Nachrichtenliste (mit Filter + Toggle)
  function renderList(){
    const u = auth.currentUser; if (!u) return;
    const items = STORE.postfach
      .slice()
      .filter(m => MAIL_FILTER==="inbox" ? (m.toUid===u.uid) : (m.fromUid===u.uid))
      .sort((a,b)=> (b._ts?.toMillis?.() ?? 0) - (a._ts?.toMillis?.() ?? 0) || (b.datum||"").localeCompare(a.datum||""));
    listHost.innerHTML = "";

    if (!items.length){
      listHost.appendChild(ce("p",{className:"muted",textContent:"Keine Nachrichten."}));
      return;
    }
    

    items.forEach(m=>{
      const wrap = ce("div");
      const isUnread = m.read===false && m.toUid===u.uid;
      const dirBadge = `<span class="badge">${m.fromUid===u.uid ? "ausgehend" : "eingehend"}</span>`;
      const kopf = `
        <strong>${esc(m.betreff || "—")}</strong> ${dirBadge}
        <em style="margin-left:.4rem">${esc(m.datum || "—")}</em>
        ${isUnread ? `<span class="badge" style="background:#e11d48">neu</span>` : ""}
      `;
      const meta = `
        <span class="muted">
          Von: ${esc(m.fromName || m.fromUid || "—")}
          • An: ${esc(m.toName || m.toUid || "—")}
        </span>
      `;
      const body = `<p>${esc(m.text || "—")}</p>`;

      // Mehrfach-Anhänge
      let attaches = "";
      if (Array.isArray(m.attachments) && m.attachments.length){
        const lis = m.attachments.map(a =>
          `<li>📎 <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name||"Anhang")}</a></li>`
        ).join("");
        attaches = `<ul class="attach-list">${lis}</ul>`;
      } else if (m.attachment?.url) {
        // Backward-compat (falls schon Einzelanhang existiert)
        attaches = `<ul class="attach-list"><li>📎 <a href="${esc(m.attachment.url)}" target="_blank" rel="noopener">${esc(m.attachment.name||"Anhang")}</a></li></ul>`;
      }

      // Toggle gelesen/ungelesen nur für Teilnehmer
      const canToggle = (u.uid===m.toUid || u.uid===m.fromUid);
      const toggleBtn = canToggle
        ? `<button class="btn ghost toggle-read" data-id="${m.id}" data-next="${m.read? "false" : "true"}">${m.read ? "Als ungelesen markieren" : "Als gelesen markieren"}</button>`
        : "";

      wrap.innerHTML = `${kopf}<br>${meta}${body}${attaches}
        <div class="toolbar">
          ${toggleBtn}
        </div>
        <hr>`;
      listHost.appendChild(wrap);
    });
  }

  // Delegation: Toggle gelesen/ungelesen
  postfachCard.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".toggle-read"); if (!btn) return;
    const id = btn.dataset.id;
    const next = btn.dataset.next === "true";
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = "Aktualisiere…";
    try{
      await updateDoc(doc(db, COL.postfach, id), {
        read: next,
        readAt: next ? serverTimestamp() : null,
        _ts: serverTimestamp()
      });
    }catch(err){
      alert("Konnte Status nicht ändern: " + (err.message||err));
    }finally{
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Senden mit Mehrfach-Anhängen
  async function sendMessageWithAttachments(formData){
    const u = auth.currentUser;
    if (!u) throw new Error("Nur mit Login sendbar.");

    if (!formData.toUser || !formData.betreff || !formData.text) {
      throw new Error("Bitte Empfänger, Betreff und Nachricht ausfüllen.");
    }

    // Username → UID
    const wanted = String(formData.toUser).trim().toLowerCase();
    const qSnap = await getDocs(
      query(collection(db, base("users")), where("username","==", wanted))
    );
    if (qSnap.empty) throw new Error("Empfänger nicht gefunden.");
    const userDoc = qSnap.docs[0];
    const toUid = userDoc.id;
    const toName = userDoc.data()?.displayName || wanted;

    // Nachricht ohne Attachments anlegen (ID bekommen)
    const msgRef = await addDoc(collection(db, COL.postfach), {
      datum: formData.datum || today(),
      betreff: formData.betreff,
      text: formData.text,
      fromUid: u.uid,
      fromName: u.displayName || (u.email||"").split("@")[0],
      toUid,
      toName,
      read: false,
      attachments: [],
      _ts: serverTimestamp(),
      _by:{
        uid: u.uid,
        username: (u.email||"").split("@")[0],
        displayName: u.displayName || (u.email||"").split("@")[0]
      }
    });

// Mehrfach-PDFs hochladen
// Mehrfach-PDFs hochladen
const formEl = postfachCard.querySelector("form");
const files = formEl?.querySelector('input[name="pdfs"]')?.files || [];

try {
  if (files.length) {
    const uploaded = [];

    for (const file of files) {
      if (file.type !== "application/pdf") continue;

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `tenants/${TENANT_ID}/postfach/${msgRef.id}/${safeName}`;
      const r = sRef(storage, path);

      await uploadBytes(r, file, {
        contentType: "application/pdf",
        customMetadata: { fromUid: u.uid, toUid }
      });

      const url = await getDownloadURL(r);
      uploaded.push({ name: safeName, url });
    }

    if (uploaded.length) {
      await updateDoc(doc(db, COL.postfach, msgRef.id), {
        attachments: uploaded,
        _ts: serverTimestamp(),
      });

      // ⤵︎ sofort im lokalen STORE aktualisieren (UI zeigt es direkt)
      const idx = STORE.postfach.findIndex(m => m.id === msgRef.id);
      if (idx !== -1) {
        STORE.postfach[idx] = { ...STORE.postfach[idx], attachments: uploaded };
      }
    }
  }
} catch (e) {
  console.error("Storage/Attachment error:", e);
  alert("Anhang konnte nicht vollständig gespeichert werden: " + (e.message || e.code || e));
}



  // Erst-Render & wenn Daten kommen
  renderList();

}
}

/* ====== Gemeinsame Module ====== */
function buildCommonModules(container, cfg){
  const people = cfg.people || [];
  const who = cfg.whoLabel || "Person";

  container.appendChild(listFormCard({
    title:"Ärztliche Anordnungen",
    list: STOREFromPath(cfg.anordPath),
  renderLine: a => `<strong>${a.person}</strong> — ${a.anordnung||"—"} <em>(${a.datum||"—"})</em>${byLine(a)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${textarea("Anordnung","anordnung")}`,
    onSubmit: data => addDocTo(cfg.anordPath, data)
  }));
   
  // Freier Dokumentationsbericht / Pflegebericht (optional)
  if (cfg.docPath) {
    container.appendChild(listFormCard({
      title: "Dokumentation / Pflegebericht",
      list: STOREFromPath(cfg.docPath),
      renderLine: b => `<strong>${b.person}</strong> — <em>${b.datum || "—"}</em>${byLine(b)}<br>${(b.text || "—")}`,
      formHTML: `
        ${select(cfg.whoLabel || "Person", "person", people)}
        ${input("Datum","datum",false,"date",today())}
        ${textarea("Eintrag (Freitext)","text")}
      `,
      onSubmit: data => addDocTo(cfg.docPath, data)
    }));
  }
   container.appendChild(listFormCard({
  title:"Maßnahmen (abhakbar)",
  list: STOREFromPath(cfg.massnPath),
  renderLine: m => { 
    const id=m.id, checked=m.done?"checked":"";
    return `<strong>${m.person}</strong> — ${m.text||"—"} • Fällig: ${m.faellig||"—"}${byLine(m)}
      <label style="display:inline-flex;align-items:center;gap:.4rem;margin-left:.6rem;">
        <input type="checkbox" data-doc="${id}" ${checked} class="chk-done"> erledigt
      </label>`;
  },
  formHTML: `
    ${select(who,"person", people)}
    ${input("Fällig am","faellig",false,"date",today())}
    ${input("Maßnahme","text",true,"text","z. B. Mobilisation, RR messen …")}
  `,
  onSubmit: data => addDocTo(cfg.massnPath, { ...data, done:false })
}));

  container.addEventListener("change", async (e)=>{
    const chk = e.target.closest(".chk-done"); if (!chk) return;
    const id = chk.dataset.doc;
    try{ await updateDoc(doc(db, cfg.massnPath, id), { done: chk.checked, _ts: serverTimestamp() }); }
    catch(err){ alert("Konnte Maßnahme nicht aktualisieren."); console.error(err); }
  });

  container.appendChild(listFormCard({
    title:"Sturzbericht",
    list: STOREFromPath(cfg.sturzPath),
   renderLine: s => `<strong>${s.person}</strong> — ${s.ort||"—"} am <em>${s.datum||"—"}</em>${byLine(s)}<br>Folgen: ${s.folgen||"—"} • Arzt: ${s.arzt||"—"} • Meldung: ${s.meldung||"—"}`,

    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Ort","ort",false,"text","Bad, Zimmer, Flur …")}${textarea("Folgen","folgen")}${select("Arzt informiert?","arzt",["ja","nein"])}${textarea("Meldung/Infofluss","meldung","Team/Angehörige informiert …")}`,
    onSubmit: data => addDocTo(cfg.sturzPath, data)
  }));

  container.appendChild(listFormCard({
    title:"Wundbericht",
    list: STOREFromPath(cfg.wundePath),
    renderLine: w => `<strong>${w.person}</strong> — Art: ${w.art||"—"} • Stadium: ${w.stadium||"—"} • Größe: ${w.groesse||"—"} <em>(${w.datum||"—"})</em>${byLine(w)}<br>Versorgung: ${w.versorgung||"—"}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Art","art",false,"text","Dekubitus, Schnitt, …")}${input("Stadium","stadium")}${input("Größe","groesse",false,"text","z. B. 2x3 cm")}${textarea("Versorgung","versorgung")}`,
    onSubmit: data => addDocTo(cfg.wundePath, data)
  }));

  container.appendChild(listFormCard({
    title:"Vitalwerte",
    list: STOREFromPath(cfg.vitPath),
   renderLine: v => `<strong>${v.person}</strong> — ${v.puls||"?"}/min, RR ${v.rr||"?"}, ${v.temp||"?"}°C, SpO₂ ${v.spo2||"?"}% <em>(${v.datum||"—"})</em>${byLine(v)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Puls (/min)","puls",false,"number")}${input("RR","rr",false,"text","120/80")}${input("Temp (°C)","temp",false,"number","",{"step":"0.1"})}${input("SpO₂ (%)","spo2",false,"number")}`,
    onSubmit: data => addDocTo(cfg.vitPath, {
      ...data,
      puls: data.puls?Number(data.puls):undefined,
      temp: data.temp?Number(data.temp):undefined,
      spo2: data.spo2?Number(data.spo2):undefined
    })
  }));

  container.appendChild(listFormCard({
    title:"Medikationen",
    list: STOREFromPath(cfg.mediPath),
    renderLine: m => `<strong>${m.person}</strong> — ${m.wirkstoff||"—"} (${m.praeparat||"?"}) • ${m.dosis||"—"} • ${m.form||"—"} • ${m.anwendung||"—"} • Grund: ${m.grund||"—"} <em>(${m.datum||"—"})</em>${byLine(m)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Präparat (Herstellername)","praeparat")}${input("Wirkstoff","wirkstoff")}${input("Dosis","dosis",false,"text","z. B. 1-0-1")}${input("Darreichungsform","form",false,"text","Tbl., Kps., Saft …")}${input("Anwendungsform","anwendung",false,"text","p.o., i.v., s.c.…")}${input("Grund der Anwendung","grund")}`,
    onSubmit: data => addDocTo(cfg.mediPath, data)
  }));

  container.appendChild(listFormCard({
    title:"Flüssigkeitsbilanz",
    list: STOREFromPath(cfg.flPath),
    renderLine: f => `<strong>${f.person}</strong> — Ein: ${f.ein||0} ml • Aus: ${f.aus||0} ml • Bilanz: ${(Number(f.ein||0)-Number(f.aus||0))} ml <em>(${f.datum||"—"})</em>${byLine(f)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Einfuhr (ml)","ein",false,"number")}${input("Ausfuhr (ml)","aus",false,"number")}${textarea("Bemerkung","bem")}`,
    onSubmit: data => addDocTo(cfg.flPath, { ...data, ein: data.ein?Number(data.ein):0, aus: data.aus?Number(data.aus):0 })
  }));

  container.appendChild(listFormCard({
    title:"Lagerung / Mobilisation",
    list: STOREFromPath(cfg.lagPath),
    renderLine: l => `<strong>${l.person}</strong> — Art: ${l.art||"—"} • Dauer: ${l.dauer||"—"} • Hilfsmittel: ${l.hilfsmittel||"—"} <em>(${l.datum||"—"})</em>${byLine(l)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Art","art",false,"text","30°-Seitenlage, Mikrolagerung …")}${input("Dauer","dauer",false,"text","z. B. 30 Min.")}${input("Hilfsmittel","hilfsmittel",false,"text","Kissen, Lagerungsrolle …")}${textarea("Bemerkung","bem")}`,
    onSubmit: data => addDocTo(cfg.lagPath, data)
  }));

  container.appendChild(listFormCard({
    title:"Schmerzbeobachtung",
    list: STOREFromPath(cfg.schPath),
   renderLine: s => `<strong>${s.person}</strong> — Skala: ${s.skala??"?"}/10 • Lokalisation: ${s.lokal||"—"} • Maßnahme: ${s.massnahme||"—"} <em>(${s.datum||"—"})</em>${byLine(s)}`,
    formHTML: `${select(who,"person", people)}${input("Datum","datum",false,"date",today())}${input("Schmerzskala (0-10)","skala",false,"number")}${input("Lokalisation","lokal")}${textarea("Maßnahme/Wirksamkeit","massnahme")}`,
    onSubmit: data => addDocTo(cfg.schPath, { ...data, skala: data.skala?Number(data.skala):undefined })
  }));
}

/* Store-Auswahl für Renderer */
function STOREFromPath(path){
  switch(path){
    case COL.pflege_anordnungen: return STORE.pflege.anordnungen;
    case COL.pflege_massnahmen:  return STORE.pflege.massnahmen;
    case COL.pflege_sturz:       return STORE.pflege.sturz;
    case COL.pflege_wunden:      return STORE.pflege.wunden;
    case COL.pflege_vitals:      return STORE.pflege.vitals;
    case COL.pflege_medis:       return STORE.pflege.medis;
    case COL.pflege_fluess:      return STORE.pflege.fluess;
    case COL.pflege_lagerung:    return STORE.pflege.lagerung;
    case COL.pflege_schmerz:     return STORE.pflege.schmerz;

    case COL.kh_anordnungen: return STORE.krankenhaus.anordnungen;
    case COL.kh_massnahmen:  return STORE.krankenhaus.massnahmen;
    case COL.kh_sturz:       return STORE.krankenhaus.sturz;
    case COL.kh_wunden:      return STORE.krankenhaus.wunden;
    case COL.kh_vitals:      return STORE.krankenhaus.vitals;
    case COL.kh_medis:       return STORE.krankenhaus.medis;
    case COL.kh_fluess:      return STORE.krankenhaus.fluess;
    case COL.kh_lagerung:    return STORE.krankenhaus.lagerung;
    case COL.kh_schmerz:     return STORE.krankenhaus.schmerz;

    case COL.amb_anordnungen: return STORE.ambulant.anordnungen;
    case COL.amb_massnahmen:  return STORE.ambulant.massnahmen;
    case COL.amb_sturz:       return STORE.ambulant.sturz;
    case COL.amb_wunden:      return STORE.ambulant.wunden;
    case COL.amb_vitals:      return STORE.ambulant.vitals;
    case COL.amb_medis:       return STORE.ambulant.medis;
    case COL.amb_fluess:      return STORE.ambulant.fluess;
    case COL.amb_lagerung:    return STORE.ambulant.lagerung;
    case COL.amb_schmerz:     return STORE.ambulant.schmerz;

    case COL.kita_beobachtungen: return STORE.kita.beobachtungen;
    case COL.kita_anwesenheit:   return STORE.kita.anwesenheit;
    case COL.kita_eltern:        return STORE.kita.eltern;

    case COL.ergo_einheiten: return STORE.ergo.einheiten;

    case COL.apo_abgaben: return STORE.apotheke.abgaben;
   
     case COL.pflege_berichte: return STORE.pflege.berichte;
    case COL.kh_berichte:     return STORE.krankenhaus.berichte;
    case COL.amb_berichte:    return STORE.ambulant.berichte;
    case COL.ergo_berichte:   return STORE.ergo.berichte;

  }
      
  return [];
}

/* ====== Export (Gesamt) ====== */
function exportAllJSON(){
  const strip = (arr)=> arr.map(({id,_ts, ...rest})=>rest);
  const out = {
     verwaltung:{
  news:   STORE.verwaltung.news.map(({id,_ts,...r})=>r),
  orders: STORE.verwaltung.orders.map(({id,_ts,...r})=>r)
},

    kita:{kinder:strip(STORE.kita.kinder),beobachtungen:strip(STORE.kita.beobachtungen),anwesenheit:strip(STORE.kita.anwesenheit),eltern:strip(STORE.kita.eltern)},
   pflege:{
  bewohner:strip(STORE.pflege.bewohner),
  anordnungen:strip(STORE.pflege.anordnungen),
  massnahmen:strip(STORE.pflege.massnahmen),
  sturz:strip(STORE.pflege.sturz),
  wunden:strip(STORE.pflege.wunden),
  vitals:strip(STORE.pflege.vitals),
  medis:strip(STORE.pflege.medis),
  fluess:strip(STORE.pflege.fluess),
  lagerung:strip(STORE.pflege.lagerung),
  schmerz:strip(STORE.pflege.schmerz),
  berichte:strip(STORE.pflege.berichte)
},
krankenhaus:{
  patienten:strip(STORE.krankenhaus.patienten),
  anordnungen:strip(STORE.krankenhaus.anordnungen),
  massnahmen:strip(STORE.krankenhaus.massnahmen),
  sturz:strip(STORE.krankenhaus.sturz),
  wunden:strip(STORE.krankenhaus.wunden),
  vitals:strip(STORE.krankenhaus.vitals),
  medis:strip(STORE.krankenhaus.medis),
  fluess:strip(STORE.krankenhaus.fluess),
  lagerung:strip(STORE.krankenhaus.lagerung),
  schmerz:strip(STORE.krankenhaus.schmerz),
  berichte:strip(STORE.krankenhaus.berichte)
},
ambulant:{
  klienten:strip(STORE.ambulant.klienten),
  anordnungen:strip(STORE.ambulant.anordnungen),
  massnahmen:strip(STORE.ambulant.massnahmen),
  sturz:strip(STORE.ambulant.sturz),
  wunden:strip(STORE.ambulant.wunden),
  vitals:strip(STORE.ambulant.vitals),
  medis:strip(STORE.ambulant.medis),
  fluess:strip(STORE.ambulant.fluess),
  lagerung:strip(STORE.ambulant.lagerung),
  schmerz:strip(STORE.ambulant.schmerz),
  berichte:strip(STORE.ambulant.berichte)
},
ergo:{
  klienten:strip(STORE.ergo.klienten),
  einheiten:strip(STORE.ergo.einheiten),
  berichte:strip(STORE.ergo.berichte)
},

    apotheke:{kunden:strip(STORE.apotheke.kunden),abgaben:strip(STORE.apotheke.abgaben)},
    kinderarzt:{patienten:strip(STORE.kinderarzt.patienten),besuche:strip(STORE.kinderarzt.besuche),termine:strip(STORE.kinderarzt.termine)}
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));
  const a = ce("a",{href:url,download:"stiftung-export.json"}); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),300);
}

