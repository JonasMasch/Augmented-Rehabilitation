# Handoff — AURA

Übergabe-Dokument zur Weiterarbeit in einer neuen Session.
**Stand: September 2026.** Aktiver Entwicklungsstand ist `app/`.

> **Lesereihenfolge:** Abschnitt 1 und 2 sind Pflicht (Arbeitsregeln, sonst geht Zeit verloren).
> Abschnitt 3 sagt, was als Nächstes ansteht. Der Rest ist Nachschlagewerk — besonders
> **Abschnitt 16 (Fallen)**, dort steht gesammelt, was schon mehrfach Zeit gekostet hat.

---

## 1. Was das Projekt ist

Prototypische **AR-/Web-App zur Rehabilitation von Neglect** (einseitige Aufmerksamkeitsstörung,
meist nach Schlaganfall, betroffene Seite in der Regel **links**). Bachelorarbeit von Jonas Masch.
Läuft rein im Browser auf **Tablet/Smartphone**, bevorzugt **Querformat**.
**Vanilla HTML/CSS/JS, keine Build-Tools, keine Dependencies, keine externen Netzabrufe zur
Laufzeit** (Schriften, Icons, Bilder alle lokal, kein CDN). Hosting über GitHub Pages.

**Konzept: 3 Spiele × je 3 Übungen**, jeweils per Bewegungssensor ODER Finger steuerbar:

| Spiel | Aufgabe | Übung 1 | Übung 2 | Übung 3 |
|---|---|---|---|---|
| **Suchen** | Objekt durch Drehen/Neigen in die Mitte bringen | Visuell (Marienkäfer → Blatt) | Audio-visuell (Uhu → Astkreis) | Sequenz (3 Käfer 1-2-3) |
| **Verfolgen** | driftendes Objekt im mittigen Kreis halten (%-Auswertung) | Visuell (Schmetterling → Blume) | Audio (Uhu → Astkreis) | Verschwinden (Objekt blinkt weg) |
| **Lenken** | Schnecke per Neigen zum Salat rollen | gerade Bahn | drei Salate (Reihenfolge egal) | Labyrinth (2 Hindernisse) |

Alle drei liegen unter der Kategorie **„Tiere"**.

**Namens-Konventionen — nicht umbenennen:** Im sichtbaren UI heißt alles „Übung 1/2/3",
im Code weiterhin „Stufe" (`beginStage`, `markStageCards`, `data-stage`). Die Modi heißen im UI
„Einfach"/„Erweitert", intern `patient`/`pflege`. Die Assistenzfigur heißt im UI „AURA", intern
überall `Erika` (`erika.js`, `.erika-*`, Setting `erikaVoice`). Das ist bewusst so und hängt an
localStorage-Schlüsseln und CSS-Selektoren.

---

## 2. ⚠️ Arbeitsregeln — ZUERST LESEN

**Repo:** `JonasMasch/Augmented-Rehabilitation` (public), Branch `main`. `gh` CLI ist als
**JonasMasch** eingeloggt, committen und pushen ist möglich.
**Live:** https://jonasmasch.github.io/Augmented-Rehabilitation/app/

### Nur `app/` bearbeiten
Root und `test/` sind eingefrorene Sicherungen (siehe Abschnitt 4). Einzige Ausnahme im Root ist
`.nojekyll` — das ist Pages-Infrastruktur, keine App-Datei.

### Cache-Busting bei JEDER Änderung an `app/css/` oder `app/js/`
Alle Einbindungen tragen `?v=N`, aktuell **`?v=111`**. Vor dem Bump den echten Stand prüfen, diese
Zahl hier veraltet erfahrungsgemäß schnell:

```bash
grep -o '?v=[0-9]*' app/index.html | sort -u
```

Dann hochzählen:

```bash
perl -pi -e 's/\?v=111"/?v=112"/g' app/*.html
```

Reine HTML-Textänderungen und `<style>`-Blöcke *innerhalb* einer HTML-Datei brauchen keinen Bump.
`assets/Hand.svg` wird bewusst OHNE `?v=` eingebunden und braucht bis zu 10 Minuten.

### Testen läuft über Push, nicht lokal
**DeviceMotion/DeviceOrientation und `getUserMedia` liefern nur über HTTPS.** `file://` und
LAN-`http://` reichen nicht. Deshalb wird jeder Stand zum Testen gepusht:

```bash
git add -A && git commit -m "..." && git push origin main
```

Danach ~1 Minute auf den Pages-Build warten. Prüfen:

```bash
gh api repos/JonasMasch/Augmented-Rehabilitation/pages/builds/latest --jq '{status,error:.error.message}'
```

