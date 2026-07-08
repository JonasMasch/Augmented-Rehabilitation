/* ============================================================
   NeuroAR Reha — Fortschritt & Medaillen
   - Zählt Abschlüsse pro Übung (recordCompletion) in localStorage.
   - Definiert die Medaillen in 4 Kategorien; jede Medaille wird
     live über eine Bedingung (check) aus den Statistiken
     (Übungszähler + session.js) ausgewertet.
   ============================================================ */

const PROGRESS_KEY = 'neuroar_progress';

// Die 9 Übungen (id = '<kategorie>_<stufe>')
const EXERCISES = [
  { id:'suchen_1' }, { id:'suchen_2' }, { id:'suchen_3' },
  { id:'verfolgen_1' }, { id:'verfolgen_2' }, { id:'verfolgen_3' },
  { id:'lenken_1' }, { id:'lenken_2' }, { id:'lenken_3' }
];

// --- Zähler pro Übung ---
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch(e) { return {}; }
}
function getCount(exerciseId) {
  return loadProgress()[exerciseId] || 0;
}
function recordCompletion(exerciseId) {
  const p = loadProgress();
  p[exerciseId] = (p[exerciseId] || 0) + 1;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  return p[exerciseId];
}
function resetProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

// Einmalige Migration: alte 'fuehren_*'-Zähler auf 'lenken_*' übertragen
(function migrateFuehrenToLenken() {
  const p = loadProgress();
  let changed = false;
  ['1', '2', '3'].forEach(n => {
    const oldK = 'fuehren_' + n, newK = 'lenken_' + n;
    if (p[oldK] != null) {
      p[newK] = (p[newK] || 0) + p[oldK];
      delete p[oldK];
      changed = true;
    }
  });
  if (changed) localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
})();

// Hilfsfunktion: alle genannten Übungen mind. 1× abgeschlossen?
function allDone(ids) {
  return ids.every(id => getCount(id) >= 1);
}

// Markiert auf einem Übungs-Home die bereits abgeschlossenen Stufen-Karten.
// prefix = 'suchen' | 'verfolgen' | 'lenken'; Karten brauchen data-stage="1..3".
function markStageCards(prefix) {
  document.querySelectorAll('.card[data-stage]').forEach(card => {
    const n = card.getAttribute('data-stage');
    const done = getCount(prefix + '_' + n) >= 1;
    card.classList.toggle('done', done);
    let badge = card.querySelector('.card-check');
    if (done && !badge) {
      badge = document.createElement('div');
      badge.className = 'card-check';
      badge.textContent = '✓';
      card.appendChild(badge);
    } else if (!done && badge) {
      badge.remove();
    }
  });
}

// --- Medaillen-Kategorien ---
const MEDAL_GROUPS = {
  erste:    { label: 'Erste Schritte',  color: '#a78bfa' },
  spielart: { label: 'Pro Spielart',    color: '#f472b6' },
  regel:    { label: 'Regelmäßigkeit',  color: '#34d399' },
  gesamt:   { label: 'Gesamtleistung',  color: '#fbbf24' }
};

// --- Medaillen ---
// check() wird erst zur Anzeige aufgerufen (session.js ist dann geladen).
const MEDALS = [
  // 1. Erste Schritte
  { id:'erster_ausflug', group:'erste', icon:'🐾', name:'Erster Ausflug',
    desc:'Erste Übung abgeschlossen.',
    check: () => EXERCISES.some(e => getCount(e.id) >= 1) },
  { id:'tagesziel', group:'erste', icon:'🎯', name:'Tagesziel erreicht',
    desc:'Das gesetzte Tagesziel zum ersten Mal geschafft.',
    check: () => getSessionCount() >= 1 },

  // 2. Pro Spielart
  { id:'marienkaefer', group:'spielart', icon:'🐞', name:'Marienkäfer',
    desc:'Alle drei Suchübungen mindestens einmal abgeschlossen.',
    check: () => allDone(['suchen_1','suchen_2','suchen_3']) },
  { id:'schmetterling', group:'spielart', icon:'🦋', name:'Schmetterling',
    desc:'Alle drei Verfolgungsübungen mindestens einmal abgeschlossen.',
    check: () => allDone(['verfolgen_1','verfolgen_2','verfolgen_3']) },
  { id:'schnecke', group:'spielart', icon:'🐌', name:'Schnecke',
    desc:'Alle drei Lenken-Übungen mindestens einmal abgeschlossen.',
    check: () => allDone(['lenken_1','lenken_2','lenken_3']) },
  { id:'natur', group:'spielart', icon:'🌳', name:'Natur',
    desc:'Alle neun Übungen mindestens einmal abgeschlossen.',
    check: () => allDone(EXERCISES.map(e => e.id)) },

  // 3. Regelmäßigkeit
  { id:'drei_tage', group:'regel', icon:'📅', name:'Drei Tage',
    desc:'Drei Tage in Folge trainiert.',
    check: () => getStreak() >= 3 },
  { id:'eine_woche', group:'regel', icon:'🗓️', name:'Eine Woche',
    desc:'Sieben Tage in Folge trainiert.',
    check: () => getStreak() >= 7 },
  { id:'ausdauer', group:'regel', icon:'💪', name:'Ausdauer',
    desc:'Dreißig Tage in Folge trainiert.',
    check: () => getStreak() >= 30 },

  // 4. Gesamtleistung
  { id:'zehn_einheiten', group:'gesamt', icon:'🔟', name:'Zehn Einheiten',
    desc:'Zehn Sessions insgesamt abgeschlossen.',
    check: () => getSessionCount() >= 10 },
  { id:'fuenfzehn_einheiten', group:'gesamt', icon:'🏅', name:'Fünfzehn Einheiten',
    desc:'Fünfzehn Sessions insgesamt abgeschlossen.',
    check: () => getSessionCount() >= 15 },
  { id:'goldene_woche', group:'gesamt', icon:'🥇', name:'Goldene Woche',
    desc:'Das Tagesziel sieben Tage in Folge erreicht.',
    check: () => getGoalStreak() >= 7 }
];
