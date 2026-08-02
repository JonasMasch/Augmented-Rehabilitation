# Handoff — AURA (Repo/Codename weiterhin „Augmented-Rehabilitation" / „NeuroAR Reha")

Übergabe-Dokument zur Weiterarbeit in einer neuen Session.
**Stand: August 2026** — kombinierte Version unter `app/` ist der aktive Entwicklungsstand.

---

## 1. Ziel des Projekts

Prototypische **AR-/Web-App zur Rehabilitation von Neglect** (einseitige Aufmerksamkeitsstörung,
meist nach Schlaganfall — betroffene Seite i. d. R. **links**). Bachelorarbeit. Läuft rein im
Browser auf **Tablet/Smartphone**, bevorzugt **Querformat**. **Vanilla HTML/CSS/JS, keine
Build-Tools, keine Dependencies**, Hosting über **GitHub Pages**.

**Name: AURA.** So heißt die App auf der Startseite (`app/index.html`, `<title>` + Überschrift).
**Uneinheitlich (bewusst so gelassen, nicht angefragt):** Alle anderen Seiten führen im `<title>`
weiterhin „NeuroAR Reha" (z. B. „NeuroAR Reha — Suchen"), und `ueber.html` nennt die App im
Fließtext ebenfalls noch „NeuroAR Reha". Repo-Name auf GitHub (`Augmented-Rehabilitation`)
ebenfalls unverändert. Falls gewünscht: „AURA" ließe sich leicht auf die restlichen `<title>`-Tags
und den `ueber.html`-Text ausweiten.

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
- **⚠️ Cache-Busting in `app/`:** Alle `css/`- und `js/`-Einbindungen in den `app/*.html` haben `?v=N` (aktuell **`?v=24`**). **Bei jeder Änderung an app/ CSS/JS die Nummer hochzählen**, sonst greift der Cache weiter: `perl -pi -e 's/\?v=24"/?v=25"/g' app/*.html`. (Reines HTML-Textänderungen ohne CSS/JS-Edit brauchen keinen Bump — z. B. der AURA-Namenswechsel.)
- **Pages-Build hängt manchmal:** leeren Commit pushen (`git commit --allow-empty -m "rebuild" && git push`) stößt frischen Build an.
- `.gitignore` schließt `.DS_Store`, `.claude/` und `assets/Hintergrund.jpg` (1,7-MB-Altbild, nur lokal) aus.

### Lokale Vorschau (Entwicklung)
Der eingebaute Preview-Server darf `~/Documents` nicht lesen (macOS TCC). Deshalb: Projekt ins
Scratchpad rsyncen und von dort servieren (`serve.py`-Muster mit `directory=<site>`, Port 8100,
`Cache-Control: no-store`). Sensorik geht lokal NICHT (nur über HTTPS-Pages) → am Gerät testen.
Für Layout-/Icon-/Farb-Checks reicht der lokale Server völlig (Browser-DevTools, JS-Konsole).

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

---

## 4. Modus-System: Einfach / Erweitert

Umschaltbar in den Einstellungen (Setting `mode`, Standard `patient`). **UI-Beschriftung „Einfach"/
„Erweitert"** — die internen Werte heißen weiterhin `patient`/`pflege` (NICHT umbenennen, hängen an
localStorage, allen CSS-Selektoren `html[data-mode="…"]`, `.pflege-only`, `flow.js`; nur die
sichtbaren Labels in `settings.html` wurden geändert).

- **`patient` = „Einfach"**: Startseite zeigt einen „▶ Spiel starten"-Knopf → geführter linearer Flow durch alle Übungen (`flow.js`). Erfolgs-Button „Weiter".
- **`pflege` = „Erweitert"**: Startseite zeigt 3 Kacheln (freie Übungsauswahl). Übungen standalone, Erfolgs-Button „Nochmal".
- Umschaltung über `data-mode` am `<html>` (früh per Inline-Script im `<head>` gesetzt → kein Flackern; Sichtbarkeit über **CSS-Klasse**, NICHT inline-style — Inline schlägt sonst `display:none`).
- **Modus-abhängige Einstellungen:** Im **Einfach-Modus** zeigt die Einstellungsseite nur **Version, Trainingsübersicht, App**. Der Rest (Mein Training, Ton, Darstellung, Reset-Buttons) ist `.pflege-only` und nur im Erweitert-Modus sichtbar.
- **Schalter „Audio-Übungen"** (Setting `audioExercises`, Standard an, in „Mein Training", pflege-only): AUS → die Uhu-/Audio-Stufen (**Suchen 2** + **Verfolgen 2**) werden aus dem Einfach-Flow gefiltert (7 statt 9 Übungen). `flow.js` baut `FLOW` dynamisch aus `FULL_FLOW` (Einträge mit `audio:true`).

