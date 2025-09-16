// Hammouda-Itani-Stiftung – Trainingsseite (lokale Speicherung über localStorage)
const state = { page: 'home', storeKey: 'stiftung-store-v1' };

function initStore() {
  const s = localStorage.getItem(state.storeKey);
  if (s) return JSON.parse(s);
  const seed = {
    kita: { kinder: [], beobachtungen: [] },
    pflege: { bewohner: [], berichte: [] },
    meta: { created: new Date().toISOString(), version: 1 }
  };
  localStorage.setItem(state.storeKey, JSON.stringify(seed));
  return seed;
}
let STORE = initStore();
function save() { localStorage.setItem(state.storeKey, JSON.stringify(STORE)); }

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.page===state.page));
  const app = document.getElementById('app'); app.innerHTML='';

  if (state.page==='home') {
    app.innerHTML = `
      <div class="card">
        <h2>Willkommen</h2>
        <p>Dies ist die Übungs-Website der <strong>Hammouda-Itani-Stiftung</strong>.
           Wähle oben eine Einrichtung, um realistisch zu dokumentieren.
           <br><span class="badge">Speicherung: nur lokal (localStorage)</span>
        </p>
      </div>`;
  }

  if (state.page==='verwaltung') {
    app.innerHTML = `
      <div class="card">
        <h2>Hand in Hand Verwaltung</h2>
        <p>Zentrale Verwaltung – hier könnten später Vorlagen, Anweisungen und Checklisten erscheinen.</p>
      </div>`;
  }

  if (state.page==='kita') app.appendChild(kitaView());

  if (state.page==='krankenhaus') {
    app.innerHTML = `
      <div class="card">
        <h2>Mond-Krankenhaus</h2>
        <p>Übungsbereich für Stations-/Patientendokumentation (Platzhalter für spätere Formulare wie Aufnahme, Vitalwerte, Pflegeplanung).</p>
      </div>`;
  }

  if (state.page==='pflegeheim') app.appendChild(pflegeView());

  if (state.page==='ambulant') {
    app.innerHTML = `
      <div class="card">
        <h2>Ambulanter Pflegedienst zum Stern</h2>
        <p>Platzhalter für Tourenplanung & Einsatzdokumentation (Folgebau möglich: Klienten, Einsätze, Leistungen, Zeiten).</p>
      </div>`;
  }

  if (state.page==='ergo') {
    app.innerHTML = `
      <div class="card">
        <h2>Ergotherapeuten „Unart“</h2>
        <p>Platzhalter für ergotherapeutische Befunde, Ziele und Einheiten.</p>
      </div>`;
  }

  if (state.page==='apotheke') {
    app.innerHTML = `
      <div class="card">
        <h2>Sonnen Apotheke</h2>
        <p>Platzhalter für Übungsmedikamentenlisten & Abgabe-Doku.</p>
      </div>`;
  }
}

/* ---------- KITA: Kinder & Beobachtungen ---------- */
function kitaView() {
  const wrap = document.createElement('div');

  const info = document.createElement('div');
  info.className = 'card';
  info.innerHTML = `
    <h2>Die drei Löwen Kindergarten</h2>
    <p>Kinderprofile & Beobachtungen. <span class="badge">Training</span></p>`;
  wrap.appendChild(info);

  // Kinder
  const kDiv = document.createElement('div');
  kDiv.className='card';
  kDiv.innerHTML = `<h3>Kinder</h3>`;
  if (STORE.kita.kinder.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Noch keine Kinder angelegt.';
    kDiv.appendChild(hint);
  }
  STORE.kita.kinder.forEach(k => {
    const d = document.createElement('div');
    d.innerHTML = `<strong>${k.vorname} ${k.nachname}</strong> — geb. ${k.geburtstag || '—'}`;
    kDiv.appendChild(d);
  });
  const form = document.createElement('form');
  form.innerHTML = `
    <label>Vorname<input name="vorname" required></label>
    <label>Nachname<input name="nachname" required></label>
    <label>Geburtstag<input type="date" name="geburtstag"></label>
    <button class="action">Kind hinzufügen</button>`;
  form.onsubmit = (e) => {
    e.preventDefault();
    STORE.kita.kinder.push(Object.fromEntries(new FormData(form)));
    save(); render();
  };
  kDiv.appendChild(form);
  wrap.appendChild(kDiv);

  // Beobachtungen
  const bDiv = document.createElement('div');
  bDiv.className='card';
  bDiv.innerHTML = `<h3>Beobachtungen</h3>`;
  if (STORE.kita.beobachtungen.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Noch keine Beobachtungen gespeichert.';
    bDiv.appendChild(hint);
  }
  STORE.kita.beobachtungen.forEach(b => {
    const d = document.createElement('div');
    d.innerHTML = `<strong>${b.kind}</strong>: ${b.text || '—'} <em>(${b.datum || '—'})</em>`;
    bDiv.appendChild(d);
  });
  const form2 = document.createElement('form');
  form2.innerHTML = `
    <label>Kind
      <select name="kind">
        ${STORE.kita.kinder.map(k => `<option>${k.vorname} ${k.nachname}</option>`).join('')}
      </select>
    </label>
    <label>Datum<input type="date" name="datum" value="${new Date().toISOString().slice(0,10)}"></label>
    <label>Text<textarea name="text"></textarea></label>
    <button class="action">Beobachtung speichern</button>`;
  form2.onsubmit = (e) => {
    e.preventDefault();
    STORE.kita.beobachtungen.push(Object.fromEntries(new FormData(form2)));
    save(); render();
  };
  bDiv.appendChild(form2);
  wrap.appendChild(bDiv);

  return wrap;
}

