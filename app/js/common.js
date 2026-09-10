/* ============================================================
   NeuroAR Reha — gemeinsame Helfer für alle Module
   ============================================================ */

// Kurzschreibweisen
const $ = id => document.getElementById(id);

// Optionale Sensor-Statuszeile der Übungsseiten (#perm-status).
// Die drei Übungsseiten zeigen sie auf Nutzerwunsch nicht mehr an, die
// Sensor-Logik schreibt aber weiterhin hinein. Ohne Helfer würde jeder dieser
// Zugriffe auf null laufen und mit einem TypeError ALLE Skripte der Seite
// stoppen. Fehlt das Element, passiert hier still nichts.
function setPermStatus(inhalt, alsHTML) {
  const st = $('perm-status');
  if (!st) return;
  if (alsHTML) st.innerHTML = inhalt; else st.textContent = inhalt;
}
const appW = () => window.innerWidth;
const appH = () => window.innerHeight;

// Hex-Farbe + Alpha -> rgba()-String
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* Vibrations-Vokabular — damit sich die Rückmeldung in allen Spielen gleich
   anfühlt und die Dauern an einer Stelle stehen. Zahl = Millisekunden,
   Array = Muster aus Vibration/Pause/Vibration. */
const VIBRATION = {
  tipp:      35,           // Knopfdruck (Einstellungen)
  treffer:   45,           // Teilerfolg: ein Objekt gefunden, ein Salat eingesammelt
  abschluss: [45, 90, 45]  // Übung abgeschlossen
};

/* Kurze Vibration als Rückmeldung. Liegt zentral hier, damit die Übungen sie
   später mitbenutzen können.
   - navigator.vibrate gibt es auf Android; Safari kennt die API auf keiner
     Plattform, dort passiert einfach nichts (kein Fehler, kein Ersatz).
   - Die Einstellung wird bei JEDEM Aufruf frisch gelesen, damit ein Umschalten
     sofort greift — dieselbe Bauart wie soundEnabled()/volumeFactor().
   - Ohne geladenes settings.js gilt der Standard "an".
   - Die Spezifikation verlangt "sticky activation": auf der Seite muss
     irgendwann einmal getippt worden sein. Es muss NICHT gerade eben gewesen
     sein, deshalb funktioniert es auch bei sensorgesteuerten Ereignissen
     mitten in einer Übung. Wird eine Übung im geführten Flow allerdings ohne
     jede Berührung gestartet (Erkläranimation bereits gesehen), bleibt es bis
     zur ersten Berührung wirkungslos — daran lässt sich nichts ändern.
   Gibt zurück, ob tatsächlich vibriert wurde. */
function vibrate(ms) {
  if (!navigator.vibrate) return false;
  if (typeof getSetting === 'function' && getSetting('vibration') === false) return false;
  try { return navigator.vibrate(ms); } catch (e) { return false; }
}

/* Kurze Meldung am unteren Rand ("Bald verfügbar", "Kein Zugriff auf die
   Kamera" …). Das Element wird beim ersten Aufruf angelegt, falls die Seite
   keins mitbringt — so kann jede Seite den Hinweis nutzen, ohne eigenes
   Markup. Stil steht in common.css (.toast). */
let toastTimer = null;
function zeigeToast(text, dauer) {
  let el = document.getElementById('toast');
  if (!el) {
    if (!document.body) return;
    el = document.createElement('div');
    el.className = 'toast';
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, dauer || 2000);
}

