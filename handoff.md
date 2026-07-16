# Handoff — Augmented Rehabilitation (NeuroAR Reha)

Übergabe-Dokument für die Weiterarbeit in einer neuen Session.
Stand: zuletzt bearbeitet Juli 2026 (Sensorik auf Gyroskop umgestellt + geführte Testversion angelegt).

---

## 1. Ziel des Projekts

Prototypische **AR-/Web-App zur Rehabilitation von Neglect** (einseitige
Aufmerksamkeitsstörung, meist nach Schlaganfall – betroffene Seite i. d. R. **links**).
Bachelorarbeit. Läuft rein im Browser auf **Tablet/Smartphone**, bevorzugt **Querformat**.
**Vanilla HTML/CSS/JS, keine Build-Tools, keine Dependencies**, Hosting über **GitHub Pages**.

**Konzept: 3 Spiele × je 3 Stufen**
- **Suchen** – Objekt durch Drehen des Geräts in die Mitte (Blatt/Zielkreis) bringen.
  1) Visuell (Marienkäfer → Blatt) · 2) Audio-visuell (Uhu → Astkreis) · 3) Sequenz (3 Käfer 1-2-3 → Blatt)
- **Verfolgen** – driftendes Objekt im mittigen Kreis halten (%-Auswertung).
  1) Visuell (Schmetterling → Blume) · 2) Audio (Uhu → Astkreis) · 3) Verschwinden (Objekt blinkt kurz weg)
- **Lenken** – Schnecke per Neigen (Touch-Drag) zum Salat rollen.
  1) Gerade · 2) Drei Salate (alle einsammeln, Reihenfolge egal, keine Hindernisse) · 3) Labyrinth (2 Hindernisse)

---

## 2. GitHub / Deployment  ⚠️ WICHTIG ZUERST LESEN