Hängt ein Build lange auf `"building"`, hilft ein leerer Commit (`git commit --allow-empty -m
"rebuild" && git push`). Schlägt er fehl: prüfen, ob `.nojekyll` noch im Root liegt — **ohne diese
Datei crasht der Build**, GitHub versucht sonst mit Jekyll zu bauen (im August 2026 real passiert,
mehrere Commits in Folge, generische Meldung „Page build failed.").

### Frisch am Gerät testen
Pages setzt `max-age=600` auf HTML/CSS/JS. Statt zehn Minuten zu warten einen noch nie benutzten
Query-Parameter anhängen, Zahl bei jedem Test hochzählen:

```
https://jonasmasch.github.io/Augmented-Rehabilitation/app/suchen.html?frisch=7
```

Dafür kann unmöglich eine alte Antwort im Cache liegen. **Beim Diagnostizieren gemeldeter Fehler
IMMER zuerst sicherstellen, dass frisch geladen wurde** — das hat mehrfach zu falschen Fährten
geführt, weil eine alte Version getestet wurde.

Bei der **installierten PWA** („Zum Startbildschirm hinzufügen") funktioniert der Trick nicht, es
gibt kein Adressfeld. Dort entweder ~10 Minuten warten oder vorher in einem normalen Tab mit
`?frisch=N` gegenprüfen, dass die Änderung angekommen ist.

### Lokale Vorschau (nur für Layout, Farben, JS-Konsole)
Der eingebaute Preview-Server darf `~/Documents` nicht lesen (macOS TCC). Deshalb: Projekt ins
Scratchpad rsyncen und von dort servieren.

```bash
rsync -a --delete --exclude '.git' "/Users/jonas/Documents/DHBW/Bachelor Code/" "$SCRATCH/site/"
```

Dazu ein `http.server`-Handler mit `directory=`-Kwarg und `Cache-Control: no-store`, Port z. B.
8101 (freien Port mit `lsof -i :<port>` prüfen). Der Scratchpad wird zwischen Sessions manchmal
geleert, `serve.py` dann neu anlegen. **Sensorik und Kamera gehen lokal nicht.**
Zu den Eigenheiten der Vorschau siehe Abschnitt 16 — die haben mehrfach falsche Fehler vorgetäuscht.

### Kein Node auf diesem Rechner
Für JS-Tests stattdessen JavaScriptCore:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc datei.js
```

Bewährtes Muster für Logik-Tests: die zu prüfende Funktion per `readFile` + `new Function` aus der
echten Quelldatei herausschneiden und mit Ersatz-Abhängigkeiten aufrufen. So wurde die
Flow-Mischung und die Salat-Verteilung über je 20.000 Durchläufe geprüft. Auch ein reiner
Syntax-Check geht so:

```bash
jsc -e "try{new Function(readFile('app/js/suchen.js'));print('OK')}catch(e){print(e)}"
```

---

## 3. Nächste Schritte

Empfohlene Reihenfolge. Begründung: Offline muss zuletzt (der Service Worker friert Dateiliste und
URLs ein), das Verschieben nach Root davor (URLs und Scope ändern sich), die finalen Bilder davor.

### 3.1 Finale Bilder — **das steht als Nächstes an, wartet auf den Nutzer**
Echte Zeichnungen, fotografiert und in Photoshop freigestellt, also **PNG mit Alphakanal**.
Spezifikation ist abgestimmt:

- **Bewegte Objekte** (Käfer, Uhu, Schmetterling, Schnecke, Salate) werden mit **92 px** angezeigt
  → lange Kante **~280 px** liefern (dreifach, deckt hochauflösende Tablets).
- **Zielobjekte** (Blatt, Blume, Astkreis) werden mit **120 px** angezeigt → **~360 px**.
- **Quadratisch freistellen, Motiv zentriert** (Anzeige ist quadratisch mit `object-fit:contain`).
- **Keinen weißen Rand einzeichnen** — die App legt ihn selbst per SVG-Filter darüber
  (`#whiteOutline` / `.outlined`, bewegte Objekte nutzen das günstigere `.lite-outline`).
- **⚠️ Kontrast mitdenken:** Die Kachel-Icons liegen auf dem App-Grün `#85d67d`. Gemessen erreichen
  Suchen und Lenken nur 2,28:1, Verfolgen 1,85:1 gegen den Kachelgrund — WCAG verlangt 3:1 für
  grafische Elemente. Ursache: Blatt und Salat sind grün auf grünem Grund, die Motive stammen aus
  der Zeit des dunklen Hintergrunds. Bei den neuen Bildern gleich mitlösen.
- Die vorhandenen Platzhalter sind rund zehnmal zu groß (`Blume_2.png` 1,4 MB, `schmetterling.png`
  1,1 MB). Beim Ersetzen fällt das Gewicht der App deutlich — relevant für den Offline-Schritt.

### 3.2 App-Icon — wartet auf den Nutzer
Quadratisches PNG, mindestens 512 × 512. Daraus entstehen die 192er-Variante und eine
maskable-Fassung mit Sicherheitsrand. `manifest.json` verweist derzeit nur auf
`assets/erika_icon.svg`.

### 3.3 `app/` → Root verschieben, alte Versionen aufräumen
Muss **vor** dem Offline-Schritt passieren, weil sich URLs und Scope des Service Workers ändern.
Betrifft die eingefrorene Root-Version und `test/`.

### 3.4 Offline (Service Worker)
Zuletzt. Gute Nachricht: null externe Netzabrufe zur Laufzeit, es geht also nur ums Cachen der
eigenen Dateien. Der `?v=N`-Zirkus aus Abschnitt 2 fällt damit weg. Ein Umstieg auf **Capacitor
wurde geprüft und verworfen** — dessen Motion-Plugin nutzt dieselben Web-APIs, bringt für die
Sensorik also nichts.

### 3.5 Kleinere offene Punkte
Siehe Abschnitt 17 („Bewusst offen gelassen"). Die beiden wichtigsten: **„Betroffene Seite"** und
**„Tägliche Erinnerung"** sind Schalter ohne Funktion.

---

## 4. Die drei Versionen im Repo

| Ordner | URL | Rolle |
|---|---|---|
| **`app/`** | `…/Augmented-Rehabilitation/app/` | **AKTIV — hier weiterarbeiten** |
| `/` (Root) | `…/Augmented-Rehabilitation/` | alte freie Version — FROZEN (Sicherung) |
| `test/` | `…/Augmented-Rehabilitation/test/` | alte geführte Version — FROZEN (Sicherung) |

Root und `test/` bleiben unverändert, bis der Nutzer entscheidet, `app/` zur Hauptversion zu machen.
`app/` teilt sich `localStorage` mit ihnen (gleiche Origin), hat aber eigene Kopien aller Dateien.

**Weitere Ordner im Root, gehören nicht zur App:**
- `labor/` — Sensor-Labor (Achsen isoliert testen, Vorzeichen/Verstärkung live umschalten,
  Übersprechen messen) und `labor/vibration.html`. Lädt die ECHTE `app/js/orientation.js`.
- `test-sensorik/` — Node-Testsuite, prüft `app/js/orientation.js` direkt. Stand 21/21.
  Nicht mit der eingefrorenen `test/`-Version verwechseln.
- `app/sensor-check.html` — Diagnoseseite.
- Im Root-`assets/` liegt eine `Hand.svg`, die der Nutzer dort abgelegt hat (Duplikat der
  `app/assets/Hand.svg`, uncommitted, gehört nicht zur aktiven Version).

`.gitignore` schließt `.DS_Store`, `.claude/` und `assets/Hintergrund.jpg` aus.

---

## 5. Struktur von `app/`

```
app/
  index.html      Startseite (Einfach: Spielen-Knopf · Erweitert: Kategorien Tiere/Essen/Fotos)
  tiere.html      Kategorie "Tiere": die 3 Übungs-Kacheln
  suchen/verfolgen/lenken.html   die 3 Spiele (?flow=n = geführt, ohne = standalone)
  settings.html   Einstellungen
  ueber.html / datenschutz.html
  sensor-check.html   Diagnoseseite
  manifest.json   PWA-Manifest (orientation: landscape)
  css/   common · erika · intro · settings · suchen · verfolgen · lenken
  js/    common · erika · intro · badges · session · settings · settings_page
         orientation (OrientationControl + TiltControl + SensorConvention)
         kamera · flow · suchen · verfolgen · lenken
  assets/  SVGs + PNGs + Hintergrund.jpeg + hintergrund_lenken.jpeg
           + fonts/ (Luciole) + icons/ (Lucide-SVGs + LICENSE) + Hand.svg
```

Kern-Globals via `window.X`: `Erika`, `Intro`, `OrientationControl`, `TiltControl`,
`SensorConvention`, `Kamera`, `Flow`.

**Skript-Reihenfolge (Übungsseiten):** `common → erika → intro → badges → settings → session →
orientation → kamera → <spiel> → flow`. Wichtig: `settings.js` VOR `flow.js` (flow liest
`audioExercises`) und vor `kamera.js`. `index.html` lädt `settings → session → erika → orientation
→ flow` und **kein `common.js`** (siehe Abschnitt 16, Namenskollisionen).

---

## 6. Modus-System: Einfach / Erweitert

Umschaltbar in den Einstellungen (`mode`, Standard `patient`). Umschaltung über `data-mode` am
`<html>`, früh per Inline-Script im `<head>` gesetzt (kein Flackern).

- **`patient` = „Einfach"**: Startseite zeigt „▶ Spiel starten" → geführter linearer Ablauf durch
  alle Übungen (`flow.js`), Reihenfolge **zufällig** (Abschnitt 10.4). Erfolgs-Button „Weiter".
- **`pflege` = „Erweitert"**: Startseite zeigt eine Kategorienauswahl (Tiere / Essen / Fotos).
  Nur „Tiere" ist aktiv und führt auf `tiere.html`. Essen und Fotos sind ausgegraute Platzhalter
  (`.game-tile.soon`) mit Toast „Bald verfügbar". Übungen standalone, Erfolgs-Button „Nochmal".

```
index.html (Kategorien)
  └─ Tiere → tiere.html (Suchen / Verfolgen / Lenken)
       └─ je Übung → suchen/verfolgen/lenken.html (Übungsauswahl 1-3)
            "Zurück zur Tierauswahl" → tiere.html
            "Zurück zum Menü"        → index.html
  └─ Essen / Fotos → ausgegraut, Toast, keine Navigation
```

**Modus-abhängige Einstellungen:** Im Einfach-Modus zeigt die Einstellungsseite nur **Modus,
Trainingsübersicht, App**. Der Rest ist `.pflege-only`.

**Schalter „Audio-Übungen"** (`audioExercises`, Standard an): AUS → die Uhu-Übungen (Suchen 2 und
Verfolgen 2) fallen aus dem geführten Ablauf (7 statt 9 Übungen).

**Schalter „Farbenblind-Modus"** (`colorblindMode`, Standard aus): setzt `data-colorblind="true"`
am `<html>` → `filter: contrast(1.15) saturate(1.6)` auf `body`. Generischer Kontrastfilter, keine
gezielte Farbfehlsichtigkeits-Korrektur.

---

## 7. Neglect-Layout — freie Randzonen

Kernidee: Da die betroffene Seite meist links liegt, bleiben im **Einfach-Modus** definierte
Randzonen frei von **Bedienelementen** — links 40 %, rechts 5 %, oben 5 %, unten 7 %.

Zentraler Block am Ende von `common.css`: `--free-left: 40vw`, `--free-right: 5vw`,
`--free-top: 5dvh`, `--free-bottom: 7dvh`, sonst überall `0`. Aktiv über
`html[data-mode="patient"]` (Startseite) **ODER** `html.flow-mode` (geführte Übung, `?flow=n`).

**Betroffen:** `.home` (Startseite), `.hud` (Übungs-Kopfblock), die Vollflächen-Overlays
`.success` / `.erika-pause` / `.erika-info` / `.intro-overlay` (Backdrop bleibt ganzflächig, nur der
Inhalt rückt).

**Ausrichtung innerhalb der Zone — die drei Fälle unterscheiden sich bewusst:**
- `.intro-overlay` und `.erika-pause`: **linksbündig** an der 40-%-Kante. Sie sind breit genug
  (Erklärkarte 440 px), das wirkt ausgewogen.
- `.success`: **mittig in der Zone**, `align-items:center` → Mitte bei **67,5 %** der
  Bildschirmbreite (zwischen `--free-left` und `--free-right`, die rechte 5-%-Zone bleibt frei).
  Auf Nutzerwunsch geändert: der Block ist mit ~208 px schmal und klebte an der Kante.
- `.hud`: linksbündig an der Kante, Kinder darin zueinander zentriert.

**Ausgenommen — dürfen überall hin:** die Übungsobjekte selbst (Zielkreis, per JS über
`innerWidth`/`innerHeight` positionierte Käfer/Schnecke/Salate). Die Spielgeometrie bleibt bewusst
px-basiert.

**Fest verdrahtete Ausnahmen (modusunabhängig immer am Rand):** der „?"-Button
(`.erika`/`.erika-info-fig` in `erika.css`: `right:5vw; bottom:7dvh`), der Einstellungen-Button
(`.top-actions` in `index.html`: `top:5dvh; right:5vw`) und der „Fertig"-Button (`.done-btn` in
`settings.css`). Nur die **Größe** bleibt modusabhängig. **Die Einstellungen bleiben in beiden Modi
mittig** — bewusste Ausnahme.

Die Kacheln bleiben zentriert mit `max-width:560px`, bewusst NICHT an die 5-%-Position angeglichen
(einmal versucht, auf Nutzerwunsch zurückgebaut).

---

## 8. Aussehen & Barrierefreiheit

- **Schrift: Luciole** (für Sehbeeinträchtigte optimiert, CC-BY 4.0). Dateien unter
  `app/assets/fonts/`, `@font-face` in `common.css`, Attribution in `ueber.html`.
  `button`/`input` erben die Schrift explizit.
- **Hintergrund:** blauer Verlauf `linear-gradient(135deg, #196e91, #0a5078)` global über `.cam-bg`.
  Übungs-Screens überschreiben das mit Foto-Hintergründen (`#screen-level .cam-bg`).
- **Primärgrün `#85d67d`:** „Spiel starten", alle Kacheln, aktiver Segmented-Zustand,
  Toggle-„an", Tagesübersicht-„trainiert", Lautstärke-Regler, „Fertig"-Button, Intro-Button,
  Zeitbalken-Füllung. Mint `#34d399` ist noch an anderen Stellen in Gebrauch (Audio-Balken,
  Lenken-Zielglühen, Objektfarben) — dort nicht angefragt, bewusst gelassen. Lila `#a78bfa` nur
  noch in den Demo-Animationen und als Übung-1-Objekt-Tint.
- **rem-basiertes Größen-System:** Alle UI-`font-size`/`padding`/`gap` sind rem. Zentraler Hebel ist
  die Wurzel-Schriftgröße via `data-fontsize` am `<html>`: `klein`=14px, `mittel`=16px (Standard),
  `gross`=19px, früh im `<head>` gesetzt. **Grenze: die Spielgeometrie bleibt px** — NICHT auf rem
  umstellen, sonst wandern Objekte aus dem Bild.
- **Optische Textzentrierung:** CSS-Variable `--optische-mitte: 0.14em` in `common.css`. Luciole hat
  eine asymmetrische Metrik (Ascent 12 : Descent 3), Text saß rund 2–3 px zu hoch. Ausgeglichen über
  asymmetrischen Innenabstand, Boxhöhen bleiben gleich. Zwei Sonderfälle sind im CSS kommentiert,
  siehe Abschnitt 16.
- **Kachel-Größe zentral:** `.game-tile` und `.cards-row .card` sind gemeinsam in `common.css`
  definiert, feste `height:clamp(140px,28vh,252px)`, `max-width:560px` für die Reihe — damit alle
  vier Kontexte gleich groß sind, unabhängig vom Inhalt.
- **Buttons:** Weiß + Schatten (`box-shadow:0 6px 14px rgba(0,0,0,0.45)`) für „?", Einstellungen und
  alle „Zurück"-Buttons in `app/` (per Seiten-Override; `ueber.html`/`datenschutz.html` behalten den
  alten halbtransparenten Standard aus `common.css`). Erfolgs-Buttons beide `min-width:13rem`, damit
  „Weiter"/„Nochmal" und „Beenden" gleich groß sind.
