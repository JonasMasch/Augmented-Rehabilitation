# Handoff — Augmented Rehabilitation (NeuroAR Reha)

Übergabe-Dokument für die Weiterarbeit in einer neuen Session.
Stand: zuletzt bearbeitet im Juni 2026.

---

## 1. Ziel des Projekts

Prototypische **AR-/Web-App zur Rehabilitation von Neglect** (einseitige
Aufmerksamkeitsstörung, meist nach Schlaganfall – betroffene Seite i. d. R. **links**).
Bachelorarbeit. Läuft rein im Browser auf **Tablet/Smartphone** (bevorzugt **Tablet**),
**Vanilla HTML/CSS/JS, keine Build-Tools, keine Dependencies**, später Hosting über
**GitHub Pages** (statisch).

**Konzept: 3 Spiele × je 3 Stufen**
- **Suchen** – Objekt durch Drehen des Geräts in die Mitte (Zielkreis) bringen.
  1) Visuell (Marienkäfer → Blatt) · 2) Audio-visuell (Uhu → Astkreis) · 3) Sequenz (3 Käfer 1-2-3 → Blatt)
- **Verfolgen** – driftendes Objekt im mittigen Kreis halten (30→15 s Durchgang, %-Auswertung, ab 50 % „geschafft").
  1) Visuell (Schmetterling → Blume) · 2) Audio (Uhu → Astkreis) · 3) Verschwinden (Objekt blinkt kurz weg)
- **Lenken** (früher „Führen") – Schnecke per Neigen (Touch-Drag simuliert Neigen) zum Salat rollen.
  1) Gerade Bahn · 2) Kurviger Weg (1 Hindernis) · 3) Labyrinth (2 Hindernisse)

Steuerung aktuell überall **Pointer-Drag** (Finger ziehen). Echte **Bewegungssensor-Steuerung**
ist bewusst zurückgestellt (siehe Abschnitt 4).

---

## 2. Aktueller Stand des Codes

**Struktur (sauber getrennt, alles im Projekt-Root):**
```
index.html        Startseite (3 Spiel-Kacheln + Tages-Fortschrittsbalken, Profil-Button)
suchen.html / verfolgen.html / lenken.html   die 3 Spiele
profil.html       Profil (Name, Stats, Wochenkalender, Medaillen) + Link zu Einstellungen
settings.html     Einstellungen (Mein Training / Ton / Darstellung / App)
ueber.html, datenschutz.html   Platzhalter-Infoseiten
css/   common.css (geteilt) + je eine pro Modul + erika.css + intro.css + profil.css + settings.css
js/    common.js, erika.js, intro.js, badges.js, session.js, settings.js, settings_page.js,
       suchen.js, verfolgen.js, lenken.js, profil.js
assets/  alle SVG-Grafiken (+ ASSETS.md mit Namens-Liste) — von der Nutzerin in Illustrator erstellt
files/   ALTE Original-Übergabe + alte Monolith-HTMLs (suchen_modul.html, verfolgen_modul.html) — nur Referenz/Backup
```

