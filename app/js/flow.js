/* ============================================================
   Geführter Ablauf (Einfach-Modus): 1 "Spiel starten"-Button auf der
   Startseite → Übung → "Weiter" → nächste Übung → … linear durch alle neun.

   ⭐ Reihenfolge ist seit August 2026 ZUFÄLLIG (vorher fest Suchen 1-3 →
   Verfolgen 1-3 → Lenken 1-3). Gemischt werden die SPIELE, nicht die Übungen:
   innerhalb eines Spiels bleibt es bei 1 → 2 → 3, damit nie die schwerste
   Stufe vor der leichtesten kommt. Ergebnis ist eine Verschränkung wie
   "Verfolgen 1 · Suchen 1 · Lenken 1 · Suchen 2 · …" (siehe mischen()).

   Aktiv nur, wenn die URL einen ?flow=<n>-Parameter hat (n = Schritt 0..8).
   Ohne den Parameter verhält sich die Seite normal; die Datei stellt dann
   nur window.Flow.starten() bereit, das die Startseite benutzt.
   Wird NACH dem jeweiligen Modul-JS eingebunden und überschreibt dort
   gezielt onNext()/goHome().

   ⚠️ Die gewürfelte Reihenfolge MUSS gespeichert werden. Jede Übung ist eine
   eigene Seite, und ?flow=n ist nur ein Index — würde bei jedem Seitenaufbau
   neu gewürfelt, zeigte derselbe Index auf jeder Seite etwas anderes und der
   Ablauf liefe völlig durcheinander. Gewürfelt wird deshalb genau einmal, beim
   Druck auf "Spiel starten" (Flow.starten()), und in localStorage abgelegt.
   ============================================================ */
