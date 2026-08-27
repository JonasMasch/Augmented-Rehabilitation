/* ============================================================
   Bewegungssteuerung — gyroskop-basiert, OHNE Magnetometer/Kompass.

   Liefert geglättete, kalibrierte Werte:
     yaw   = horizontales Schwenken (Grad, relativ zum Nullpunkt)
     pitch = vertikales Neigen      (Grad, relativ zum Nullpunkt)
     tilt  = Neigung als Rollrichtung einer Kugel (TiltControl, s. unten)

   Warum so: Die Geräte-Ausrichtung (deviceorientation/alpha) enthält den
   KOMPASS (Magnetometer) — der rauscht stark und umgebungsabhängig ("mal
   perfekt, mal zappelig"). Deshalb hier:
   - Horizontal (yaw): Drehrate des GYROSKOPS auf die Welt-Vertikale projiziert
     und aufintegriert → sehr ruhig, kein Kompass. (Leichte Langzeit-Drift, daher
     bei jedem Level neu kalibrieren.)
   - Vertikal (pitch): aus dem SCHWERKRAFT-Vektor (absolut, kein Drift, ruhig).
   Beides aus dem devicemotion-Event (rotationRate + accelerationIncludingGravity).

   --- Konventionen, gegen die hier gerechnet wird (Stand August 2026) ---

   Geräte-Achsen (W3C DeviceOrientation, "device coordinate system"):
     x = nach rechts, y = zur Oberkante, z = aus dem Bildschirm heraus.
     Die Achsen drehen sich NICHT mit dem Bildschirm mit.

   rotationRate: alpha/beta/gamma sind die Drehraten um x/y/z — NICHT um
     z/x/y. Das ist keine Verwechslung, sondern der tatsächliche Stand: alle
     Engines haben es so implementiert, und die Spezifikation wurde 2019 an
     die Implementierungen angepasst (w3c/deviceorientation PR #43, Issue #44).
     Nachgeprüft in Chromium (device_motion_event_pump.cc: Create(gyro.x,
     gyro.y, gyro.z)) und WebKit (DeviceMotionClientIOS.mm). Einheit: Grad/s,
     Rechte-Hand-Regel.

   accelerationIncludingGravity: die Spezifikation verlangt die "proper
     acceleration" — ein flach liegendes Gerät meldet {0, 0, +9.81}, der
     Vektor zeigt also nach OBEN. Android hält sich daran, iOS liefert ihn
     mit umgekehrtem Vorzeichen. Statt das an der Plattform festzumachen,
     wird es unten gemessen (SensorConvention).

   Bildschirm-Achsen: Die Umrechnung Geräte -> Bildschirm über
     screen.orientation.angle folgt der Referenz aus Chromium
     (SensorReadingRemapper::RemapSensorReadingXYZ).
   ============================================================ */
