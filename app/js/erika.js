/* ============================================================
   Assistenzfigur "Erika"
   Schwebt unten rechts. Normal große, anklickbare Figur (zeigt
   eine Sprechblase). Während einer Übung ruft das Modul
   Erika.enterExercise(...) auf -> Erika wird zum kleinen Icon;
   Antippen pausiert das Spiel und öffnet ein Menü mit
   Weiterspielen / Neu starten / Zurück zur Übersicht.
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
      '<button class="erika-help-btn" id="erika-help-btn" aria-label="Erika anzeigen">?</button>' +
      '<button class="erika-avatar" id="erika-avatar" aria-label="Erika – Hilfe / Pause">' +
        '<img class="erika-fig" src="assets/erika_figur.svg" alt="Erika">' +
        '<img class="erika-ico" src="assets/erika_icon.svg" alt="Erika">' +
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
      '<button class="erika-info-back">Zurück zur Startseite</button>';
    document.body.appendChild(infoEl);
    infoText = infoEl.querySelector('#erika-info-text');
    infoEl.querySelector('.erika-info-back').addEventListener('click', closeInfo);
    helpBtn.addEventListener('click', openInfo);

    pauseEl = document.createElement('div');
    pauseEl.className = 'erika-pause';
    // Oben das Tutorial-Feld (Animation der aktuellen Stufe), darunter die Optionen.
    pauseEl.innerHTML =
      '<div class="erika-pause-demo"><div class="demo-scene"></div></div>' +
      '<button class="ep-resume">Weiterspielen</button>' +
      '<button class="ep-restart">Neu starten</button>' +
      '<button class="ep-menu">Zurück zur Übersicht</button>';
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

  function onTrigger() {
    if (exercise) {
      if (pauseEl.classList.contains('show')) resume();   // schon offen -> weiterspielen
      else openPause();
    } else {
      toggleBubble();
    }
  }

  // Erika "öffnet sich": wieder groß + Spiel pausieren + Tutorial-Feld + Menü zeigen
  function openPause() {
    root.classList.remove('compact');
    call('onPause');
    showDemo();
    pauseEl.classList.add('show');
  }
  // Weiterspielen: Menü zu, Erika wieder klein, Spiel fortsetzen
  function resume() {
    pauseEl.classList.remove('show');
    clearDemo();   // Animation stoppen
    root.classList.add('compact');
    call('onResume');
  }

  function hidePause() { pauseEl.classList.remove('show'); clearDemo(); }

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

  // Übung beginnt: kleines Icon
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
