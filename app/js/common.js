/* ============================================================
   NeuroAR Reha — gemeinsame Helfer für alle Module
   ============================================================ */

// Kurzschreibweisen
const $ = id => document.getElementById(id);
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

// Einmalig einen SVG-Filter einfügen, der einer Grafik einen gleichmäßigen
// weißen Rand entlang ihrer Form gibt (für Elemente mit Klasse .outlined).
(function addOutlineFilter() {
  if (!document.body || document.getElementById('whiteOutline')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML =
    '<filter id="whiteOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      // weichzeichnen rundet die Ecken, danach per Alpha-Schwelle wieder scharf machen
      '<feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-1.6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>';
  document.body.appendChild(svg);
})();

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
    if (ctx.state === 'suspended') {
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
    return { ctx, osc, gain };
  } catch(e) { return null; }
}