(function () {
  'use strict';

  var DEG2RAD = Math.PI / 180;

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

  /* ============================================================
     SensorConvention — in welche Richtung zeigt accelerationIncludingGravity?

     Die Spezifikation sagt: nach oben (flaches Gerät = +9.81 auf z). Android
     hält sich daran, iOS dreht das Vorzeichen um. Früher stand dieses
     Vorzeichen als Konstante im Spielcode und musste pro Testgerät neu
     erraten werden — mit dem Ergebnis, dass ein Gerät richtig und das nächste
     spiegelverkehrt lief.

     Hier wird es stattdessen GEMESSEN: Das deviceorientation-Event liefert
     beta/gamma, aus denen sich der Welt-Oben-Vektor im Geräte-Frame eindeutig
     berechnen lässt (Z-X'-Y''-Zerlegung der Spezifikation). Zeigt der
     gemessene Beschleunigungsvektor in dieselbe Richtung, gilt die
     Spezifikations-Konvention (+1), sonst die umgekehrte (-1). beta/gamma
     beziehen sich immer auf die Schwerkraft und sind plattformübergreifend
     gleich definiert — der Kompass (alpha) wird dafür nicht gebraucht.
     ============================================================ */
  var SensorConvention = (function () {
    var MAX_AGE_MS = 250;        // wie frisch die Referenz sein muss
    var MIN_VOTES = 12;          // so viele eindeutige Messungen entscheiden
    var sign = fallbackSign();
    var settled = false;
    var votes = 0;
    var refUp = null, refT = -1e9;
    var users = 0, listening = false;
    var handlers = [];

    /* Startwert, bis die erste Messung vorliegt. Nur eine Vermutung — sie wird
       überstimmt, sobald deviceorientation-Daten vorliegen.

       Nicht über DeviceMotionEvent.requestPermission entscheiden: Chromium hat
       diese API inzwischen ebenfalls (sie fragt dort nichts, sondern meldet nur
       den eingestellten Zustand), sie ist also längst kein iOS-Merkmal mehr.
       Stattdessen die Plattform — iPadOS meldet sich seit Version 13 als
       "MacIntel", daher zusätzlich die Touch-Punkte prüfen. */
    function fallbackSign() {
      var nav = (typeof navigator !== 'undefined') ? navigator : null;
      if (!nav) return 1;
      var ua = nav.userAgent || '';
      var isIOS = /iPad|iPhone|iPod/.test(ua) ||
                  (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
      return isIOS ? -1 : 1;
    }

    function onOrientation(e) {
      if (!e || e.beta == null || e.gamma == null) return;
      var b = e.beta * DEG2RAD, g = e.gamma * DEG2RAD;
      var cb = Math.cos(b);
      refUp = { x: -cb * Math.sin(g), y: Math.sin(b), z: cb * Math.cos(g) };
      refT = performance.now();
    }

    // Wird von jedem devicemotion-Event mit dem Rohvektor gefüttert.
    function observe(a, now) {
      if (settled || !a || a.x == null) return;
      if (!refUp || now - refT > MAX_AGE_MS) return;
      var x = a.x, y = a.y, z = a.z || 0;
      var n = Math.sqrt(x * x + y * y + z * z);
      // Nur ruhige Messungen: bei kräftiger Bewegung ist der Betrag nicht 1 g,
      // dann steckt zu viel Bewegungsbeschleunigung im Vektor.
      if (n < 7 || n > 12) return;
      var dot = (x * refUp.x + y * refUp.y + z * refUp.z) / n;
      if (Math.abs(dot) < 0.8) return;    // nicht eindeutig genug
      votes += dot > 0 ? 1 : -1;
      if (Math.abs(votes) >= MIN_VOTES) {
        settled = true;
        setSign(votes > 0 ? 1 : -1);
      }
    }

    function setSign(s) {
      if (s === sign) return;
      sign = s;
      // Alle laufenden Steuerungen neu einnorden: Nullpunkte, die mit dem
      // falschen Vorzeichen gesetzt wurden, sind jetzt ungültig.
      handlers.slice().forEach(function (fn) { fn(s); });
    }

    function retain() {
      users++;
      if (!listening) {
        window.addEventListener('deviceorientation', onOrientation, true);
        listening = true;
      }
    }
    function release() {
      users = Math.max(0, users - 1);
      if (users === 0 && listening) {
        window.removeEventListener('deviceorientation', onOrientation, true);
        listening = false;
      }
    }

    return {
      gravitySign: function () { return sign; },
      isSettled: function () { return settled; },
      observe: observe,
      retain: retain,
      release: release,
      onChange: function (fn) { handlers.push(fn); },
      offChange: function (fn) {
        var i = handlers.indexOf(fn); if (i >= 0) handlers.splice(i, 1);
      },
      // Nur für die Diagnose-Seite: Zwischenstand sichtbar machen.
      debugState: function () {
        return { sign: sign, settled: settled, votes: votes, hasReference: !!refUp };
      }
    };
  })();

  /* Rohen Beschleunigungsvektor in die Spezifikations-Konvention bringen:
     das Ergebnis zeigt immer nach OBEN (flaches Gerät = {0,0,+9.81}). */
  function canonicalUp(a) {
    var s = SensorConvention.gravitySign();
    return { x: s * a.x, y: s * a.y, z: s * (a.z || 0) };
  }

  /* Drehraten aus dem Event in Geräte-Achsen (Grad/s).
     alpha/beta/gamma = Drehrate um x/y/z (siehe Kopfkommentar).
     Gibt null zurück, wenn kein Gyroskop Daten liefert. */
  function rotationAxes(rr) {
    if (!rr) return null;
    if (rr.alpha == null && rr.beta == null && rr.gamma == null) return null;
    var wx = rr.alpha, wy = rr.beta, wz = rr.gamma;
    if (typeof wx !== 'number' || !isFinite(wx)) wx = 0;
    if (typeof wy !== 'number' || !isFinite(wy)) wy = 0;
    if (typeof wz !== 'number' || !isFinite(wz)) wz = 0;
    return { x: wx, y: wy, z: wz };
  }

  /* Geräte- in Bildschirm-Achsen drehen. Referenz: Chromium
     SensorReadingRemapper::RemapSensorReadingXYZ.
     Ergebnis: right = Anteil nach Bildschirm-rechts, down = nach unten. */
  function toScreenAxes(vx, vy) {
    var ang = (typeof screen !== 'undefined' && screen.orientation &&
               typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle : (window.orientation || 0);
    var rad = ang * DEG2RAD;
    var c = Math.cos(rad), s = Math.sin(rad);
    return { right: vx * c + vy * s, down: -(vy * c - vx * s) };
  }

  // Hoch-/Querformat-Wechsel und Vorzeichen-Korrektur an eine Steuerung binden.
  function attachEnvironmentHandlers(ctrl) {
    ctrl._orientHandler = function () { ctrl.calibrate(); };
    window.addEventListener('orientationchange', ctrl._orientHandler);
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', ctrl._orientHandler);
    }
    /* Kippt die gemessene Schwerkraft-Konvention, sind alle daraus abgeleiteten
       Zwischenstände ungültig — nicht nur der Nullpunkt, sondern auch die
       laufende Schwerkraft-Schätzung. Sie würde sonst über Sekunden vom alten
       zum neuen Vorzeichen kriechen und dabei falsche Winkel liefern. */
    ctrl._signHandler = function () {
      if (ctrl.resetEstimation) ctrl.resetEstimation();
      ctrl.calibrate();
    };
    SensorConvention.onChange(ctrl._signHandler);
    SensorConvention.retain();
  }

  function detachEnvironmentHandlers(ctrl) {
    if (ctrl._orientHandler) {
      window.removeEventListener('orientationchange', ctrl._orientHandler);
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.removeEventListener) {
        screen.orientation.removeEventListener('change', ctrl._orientHandler);
      }
      ctrl._orientHandler = null;
    }
    if (ctrl._signHandler) {
      SensorConvention.offChange(ctrl._signHandler);
      ctrl._signHandler = null;
      SensorConvention.release();
    }
  }

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
    this.gyroAvailable = null;  // null = noch unklar, dann true/false
    this._noGyroEvents = 0;
    this._reported = false;
    this.onUpdate = opts.onUpdate || null;
    this.onUnavailable = opts.onUnavailable || null;
    this._handler = null;
  }

  // Zeitkonstante (Sekunden), mit der die Schwerkraft-Schätzung zur Accelerometer-
  // Messung gezogen wird. Die schnellen Anteile kommen aus dem Gyro (Mitdrehen),
  // daher darf die Korrektur langsam sein — Bewegungs-Beschleunigung bleibt draußen.
  var GRAV_TAU = 0.5;
  // So viele Events ohne Gyroskop-Daten gelten als "Gerät hat kein Gyroskop".
  var NO_GYRO_LIMIT = 30;

  // Nullpunkt neu setzen: die nächsten ~0,4 s ruhiger Haltung werden gemittelt
  // und zur "Mitte". Steuerung geht solange auf neutral.
  // Schwerkraft-Schätzung verwerfen und wieder mit dem schnellen Warm-up
  // beginnen (siehe attachEnvironmentHandlers).
  OrientationControl.prototype.resetEstimation = function () {
    this.gEst = null;
    this._n = 0;
    this.lastT = null;
    this.yawAngle = 0;
  };

  OrientationControl.prototype.calibrate = function () {
    this.needsZero = true;
    this._zeroSum = 0; this._zeroCnt = 0;
    this.yaw = 0; this.pitch = 0;
    if (this.onUpdate) this.onUpdate(0, 0);
  };

  OrientationControl.prototype._onEvent = function (e) {
    var a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;

    var now = performance.now();
    SensorConvention.observe(a, now);

    /* Ohne Gyroskop lässt sich das Schwenken nicht kompassfrei bestimmen.
       Das kommt auf günstigen Android-Tablets tatsächlich vor. Früher hat der
       Code in diesem Fall stillschweigend gar nichts getan, während die
       Oberfläche "Sensor aktiviert" meldete. Jetzt wird es einmal gemeldet,
       damit die Seite auf Touch-Steuerung umschalten kann. */
    var w = rotationAxes(e.rotationRate);
    if (!w) {
      if (this.gyroAvailable !== true && ++this._noGyroEvents >= NO_GYRO_LIMIT) {
        this.gyroAvailable = false;
        if (!this._reported && this.onUnavailable) {
          this._reported = true;
          this.onUnavailable('no-gyroscope');
        }
      }
      return;
    }
    this.gyroAvailable = true;
    this.active = true;

    if (this.lastT === null) { this.lastT = now; return; }
    var dt = (now - this.lastT) / 1000; this.lastT = now;
    if (dt <= 0) dt = 1 / 60; if (dt > 0.1) dt = 0.1;  // Ausreißer (Tab-Wechsel) begrenzen

    // Winkelgeschwindigkeit (Grad/s) um die Geräte-Achsen x, y, z.
    var wx = w.x, wy = w.y, wz = w.z;

    // Beschleunigung in der Spezifikations-Konvention (Vektor zeigt nach oben).
    var g = canonicalUp(a);

    // --- Schwerkraft-Schätzung: KOMPLEMENTÄR-FILTER ---
    // Die Schätzung wird mit dem Gyro MITGEDREHT (dg/dt = -ω×g) und nur langsam
    // zur Accelerometer-Messung gezogen. So bleibt sie bei Drehungen aktuell
    // (ein reiner Tiefpass hinkte hinterher — dadurch streute Hoch-/Runterneigen
    // in den Gier-Winkel ein) und Bewegungs-Beschleunigung/Zittern bleibt draußen.
    if (!this.gEst) this.gEst = { x: g.x, y: g.y, z: g.z };
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
    ge.z += k * (g.z - ge.z);

    var gx = ge.x, gy = ge.y, gz = ge.z;
    var gn = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    gx /= gn; gy /= gn; gz /= gn;

    // Gier-Rate = Drehung um die Welt-Vertikale = Projektion von ω auf die
    // Schwerkraft. Positiv = Drehung nach links (Rechte-Hand-Regel um "oben").
    var yawRate = wx * gx + wy * gy + wz * gz;
    this.yawAngle += yawRate * dt;

    // Pitch (hoch/runter) absolut aus der Schwerkraft (kein Drift).
    // Positiv = das Gerät blickt nach oben.
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
    attachEnvironmentHandlers(this);
  };

  OrientationControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    detachEnvironmentHandlers(this);
    this.active = false;
  };

  // Permission (iOS 13+) anfragen — Orientation UND Motion. Gibt Promise<boolean>.
  // Beides wird gebraucht: Motion für die Steuerung, Orientation als Referenz
  // für die Vorzeichen-Messung in SensorConvention.
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
  window.SensorConvention = SensorConvention;

  /* ============================================================
     Neige-Steuerung (für Lenken): Gerät wird flach gehalten,
     Neigen kippt die "Murmel-Ebene".

     Liefert tiltX/tiltY = Richtung, in die eine Kugel auf dem Bildschirm
     rollen würde (x = nach rechts, y = nach unten), in g-Einheiten und
     relativ zum Nullpunkt (calibrate = aktuelle Haltung ist "flach").
     Wird die rechte Bildschirmseite angehoben, ist tiltX negativ — die Kugel
     rollt bergab nach links. Die Bildschirm-Drehung (Hoch-/Querformat) ist
     herausgerechnet, ebenso der Plattform-Unterschied beim Vorzeichen der
     Schwerkraft. Skalierung und Totzone übernimmt das Spiel.
     ============================================================ */
  function TiltControl(opts) {
    opts = opts || {};
    // Neigen soll direkt reagieren -> nur leicht glätten (Handzittern raus)
    this.euroX = new OneEuro(1.2, 0.05);
    this.euroY = new OneEuro(1.2, 0.05);
    this.zeroX = 0; this.zeroY = 0;
    this.needsZero = true;
    this._zeroSumX = 0; this._zeroSumY = 0; this._zeroCnt = 0;
    this._prev = null;          // letzte Messung (Ruhe-Erkennung ohne Gyroskop)
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
    this._prev = null;
    this.tiltX = 0; this.tiltY = 0;
    if (this.onUpdate) this.onUpdate(0, 0);
  };

  TiltControl.prototype._onEvent = function (e) {
    var a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    this.active = true;
    var now = performance.now();
    SensorConvention.observe(a, now);

    // Schwerkraft normieren (Richtung reicht, Betrag egal) — in der
    // Spezifikations-Konvention, der Vektor zeigt also nach oben.
    var g = canonicalUp(a);
    var gn = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z) || 1;
    var screenAxes = toScreenAxes(g.x / gn, g.y / gn);

    // "Bergab" ist die Gegenrichtung des Oben-Vektors: wo der Bildschirm
    // angehoben ist, rollt die Kugel weg.
    var sx = -screenAxes.right;
    var sy = -screenAxes.down;

    // Nullpunkt: ~0,4 s mitteln, aber nur solange das Gerät ruhig gehalten
    // wird (sonst wird z. B. die Hochkant->Querformat-Drehung zur "Mitte").
    if (this.needsZero) {
      if (this._isMoving(e.rotationRate, sx, sy)) {
        this._zeroSumX = 0; this._zeroSumY = 0; this._zeroCnt = 0;
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

  /* Bewegt sich das Gerät gerade? Mit Gyroskop über die Drehrate; ohne
     Gyroskop (kommt auf günstigen Tablets vor) über die Änderung der
     gemessenen Neigung. */
  TiltControl.prototype._isMoving = function (rr, sx, sy) {
    var w = rotationAxes(rr);
    if (w) return Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z) > 20;
    var prev = this._prev;
    this._prev = { x: sx, y: sy };
    if (!prev) return true;    // erste Messung: noch keine Aussage möglich
    return Math.abs(sx - prev.x) > 0.02 || Math.abs(sy - prev.y) > 0.02;
  };

  TiltControl.prototype.start = function () {
    if (this._handler) return;
    var self = this;
    this._handler = function (e) { self._onEvent(e); };
    window.addEventListener('devicemotion', this._handler, true);
    attachEnvironmentHandlers(this);
  };

  TiltControl.prototype.stop = function () {
    if (this._handler) { window.removeEventListener('devicemotion', this._handler, true); this._handler = null; }
    detachEnvironmentHandlers(this);
    this.active = false;
  };

  // Gleiche Freigabe/Verfügbarkeit wie OrientationControl (beide = devicemotion)
  TiltControl.requestPermission = OrientationControl.requestPermission;
  TiltControl.isAvailable = OrientationControl.isAvailable;

  window.TiltControl = TiltControl;
})();
