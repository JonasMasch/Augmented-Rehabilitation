/* ============================================================
   AURA — Kamera-Hintergrund für die Übungs-Screens

   Legt das Live-Bild der Rückkamera hinter die Übung, dort wo sonst das
   Foto liegt (#screen-level .cam-bg). Umschaltbar über die Einstellung
   "Kamera-Hintergrund"; ist sie aus oder klappt der Zugriff nicht, bleibt
   es beim Foto — die App funktioniert in jedem Fall vollständig.

   Aufgerufen wird das aus suchen.js/verfolgen.js/lenken.js:
     Kamera.start()  in beginStage() (vor der Erkläranimation) und in
                     startLevel() direkt nach showScreen('screen-level')
     Kamera.stop()   in goHome()
   Beim Verlassen der Seite hält sich das Modul selbst an (siehe unten),
   damit die Kamera nicht weiterläuft.

   ⚠️ Vorwärmen — warum start() an mehreren Stellen steht: getUserMedia
   braucht je nach Gerät ein halbe bis anderthalb Sekunden, bis das erste
   Bild kommt (Freigabe prüfen, Kamera öffnen, Belichtung einregeln). Wird
   erst beim Übungsstart gefragt, sieht man genau so lange das Foto und
   danach erst das Kamerabild. Deshalb wird so früh wie möglich gefragt:
   schon beim Laden der Übungsseite (unten am Dateiende) und noch einmal
   beim Antippen der Kachel, also bevor die Erkläranimation kommt — die
   Wartezeit fällt dann hinter das Popup. Doppelte Aufrufe kosten nichts,
   start() steigt bei laufendem oder gerade laufendem Versuch sofort aus.

   Die Restwartezeit lässt sich nicht wegzaubern (im geführten Ablauf
   beginnt die Übung direkt beim Laden). Damit dabei nicht das Foto
   aufblitzt, wird es ausgeblendet, solange ein Versuch läuft — man sieht
   das App-Blau und danach das Kamerabild. Scheitert der Zugriff, kommt das
   Foto wieder (siehe abbauen()).

   Sobald das Videobild eingeblendet IST, wird das Foto wieder eingeschaltet:
   es liegt dann vollständig hinter einem deckenden Video und ist unsichtbar,
   dient aber als Sicherheitsnetz. Malt der Browser das Video wider Erwarten
   nicht (Treiber, Energiesparmodus, Hardware-Overlay), sieht man dadurch das
   Foto statt einer schwarzen Fläche. Aus demselben Grund hat .cam-live keine
   schwarze Hintergrundfarbe.

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
  var gestoppt = false;     // stop() waehrend ein Versuch noch lief?
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
    /* Foto ausblenden, solange die Kamera versucht wird oder laeuft — sonst
       sieht man erst das Foto und dann das Kamerabild (siehe Kopf). Regel
       dazu in common.css. */
    screen.classList.add('kamera-statt-foto');
    return true;
  }

  // Videobild und Huelle wieder abraeumen; das Foto darunter kommt zurueck.
  function abbauen() {
    var screen = document.getElementById('screen-level');
    if (screen) screen.classList.remove('kamera-statt-foto');
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
    gestoppt = false;
    /* facingMode als 'ideal', nicht 'exact': auf Geräten mit nur einer
       Kamera (Laptop zum Entwickeln) würde 'exact' den Zugriff komplett
       scheitern lassen, statt einfach die vorhandene zu nehmen. */
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    }).then(function (s) {
      versuchLaeuft = false;
      /* Zwischenzeitlich gestoppt (Übung schon verlassen) oder der Schalter
         inzwischen aus? Dann den Strom sofort wieder freigeben — sonst bliebe
         die Kamera an, ohne dass irgendwo ein Bild gezeigt wird. Seit dem
         Vorwaermen ist dieses Zeitfenster laenger und damit wirklich
         erreichbar. */
      if (gestoppt || !aktiviert()) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      /* Stirbt der Strom mitten in der Uebung, zurueck aufs Foto. Passiert am
         Geraet durchaus: eine andere App greift auf die Kamera zu, das
         Betriebssystem entzieht sie, oder die Kamera wird abgesteckt. Ohne
         das bliebe die schwarze Huelle stehen — das Foto ist ausgeblendet,
         die Uebung liefe also vor Schwarz weiter. */
      s.getTracks().forEach(function (t) { t.addEventListener('ended', stop); });
      var video = huelle.querySelector('video');
      video.srcObject = s;
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
      huelle.classList.add('an');
      /* Foto erst NACH der Einblendung wieder zuschalten (0.3s, siehe
         common.css) — waehrend das Video noch halb durchsichtig ist, wuerde es
         sonst kurz durchscheinen und genau das Aufblitzen erzeugen, das hier
         vermieden werden soll. Danach liegt es unsichtbar hinter dem Video und
         ist nur noch Sicherheitsnetz (siehe Kopf). */
      var screen = document.getElementById('screen-level');
      setTimeout(function () {
        if (stream === s && screen) screen.classList.remove('kamera-statt-foto');
      }, 350);
    }).catch(function (e) {
      versuchLaeuft = false;
      // Fehlende Nutzer-Geste und echte Verweigerung sehen beide wie
      // NotAllowedError aus — deshalb einmal still nachfassen (siehe oben).
      /* Auch hier abbauen: sonst bliebe das Foto ausgeblendet, bis der Mensch
         das naechste Mal tippt — die Uebung liefe solange vor leerem Blau. */
      abbauen();
      if (e && e.name === 'NotAllowedError' && !nachgefasst) { aufGesteWarten(); return; }
      hinweis(e);
    });
  }

  function stop() {
    gestoppt = true;   // laufender Versuch soll seinen Strom nicht mehr anhaengen
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

  /* Vorwärmen beim Laden der Übungsseite (siehe Kopf). Nur dort, wo es auch
     einen Übungs-Screen gibt. Auf der Stufenauswahl läuft die Kamera dadurch
     schon, bevor eine Übung gewählt ist — das ist der Preis dafür, dass das
     Bild beim Start sofort da ist; beendet wird sie in goHome() und beim
     Seitenwechsel. Ohne Nutzer-Geste lehnt der Browser hier oft ab; dann
     greift das einmalige Nachfassen, und dessen Auslöser ist genau der Tipp
     auf die Übungs-Kachel. */
  if (document.getElementById('screen-level')) start();

  return { start: start, stop: stop, aktiviert: aktiviert };
})();

window.Kamera = Kamera;