- **Repo:** `JonasMasch/Augmented-Rehabilitation` (public), Branch `main`. `gh` CLI ist als User **JonasMasch** eingeloggt → ich kann committen & pushen.
- **Live-URL (alte, freie Version):** https://jonasmasch.github.io/Augmented-Rehabilitation/
- **Live-URL (geführte Testversion):** https://jonasmasch.github.io/Augmented-Rehabilitation/test/
- **Routine-Update:** `git add -A && git commit -m "..." && git push origin main`, dann ~1 Min auf Pages-Build warten.
- **⚠️ HTTPS ist Pflicht:** DeviceMotion/DeviceOrientation liefern nur über die Pages-HTTPS-URL Events, nicht über `file://` oder LAN-`http://`. Deshalb wird jeder Stand zum Testen gepusht.
- **⚠️ Pages-Build hängt aktuell öfter** (mehrere Minuten „building" bei `duration:0`). Lösung: **leeren Commit pushen** (`git commit --allow-empty -m "..." && git push`) stößt einen frischen Build an und ersetzt den hängenden. GitHub-Status war dabei „operational" — es ist reine Infrastruktur-Verzögerung, kein Code-Fehler.
- **⚠️ Browser-Cache:** Pages setzt `max-age=600` (10 Min) auf HTML/CSS/JS. Nach einem Deploy sieht man am Handy oft noch die alte Version. Zuverlässig frisch: **privates Safari-Tab** oder iOS-Einstellungen → Safari → „Verlauf und Websitedaten löschen", oder ~10 Min warten. `?v=`-Anhängen an die HTML reicht oft NICHT (die referenzierte JS bleibt gecacht). → Idee für später: Versions-Query an die `<script>`/`<link>`-Einbindungen hängen und hochzählen.
- `.gitignore` schließt `.DS_Store` und `.claude/` aus. Das alte große `assets/Hintergrund.jpg` (1,7 MB) ist aus dem Deploy raus (nur noch lokal), verwendet wird `Hintergrund.jpeg` (90 KB).

---

## 3. Aktueller Stand des Codes

**Struktur (Projekt-Root = alte freie Version):**
```
index.html        Startseite (3 Spiel-Kacheln + Tages-Fortschrittsbalken, Profil-Button)
suchen.html / verfolgen.html / lenken.html   die 3 Spiele
profil.html / settings.html / ueber.html / datenschutz.html
css/   common.css + je Modul + erika/intro/profil/settings
js/    common, erika, intro, badges, session, settings(_page), suchen, verfolgen, lenken,
       orientation (NEU: Bewegungssteuerung)
assets/  SVGs + neue PNGs (schmetterling.png, blume.png) + Hintergrund.jpeg/.avif
test/  VOLLSTÄNDIGE KOPIE der App = geführte Testversion (siehe Abschnitt 5)
files/ ALTE Referenz-Backups
```

**Fertige Features (unverändert seit Vorgänger-Handoff):** Alle 3×3 Stufen spielbar; gemeinsames Menü;
Erika (Assistenzfigur + Pause-Menü); Profil; Medaillen (`badges.js`); Statistik (`session.js`,
localStorage `neuroar_stats`); Intro-/Erklär-Animationen (`intro.js`); Web-Audio (Stereo-Panning);
Einstellungen (gespeichert, aber von den Übungen noch NICHT ausgelesen, außer `sessionDuration`).

**In DIESER Session dazugekommen / geändert:**
- **Responsive gemacht:** Größen via `clamp()`, `.home` scrollbar (`overflow-y:auto` + `justify-content:safe center`), `#app` nutzt `100dvh` statt `100vh` (behebt „unterer Inhalt hinter Browserleiste"). **Wichtig:** Zeile 6 in `common.css` hatte `touch-action:none` auf ALLEN Elementen → blockierte Finger-Scrollen; jetzt via `.home/.profil/.settings * { touch-action:pan-y }` erlaubt. Erika (`.erika-fig`) responsiv (`clamp(110px, min(30vh,38vw), 360px)`), Übungs-Icon `.erika-ico` `clamp(76px,13vh,112px)`.
- **Foto-Hintergrund:** `#screen-level .cam-bg` = `assets/Hintergrund.jpeg` — NUR in den Übungs-Screens von Suchen & Verfolgen (in `suchen.css`/`verfolgen.css`). Stufen-Übersicht behält den grünen Verlauf (aus `common.css`).
- **Verfolgen Stufe 1:** Schmetterling/Blume als **PNG** (`schmetterling.png`/`blume.png`), Stufe 3 behält SVG. Gleiche Größe (CSS-fixiert), weiterhin `.outlined`-Rand.
- **Suchen** stark überarbeitet — siehe Abschnitt 4.
- **Bewegungssensorik neu gelöst** — siehe Abschnitt 4.
- **Geführte Testversion** unter `test/` — siehe Abschnitt 5.

---

## 4. Bewegungssensorik + Suchen (das große Thema dieser Session)

**Ausgangslage:** Sensorik war früher zurückgestellt (Gimbal-Lock, Zittern). In dieser Session gelöst und **in Suchen integriert** (Verfolgen/Lenken laufen weiter auf Touch-Drag).

**`js/orientation.js` (wiederverwendbares Modul `window.OrientationControl`):**
- **Gyroskop-basiert, OHNE Magnetometer/Kompass** (das war die Rausch-Ursache: „mal perfekt, mal zappelig" je nach magnetischer Umgebung).
- Horizontal (**yaw**) = Gyro-Drehrate (`rotationRate`) auf die Welt-Vertikale (Schwerkraft) projiziert und **integriert** → sehr ruhig; leichte Langzeit-Drift → pro Level neu kalibrieren.
- Vertikal (**pitch**) = aus **Schwerkraft** (`accelerationIncludingGravity`), absolut, kein Drift.
- Alles aus dem **`devicemotion`-Event**. Restglättung per 1€-Filter: `euroYaw = OneEuro(2.0, 0.02)`, `euroPitch = OneEuro(0.7, 0.01)`.
- API: `new OrientationControl({onUpdate:fn})`, `.start()`, `.stop()`, `.calibrate()`, statisch `OrientationControl.requestPermission()` (Promise<bool>), `.isAvailable()`.
- Historie (falls relevant): vorher Rotationsmatrix-Blickrichtung aus alpha/beta/gamma + neigungs-adaptiver 1€-Filter — war gimbal-frei, hing aber am Magnetometer. Deshalb auf reines Gyro umgestellt.

**`js/suchen.js` — Steuerung & Darstellung:**
- Nutzt `OrientationControl`: `onOrientUpdate(yaw,pitch)` → `currentAlpha`/`currentBeta` → `render()`. `orient.calibrate()` bei jedem Level-Start (aktuelle Haltung = Mitte). Touch-Drag bleibt Desktop-Fallback (greift solange `orientationActive` false).
- **Tuning-Konstanten oben in der Datei:** `SENSOR_GAIN = 2.0` (Verstärkung, damit kleine Bewegungen sichtbar gleiten), `SIGN_YAW = 1`, `SIGN_PITCH = 1` (bei vertauschter Richtung umstellen), `DEBUG_SENSOR = true` (temporäre Live-Anzeige unten links α/β/sensor — **noch auf true, vor Release auf false**).
- **AR-Logik:** Objekt liegt fest im Raum: `x = cx + (o.angle - currentAlpha)*scaleX`, `y = cy + (currentBeta - o.vAngle)*scaleY`. Schwenken bewegt die Sicht, nicht das Objekt.
- **Objekte nahe der Mittellinie:** `randVAngle()` ±5, `pickThreeVAngles()` ±6 → vertikaler Versatz < Treffer-Radius, damit reines Drehen (links/rechts) direkt ins Ziel führt.
- **Performance-Fix (war der Grund für „Objekt springt statt zu gleiten"):** Objekte per `transform:translate` statt `left/top` (GPU) UND leichter CSS-Rand `.lite-outline` (`drop-shadow(0 0 3px #fff)` ×2) statt des teuren SVG-Filters `.outlined` (der bei jeder Bewegung neu gerendert wurde). Gilt für Suchobjekte + Blatt/Astkreis.
- **Objekte 20 % größer:** `size:92` (vorher 77). Weißer Rand kräftiger (`.lite-outline` 3px).
- **Kein gestrichelter Zielring, kein Richtungspfeil** mehr (das Blatt markiert das Ziel, die **Blattspitze zeigt die Richtung**). `.center-zone`/`.arrow-svg` in `suchen.css` entsprechend deaktiviert.
- **Blattspitze stabilisiert:** zeigt zum aktiven Ziel; nahe der Mitte (`dist<50`) eingefroren, Winkel „entwickelt" (kein 360°-Sprung), zusätzlich geglättet (`leafAngle += 0.18*(raw-leafAngle)`).

**Am Gerät bestätigt:** Events kommen an, Sensor AKTIV, α ändert sich flüssig. **Noch NICHT final bestätigt:** ob Zittern nach der Gyro-Umstellung ganz weg ist, ob Richtung `SIGN_YAW`/`SIGN_PITCH` stimmt, ob Gyro-Drift auffällt. (Letzter Nutzer-Test stand noch aus.)

---

## 5. Geführte Testversion (`test/`)

Vollständige **Kopie** der App unter `test/` (eigene assets/css/js/html — isoliert; teilt aber
`localStorage` mit dem Root, gleiche Origin). Alte Version im Root bleibt unangetastet.

Neuer Ablauf: **ein „Spiel starten"-Button** → direkt Übung 1; **„Weiter"** führt linear durch
alle 9 Übungen (Suchen 1-3 → Verfolgen 1-3 → Lenken 1-3), NICHT dieselbe nochmal.

- `test/index.html`: Startseite mit einem Button `#startBtn`. Klick holt Sensor-Freigabe (`OrientationControl.requestPermission`) und geht zu `suchen.html?flow=0`.
- `test/js/flow.js` (NEU): aktiv bei `?flow=<n>` (globaler Schritt 0..8). Überschreibt global `onNext` (= nächste Übung) und `goHome` (= zur Startseite), startet beim Laden `beginStage(stage)` + `startSensor()` (letzteres nur in Suchen vorhanden). Eingebunden NACH dem Modul-JS in `test/{suchen,verfolgen,lenken}.html`. „Nochmal"-Buttons dort → „Weiter".
- Logik mit gemockter Browser-Umgebung getestet (Übergänge korrekt), alle JS syntaxgeprüft (via `jsc`).

---

## 6. OFFENE PUNKTE / nächste Schritte (hier weitermachen)

**Vom Nutzer zuletzt gewünscht (zuerst angehen):**
1. **Aufblitzen beheben:** In der geführten Version blitzt beim Klick auf „Spiel starten" kurz der alte Auswahl-/Home-Screen von `suchen.html` auf, bevor die Übung startet. → In `flow.js`/den Testseiten den `#screen-home` im Flow-Modus sofort ausblenden (z. B. CSS `#screen-home{display:none}` wenn `?flow` gesetzt, oder direkt zum Level-Screen schalten, bevor gerendert wird).
2. **„Bewegungssteuerung aktivieren"-Button auf die Startseite** legen — unter den Tages-Trainingszeit-Balken (`.daily`). Aktuell wird die Sensor-Freigabe implizit über „Spiel starten" geholt; der Nutzer will erstmal einen expliziten Aktivieren-Button auf der Startseite. (Betrifft mindestens die Testversion `test/index.html`; ggf. auch die Haupt-`index.html`.) Hängt zusammen mit der Frage, ob iOS die DeviceMotion-Freigabe über den Seitenwechsel behält.

**Sensorik noch zu verifizieren/erledigen:**
3. Am Gerät prüfen: Zittern nach Gyro-Umstellung weg? Richtung `SIGN_YAW`/`SIGN_PITCH` korrekt (linkes Objekt bei Linksdrehung in die Mitte)? Gyro-Drift (Objekt kriecht bei Stillstand)? → ggf. Vorzeichen flippen / Drift-Korrektur.
4. **`DEBUG_SENSOR` in `suchen.js` auf `false`** setzen (temporäre Live-Anzeige unten links), wenn die Steuerung passt.
5. Funktioniert im Flow-Modus (Auswahl übersprungen) die Sensor-Freigabe in Suchen zuverlässig, oder braucht es den Aktivieren-Button aus Punkt 2? (Sensor nur in Suchen; Verfolgen/Lenken = Touch.)
6. **Sensorik ist jetzt in allen 3 Spielen** (Touch bleibt Fallback, solange keine Sensorwerte kommen). Nach zwei Geräte-Tests (Juli 2026) justiert: **Vorzeichen am Gerät bestätigt** — Suchen `SIGN_YAW/PITCH = +1`, Verfolgen `SIGN_YAW = +1`/`SIGN_PITCH = -1`, Lenken `SIGN_TILT_X/Y = -1` (die Tilt-Achsen sind invertiert, die Gyro-/Pitch-Pfade NICHT — nicht nochmal pauschal „umdrehen"!). Außerdem: **Komplementär-Filter** für die Schwerkraft-Schätzung in `orientation.js` (mit Gyro mitgedreht + langsam zur Messung gezogen; ein reiner Tiefpass ließ Neigen in den Gier-Winkel einstreuen), `TILT_GAIN` 2.8 → 1.7 (war zu empfindlich), und **Kalibrierung bewegungs-gated**: Nullpunkt wird nur bei ruhiger Haltung (< 20°/s) über ~0,4 s gemittelt + automatische Neukalibrierung bei Hoch-/Querformat-Wechsel (Nutzer öffnet hochkant, spielt quer — vorher wurde die Mitte mitten in der Drehung gesetzt). Debug-Overlays laufen noch:
   - **Suchen + Verfolgen**: `OrientationControl` (Gyro-Yaw + Schwerkraft-Pitch). Verfolgen-Tuning in `verfolgen.js`: `SENSOR_GAIN` (Grad→Welt-Einheiten), `SIGN_YAW`, `SIGN_PITCH` (default −1, weil die Sicht-Formel invertiert zu Suchen ist), `DEBUG_SENSOR`.
   - **Lenken**: `TiltControl` (Schwerkraft-Neigung; `TILT_GAIN`, `TILT_DEADZONE`, `SIGN_TILT_X/Y`, `DEBUG_SENSOR` in `lenken.js`).

**Aus früherem Handoff weiterhin offen:**
7. **Einstellungen wirksam machen** (betroffene Seite L/R, Ton/Lautstärke, Schriftgröße, Erika-Sprachausgabe) — aktuell nur gespeichert.
8. **Impressum/Datenschutz** (`ueber.html`, `datenschutz.html`) mit echten Inhalten füllen.
9. Optional: PNGs (schmetterling/blume ~600 KB) verkleinern; Cache-Bust via versionierte Einbindungen; Daten-Export für die Auswertung.

---

## Nützliches zum Testen (localStorage-Keys)
- `neuroar_progress`  — Übungs-Zähler (z. B. `{ "suchen_1": 3 }`)
- `neuroar_stats`     — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, userName)
- `neuroar_settings`  — Einstellungen
- `neuroar_intros_seen` — welche Erklär-Demos schon liefen → entfernen + neu laden = Erst-Demos wieder
- **Konventionen/Stolperfallen:** „Lenken" heißt intern weiter `lenken`. Globale Objekte via `window.X = X` (`Erika`, `Intro`, `OrientationControl`). Weißer-Rand-SVG-Filter `#whiteOutline` wird von `common.js` injiziert (Klasse `.outlined`); bewegte Suchobjekte nutzen stattdessen das günstige `.lite-outline`.