---

## 5. Neglect-Layout — freie Randzonen (NUR im Einfach-Modus)

Kernidee: Da die betroffene Seite meist links liegt, bleiben im **Einfach-Modus** definierte
Randzonen frei von **Bedienelementen** (nicht von Übungsobjekten — dazu unten mehr):
**links 40 %, rechts 5 %, oben 5 %, unten 7 %**. Bedienelemente sitzen **linksbündig direkt an der
40 %-Kante** (so weit links wie erlaubt).

- Zentraler Block am Ende von `common.css`: CSS-Variablen `--free-left:40vw`, `--free-right:5vw`,
  `--free-top:5dvh`, `--free-bottom:7dvh` (sonst überall `0`). Aktiv über `html[data-mode="patient"]`
  (Startseite + Erika-Info-Overlay) **ODER** `html.flow-mode` (geführte Übung, `?flow=n` in der URL).
- **Die EINSTELLUNGEN bleiben in BEIDEN Modi normal mittig** (kein Shift — bewusste Ausnahme).
  **Erweitert-Modus** (`data-mode="pflege"` bzw. Standalone-Übung ohne `flow-mode`) bleibt
  komplett unverändert (alle `--free-*:0`).
- Betroffene Elemente: `.home` (Startseite, via `.home-col`-Wrapper in `index.html`), `.top-actions`
  (Einstellungen-Button), `.instr`/`.seq-list`/`.score-badge`/`.cam-label` (Übungs-Chrome),
  `.erika`/`.erika-info-fig` (Erika, an `document.body` — braucht eigene Regeln, da nicht Kind der
  jeweiligen Seite), sowie die Vollflächen-Overlays `.success`/`.erika-pause`/`.erika-info`/
  `.intro-overlay` (Backdrop bleibt ganzflächig, Inhalt rückt an die 40 %-Kante).
- **Ausgenommen (dürfen überall hin, auch in die Randzonen):** die **Übungsobjekte** selbst
  (`.center-zone`/Zielkreis, per-JS über `innerWidth/innerHeight` positionierte Käfer/Schnecke/
  Salate). Das ist gewollt — die Spielgeometrie bleibt bewusst px-basiert (siehe Abschnitt 6) und
  nicht Teil der Neglect-Zonen-Beschränkung.
- Geprüft (Querformat 1024×640): alle Bedienelemente im Kasten [40 %–95 %]×[5 %–93 %]
  (L=410, R=973, T=32, B=595 px), Erweitert-Modus komplett unberührt.

---

## 6. Aussehen & Barrierefreiheit (alles in `app/`)