/* ---------- PFLEGE: Bewohner & Berichte ---------- */
function pflegeView() {
  const wrap = document.createElement('div');

  const info = document.createElement('div');
  info.className = 'card';
  info.innerHTML = `
    <h2>Pflegeheim der Gemeinschaft</h2>
    <p>Bewohnerprofile & Pflegeberichte. <span class="badge">Training</span></p>`;
  wrap.appendChild(info);

  // Bewohner
  const pDiv = document.createElement('div');
  pDiv.className='card';
  pDiv.innerHTML = `<h3>Bewohner</h3>`;
  if (STORE.pflege.bewohner.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Noch keine Bewohner angelegt.';
    pDiv.appendChild(hint);
  }
  STORE.pflege.bewohner.forEach(p => {
    const d = document.createElement('div');
    d.innerHTML = `<strong>${p.vorname} ${p.nachname}</strong> — geb. ${p.geburt || '—'}`;
    pDiv.appendChild(d);
  });
  const form = document.createElement('form');
  form.innerHTML = `
    <label>Vorname<input name="vorname" required></label>
    <label>Nachname<input name="nachname" required></label>
    <label>Geburt<input type="date" name="geburt"></label>
    <button class="action">Bewohner hinzufügen</button>`;
  form.onsubmit = (e) => {
    e.preventDefault();
    STORE.pflege.bewohner.push(Object.fromEntries(new FormData(form)));
    save(); render();
  };
  pDiv.appendChild(form);
  wrap.appendChild(pDiv);

  // Berichte
  const bDiv = document.createElement('div');
  bDiv.className='card';
  bDiv.innerHTML = `<h3>Pflegerische Berichte</h3>`;
  if (STORE.pflege.berichte.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Noch keine Berichte gespeichert.';
    bDiv.appendChild(hint);
  }
  STORE.pflege.berichte.forEach(b => {
    const d = document.createElement('div');
    d.innerHTML = `<strong>${b.bewohner}</strong>: ${b.text || '—'} <em>(${b.datum || '—'})</em>`;
    bDiv.appendChild(d);
  });
  const form2 = document.createElement('form');
  form2.innerHTML = `
    <label>Bewohner
      <select name="bewohner">
        ${STORE.pflege.bewohner.map(p => `<option>${p.vorname} ${p.nachname}</option>`).join('')}
      </select>
    </label>
    <label>Datum<input type="date" name="datum" value="${new Date().toISOString().slice(0,10)}"></label>
    <label>Text<textarea name="text"></textarea></label>
    <button class="action">Bericht speichern</button>`;
  form2.onsubmit = (e) => {
    e.preventDefault();
    STORE.pflege.berichte.push(Object.fromEntries(new FormData(form2)));
    save(); render();
  };
  bDiv.appendChild(form2);
  wrap.appendChild(bDiv);

  return wrap;
}

/* ---------- Setup ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => { state.page = b.dataset.page; render(); });
  });
  render();
});
