/* ============================================================
   Modul "Suchen" — Spiel-Logik (3 Stufen)
   Nutzt Helfer aus common.js: $, appW, appH, hexAlpha,
   showScreen, createTone
   ============================================================ */

const HIT_RADIUS = 60;     // Treffer-Radius (Mitte Objekt ↔ Mitte Ziel), passend zum Blatt (120px)
const LEAF_TIP_OFFSET = 90; // Dreh-Offset: 90 = Blattspitze zeigt im SVG nach oben
let currentLevel = 0;
let alphaOffset = null;
let betaOffset = null;
let lastRawAlpha = null;
let currentAlpha = 0, currentBeta = 0;
let orientHandler = null;
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
  const needsOrientPerm = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  const needsMotionPerm = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';

  const proceed = () => {
    $('perm-status').textContent = 'Sensor aktiviert ✓';
    attachOrient();
  };

  if (needsOrientPerm || needsMotionPerm) {
    Promise.all([
      needsOrientPerm ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted'),
      needsMotionPerm ? DeviceMotionEvent.requestPermission() : Promise.resolve('granted')
    ]).then(states => {
      if (states.every(s => s === 'granted')) {
        proceed();
      } else {
        $('perm-status').textContent = 'Zugriff verweigert — Touch-Steuerung wird genutzt';
      }
    }).catch(()=>{ $('perm-status').textContent = 'Fehler beim Sensorzugriff'; });
  } else if (window.DeviceOrientationEvent || window.DeviceMotionEvent) {
    proceed();
  } else {
    $('perm-status').textContent = 'Sensor nicht verfügbar — Touch-Steuerung wird genutzt';
  }
}

function goHome() {
  cleanup();
  if (window.Erika) Erika.exitExercise();
  showScreen('screen-home');
  markStageCards('suchen');
}

function cleanup() {
  if (orientHandler) { window.removeEventListener('devicemotion', orientHandler); }
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
  alphaOffset = null;
  betaOffset = null;
  lastRawAlpha = null;
  currentAlpha = 0; currentBeta = 0;
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

function attachOrient() {
  if (orientHandler) window.removeEventListener('devicemotion', orientHandler);
  let lastT = null;
  orientHandler = (e) => {
    const rr = e.rotationRate;
    if (!rr || rr.beta === null || rr.gamma === null) return;
    orientationActive = true;
    const now = performance.now();
    if (lastT === null) { lastT = now; return; }
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.2) dt = 0.2; // Ausreißer bei Tab-Wechsel etc. begrenzen

    // Phone vertikal gehalten (Bildschirm zum Nutzer):
    // Drehung links/rechts (Gieren um Hochachse) ~ rotationRate.gamma
    // Neigen hoch/runter (Nicken) ~ rotationRate.beta
    currentAlpha += (rr.gamma || 0) * dt;
    currentBeta += (rr.beta || 0) * dt;

    // sanfte Begrenzung, damit Objekte nicht beliebig weit wegdriften
    const limit = 90;
    currentAlpha = Math.max(-limit, Math.min(limit, currentAlpha));
    currentBeta = Math.max(-limit, Math.min(limit, currentBeta));

    render();
  };
  window.addEventListener('devicemotion', orientHandler);
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
    const relAngle = currentAlpha - o.angle;
    const x = cx + relAngle * scaleX;
    const y = cy + (-currentBeta) * scaleY * 0.6 + (o.vAngle || 0) * scaleY * 0.4;
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
    const relAngle = currentAlpha - target.angle;
    const x = cx + relAngle*scaleX;
    const y = cy + (-currentBeta)*scaleY*0.6 + (target.vAngle||0)*scaleY*0.4;
    const dx = x-cx, dy = y-cy;
    const dist = Math.sqrt(dx*dx+dy*dy);

    // Spitze des Blattes zum Objekt ausrichten (nur Blatt, nicht Astkreis)
    const leaf = $('zone').querySelector('.zone-img.rotate-to-target');
    if (leaf && dist > 1) {
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      leaf.style.transform = 'rotate(' + (ang + LEAF_TIP_OFFSET) + 'deg)';
    }

    const line = $('arrow-line');
    if (dist > 50) {
      const nx = (dx/dist)*50, ny = (dy/dist)*50;
      const ex = (dx/dist)*Math.min(dist-10, 130), ey = (dy/dist)*Math.min(dist-10,130);
      line.setAttribute('x1', nx+''); line.setAttribute('y1', ny+'');
      line.setAttribute('x2', ex+''); line.setAttribute('y2', ey+'');
      line.setAttribute('opacity','0.85');
    } else {
      line.setAttribute('opacity','0');
    }
    $('arrow-svg').style.left = cx+'px'; $('arrow-svg').style.top = cy+'px';
  } else {
    $('arrow-line').setAttribute('opacity','0');
  }

  $('zone').className = 'center-zone' + (zoneRing ? '' : ' zone-image') + (minDist < HIT_RADIUS ? ' hit' : '');

  if (currentLevel === 2 && objects[0] && !objects[0].found) {
    const dx = (currentAlpha - objects[0].angle) * scaleX;
    const dy = (-currentBeta*scaleY*0.6);
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