- **Schrift: Luciole** (barrierefrei, für Sehbeeinträchtigte). CC-BY 4.0, © Bourcellier & Perez. Dateien unter `app/assets/fonts/` (Regular+Bold, woff2/woff), `@font-face` in `common.css`, Attribution in `ueber.html`. `button`/`input` erben die Schrift explizit.
- **Hintergrund: blauer Verlauf** (global in `common.css`, `.cam-bg`) `linear-gradient(135deg, #196e91 hell oben-links, #0a5078 dunkel unten-rechts)`, gilt für alle Seiten mit Verlaufs-Hintergrund. Übungs-Screens haben eigene Foto-Hintergründe (`#screen-level .cam-bg` überschreibt → `Hintergrund.jpeg`, `hintergrund_lenken.jpeg`). Die Demo-Mini-Szenen (Tutorial-Animationen) nutzen weiterhin ihren eigenen, unveränderten Verlauf. Akzentfarben Mint `#34d399` / Lila `#a78bfa` unverändert.
- **Primärfarbe `#85d67d` NUR im Einfach-Modus:** „▶ Spiel starten" (`.start-btn`) und „Weiterspielen" im Erika-Pausemenü (`html.flow-mode .ep-resume`). Im Erweitert-Modus bleibt Grün beim Original `#4ade80`.
- **Einfach-Startseite — einheitliche Breite (`25rem`):** „Spiel starten", der Tages-Fortschrittsbalken und der Sensor-Button sind gleich breit. Balken höher (`16px`) und Text größer (`1.2rem`) als im Erweitert-Modus (dort `width:100%; max-width:660px`, Original-Höhe).
- **Erika-Pausemenü im Einfach-Modus ebenfalls auf `25rem` vergrößert** (Buttons + Tutorial-Demo-Bühne), Erweitert bleibt bei `300px`. **Wichtig für die Demo-Bühnen-Skalierung** (`.erika-pause-demo .demo-scene`): NICHT naiv proportional aus dem alten Wert hochrechnen — das führt zu Clipping. Richtig gemessen: alle 9 Übungs-Demos (Suchen/Verfolgen/Lenken × 3 Stufen) per Web-Animations-API (`element.getAnimations()`, `currentTime` durchfahren) Frame für Frame vermessen; Extremfall ist Suchen Stufe 3 mit ±198px/±117px um die Mitte, fast exakt symmetrisch → aktuell `transform:scale(0.9)` ohne Offset, lässt überall ≥ ~22px Rand.
- **rem-basiertes Größen-System + wirksame Schriftgröße-Einstellung:** Alle UI-`font-size`/`padding`/`gap` sind **rem**. Zentraler Hebel: Wurzel-Schriftgröße am `<html>` via `data-fontsize`: `klein`=14px, `mittel`=16px (Standard), `gross`=19px — früh im `<head>` auf allen Seiten gesetzt (kein Flackern), `settings_page.js` zieht es live mit.
  **Grenze:** Die **Spielgeometrie bleibt px** (Objektgrößen/Zielkreise/Positionen in `suchen/verfolgen/lenken.js`, berechnet über `window.innerWidth/innerHeight`). NICHT auf rem umstellen — sonst wandern Objekte aus dem Bild.
- **Hinweistext (`.instr`) sitzt oben** (`top:5%`). In Suchen Stufe 3 sitzen die 1-2-3-Pillen (`.seq-list`) direkt darunter (`top: calc(5% + 3.25rem)`), damit sie sich nicht überlappen.

---

## 7. Erika (Assistenzfigur) — komplettes System

Erika schwebt unten rechts, in mehreren Zuständen je nach Kontext:

| Zustand | Wo | Aussehen | Klick |
|---|---|---|---|
| **`collapsed`** | Startseite (`index.html`, `Erika.startCollapsed()`, beide Modi) | „?"-Button (quadratisch) | öffnet Info-Overlay |
| **`compact`** | Während einer Übung, Pausemenü zu | „?"-Button (**gleiches** Icon/Button wie collapsed) | öffnet Pausemenü |
| normal (keine Klasse) | Einstellungen, Über/Datenschutz, Stufenauswahl der Übungen | große Figur (`.erika-fig`) | öffnet Sprechblase (Tipp/Begrüßung) |
| Übung pausiert (`paused`, zusätzlich zu obigem) | Pausemenü offen | große Figur, **genauso groß wie im Info-Overlay** | — |

- **„?"-Button** (`.erika-help-btn`): quadratisch, `border-radius:14px` (häufigster Radius im Projekt), **5.5rem × 5.5rem (88×88px)**, Icon `circle-question-mark`, `font-size:3.2rem` (bewusst die größte Icon-Größe im ganzen Projekt). Ersetzt sowohl das alte kompakte Erika-Icon während der Übung (`erika_icon.svg`, jetzt gelöscht, war nur dort verwendet) als auch die direkte Figur auf der Startseite.
- **Gemeinsamer Klick-Handler `onTrigger()`** in `erika.js` für `.erika-avatar` UND `.erika-help-btn` (welcher von beiden sichtbar ist, entscheidet nur CSS): Übung aktiv → Pausemenü; Startseite `collapsed` → Info-Overlay (`openInfo()`); sonst → Sprechblase (`toggleBubble()`, teilt sich `pickText()` mit dem Info-Overlay: Begrüßung beim ersten Mal, danach zufälliger Tipp).
- **Info-Overlay** (`.erika-info`, komplett getrennt vom Übungs-Pausemenü `.erika-pause`): abgedunkelter Hintergrund (`rgba(10,10,25,0.85)`), **Figur bleibt an ihrem gewohnten Platz unten rechts** (aus dem Flex-Fluss gelöst, `position:fixed`, NICHT mittig über dem Textfeld), darunter ein weißes Textfeld und ein grüner „Zurück zur Startseite"-Button (`#4ade80`, bewusst modusunabhängig). Schließen räumt nur das Overlay weg, Erika fällt zurück auf den „?"-Button (kein dauerhaftes Aufklappen).
  - Figur-Größe geteilt über CSS-Variable `--erika-big-fig-height: clamp(137px, min(35.7vh,44.1vw), 420px)` — genutzt von `.erika-info-fig` UND `.erika.paused .erika-fig` (Pausemenü-Figur), damit beide immer exakt gleich groß bleiben (aktuell 228px bei 1024×640).
  - Einfach-Modus: Figur hält zusätzlich die rechten/unteren Freizonen ein (`right:var(--free-right); bottom:var(--free-bottom)`, analog zu `.erika`).
