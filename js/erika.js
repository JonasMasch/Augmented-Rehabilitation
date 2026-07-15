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

  let root, bubble, avatar, pauseEl;
  let exercise = null;   // aktive Übungs-Handler oder null
  let greeted = false;

  function build() {
    root = document.createElement('div');
    root.className = 'erika';
    root.innerHTML =
      '<div class="erika-bubble" id="erika-bubble"></div>' +
      '<button class="erika-avatar" id="erika-avatar" aria-label="Erika – Hilfe / Pause">' +
        '<img class="erika-fig" src="assets/erika_figur.svg" alt="Erika">' +
        '<img class="erika-ico" src="assets/erika_icon.svg" alt="Erika">' +
      '</button>';
    document.body.appendChild(root);

    bubble = root.querySelector('#erika-bubble');
    avatar = root.querySelector('#erika-avatar');

    pauseEl = document.createElement('div');
    pauseEl.className = 'erika-pause';
    pauseEl.innerHTML =
      '<div class="erika-pause-title">⏸ Pause</div>' +
      '<button class="ep-resume">Weiterspielen</button>' +
      '<button class="ep-restart">Neu starten</button>' +
      '<button class="ep-menu">Zurück zur Übersicht</button>';
    document.body.appendChild(pauseEl);

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

  // Erika "öffnet sich": wieder groß + Spiel pausieren + Menü zeigen
  function openPause() {
    root.classList.remove('compact');
    call('onPause');
    pauseEl.classList.add('show');
  }
  // Weiterspielen: Menü zu, Erika wieder klein, Spiel fortsetzen
  function resume() {
    pauseEl.classList.remove('show');
    root.classList.add('compact');
    call('onResume');
  }

  function hidePause() { pauseEl.classList.remove('show'); }

  function say(text) { bubble.textContent = text; bubble.classList.add('show'); }
  function hideBubble() { bubble.classList.remove('show'); }
  function toggleBubble() {
    if (bubble.classList.contains('show')) { hideBubble(); return; }
    if (!greeted) { greeted = true; say(GREETING); }
    else say(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }

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

  build();
  return { say, hideBubble, enterExercise, exitExercise };
})();

// Global verfügbar machen (const landet sonst nicht auf window)
window.Erika = Erika;
