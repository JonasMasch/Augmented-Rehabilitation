/* ============================================================
   Modul "Lenken" — Spiel-Logik (3 Stufen)
   Kugel per Neigen (Pointer-Drag simuliert das Neigen des Geräts)
   durch eine offene Bahn / einen kurvigen Weg / ein Labyrinth
   nach links ins Ziel führen.
   Nutzt Helfer aus common.js: $, appW, appH, showScreen
   ============================================================ */

// --- Physik-Parameter (px-basiert) ---
const ACCEL = 1250;     // Beschleunigung bei voller Neigung (px/s²)
const FRICTION = 2.2;   // Reibung / Dämpfung (1/s) — rollt sanfter aus
const REST = 0.35;      // Rückprall an Wänden (0 = kein Abprallen)
const MAX_TILT_PX = 90; // Ziehweg in px, ab dem die Neigung maximal ist
const SNAIL_HEAD_OFFSET = 90; // Dreh-Offset: 90 = Schneckenkopf zeigt im SVG nach oben
const SNAIL_SIZE = 92;        // optische Größe der Schnecke (länglich -> etwas größer als Käfer)
const ROT_SMOOTH = 0.12;      // wie schnell die Schnecke in die Richtung dreht (kleiner = sanfter)

let currentLevel = 0;
let snailAngle = 180;   // aktuelle Blickrichtung der Schnecke (Start: nach links)
let rafId = null;
let lastT = null;
let elapsed = 0;
let reached = false;

// Spielfeld (px) — wird bei Start/Resize berechnet
let field = { x:0, y:0, w:0, h:0 };
let ballR = 16, goalR = 26;

// Kugel-Zustand (px)
let ball = { x:0, y:0, vx:0, vy:0 };

// Neigung (-1..1 je Achse), durch Drag gesetzt
let tiltX = 0, tiltY = 0;

// aktuelle Level-Definition (Brüche 0..1 des Spielfelds)
let levelDef = null;
let wallRects = [];   // berechnete Wände in px
let goalPx = { x:0, y:0 };

// --- Level-Definitionen ---
// Bahnen in Bruchkoordinaten: x 0=links..1=rechts, y 0=oben..1=unten.
// start/goal = Mittelpunkte, walls = {x,y,w,h} Rechtecke.
const LEVELS = {
  1: { // gerade Bahn, keine Hindernisse — Ziel links
    start: { x:0.85, y:0.5 },
    goal:  { x:0.12, y:0.5 },
    walls: []
  },
  2: { // kurviger Weg — EIN Hindernis, Bogen darum herum
    start: { x:0.86, y:0.42 },
    goal:  { x:0.12, y:0.42 },
    walls: [
      { x:0.50, y:0.00, w:0.07, h:0.56 }  // hängt von oben, Lücke unten
    ]
  },
  3: { // Labyrinth — ZWEI Hindernisse (Serpentine)
    start: { x:0.88, y:0.5 },
    goal:  { x:0.10, y:0.5 },
    walls: [
      { x:0.62, y:0.00, w:0.06, h:0.55 }, // A: oben, Lücke unten
      { x:0.30, y:0.45, w:0.06, h:0.55 }  // B: unten, Lücke oben
    ]
  }
};

// --- Demo-Animationen (Intro) pro Stufe — flach gehaltenes, kippendes Tablet ---
const DEMOS = {
  1: { title: 'Stufe 1 — Gerade Bahn',
       text: 'Halte das Tablet flach und neige es nach links — die Schnecke rollt gerade zum Salat.',
       scene: '<div class="demo-flat anim-tilt1"><div class="flat-surface">' +
                '<div class="flat-goal"><img class="outlined" src="assets/salat.svg"></div>' +
                '<div class="flat-snail roll1"><img class="outlined" src="assets/schnecke.svg"></div>' +
              '</div></div>' },
  2: { title: 'Stufe 2 — Kurviger Weg',
       text: 'Neige das Tablet so, dass die Schnecke auf dem kurvigen Weg um das Hindernis herum zum Salat rollt.',
       scene: '<div class="demo-flat anim-tilt2"><div class="flat-surface">' +
                '<div class="flat-wall w2a"></div>' +
                '<div class="flat-goal"><img class="outlined" src="assets/salat.svg"></div>' +
                '<div class="flat-snail roll2"><img class="outlined" src="assets/schnecke.svg"></div>' +
              '</div></div>' },
  3: { title: 'Stufe 3 — Labyrinth',
       text: 'Führe die Schnecke durchs Labyrinth: am ersten Hindernis vorbei, am zweiten herum, bis zum Salat.',
       scene: '<div class="demo-flat anim-tilt3"><div class="flat-surface">' +
                '<div class="flat-wall w3a"></div>' +
                '<div class="flat-wall w3b"></div>' +
                '<div class="flat-goal"><img class="outlined" src="assets/salat.svg"></div>' +
                '<div class="flat-snail roll3"><img class="outlined" src="assets/schnecke.svg"></div>' +
              '</div></div>' }
};

