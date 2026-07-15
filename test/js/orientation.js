/* ============================================================
   Bewegungssteuerung — gyroskop-basiert, OHNE Magnetometer/Kompass.

   Liefert geglättete, kalibrierte Werte:
     yaw   = horizontales Schwenken (Grad, relativ zum Nullpunkt)
     pitch = vertikales Neigen      (Grad, relativ zum Nullpunkt)

   Warum so: Die Geräte-Ausrichtung (deviceorientation/alpha) enthält den
   KOMPASS (Magnetometer) — der rauscht stark und umgebungsabhängig ("mal
   perfekt, mal zappelig"). Deshalb hier:
   - Horizontal (yaw): Drehrate des GYROSKOPS auf die Welt-Vertikale projiziert
     und aufintegriert → sehr ruhig, kein Kompass. (Leichte Langzeit-Drift, daher
     bei jedem Level neu kalibrieren.)
   - Vertikal (pitch): aus dem SCHWERKRAFT-Vektor (absolut, kein Drift, ruhig).
   Beides aus dem devicemotion-Event (rotationRate + accelerationIncludingGravity).
   ============================================================ */
(function () {
  'use strict';

  // --- 1€-Filter (One-Euro) für die Restglättung ---
  function OneEuro(minCutoff, beta, dCutoff) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff || 1.0;
    this.xPrev = null; this.dxPrev = 0; this.tPrev = null;
  }
  OneEuro.prototype._alpha = function (cutoff, dt) {
    var tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt);
  };
  OneEuro.prototype.filter = function (x, t) {
    if (this.tPrev === null) { this.tPrev = t; this.xPrev = x; this.dxPrev = 0; return x; }
    var dt = (t - this.tPrev) / 1000; if (dt <= 0) dt = 1 / 60; this.tPrev = t;
    var dx = (x - this.xPrev) / dt;
    var aD = this._alpha(this.dCutoff, dt);
    var dxHat = aD * dx + (1 - aD) * this.dxPrev; this.dxPrev = dxHat;
    var cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    var aX = this._alpha(cutoff, dt);
    var xHat = aX * x + (1 - aX) * this.xPrev; this.xPrev = xHat;
    return xHat;
  };
  OneEuro.prototype.reset = function () { this.xPrev = null; this.dxPrev = 0; this.tPrev = null; };

  // --- Controller ---
  function OrientationControl(opts) {
    opts = opts || {};
    // Gyro ist schon ruhig -> Yaw nur leicht glätten; Schwerkraft -> Pitch etwas mehr.
    this.euroYaw = new OneEuro(2.0, 0.02);
    this.euroPitch = new OneEuro(0.7, 0.01);
    this.yawAngle = 0;          // integrierter Gier-Winkel (Grad)
    this.zeroPitch = 0;
    this.needsZero = true;
    this.lastT = null;
    this.yaw = 0; this.pitch = 0;
    this.active = false;
    this.onUpdate = opts.onUpdate || null;
    this._handler = null;
  }

  // Nullpunkt neu setzen: nächste Lesung wird zur "Mitte".
  OrientationControl.prototype.calibrate = function () { this.needsZero = true; };

  OrientationControl.prototype._onEvent = function (e) {
    var rr = e.rotationRate;
    var g = e.accelerationIncludingGravity;
    if (!rr || !g || g.x == null || rr.alpha == null) return;
    this.active = true;

    var now = performance.now();
    if (this.lastT === null) { this.lastT = now; return; }
    var dt = (now - this.lastT) / 1000; this.lastT = now;
    if (dt <= 0) dt = 1 / 60; if (dt > 0.1) dt = 0.1;  // Ausreißer (Tab-Wechsel) begrenzen

    // Schwerkraft normieren → Richtung "unten" im Geräte-Frame
    var gx = g.x, gy = g.y, gz = g.z;
    var gn = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    gx /= gn; gy /= gn; gz /= gn;

    // Winkelgeschwindigkeit (Grad/s) um Geräte-Achsen x,y,z = beta,gamma,alpha.
    // Gier-Rate = Drehung um die Welt-Vertikale = Projektion von ω auf die Schwerkraft.
    var wx = rr.beta || 0, wy = rr.gamma || 0, wz = rr.alpha || 0;
    var yawRate = wx * gx + wy * gy + wz * gz;
    this.yawAngle += yawRate * dt;

    // Pitch (hoch/runter) absolut aus der Schwerkraft (kein Drift)
    var pitchAbs = Math.atan2(-gz, Math.sqrt(gx * gx + gy * gy)) * 180 / Math.PI;

    if (this.needsZero) {
      this.yawAngle = 0;
      this.zeroPitch = pitchAbs;
      this.euroYaw.reset(); this.euroPitch.reset();
      this.needsZero = false;
    }
    var pitchRel = pitchAbs - this.zeroPitch;

    this.yaw = this.euroYaw.filter(this.yawAngle, now);
    this.pitch = this.euroPitch.filter(pitchRel, now);

    if (this.onUpdate) this.onUpdate(this.yaw, this.pitch);
  };

  OrientationControl.prototype.start = function () {
    if (this._handler) return;
    var self = this;
    this._handler = function (e) { self._onEvent(e); };
    window.addEventListener('devicemotion', this._handler, true);
  };

  OrientationControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    this.active = false;
  };

  // Permission (iOS 13+) anfragen — Orientation UND Motion. Gibt Promise<boolean>.
  OrientationControl.requestPermission = function () {
    var needsO = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    var needsM = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
    if (needsO || needsM) {
      return Promise.all([
        needsO ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted'),
        needsM ? DeviceMotionEvent.requestPermission() : Promise.resolve('granted')
      ]).then(function (s) { return s.every(function (x) { return x === 'granted'; }); })
        .catch(function () { return false; });
    }
    return Promise.resolve(typeof window.DeviceMotionEvent !== 'undefined');
  };

  OrientationControl.isAvailable = function () {
    return typeof window.DeviceMotionEvent !== 'undefined';
  };

  window.OrientationControl = OrientationControl;

  /* ============================================================
     Neige-Steuerung (für Lenken): Gerät wird flach gehalten,
     Neigen kippt die "Murmel-Ebene".

     Liefert tiltX/tiltY = Schwerkraft-Anteil entlang der BILDSCHIRM-
     Achsen (x = rechts, y = unten) in g-Einheiten, relativ zum
     Nullpunkt (calibrate = aktuelle Haltung ist "flach"). Die
     Bildschirm-Drehung (Hoch-/Querformat) wird herausgerechnet.
     Skalierung, Vorzeichen und Totzone übernimmt das Spiel.
     ============================================================ */
  function TiltControl(opts) {
    opts = opts || {};
    // Neigen soll direkt reagieren -> nur leicht glätten (Handzittern raus)
    this.euroX = new OneEuro(1.2, 0.05);
    this.euroY = new OneEuro(1.2, 0.05);
    this.zeroX = 0; this.zeroY = 0;
    this.needsZero = true;
    this.tiltX = 0; this.tiltY = 0;
    this.active = false;
    this.onUpdate = opts.onUpdate || null;
    this._handler = null;
  }

  // Nullpunkt neu setzen: aktuelle Haltung = "flach"
  TiltControl.prototype.calibrate = function () { this.needsZero = true; };

  TiltControl.prototype._onEvent = function (e) {
    var g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    this.active = true;
    var now = performance.now();

    // Schwerkraft normieren (Richtung reicht, Betrag egal)
    var gx = g.x, gy = g.y, gz = g.z || 0;
    var gn = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    gx /= gn; gy /= gn;

    // Geräte-Achsen -> Bildschirm-Achsen (Hoch-/Querformat herausrechnen)
    var ang = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle : (window.orientation || 0);
    var rad = ang * Math.PI / 180;
    var sx = gx * Math.cos(rad) + gy * Math.sin(rad);   // Anteil nach Bildschirm-rechts
    var sy = gx * Math.sin(rad) - gy * Math.cos(rad);   // Anteil nach Bildschirm-unten

    if (this.needsZero) {
      this.zeroX = sx; this.zeroY = sy;
      this.euroX.reset(); this.euroY.reset();
      this.needsZero = false;
    }
    this.tiltX = this.euroX.filter(sx - this.zeroX, now);
    this.tiltY = this.euroY.filter(sy - this.zeroY, now);

    if (this.onUpdate) this.onUpdate(this.tiltX, this.tiltY);
  };

  TiltControl.prototype.start = function () {
    if (this._handler) return;
    var self = this;
    this._handler = function (e) { self._onEvent(e); };
    window.addEventListener('devicemotion', this._handler, true);
  };

  TiltControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    this.active = false;
  };

  // Gleiche Freigabe/Verfügbarkeit wie OrientationControl (beide = devicemotion)
  TiltControl.requestPermission = OrientationControl.requestPermission;
  TiltControl.isAvailable = OrientationControl.isAvailable;

  window.TiltControl = TiltControl;
})();
