# Handoff — Augmented Rehabilitation (NeuroAR Reha)

Übergabe-Dokument zur Weiterarbeit in einer neuen Session.
**Stand: Juli/August 2026** — kombinierte Version unter `app/` ist der aktive Entwicklungsstand.

---

## 1. Ziel des Projekts

Prototypische **AR-/Web-App zur Rehabilitation von Neglect** (einseitige Aufmerksamkeitsstörung,
meist nach Schlaganfall — betroffene Seite i. d. R. **links**). Bachelorarbeit. Läuft rein im
Browser auf **Tablet/Smartphone**, bevorzugt **Querformat**. **Vanilla HTML/CSS/JS, keine
Build-Tools, keine Dependencies**, Hosting über **GitHub Pages**.

**Konzept: 3 Spiele × je 3 Stufen** (per Bewegungssensor ODER Finger steuerbar):
- **Suchen** – Objekt durch Drehen/Neigen des Geräts in die Mitte (Blatt/Zielkreis) bringen.
  1) Visuell (Marienkäfer → Blatt) · 2) Audio-visuell (Uhu → Astkreis) · 3) Sequenz (3 Käfer 1-2-3)
- **Verfolgen** – driftendes Objekt im mittigen Kreis halten (%-Auswertung).
  1) Visuell (Schmetterling → Blume) · 2) Audio (Uhu → Astkreis) · 3) Verschwinden (Objekt blinkt weg)
- **Lenken** – Schnecke per Neigen (Schwerkraft/Touch-Drag) zum Salat rollen.
  1) Gerade · 2) **Drei Salate** (alle einsammeln, Reihenfolge egal) · 3) Labyrinth (2 Hindernisse)

---

## 2. ⚠️ GitHub / Deployment — ZUERST LESEN

- **Repo:** `JonasMasch/Augmented-Rehabilitation` (public), Branch `main`. `gh` CLI ist als User **JonasMasch** eingeloggt → committen & pushen möglich.
- **Routine-Update:** `git add -A && git commit -m "..." && git push origin main`, dann ~1–2 Min auf Pages-Build warten.
- **⚠️ HTTPS ist Pflicht:** DeviceMotion/DeviceOrientation liefern nur über die Pages-HTTPS-URL Events, nicht über `file://` oder LAN-`http://`. Deshalb wird jeder Stand zum Testen gepusht.
- **⚠️ Browser-Cache:** Pages setzt `max-age=600` (10 Min) auf HTML/CSS/JS. Zuverlässig frisch: **privates Safari-Tab** oder iOS → Safari → „Verlauf und Websitedaten löschen", oder ~10 Min warten.
- **⚠️ Cache-Busting in `app/`:** Alle `css/`- und `js/`-Einbindungen in den `app/*.html` haben `?v=N` (aktuell **`?v=11`**). **Bei jeder Änderung an app/ CSS/JS die Nummer hochzählen**, sonst greift der Cache weiter: `perl -pi -e 's/\?v=11"/?v=12"/g' app/*.html`. (Wirkt erst, wenn der Browser die neue HTML geladen hat — beim ersten Mal trotzdem privates Tab.)
- **Pages-Build hängt manchmal:** leeren Commit pushen (`git commit --allow-empty -m "rebuild" && git push`) stößt frischen Build an.
- `.gitignore` schließt `.DS_Store`, `.claude/` und `assets/Hintergrund.jpg` (1,7-MB-Altbild, nur lokal) aus.

### Lokale Vorschau (Entwicklung)
Der eingebaute Preview-Server darf `~/Documents` nicht lesen (macOS TCC). Deshalb: Projekt ins
Scratchpad rsyncen und von dort servieren (siehe `serve.py`-Muster mit `directory=<site>`, Port 8100,
`Cache-Control: no-store`). Sensorik geht lokal NICHT (nur über HTTPS-Pages) → am Gerät testen.

---

## 3. ⭐ Die drei Versionen (WICHTIG)

