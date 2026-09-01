/* ============================================================
   Modul "Verfolgen" — Spiel-Logik (3 Stufen)
   Nutzt Helfer aus common.js: $, appW, appH, showScreen, createTone
   ============================================================ */

const DURATION = 15;   // Sekunden pro Durchgang
const PASS_PCT = 50;   // ab so viel % im Ziel gilt der Durchgang als geschafft
let currentLevel = 0;
let viewX = 0, viewY = 0;       // Position des "Fensters" (durch Tablet-Bewegung gesteuert)
let objX = 0, objY = 0;         // Position des Objekts im Raum (relativ)
let objVX = 0, objVY = 0;
let timeLeft = DURATION;
let inZoneTime = 0;
let totalTime = 0;
let rafId = null;
let lastT = null;
let visible = true;
let blinkTimer = 0;
let nextBlinkAt = 0;
let audioCtx = null, oscillator = null, gainNode = null, panner = null;
let objSize = 52;        // Größe des Verfolgungsobjekts (Stufe 2 = Uhu, größer)
let zoneBig = false;     // Stufe 2: Astkreis-Zielkreis (größer, ohne dashed Ring)

// --- Sensor-Steuerung (wie Suchen: Gerät schwenken/neigen bewegt die Sicht) ---
// SENSOR_GAIN rechnet Grad in Welt-Einheiten um (höher = empfindlicher).
//
// Vorzeichen ergeben sich aus der Sensor-Semantik (orientation.js) und der
// Anzeige-Formel, sie sind nicht empirisch geraten:
//   yaw   > 0 = Schwenk nach links      pitch > 0 = Blick nach oben
//   x = cx + (objX - viewX)*k  ->  viewX muss beim Schwenk nach RECHTS wachsen,
//       damit das Objekt nach links wandert  ->  SIGN_YAW = -1
//   y = cy + (objY - viewY)*k  ->  viewY muss beim Neigen nach UNTEN wachsen,
//       damit das Objekt nach oben wandert   ->  SIGN_PITCH = -1
// (Die Pitch-Formel ist zu Suchen invertiert — dort steht currentBeta vorn.)
const SENSOR_GAIN = 5.0;
const SIGN_YAW = -1;        // +1 oder -1, falls links/rechts vertauscht
const SIGN_PITCH = -1;      // +1 oder -1, falls oben/unten vertauscht
const DEBUG_SENSOR = false;  // kleine Live-Anzeige unten links (vor Release auf false)
let orient = null;          // OrientationControl-Instanz (Sensor)
let sensorActive = false;   // true, sobald echte Sensorwerte ankommen

// --- Demo-Animationen (Intro) pro Stufe ---
const DEMOS = {
  1: { title: 'Verfolgen – Übung 1',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um den Schmetterling zu verfolgen. Folge dafür seinen Bewegungen, um ihn auf der Blume zu halten.',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined" src="assets/Blume_2.png"></div>' +
                '<div class="demo-obj anim-orbit"><img class="outlined" src="assets/schmetterling.png"></div>' +
              '</div>' +
              '<img class="demo-hand demo-hand-left" src="assets/Hand.svg">' +
              '<img class="demo-hand demo-hand-right" src="assets/Hand.svg">' +
              '</div>' },
  2: { title: 'Verfolgen – Übung 2',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um den Uhu zu verfolgen. Folge dafür seinen Geräuschen, um ihn in seinem Nest zu halten.',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-sound-sm"><svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg></div>' +
                '<div class="demo-target"><img class="outlined" src="assets/astkreis.svg"></div>' +
                '<div class="demo-obj anim-orbit"><img class="outlined" src="assets/uhu.svg"></div>' +
              '</div>' +
              '<img class="demo-hand demo-hand-left" src="assets/Hand.svg">' +
              '<img class="demo-hand demo-hand-right" src="assets/Hand.svg">' +
              '</div>' },
  3: { title: 'Verfolgen – Übung 3',
       text: 'Halte das Tablet gerade vor dir und drehe deinen Körper, um den Schmetterling zu verfolgen. Folge dafür seinen Bewegungen und finde ihn neu, wenn er kurz verschwindet, um ihn auf der Blume zu halten.',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined" src="assets/blume.svg"></div>' +
                '<div class="demo-obj anim-orbit anim-blinkobj"><img class="outlined" src="assets/schmetterling.svg"></div>' +
              '</div>' +
              '<img class="demo-hand demo-hand-left" src="assets/Hand.svg">' +
              '<img class="demo-hand demo-hand-right" src="assets/Hand.svg">' +
              '</div>' }
};