**Fertige Features:**
- Alle 3 Spiele × 3 Stufen funktionsfähig (Touch-Steuerung).
- Gemeinsames **Hauptmenü** (index.html): 3 weiße Kacheln nebeneinander (Icons aus assets/), Schatten,
  darunter Tages-Fortschrittsbalken („Heutiges Training X/Y min").
- **Erika** (Assistenzfigur, `erika.js`/`erika.css`): schwebt unten rechts (`assets/erika_figur.svg`),
  wird in der Übung zum kleinen Icon (`assets/erika_icon.svg`); Antippen in der Übung → **Pause-Menü**
  (Weiterspielen / Neu starten / Zurück zur Übersicht).
- **Profil** (`profil.js`): Name (editierbar), „seit X Tagen dabei", Sessions, Gesamtzeit, Streak (🔥),
  Wochenkalender, Medaillen-Wall.
- **Medaillen** (`badges.js`): 4 Kategorien (Erste Schritte / Pro Spielart / Regelmäßigkeit / Gesamtleistung),
  live aus Statistik berechnet (kein separates Vergeben). Antippen zeigt Info-Popup.
- **Fortschritt/Statistik** (`session.js`, localStorage `neuroar_stats`): Trainingszeit pro Tag, Streak,
  Zieltage (= „Sessions" = Tage mit erreichtem Tagesziel). Übungen rufen `addTrainingSeconds()` beim Abschließen.
  Übungs-Zähler in `badges.js` (localStorage `neuroar_progress`, z. B. `suchen_1`, `lenken_3`).
- **„Abgeschlossen"-Markierung** (grünes ✓) auf den Stufen-Karten via `markStageCards()`.
- **Einstellungen** (`settings.js` store + `settings_page.js`): Mein Training (betroffene Seite L/R,
  Sitzungsdauer 10–25, tägliche Erinnerung + Uhrzeit), Ton (an/aus, Lautstärke, Erika-Sprachausgabe),
  Darstellung (Schriftgröße klein/mittel/groß mit Live-Vorschau), App (Über/Datenschutz-Links).
  **WICHTIG: Diese Werte sind gespeichert, aber die Übungen lesen sie noch NICHT aus** (außer
  `sessionDuration` für den Tages-Balken). Siehe nächste Schritte.
- **Grafiken:** Spielobjekte und Ziele sind SVGs (assets/), mit **gleichmäßigem weißem Rand** über einen
  SVG-Filter (`#whiteOutline` in `common.js`, Klasse `.outlined`). Größen: Objekte 77 px, Ziele 120 px.
- **Erklär-Animationen / Intro** (`intro.js`/`intro.css`): Beim **ersten** Öffnen jeder Stufe läuft eine
  kurze Demo-Animation (danach über „?"-Button erneut). „Gesehen"-Status in localStorage `neuroar_intros_seen`.
  - Suchen/Verfolgen: **aufrecht gehaltenes Tablet** (gezeichnet), schwenkt; auf dem Mini-Bildschirm passiert die Übung.
  - Lenken: **flach gehaltenes, kippendes Tablet** (rotateX-Perspektive), Schnecke rollt zum Salat.
  - Demos sind pro Stufe in der jeweiligen `DEMOS`-Konstante im Modul-JS definiert; Animationen als
    CSS-@keyframes in `intro.css`.
- **Audio** (Web Audio API über `createTone()` in common.js):
  - Suchen Stufe 2: Lautstärke ∝ Nähe zur Mitte **+ Stereo-Panning** (Ton kommt von der Seite des Objekts).
  - Verfolgen Stufe 2: **konstante Lautstärke**, dafür **deutliches Stereo-Panning** (links/Mitte/rechts).
    Die 5 Balken zeigen dort die **Richtung** (nicht Lautstärke), Label „Ton-Richtung".

**Wichtige Konventionen / Stolperfallen:**
- Lenken heißt im UI „Lenken", **intern aber weiterhin `lenken`** (Dateien `lenken.*`, IDs `lenken_1..3`).
  Frühere `fuehren_*`-Fortschrittsdaten werden in `badges.js` einmalig auf `lenken_*` migriert.
- Globale Objekte für Module global gemacht via `window.X = X` (sonst landet `const` nicht auf `window`) —
  betrifft `Erika` (`window.Erika`) und `Intro` (`window.Intro`).
- Der weiße-Rand-Filter wird von `common.js` per JS in `document.body` injiziert (einmalig).
- Lenken: optische Schneckengröße (`SNAIL_SIZE=92`) ist **entkoppelt** vom Kollisionsradius (`ballR=38`),
  damit die große Schnecke durchs Labyrinth passt (Nase darf Wände leicht berühren).

---

## 3. Dateien, die aktiv bearbeitet werden

Zuletzt am häufigsten angefasst (hier spielt die aktuelle Arbeit):
- **`js/suchen.js`, `js/verfolgen.js`, `js/lenken.js`** — Spiel-Logik, Audio, Demo-Definitionen.
- **`css/intro.css`** + **`js/intro.js`** — die Erklär-Animationen (zuletzt intensiv iteriert).
- **`assets/`** — die Nutzerin lädt fertige SVGs hoch; ich binde sie ein (als `<img>`, mit `.outlined`).
- **`css/common.css`** — geteilte Styles (Karten, Buttons, Zielkreis, Audio-Balken, Outline-Filter-Klasse).

Seltener, aber zuletzt verändert: `index.html` (Kacheln/Layout), `js/badges.js` (Medaillen),
`js/session.js` (Statistik), `settings.*`, `profil.*`, `erika.*`.

---

## 4. Was probiert wurde und (noch) NICHT klappt / zurückgestellt ist

- **Bewegungssensor-Steuerung (DeviceOrientation/DeviceMotion):** Mehrfach versucht (siehe alte
  `files/projektuebergabe_claude_code.md`) — sprunghafte Werte, Gimbal-Lock bei senkrechter Haltung,
  iOS-Permission-Themen, zuletzt gar keine Events. **Bewusst zurückgestellt**, bis alle Inhalte fertig sind.
  Empfehlung bei Wiederaufnahme: erst eine isolierte Test-Seite, die nur Rohwerte live anzeigt.
- **Audio „oben/unten" hörbar machen:** nicht sinnvoll möglich. Stereo-Panning kann nur links/rechts;
  Höhenlokalisation funktioniert über Tablet-Lautsprecher praktisch nicht. Daher nur **links/rechts** umgesetzt.
  (Optionen für später: Tonhöhe an oben/unten koppeln, oder 3D-PannerNode/HRTF — geringer Mehrwert auf Lautsprechern.)
- **Visualisierung der Schallrichtung in Suchen St. 2:** zwei Varianten gebaut und wieder verworfen
  (Rand-Glow links/rechts; „Schallwellen" vom Objekt zur Mitte). Aktuell **keine** Sicht-Hilfe in Suchen aktiv
  (nur Stereo-Audio). In Verfolgen St. 2 zeigen die Balken die Richtung.
- **Lenken-Labyrinth mit großer Kollisionskugel:** eine echte 77-px-Kollision passt nicht durch die alten
  engen Korridore → gelöst durch Entkopplung (siehe oben) und großzügigere Level (St. 2 jetzt 1 Hindernis,
  St. 3 jetzt 2 Hindernisse).
- **Demo-„Kipp"-Richtung Lenken:** mehrfach invertiert/justiert (rotateX/rotateY-Vorzeichen) — sitzt jetzt,
  aber falls die flache Tablet-Darstellung überarbeitet wird, die Vorzeichen erneut prüfen.

---

## 5. Mögliche nächste Schritte

**Naheliegend / offen:**
1. **Einstellungen wirksam machen** (aktuell nur gespeichert):
   - *Betroffene Seite* (links/rechts) → Objekt-/Zielseite in Suchen (`randSide()`) und Lenken steuern;
     aktuell ist „links" fest einprogrammiert (Suchen `randSide` 78 % links).
   - *Ton & Lautstärke* → globaler Master-Gain / Stummschaltung in `createTone()`/setupAudio.
   - *Schriftgröße* global anwenden (z. B. CSS-Variable auf `:root`, von allen Seiten gelesen).
   - *Tägliche Erinnerung/Uhrzeit* → im reinen Browser nur eingeschränkt möglich (Notifications API/PWA);
     Machbarkeit prüfen.
   - *Erika-Sprachausgabe* → Web Speech API (`speechSynthesis`) für Erikas Texte.
2. **Impressum/Datenschutz** (`ueber.html`, `datenschutz.html`) mit echten Inhalten füllen.
3. **Audio weiter verfeinern** (falls gewünscht): Klang angenehmer, Mitte/Links/Rechts noch klarer trennen.
4. **Demo-Animationen** finalisieren / ggf. eigene Tablet-Grafik der Nutzerin einbauen (statt im Code gezeichnet).

**Später (laut Absprache):**
5. **Bewegungssensor-Steuerung** erneut versuchen (siehe Abschnitt 4), sobald alle Inhalte stehen.
6. **GitHub Pages Deploy:** Projekt-Root hochladen. **Achtung:** alte `files/fuehren.*` nicht nötig;
   wenn vorher schon mal `fuehren.*` hochgeladen wurde, dort löschen. `index.html` ist die Startseite.
7. Optional: Daten-Export (Trainingsverlauf) für die Bachelorarbeit/Auswertung.

---

## Nützliches zum Testen (localStorage-Keys)
- `neuroar_progress`  — Übungs-Zähler (z. B. `{ "suchen_1": 3, "lenken_2": 1 }`)
- `neuroar_stats`     — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, userName)
- `neuroar_settings`  — Einstellungen
- `neuroar_intros_seen` — welche Erklär-Demos schon automatisch liefen
  → `localStorage.removeItem('neuroar_intros_seen')` + neu laden = Erst-Demos wieder auslösen.