- **Pausemenü** (`.erika-pause`): Tutorial-Demo-Bühne oben (Animation der aktuellen Stufe), darunter drei Buttons: **Weiterspielen** (grün, `play`-Icon), **Neu starten** (weiß/schwarz, `refresh-ccw`-Icon), **Zurück zur Übersicht** (weiß/schwarz, `arrow-left`-Icon).
- **Ton:** `SOUND_ON = false` aktuell in `suchen.js`/`verfolgen.js` (Suchen 2 / Verfolgen 2) — visuelle Balken laufen weiter, aber kein Ton. Zum Reaktivieren `SOUND_ON = true`.
- AudioContext-Leck behoben (`cleanup()` schließt den Context), iOS-Audio-Unlock vorhanden, Erika-Pause funktioniert in Suchen wirklich (`paused`-Flag stoppt Treffer-Logik).

---

## 8. Icons: Lucide (statt Emojis)

Fast alle Emojis im UI wurden durch **Lucide-Icons** (lucide.dev, ISC-Lizenz) ersetzt.

- **Herkunft/Einbindung:** Einzelne SVGs von `raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg` heruntergeladen (kein CDN/Build-Tool — passend zur „keine Dependencies"-Regel, wie schon bei der Luciole-Schrift). Lokale Kopien unter **`app/assets/icons/`** (19 SVGs + `LICENSE-lucide.txt`) dienen als Referenz/Backup — **eingebettet wird inline als `<svg>`**, nicht `<img src>`, damit die Farbe per `stroke="currentColor"` automatisch dem Text-/Button-Kontext folgt. Attribution in `ueber.html`.
- **Basis-Klasse `.lucide`** in `common.css`: `width:1em; height:1em;` — Icon-Größe folgt der `font-size` des umgebenden Elements.
- **Icon-Größen wurden mehrfach nachjustiert** (aktueller Endstand):
  - Reine Icon-Buttons „?" und Einstellungen: eigene `font-size:3.2rem` direkt am Button (größte Icons im Projekt).
  - Icon+Text-Buttons (`.start-btn`, `.sensor-btn`, `.ep-resume`/`.ep-restart`/`.ep-menu`, `.erika-info-back`, `.back-to-menu`, `.name-edit`) sowie `.cam-label` und `.s-text`/Erfolgsmeldung: gezielte Regel in `common.css` setzt NUR das `.lucide`-Icon auf **1.3em** (Button-/Label-Text bleibt unverändert groß).
  - Bewusst NICHT vergrößert: reine Status-/Abschnittstitel-Icons (`.settings-icon`, `.settings-group-title`, `.chevron`, Tages-Häkchen, Karten-Badge, `stat-streak`, `demo-sound-sm` in der Tutorial-Mini-Animation).
- **Mapping (Kontext → Lucide-Name):** Einstellungen-Zahnrad/-Kopfzeile → `settings`, „?"-Button → `circle-question-mark`, Häkchen (Erfolg/Badges/Tages-Ziel) → `check`, Ton → `volume-2`, AR-Kamera-Label → `camera`, Streak → `flame`, „Zeit abgelaufen" → `timer`, Info-Seite/„App" → `info`, Bewegungssteuerung → `compass`, Name bearbeiten → `pencil`, „Version" → `users`, Trainingsübersicht → `chart-column`, „Mein Training" → `target`, Datenschutz → `lock`, „Darstellung" → `a-large-small`, „Spiel starten"/„Weiterspielen" → `play`, „Neu starten" → `refresh-ccw`, Zurück-Links/-Buttons → `arrow-left`, Chevron in Einstellungs-Zeilen → `chevron-right`.
- **JS-generierte Stellen mussten von `.textContent` auf `.innerHTML` umgestellt werden** (sonst rendert das SVG nicht): `showSuccess()` in `suchen.js`, `finish()` in `verfolgen.js`/`lenken.js`, `perm-status`-Meldungen in allen drei Übungs-JS, `stat-streak` in `settings_page.js`, Badge-Häkchen in `badges.js`. Alle eingefügten Strings sind statisch/vertrauenswürdig — unproblematisch für `innerHTML`.
- **Bewusst ausgenommen: 💎 in `verfolgen.html`** (`<div class="target" id="obj">💎</div>`). Kein UI-Icon, sondern nur ein nie sichtbarer Platzhalter für das Spielobjekt der Übung „Verfolgen" — wird zur Laufzeit immer von `verfolgen.js` durch die echte Illustration (z. B. Schmetterling) ersetzt.

---

## 9. Bewegungssensorik (in allen 3 Spielen) — Status & Tuning

Touch bleibt überall Fallback (greift, solange keine echten Sensorwerte kommen).

- **Modul `orientation.js`** (gyro-basiert, OHNE Magnetometer/Kompass → kein Umgebungs-Rauschen):
  - `window.OrientationControl` (Suchen + Verfolgen): yaw = Gyro-Drehrate auf Welt-Vertikale projiziert + integriert; pitch = aus Schwerkraft.
  - `window.TiltControl` (Lenken): Schwerkraft-Neigung, Bildschirm-Drehung herausgerechnet.
  - **Schwerkraft = Komplementär-Filter** (`GRAV_TAU = 0.5`): mit Gyro mitgedreht, langsam zur Accelerometer-Messung gezogen. Ein reiner Tiefpass reicht NICHT (hinkt bei Drehung nach).
  - **Kalibrierung bewegungs-gated:** Nullpunkt wird nur bei ruhiger Haltung (< 20°/s) über ~0,4 s gemittelt; automatische Neukalibrierung bei Hoch-/Querformat-Wechsel.
- **Am Gerät bestätigte Vorzeichen (zwei Tests) — NICHT nochmal pauschal umdrehen:**
  - `suchen.js`: `SENSOR_GAIN=2.0`, `SIGN_YAW=+1`, `SIGN_PITCH=+1`
  - `verfolgen.js`: `SENSOR_GAIN=5.0`, `SIGN_YAW=+1`, `SIGN_PITCH=-1` (Sicht-Formel `objY-viewY` invertiert zu Suchen)
  - `lenken.js`: `TILT_GAIN=1.7`, `SIGN_TILT_X=-1`, `SIGN_TILT_Y=-1` (nur die Tilt-Achsen sind invertiert, Gyro-/Pitch-Pfade NICHT)
- **`DEBUG_SENSOR = true`** in allen drei JS → Live-Anzeige unten links. **Vor Release auf `false` setzen.**
- Bugfix: `render()` in `suchen.js` hatte einen Null-Guard nötig (`calibrate()` rendert vor `buildTargetDOM` → sonst Crash beim Level-Wechsel mit aktivem Sensor). In `app/` behoben; **gleicher Latenz-Bug existiert noch in `test/` + Root** (frozen).

---

## 10. Weitere Details

- **Profil entfernt / Medaillen weg:** `badges.js` behält nur Fortschritt (`recordCompletion`, `markStageCards`). Name + Trainingsübersicht sind in die Einstellungen gewandert. `profil.html/js/css` gelöscht.
- **Verfolgen Stufe 1** nutzt testweise neue PNGs (`schmetterling.png`/`Blume_2.png`), Objekte einheitlich 92px.

### Struktur `app/`
```
app/
  index.html      Startseite AURA (modus-abhängig: Spielen-Knopf ODER 3 Kacheln)
  suchen/verfolgen/lenken.html   die 3 Spiele (mit flow.js; ?flow=n = geführt, ohne = standalone)
  settings.html   Einstellungen (Version/Modus, Trainingsübersicht, Mein Training, Ton, Darstellung, App)
  ueber.html / datenschutz.html  (Platzhalter-Inhalte, Lucide-Attribution in ueber.html)
  css/   common (inkl. .lucide + Neglect-Layout-Zonen), erika, intro, settings + je Spiel
  js/    common, erika, intro, badges, session, settings, settings_page,
         orientation (OrientationControl + TiltControl), flow, suchen, verfolgen, lenken
  assets/  SVGs + PNGs + Hintergrund.jpeg/.avif + hintergrund_lenken.jpeg + fonts/ (Luciole)
           + icons/ (19 Lucide-SVGs + LICENSE-lucide.txt)
```
Kern-Globals via `window.X`: `Erika`, `Intro`, `OrientationControl`, `TiltControl`.
`settings.js` lädt VOR `flow.js` (flow.js liest `getSetting('audioExercises')`).

### localStorage-Keys & Konventionen
- `neuroar_settings` — Einstellungen. Felder: `mode` (`patient`/`pflege`), `audioExercises` (bool), `fontSize` (`klein`/`mittel`/`gross`), `side`, `sessionDuration`, `soundOn`, `volume`, `erikaVoice`, `reminderEnabled`, `reminderTime`, `userName`.
- `neuroar_progress` — Übungs-Zähler (`{ "suchen_1": 3 }`) für die Häkchen auf den Auswahl-Karten.
- `neuroar_stats` — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, userName).
- `neuroar_intros_seen` — welche Erklär-Demos schon liefen (entfernen + neu laden = Erst-Demos wieder).
- **Stolperfallen:** „Lenken" heißt intern weiter `lenken`. Weißer-Rand-SVG-Filter `#whiteOutline` wird von `common.js` injiziert (`.outlined`); bewegte Objekte nutzen das günstige `.lite-outline`. Modus-/Fontsize-Sichtbarkeit läuft über Attribute am `<html>` — Display bei Modus-Blöcken NIE inline setzen (schlägt die CSS-`display:none`-Regel).