function beginStage(n) {
  /* Kamera schon hier anwerfen, nicht erst in startLevel: der Tipp auf die
     Kachel ist eine gueltige Nutzer-Geste, und die Erklaeranimation deckt die
     Startzeit der Kamera ab. Sonst sieht man beim Uebungsbeginn erst das Foto.
     Laeuft sie schon, ist der Aufruf ein No-Op (siehe kamera.js). */
  if (window.Kamera) Kamera.start();
  if (window.Intro) Intro.maybeShow('verfolgen_' + n, DEMOS[n], () => startLevel(n));
  else startLevel(n);
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
      $('perm-status').innerHTML = 'Sensor aktiviert <svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> — bewege das Gerät';
      const btn = $('perm-btn'); if (btn) btn.style.display = 'none';
    } else if (!silent) {
      $('perm-status').textContent = 'Zugriff verweigert — Touch-Steuerung wird genutzt';
    }
  }).catch(() => { if (!silent) $('perm-status').textContent = 'Fehler beim Sensorzugriff'; });
}

// Sensor starten; Schwenken/Neigen steuert die Sicht (viewX/viewY).
// Wird auch vom geführten Flow (flow.js) beim Seitenstart aufgerufen.
function startSensor() {
  if (!window.OrientationControl) return;
  if (!orient) orient = new OrientationControl({
    onUpdate: onOrientUpdate,
    onUnavailable: onSensorUnavailable
  });
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
  sensorActive = true;
  viewX = SIGN_YAW * SENSOR_GAIN * yaw;
  viewY = SIGN_PITCH * SENSOR_GAIN * pitch;
  // kein render() nötig — die Spielschleife (rAF) zeichnet jeden Frame
}

function goHome() {
  cleanup();
  if (window.Kamera) Kamera.stop();
  if (window.Erika) Erika.exitExercise();
  showScreen('screen-home');
  markStageCards('verfolgen');
}

// Pause / Fortsetzen (für das Erika-Pausemenü)
function pauseGame() {
  cancelAnimationFrame(rafId);
  if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
}
function resumeGame() {
  if (timeLeft <= 0) return;   // Durchgang bereits beendet
  lastT = null;                // dt nach der Pause nicht springen lassen
  rafId = requestAnimationFrame(loop);
}

function cleanup() {
  cancelAnimationFrame(rafId);
  $('screen-level').onpointerdown = null;
  $('screen-level').onpointermove = null;
  $('screen-level').onpointerup = null;
  $('screen-level').onpointercancel = null;
  $('success').classList.remove('show');
  $('audio-bars').style.display = 'none';
  $('audio-label').style.display = 'none';
  if (oscillator) { try { oscillator.stop(); } catch(e){} oscillator = null; }
  // Context schließen — Browser erlauben nur wenige gleichzeitige AudioContexts
  if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
  gainNode = null;
  panner = null;
}