| Ordner | URL | Rolle |
|---|---|---|
| **`app/`** | `…/Augmented-Rehabilitation/app/` | **AKTIVE, kombinierte Version — hier weiterarbeiten** |
| `/` (Root) | `…/Augmented-Rehabilitation/` | alte freie Version — **FROZEN** (Sicherung) |
| `test/` | `…/Augmented-Rehabilitation/test/` | alte geführte Version — **FROZEN** (Sicherung) |

**Nur `app/` bearbeiten.** Root und `test/` bleiben unverändert, bis der Nutzer die Kombination final
bestätigt und entscheidet, sie zur Hauptversion zu machen (dann `app/` → Root verschieben, alte
Ordner entfernen). `app/` teilt `localStorage` mit den anderen (gleiche Origin), hat aber eigene
Kopien aller Dateien.

### Was `app/` kann (Kern der Kombination)
`app/` = Kopie der Flow-fähigen `test/`-Version + Modus-Logik. Umschaltbar in den Einstellungen:
- **Modus** (Setting `mode`, Standard `patient`) — **UI-Beschriftung: „Einfach" / „Erweitert"** (die internen Werte heißen weiter `patient`/`pflege`; NICHT umbenennen — hängen an localStorage, allen CSS-Selektoren `html[data-mode="…"]`, `.pflege-only`, `flow.js`. Nur die sichtbaren Labels in `settings.html` wurden geändert):
  - **`patient` = „Einfach"**: Startseite zeigt einen „▶ Spiel starten"-Knopf → geführter linearer Flow durch alle Übungen (`flow.js`). Erfolgs-Button „Weiter".
  - **`pflege` = „Erweitert"**: Startseite zeigt 3 Kacheln (freie Übungsauswahl). Übungen standalone, Erfolgs-Button „Nochmal".
  - Umschaltung über `data-mode` am `<html>` (früh per Inline-Script im `<head>` gesetzt → kein Flackern; display via **CSS-Klasse**, NICHT inline — Inline schlägt sonst `display:none`).
- **Modus-abhängige Einstellungen:** Im **Patienten-Modus** zeigt die Einstellungsseite nur **Version, Trainingsübersicht, Impressum/Datenschutz**. Der Rest (Mein Training, Ton, Darstellung, Reset-Buttons) ist `.pflege-only` und nur im Pflegekraft-Modus sichtbar (`html[data-mode="patient"] .pflege-only{display:none}`).
- **Schalter „Audio-Übungen"** (Setting `audioExercises`, Standard an, in „Mein Training", pflege-only): AUS → die Uhu-/Audio-Stufen (**Suchen 2** + **Verfolgen 2**) werden aus dem Patienten-Flow gefiltert (7 statt 9 Übungen). `flow.js` baut `FLOW` dynamisch aus `FULL_FLOW` (Einträge mit `audio:true`).

---

## 4. Aussehen & Barrierefreiheit (alles in `app/`)