function beginStage(n) {
  if (window.Intro) Intro.maybeShow('lenken_' + n, DEMOS[n], () => startLevel(n));
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
  markStageCards('lenken');
}

// Pause / Fortsetzen (für das Erika-Pausemenü)
function pauseGame() {
  cancelAnimationFrame(rafId);
}
function resumeGame() {
  if (reached) return;   // Ziel bereits erreicht
  lastT = null;          // dt nach der Pause nicht springen lassen
  rafId = requestAnimationFrame(loop);
}

function cleanup() {
  cancelAnimationFrame(rafId);
  const el = $('screen-level');
  el.onpointerdown = null;
  el.onpointermove = null;
  el.onpointerup = null;
  el.onpointercancel = null;
  $('success').classList.remove('show');
  $('tilt-hint').style.display = 'none';
  $('tilt-knob').style.display = 'none';
  tiltX = 0; tiltY = 0;
}

function startLevel(n) {
  cleanup();
  currentLevel = n;
  levelDef = LEVELS[n];
  elapsed = 0;
  reached = false;
  lastT = null;

  if (window.Erika) Erika.enterExercise({
    onPause: pauseGame,
    onResume: resumeGame,
    onRestart: () => startLevel(currentLevel),
    onMenu: goHome
  });
  showScreen('screen-level');
  $('score').textContent = '0.0 s';
  $('goal').classList.remove('reached');

  if (n === 1) {
    $('instr').textContent = 'Ziehe mit dem Finger, um zu neigen — rolle die Kugel nach links ins Ziel';
  } else if (n === 2) {
    $('instr').textContent = 'Folge dem kurvigen Weg um die Hindernisse herum ins Ziel';
  } else if (n === 3) {
    $('instr').textContent = 'Lenke die Kugel durch das Labyrinth bis zum Ziel links';
  }

  computeField();
  buildLevelDOM();
  // Kugel an Startposition
  ball.x = field.x + levelDef.start.x * field.w;
  ball.y = field.y + levelDef.start.y * field.h;
  ball.vx = 0; ball.vy = 0;
  snailAngle = 180;   // Start: Schnecke blickt nach links (Richtung Ziel)

  attachTouch();
  renderStatic();
  rafId = requestAnimationFrame(loop);
}

function computeField() {
  const inset = 10;
  field.x = inset;
  field.y = inset;
  field.w = appW() - inset*2;
  field.h = appH() - inset*2;
  ballR = 38;   // Kollisionsradius = halbe Schneckengröße (77px, wie Käfer)
  goalR = 60;   // Salat 120px (wie Blatt/Astkreis/Blumenkreis)

  // Wände in px umrechnen
  wallRects = levelDef.walls.map(w => ({
    x: field.x + w.x * field.w,
    y: field.y + w.y * field.h,
    w: w.w * field.w,
    h: w.h * field.h
  }));
  // Ziel positionieren, aber so klemmen, dass der 120px-Salat ganz sichtbar bleibt
  goalPx.x = Math.max(field.x + goalR, Math.min(field.x + field.w - goalR, field.x + levelDef.goal.x * field.w));
  goalPx.y = Math.max(field.y + goalR, Math.min(field.y + field.h - goalR, field.y + levelDef.goal.y * field.h));
}