---

## 11. OFFENE PUNKTE / nächste Schritte

1. **Geräte-Test des aktuellen `app/`-Stands:** Sensorik in allen 3 Spielen, Modus-Umschaltung, Schriftgröße, Audio-Übungen-Filter, Neglect-Layout auf echtem Gerät (Querformat), Erika-Zustände (collapsed/compact/paused).
2. **`DEBUG_SENSOR` → `false`** in suchen/verfolgen/lenken, wenn Steuerung passt.
3. **Restliche Einstellungen wirksam machen** (bisher nur gespeichert): betroffene Seite L/R, Ton/Lautstärke, Erika-Sprachausgabe. (Modus, Audio-Übungen, Schriftgröße sind bereits wirksam.)
4. **`SOUND_ON` wieder aktivieren?** (aktuell in Suchen/Verfolgen aus) — je nach Wunsch.
5. **Impressum/Datenschutz** (`ueber.html`, `datenschutz.html`) mit echten Inhalten füllen.
6. **Namens-Konsistenz „AURA"** ggf. auf die übrigen `<title>`-Tags und den `ueber.html`-Text ausweiten (aktuell nur Startseite).
7. **Hand-Grafiken für Tutorial-Animationen:** Nutzer wollte selbst zwei Hand-SVGs zeichnen/liefern (Tablet-haltende Hände für die Suchen-Stufe-1-Demo als Pilot); ein erster Platzhalter-Versuch wurde verworfen und rückgängig gemacht. Sobald Grafiken vorliegen, in `js/suchen.js` (`DEMOS[1].scene`) + `css/intro.css` einbauen (Muster: Kind-Elemente von `.demo-device`, erben die Kipp-Animation automatisch).
8. **Kombination final machen:** wenn bestätigt, `app/` → Root, alte Ordner (`test/`, alte Root-Dateien) aufräumen; Latenz-Bug-Fix ggf. mitnehmen.
9. Optional: PNGs verkleinern (`schmetterling.png`/`Blume_2.png` ~600 KB–1,5 MB); Daten-Export für die Auswertung; die gleichen Fixes/Features nach `test/`/Root ziehen (aktuell bewusst nicht).
