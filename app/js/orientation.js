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
    // In Ruhe kräftig glätten (Handzittern), bei Bewegung schnell folgen (beta-Term).
    this.euroYaw = new OneEuro(1.0, 0.05);
    this.euroPitch = new OneEuro(0.6, 0.015);
    this.yawAngle = 0;          // integrierter Gier-Winkel (Grad)
    this.zeroPitch = 0;
    this.needsZero = true;
    this.lastT = null;
    this.gEst = null;           // Schwerkraft-Schätzung (Komplementär-Filter, s. _onEvent)
    this._n = 0;                // Event-Zähler (Warm-up der Schätzung)
    this._zeroSum = 0; this._zeroCnt = 0;   // Mittelung für den Nullpunkt
    this.yaw = 0; this.pitch = 0;
    this.active = false;
    this.onUpdate = opts.onUpdate || null;
    this._handler = null;
  }

  // Zeitkonstante (Sekunden), mit der die Schwerkraft-Schätzung zur Accelerometer-
  // Messung gezogen wird. Die schnellen Anteile kommen aus dem Gyro (Mitdrehen),
  // daher darf die Korrektur langsam sein — Bewegungs-Beschleunigung bleibt draußen.
  var GRAV_TAU = 0.5;
  var DEG2RAD = Math.PI / 180;

  // Nullpunkt neu setzen: die nächsten ~0,4 s ruhiger Haltung werden gemittelt
  // und zur "Mitte". Steuerung geht solange auf neutral.
  OrientationControl.prototype.calibrate = function () {
    this.needsZero = true;
    this._zeroSum = 0; this._zeroCnt = 0;
    this.yaw = 0; this.pitch = 0;
    if (this.onUpdate) this.onUpdate(0, 0);
  };

  OrientationControl.prototype._onEvent = function (e) {
    var rr = e.rotationRate;
    var g = e.accelerationIncludingGravity;
    if (!rr || !g || g.x == null || rr.alpha == null) return;
    this.active = true;

    var now = performance.now();
    if (this.lastT === null) { this.lastT = now; return; }
    var dt = (now - this.lastT) / 1000; this.lastT = now;
    if (dt <= 0) dt = 1 / 60; if (dt > 0.1) dt = 0.1;  // Ausreißer (Tab-Wechsel) begrenzen

    // Winkelgeschwindigkeit (Grad/s) um Geräte-Achsen x,y,z = beta,gamma,alpha.
    var wx = rr.beta || 0, wy = rr.gamma || 0, wz = rr.alpha || 0;

    // --- Schwerkraft-Schätzung: KOMPLEMENTÄR-FILTER ---
    // Die Schätzung wird mit dem Gyro MITGEDREHT (dg/dt = -ω×g) und nur langsam
    // zur Accelerometer-Messung gezogen. So bleibt sie bei Drehungen aktuell
    // (ein reiner Tiefpass hinkte hinterher — dadurch streute Hoch-/Runterneigen
    // in den Gier-Winkel ein) und Bewegungs-Beschleunigung/Zittern bleibt draußen.
    if (!this.gEst) this.gEst = { x: g.x, y: g.y, z: g.z || 0 };
    var ge = this.gEst;
    var wxr = wx * DEG2RAD, wyr = wy * DEG2RAD, wzr = wz * DEG2RAD;
    var cxv = wyr * ge.z - wzr * ge.y;   // ω × g
    var cyv = wzr * ge.x - wxr * ge.z;
    var czv = wxr * ge.y - wyr * ge.x;
    ge.x -= cxv * dt; ge.y -= cyv * dt; ge.z -= czv * dt;
    // Warm-up: die ersten ~0,5 s schnell zur Messung ziehen (der Startwert ist
    // eine einzelne, evtl. verzitterte Lesung), danach langsame Korrektur.
    this._n++;
    var tau = this._n < 30 ? 0.1 : GRAV_TAU;
    var k = 1 - Math.exp(-dt / tau);
    ge.x += k * (g.x - ge.x);
    ge.y += k * (g.y - ge.y);
    ge.z += k * ((g.z || 0) - ge.z);

    var gx = ge.x, gy = ge.y, gz = ge.z;
    var gn = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    gx /= gn; gy /= gn; gz /= gn;

    // Gier-Rate = Drehung um die Welt-Vertikale = Projektion von ω auf die Schwerkraft.
    var yawRate = wx * gx + wy * gy + wz * gz;
    this.yawAngle += yawRate * dt;

    // Pitch (hoch/runter) absolut aus der Schwerkraft (kein Drift)
    var pitchAbs = Math.atan2(-gz, Math.sqrt(gx * gx + gy * gy)) * 180 / Math.PI;

    // Nullpunkt: erst ein paar Frames Warm-up, dann ~0,4 s MITTELN — aber nur,
    // solange das Gerät RUHIG gehalten wird. Wer die Seite hochkant öffnet und
    // dann ins Querformat dreht, bekommt den Nullpunkt sonst mitten in der
    // Drehbewegung gesetzt (= verschobenes Zentrum, "Steuerung kaputt").
    if (this.needsZero) {
      var wMag = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (wMag > 20) {
        this._zeroSum = 0; this._zeroCnt = 0;   // Gerät bewegt sich noch — neu ansetzen
      } else if (this._n >= 8) {
        this._zeroSum += pitchAbs; this._zeroCnt++;
        if (this._zeroCnt >= 24) {
          this.zeroPitch = this._zeroSum / this._zeroCnt;
          this.yawAngle = 0;
          this.euroYaw.reset(); this.euroPitch.reset();
          this.needsZero = false;
        }
      }
      return;   // bis der Nullpunkt steht, keine Steuerwerte melden
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
    // Hoch-/Querformat-Wechsel: Nullpunkt neu ansetzen (die Ruhe-Erkennung in
    // _onEvent wartet dabei automatisch, bis die Drehbewegung beendet ist).
    this._orientHandler = function () { self.calibrate(); };
    window.addEventListener('orientationchange', this._orientHandler);
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', this._orientHandler);
    }
  };

  OrientationControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    if (this._orientHandler) {
      window.removeEventListener('orientationchange', this._orientHandler);
      if (screen.orientation && screen.orientation.removeEventListener) {
        screen.orientation.removeEventListener('change', this._orientHandler);
      }
      this._orientHandler = null;
    }
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
    this._zeroSumX = 0; this._zeroSumY = 0; this._zeroCnt = 0;
    this.tiltX = 0; this.tiltY = 0;
    this.active = false;
    this.onUpdate = opts.onUpdate || null;
    this._handler = null;
  }

  // Nullpunkt neu setzen: die nächsten ~0,4 s ruhiger Haltung werden gemittelt,
  // die aktuelle Haltung wird "flach". Steuerung geht solange auf neutral.
  TiltControl.prototype.calibrate = function () {
    this.needsZero = true;
    this._zeroSumX = 0; this._zeroSumY = 0; this._zeroCnt = 0;
    this.tiltX = 0; this.tiltY = 0;
    if (this.onUpdate) this.onUpdate(0, 0);
  };

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

    // Nullpunkt: ~0,4 s mitteln, aber nur solange das Gerät ruhig gehalten
    // wird (sonst wird z. B. die Hochkant->Querformat-Drehung zur "Mitte").
    if (this.needsZero) {
      var rr = e.rotationRate;
      var wMag = (rr && rr.alpha != null)
        ? Math.sqrt(rr.alpha * rr.alpha + (rr.beta || 0) * (rr.beta || 0) + (rr.gamma || 0) * (rr.gamma || 0))
        : 0;
      if (wMag > 20) {
        this._zeroSumX = 0; this._zeroSumY = 0; this._zeroCnt = 0;   // bewegt sich noch
      } else {
        this._zeroSumX += sx; this._zeroSumY += sy; this._zeroCnt++;
        if (this._zeroCnt >= 24) {
          this.zeroX = this._zeroSumX / this._zeroCnt;
          this.zeroY = this._zeroSumY / this._zeroCnt;
          this.euroX.reset(); this.euroY.reset();
          this.needsZero = false;
        }
      }
      return;   // bis der Nullpunkt steht, keine Steuerwerte melden
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
    // Hoch-/Querformat-Wechsel: Achsen-Zuordnung ändert sich -> neu kalibrieren
    this._orientHandler = function () { self.calibrate(); };
    window.addEventListener('orientationchange', this._orientHandler);
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', this._orientHandler);
    }
  };

  TiltControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    if (this._orientHandler) {
      window.removeEventListener('orientationchange', this._orientHandler);
      if (screen.orientation && screen.orientation.removeEventListener) {
        screen.orientation.removeEventListener('change', this._orientHandler);
      }
      this._orientHandler = null;
    }
    this.active = false;
  };

  // Gleiche Freigabe/Verfügbarkeit wie OrientationControl (beide = devicemotion)
  TiltControl.requestPermission = OrientationControl.requestPermission;
  TiltControl.isAvailable = OrientationControl.isAvailable;

  window.TiltControl = TiltControl;
})();
