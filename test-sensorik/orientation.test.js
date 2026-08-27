/* ============================================================
   Tests der Sensor-Mechanik (app/js/orientation.js).

   Geprüft wird gegen ein simuliertes Gerät (test/device-sim.js), dessen
   Ausgaben exakt den Konventionen der Browser folgen:
   - rotationRate.alpha/beta/gamma = Drehrate um die Geräteachsen x/y/z
     (w3c/deviceorientation PR #43; Chromium device_motion_event_pump.cc;
      WebKit DeviceMotionClientIOS.mm)
   - accelerationIncludingGravity: Android spec-konform (flach = +9.81 auf z),
     iOS mit umgekehrtem Vorzeichen
   - Geräte- zu Bildschirmachsen über screen.orientation.angle
     (Chromium SensorReadingRemapper::RemapSensorReadingXYZ)

   Start:  node test/orientation.test.js
   ============================================================ */
'use strict';

const { Device } = require('./device-sim');
const { loadOrientation, test, run, approx, assert } = require('./harness');

const DT = 1 / 60;

/* Speist das simulierte Gerät für `seconds` in das Modul ein. */
function feed(env, dev, seconds) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    dev.step(DT);
    env.advance(DT * 1000);
    env.dispatch('deviceorientation', dev.orientationEvent());
    env.dispatch('devicemotion', dev.motionEvent());
  }
}

/* Aufrechte Haltung: Bildschirm senkrecht, Oberkante oben, Blick horizontal. */
function upright() { return [['x', 90]]; }

/* Startet eine OrientationControl und wartet, bis der Nullpunkt steht. */
function startOrientation(env, dev, opts) {
  const state = { yaw: 0, pitch: 0, updates: 0, steering: 0, unavailable: null };
  const ctrl = new env.window.OrientationControl(Object.assign({
    onUpdate: (yaw, pitch) => {
      state.yaw = yaw; state.pitch = pitch; state.updates++;
      if (yaw !== 0 || pitch !== 0) state.steering++;   // echte Steuerwerte
    },
    onUnavailable: (reason) => { state.unavailable = reason; }
  }, opts || {}));
  ctrl.start();
  ctrl.calibrate();
  feed(env, dev, 1.5);            // ruhig halten -> Nullpunkt wird gesetzt
  return { ctrl, state };
}

function startTilt(env, dev) {
  const state = { x: 0, y: 0, updates: 0 };
  const ctrl = new env.window.TiltControl({
    onUpdate: (x, y) => { state.x = x; state.y = y; state.updates++; }
  });
  ctrl.start();
  ctrl.calibrate();
  feed(env, dev, 1.5);
  return { ctrl, state };
}

/* ============================================================
   Gieren (yaw) — horizontales Schwenken
   ============================================================ */

for (const convention of ['android', 'ios']) {
  test(`[${convention}] Schwenken nach links ergibt positiven Gier-Winkel`, () => {
    const env = loadOrientation({ iosPermissionApi: convention === 'ios' });
    const dev = new Device({ convention }).setPose(upright());
    const { ctrl, state } = startOrientation(env, dev);

    // 30 grad/s um die Welt-Vertikale, mathematisch positiv = nach links
    dev.setOmegaWorld([0, 0, 1], 30);
    feed(env, dev, 1.0);

    approx(ctrl.yawAngle, 30, 2, 'integrierter Gier-Winkel nach 1 s');
    assert(state.yaw > 5, `gefilterter Gier-Wert muss positiv sein, war ${state.yaw}`);
  });

  test(`[${convention}] Gier-Winkel ist unabhängig von der Halteart`, () => {
    // Dieselbe Drehung um die Welt-Vertikale, aber das Gerät wird quer und
    // zusätzlich geneigt gehalten. Das Ergebnis muss gleich bleiben — genau
    // hier fällt eine falsche Zuordnung der Gyroskop-Achsen auf.
    const poses = [
      { name: 'hochkant', pose: [['x', 90]] },
      { name: 'quer links', pose: [['x', 90], ['z', 90]] },
      { name: 'quer rechts', pose: [['x', 90], ['z', -90]] },
      { name: 'quer, 25 grad nach oben', pose: [['x', 115], ['z', 90]] },
      { name: 'quer, 25 grad nach unten', pose: [['x', 65], ['z', -90]] }
    ];
    for (const p of poses) {
      const env = loadOrientation({ iosPermissionApi: convention === 'ios' });
      const dev = new Device({ convention }).setPose(p.pose);
      const { ctrl } = startOrientation(env, dev);
      dev.setOmegaWorld([0, 0, 1], 30);
      feed(env, dev, 1.0);
      approx(ctrl.yawAngle, 30, 2.5, `Gier-Winkel bei Haltung "${p.name}"`);
    }
  });

  test(`[${convention}] Neigen nach oben ergibt positiven Pitch`, () => {
    const env = loadOrientation({ iosPermissionApi: convention === 'ios' });
    const dev = new Device({ convention }).setPose(upright());
    const { state } = startOrientation(env, dev);

    // um die Geräte-x-Achse kippen, bis der Blick 20 grad nach oben geht
    dev.setOmega(20, 0, 0);
    feed(env, dev, 1.0);
    dev.setOmega(0, 0, 0);
    feed(env, dev, 2.0);

    approx(state.pitch, 20, 2, 'Pitch nach 20 grad Neigen nach oben');
  });

  test(`[${convention}] reines Schwenken lässt den Pitch in Ruhe`, () => {
    // Der Komplementärfilter muss die Schwerkraft-Schätzung korrekt mitdrehen.
    // Bei falsch zugeordneten Gyro-Achsen wandert hier der Pitch weg.
    const env = loadOrientation({ iosPermissionApi: convention === 'ios' });
    const dev = new Device({ convention }).setPose([['x', 105]]);   // 15 grad nach oben
    const { state } = startOrientation(env, dev);

    dev.setOmegaWorld([0, 0, 1], 45);
    feed(env, dev, 2.0);
    dev.setOmegaWorld([0, 0, 1], 0);
    feed(env, dev, 1.0);

    approx(state.pitch, 0, 2.5, 'Pitch bleibt beim Schwenken auf dem Nullpunkt');
  });
}

