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

// --- Demo-Animationen (Intro) pro Stufe ---
const DEMOS = {
  1: { title: 'Stufe 1 — Visuell',
       text: 'Bewege das Tablet so, dass der Schmetterling im Kreis bleibt, während er wegdriftet.',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined" src="assets/blume.png"></div>' +
                '<div class="demo-obj anim-orbit"><img class="outlined" src="assets/schmetterling.png"></div>' +
              '</div></div>' },
  2: { title: 'Stufe 2 — Audio-visuell',
       text: 'Wie Stufe 1 — am Ton hörst du, ob das Objekt nach links oder rechts driftet (links = von links, rechts = von rechts).',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-sound-sm">🔊</div>' +
                '<div class="demo-target"><img class="outlined" src="assets/astkreis.svg"></div>' +
                '<div class="demo-obj anim-orbit"><img class="outlined" src="assets/uhu.svg"></div>' +
              '</div></div>' },
  3: { title: 'Stufe 3 — Verschwinden',
       text: 'Wie Stufe 1 — der Schmetterling verschwindet kurz. Folge ihm weiter und halte ihn im Kreis.',
       scene: '<div class="demo-device anim-keep"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined" src="assets/blume.svg"></div>' +
                '<div class="demo-obj anim-orbit anim-blinkobj"><img class="outlined" src="assets/schmetterling.svg"></div>' +
              '</div></div>' }
};

function beginStage(n) {
  if (window.Intro) Intro.maybeShow('verfolgen_' + n, DEMOS[n], () => startLevel(n));
  else startLevel(n);
}

function replayIntro() {
  if (window.Intro && DEMOS[currentLevel]) {
    pauseGame();
    Intro.replay(DEMOS[currentLevel], resumeGame);
  }
}

function goHome() {
  cleanup();
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
    onPause: pauseGame,
    onResume: resumeGame,
    onRestart: () => startLevel(currentLevel),
    onMenu: goHome
  });
  showScreen('screen-level');
  $('timer-bar').style.width = '100%';
  $('score').textContent = '0%';

  if (n === 1) {
    $('instr').textContent = 'Bewege das Tablet (mit dem Finger ziehen), um das Objekt im Kreis zu halten';
  } else if (n === 2) {
    $('instr').textContent = 'Halte das Objekt im Kreis — am Ton hörst du, ob es nach links oder rechts driftet';
    $('audio-bars').style.display = 'flex';
    $('audio-label').style.display = 'block';
    setupAudio();
  } else if (n === 3) {
    $('instr').textContent = 'Das Objekt verschwindet kurz — merke dir die Richtung und folge weiter';
  }

  // Objekt & Zielkreis je nach Stufe:
  // Stufe 2 = Uhu + Astkreis, Stufe 1 & 3 = Schmetterling + Blumenkreis
  const obj = $('obj');
  obj.classList.add('img-target');
  objSize = 77; zoneBig = true;
  // Bewegtes Objekt: .lite-outline statt des teuren SVG-Filters .outlined
  // (der wird bei jeder Bewegung neu gerendert — Ruckel-Ursache, wie in Suchen).
  // Der statische Zielkreis behält .outlined.
  if (n === 2) {
    obj.innerHTML = '<img class="lite-outline" src="assets/uhu.svg" alt="">';
    $('zone').innerHTML = '<img class="zone-img outlined" src="assets/astkreis.svg" alt="Ziel">';
  } else if (n === 1) {
    // Stufe 1: neue PNG-Grafiken (gleiche Größe via CSS, weiterhin weißer Rand)
    obj.innerHTML = '<img class="lite-outline" src="assets/schmetterling.png" alt="">';
    $('zone').innerHTML = '<img class="zone-img outlined" src="assets/blume.png" alt="Ziel">';
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
  el.onpointerdown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
  el.onpointermove = (e) => {
    if (!dragging) return;
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
  const pct = totalTime > 0 ? Math.round((inZoneTime/totalTime)*100) : 0;
  $('score').textContent = Math.min(100,pct) + '%';

  if (currentLevel === 2) {
    // Konstante Lautstärke — der Fokus liegt allein auf der Richtung
    if (gainNode) gainNode.gain.setTargetAtTime(0.1, audioCtx.currentTime, 0.05);
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

function setupAudio() {
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
  $('success-text').textContent = passed ? '✓ Geschafft!' : '⏱ Zeit abgelaufen';
  $('success-sub').textContent = 'Im Ziel: ' + pct + '% der Zeit' + (passed ? '' : ' (Ziel: ' + PASS_PCT + '%)');
  $('success').classList.add('show');
}

function onNext() { startLevel(currentLevel); }

// dt=0: nicht direkt render übergeben, sonst landet das Event-Objekt in
// inZoneTime (String/NaN) und der Prozentwert ist kaputt.
window.addEventListener('resize', () => render(0));

// Beim Laden: bereits abgeschlossene Stufen markieren
markStageCards('verfolgen');