- **Schrift: Luciole** (barrierefrei, für Sehbeeinträchtigte). CC-BY 4.0, © Bourcellier & Perez. Dateien unter `app/assets/fonts/` (Regular+Bold, woff2/woff), `@font-face` in `common.css`, Attribution in `ueber.html`. `button/input` erben die Schrift.
- **Hintergrund: blauer Verlauf** `linear-gradient(135deg, #0a5078 oben-links, #196e91 unten-rechts)` (`.cam-bg`, body, Fallbacks, Demo-Flächen). **Ausnahme Startseite:** `index.html` überschreibt `.cam-bg` mit dem **umgedrehten** Verlauf `linear-gradient(135deg, #196e91 hell oben-links, #0a5078 dunkel unten-rechts)` (bewusst nur die Startseite; die übrigen Seiten behalten den Original-Verlauf). Foto-Hintergründe der Übungs-Screens (`Hintergrund.jpeg`, `hintergrund_lenken.jpeg`) unverändert. Akzentfarben (Mint `#34d399`, Lila `#a78bfa`) blieben grün/lila.
- **Primär-Buttons im Einfach-Modus: `#85d67d`** (helles Grün, dunkler Text). Gilt für „▶ Spiel starten" (`.start-btn` in `index.html`, ohnehin nur Einfach) und „Weiterspielen" im Erika-Pausemenü (`html.flow-mode .ep-resume` in `erika.css`). Im **Erweitert-Modus** bleibt `.ep-resume` beim Original `#4ade80`.
- **rem-basiertes Größen-System + wirksame Schriftgröße-Einstellung:**
  - Alle UI-`font-size`/`padding`/`gap` sind **rem** (px ÷16). „Mittel" = bisherige (bereits +20%-große) Darstellung.
  - Zentraler Hebel: **Wurzel-Schriftgröße am `<html>`** via `data-fontsize`: `klein`=14px, `mittel`=16px (Standard), `gross`=19px. Ein Wert skaliert Text, Buttons, Abstände proportional.
  - `data-fontsize` wird auf **allen** Seiten früh im `<head>` aus Setting `fontSize` gesetzt (kein Flackern); `settings_page.js` zieht es beim Umschalten live mit.
  - **WICHTIG — Grenze:** Die **Spielgeometrie bleibt px** (Objektgrößen, Zielkreise, Positionen werden in `suchen/verfolgen/lenken.js` per `window.innerWidth/innerHeight` berechnet). NICHT auf rem umstellen — sonst wandern Objekte aus dem Bild / Trefferlogik passt nicht. Geprüft: bei „Groß" bleibt Objekt 92px, Zielkreis 120px.
- **Hinweistext (`.instr`) sitzt oben** (`top:5%`, vorher unten). In Suchen Stufe 3 wurden die 1-2-3-Pillen (`.seq-list`) darunter geschoben (`top: calc(5% + 3.25rem)`), damit sich beide nicht überlappen.
- **⭐ Neglect-Layout — freie Randzonen (NUR im Einfach-Modus):** Bedienelemente bleiben aus definierten Randzonen heraus: **links 40 %, rechts 5 %, oben 5 %, unten 7 %**. Sie sitzen **linksbündig direkt an der 40 %-Kante** (so weit links wie erlaubt — zieht die Aufmerksamkeit möglichst weit nach links). „Frei" = frei von **Bedienelementen**; die **Übungsobjekte** (`.center-zone` + per-JS über `innerWidth/innerHeight` positionierte Käfer/Schnecke/Salate) dürfen weiterhin überall hin, auch in die Randzonen (bewusst nicht beschränkt — Objektgeometrie bleibt px, siehe Abschnitt 4).
  - Zentraler Block am Ende von `common.css`: CSS-Vars `--free-left:40vw`, `--free-right:5vw`, `--free-top:5dvh`, `--free-bottom:7dvh` (sonst alle `0`). Aktiv über `html[data-mode="patient"]` (**nur Startseite**) **ODER** `html.flow-mode` (geführte Übung, `?flow=n`).
  - **Die EINSTELLUNGEN bleiben in BEIDEN Modi normal mittig** (kein Shift der Inhaltsspalte). **Erweitert-Modus** (`data-mode="pflege"` bzw. Standalone-Übung ohne `flow-mode`) bleibt unverändert (alle `--free-*:0`).
  - Wirkung: `.home` bekommt alle vier Paddings + `align-items:flex-start`; innerer Wrapper = Klasse **`.home-col`** (in `index.html`; `.patient-only` ebenfalls `flex-start`, sonst zentriert der den Start-Button erneut). `.top-actions` (⚙️) → obere/rechte freie Zone. Übung: `.instr`/`.seq-list` `left:var; transform:none; top:var`; `.score-badge` oben-rechts in die freie Ecke, `.cam-label` darunter (`top:calc(var+2.75rem)`, sonst Überlappung). **Erika** (`.erika`, an `document.body`) → `right:var(--free-right); bottom:var(--free-bottom)` (Start-/Übungs-/Einstellungsseite). Overlays (`.success`/`.erika-pause`/`.intro-overlay`) bekommen alle vier Paddings; Inhalt linksbündig an der 40 %-Kante. Geprüft (Querformat 1024×640): alle Bedienelemente im Kasten [40 %–95 %]×[5 %–93 %] (L=410, R=973, T=32, B=595), Score/Kamera gestapelt ohne Überlappung, Einstellungen mittig, Erweitert-Modus unberührt.

