/* ============================================================
   Modul "Suchen" — Spiel-Logik (3 Stufen)
   Nutzt Helfer aus common.js: $, appW, appH, hexAlpha,
   showScreen, createTone
   ============================================================ */

const HIT_RADIUS = 60;     // Treffer-Radius (Mitte Objekt ↔ Mitte Ziel), passend zum Blatt (120px)
const LEAF_TIP_OFFSET = 90; // Dreh-Offset: 90 = Blattspitze zeigt im SVG nach oben
const CHECK_ICON = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

// --- Sensor-Steuerung (Vorzeichen/Verstärkung; bei vertauschter Richtung hier umstellen) ---
const SENSOR_GAIN = 3.2;   // Verstärkung: kleine Bewegung -> sichtbares Gleiten (1 = 1:1)
//
// Vorzeichen ergeben sich aus der Sensor-Semantik (orientation.js) und der
// Anzeige-Formel, sie sind nicht empirisch geraten:
//   yaw   > 0 = Schwenk nach links      pitch > 0 = Blick nach oben
//   x = cx + (o.angle - currentAlpha)*k -> currentAlpha muss beim Schwenk nach
//       RECHTS wachsen, damit das Objekt nach links wandert -> SIGN_YAW = -1
//   y = cy + (currentBeta - o.vAngle)*k -> currentBeta muss beim Neigen nach
//       OBEN wachsen, damit das Objekt nach unten wandert   -> SIGN_PITCH = +1
const SIGN_YAW = -1;       // +1 oder -1, falls links/rechts vertauscht
const SIGN_PITCH = 1;      // +1 oder -1, falls oben/unten vertauscht
const DEBUG_SENSOR = false; // kleine Live-Anzeige der Steuerwerte (zum Diagnostizieren)

/* --- Wie weit außen das gesuchte Objekt startet (Übung 1 und 2) ---
   Der Wert ist ein Winkel in Grad, den render() über
   scaleX = (W/2 - 40) / 65 in Pixel umrechnet. Daraus ergeben sich
   folgende Anhaltspunkte, unabhängig von der Bildschirmbreite:

     ~45°  deutlich außen, aber vollständig sichtbar
     ~65°  Objektmitte 40 px vor dem Rand — es beginnt anzuschneiden
     ~70°  Objektmitte genau auf der Bildschirmkante (halb sichtbar)
     ~75°  komplett außerhalb, muss erst hereingedreht werden

   Bewusst über den Rand hinaus: Das Suchen soll ein echtes Abtasten der
   vernachlässigten Seite erfordern und nicht schon beim Blick auf den
   ruhenden Bildschirm erledigt sein. Wenn es zu schwer wirkt, MAX
   senken (70 = immer mindestens halb sichtbar). */
const SEEK_ANGLE_MIN = 45;
const SEEK_ANGLE_MAX = 75;

let currentLevel = 0;
let currentAlpha = 0, currentBeta = 0;
let leafAngle = 0;         // aktuelle Blatt-Ausrichtung (entwickelt, gegen Zittern)
let leafSnap = false;      // beim Level-Start: Blatt sofort ausrichten statt hindrehen
let orient = null;         // OrientationControl-Instanz (Sensor)
let audioCtx = null, oscillator = null, gainNode = null, panner = null;
let objects = [];
let foundCount = 0;
let totalCount = 1;
let orientationActive = false;
let paused = false;        // Erika-Pause: Steuerung & Treffer-Logik anhalten
/* Trainingszeit dieser Übung. Suchen hat keine Spielschleife, die Zeit müsste
   also von der Wanduhr kommen — die läuft aber auch weiter, während gar nicht
   gespielt wird. Deshalb abschnittsweise: abschnittStart ist die Marke des
   laufenden Abschnitts (0 = zählt gerade nicht), aktiveZeit die Summe der
   bereits abgeschlossenen Abschnitte.

   Nicht gezählt wird, wenn (a) das Pausemenü offen ist und (b) die Seite im
   Hintergrund liegt — App gewechselt, Bildschirm aus, anderer Tab. Beides ist
   objektiv kein Training. Stillstehen bei sichtbarer Übung zählt dagegen sehr
   wohl: wer sucht, übt auch dann, wenn er sich gerade nicht bewegt.

   Verfolgen und Lenken brauchen das nicht — die zählen ihre Zeit in der
   requestAnimationFrame-Schleife, und die steht während der Pause still und
   läuft im Hintergrund gar nicht erst. */
