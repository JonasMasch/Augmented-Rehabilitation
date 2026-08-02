/* ============================================================
   Assistenzfigur "Erika"
   Schwebt unten rechts. Normal große, anklickbare Figur (zeigt
   eine Sprechblase). Während einer Übung ruft das Modul
   Erika.enterExercise(...) auf -> Erika wird zum "?"-Button;
   Antippen pausiert das Spiel und öffnet ein Menü mit
   Weiterspielen / Neu starten / Zurück zur Übersicht. Auf der
   Startseite (Erika.startCollapsed()) zeigt derselbe "?"-Button
   stattdessen ein Info-Overlay (siehe openInfo()).
   ============================================================ */

const Erika = (function () {
  const GREETING = 'Hallo, ich bin Erika! Tippe mich an, wenn du Hilfe brauchst.';
  const TIPS = [
    'Wähle eine Übung aus und leg einfach los.',
    'Deine gesammelten Medaillen siehst du im Profil.',
    'In den Einstellungen kannst du Ton und Trainingsseite anpassen.',
    'Übe ruhig regelmäßig – nach 10 und 15 erreichten Tageszielen gibt es weitere Medaillen!'
  ];

  let root, bubble, avatar, pauseEl, pauseDemo, pauseDemoWrap, infoEl, infoText;
  let exercise = null;   // aktive Übungs-Handler oder null
  let greeted = false;

  function build() {
    root = document.createElement('div');
    root.className = 'erika';
    root.innerHTML =
      '<div class="erika-bubble" id="erika-bubble"></div>' +
      '<button class="erika-help-btn" id="erika-help-btn" aria-label="Erika anzeigen"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></button>' +
      '<button class="erika-avatar" id="erika-avatar" aria-label="Erika – Hilfe / Pause">' +
        '<img class="erika-fig" src="assets/erika_figur.svg" alt="Erika">' +
      '</button>';
    document.body.appendChild(root);

    bubble = root.querySelector('#erika-bubble');
    avatar = root.querySelector('#erika-avatar');
    const helpBtn = root.querySelector('#erika-help-btn');

    // Info-Overlay: öffnet sich beim Antippen des "?"-Buttons (Startseite) —
    // abgedunkelter Hintergrund wie im Pause-Menü, große Figur, weißes
    // Textfeld, darunter ein Button zurück zur (unveränderten) Startseite.
    infoEl = document.createElement('div');
    infoEl.className = 'erika-info';
    infoEl.innerHTML =
      '<img class="erika-info-fig" src="assets/erika_figur.svg" alt="Erika">' +
      '<div class="erika-info-box" id="erika-info-text"></div>' +
      '<button class="erika-info-back"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Zurück zur Startseite</button>';
    document.body.appendChild(infoEl);
    infoText = infoEl.querySelector('#erika-info-text');
    infoEl.querySelector('.erika-info-back').addEventListener('click', closeInfo);
    helpBtn.addEventListener('click', onTrigger);

    pauseEl = document.createElement('div');
    pauseEl.className = 'erika-pause';
    // Oben das Tutorial-Feld (Animation der aktuellen Stufe), darunter die Optionen.
    pauseEl.innerHTML =
      '<div class="erika-pause-demo"><div class="demo-scene"></div></div>' +
      '<button class="ep-resume"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg> Weiterspielen</button>' +
      '<button class="ep-restart"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Neu starten</button>' +
      '<button class="ep-menu"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Zurück zur Übersicht</button>';
    document.body.appendChild(pauseEl);

    pauseDemoWrap = pauseEl.querySelector('.erika-pause-demo');
    pauseDemo = pauseEl.querySelector('.demo-scene');

    avatar.addEventListener('click', onTrigger);
    pauseEl.querySelector('.ep-resume').addEventListener('click', resume);
    pauseEl.querySelector('.ep-restart').addEventListener('click', () => { hidePause(); call('onRestart'); });
    pauseEl.querySelector('.ep-menu').addEventListener('click', () => { hidePause(); call('onMenu'); });
  }

  function call(name) {
    if (exercise && typeof exercise[name] === 'function') exercise[name]();
  }

  // Gemeinsamer Klick-Handler für .erika-avatar UND .erika-help-btn (welcher
  // von beiden sichtbar ist, entscheidet nur die CSS-Klasse compact/collapsed).
  function onTrigger() {
    if (exercise) {
      if (pauseEl.classList.contains('show')) resume();   // schon offen -> weiterspielen
      else openPause();
    } else if (root.classList.contains('collapsed')) {
      openInfo();   // Startseite: "?"-Button noch nicht aufgeklappt
    } else {
      toggleBubble();
    }
  }

  // Erika "öffnet sich": wieder groß (genauso groß wie im Info-Overlay der
  // Startseite, siehe --erika-big-fig-height) + Spiel pausieren + Tutorial-
  // Feld + Menü zeigen
  function openPause() {
    root.classList.remove('compact');
    root.classList.add('paused');
    call('onPause');
    showDemo();
    pauseEl.classList.add('show');
  }
  // Weiterspielen: Menü zu, Erika wieder klein, Spiel fortsetzen
  function resume() {
    pauseEl.classList.remove('show');
    clearDemo();   // Animation stoppen
    root.classList.remove('paused');
    root.classList.add('compact');
    call('onResume');
  }

  function hidePause() { pauseEl.classList.remove('show'); root.classList.remove('paused'); clearDemo(); }

  // Tutorial-Animation der aktuellen Stufe oben einblenden (aus den Handlern).
  function showDemo() {
    const def = exercise && exercise.demo;
    if (def && def.scene) {
      pauseDemo.innerHTML = def.scene;
      pauseDemoWrap.style.display = '';
    } else {
      pauseDemo.innerHTML = '';
      pauseDemoWrap.style.display = 'none';
    }
  }
  function clearDemo() { if (pauseDemo) pauseDemo.innerHTML = ''; }

  // Begrüßung beim ersten Mal, danach ein zufälliger Tipp.
  function pickText() {
    if (!greeted) { greeted = true; return GREETING; }
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  function say(text) { bubble.textContent = text; bubble.classList.add('show'); }
  function hideBubble() { bubble.classList.remove('show'); }
  function toggleBubble() {
    if (bubble.classList.contains('show')) { hideBubble(); return; }
    say(pickText());
  }

  // Info-Overlay der Startseite (aus dem "?"-Button): abgedunkelter
  // Hintergrund, große Figur, weißes Textfeld, Button zurück zur Startseite.
  function openInfo() { infoText.textContent = pickText(); infoEl.classList.add('show'); }
  function closeInfo() { infoEl.classList.remove('show'); }

  // Übung beginnt: "?"-Button statt Figur
  function enterExercise(handlers) {
    exercise = handlers || {};
    root.classList.add('compact');
    hideBubble();
  }
  // Übung verlassen: wieder große Figur
  function exitExercise() {
    exercise = null;
    root.classList.remove('compact');
    hidePause();
  }

  // Startseite: statt der Figur zunächst nur ein "?"-Button; Antippen zeigt Erika.
  function startCollapsed() { root.classList.add('collapsed'); }

  build();
  return { say, hideBubble, enterExercise, exitExercise, startCollapsed };
})();

// Global verfügbar machen (const landet sonst nicht auf window)
window.Erika = Erika;