---

## 5. Bewegungssensorik (in allen 3 Spielen) — Status & Tuning

Touch bleibt überall Fallback (greift, solange keine echten Sensorwerte kommen).

- **Modul `orientation.js`** (gyro-basiert, OHNE Magnetometer/Kompass → kein Umgebungs-Rauschen):
  - `window.OrientationControl` (Suchen + Verfolgen): yaw = Gyro-Drehrate auf Welt-Vertikale projiziert + integriert; pitch = aus Schwerkraft.
  - `window.TiltControl` (Lenken): Schwerkraft-Neigung, Bildschirm-Drehung herausgerechnet.
  - **Schwerkraft = Komplementär-Filter** (`GRAV_TAU = 0.5`): mit Gyro mitgedreht, langsam zur Accelerometer-Messung gezogen. **Ein reiner Tiefpass reicht NICHT** (hinkt bei Drehung nach → Neigen streute in den Gier-Winkel ein).
  - **Kalibrierung bewegungs-gated:** Nullpunkt wird nur bei ruhiger Haltung (< 20°/s) über ~0,4 s gemittelt; automatische Neukalibrierung bei Hoch-/Querformat-Wechsel (Nutzer öffnet hochkant, spielt quer).
- **Am Gerät bestätigte Vorzeichen (Juli 2026, zwei Tests) — NICHT nochmal pauschal umdrehen:**
  - `suchen.js`: `SENSOR_GAIN=2.0`, `SIGN_YAW=+1`, `SIGN_PITCH=+1`
  - `verfolgen.js`: `SENSOR_GAIN=5.0`, `SIGN_YAW=+1`, `SIGN_PITCH=-1` (Sicht-Formel `objY-viewY` invertiert zu Suchen)
  - `lenken.js`: `TILT_GAIN=1.7`, `SIGN_TILT_X=-1`, `SIGN_TILT_Y=-1` (nur die Tilt-Achsen sind invertiert, die Gyro-/Pitch-Pfade NICHT)
- **`DEBUG_SENSOR = true`** in allen drei JS → Live-Anzeige unten links. **Vor Release auf `false` setzen.**
- Bugfix (aus Sensor-Session): `render()` in `suchen.js` hatte einen Null-Guard nötig (`calibrate()` rendert vor `buildTargetDOM` → sonst Crash beim Level-Wechsel mit aktivem Sensor). In `app/` behoben; **gleicher Latenz-Bug existiert noch in `test/` + `root`** (frozen).

---

## 6. Weitere Änderungen in `app/` (Überblick)

- **Profil entfernt / Medaillen weg:** `badges.js` behält nur Fortschritt (`recordCompletion`, `markStageCards`). Name + Trainingsübersicht (Statistik + Wochenaktivität) sind in die **Einstellungen** gewandert. Oben rechts nur noch „⚙️ Einstellungen" (kein „👤 Profil"). `profil.html/js/css` gelöscht.
- **Ton in den Audio-Übungen vorübergehend aus:** `SOUND_ON = false` in `suchen.js` + `verfolgen.js` (Suchen 2 / Verfolgen 2). `setupAudio()` kehrt sofort zurück; visuelle Balken laufen weiter. Zum Reaktivieren `SOUND_ON = true`.
- **AudioContext-Leck behoben** (Context wird in `cleanup()` geschlossen), **iOS-Audio-Unlock** (`createTone` resumt bei nächster Berührung), Erika-**Pause** funktioniert in Suchen wirklich (`paused`-Flag).
- **Tutorials im Erika-Pausemenü:** Der frühere „?"-Button ist weg; beim Klick auf Erika zeigt das Pausemenü oben die Demo-Animation der aktuellen Stufe (über `enterExercise({demo})`), darunter Weiterspielen/Neu starten/Zurück. Feld gleich breit wie die Buttons, `clip-path` gegen iOS-3D-Überlauf.
- **Verfolgen Stufe 1** nutzt testweise neue PNGs (`schmetterling.png`/`Blume_2.png`), Objekte einheitlich 92px.