- **Schatten-Konvention:** Nur tatsächlich klickbare Elemente bekommen einen Schatten.
  `.setting-row` (reiner Container) und `.stat-card`/`.week-row` (reine Anzeige) haben keinen.
- **Kontrast:** Ein Audit mit real durchgerechneter WCAG-Formel wurde gemacht. **Lehre daraus: immer
  explizit `color` setzen, nie auf geerbte Werte verlassen** — beide gefundenen Bugs (Zahnrad- und
  Stift-Icon rendered schwarz auf blauem Verlauf) hatten genau diese Ursache.
  Offen ist der Icon-Kontrast auf den Kacheln, siehe Abschnitt 3.1.

---

## 9. AURA (intern `Erika`)

Schwebt unten rechts, Randabstand immer 5 % rechts / 7 % unten.

| Zustand | Wo | Aussehen | Klick |
|---|---|---|---|
| `collapsed` | index, tiere, settings, Übungsauswahl-Screens | „?"-Button | Info-Overlay |
| `compact` | während einer Übung | „?"-Button (gleich aussehend) | Pausemenü |
| normal | `ueber.html`, `datenschutz.html` | große Figur | Sprechblase |
| `paused` | Pausemenü offen | große Figur | — |

Praktisch alle Hauptseiten rufen `Erika.startCollapsed()` auf. Nur `ueber.html` und
`datenschutz.html` zeigen noch die große Figur (nicht angefragt).

