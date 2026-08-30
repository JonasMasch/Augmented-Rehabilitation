/* ============================================================
   AURA — Kamera-Hintergrund für die Übungs-Screens

   Legt das Live-Bild der Rückkamera hinter die Übung, dort wo sonst das
   Foto liegt (#screen-level .cam-bg). Umschaltbar über die Einstellung
   "Kamera-Hintergrund"; ist sie aus oder klappt der Zugriff nicht, bleibt
   es beim Foto — die App funktioniert in jedem Fall vollständig.

   Aufgerufen wird das aus suchen.js/verfolgen.js/lenken.js:
     Kamera.start()  direkt nach showScreen('screen-level')
     Kamera.stop()   in goHome()
   Beim Verlassen der Seite hält sich das Modul selbst an (siehe unten),
   damit die Kamera nicht weiterläuft.

   ⚠️ Nutzer-Geste: getUserMedia braucht HTTPS (über GitHub Pages gegeben).
   Der Zugriff wird ohne Bedienung des Menschen nicht immer erlaubt — im
   geführten Ablauf startet die Übung direkt beim Laden der Seite, dort gibt
   es also keine. Deshalb dieselbe Bauart wie beim Bewegungssensor: der
   erste Versuch läuft STILL, und schlägt er an der Freigabe fehl, wird
   genau einmal bei der nächsten Berührung nachgefasst. Erst wenn auch das
   scheitert, erscheint der Hinweis. Wichtig dabei: 'pointerdown' zählt bei
   Berührung NICHT als Geste (nur mit Maus), deshalb click/pointerup/
   touchend — derselbe Stolperstein wie bei Ton und Vibration.
   ============================================================ */

const Kamera = (function () {
  'use strict';

  var stream = null;        // laufender MediaStream (null = aus)
  var huelle = null;        // <div class="cam-live"> mit dem <video> darin
  var versuchLaeuft = false;
  var nachgefasst = false;  // wurde der zweite Versuch schon verbraucht?
  var gesteWartet = false;  // hängen gerade Listener für den zweiten Versuch?

  // Einstellung bei JEDEM Aufruf frisch lesen, damit ein Umschalten sofort
  // greift — gleiche Bauart wie soundEnabled()/vibrate().
  function aktiviert() {
    return typeof getSetting === 'function' && getSetting('cameraBg') === true;
  }

  function verfuegbar() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function bauen() {
    if (huelle) return huelle;
    var video = document.createElement('video');
    // playsinline + muted: ohne beides spielt iOS das Bild nicht selbst an,
    // sondern will es im Vollbild-Player zeigen.
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.muted = true;
    video.className = 'cam-video';
    huelle = document.createElement('div');
    huelle.className = 'cam-live';
    huelle.appendChild(video);
    return huelle;
  }

  function einhaengen() {
    var screen = document.getElementById('screen-level');
    if (!screen) return false;
    var h = bauen();
    if (h.parentNode !== screen) screen.appendChild(h);   // hinter die Übung, über das Foto
    return true;
  }

  // Videobild und Huelle wieder abraeumen; das Foto darunter kommt zurueck.
  function abbauen() {
    if (!huelle) return;
    var video = huelle.querySelector('video');
    if (video) video.srcObject = null;
    huelle.classList.remove('an');
    if (huelle.parentNode) huelle.parentNode.removeChild(huelle);
  }

  function hinweis(fehler) {
    if (typeof zeigeToast !== 'function') return;
    var name = (fehler && fehler.name) || '';
    var text;
    if (name === 'NotFoundError' || name === 'OverconstrainedError') text = 'Keine Kamera gefunden';
    else if (name === 'NotAllowedError') text = 'Kein Zugriff auf die Kamera';
    else text = 'Kamera nicht verfügbar';
    zeigeToast(text + ' — es bleibt beim Foto-Hintergrund', 3000);
  }

  /* Zweiter Versuch, sobald der Mensch das nächste Mal etwas antippt.
     Genau einmal: hat er die Freigabe wirklich verweigert, merkt sich der
     Browser das und lehnt sofort wieder ab — dann soll nicht bei jeder
     Berührung erneut gefragt werden. */
  function aufGesteWarten() {
    if (gesteWartet || nachgefasst) return;
    gesteWartet = true;
    var arten = ['click', 'pointerup', 'touchend'];
    var spaeter = function () {
      arten.forEach(function (a) { window.removeEventListener(a, spaeter, true); });
      gesteWartet = false;
      nachgefasst = true;
      start();
    };
    arten.forEach(function (a) { window.addEventListener(a, spaeter, true); });
  }

  function start() {
    if (!aktiviert() || stream || versuchLaeuft) return;
    if (!verfuegbar()) { hinweis({ name: 'NotSupported' }); return; }
    if (!einhaengen()) return;
    versuchLaeuft = true;
    /* facingMode als 'ideal', nicht 'exact': auf Geräten mit nur einer
       Kamera (Laptop zum Entwickeln) würde 'exact' den Zugriff komplett
       scheitern lassen, statt einfach die vorhandene zu nehmen. */
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    }).then(function (s) {
      versuchLaeuft = false;
      // Zwischenzeitlich gestoppt (Übung schon verlassen)? Dann gleich wieder aus.
      if (!aktiviert()) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      var video = huelle.querySelector('video');
      video.srcObject = s;
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
      huelle.classList.add('an');
    }).catch(function (e) {
      versuchLaeuft = false;
      // Fehlende Nutzer-Geste und echte Verweigerung sehen beide wie
      // NotAllowedError aus — deshalb einmal still nachfassen (siehe oben).
      if (e && e.name === 'NotAllowedError' && !nachgefasst) { aufGesteWarten(); return; }
      abbauen();   // endgueltig gescheitert — leere Huelle nicht stehen lassen
      hinweis(e);
    });
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      stream = null;
    }
    abbauen();
    nachgefasst = false;   // nächste Übung darf wieder von vorn fragen
  }

  // Beim Verlassen der Seite die Kamera freigeben — sonst bleibt die
  // Aufnahme-Anzeige des Geräts an, während die App längst weg ist.
  window.addEventListener('pagehide', stop);

  return { start: start, stop: stop, aktiviert: aktiviert };
})();

window.Kamera = Kamera;