let abschnittStart = 0;
let aktiveZeit = 0;
let zoneRing = true;   // gestrichelter Zielring sichtbar? (false bei Astkreis)

// Hinweis für Übung 3 — nur die Nummer wechselt, der Satz steht deshalb
// hier statt zweimal im Code (Start und nach jedem Fund).
function hinweisUebung3(nr) {
  // "1." mit Punkt = Ordnungszahl ("den ersten"). Der zweite Punkt schließt
  // den Satz ab; beide stehen zu Recht nebeneinander, weil die Ordnungszahl
  // nicht am Satzende steht.
  return 'Folge dem Blatt und finde den ' + nr + '. Marienkäfer.';
}

// Laufenden Abschnitt abschließen und aufaddieren. Mehrfach aufrufbar.
function zeitAnhalten() {
  if (!abschnittStart) return;
  aktiveZeit += (performance.now() - abschnittStart) / 1000;
  abschnittStart = 0;
}
// Neuen Abschnitt beginnen. Mehrfach aufrufbar.
function zeitWeiter() {
  if (!abschnittStart) abschnittStart = performance.now();
}

function logSuchenTime() {
  zeitAnhalten();
  if (typeof addTrainingSeconds === 'function') {
    addTrainingSeconds(aktiveZeit);
  }
}

// --- Demo-Animationen (Intro) pro Stufe ---
const DEMOS = {
  1: { title: 'Suchen – Übung 1',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um den Marienkäfer zu finden. Suche dafür in die Richtung, in die das Blatt zeigt.',
       scene: '<div class="demo-device anim-tilt-left"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined demo-leaf" src="assets/Blatt.webp"></div>' +
                '<div class="demo-obj anim-slide"><img class="thin-outline-sm" src="assets/Marienkaefer.webp"></div>' +
              '</div>' +
              '<img class="demo-hand demo-hand-left" src="assets/Hand.svg">' +
              '<img class="demo-hand demo-hand-right" src="assets/Hand.svg">' +
              '</div>' },
  2: { title: 'Suchen – Übung 2',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um den Uhu zu finden. Suche in der Richtung, aus der der Ton kommt.',
       scene: '<div class="demo-device anim-tilt-left"><div class="device-screen">' +
                '<div class="demo-sound-sm"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg></div>' +
                '<div class="demo-target"><img class="outlined" src="assets/astkreis.svg"></div>' +
                '<div class="demo-obj anim-slide"><img class="outlined" src="assets/uhu.svg"></div>' +
              '</div>' +
              '<img class="demo-hand demo-hand-left" src="assets/Hand.svg">' +
              '<img class="demo-hand demo-hand-right" src="assets/Hand.svg">' +
              '</div>' },
  3: { title: 'Suchen – Übung 3',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um alle Marienkäfer in der richtigen Reihenfolge zu finden. Suche dafür in die Richtung, in die das Blatt zeigt.',
       scene: '<div class="demo-device anim-seek"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined demo-leaf-seek" src="assets/Blatt.webp"></div>' +
                '</div>' +
                '<img class="demo-hand demo-hand-left demo-hand-sm" src="assets/Hand.svg">' +
                '<img class="demo-hand demo-hand-right demo-hand-sm" src="assets/Hand.svg">' +
                '</div>' +
                '<img class="demo-bug bug1 thin-outline-sm" src="assets/Marienkaefer_1.webp">' +
                '<img class="demo-bug bug2 thin-outline-sm" src="assets/Marienkaefer_2.webp">' +
                '<img class="demo-bug bug3 thin-outline-sm" src="assets/Marienkaefer_3.webp">' }
};

