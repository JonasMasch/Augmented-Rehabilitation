/* ============================================================
   NeuroAR Reha — Intro/Demo-Overlay
   Zeigt beim ersten Öffnen einer Stufe eine kurze Demo-Animation,
   die das Prinzip erklärt. Danach über einen "?"-Button erneut
   abspielbar. "Gesehen"-Status liegt in localStorage.

   Demo-Definition: { title, scene (HTML), text }
   ============================================================ */

const Intro = (function () {
  const SEEN_KEY = 'neuroar_intros_seen';

  let overlay, titleEl, stageEl, textEl, btn, pending;

  function loadSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function markSeen(id) {
    const s = loadSeen(); s[id] = true;
    localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  }

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.innerHTML =
      '<div class="intro-card">' +
        '<div class="intro-title" id="intro-title"></div>' +
        '<div class="demo-scene" id="intro-stage"></div>' +
        '<div class="intro-text" id="intro-text"></div>' +
        '<button class="intro-btn" id="intro-btn">Los spielen</button>' +
      '</div>';
    document.body.appendChild(overlay);
    titleEl = overlay.querySelector('#intro-title');
    stageEl = overlay.querySelector('#intro-stage');
    textEl  = overlay.querySelector('#intro-text');
    btn     = overlay.querySelector('#intro-btn');
    btn.addEventListener('click', () => {
      overlay.classList.remove('show');
      stageEl.innerHTML = '';            // Animation stoppen
      const f = pending; pending = null;
      if (f) f();
    });
  }

  function present(def, label, onDone) {
    build();
    titleEl.textContent = def.title || '';
    textEl.textContent = def.text || '';
    stageEl.innerHTML = def.scene || '';
    btn.textContent = label;
    pending = onDone;
    overlay.classList.add('show');
  }

  // Beim ersten Mal automatisch zeigen, sonst direkt starten.
  function maybeShow(id, def, onStart) {
    if (loadSeen()[id]) { onStart(); return; }
    markSeen(id);
    present(def, 'Los spielen', onStart);
  }

  // Hinweis: Es gab hier eine replay()-Funktion zum erneuten Abspielen einer
  // Demo. Sie war nie verdrahtet und ist entfernt worden — die Tutorials kommen
  // bereits über "Fortschritt & Statistik zurücksetzen" wieder, das räumt den
  // Schlüssel neuroar_intros_seen mit ab (siehe onResetProgress in
  // settings_page.js). Wird ein eigener "Tutorial erneut ansehen"-Knopf
  // gewünscht, genügt present(def, 'Weiter', onClose).

  return { maybeShow };
})();

window.Intro = Intro;