- **„?"-Button** (`.erika-help-btn`): quadratisch, Icon `circle-question-mark`, `3.2rem` im
  Einfach-Modus, `2.6rem` im Erweitert-Modus. Auf den Übungsseiten ist die Logik **umgekehrt**:
  dort ist die kleine Variante der DEFAULT und `html.flow-mode` schaltet auf groß, weil diese
  Seiten kein `data-mode` setzen, sondern nur `flow-mode` bei `?flow=n`.
- **Gemeinsamer Handler `onTrigger()`** für Figur und „?"-Button: Übung aktiv → Pausemenü (aber nur,
  solange es nicht schon offen ist — schließen geht nur über die drei Buttons); `collapsed` →
  Info-Overlay; sonst → Sprechblase.
- **Info-Overlay** (`.erika-info`): abgedunkelt, Figur an ihrem Platz, weißes Textfeld, grüner
  Knopf **„Schließen"** mit X-Icon. Der hieß früher „Zurück zur Startseite" und navigierte nie —
  auf fünf von sechs Seiten war das schlicht falsch.
- **Pausemenü** (`.erika-pause`): Tutorial-Demo oben, darunter Weiterspielen (grün, fett) /
  Neu starten / Zurück zur Übersicht.
- **Texte:** Begrüßung „Hallo, ich bin AURA! Wie kann ich dir heute helfen?", danach zufällige
  Tipps. Ist in den Einstellungen ein Name hinterlegt, spricht AURA ihn mit an (`pickText()` liest
  `getUserName()` aus `session.js`, abgesichert über `typeof`).