// Stufe öffnen: beim ersten Mal Demo zeigen, dann starten
function beginStage(n) {
  /* Kamera schon hier anwerfen, nicht erst in startLevel: der Tipp auf die
     Kachel ist eine gueltige Nutzer-Geste, und die Erklaeranimation deckt die
     Startzeit der Kamera ab. Sonst sieht man beim Uebungsbeginn erst das Foto.
     Laeuft sie schon, ist der Aufruf ein No-Op (siehe kamera.js). */
  if (window.Kamera) Kamera.start();
  if (window.Intro) Intro.maybeShow('suchen_' + n, DEMOS[n], () => startLevel(n));
  else startLevel(n);
}

// Pause / Fortsetzen (für das Erika-Pausemenü, das oben das Tutorial zeigt):
// solange pausiert, ignoriert render() Sensor-/Touch-Bewegung — sonst kann
// das Objekt "während der Pause" gefunden werden.
function pauseGame() {
  paused = true;
  zeitAnhalten();
  if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
}
function resumeGame() {
  paused = false;
  zeitWeiter();
  render();   // Lautstärke/Anzeige sofort wieder aufbauen
}

// silent=true: für den automatischen Versuch beim Laden (siehe initSensorButton
// unten) — auf iOS schlägt der ohne echte Nutzer-Geste fehl; dabei soll nicht
// "Zugriff verweigert" erscheinen, bevor der Mensch überhaupt etwas getan hat.
function requestSensorPermission(silent) {
  if (!window.OrientationControl) {
    if (!silent) $('perm-status').textContent = 'Sensor nicht verfügbar — Touch-Steuerung wird genutzt';
    return;
  }
  OrientationControl.requestPermission().then(granted => {
    if (granted) {
      startSensor();
      $('perm-status').innerHTML = 'Sensor aktiviert <svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> — drehe das Gerät';
      const btn = $('perm-btn'); if (btn) btn.style.display = 'none';
    } else if (!silent) {
      $('perm-status').textContent = 'Zugriff verweigert — Touch-Steuerung wird genutzt';
    }
  }).catch(() => { if (!silent) $('perm-status').textContent = 'Fehler beim Sensorzugriff'; });
}

// Sensor starten und Werte an die Steuerung (currentAlpha/currentBeta) hängen.
function startSensor() {
  if (!orient) {
    orient = new OrientationControl({
      onUpdate: onOrientUpdate,
      onUnavailable: onSensorUnavailable
    });
  }
  orient.start();
  orient.calibrate();   // aktuelle Haltung = Mitte
}

// Manche günstigen Tablets haben kein Gyroskop. Schwenken lässt sich dann nicht
// kompassfrei bestimmen — statt still nichts zu tun, wird das gesagt und die
// Finger-Steuerung bleibt sichtbar.
function onSensorUnavailable(reason) {
  const st = $('perm-status');
  if (st && reason === 'no-gyroscope') {
    st.textContent = 'Dieses Gerät hat keinen Drehsensor — bitte mit dem Finger ziehen';
  }
}