---

## 7. Struktur `app/`

```
app/
  index.html      Startseite (modus-abhängig: Spielen-Knopf ODER 3 Kacheln)
  suchen/verfolgen/lenken.html   die 3 Spiele (mit flow.js; ?flow=n = geführt, ohne = standalone)
  settings.html   Einstellungen (Version/Modus, Trainingsübersicht, Mein Training, Ton, Darstellung, App)
  ueber.html / datenschutz.html  (Platzhalter-Inhalte)
  css/   common, erika, intro, settings + je Spiel (suchen/verfolgen/lenken)
  js/    common, erika, intro, badges, session, settings, settings_page,
         orientation (OrientationControl + TiltControl), flow, suchen, verfolgen, lenken
  assets/  SVGs + PNGs + Hintergrund.jpeg/.avif + hintergrund_lenken.jpeg + fonts/ (Luciole)
```
Kern-Globals via `window.X`: `Erika`, `Intro`, `OrientationControl`, `TiltControl`.
`settings.js` lädt VOR `flow.js` (flow.js liest `getSetting('audioExercises')`).

---

## 8. OFFENE PUNKTE / nächste Schritte

1. **Geräte-Test des aktuellen `app/`-Stands:** Sensorik in allen 3 Spielen (Richtung, Zittern, Drift, Format-Wechsel), Modus-Umschaltung, Schriftgröße, Audio-Übungen-Filter, Flow mit Sensor (der Null-Guard-Fix).
2. **`DEBUG_SENSOR` → `false`** in suchen/verfolgen/lenken, wenn Steuerung passt.
3. **Restliche Einstellungen wirksam machen** (bisher nur gespeichert): betroffene Seite L/R, Ton/Lautstärke, Erika-Sprachausgabe. (Modus, Audio-Übungen, Schriftgröße sind bereits wirksam.)
4. **`SOUND_ON` wieder aktivieren?** (aktuell in Suchen/Verfolgen aus) — je nach Wunsch.
5. **Impressum/Datenschutz** (`ueber.html`, `datenschutz.html`) mit echten Inhalten füllen.
6. **Kombination final machen:** wenn bestätigt, `app/` → Root, alte Ordner (`test/`, alte Root-Dateien) aufräumen; Latenz-Bug-Fix ggf. mitnehmen.
7. Optional: PNGs verkleinern (`schmetterling.png`/`Blume_2.png` ~600 KB–1,5 MB); Daten-Export für die Auswertung; die gleichen Fixes/Features nach `test/`/`root` ziehen (aktuell bewusst nicht).

---

## 9. localStorage-Keys & Konventionen

- `neuroar_settings` — Einstellungen. Felder: `mode` (`patient`/`pflege`), `audioExercises` (bool), `fontSize` (`klein`/`mittel`/`gross`), `side`, `sessionDuration`, `soundOn`, `volume`, `erikaVoice`, `reminderEnabled`, `reminderTime`, `userName` (Name liegt in stats).
- `neuroar_progress` — Übungs-Zähler (`{ "suchen_1": 3 }`) für die ✓-Häkchen auf den Auswahl-Karten.
- `neuroar_stats` — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, userName).
- `neuroar_intros_seen` — welche Erklär-Demos schon liefen (entfernen + neu laden = Erst-Demos wieder).
- **Stolperfallen:** „Lenken" heißt intern weiter `lenken`. Weißer-Rand-SVG-Filter `#whiteOutline` wird von `common.js` injiziert (`.outlined`); bewegte Objekte nutzen das günstige `.lite-outline`. Modus-/Fontsize-Sichtbarkeit läuft über Attribute am `<html>` — Display bei Modus-Blöcken NIE inline setzen (schlägt die CSS-`display:none`-Regel).
