/* ============================================================
   Geführter Ablauf (Testversion): 1 "Spiel starten"-Button auf der
   Startseite → Übung 1 → "Weiter" → Übung 2 → … linear durch alle 9.

   Reihenfolge: Suchen 1-3 → Verfolgen 1-3 → Lenken 1-3.

   Aktiv nur, wenn die URL einen ?flow=<n>-Parameter hat (n = globaler
   Schritt 0..8). Ohne den Parameter verhält sich die Seite normal.
   Wird NACH dem jeweiligen Modul-JS eingebunden und überschreibt dort
   gezielt onNext()/goHome().
   ============================================================ */
(function () {
  'use strict';

  var FLOW = [
    { page: 'suchen.html',    stage: 1 },
    { page: 'suchen.html',    stage: 2 },
    { page: 'suchen.html',    stage: 3 },
    { page: 'verfolgen.html', stage: 1 },
    { page: 'verfolgen.html', stage: 2 },
    { page: 'verfolgen.html', stage: 3 },
    { page: 'lenken.html',    stage: 1 },
    { page: 'lenken.html',    stage: 2 },
    { page: 'lenken.html',    stage: 3 }
  ];

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  var params = new URLSearchParams(location.search);
  if (!params.has('flow')) return;               // nicht im geführten Modus
  var step = parseInt(params.get('flow'), 10);
  if (isNaN(step) || step < 0 || step >= FLOW.length) return;

  window.__flowStep = step;

  // Zu Schritt n wechseln (gleiche Seite: direkt Stufe starten; sonst navigieren)
  function goToStep(n) {
    if (n >= FLOW.length) { location.href = 'index.html'; return; }  // durch → zur Startseite
    var target = FLOW[n];
    if (target.page === currentPage()) {
      window.__flowStep = n;
      history.replaceState(null, '', target.page + '?flow=' + n);
      if (typeof beginStage === 'function') beginStage(target.stage);
    } else {
      location.href = target.page + '?flow=' + n;
    }
  }

  // "Weiter" = nächste Übung (nicht dieselbe nochmal); "Menü" = zurück zur Startseite
  window.onNext = function () { goToStep(window.__flowStep + 1); };
  window.goHome = function () {
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    location.href = 'index.html';
  };

  // Beim Laden direkt die passende Stufe starten (Auswahl-Screen überspringen)
  window.addEventListener('load', function () {
    var target = FLOW[step];
    if (typeof beginStage === 'function') beginStage(target.stage);
    // Bewegungssensor automatisch aktivieren (Freigabe wurde auf der Startseite erteilt).
    // startSensor gibt es nur in Suchen — anderswo passiert nichts.
    if (typeof startSensor === 'function') { try { startSensor(); } catch (e) {} }
  });
})();