function onOrientUpdate(yaw, pitch) {
  orientationActive = true;
  currentAlpha = clamp(SIGN_YAW * SENSOR_GAIN * yaw, -90, 90);
  currentBeta  = clamp(SIGN_PITCH * SENSOR_GAIN * pitch, -60, 60);
  render();
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function goHome() {
  cleanup();
  if (window.Kamera) Kamera.stop();
  if (window.Erika) Erika.exitExercise();
  showScreen('screen-home');
  markStageCards('suchen');
}

function cleanup() {
  $('screen-level').ontouchmove = null;
  $('success').classList.remove('show');
  $('audio-bars').style.display = 'none';
  $('audio-label').style.display = 'none';
  $('seq-list').style.display = 'none';
  $('targets-container').innerHTML = '';
  if (oscillator) { try { oscillator.stop(); } catch(e){} oscillator = null; }
  // Context schließen — Browser erlauben nur wenige gleichzeitige AudioContexts
  if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
  gainNode = null;
  panner = null;
}

function startLevel(n) {
  cleanup();
  currentLevel = n;
  foundCount = 0;
  paused = false;
  currentAlpha = 0; currentBeta = 0; leafAngle = 0; leafSnap = true;
  if (orient) orient.calibrate();   // aktuelle Haltung = Mitte für dieses Level
  aktiveZeit = 0;
  abschnittStart = 0;
  zeitWeiter();
  if (window.Erika) Erika.enterExercise({
    demo: DEMOS[n],
    onPause: pauseGame,
    onResume: resumeGame,
    onRestart: () => startLevel(currentLevel),
    onMenu: goHome
  });
  showScreen('screen-level');
  // Kamera-Hintergrund, falls eingeschaltet (js/kamera.js). Bewusst NICHT
  // in cleanup() wieder aus: cleanup() laeuft auch am Anfang von startLevel,
  // die Kamera wuerde zwischen zwei Uebungen sonst neu starten und sichtbar
  // nachbelichten. Ausgeschaltet wird in goHome() und beim Seitenwechsel.
  if (window.Kamera) Kamera.start();

  if (n === 1) {
    totalCount = 1;
    $('instr').textContent = 'Folge dem Blatt und finde den Marienkäfer.';
    objects = [{ id:'o1', img:'assets/Marienkaefer.webp', size:92, angle: randSide(), vAngle: randVAngle(), color:'#a78bfa', found:false, thinOutline:true }];
  } else if (n === 2) {
    totalCount = 1;
    $('instr').textContent = 'Folge dem Geräusch und finde den Uhu.';
    objects = [{ id:'o1', img:'assets/uhu.svg', size:92, angle: randSide(), vAngle: randVAngle(), color:'#34d399', found:false }];
    $('audio-bars').style.display = 'flex';
    $('audio-label').style.display = 'block';
    setupAudio();
  } else if (n === 3) {
    totalCount = 3;
    $('instr').textContent = hinweisUebung3(1);
    const angles = pickThreeAngles();
    const vangles = pickThreeVAngles();
    objects = [
      { id:'o1', img:'assets/Marienkaefer_1.webp', size:92, angle: angles[0], vAngle: vangles[0], color:'#a78bfa', found:false, seq:1, thinOutline:true },
      { id:'o2', img:'assets/Marienkaefer_2.webp', size:92, angle: angles[1], vAngle: vangles[1], color:'#f472b6', found:false, seq:2, thinOutline:true },
      { id:'o3', img:'assets/Marienkaefer_3.webp', size:92, angle: angles[2], vAngle: vangles[2], color:'#fbbf24', found:false, seq:3, thinOutline:true }
    ];
    const list = $('seq-list');
    list.style.display = 'flex';
    list.innerHTML = '<div class="seq-pill" id="pill-1">1</div><div class="seq-pill" id="pill-2">2</div><div class="seq-pill" id="pill-3">3</div>';
  }

  // Ziel: Blatt (dreht sich zum Objekt) in Stufe 1 & 3, Astkreis in Stufe 2
  $('zone').innerHTML = (n === 2)
    ? '<img class="zone-img lite-outline" src="assets/astkreis.svg" alt="Ziel">'
    : '<img class="zone-img rotate-to-target hard-outline" src="assets/Blatt.webp" alt="Ziel">';
  zoneRing = (n !== 2);

  buildTargetDOM();
  attachTouch();
  render();
}

function randSide() {
  const left = Math.random() < 0.78;   // häufiger links (Neglect-Training)
  const mag = SEEK_ANGLE_MIN + Math.random() * (SEEK_ANGLE_MAX - SEEK_ANGLE_MIN);
  return left ? -mag : mag;
}

// kleine Höhenvariation; bewusst klein, damit reines Drehen (links/rechts) das
// Objekt direkt in den Zielkreis führt (vertikaler Versatz < Treffer-Radius).
function randVAngle() {
  return (Math.random() - 0.5) * 10;   // ca. -5 .. +5
}

function pickThreeAngles() {
  const slots = [-60, -20, 20, 60];
  const removeIdx = Math.floor(Math.random()*4);
  const chosen = slots.filter((_,i)=>i!==removeIdx);
  return chosen.map(a => a + (Math.random()-0.5)*8);
}

function pickThreeVAngles() {
  const opts = [-6, 0, 6];
  for (let i=2;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
  return opts;
}

function buildTargetDOM() {
  const c = $('targets-container');
  c.innerHTML = '';
  objects.forEach(o => {
    const el = document.createElement('div');
    el.className = 'target';
    el.id = 'target-'+o.id;
    const size = o.size || 48;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    if (o.img) {
      el.classList.add('img-target');
      el.innerHTML = '<img class="' + (o.thinOutline ? 'thin-outline' : 'lite-outline') + '" src="' + o.img + '" alt="">';
    } else {
      el.style.background = hexAlpha(o.color, 0.3);
      el.style.border = '2px solid ' + o.color;
      el.textContent = o.emoji;
      if (o.seq) { el.style.fontWeight = '500'; el.style.fontSize = '20px'; el.style.color = '#fff'; }
    }
    c.appendChild(el);
  });
}

// Globaler Ton-Schalter aus den Einstellungen (Standard an, falls settings.js fehlt).
function soundEnabled() {
  return typeof getSetting === 'function' ? getSetting('soundOn') !== false : true;
}

// Lautstärke-Regler (0–100) als Faktor 0–1. Wird bei JEDEM Ton-Update frisch
// gelesen, damit eine Änderung in den Einstellungen sofort greift, ohne die
// Übung neu zu starten — genauso wie soundEnabled() oben.
function volumeFactor() {
  if (typeof getSetting !== 'function') return 0.7;
  const v = getSetting('volume');
  return typeof v === 'number' ? Math.max(0, Math.min(1, v / 100)) : 0.7;
}

function setupAudio() {
  if (!soundEnabled()) return;   // kein Ton erzeugen; visuelle Balken laufen weiter (gainNode bleibt null)
  const t = createTone(660);
  if (!t) return;
  audioCtx = t.ctx; oscillator = t.osc; gainNode = t.gain;
  // Stereo-Panner einschleifen: Ton kommt von links/rechts
  try {
    panner = audioCtx.createStereoPanner();
    gainNode.disconnect();
    gainNode.connect(panner);
    panner.connect(audioCtx.destination);
  } catch (e) { panner = null; }
}

// Touch-drag fallback (e.g. desktop browser without sensors, or testing)
function attachTouch() {
  let dragging = false, lastX = 0, lastY = 0;
  const el = $('screen-level');
  el.onpointerdown = (e) => { orientationActive = false; dragging = true; lastX = e.clientX; lastY = e.clientY; };
  el.onpointermove = (e) => {
    if (orientationActive || !dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    currentAlpha -= dx * 0.3;
    currentBeta += dy * 0.3;
    render();
  };
  el.onpointerup = () => dragging = false;
  el.onpointercancel = () => dragging = false;
}

function render() {
  if (paused) return;
  const W = appW(), H = appH();
  const cx = W/2, cy = H/2;
  // scale so that max angle (65deg) plus object radius stays within view, with margin
  const maxAngle = 65;
  const margin = 40;
  const scaleX = (W/2 - margin) / maxAngle;
  const scaleY = (H/2 - margin) / 50;

  let minDist = Infinity;
  const activeSeq = currentLevel === 3 ? foundCount+1 : null;

  objects.forEach(o => {
    const el = $('target-'+o.id);
    if (!el) return;   // DOM noch nicht gebaut (z. B. calibrate() rendert vor buildTargetDOM)
    if (o.found) { el.style.display = 'none'; return; }
    const half = (o.size || 48) / 2;
    // AR-Logik: Objekt liegt fest im Raum. Schwenkt man die Sicht (currentAlpha) nach
    // rechts, wandert das Objekt nach links — daher (o.angle - currentAlpha).
    const x = cx + (o.angle - currentAlpha) * scaleX;
    const y = cy + (currentBeta - (o.vAngle || 0)) * scaleY;
    // transform statt left/top: GPU-beschleunigt, kein Layout-Ruckeln auf Mobil
    el.style.transform = 'translate(' + (x-half) + 'px,' + (y-half) + 'px)';

    if (currentLevel === 3) {
      if (o.seq === activeSeq) el.classList.remove('locked');
      else el.classList.add('locked');
    }

    const dx = x-cx, dy = y-cy;
    const dist = Math.sqrt(dx*dx+dy*dy);

    if (currentLevel === 3) {
      if (o.seq === activeSeq) {
        if (dist < minDist) minDist = dist;
        if (dist < HIT_RADIUS) {
          o.found = true;
          el.style.display = 'none';
          onObjectFound(o);
        }
      }
    } else {
      if (dist < minDist) minDist = dist;
      if (dist < HIT_RADIUS) {
        o.found = true;
        el.style.display = 'none';
        onObjectFound(o);
      }
    }
  });

  let target = null;
  if (currentLevel === 3) target = objects.find(o => !o.found && o.seq === activeSeq);
  else target = objects.find(o => !o.found);

  if (target) {
    const x = cx + (target.angle - currentAlpha)*scaleX;
    const y = cy + (currentBeta - (target.vAngle||0))*scaleY;
    const dx = x-cx, dy = y-cy;
    const dist = Math.sqrt(dx*dx+dy*dy);

    // Blattspitze zum aktiven Ziel ausrichten (nur Blatt, nicht Astkreis).
    // Nahe der Mitte ist die Richtung instabil → Ausrichtung dort einfrieren.
    // Winkel "entwickeln", damit kein 360°-Sprung (Zittern) entsteht.
    const leaf = $('zone').querySelector('.zone-img.rotate-to-target');
    if (leaf && (dist > 50 || leafSnap)) {
      let raw = Math.atan2(dy, dx) * 180 / Math.PI + LEAF_TIP_OFFSET;
      if (leafSnap) {
        leafAngle = raw;   // Level-Start: sofort zum Objekt zeigen, nicht hindrehen
        leafSnap = false;
      } else {
        while (raw - leafAngle > 180) raw -= 360;
        while (raw - leafAngle < -180) raw += 360;
        leafAngle += 0.18 * (raw - leafAngle);   // glätten gegen Zittern
      }
      leaf.style.transform = 'rotate(' + leafAngle + 'deg)';
    }
  }

  $('zone').className = 'center-zone' + (zoneRing ? '' : ' zone-image') + (minDist < HIT_RADIUS ? ' hit' : '');

  if (currentLevel === 2 && objects[0] && !objects[0].found) {
    const dx = (objects[0].angle - currentAlpha) * scaleX;
    const dy = (currentBeta - (objects[0].vAngle||0)) * scaleY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const maxDist = Math.sqrt(W*W+H*H)/2;
    const proximity = Math.max(0, 1 - dist/maxDist);
    const bars = document.querySelectorAll('#audio-bars .bar');
    const activeBars = Math.round(proximity * 5);
    bars.forEach((b,i) => {
      b.style.height = (8 + (i < activeBars ? proximity*16+4 : 0)) + 'px';
      b.style.background = i < activeBars ? '#34d399' : 'rgba(255,255,255,0.15)';
    });
    // 0.12 = bisherige Grundlautstärke bei voller Nähe, jetzt mit dem Regler skaliert
    if (gainNode) gainNode.gain.setTargetAtTime(proximity*0.12*volumeFactor(), audioCtx.currentTime, 0.05);

    // Stereo-Richtung: −1 = links, +1 = rechts
    const pan = Math.max(-1, Math.min(1, dx / (W/2)));
    if (panner) panner.pan.setTargetAtTime(pan, audioCtx.currentTime, 0.05);
  }

  updateDebug();
}

// Kleine Live-Anzeige zum Diagnostizieren (zeigt, ob die Steuerwerte sich bewegen)
function updateDebug() {
  if (!DEBUG_SENSOR) return;
  let d = $('sensor-debug');
  if (!d) {
    d = document.createElement('div');
    d.id = 'sensor-debug';
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:90;background:rgba(0,0,0,0.6);color:#9be7bd;font:11px ui-monospace,monospace;padding:5px 8px;border-radius:6px;pointer-events:none;white-space:pre;line-height:1.4;';
    document.body.appendChild(d);
  }
  const o = objects.find(x => !x.found);
  d.textContent =
    'schwenk α: ' + currentAlpha.toFixed(1) + '°\n' +
    'neig   β: ' + currentBeta.toFixed(1) + '°\n' +
    (o ? 'ziel ∠: ' + o.angle.toFixed(0) + '°  v: ' + (o.vAngle||0).toFixed(0) + '°' : 'gefunden') +
    '\nsensor: ' + (orientationActive ? 'AKTIV' : 'aus (touch)');
}

function onObjectFound(o) {
  if (currentLevel === 1) {
    foundCount = 1;
    recordCompletion('suchen_1');
    logSuchenTime();
    vibrate(VIBRATION.abschluss);
    showSuccess(CHECK_ICON + ' Gefunden!');
  } else if (currentLevel === 2) {
    foundCount = 1;
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    recordCompletion('suchen_2');
    logSuchenTime();
    vibrate(VIBRATION.abschluss);
    showSuccess(CHECK_ICON + ' Ton gefunden!');
  } else if (currentLevel === 3) {
    foundCount++;
    const pill = $('pill-'+o.seq);
    if (pill) pill.classList.add('done');
    if (foundCount >= 3) {
      recordCompletion('suchen_3');
      logSuchenTime();
      vibrate(VIBRATION.abschluss);
      setTimeout(()=> showSuccess(CHECK_ICON + ' Alle gefunden!'), 200);
    } else {
      // Zwischenerfolg: kürzer als der Abschluss, damit sich beides
      // unterscheidet, ohne hinsehen zu müssen.
      vibrate(VIBRATION.treffer);
      $('instr').textContent = hinweisUebung3(foundCount + 1);
    }
  }
}

function showSuccess(text) {
  setTimeout(() => {
    $('success-text').innerHTML = text;
    $('success').classList.add('show');
  }, 250);
}

function onNext() { startLevel(currentLevel); }

window.addEventListener('resize', render);

/* Seite in den Hintergrund gewechselt (App gewechselt, Bildschirm aus, anderer
   Tab): Zeit anhalten. Beim Zurückkommen nur weiterzählen, wenn die Übung auch
   wirklich läuft — steht das Pausemenü offen, bleibt es angehalten. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) zeitAnhalten();
  else if (!paused && $('screen-level').classList.contains('active')) zeitWeiter();
});

// Beim Laden: bereits abgeschlossene Stufen markieren
markStageCards('suchen');

// Sensor verfügbar? Dann Aktivieren-Button zeigen (iOS braucht Nutzer-Tipp für die Freigabe).
(function initSensorButton() {
  if (window.OrientationControl && OrientationControl.isAvailable()) {
    const btn = $('perm-btn');
    if (btn) btn.style.display = '';
    const st = $('perm-status');
    if (st) st.textContent = 'Tippe „Bewegungssensor aktivieren" — oder mit dem Finger ziehen';
    // Automatisch versuchen: außerhalb von iOS erscheint kein Dialog — auch
    // Chromium kennt requestPermission() inzwischen, meldet dort aber nur den
    // eingestellten Zustand, statt nachzufragen. Der Versuch klappt also ohne
    // Nutzer-Geste, der Button blendet sich danach selbst aus. Auf iOS schlägt
    // er ohne echten Tipp fehl -> Button bleibt als Fallback (silent=true).
    requestSensorPermission(true);
  }
})();
