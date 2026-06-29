/* ============================================================
   Modul "Suchen" — Spiel-Logik (3 Stufen)
   Nutzt Helfer aus common.js: $, appW, appH, hexAlpha,
   showScreen, createTone
   ============================================================ */

const HIT_RADIUS = 60;     // Treffer-Radius (Mitte Objekt ↔ Mitte Ziel), passend zum Blatt (120px)
const LEAF_TIP_OFFSET = 90; // Dreh-Offset: 90 = Blattspitze zeigt im SVG nach oben

// --- Sensor-Steuerung (Vorzeichen/Verstärkung; bei vertauschter Richtung hier umstellen) ---
const SENSOR_GAIN = 1.0;   // 1 = 1:1 (Gerät 30° drehen → Objekt bei 30° in der Mitte)
const SIGN_YAW = 1;        // +1 oder -1, falls links/rechts vertauscht
const SIGN_PITCH = 1;      // +1 oder -1, falls oben/unten vertauscht

let currentLevel = 0;
let currentAlpha = 0, currentBeta = 0;
let leafAngle = 0;         // aktuelle Blatt-Ausrichtung (entwickelt, gegen Zittern)
let orient = null;         // OrientationControl-Instanz (Sensor)
let audioCtx = null, oscillator = null, gainNode = null, panner = null;
let objects = [];
let foundCount = 0;
let totalCount = 1;
let orientationActive = false;
let levelStartTime = 0;
let zoneRing = true;   // gestrichelter Zielring sichtbar? (false bei Astkreis)

function logSuchenTime() {
  if (typeof addTrainingSeconds === 'function') {
    addTrainingSeconds((performance.now() - levelStartTime) / 1000);
  }
}

// --- Demo-Animationen (Intro) pro Stufe ---
const DEMOS = {
  1: { title: 'Stufe 1 — Visuell',
       text: 'Drehe das ganze Gerät nach links — so wandert der Marienkäfer ins Blatt in der Mitte.',
       scene: '<div class="demo-device anim-tilt-left"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined demo-leaf" src="assets/blatt_icon.svg"></div>' +
                '<div class="demo-obj anim-slide"><img class="outlined" src="assets/marienkaefer_icon.svg"></div>' +
              '</div></div>' },
  2: { title: 'Stufe 2 — Audio-visuell',
       text: 'Wie Stufe 1 — zusätzlich wird ein Ton lauter, je näher der Uhu am Astkreis ist.',
       scene: '<div class="demo-device anim-tilt-left"><div class="device-screen">' +
                '<div class="demo-sound-sm">🔊</div>' +
                '<div class="demo-target"><img class="outlined" src="assets/astkreis.svg"></div>' +
                '<div class="demo-obj anim-slide"><img class="outlined" src="assets/uhu.svg"></div>' +
              '</div></div>' },
  3: { title: 'Stufe 3 — Sequenz',
       text: 'Finde die Käfer der Reihe nach (1, 2, 3) und bringe sie nacheinander ins Blatt in der Mitte.',
       scene: '<div class="demo-device anim-seek"><div class="device-screen">' +
                '<div class="demo-target"><img class="outlined demo-leaf-seek" src="assets/blatt_icon.svg"></div>' +
                '</div></div>' +
                '<img class="demo-bug bug1 outlined" src="assets/marienkaefer_1.svg">' +
                '<img class="demo-bug bug2 outlined" src="assets/marienkaefer_2.svg">' +
                '<img class="demo-bug bug3 outlined" src="assets/marienkaefer_3.svg">' }
};

// Stufe öffnen: beim ersten Mal Demo zeigen, dann starten
function beginStage(n) {
  if (window.Intro) Intro.maybeShow('suchen_' + n, DEMOS[n], () => startLevel(n));
  else startLevel(n);
}

// Demo erneut abspielen (über "?"-Button im Level)
function replayIntro() {
  if (window.Intro && DEMOS[currentLevel]) Intro.replay(DEMOS[currentLevel]);
}

