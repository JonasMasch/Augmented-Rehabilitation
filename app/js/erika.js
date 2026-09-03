/* ============================================================
   Assistenzfigur "AURA" (intern weiterhin als "Erika" benannt —
   Variable/Klassen/Dateiname bewusst nicht umbenannt, siehe
   handoff.md; nur der angezeigte Name ist AURA).
   Schwebt unten rechts. Normal große, anklickbare Figur (zeigt
   eine Sprechblase). Während einer Übung ruft das Modul
   Erika.enterExercise(...) auf -> Erika wird zum "?"-Button;
   Antippen pausiert das Spiel und öffnet ein Menü mit
   Weiterspielen / Neu starten / Zurück zur Übersicht. Auf der
   Startseite (Erika.startCollapsed()) zeigt derselbe "?"-Button
   stattdessen ein Info-Overlay (siehe openInfo()).
   ============================================================ */

const Erika = (function () {
  /* "Wie kann ich dir heute helfen?" statt der früheren Aufforderung "Tippe
     mich an, wenn du Hilfe brauchst" — die stand als Antwort auf genau dieses
     Antippen da und schickte den Menschen im Kreis. */
  const GREETING = 'Hallo, ich bin AURA! Wie kann ich dir heute helfen?';
  // Die Tipps nannten früher Medaillen und ein Profil. Beides gibt es nicht
  // mehr (Profilseite entfernt, Medaillen abgeschafft) — die Texte beschreiben
  // jetzt wieder, was die App tatsächlich kann.
  const TIPS = [
    'Wähle eine Übung aus und leg einfach los.',
    'Deinen Fortschritt der letzten Tage siehst du in den Einstellungen.',
    'In den Einstellungen kannst du Ton, Schriftgröße und Darstellung anpassen.',
    'Übe ruhig regelmäßig – schon ein paar Minuten am Tag helfen.'
  ];

  let root, bubble, avatar, pauseEl, pauseDemo, pauseDemoWrap, infoEl, infoText;
  let exercise = null;   // aktive Übungs-Handler oder null
  let greeted = false;

  /* Weißer Rand für die AURA-Zeichnung im Info-Overlay.
     Eigener Filter statt des #whiteOutline aus common.js: index.html lädt
     common.js nicht, dort wäre der Filter gar nicht vorhanden. Außerdem ist
     die Figur mit rund 340 px deutlich größer als ein 92-px-Marienkäfer und
     verträgt einen kräftigeren Rand (stdDeviation 3 statt 2).
     Verfahren wie in common.js: weichzeichnen rundet die Ecken, die steile
     Alpha-Schwelle (slope 12) macht die Kante danach wieder hart. Ohne diese
     Schwelle bleibt nur der weiche Verlauf übrig und es sieht aus wie ein
     Leuchten statt wie ein Rand. */
  function addAuraOutlineFilter() {
    if (document.getElementById('auraOutline')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML =
      '<filter id="auraOutline" x="-25%" y="-25%" width="150%" height="150%">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>' +
        '<feComponentTransfer in="b" result="dick">' +
          '<feFuncA type="linear" slope="12" intercept="-1.6"/>' +
        '</feComponentTransfer>' +
        '<feFlood flood-color="#ffffff"/>' +
        '<feComposite in2="dick" operator="in" result="rand"/>' +
        '<feMerge><feMergeNode in="rand"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>';
    document.body.appendChild(svg);
  }

  function build() {
    addAuraOutlineFilter();
    root = document.createElement('div');
    root.className = 'erika';
    root.innerHTML =
      '<div class="erika-bubble" id="erika-bubble"></div>' +
      '<button class="erika-help-btn" id="erika-help-btn" aria-label="AURA anzeigen"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></button>' +
      '<button class="erika-avatar" id="erika-avatar" aria-label="AURA – Hilfe / Pause">' +
        '<img class="erika-fig" src="assets/AURA.webp" alt="AURA">' +
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
      '<img class="erika-info-fig" src="assets/AURA.webp" alt="AURA">' +
      '<div class="erika-info-box" id="erika-info-text"></div>' +
      /* "Schließen", nicht "Zurück zur Startseite": der Knopf schließt nur das
         Overlay, er navigiert nirgendwohin. Auf der Startseite fiel das nicht
         auf — dahinter liegt ja die Startseite —, auf tiere.html, den drei
         Übungs-Auswahlseiten und den Einstellungen versprach die Beschriftung
         aber etwas, das nicht passiert. Icon entsprechend vom Zurück-Pfeil auf
         ein X gewechselt. */
      '<button class="erika-info-back"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Schließen</button>';
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
      // Menü schon offen -> Figur/„?“-Button schließt NICHT (nur die drei Buttons dürfen das).
      if (!pauseEl.classList.contains('show')) openPause();
    } else if (root.classList.contains('collapsed')) {
      openInfo();   // Startseite: "?"-Button noch nicht aufgeklappt
    } else {
      toggleBubble();
    }
  }

  // Erika "öffnet sich": wieder groß (genauso groß wie im Info-Overlay der
  // Startseite, siehe --aura-fig-gross) + Spiel pausieren + Tutorial-
  // Feld + Menü zeigen
  function openPause() {
    // 'collapsed' entfernen — sonst gewinnt die spezifischere CSS-Regel
    // .erika.collapsed .erika-help-btn und die große Figur bleibt versteckt.
    root.classList.remove('compact', 'collapsed');
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
    root.classList.add('compact', 'collapsed');
    call('onResume');
  }

  function hidePause() { pauseEl.classList.remove('show'); root.classList.remove('paused'); root.classList.add('collapsed'); clearDemo(); }

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

  // Begrüßung beim ersten Mal, danach ein zufälliger Tipp. Ist ein Name
  // hinterlegt (Einstellungen -> Name ändern), spricht AURA ihn mit an.
  function pickText() {
    const name = (typeof getUserName === 'function' && getUserName()) || '';
    if (!greeted) {
      greeted = true;
      return name ? `Hallo ${name}, ich bin AURA! Wie kann ich dir heute helfen?` : GREETING;
    }
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    return name ? name + ', ' + tip.charAt(0).toLowerCase() + tip.slice(1) : tip;
  }

  /* --- Sprachausgabe (Einstellung "Sprachausgabe AURA") ---
     Nutzt die Web Speech API des Browsers, kein zusätzliches Asset und kein
     Netzzugriff. Verlangt BEIDE Schalter: den globalen "Ton" und "Sprachausgabe
     AURA". Wer den Ton ausschaltet, erwartet Stille — auch von AURA. Ist
     settings.js auf einer Seite nicht geladen, wird bewusst geschwiegen,
     statt eine abgeschaltete Stimme doch sprechen zu lassen. */
  function speechAllowed() {
    if (typeof window.speechSynthesis === 'undefined') return false;
    if (typeof getSetting !== 'function') return false;
    return getSetting('erikaVoice') !== false && getSetting('soundOn') !== false;
  }

  function speak(text) {
    if (!speechAllowed()) return;
    try {
      window.speechSynthesis.cancel();   // vorherige Äußerung abschneiden
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 0.95;                     // etwas ruhiger als Standard
      const v = getSetting('volume');
      u.volume = typeof v === 'number' ? Math.max(0, Math.min(1, v / 100)) : 0.7;
      window.speechSynthesis.speak(u);
    } catch (e) { /* Sprachausgabe ist Beiwerk — nie die Bedienung blockieren */ }
  }

  function stopSpeaking() {
    try {
      if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel();
    } catch (e) {}
  }

  function say(text) { bubble.textContent = text; bubble.classList.add('show'); speak(text); }
  function hideBubble() { bubble.classList.remove('show'); stopSpeaking(); }
  function toggleBubble() {
    if (bubble.classList.contains('show')) { hideBubble(); return; }
    say(pickText());
  }

  // Info-Overlay der Startseite (aus dem "?"-Button): abgedunkelter
  // Hintergrund, große Figur, weißes Textfeld, Button zurück zur Startseite.
  function openInfo() {
    const t = pickText();
    infoText.textContent = t;
    infoEl.classList.add('show');
    speak(t);
  }
  function closeInfo() { infoEl.classList.remove('show'); stopSpeaking(); }

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
  // Beim Seitenwechsel verstummen: die Sprachausgabe des Browsers läuft sonst
  // über den Navigationsvorgang hinaus weiter und redet in die nächste Seite.
  window.addEventListener('pagehide', stopSpeaking);
  return { say, hideBubble, enterExercise, exitExercise, startCollapsed };
})();

// Global verfügbar machen (const landet sonst nicht auf window)
window.Erika = Erika;
