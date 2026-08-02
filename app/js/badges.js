/* ============================================================
   NeuroAR Reha — Fortschritt
   - Zählt Abschlüsse pro Übung (recordCompletion) in localStorage.
   - markStageCards() markiert erledigte Stufen auf den Auswahl-Screens.
   (Die frühere Medaillen-Funktion wurde entfernt.)
   ============================================================ */

const PROGRESS_KEY = 'neuroar_progress';

// --- Zähler pro Übung (id = '<kategorie>_<stufe>') ---
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
      badge.innerHTML = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      card.appendChild(badge);
    } else if (!done && badge) {
      badge.remove();
    }
  });
}