function requestSensorPermission() {
  if (!window.OrientationControl) {
    $('perm-status').textContent = 'Sensor nicht verfügbar — Touch-Steuerung wird genutzt';
    return;
  }
  OrientationControl.requestPermission().then(granted => {
    if (granted) {
      startSensor();
      $('perm-status').textContent = 'Sensor aktiviert ✓ — drehe das Gerät';
      const btn = $('perm-btn'); if (btn) btn.style.display = 'none';
    } else {
      $('perm-status').textContent = 'Zugriff verweigert — Touch-Steuerung wird genutzt';
    }
  }).catch(() => { $('perm-status').textContent = 'Fehler beim Sensorzugriff'; });
}

// Sensor starten und Werte an die Steuerung (currentAlpha/currentBeta) hängen.
function startSensor() {
  if (!orient) {
    orient = new OrientationControl({ onUpdate: onOrientUpdate });
  }
  orient.start();
  orient.calibrate();   // aktuelle Haltung = Mitte
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
  panner = null;
}

function startLevel(n) {
  cleanup();
  currentLevel = n;
  foundCount = 0;
  currentAlpha = 0; currentBeta = 0; leafAngle = 0;
  if (orient) orient.calibrate();   // aktuelle Haltung = Mitte für dieses Level
  levelStartTime = performance.now();
  if (window.Erika) Erika.enterExercise({
    onRestart: () => startLevel(currentLevel),
    onMenu: goHome
  });
  showScreen('screen-level');

  if (n === 1) {
    totalCount = 1;
    $('score').textContent = '0 / 1';
    $('instr').textContent = 'Drehe das Gerät, bis das Objekt im Kreis ist';
    objects = [{ id:'o1', img:'assets/marienkaefer_icon.svg', size:77, angle: randSide(), vAngle: randVAngle(), color:'#a78bfa', found:false }];
  } else if (n === 2) {
    totalCount = 1;
    $('score').textContent = '0 / 1';
    $('instr').textContent = 'Der Ton wird lauter, je näher du kommst, und kommt von der Seite des Objekts';
    objects = [{ id:'o1', img:'assets/uhu.svg', size:77, angle: randSide(), vAngle: randVAngle(), color:'#34d399', found:false }];
    $('audio-bars').style.display = 'flex';
    $('audio-label').style.display = 'block';
    setupAudio();
  } else if (n === 3) {
    totalCount = 3;
    $('score').textContent = '0 / 3';
    $('instr').textContent = 'Finde Objekt 1 zuerst — die anderen sind noch gesperrt';
    const angles = pickThreeAngles();
    const vangles = pickThreeVAngles();
    objects = [
      { id:'o1', img:'assets/marienkaefer_1.svg', size:77, angle: angles[0], vAngle: vangles[0], color:'#a78bfa', found:false, seq:1 },
      { id:'o2', img:'assets/marienkaefer_2.svg', size:77, angle: angles[1], vAngle: vangles[1], color:'#f472b6', found:false, seq:2 },
      { id:'o3', img:'assets/marienkaefer_3.svg', size:77, angle: angles[2], vAngle: vangles[2], color:'#fbbf24', found:false, seq:3 }
    ];
    const list = $('seq-list');
    list.style.display = 'flex';
    list.innerHTML = '<div class="seq-pill" id="pill-1">1</div><div class="seq-pill" id="pill-2">2</div><div class="seq-pill" id="pill-3">3</div>';
  }

  // Ziel: Blatt (dreht sich zum Objekt) in Stufe 1 & 3, Astkreis in Stufe 2
  $('zone').innerHTML = (n === 2)
    ? '<img class="zone-img outlined" src="assets/astkreis.svg" alt="Ziel">'
    : '<img class="zone-img rotate-to-target outlined" src="assets/blatt_icon.svg" alt="Ziel">';
  zoneRing = (n !== 2);

  buildTargetDOM();
  attachTouch();
  render();
}

function randSide() {
  const left = Math.random() < 0.78;   // häufiger links (Neglect-Training)
  const mag = 30 + Math.random()*25;
  return left ? -mag : mag;
}