function startLevel(n) {
  cleanup();
  currentLevel = n;
  viewX = 0; viewY = 0;
  objX = 0; objY = 0;
  if (orient) orient.calibrate();   // aktuelle Haltung = Mitte für dieses Level
  // Objekt startet mit leichter Drift weg von der Mitte
  setDriftDirection();   // Startrichtung (bevorzugt nach links)
  timeLeft = DURATION;
  inZoneTime = 0;
  totalTime = 0;
  visible = true;
  blinkTimer = 0;
  nextBlinkAt = 2 + Math.random()*2;
  lastT = null;

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
  $('timer-bar').style.width = '100%';

  if (n === 1) {
    // Ein Text für beide Steuerungsarten: die frühere Fallunterscheidung
    // Sensor/Finger ist entfallen, seit die Bewegungssteuerung zuverlässig läuft.
    $('instr').textContent = 'Halte den Schmetterling auf der Blume.';
  } else if (n === 2) {
    $('instr').textContent = 'Halte den Uhu in seinem Nest.';
    $('audio-bars').style.display = 'flex';
    $('audio-label').style.display = 'block';
    setupAudio();
  } else if (n === 3) {
    $('instr').textContent = 'Halte den Schmetterling auf der Blume und finde ihn wieder.';
  }

  // Objekt & Zielkreis je nach Stufe:
  // Stufe 2 = Uhu + Astkreis, Stufe 1 & 3 = Schmetterling + Blumenkreis
  const obj = $('obj');
  obj.classList.add('img-target');
  objSize = 92; zoneBig = true;   // = Objektgröße der anderen Übungen (Marienkäfer/Schnecke)
  // Bewegtes Objekt: .lite-outline statt des teuren SVG-Filters .outlined
  // (der wird bei jeder Bewegung neu gerendert — Ruckel-Ursache, wie in Suchen).
  // Der statische Zielkreis behält .outlined.
  if (n === 2) {
    obj.innerHTML = '<img class="lite-outline" src="assets/uhu.svg" alt="">';
    $('zone').innerHTML = '<img class="zone-img outlined" src="assets/astkreis.svg" alt="Ziel">';
  } else if (n === 1) {
    // Stufe 1: testweise neue PNG-Grafiken (Schmetterling.png = schmetterling.png,
    // Blume_2.png). Größe via CSS (92 px wie andere Objekte), weißer Rand über die
    // Outline-Klassen (bewegtes Objekt .lite-outline, statischer Kreis .outlined).
    obj.innerHTML = '<img class="lite-outline" src="assets/schmetterling.png" alt="">';
    $('zone').innerHTML = '<img class="zone-img outlined" src="assets/Blume_2.png" alt="Ziel">';
  } else {
    obj.innerHTML = '<img class="lite-outline" src="assets/schmetterling.svg" alt="">';
    $('zone').innerHTML = '<img class="zone-img outlined" src="assets/blume.svg" alt="Ziel">';
  }

  attachTouch();
  rafId = requestAnimationFrame(loop);
}