- **Sprachausgabe:** Web Speech API, `de-DE`, verlangt **beide** Schalter („Ton" UND
  „Sprachausgabe AURA") — wer den Ton ausschaltet, erwartet auch von AURA Stille. Lautstärke folgt
  dem Regler. Bricht bei `pagehide` ab, sonst redet die Stimme in die nächste Seite hinein.

---

## 10. Die drei Spiele

### 10.1 Gemeinsames

- **Kopfblock `.hud`** (`common.css`): fasst den Hinweistext `.instr` und was direkt darunter gehört
  zu einem Flex-Spalten-Block zusammen — die 1-2-3-Punkte in Suchen 3, den Zeitbalken in Verfolgen.
  Der Block ist nur so breit wie sein breitestes Kind, die Kinder sind darin **zueinander
  zentriert**. `.instr` hat dadurch keine eigene Positionierung mehr, die Modus-Umschaltung sitzt an
  `.hud`. Abstände kommen aus `gap`, nicht aus gerechneten `top`-Werten. Ein ausgeblendetes Kind
  erzeugt keinen Gap.
- **Erfolgs-Overlay:** `.s-col` fasst Text, Unterzeile und die beiden Buttons zusammen, gleiche
  Bauart wie `.hud`. Dadurch steht „Gefunden!" mittig über den Buttons — und umgekehrt, wenn der
  Text breiter ist (Verfolgen: „Zeit abgelaufen!"), sitzen die Buttons mittig darunter.
- **Trainingszeit:** Verfolgen und Lenken zählen in ihrer `requestAnimationFrame`-Schleife (steht
  bei Pause still, läuft im Hintergrund gar nicht) und begrenzen `dt` gegen Ausreißer.
  **Suchen hat keine Schleife** und zählt deshalb abschnittsweise über `zeitAnhalten()` /
  `zeitWeiter()` (`abschnittStart` + `aktiveZeit`), angehängt an `pauseGame`/`resumeGame`/
  `startLevel`/`logSuchenTime` und an `visibilitychange`. Nicht gezählt: Pausemenü offen, Seite im
  Hintergrund. Gezählt: Stillstand bei sichtbarer Übung — wer sucht, übt auch beim Nichtbewegen.

### 10.2 Suchen
`SEEK_ANGLE_MIN/MAX = 45/75` Grad steuert, wie weit außen das Objekt startet (~65° entspricht dem
Bildschirmrand, 75° liegt komplett außerhalb und muss erst hereingedreht werden). Bewusst über den
Rand hinaus: das Suchen soll ein echtes Abtasten der vernachlässigten Seite erfordern. Wenn es zu
schwer wirkt, MAX auf 70 senken. Links-Bias über `randSide()` (78 %).

### 10.3 Lenken — Übung 2 würfelt die Salate
`wuerfleSalate()` zieht die drei Positionen bei jedem Start neu (vorher fest). Vier Bedingungen:

1. **Links betont:** mindestens zwei der drei links, der dritte in rund einem Drittel der Fälle
   auch. **Bewusst nicht wie `randSide()`** (jedes Objekt einzeln mit 75 % nach links): bei nur drei
   Objekten kommt so regelmäßig eine Runde mit zwei Salaten rechts heraus. Die Zonen werden vorab
   verteilt.
2. Abstand zur Schnecke (sonst ist ein Salat beim Start schon eingesammelt).
3. Mindestabstand untereinander (Salat ist 120 px).
4. Vom Rand weg.

**Gemessen wird in Pixeln, nicht in Bruchkoordinaten** — ein Abstand von 0,1 bedeutet im Querformat
waagerecht deutlich mehr als senkrecht. **Die Mindestabstände wachsen mit dem Fenster**
(`max(130, min(200, h*0.28))` bzw. `w*0.20`); feste 200 px ließen im flachen Handy-Querformat jede
siebte Runde in die Rückfallebene laufen. Gewürfelt wird einmal pro Level-Start (Ergebnis in
`zielMuster`), **beim Resize nicht erneut**, sonst springen die Salate mitten im Spiel. Findet sich
kein Platz, gilt das feste Muster aus `LEVELS[2].goals`.

Geprüft über je 20.000 Durchläufe in drei Fenstergrößen: keine Überlappungen, keine Randverstöße,
Rückfallquote 0,00–0,01 %, Anteil links rund 81 %.

**Übung 1 und 3 sind unverändert fest.** Bei Übung 3 müsste ein gewürfeltes Ziel zusätzlich mit den
beiden Hindernissen verträglich sein (erreichbar, nicht in einer Wand).

### 10.4 Geführter Ablauf (`flow.js`) — zufällige Reihenfolge
Gemischt werden die **Spiele**, nicht die Übungen: innerhalb eines Spiels bleibt es bei 1 → 2 → 3,
damit nie die schwerste Stufe vor der leichtesten kommt. Ergebnis ist eine Verschränkung wie
„Verfolgen 1 · Suchen 1 · Lenken 1 · Suchen 2 · …".

`mischen()` gruppiert nach Spiel, lost dann Schritt für Schritt ein Spiel aus und nimmt dessen
nächste Übung. Zwei Einschränkungen: nicht zweimal dasselbe Spiel hintereinander, und nur Spiele,
die noch **fast am meisten** übrig haben (höchstens eins weniger als der größte Rest).
**Die zweite ist die wichtigere und war nicht offensichtlich:** ohne sie blieb in rund 6 % der Fälle
ein Spiel bis zum Schluss liegen und bildete dann doch einen Dreierblock. Mit ihr über je 20.000
Durchläufe null Dreierblöcke, längste Serie 2, Startspiel gleichverteilt.

**⚠️ Die Reihenfolge MUSS gespeichert werden** (`localStorage`, `neuroar_flow_order`). Jede Übung
ist eine eigene Seite und `?flow=n` nur ein Index — würde bei jedem Seitenaufbau neu gewürfelt,
zeigte derselbe Index auf jeder Seite etwas anderes. Gewürfelt wird genau einmal, in
`Flow.starten()`.

`flow.js` stellt **immer** `window.Flow = { starten }` bereit und macht die Übungs-Verdrahtung
(`onNext`/`goHome`/`beginStage`) nur bei `?flow=n`. **`index.html` bindet `flow.js` ein**, der
Start-Knopf ruft `Flow.starten()` statt fest `suchen.html?flow=0`.

**Wiederherstellung:** Passt `FLOW[step].page` nicht zur aufgerufenen Seite (Speicher geleert,
eingetippte URL, altes Lesezeichen), wird nicht weiter dem Index vertraut — `beginStage()` bekommt
nur die Nummer und würde sonst still die falsche Stufe starten. Stattdessen frisch würfeln,
speichern und auf der aufgerufenen Seite einsteigen; deren erster Eintrag ist immer Übung 1, weil
die Stufen aufsteigen. URL wird per `history.replaceState` mitgezogen.

---

## 11. Kamera-Hintergrund

Modul **`app/js/kamera.js`**, `window.Kamera` mit `start()` / `stop()` / `aktiviert()`.
Einstellung **`cameraBg`**, Standard **aus**, Schalter unter *Darstellung* (`.pflege-only`).
Standard aus, weil sonst schon beim ersten Start nach der Kamera gefragt würde, bevor klar ist wofür.

- **Lebenszyklus:** `start()` an **drei** Stellen — beim Laden der Übungsseite (Ende von
  `kamera.js`), in `beginStage()` vor der Erkläranimation, und in `startLevel()` nach
  `showScreen('screen-level')`. `stop()` in `goHome()` plus `pagehide`.
  **⚠️ NICHT in `cleanup()` stoppen** — das läuft auch am Anfang von `startLevel()`, die Kamera
  würde zwischen zwei Übungen neu starten und sichtbar nachbelichten.
- **Vorwärmen:** `getUserMedia` braucht je nach Gerät eine halbe bis anderthalb Sekunden bis zum
  ersten Bild. Wurde erst beim Übungsstart gefragt, sah man genau so lange das Foto. Doppelte
  `start()`-Aufrufe kosten nichts, die Funktion steigt bei laufendem Versuch sofort aus.
  Preis: auf der Übungsauswahl läuft die Kamera bereits.
- **Kein Foto-Aufblitzen:** Solange ein Versuch läuft, bekommt `#screen-level` die Klasse
  `kamera-statt-foto` und das Foto wird ausgeblendet (Spezifität (1,1,1) schlägt die (1,0,1) der
  Foto-Regeln). Man sieht das App-Blau, darauf blendet das Video auf. **Scheitert der Zugriff, nimmt
  `abbauen()` die Klasse wieder weg** — auch auf dem Pfad, der nur nachfassen will, sonst liefe die
  Übung bis zur nächsten Berührung vor leerem Blau.
  **Umgekehrt:** ~350 ms nach dem Einblenden wird das Foto wieder zugeschaltet und liegt unsichtbar
  hinter dem deckenden Video — Sicherheitsnetz, falls der Browser das Video nicht malt. Aus
  demselben Grund hat `.cam-live` bewusst keine eigene Hintergrundfarbe. Erst NACH der Überblendung
  zuschalten, sonst scheint das Foto währenddessen durch.
- **Nutzer-Geste:** Erster Versuch läuft **still**; scheitert er mit `NotAllowedError`, wird **genau
  einmal** bei der nächsten Berührung nachgefasst (`click`/`pointerup`/`touchend`, **nicht
  `pointerdown`**). Erst danach der Hinweis-Toast. Genau einmal, weil der Browser eine echte
  Verweigerung merkt und sofort wieder ablehnt.
- **`facingMode: { ideal: 'environment' }`, nicht `exact`** — mit `exact` scheitert der Zugriff auf
  Geräten mit nur einer Kamera komplett.
- **`gestoppt`-Merker:** `stop()` setzt ihn, der Erfolgs-Rückruf prüft ihn. Ohne das hinge nach
  „Übung verlassen, während der Versuch noch lief" ein Strom ohne Anzeige weiter und die Kamera
  bliebe an. Durch das Vorwärmen ist dieses Fenster real erreichbar.
- **Stirbt der Strom mitten in der Übung** (andere App greift zu, System entzieht die Kamera), fällt
  es über `track.addEventListener('ended', stop)` still aufs Foto zurück.
- **Abdunklung:** `.cam-live::after` legt `rgba(0,0,0,0.28)` über das Video, damit sich die weiß
  umrandeten Objekte abheben. **Das ist der einzige Stellwert für die Kalibrierung am Gerät** (0 = aus).
- **Datenschutz:** Abschnitt „Kamera" in `datenschutz.html` ist ergänzt.

---

## 12. Bewegungssensorik

**Der wochenlange Steuerungs-Bug ist gelöst.** `orientation.js` las `rotationRate.alpha/beta/gamma`
als Drehung um z/x/y — das ist die Konvention von `deviceorientation`. **Für `devicemotion` gilt
alpha/beta/gamma = Drehung um x/y/z**, belegt durch die W3C-Spezifikation und Chromium
(`device_motion_event_pump.cc`: `Create(gyro.x, gyro.y, gyro.z)`). Ältere Quellen im Netz nennen
noch z/x/y.

**⚠️ Zwei Annahmen aus früheren Sessions waren FALSCH und stehen hier nur als Warnung:**
1. „Die Vorzeichen sind geräteabhängig." — Nein, das war ein Trugschluss aus genau diesem Bug.
2. Die beiden `YAW_PITCH_COUPLING`-Ansätze setzten am Symptom an und mussten scheitern.
   **Nicht wieder aufgreifen.**

**Lehre:** Bei „Vorzeichen/Verstärkung passen am Gerät nicht" zuerst die **Achsen-Semantik gegen
Spezifikation und Engine-Quelltext prüfen**, statt Konstanten zu variieren.

- **Modul `orientation.js`:** `window.OrientationControl` (Suchen + Verfolgen),
  `window.TiltControl` (Lenken). Komplementärfilter für Schwerkraft (`GRAV_TAU=0.5`),
  bewegungs-gated Kalibrierung.
- **Aktuelle Vorzeichen** (hergeleitet, am Android-Tablet bestätigt):
  - `suchen.js`: `SENSOR_GAIN=3.2`, `SIGN_YAW=-1`, `SIGN_PITCH=+1`
  - `verfolgen.js`: `SENSOR_GAIN=5.0`, `SIGN_YAW=-1`, `SIGN_PITCH=-1`
  - `lenken.js`: `TILT_GAIN=1.7`, `SIGN_TILT_X=-1`, `SIGN_TILT_Y=-1` (TiltControl liefert die
    *Rollrichtung*, die Physik nutzt die *Hangrichtung* — die Umkehr sitzt bewusst in `lenken.js`,
    damit die per Testsuite abgesicherte Bedeutung von TiltControl unangetastet bleibt).
- **`SensorConvention`:** Das Vorzeichen von `accelerationIncludingGravity` wird gegen
  `deviceorientation` **gemessen** statt geraten. Android hält sich an die Spezifikation
  (flach = `{0,0,+9.81}`), iOS invertiert.
- **Fehlendes Gyroskop** wird über `onUnavailable` gemeldet, statt still nichts zu tun.
- **Sensor startet automatisch:** `requestSensorPermission(silent)` wird beim Laden mit
  `silent=true` aufgerufen. Auf Android klappt das ohne Dialog. Auf iOS schlägt der stille Versuch
  fehl, dort bleibt der Button als Fallback sichtbar; `silent=true` unterdrückt dabei die
  „Zugriff verweigert"-Meldung, die sonst wie ein echter Fehler wirkte.
- **Touch bleibt überall Fallback.** `onpointerdown` setzt den Sensor-Merker auf `false` zurück —
  ein Tipp reklamiert die Steuerung sofort zurück, echte Sensordaten übernehmen beim nächsten Tick
  genauso sofort wieder.
- **`DEBUG_SENSOR = false`** in allen drei Spiel-Dateien. Auf `true` setzen für eine Live-Anzeige
  unten links, wenn wieder fern-diagnostiziert werden muss.

---

## 13. Erkläranimationen und Tutorial-Hände

- **`intro.js`** zeigt beim ersten Öffnen einer Übung eine Demo-Animation (`DEMOS[n]` in den drei
  Spiel-Dateien: `{ title, scene, text }`). Titel-Format „Suchen – Übung 1". Knopf „Spiel starten".
  Karte weiß mit dunklem Text, Backdrop bleibt dunkel. Einstellung „Erklärung immer zeigen"
  (`alwaysShowIntro`) lässt sie bei jedem Öffnen laufen.
- Dieselben `scene`-Definitionen werden **im Pausemenü** wiederverwendet (`erika.js showDemo()`).
  Änderungen also immer in beiden Kontexten und in beiden Modus-Größen prüfen.
- **Hand-Grafiken** (`app/assets/Hand.svg`) bei allen neun Demos: einmal rechts unverändert, einmal
  links per `transform:scaleX(-1)` gespiegelt (anatomisch korrekt, linke und rechte Hand sind bei
  symmetrischem Griff Spiegelbilder). Beide sind Kinder des Tablet-Containers und erben dadurch
  dessen Kipp-Animation. Positionierung in `css/intro.css` über `.demo-hand-*`; es gibt drei
  Größen-Varianten für die drei Container-Größen.
- **`Intro.replay()` ist entfernt** (war nie verdrahtet). Die Tutorials kommen über „Fortschritt &
  Statistik zurücksetzen" wieder, das räumt `neuroar_intros_seen` mit ab. Für einen eigenen
  „Tutorial erneut ansehen"-Knopf genügt `present(def, 'Weiter', onClose)`.

---

## 14. Icons

Lucide (lucide.dev, ISC-Lizenz). Einzelne SVGs heruntergeladen, lokale Kopien unter
`app/assets/icons/` — **eingebettet wird inline als `<svg>`**, damit die Farbe per
`stroke="currentColor"` dem Kontext folgt. Basis-Klasse `.lucide` in `common.css`:
`width:1em; height:1em`. Reine Icon-Buttons haben eigene `font-size` (3.2rem / 2.6rem),
Icon+Text-Buttons `1.3em` über eine zentrale Regel. **JS-generierte Stellen nutzen `.innerHTML`
statt `.textContent`**, sonst rendern die SVGs nicht. Attribution in `ueber.html`.

---

## 15. localStorage

- **`neuroar_settings`** — siehe `DEFAULT_SETTINGS` in `app/js/settings.js`. Felder: `mode`,
  `side`, `audioExercises`, `alwaysShowIntro`, `sessionDuration`, `reminderEnabled`, `reminderTime`,
  `soundOn`, `volume`, `erikaVoice`, `vibration`, `fontSize`, `colorblindMode`, `cameraBg`.
  (`userName` liegt NICHT hier, sondern in `neuroar_stats`.)
- **`neuroar_progress`** — Übungs-Zähler (`{ "suchen_1": 3 }`) für die Häkchen auf den Karten.
- **`neuroar_stats`** — `firstDate`, `totalSeconds`, `days{}`, `goalDays{}`, `userName`.
- **`neuroar_intros_seen`** — welche Erklär-Demos schon liefen. Wird zusammen mit Fortschritt und
  Statistik zurückgesetzt.
- **`neuroar_flow_order`** — die gewürfelte Reihenfolge des geführten Ablaufs. Wird bei jedem
  „Spiel starten" überschrieben; **absichtlich nicht** von den Reset-Knöpfen abgeräumt, sie ist kein
  Fortschritt, sondern Zustand der laufenden Sitzung.

---

## 16. ⚠️ Fallen und Lehren

Das Wertvollste an diesem Dokument. Alles hier hat schon einmal Zeit gekostet.

### Browser-APIs
- **`pointerdown` ist bei Berührung KEINE gültige Nutzer-Geste.** Laut HTML-Spezifikation zählt es
  nur mit `pointerType: "mouse"`; per Finger zählen `click`, `pointerup`, `touchend`. Dieser Fehler
  steckte gleich dreimal drin: in der Vibrations-Rückmeldung, in der Ton-Entsperrung (`createTone`)
  und wäre beinahe in der Kamera gelandet. Symptom ist immer dasselbe: **funktioniert am Rechner mit
  Maus einwandfrei, am Tablet gar nicht.**
- **`navigator.vibrate` verlangt „sticky activation"** — irgendwann muss auf der Seite getippt
  worden sein. Wird eine Übung im geführten Ablauf ganz ohne Berührung gestartet (Erkläranimation
  schon gesehen), bleibt sie bis zur ersten Berührung wirkungslos. Daran lässt sich nichts ändern.
- **Autoplay-Sperre:** Ein AudioContext startet ohne Geste `suspended`. `createTone` abonniert
  deshalb mehrere Ereignisarten und meldet sich erst ab, wenn der Context tatsächlich läuft — eine
  frühere Fassung meldete sich nach dem ersten Versuch ab, auch wenn `resume()` gescheitert war.

### CSS
- **Spezifität schlägt Reihenfolge.** `.erika-pause button` (0,1,1) gewann gegen `.ep-resume`
  (0,1,0), obwohl letzteres weiter unten stand. Die Reihenfolge entscheidet nur bei GLEICHER
  Spezifität. Bei „Style X greift trotz expliziter Regel nicht" immer zuerst die Spezifität der
  konkurrierenden Selektoren vergleichen.
- **Modus-Sichtbarkeit nie per Inline-Style setzen** — Inline schlägt die CSS-Regel `display:none`.
  Immer über Klassen.
- **`--optische-mitte` hat zwei Sonderfälle** (beide im CSS kommentiert): (1) Bei Buttons mit Icon
  UND Text verschiebt der Ausgleich auch das Icon, die Icons werden dort per `position:relative`
  zurückgeschoben. (2) Buttons mit `display:block` und Inline-Icon brauchen den Ausgleich NICHT.
  Gemessen wird auf das Versalband mit fester Referenz („H"), nicht auf die volle Tintenausdehnung —
  sonst verfälschen Umlaute und Unterlängen das Ergebnis.
- **Flexbox-Breite:** `align-items:center` im Elternteil ohne definierte Breite lässt eine Kachelreihe
  nie ihre `max-width` erreichen. Die Wrapper-Divs brauchen zusätzlich `align-self:stretch` inline.
- **`vw` gegen `vh` gemischt** hat auf einem breiten, aber niedrigen Tablet Icons und Text über den
  Kachelrand laufen lassen: Kachelhöhe über `vh`, Inhalte über `vw`. Fix war NICHT, die Kacheln zu
  vergrößern, sondern die `clamp()`-Obergrenzen enger zu decken. In mehreren Breite/Höhe-Kombinationen
  verifizieren, u. a. extremes 1400×480.
- **Demo-Bühnen nicht naiv proportional hochrechnen** — das führt zu Clipping. Richtig gemessen
  wurde per Web-Animations-API (`element.getAnimations()`, `currentTime` durchfahren), Frame für
  Frame. Extremfall ist Suchen Übung 3.
- **Hand-Positionen immer mit angehaltener Animation messen** (`element.style.animation = 'none'`),
  sonst verfälscht die laufende Bewegung `getBoundingClientRect()`. `style.animation='none'` behält
  anders als Klassen-Entfernen die Container-Größe.

### JavaScript
- **`let` und `var` gleichen Namens im globalen Bereich = SyntaxError**, der ALLE Skripte der Seite
  abschaltet. `common.js` hat `let toastTimer`; die Inline-Variable in `index.html` heißt deshalb
  `comingSoonTimer`. **Rest-Risiko derselben Art:** `sensor-check.html` deklariert inline ein `$` —
  dieselbe Falle, aber reine Diagnoseseite, bewusst gelassen. Vor dem Ergänzen von `common.js` auf
  einer Seite also die Inline-Namen prüfen.

### Die lokale Vorschau täuscht Fehler vor
Diese drei haben je einmal zu einer falschen Fährte geführt:
- **`window.innerWidth` meldet zeitweise `0`.** Folgen: `getBoundingClientRect()` liefert
  unbrauchbare Werte, Prozentrechnungen ergeben `NaN`, in **Suchen** liegen Objekt und Ziel
  rechnerisch beide in der Mitte und die Übung ist in derselben Millisekunde gewonnen wie gestartet,
  und `wuerfleSalate()` fällt auf das feste Muster zurück (alle Abstände sind 0).
  **Gegen `document.documentElement.clientWidth` messen**, das ist verlässlich.
- **`setTimeout` wird im Hintergrund deutlich gedehnt** und `requestAnimationFrame` gedrosselt.
  Zeitverhalten deshalb über eine selbst mitgeführte `performance.now()`-Wanduhr prüfen, nicht über
  Soll-Werte von `setTimeout`.
- **Screenshots erfassen laufende `<video>`-Inhalte manchmal als schwarze Fläche.** Verlässlich ist
  eine Pixelprobe: `ctx.drawImage(video,0,0)` auf ein kleines Canvas, dann `getImageData`.

---

## 17. Bewusst offen gelassen

- **„Betroffene Seite" (Links/Rechts)** ist ein Platzhalter ohne Funktion, steht aber als voll
  funktionsfähiger Schalter mit Erklärtext da. Wer die App testet, stellt „Rechts" ein und erwartet
  gespiegelte Übungen. Der Links-Bias ist fest verdrahtet: `randSide()` in `suchen.js` (78 %),
  `verfolgen.js` (75 %), `wuerfleSalate()` in `lenken.js` und die `--free-*`-Zonen in `common.css`.
  **Das ist der Punkt mit dem größten Risiko, sobald jemand anders die App in die Hand bekommt.**
  Vorschlag: ausgrauen und mit „noch nicht verfügbar" kennzeichnen, wie Essen/Fotos.
- **„Tägliche Erinnerung" + Uhrzeit** dasselbe: wird gespeichert, tut nichts. In einer reinen
  Web-App ohne Service Worker auch nur eingeschränkt machbar — vor dem Bauen Umfang klären.
- **Essen und Fotos** sind ausgegraute Platzhalter mit Toast.
- **Farbenblind-Modus** ist ein generischer Kontrast-/Sättigungsfilter, keine gezielte Korrektur.
- **Kein Datenexport.** Nach Nutzer-Aussage ist vorerst keine Evaluation mit echten Testpersonen
  geplant. Falls doch: **vorher** klären, was aufgezeichnet werden soll — nicht mitgeschriebene
  Daten sind hinterher unwiederbringlich weg.
- **Hochformat** funktioniert, die Steuerung fühlt sich aber anders an (senkrecht empfindlicher,
  weil `scaleX`/`scaleY` aus Fensterbreite und -höhe kommen). Als installierte App erzwingt
  `manifest.json` (`"orientation": "landscape"`) ohnehin Querformat; nur im Browser-Tab möglich.
  Ein Hinweis „bitte quer halten" wäre denkbar.
- **Der Modus-Umschalter** ist das einzige Bedienelement, das im Einfach-Modus sichtbar bleibt und
  die ganze App umstellt. Muss so sein, sonst käme man aus dem Einfach-Modus nicht mehr heraus.
- **`ueber.html` und `datenschutz.html`** sind bewusst NICHT an das Karten-Design der Einstellungen
  angepasst und zeigen als einzige noch die große AURA-Figur. Nicht angefragt.
- **Titel-Uneinheitlichkeit** ist bereinigt, alle Seiten führen „AURA" im `<title>`. Der Repo-Name
  auf GitHub (`Augmented-Rehabilitation`) bleibt unverändert.
- Optional: dieselben Fixes nach `test/` und Root ziehen (aktuell bewusst nicht).

---

## 18. Was zuletzt passiert ist

Reihenfolge der jüngsten Commits, damit nichts doppelt gebaut wird:

1. **Kamera-Hintergrund** in allen drei Übungen, umschaltbar, Foto als Rückfallebene (Abschnitt 11).
2. **Kamera vorwärmen**, damit beim Übungsstart kein Foto mehr aufblitzt.
3. **Geführter Ablauf würfelt die Reihenfolge** der Übungen (Abschnitt 10.4).
4. **Erfolgstext mittig über den Buttons** statt an deren linker Kante (`.s-col`).
5. **Erfolgs-Overlay mittig in der freien Zone** statt an deren linker Kante.
6. **Kopfblock `.hud`** — Punkte und Zeitbalken mittig unter den Hinweistext; der Zeitbalken von
   Verfolgen ersetzt den dünnen Streifen am oberen Bildschirmrand und füllt sich, statt sich zu leeren.
7. **Lenken Übung 2 würfelt die Salate** (Abschnitt 10.3).
8. **Gesamtdurchsicht der App** — behoben: Info-Overlay-Knopf („Zurück zur Startseite" → „Schließen",
   er navigierte nie), Suchen verbuchte Pausenzeit als Trainingszeit, zirkuläre AURA-Begrüßung,
   latente `toastTimer`-Namenskollision, toter Code `getGoalStreak()`, ungenutzte Dateien
   `Hintergrund.avif` und `blummenkreis.svg` gelöscht.