// Zwischen den Screens umschalten (.screen / .screen.active)
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// Einmalig SVG-Filter einfügen, die einer Grafik einen gleichmäßigen weißen
// Rand entlang ihrer Form geben. Zwei Stärken, gleiches Verfahren
// (weichzeichnen, dann per Alpha-Schwelle wieder scharf machen):
// - #whiteOutline (.outlined), stdDeviation 2 — der lange bewährte, für die
//   meisten Icons/Objekte.
// - #hardOutline (.hard-outline), stdDeviation 3 — kräftiger, für größere
//   Motive mit spitzen Ecken (Blatt). Bewusst ein ZWEITER Filter statt
//   #whiteOutline selbst zu verstärken — der wird an vielen anderen Stellen
//   genutzt, eine Änderung dort hätte unabsehbare Nebenwirkungen.
//
// #thinOutline (.thin-outline) arbeitet nach einem ANDEREN Prinzip und ist
// der einzige, der auch sehr dünne Stellen erwischt (Marienkäfer-Beinchen).
// Weichzeichnen mittelt und verdünnt dabei die ohnehin knappe Alpha-Masse
// einer dünnen Linie: deren Spitzenwert nach dem Blur liegt bei rund
// Breite/(stdDeviation*2,5), bei ~2 px breiten Beinchen also bei 0,25 (σ=2)
// bzw. nur noch 0,17 (σ=3) — die Schwelle des feFuncA (slope 12,
// intercept -1.6) schneidet aber erst ab 0,133 etwas heraus. Mehr Blur senkt
// die Spitze also weiter und macht es SCHLECHTER, nicht besser; deshalb
// blieben die Beinchen bei #whiteOutline wie bei #hardOutline ohne Rand.
// feMorphology nimmt statt des Mittelwerts das MAXIMUM der Umgebung — dabei
// verdünnt sich nichts, ein deckendes Beinchen bekommt denselben Rand wie
// der Körper. Preis: Dilatation kappt spitze Ecken (Blattspitze), deshalb
// bleibt das Blatt bewusst auf #hardOutline. Das feGaussianBlur+feFuncA
// dahinter rundet nur die Ecken der Dilatation nach (Schwelle bei 0,5).
//
// #thickOutline (.thick-outline) ist derselbe Filter mit radius 3.5, fuer sehr
// GROSS dargestellte Motive. Der Rand zaehlt in CSS-Pixeln, seine Wirkung
// haengt also an der Anzeigegroesse: 1.5 px sind auf einem 92-px-Objekt
// deutlich, auf den rund 420 px hohen Hindernissen in Lenken 3 aber ein Faden.
//
// #thinOutlineSmall (.thin-outline-sm) ist derselbe Filter mit halbiertem
// Radius, für die Erkläranimationen. Nötig, weil ein Dilatations-Radius in
// CSS-Pixeln NICHT mitskaliert: der Käfer ist im Spiel 92 px groß, in der
// Demo aber nur 46 px (`.device-screen .demo-obj`) bzw. 52 px — derselbe
// radius=1.5 wäre dort proportional doppelt so dick und würde die noch
// dünneren Beinchen vollständig zuweißen. 0,8/46 = 0,017 trifft die 1,5/92 =
// 0,016 des Spiels. Ein `transform:scale()` auf der Demo-Bühne stört dabei
// nicht, das greift erst NACH dem Filter, die Proportionen bleiben also.
(function addOutlineFilter() {
  if (!document.body || document.getElementById('whiteOutline')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML =
    '<filter id="whiteOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-1.6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '<filter id="hardOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-1.6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '<filter id="thinOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="d"/>' +
      '<feGaussianBlur in="d" stdDeviation="1" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '<filter id="thickOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="d"/>' +
      '<feGaussianBlur in="d" stdDeviation="2" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '<filter id="thinOutlineSmall" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="0.8" result="d"/>' +
      '<feGaussianBlur in="d" stdDeviation="0.55" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>';
  document.body.appendChild(svg);
})();

/* Autoplay-Sperre: ohne Nutzer-Geste startet der Context "suspended"
       (z. B. im geführten Flow, wenn das Level direkt beim Laden beginnt).
       Sofort fortsetzen versuchen, sonst bei der nächsten Bedienung entsperren.

       Hier hingen zwei Fehler drin, beide 2026 aufgefallen:

       1. Es wurde nur auf 'pointerdown' gewartet. Ein pointerdown ist laut
          HTML-Spezifikation aber nur dann eine gültige Nutzer-Geste, wenn
          pointerType "mouse" ist — per Finger zählen click, pointerup oder
          touchend. Am Tablet konnte der Ton dadurch stumm bleiben. (Derselbe
          Fehler steckte in der Vibrations-Rückmeldung, siehe settings_page.js.)
       2. Der Listener meldete sich nach dem ersten Versuch ab, auch wenn
          resume() gescheitert war — ein zweiter Versuch kam dann nie.

       Deshalb: mehrere Ereignisarten abonnieren und erst abmelden, wenn der
       Context tatsächlich läuft. */
function entsperreAudio(ctx) {
  if (ctx.state !== 'suspended') return;
  const arten = ['click', 'pointerup', 'touchend', 'keydown'];
  const unlock = () => {
    let p;
    try { p = ctx.resume(); } catch (e) { return; }
    const fertig = () => {
      if (ctx.state === 'running') {
        arten.forEach(a => window.removeEventListener(a, unlock, true));
      }
    };
    if (p && typeof p.then === 'function') p.then(fertig, function () {});
    else fertig();
  };
  unlock();
  arten.forEach(a => window.addEventListener(a, unlock, true));
}

// Web-Audio-Dauerton für die Audio-Stufen erzeugen.
// Gibt { ctx, osc, gain } zurück (oder null, falls nicht verfügbar).
function createTone(freq) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    entsperreAudio(ctx);
    return { ctx, osc, gain };
  } catch(e) { return null; }
}