function attachTouch() {
  let dragging = false, lastX = 0, lastY = 0;
  const el = $('screen-level');
  el.onpointerdown = (e) => { sensorActive = false; dragging = true; lastX = e.clientX; lastY = e.clientY; };
  el.onpointermove = (e) => {
    if (sensorActive || !dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    // Tablet nach rechts bewegen -> "Fenster" verschiebt Inhalt nach links mitnehmen
    viewX -= dx * 0.18;
    viewY -= dy * 0.18;
  };
  el.onpointerup = () => dragging = false;
  el.onpointercancel = () => dragging = false;
}

// Driftrichtung neu setzen — bevorzugt nach links (Neglect-Training)
function setDriftDirection() {
  const base = Math.random() < 0.75 ? Math.PI : 0;   // links (häufiger) oder rechts
  const dir = base + (Math.random() - 0.5) * 1.3;    // etwas nach oben/unten
  const sp = 15 + Math.random() * 8;
  objVX = Math.cos(dir) * sp;
  objVY = Math.sin(dir) * sp * 0.8;
}

function loop(t) {
  if (lastT === null) lastT = t;
  let dt = (t - lastT) / 1000;
  if (dt > 0.1) dt = 0.1;
  lastT = t;

  // Objekt driftet gleichmäßig weiter
  objX += objVX * dt;
  objY += objVY * dt;
  // seltener Richtungswechsel, damit man wirklich gegensteuern muss
  if (Math.random() < 0.004) setDriftDirection();

  // Stufe 3: Blinken
  if (currentLevel === 3) {
    blinkTimer += dt;
    if (visible && blinkTimer > nextBlinkAt) {
      visible = false;
      blinkTimer = 0;
    } else if (!visible && blinkTimer > 0.5) {
      visible = true;
      blinkTimer = 0;
      nextBlinkAt = 2 + Math.random()*2.5;
    }
  }

  render(dt);
  updateDebug();

  timeLeft -= dt;
  totalTime += dt;
  $('timer-bar').style.width = Math.max(0, (timeLeft/DURATION*100)) + '%';
  if (timeLeft <= 0) {
    finish();
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function render(dt) {
  const W = appW(), H = appH();
  const cx = W/2, cy = H/2;
  const scaleX = W / 70;
  const scaleY = H / 50;

  const relX = objX - viewX;
  const relY = objY - viewY;
  const x = cx + relX * scaleX * 0.1; // Faktor 0.1 da objX in "Grad-Einheiten" akkumuliert
  const y = cy + relY * scaleY * 0.1;

  const obj = $('obj');
  const half = objSize / 2;
  // transform statt left/top: GPU-beschleunigt, kein Layout-Ruckeln auf Mobil
  obj.style.transform = 'translate(' + (x-half) + 'px,' + (y-half) + 'px)';
  obj.style.display = visible ? 'flex' : 'none';

  const dx = x-cx, dy = y-cy;
  const dist = Math.sqrt(dx*dx+dy*dy);
  const inZone = dist < 54;
  $('zone').className = 'center-zone' + (zoneBig ? ' zone-image' : '') + (inZone && visible ? ' hit' : '');

  if (inZone && visible && dt) inZoneTime += dt;

  if (currentLevel === 2) {
    // Konstante Lautstärke — der Fokus liegt allein auf der Richtung
    if (gainNode) gainNode.gain.setTargetAtTime(0.1*volumeFactor(), audioCtx.currentTime, 0.05);
    // Stereo-Richtung deutlich: schon bei mäßiger Auslenkung voll links/rechts
    const pan = Math.max(-1, Math.min(1, dx / (W * 0.20)));
    if (panner) panner.pan.setTargetAtTime(pan, audioCtx.currentTime, 0.05);
    // Anzeige: der leuchtende Balken zeigt die Richtung (links – Mitte – rechts)
    const bars = document.querySelectorAll('#audio-bars .bar');
    const idx = Math.round((pan + 1) / 2 * (bars.length - 1));
    bars.forEach((b, i) => {
      const on = i === idx;
      b.style.height = on ? '24px' : '8px';
      b.style.background = on ? '#34d399' : 'rgba(255,255,255,0.15)';
    });
  }
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
  const t = createTone(523);
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

function finish() {
  cancelAnimationFrame(rafId);
  if (typeof addTrainingSeconds === 'function') addTrainingSeconds(totalTime);
  if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
  const pct = Math.min(100, totalTime > 0 ? Math.round((inZoneTime/totalTime)*100) : 0);
  const passed = pct >= PASS_PCT;
  if (passed) recordCompletion('verfolgen_' + currentLevel);
  /* Auch der nicht bestandene Durchgang bekommt eine kurze Rückmeldung: Der
     Bildschirm zeigt zwar ein Overlay, aber wer gerade auf das Objekt
     konzentriert ist, übersieht den Wechsel leicht. Der einzelne kurze Impuls
     unterscheidet sich deutlich vom dreiteiligen Abschluss-Muster.
     Bewusst KEINE Rückmeldung beim Verlassen des Zielkreises während der
     Übung — das Objekt pendelt dort ständig hin und her und würde dauerfeuern. */
  vibrate(passed ? VIBRATION.abschluss : VIBRATION.treffer);
  $('success-text').innerHTML = passed
    ? '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Geschafft!'
    : '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg> Zeit abgelaufen';
  $('success-sub').textContent = 'Im Ziel: ' + pct + '% der Zeit' + (passed ? '' : ' (Ziel: ' + PASS_PCT + '%)');
  $('success').classList.add('show');
}

function onNext() { startLevel(currentLevel); }

// dt=0: nicht direkt render übergeben, sonst landet das Event-Objekt in
// inZoneTime (String/NaN) und der Prozentwert ist kaputt.
window.addEventListener('resize', () => render(0));

// Kleine Live-Anzeige zum Diagnostizieren (Sichtposition + Sensor-Status)
function updateDebug() {
  if (!DEBUG_SENSOR) return;
  let d = $('sensor-debug');
  if (!d) {
    d = document.createElement('div');
    d.id = 'sensor-debug';
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:90;background:rgba(0,0,0,0.6);color:#9be7bd;font:11px ui-monospace,monospace;padding:5px 8px;border-radius:6px;pointer-events:none;white-space:pre;line-height:1.4;';
    document.body.appendChild(d);
  }
  d.textContent =
    'sicht x: ' + viewX.toFixed(1) + '\n' +
    'sicht y: ' + viewY.toFixed(1) + '\n' +
    'objekt : ' + objX.toFixed(1) + ' / ' + objY.toFixed(1) + '\n' +
    'sensor : ' + (sensorActive ? 'AKTIV' : 'aus (touch)');
}

// Beim Laden: bereits abgeschlossene Stufen markieren
markStageCards('verfolgen');

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