/* ============================================================
   Neigen (tilt) — Kugel-Steuerung
   ============================================================ */

for (const convention of ['android', 'ios']) {
  test(`[${convention}] angehobene Bildschirmseite lässt die Kugel bergab rollen`, () => {
    // Für jeden Bildschirmwinkel wird diejenige Geräteachse angehoben, die
    // gerade "Bildschirm rechts" bzw. "Bildschirm oben" ist. Welche das ist,
    // folgt aus r = (cos a, sin a) und o = (-sin a, cos a) in Geräteachsen.
    // Erwartung: die Kugel rollt immer von der angehobenen Seite weg —
    // unabhängig von Hoch-/Querformat und Plattform.
    //   +x anheben = ['y', -t]    -x anheben = ['y', +t]
    //   +y anheben = ['x', +t]    -y anheben = ['x', -t]
    const cases = [
      { angle: 0, side: 'rechts', lift: ['y', -20], expect: { x: -1, y: 0 } },
      { angle: 0, side: 'oben', lift: ['x', +20], expect: { x: 0, y: +1 } },
      { angle: 90, side: 'rechts', lift: ['x', +20], expect: { x: -1, y: 0 } },
      { angle: 90, side: 'oben', lift: ['y', +20], expect: { x: 0, y: +1 } },
      { angle: 180, side: 'rechts', lift: ['y', +20], expect: { x: -1, y: 0 } },
      { angle: 180, side: 'oben', lift: ['x', -20], expect: { x: 0, y: +1 } },
      { angle: 270, side: 'rechts', lift: ['x', -20], expect: { x: -1, y: 0 } },
      { angle: 270, side: 'oben', lift: ['y', -20], expect: { x: 0, y: +1 } }
    ];
    for (const c of cases) {
      const env = loadOrientation({
        screenAngle: c.angle,
        iosPermissionApi: convention === 'ios'
      });
      const dev = new Device({ convention }).setPose([]);   // flach auf dem Tisch
      const { state } = startTilt(env, dev);

      dev.setPose([c.lift]);
      feed(env, dev, 2.0);

      const mag = Math.sin(20 * Math.PI / 180);   // ~0.342 g bei 20 grad
      const label = `Bildschirmwinkel ${c.angle}, Seite ${c.side} angehoben`;
      approx(state.x, c.expect.x * mag, 0.06, `${label}: tiltX`);
      approx(state.y, c.expect.y * mag, 0.06, `${label}: tiltY`);
    }
  });

  test(`[${convention}] flach gehaltenes Gerät steuert nicht`, () => {
    const env = loadOrientation({ iosPermissionApi: convention === 'ios' });
    const dev = new Device({ convention }).setPose([]);
    const { state } = startTilt(env, dev);
    feed(env, dev, 1.0);
    approx(state.x, 0, 0.01, 'tiltX in Ruhe');
    approx(state.y, 0, 0.01, 'tiltY in Ruhe');
  });
}

/* ============================================================
   Robustheit
   ============================================================ */

test('Gerät ohne Gyroskop wird gemeldet statt still zu bleiben', () => {
  const env = loadOrientation({});
  const dev = new Device({ hasGyro: false }).setPose(upright());
  const { state } = startOrientation(env, dev);
  feed(env, dev, 1.5);
  assert(state.unavailable === 'no-gyroscope',
    `onUnavailable('no-gyroscope') erwartet, war ${JSON.stringify(state.unavailable)}`);
  assert(state.steering === 0, 'ohne Gyroskop dürfen keine Steuerwerte gemeldet werden');
});

