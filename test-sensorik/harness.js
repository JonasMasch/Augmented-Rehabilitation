/* ============================================================
   Lädt app/js/orientation.js in eine Node-Umgebung mit den Browser-Objekten,
   die das Modul benutzt (window, screen, performance). So lässt sich die
   Sensor-Mathematik ohne Gerät prüfen.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'app', 'js', 'orientation.js');

/* Baut eine frische Umgebung und gibt window zurück.
   screenAngle: Wert für screen.orientation.angle
   iosPermissionApi: true simuliert iOS (DeviceMotionEvent.requestPermission) */
function loadOrientation(opts) {
  opts = opts || {};
  const listeners = new Map();
  let now = 0;

  function addListener(map, type, fn) {
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(fn);
  }
  function removeListener(map, type, fn) {
    const arr = map.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  const screenListeners = new Map();
  const screenObj = {
    orientation: {
      angle: opts.screenAngle || 0,
      addEventListener: (t, fn) => addListener(screenListeners, t, fn),
      removeEventListener: (t, fn) => removeListener(screenListeners, t, fn)
    }
  };

  const windowObj = {
    addEventListener: (t, fn) => addListener(listeners, t, fn),
    removeEventListener: (t, fn) => removeListener(listeners, t, fn),
    DeviceMotionEvent: function () {},
    DeviceOrientationEvent: function () {},
    orientation: 0
  };
  if (opts.iosPermissionApi) {
    windowObj.DeviceMotionEvent.requestPermission = () => Promise.resolve('granted');
    windowObj.DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted');
  }

  const sandbox = {
    window: windowObj,
    screen: screenObj,
    navigator: {
      userAgent: opts.userAgent || 'Mozilla/5.0 (Linux; Android 14; Tablet) Chrome/140.0',
      platform: opts.platform || 'Linux armv8l',
      maxTouchPoints: opts.maxTouchPoints == null ? 5 : opts.maxTouchPoints
    },
    performance: { now: () => now },
    Math,
    console
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.DeviceMotionEvent = windowObj.DeviceMotionEvent;
  sandbox.DeviceOrientationEvent = windowObj.DeviceOrientationEvent;
  sandbox.Promise = Promise;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });

  return {
    window: windowObj,
    screen: screenObj,
    setNow: (ms) => { now = ms; },
    advance: (ms) => { now += ms; },
    getNow: () => now,
    setScreenAngle: (a) => {
      screenObj.orientation.angle = a;
      const arr = screenListeners.get('change') || [];
      arr.slice().forEach(fn => fn({}));
    },
    dispatch: (type, event) => {
      const arr = listeners.get(type) || [];
      arr.slice().forEach(fn => fn(event));
    },
    hasListener: (type) => (listeners.get(type) || []).length > 0
  };
}

/* --- Mini-Test-Runner (keine Abhängigkeiten) --- */
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function approx(actual, expected, tol, msg) {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${msg || ''}: erwartet ${expected} ± ${tol}, war ${actual}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Erwartung nicht erfüllt');
}

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok   ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${t.name}`);
      console.log(`       ${e.message}`);
    }
  }
  console.log(`\n${tests.length - failed} von ${tests.length} bestanden`);
  process.exit(failed ? 1 : 0);
}

module.exports = { loadOrientation, test, run, approx, assert };