/* ---- Uhu-Ruf für Suchen 2 und Verfolgen 2 -------------------------------
   Statt eines Dauertons ruft der Uhu in ruhigem Abstand. Rein synthetisch,
   also keine Tondatei und kein Netzabruf — die App bleibt offline-fähig.
   Der Abstand von 2 s ist am Tablet gegen 1,2 s und 3,5 s getestet worden:
   1,2 s wirkt hektisch, 3,5 s lässt die Richtung zu lange offen. */
const UHU_TAKT = 2.0;      // Sekunden von Rufanfang zu Rufanfang
const UHU_PEGEL = 0.16;    // fester Ruf-Pegel; die Lautstärke regelt das Spiel
                           // über den zurückgegebenen gain (Wertebereich 0…1)

// Ein Ruf: zwei Töne, "huu — huuu", der zweite länger und stärker fallend.
function uhuRuf(ctx, ziel, t0, laut) {
  const noten = [
    { start:0.00, dauer:0.26, f0:400, f1:378 },
    { start:0.38, dauer:0.44, f0:424, f1:352 }
  ];
  noten.forEach(n => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(n.f0, t0 + n.start);
    o.frequency.linearRampToValueAtTime(n.f1, t0 + n.start + n.dauer);
    /* exponentielle Rampen können die 0 nicht erreichen, daher 0.0001 statt 0 —
       das ist unhörbar, vermeidet aber das Knacken einer harten Kante. */
    g.gain.setValueAtTime(0.0001, t0 + n.start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), t0 + n.start + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dauer);
    o.connect(g); g.connect(ziel);
    o.start(t0 + n.start); o.stop(t0 + n.start + n.dauer + 0.06);
  });
}

/* Wiederkehrende Rufe. Gibt { ctx, gain, setAktiv, stop } zurück (oder null).
   Der gain ist die Schnittstelle für das Spiel: Rufe werden HINEIN geplant,
   heraus geht der Ton ans Ziel. Das Spiel darf gain.disconnect() aufrufen und
   stattdessen einen Panner einschleifen — die geplanten Rufe bleiben davon
   unberührt, weil sie auf der Eingangsseite hängen.

   ⚠ Geplant wird mit Vorlauf (0,5 s) statt "ein Ruf je Timer-Tick": ein
   setInterval ist ungenau und wird im Hintergrund gedrosselt; die Web-Audio-Uhr
   ist es nicht. Der Rhythmus bleibt so auch unter Last gleichmäßig. */
function createUhuRufe() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    entsperreAudio(ctx);

    const h = { ctx, gain, an:true, naechster:0, timer:null };
    h.timer = setInterval(() => {
      /* Solange der Context gesperrt ist, steht seine Uhr. Ohne diese Sperre
         häuften sich Rufe auf einem längst vergangenen Zeitpunkt an und
         plärrten beim Entsperren alle auf einmal los. */
      if (!h.an || ctx.state !== 'running') { h.naechster = ctx.currentTime + 0.1; return; }
      while (h.naechster < ctx.currentTime + 0.5) {
        uhuRuf(ctx, gain, h.naechster, UHU_PEGEL);
        h.naechster += UHU_TAKT;
      }
    }, 200);

    h.setAktiv = an => { h.an = !!an; };
    h.stop = () => { h.an = false; clearInterval(h.timer); h.timer = null; };
    return h;
  } catch (e) { return null; }
}