test('Neigen funktioniert auch ohne Gyroskop', () => {
  const env = loadOrientation({});
  const dev = new Device({ hasGyro: false }).setPose([]);
  const { state } = startTilt(env, dev);
  dev.setPose([['x', -20]]);       // Unterkante hoch -> Kugel rollt nach oben
  feed(env, dev, 2.0);
  approx(state.y, -Math.sin(20 * Math.PI / 180), 0.06, 'tiltY ohne Gyroskop');
});

test('erkannte Schwerkraft-Konvention: Android spec-konform', () => {
  const env = loadOrientation({});
  const dev = new Device({ convention: 'android' }).setPose([['x', 60]]);
  const { ctrl } = startOrientation(env, dev);
  assert(env.window.SensorConvention.gravitySign() === 1,
    'auf Android muss accelerationIncludingGravity als "nach oben" erkannt werden');
  ctrl.stop();
});

test('erkannte Schwerkraft-Konvention: iOS invertiert', () => {
  const env = loadOrientation({ iosPermissionApi: true });
  const dev = new Device({ convention: 'ios' }).setPose([['x', 60]]);
  const { ctrl } = startOrientation(env, dev);
  assert(env.window.SensorConvention.gravitySign() === -1,
    'auf iOS muss das umgekehrte Vorzeichen erkannt werden');
  ctrl.stop();
});

test('Konvention wird gemessen, nicht geraten: iOS-Werte trotz Android-Erkennungsmerkmal', () => {
  // Sicherheitsnetz: Ein Gerät, das die iOS-Konvention nutzt, aber keine
  // requestPermission-API hat, muss trotzdem korrekt erkannt werden.
  const env = loadOrientation({ iosPermissionApi: false });
  const dev = new Device({ convention: 'ios' }).setPose(upright());
  const { ctrl } = startOrientation(env, dev);
  dev.setOmegaWorld([0, 0, 1], 30);
  feed(env, dev, 1.0);
  approx(ctrl.yawAngle, 30, 3, 'Gier-Winkel bei gemessener iOS-Konvention');
});

test('Bewegungsbeschleunigung verdirbt die Erkennung nicht', () => {
  const env = loadOrientation({});
  const dev = new Device({ convention: 'android' }).setPose(upright());
  dev.linearAccel = [3, 0, 2];    // kräftiges Schütteln in der Welt
  const { ctrl } = startOrientation(env, dev);
  dev.linearAccel = [0, 0, 0];
  feed(env, dev, 1.0);
  assert(env.window.SensorConvention.gravitySign() === 1,
    'Konvention muss trotz Bewegungsbeschleunigung korrekt bleiben');
  ctrl.stop();
});

test('Startwert ohne Messung: Android spec-konform, iOS invertiert', () => {
  // Bevor eine Messung vorliegt, entscheidet die Plattform. Die frühere
  // Erkennung über DeviceMotionEvent.requestPermission taugt dafür nicht mehr,
  // seit Chromium diese API ebenfalls anbietet.
  const android = loadOrientation({});
  assert(android.window.SensorConvention.gravitySign() === 1,
    'Android-Startwert muss +1 sein');

  const ios = loadOrientation({
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    platform: 'MacIntel',
    maxTouchPoints: 5,
    iosPermissionApi: true
  });
  assert(ios.window.SensorConvention.gravitySign() === -1,
    'iOS-Startwert muss -1 sein');

  // Ein Chromium mit requestPermission-API darf nicht als iOS gelten.
  const chrome = loadOrientation({ iosPermissionApi: true });
  assert(chrome.window.SensorConvention.gravitySign() === 1,
    'requestPermission allein macht noch kein iOS');
});

test('stop() entfernt alle Listener', () => {
  const env = loadOrientation({});
  const dev = new Device({}).setPose(upright());
  const { ctrl } = startOrientation(env, dev);
  ctrl.stop();
  const before = ctrl.yawAngle;
  dev.setOmegaWorld([0, 0, 1], 60);
  feed(env, dev, 1.0);
  approx(ctrl.yawAngle, before, 1e-9, 'nach stop() dürfen keine Werte mehr ankommen');
});

test('Formatwechsel setzt den Nullpunkt neu', () => {
  const env = loadOrientation({ screenAngle: 0 });
  const dev = new Device({}).setPose([]);
  const { ctrl, state } = startTilt(env, dev);
  dev.setPose([['x', -20]]);
  feed(env, dev, 1.5);
  assert(Math.abs(state.y) > 0.2, 'Vorbedingung: Neigung wird gemeldet');
  env.setScreenAngle(90);
  assert(ctrl.needsZero === true, 'nach dem Formatwechsel muss neu kalibriert werden');
  approx(state.y, 0, 1e-9, 'während der Neukalibrierung ist die Steuerung neutral');
});

run();