function buildLevelDOM() {
  // Wände
  const wc = $('walls-container');
  wc.innerHTML = '';
  wallRects.forEach(r => {
    const el = document.createElement('div');
    el.className = 'wall';
    el.style.left = r.x + 'px';
    el.style.top = r.y + 'px';
    el.style.width = r.w + 'px';
    el.style.height = r.h + 'px';
    wc.appendChild(el);
  });

  // Ziel (Salat)
  const g = $('goal');
  g.style.width = goalR*2 + 'px';
  g.style.height = goalR*2 + 'px';
  g.style.left = (goalPx.x - goalR) + 'px';
  g.style.top = (goalPx.y - goalR) + 'px';
  g.innerHTML = '<img class="goal-img outlined" src="assets/salat.svg" alt="Ziel">';

  // Schnecke (optisch 76px, unabhängig vom Kollisionsradius)
  const b = $('ball');
  b.style.width = SNAIL_SIZE + 'px';
  b.style.height = SNAIL_SIZE + 'px';
  b.innerHTML = '<img class="ball-img outlined" src="assets/schnecke.svg" alt="">';
}

function attachTouch() {
  const el = $('screen-level');
  const hint = $('tilt-hint'), knob = $('tilt-knob');
  let dragging = false, originX = 0, originY = 0;

  el.onpointerdown = (e) => {
    dragging = true;
    originX = e.clientX; originY = e.clientY;
    // Joystick-Indikator an der Berührungsstelle anzeigen
    const ring = MAX_TILT_PX;
    hint.style.width = ring*2 + 'px';
    hint.style.height = ring*2 + 'px';
    hint.style.left = (originX - ring) + 'px';
    hint.style.top = (originY - ring) + 'px';
    hint.style.display = 'block';
    knob.style.width = '22px'; knob.style.height = '22px';
    knob.style.display = 'block';
    moveKnob(originX, originY);
  };
  el.onpointermove = (e) => {
    if (!dragging) return;
    let dx = e.clientX - originX, dy = e.clientY - originY;
    // Neigung normiert und begrenzt
    tiltX = Math.max(-1, Math.min(1, dx / MAX_TILT_PX));
    tiltY = Math.max(-1, Math.min(1, dy / MAX_TILT_PX));
    // Knob auf den begrenzten Radius klemmen
    const kx = originX + tiltX * MAX_TILT_PX;
    const ky = originY + tiltY * MAX_TILT_PX;
    moveKnob(kx, ky);
  };
  const end = () => {
    dragging = false;
    tiltX = 0; tiltY = 0;   // losgelassen -> Gerät wieder flach
    hint.style.display = 'none';
    knob.style.display = 'none';
  };
  el.onpointerup = end;
  el.onpointercancel = end;

  function moveKnob(x, y) {
    knob.style.left = (x - 11) + 'px';
    knob.style.top = (y - 11) + 'px';
  }
}

function loop(t) {
  if (lastT === null) lastT = t;
  let dt = (t - lastT) / 1000;
  if (dt > 0.05) dt = 0.05; // Ausreißer begrenzen (Tab-Wechsel etc.)
  lastT = t;

  // Beschleunigung durch Neigung
  ball.vx += tiltX * ACCEL * dt;
  ball.vy += tiltY * ACCEL * dt;

  // Reibung (exponentielle Dämpfung)
  const damp = Math.exp(-FRICTION * dt);
  ball.vx *= damp;
  ball.vy *= damp;

  // Position aktualisieren
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Kollisionen (zweimal auflösen für mehr Stabilität)
  resolveCollisions();
  resolveCollisions();

  render();

  // Ziel erreicht?
  const dgx = ball.x - goalPx.x, dgy = ball.y - goalPx.y;
  if (!reached && Math.hypot(dgx, dgy) < goalR - ballR*0.3) {
    reached = true;
    finish();
    return;
  }

  elapsed += dt;
  $('score').textContent = elapsed.toFixed(1) + ' s';

  rafId = requestAnimationFrame(loop);
}

function resolveCollisions() {
  // Außenwände
  if (ball.x < field.x + ballR) { ball.x = field.x + ballR; if (ball.vx < 0) ball.vx = -ball.vx * REST; }
  if (ball.x > field.x + field.w - ballR) { ball.x = field.x + field.w - ballR; if (ball.vx > 0) ball.vx = -ball.vx * REST; }
  if (ball.y < field.y + ballR) { ball.y = field.y + ballR; if (ball.vy < 0) ball.vy = -ball.vy * REST; }
  if (ball.y > field.y + field.h - ballR) { ball.y = field.y + field.h - ballR; if (ball.vy > 0) ball.vy = -ball.vy * REST; }

  // Hindernis-Wände (Kreis gegen Rechteck)
  wallRects.forEach(r => collideRect(r));
}

