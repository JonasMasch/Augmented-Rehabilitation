/* ============================================================
   Stabilisierte Geräte-Ausrichtung (gimbal-lock-frei) + 1€-Filter
   Wiederverwendbar für Suchen / Verfolgen.

   Liefert geglättete, kalibrierte Werte:
     yaw   = horizontales Schwenken (Grad, relativ zum Nullpunkt)
     pitch = vertikales Neigen      (Grad, relativ zum Nullpunkt)

   Statt der rohen Euler-Winkel (alpha/beta/gamma), die bei senkrechter
   Haltung "kippen" (Gimbal-Lock), wird die Blickrichtung der Geräte-
   Rückseite aus der Rotationsmatrix berechnet — dort gibt es bei
   aufrechter Haltung keine Singularität. Das Rauschen glättet ein
   1€-Filter (ruhig im Stillstand, reaktionsschnell bei Bewegung);
   bei steiler Neigung (wo Yaw unzuverlässig wird) wird stärker geglättet.
   ============================================================ */
(function () {
  'use strict';
  var D2R = Math.PI / 180;

  // --- 1€-Filter (One-Euro) ---
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

  function wrap180(d) { return ((d + 540) % 360) - 180; }

  // alpha/beta/gamma (Grad) -> Blickrichtung der Rückseite -> {yaw, pitch, h}
  // h = waagerechte Stärke (1 = aufrecht/zuverlässig, ~0 = steil/unsicher)
  function computeAim(alpha, beta, gamma) {
    if (alpha == null || beta == null || gamma == null) return null;
    var a = alpha * D2R, b = beta * D2R, g = gamma * D2R;
    var cA = Math.cos(a), sA = Math.sin(a);
    var cB = Math.cos(b), sB = Math.sin(b);
    var cG = Math.cos(g), sG = Math.sin(g);
    var vx = -(cA * sG + cG * sA * sB);
    var vy = -(sA * sG - cA * cG * sB);
    var vz = -(cB * cG);
    return {
      yaw: Math.atan2(vx, vy) / D2R,
      pitch: Math.asin(Math.max(-1, Math.min(1, vz))) / D2R,
      h: Math.sqrt(vx * vx + vy * vy)
    };
  }

  // --- Controller ---
  function OrientationControl(opts) {
    opts = opts || {};
    this.euroYaw = new OneEuro(0.35, 0.03);
    this.euroPitch = new OneEuro(0.35, 0.03);
    this.contYaw = null; this.prevRawDYaw = null;
    this.zeroYaw = 0; this.zeroPitch = 0; this.needsZero = true;
    this.yaw = 0; this.pitch = 0;
    this.active = false;
    this.onUpdate = opts.onUpdate || null;
    this._handler = null;
  }

  // Nullpunkt neu setzen: nächste Sensor-Lesung wird zur "Mitte".
  OrientationControl.prototype.calibrate = function () { this.needsZero = true; };

  OrientationControl.prototype._onEvent = function (e) {
    var aim = computeAim(e.alpha, e.beta, e.gamma);
    if (!aim) return;
    this.active = true;

    if (this.needsZero) {
      this.zeroYaw = aim.yaw; this.zeroPitch = aim.pitch;
      this.euroYaw.reset(); this.euroPitch.reset();
      this.contYaw = null; this.prevRawDYaw = null;
      this.needsZero = false;
    }

    var dYaw = wrap180(aim.yaw - this.zeroYaw);
    var dPitch = aim.pitch - this.zeroPitch;
    // Yaw "entwickeln" (unwrap), damit der Filter nicht über ±180° springt
    if (this.prevRawDYaw === null) { this.contYaw = dYaw; }
    else { this.contYaw += wrap180(dYaw - this.prevRawDYaw); }
    this.prevRawDYaw = dYaw;

    var t = performance.now();
    // bei steiler Neigung (h klein) stärker glätten, dort rauscht Yaw
    var weight = Math.max(0, Math.min(1, (aim.h - 0.3) / 0.6));
    this.euroYaw.minCutoff = 0.04 + 0.31 * weight * weight;

    this.yaw = this.euroYaw.filter(this.contYaw, t);
    this.pitch = this.euroPitch.filter(dPitch, t);

    if (this.onUpdate) this.onUpdate(this.yaw, this.pitch);
  };

  OrientationControl.prototype.start = function () {
    if (this._handler) return;
    var self = this;
    this._handler = function (e) { self._onEvent(e); };
    window.addEventListener('deviceorientation', this._handler, true);
  };

  OrientationControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('deviceorientation', this._handler, true); this._handler = null; }
    this.active = false;
  };

  // Permission (iOS 13+) anfragen. Gibt Promise<boolean> zurück.
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
    return Promise.resolve(typeof window.DeviceOrientationEvent !== 'undefined');
  };

  OrientationControl.isAvailable = function () {
    return typeof window.DeviceOrientationEvent !== 'undefined';
  };

  window.OrientationControl = OrientationControl;
})();