// zufällige Höhe (oben/unten), damit das Objekt nicht immer mittig liegt
function randVAngle() {
  return (Math.random() - 0.5) * 36;   // ca. -18 .. +18
}

function pickThreeAngles() {
  const slots = [-60, -20, 20, 60];
  const removeIdx = Math.floor(Math.random()*4);
  const chosen = slots.filter((_,i)=>i!==removeIdx);
  return chosen.map(a => a + (Math.random()-0.5)*8);
}

function pickThreeVAngles() {
  const opts = [-15, 0, 15];
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
      el.innerHTML = '<img class="outlined" src="' + o.img + '" alt="">';
    } else {
      el.style.background = hexAlpha(o.color, 0.3);
      el.style.border = '2px solid ' + o.color;
      el.textContent = o.emoji;
      if (o.seq) { el.style.fontWeight = '500'; el.style.fontSize = '20px'; el.style.color = '#fff'; }
    }
    c.appendChild(el);
  });
}

function setupAudio() {
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
  el.onpointerdown = (e) => { if (orientationActive) return; dragging = true; lastX = e.clientX; lastY = e.clientY; };
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
    if (o.found) { el.style.display = 'none'; return; }
    const half = (o.size || 48) / 2;
    // AR-Logik: Objekt liegt fest im Raum. Schwenkt man die Sicht (currentAlpha) nach
    // rechts, wandert das Objekt nach links — daher (o.angle - currentAlpha).
    const x = cx + (o.angle - currentAlpha) * scaleX;
    const y = cy + (currentBeta - (o.vAngle || 0)) * scaleY;
    el.style.left = (x-half)+'px';
    el.style.top = (y-half)+'px';

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
    if (leaf && dist > 38) {
      let raw = Math.atan2(dy, dx) * 180 / Math.PI + LEAF_TIP_OFFSET;
      while (raw - leafAngle > 180) raw -= 360;
      while (raw - leafAngle < -180) raw += 360;
      leafAngle = raw;
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
    if (gainNode) gainNode.gain.setTargetAtTime(proximity*0.12, audioCtx.currentTime, 0.05);

    // Stereo-Richtung: −1 = links, +1 = rechts
    const pan = Math.max(-1, Math.min(1, dx / (W/2)));
    if (panner) panner.pan.setTargetAtTime(pan, audioCtx.currentTime, 0.05);
  }
}

function onObjectFound(o) {
  if (currentLevel === 1) {
    foundCount = 1;
    $('score').textContent = '1 / 1';
    recordCompletion('suchen_1');
    logSuchenTime();
    showSuccess('✓ Gefunden!');
  } else if (currentLevel === 2) {
    foundCount = 1;
    $('score').textContent = '1 / 1';
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    recordCompletion('suchen_2');
    logSuchenTime();
    showSuccess('✓ Ton gefunden!');
  } else if (currentLevel === 3) {
    foundCount++;
    $('score').textContent = foundCount + ' / 3';
    const pill = $('pill-'+o.seq);
    if (pill) pill.classList.add('done');
    if (foundCount >= 3) {
      recordCompletion('suchen_3');
      logSuchenTime();
      setTimeout(()=> showSuccess('✓ Alle gefunden!'), 200);
    } else {
      $('instr').textContent = 'Jetzt Objekt ' + (foundCount+1) + ' finden';
    }
  }
}

function showSuccess(text) {
  setTimeout(() => {
    $('success-text').textContent = text;
    $('success').classList.add('show');
  }, 250);
}

function onNext() { startLevel(currentLevel); }

window.addEventListener('resize', render);

// Beim Laden: bereits abgeschlossene Stufen markieren
markStageCards('suchen');

// Sensor verfügbar? Dann Aktivieren-Button zeigen (iOS braucht Nutzer-Tipp für die Freigabe).
(function initSensorButton() {
  if (window.OrientationControl && OrientationControl.isAvailable()) {
    const btn = $('perm-btn');
    if (btn) btn.style.display = '';
    const st = $('perm-status');
    if (st) st.textContent = 'Tippe „Bewegungssensor aktivieren" — oder mit dem Finger ziehen';
  }
})();