function collideRect(r) {
  const nearestX = Math.max(r.x, Math.min(ball.x, r.x + r.w));
  const nearestY = Math.max(r.y, Math.min(ball.y, r.y + r.h));
  let dx = ball.x - nearestX, dy = ball.y - nearestY;
  let d2 = dx*dx + dy*dy;
  if (d2 >= ballR*ballR) return;

  let nx, ny, overlap;
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    nx = dx / d; ny = dy / d;
    overlap = ballR - d;
  } else {
    // Mittelpunkt im Rechteck -> entlang der geringsten Eindringtiefe herausschieben
    const left = ball.x - r.x, right = r.x + r.w - ball.x;
    const top = ball.y - r.y, bottom = r.y + r.h - ball.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) { nx = -1; ny = 0; }
    else if (m === right) { nx = 1; ny = 0; }
    else if (m === top) { nx = 0; ny = -1; }
    else { nx = 0; ny = 1; }
    overlap = ballR + m;
  }

  ball.x += nx * overlap;
  ball.y += ny * overlap;
  const vn = ball.vx*nx + ball.vy*ny;
  if (vn < 0) {
    ball.vx -= (1 + REST) * vn * nx;
    ball.vy -= (1 + REST) * vn * ny;
  }
}

function renderStatic() {
  // Erstposition der Kugel zeichnen
  render();
}

function render() {
  const b = $('ball');
  // Box mittig auf der Physik-Position (optische Größe ≠ Kollisionsradius)
  b.style.left = (ball.x - SNAIL_SIZE/2) + 'px';
  b.style.top = (ball.y - SNAIL_SIZE/2) + 'px';

  // Kopf der Schnecke sanft in die Lenkrichtung drehen
  let dir = null;
  if (tiltX !== 0 || tiltY !== 0) dir = Math.atan2(tiltY, tiltX);             // beim Lenken: Zugrichtung
  else if (Math.hypot(ball.vx, ball.vy) > 12) dir = Math.atan2(ball.vy, ball.vx); // sonst Bewegungsrichtung
  if (dir !== null) {
    const target = dir * 180 / Math.PI;
    let diff = ((target - snailAngle + 540) % 360) - 180; // kürzeste Drehrichtung
    snailAngle += diff * ROT_SMOOTH;                      // schrittweise annähern
  }
  b.style.transform = 'rotate(' + (snailAngle + SNAIL_HEAD_OFFSET) + 'deg)';

  const dgx = ball.x - goalPx.x, dgy = ball.y - goalPx.y;
  const near = Math.hypot(dgx, dgy) < goalR;
  $('goal').className = 'goal' + (near ? ' reached' : '');
}

function finish() {
  cancelAnimationFrame(rafId);
  if (typeof addTrainingSeconds === 'function') addTrainingSeconds(elapsed);
  recordCompletion('lenken_' + currentLevel);
  $('goal').classList.add('reached');
  $('success-text').textContent = '✓ Geschafft!';
  $('success-sub').textContent = 'Zeit: ' + elapsed.toFixed(1) + ' s';
  $('success').classList.add('show');
}

function onNext() { startLevel(currentLevel); }

// Bei Größenänderung Feld neu berechnen und Kugel proportional umrechnen
window.addEventListener('resize', () => {
  if (!levelDef || !$('screen-level').classList.contains('active')) return;
  const oldX = field.x, oldY = field.y, oldW = field.w, oldH = field.h;
  const fx = oldW ? (ball.x - oldX) / oldW : levelDef.start.x;
  const fy = oldH ? (ball.y - oldY) / oldH : levelDef.start.y;
  computeField();
  buildLevelDOM();
  ball.x = field.x + fx * field.w;
  ball.y = field.y + fy * field.h;
  render();
});

// Beim Laden: bereits abgeschlossene Stufen markieren
markStageCards('lenken');