(function () {
  'use strict';

  var ORDER_KEY = 'neuroar_flow_order';

  // audio:true = "Uhu"-Stufe (mit Ton). Werden übersprungen, wenn die
  // Einstellung "Audio-Übungen" aus ist (audioExercises=false).
  var FULL_FLOW = [
    { page: 'suchen.html',    stage: 1 },
    { page: 'suchen.html',    stage: 2, audio: true },
    { page: 'suchen.html',    stage: 3 },
    { page: 'verfolgen.html', stage: 1 },
    { page: 'verfolgen.html', stage: 2, audio: true },
    { page: 'verfolgen.html', stage: 3 },
    { page: 'lenken.html',    stage: 1 },
    { page: 'lenken.html',    stage: 2 },
    { page: 'lenken.html',    stage: 3 }
  ];

  var SEITEN = ['suchen.html', 'verfolgen.html', 'lenken.html'];

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  // Einstellung lesen (settings.js ist vorher geladen); Default = an.
  function gefilterteListe() {
    var audioOn = true;
    try { if (typeof getSetting === 'function') audioOn = getSetting('audioExercises') !== false; } catch (e) {}
    return FULL_FLOW.filter(function (f) { return audioOn || !f.audio; });
  }

  /* Spiele mischen, Übungen innerhalb eines Spiels in Reihenfolge lassen.

     Bauart: nach Spiel gruppieren (die Gruppe behält ihre Reihenfolge 1→2→3),
     dann Schritt für Schritt ein Spiel auslosen und dessen NÄCHSTE Übung
     nehmen. Dadurch kann Übung 3 eines Spiels nie vor dessen Übung 1 landen.

     Bei der Auslosung gelten zwei Einschränkungen, beide gegen genau die
     Dreierblöcke, die hier ja verschwinden sollen:

     1. Nicht zweimal dasselbe Spiel hintereinander.
     2. Nur Spiele, die noch fast am meisten übrig haben (höchstens eins
        weniger als das Spiel mit dem größten Rest).

     Punkt 2 ist der wichtigere und war nicht offensichtlich: ohne ihn wurde
     in rund 6 % der Fälle ein Spiel gar nicht angefasst, bis die anderen
     aufgebraucht waren — dann standen dessen drei Übungen zwangsläufig am
     Stück am Ende (gemessen über 20.000 Durchläufe). Wer viel übrig hat,
     kommt also eher dran, und kein Spiel bleibt liegen.

     "Möglichst": ist nach beiden Einschränkungen nichts mehr übrig, wird die
     Regel gelockert statt hängenzubleiben. */
  function mischen(liste) {
    var gruppen = {}, namen = [];
    liste.forEach(function (f) {
      if (!gruppen[f.page]) { gruppen[f.page] = []; namen.push(f.page); }
      gruppen[f.page].push(f);
    });

    var ergebnis = [], zuletzt = null;
    while (ergebnis.length < liste.length) {
      var offen = namen.filter(function (n) { return gruppen[n].length; });
      var groesster = Math.max.apply(null, offen.map(function (n) { return gruppen[n].length; }));
      var wahl = offen.filter(function (n) {
        return n !== zuletzt && gruppen[n].length >= groesster - 1;
      });
      if (!wahl.length) wahl = offen.filter(function (n) { return n !== zuletzt; });
      if (!wahl.length) wahl = offen;                       // nur noch ein Spiel übrig
      var name = wahl[Math.floor(Math.random() * wahl.length)];
      ergebnis.push(gruppen[name].shift());                 // immer die nächste Übung
      zuletzt = name;
    }
    return ergebnis;
  }

  function speichern(liste) {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(liste.map(function (f) {
        return { page: f.page, stage: f.stage };
      })));
    } catch (e) {}
  }

  /* Gespeicherte Reihenfolge lesen und prüfen. Gibt null zurück, wenn nichts
     Brauchbares dasteht — dann fällt der Aufrufer auf die feste Reihenfolge
     zurück, nicht auf eine neu gewürfelte: ?flow=n zeigt sonst auf eine
     andere Übung als die Seite, auf der wir gerade sind. */
  function gespeicherte() {
    var roh;
    try { roh = JSON.parse(localStorage.getItem(ORDER_KEY)); } catch (e) { return null; }
    if (!Array.isArray(roh) || !roh.length) return null;
    for (var i = 0; i < roh.length; i++) {
      var f = roh[i];
      if (!f || SEITEN.indexOf(f.page) === -1 || !(f.stage >= 1 && f.stage <= 3)) return null;
    }
    return roh;
  }

  /* Von der Startseite aufgerufen: frisch würfeln, merken, losgehen.
     Jeder Druck auf "Spiel starten" gibt damit eine neue Reihenfolge. */
  function starten() {
    var liste = mischen(gefilterteListe());
    speichern(liste);
    location.href = liste[0].page + '?flow=0';
  }

  window.Flow = { starten: starten };

  /* ---- ab hier nur im geführten Ablauf (?flow=n) ---- */

  var params = new URLSearchParams(location.search);
  if (!params.has('flow')) return;
  var step = parseInt(params.get('flow'), 10);
  if (isNaN(step) || step < 0) return;

  /* Reihenfolge aus dem Speicher. Passt sie nicht zur aufgerufenen Seite, ist
     sie veraltet oder fremd: geleerter Speicher mitten im Ablauf, eine von
     Hand eingetippte oder gemerkte ?flow=-URL, ein Lesezeichen aus der Zeit
     der festen Reihenfolge.

     Dann NICHT einfach dem Index weiter vertrauen — er zeigte sonst auf eine
     ganz andere Übung, und weil beginStage() nur die Nummer bekommt, würde
     stillschweigend die falsche Stufe des aktuellen Spiels starten (etwa
     Übung 3 statt 2). Stattdessen frisch würfeln und auf der Seite einsteigen,
     die tatsächlich aufgerufen wurde. Der erste Eintrag dieser Seite ist immer
     deren Übung 1, weil die Stufen innerhalb eines Spiels aufsteigen — man
     landet also verlässlich am Anfang und nicht mitten drin. */
  var FLOW = gespeicherte() || gefilterteListe();
  if (step >= FLOW.length || FLOW[step].page !== currentPage()) {
    FLOW = mischen(gefilterteListe());
    speichern(FLOW);
    step = 0;
    for (var i = 0; i < FLOW.length; i++) {
      if (FLOW[i].page === currentPage()) { step = i; break; }
    }
    history.replaceState(null, '', currentPage() + '?flow=' + step);
  }

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
  // Erfolgs-Button im Flow "Weiter" nennen (standalone/Erweitert bleibt "Nochmal")
  document.querySelectorAll('.next-btn').forEach(function (b) { b.textContent = 'Weiter'; });
  window.goHome = function () {
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    location.href = 'index.html';
  };

  // Direkt die passende Stufe starten (Auswahl-Screen überspringen).
  // Sofort statt auf window.load zu warten — das wartete auf alle Bilder
  // und ließ den Home-Screen kurz aufblitzen. Das DOM ist hier bereits
  // geparst (flow.js steht am Ende des <body>).
  if (typeof beginStage === 'function') beginStage(FLOW[step].stage);
  // Bewegungssensor automatisch aktivieren (Freigabe wurde auf der Startseite erteilt).
  // startSensor gibt es nur in Suchen — anderswo passiert nichts.
  if (typeof startSensor === 'function') { try { startSensor(); } catch (e) {} }
})();
