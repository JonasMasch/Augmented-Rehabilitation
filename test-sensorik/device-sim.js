/* ============================================================
   Geräte-Simulator für die Sensor-Tests.

   Bildet ein reales Gerät nach: aus einer Lage (Rotationsmatrix) und einer
   Drehrate werden genau die Felder erzeugt, die ein Browser im
   devicemotion-/deviceorientation-Event liefert — einmal in der
   Android-Konvention (spezifikationskonform) und einmal in der
   iOS-Konvention (accelerationIncludingGravity mit umgekehrtem Vorzeichen).

   Welt-Koordinaten:  X = ost, Y = nord, Z = oben.
   Geräte-Koordinaten: x = rechts, y = zur Oberkante, z = aus dem Bildschirm
   heraus (W3C DeviceOrientation, Abschnitt "device coordinate system").

   R ist die Matrix Welt <- Gerät: die Spalten von R sind die Geräteachsen,
   ausgedrückt in Weltkoordinaten.
   ============================================================ */
'use strict';

const G = 9.80665;
const DEG = Math.PI / 180;

function matMul(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
  return r;
}

function identity() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }

// Rotation um eine Geräte-Achse ('x' | 'y' | 'z'), Rechte-Hand-Regel, Grad.
function rot(axis, deg) {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  if (axis === 'x') return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 'y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

// Welt-Vektor in Geräte-Koordinaten: R^T * v
function worldToDevice(R, v) {
  return [
    R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2],
    R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2],
    R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2]
  ];
}

/* Zerlegt den Up-Vektor (in Geräte-Koordinaten) in die deviceorientation-
   Winkel beta/gamma. Umkehrung von
     up = (-cos(beta)*sin(gamma), sin(beta), cos(beta)*cos(gamma))
   mit gamma in [-90, 90], also cos(gamma) >= 0. */
function upToBetaGamma(up) {
  const uy = Math.max(-1, Math.min(1, up[1]));
  const cosBetaAbs = Math.sqrt(Math.max(0, 1 - uy * uy));
  let beta, cosBeta;
  if (up[2] >= 0) {                      // Bildschirm zeigt nach oben-ish
    beta = Math.asin(uy) / DEG;
    cosBeta = cosBetaAbs;
  } else {                               // Bildschirm zeigt nach unten-ish
    beta = 180 - Math.asin(uy) / DEG;
    if (beta >= 180) beta -= 360;
    cosBeta = -cosBetaAbs;
  }
  let gamma;
  if (Math.abs(cosBeta) < 1e-9) gamma = 0;   // Gerät exakt senkrecht: gamma unbestimmt
  else gamma = Math.atan2(-up[0] / cosBeta, up[2] / cosBeta) / DEG;
  return { beta, gamma };
}

/* Ein simuliertes Gerät.
   convention: 'android' (spec-konform) oder 'ios' (Gravitation invertiert)
   hasGyro:    false simuliert ein Tablet ohne Gyroskop (rotationRate = null) */
class Device {
  constructor(opts) {
    opts = opts || {};
    this.R = opts.R || identity();
    this.convention = opts.convention || 'android';
    this.hasGyro = opts.hasGyro !== false;
    this.omega = [0, 0, 0];        // Drehrate im Geräte-Frame, Grad/s
    this.linearAccel = [0, 0, 0];  // zusätzliche Beschleunigung, Welt-Frame, m/s²
    this.t = 0;                    // ms
  }

  // Lage absolut setzen: Reihenfolge von Rotationen ab der Grundlage
  // (flach auf dem Tisch, Bildschirm nach oben).
  setPose(rotations) {
    this.R = identity();
    for (const [axis, deg] of rotations) this.R = matMul(this.R, rot(axis, deg));
    return this;
  }

  // Drehrate im Geräte-Frame setzen (Grad/s um x, y, z).
  setOmega(wx, wy, wz) { this.omega = [wx, wy, wz]; return this; }

  /* Drehung um eine WELT-Achse mit gegebener Rate — so bewegt sich ein Mensch,
     der das Gerät schwenkt (Drehung um die Welt-Vertikale). Die Rate wird in
     den Geräte-Frame umgerechnet, denn genau das misst das Gyroskop. */
  setOmegaWorld(axisWorld, degPerSec) {
    const w = worldToDevice(this.R, axisWorld).map(v => v * degPerSec);
    this.omega = w;
    return this;
  }

  step(dtSec) {
    // Lage fortschreiben: R <- R * exp(omega_hat * dt), Rodrigues-Formel.
    const [wx, wy, wz] = this.omega.map(v => v * DEG * dtSec);
    const theta = Math.hypot(wx, wy, wz);
    if (theta > 1e-12) {
      const ax = wx / theta, ay = wy / theta, az = wz / theta;
      const c = Math.cos(theta), s = Math.sin(theta), t = 1 - c;
      const K = [
        [t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay],
        [t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax],
        [t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c]
      ];
      this.R = matMul(this.R, K);
    }
    this.t += dtSec * 1000;
    return this;
  }

  // Der Welt-Up-Vektor in Geräte-Koordinaten (Einheitsvektor).
  up() { return worldToDevice(this.R, [0, 0, 1]); }

  /* Das devicemotion-Event, wie der Browser es liefern würde.
     Proper acceleration = a_linear + g*up (Spec); iOS liefert das negiert. */
  motionEvent() {
    const up = this.up();
    const aWorld = this.linearAccel;
    const aDev = worldToDevice(this.R, aWorld);
    const sign = this.convention === 'ios' ? -1 : 1;
    const gx = sign * (up[0] * G + aDev[0]);
    const gy = sign * (up[1] * G + aDev[1]);
    const gz = sign * (up[2] * G + aDev[2]);
    return {
      accelerationIncludingGravity: { x: gx, y: gy, z: gz },
      // Beide Engines liefern alpha/beta/gamma = Drehrate um x/y/z.
      // Belege: w3c/deviceorientation PR #43, Chromium device_motion_event_pump.cc,
      // WebKit DeviceMotionClientIOS.mm.
      rotationRate: this.hasGyro
        ? { alpha: this.omega[0], beta: this.omega[1], gamma: this.omega[2] }
        : { alpha: null, beta: null, gamma: null },
      interval: 16
    };
  }

  // Das deviceorientation-Event (beta/gamma sind plattformübergreifend gleich).
  orientationEvent() {
    const { beta, gamma } = upToBetaGamma(this.up());
    return { alpha: 0, beta, gamma, absolute: false };
  }
}

module.exports = { Device, G, identity, rot, matMul, worldToDevice, upToBetaGamma };
