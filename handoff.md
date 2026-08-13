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
ebenfalls unverändert.

**Konzept: 3 Spiele × je 3 Stufen** (per Bewegungssensor ODER Finger steuerbar):
- **Suchen** – Objekt durch Drehen/Neigen des Geräts in die Mitte (Blatt/Zielkreis) bringen.
  1) Visuell (Marienkäfer → Blatt) · 2) Audio-visuell (Uhu → Astkreis) · 3) Sequenz (3 Käfer 1-2-3)
- **Verfolgen** – driftendes Objekt im mittigen Kreis halten (%-Auswertung).
  1) Visuell (Schmetterling → Blume) · 2) Audio (Uhu → Astkreis) · 3) Verschwinden (Objekt blinkt weg)
- **Lenken** – Schnecke per Neigen (Schwerkraft/Touch-Drag) zum Salat rollen.
  1) Gerade · 2) **Drei Salate** (alle einsammeln, Reihenfolge egal) · 3) Labyrinth (2 Hindernisse)

Alle drei Spiele sind aktuell unter der neuen Kategorie **„Tiere"** einsortiert (siehe Abschnitt 4).

---

## 2. ⚠️ GitHub / Deployment — ZUERST LESEN

- **Repo:** `JonasMasch/Augmented-Rehabilitation` (public), Branch `main`. `gh` CLI ist als User **JonasMasch** eingeloggt → committen & pushen möglich.
- **Live-URL:** https://jonasmasch.github.io/Augmented-Rehabilitation/ — aktive Version unter `.../app/`.
- **Routine-Update:** `git add -A && git commit -m "..." && git push origin main`, dann ~1 Min auf Pages-Build warten.
- **⚠️ HTTPS ist Pflicht:** DeviceMotion/DeviceOrientation liefern nur über die Pages-HTTPS-URL Events, nicht über `file://` oder LAN-`http://`. Deshalb wird jeder Stand zum Testen gepusht.
- **⚠️ Browser-Cache:** Pages setzt `max-age=600` (10 Min) auf HTML/CSS/JS. Zuverlässig frisch: **privates Safari-Tab** oder iOS → Safari → „Verlauf und Websitedaten löschen", oder ~10 Min warten.
- **⚠️ Cache-Busting in `app/`:** Alle `css/`- und `js/`-Einbindungen in den `app/*.html` haben `?v=N` (aktuell **`?v=38`**). **Bei jeder Änderung an app/ CSS/JS die Nummer hochzählen**, sonst greift der Cache weiter: `perl -pi -e 's/\?v=38"/?v=39"/g' app/*.html`. (Reine HTML-Textänderungen oder Änderungen an einem `<style>`-Block *innerhalb* einer HTML-Datei selbst brauchen keinen Bump, nur externe `css/`/`js/`-Dateien.)
- **Pages-Build hängt manchmal:** leeren Commit pushen (`git commit --allow-empty -m "rebuild" && git push`) stößt frischen Build an.
- **⚠️ NEU — `.nojekyll`:** Im Repo-Root liegt jetzt eine leere Datei `.nojekyll`. **Ohne sie schlägt der Pages-Build fehl** (GitHub versucht sonst, mit Jekyll zu bauen, was bei purem HTML/CSS/JS mit generischer Fehlermeldung „Page build failed." crashen kann — ist im August 2026 real passiert, mehrere Commits in Folge). Falls der Live-Stand mal wieder nicht aktuell wird:
  1. `gh api repos/JonasMasch/Augmented-Rehabilitation/pages/builds/latest` prüfen (`status`: `built`/`building`/`errored`).
  2. `gh api repos/JonasMasch/Augmented-Rehabilitation/pages` prüfen — Feld `status`.
  3. Prüfen ob `.nojekyll` noch im Root liegt (`git ls-tree -r HEAD --name-only | grep nojekyll`).
  4. Hängt ein Build seit vielen Minuten auf `"building"` fest (Karteileiche) → einfach nochmal pushen (leerer Commit reicht), das erzeugt einen neuen Build-Job, der meist normal durchläuft.
- `.gitignore` schließt `.DS_Store`, `.claude/` und `assets/Hintergrund.jpg` (1,7-MB-Altbild, nur lokal) aus.
- Im Root-`assets/`-Ordner liegt zusätzlich eine `Hand.svg` (vom Nutzer dort hochgeladen, nicht von mir committed) — Duplikat der `app/assets/Hand.svg`, gehört nicht zur aktiven Version, wurde aber nicht entfernt (Root bleibt unverändert, siehe Abschnitt 3).

### Lokale Vorschau (Entwicklung)
Der eingebaute Preview-Server darf `~/Documents` nicht lesen (macOS TCC). Deshalb: Projekt ins
Scratchpad rsyncen und von dort servieren (`serve.py`-Muster mit `directory=<site>`, Port **8101**
in dieser Session — 8100 war durch einen Prozess einer anderen Session belegt, ggf. freien Port
wählen, Konflikt mit `lsof -i :<port>` prüfen). `Cache-Control: no-store` im Handler setzen.
Sensorik geht lokal NICHT (nur über HTTPS-Pages) → am Gerät testen. Für Layout-/Icon-/Farb-Checks
reicht der lokale Server völlig (Browser-DevTools, JS-Konsole). Der Scratchpad-Ordner wird
zwischen Sessions manchmal geleert — `serve.py` bei Bedarf neu anlegen (Muster siehe Git-History
dieser Datei oder einfach ein `http.server`-Subclass-Handler mit `directory=`-Kwarg).

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
Kopien aller Dateien. Ausnahme von „Root bleibt unverändert": die reine Deployment-Konfigurationsdatei
`.nojekyll` im Repo-Root (siehe Abschnitt 2) — das ist keine App-Datei, sondern GitHub-Pages-Infrastruktur.

---

## 4. Modus-System: Einfach / Erweitert

Umschaltbar in den Einstellungen (Setting `mode`, Standard `patient`). **UI-Beschriftung „Einfach"/
„Erweitert"** — die internen Werte heißen weiterhin `patient`/`pflege` (NICHT umbenennen, hängen an
localStorage, allen CSS-Selektoren `html[data-mode="…"]`, `.pflege-only`, `flow.js`; nur die
sichtbaren Labels in `settings.html` wurden geändert).

- **`patient` = „Einfach"**: Startseite zeigt einen „▶ Spiel starten"-Knopf → geführter linearer Flow durch alle Übungen (`flow.js`). Erfolgs-Button „Weiter".
- **`pflege` = „Erweitert"**: Startseite zeigt jetzt eine **Kategorienauswahl** (3 Kacheln: **Tiere / Essen / Fotos**, ohne Bilder, `index.html`). Nur **„Tiere" ist aktiv** und verlinkt auf die neue Seite **`tiere.html`**, die die bisherigen 3 Übungs-Kacheln (Suchen/Verfolgen/Lenken, mit Icons) zeigt. **„Essen" und „Fotos" sind Platzhalter** — Klick zeigt nur eine kurze Toast-Meldung „Bald verfügbar" (`showComingSoon()` in `index.html`), sonst passiert nichts. Übungen standalone, Erfolgs-Button „Nochmal".
- Umschaltung über `data-mode` am `<html>` (früh per Inline-Script im `<head>` gesetzt → kein Flackern; Sichtbarkeit über **CSS-Klasse**, NICHT inline-style — Inline schlägt sonst `display:none`).
- **Modus-abhängige Einstellungen:** Im **Einfach-Modus** zeigt die Einstellungsseite nur **Version, Trainingsübersicht, App**. Der Rest (Mein Training, Ton, Darstellung, Reset-Buttons) ist `.pflege-only` und nur im Erweitert-Modus sichtbar.
- **Schalter „Audio-Übungen"** (Setting `audioExercises`, Standard an, in „Mein Training", pflege-only): AUS → die Uhu-/Audio-Stufen (**Suchen 2** + **Verfolgen 2**) werden aus dem Einfach-Flow gefiltert (7 statt 9 Übungen). `flow.js` baut `FLOW` dynamisch aus `FULL_FLOW` (Einträge mit `audio:true`).
- **NEU: Schalter „Farbenblind-Modus"** (Setting `colorblindMode`, Standard **aus**, in „Darstellung", pflege-only): AN → `data-colorblind="true"` am `<html>` (live + früh beim Seitenladen aus allen `*.html`-Head-Skripten gesetzt, analog zu `data-fontsize`) → `html[data-colorblind="true"] body { filter: contrast(1.15) saturate(1.6); }` in `common.css`. Kräftigerer Kontrast/Sättigung, damit sich farbcodierte Elemente (Modul-Akzente, Erfolg/Fehler) leichter unterscheiden lassen. Kein echtes Daltonize/spezifischer Farbfehlsichtigkeits-Filter — falls das gewünscht wird, müsste das gezielt nachgebessert werden.

### Navigationsfluss Erweitert-Modus
```
index.html (Kategorien: Tiere / Essen / Fotos)
  └─ Tiere → tiere.html (Suchen / Verfolgen / Lenken, mit Icons)
       └─ je Übung → suchen.html / verfolgen.html / lenken.html (Stufenauswahl 1-3)
            "Zurück zur Tierauswahl" → tiere.html
            "Zurück zum Menü"       → index.html
  └─ Essen / Fotos → Toast "Bald verfügbar", keine Navigation
```

---

## 5. Neglect-Layout — freie Randzonen

Kernidee: Da die betroffene Seite meist links liegt, bleiben im **Einfach-Modus** definierte
Randzonen frei von **Bedienelementen** (nicht von Übungsobjekten — dazu unten mehr):
**links 40 %, rechts 5 %, oben 5 %, unten 7 %**. Bedienelemente sitzen **linksbündig direkt an der
40 %-Kante** (so weit links wie erlaubt).

- Zentraler Block am Ende von `common.css`: CSS-Variablen `--free-left:40vw`, `--free-right:5vw`,
  `--free-top:5dvh`, `--free-bottom:7dvh` (sonst überall `0`). Aktiv über `html[data-mode="patient"]`
  (Startseite + Erika-Info-Overlay-**Inhalt**, siehe unten) **ODER** `html.flow-mode` (geführte Übung, `?flow=n` in der URL).
- **Die EINSTELLUNGEN bleiben in BEIDEN Modi normal mittig** (kein Shift der Inhaltsspalte — bewusste Ausnahme).
  **Erweitert-Modus** (`data-mode="pflege"` bzw. Standalone-Übung ohne `flow-mode`) bleibt bei den
  restlichen Inhalten (Kacheln, Text) komplett unverändert (alle `--free-*:0`).
- **⚠️ Abweichung/Sonderfall seit August 2026:** Der **„?"-Button** (Erika collapsed/compact),
  der **Einstellungen-Button** (`.profile-btn`/`.top-actions` auf `index.html`) und der
  **„Fertig"-Button** (`.done-btn` auf `settings.html`) sitzen jetzt **IMMER** an der
  Einfach-Modus-Randposition (oben/rechts 5 %, unten/rechts 5 %/7 %) — **unabhängig vom Modus und
  auch auf der Einstellungsseite**. Das ist NICHT mehr an `--free-*` gekoppelt (die außerhalb
  Einfach/Flow weiterhin `0` sind), sondern **fest verdrahtet**: `.top-actions` in `index.html`
  (`top:5dvh; right:5vw;`), `.erika`/`.erika-info-fig` in `erika.css` (`right:5vw; bottom:7dvh;`),
  `.done-btn` in `settings.css` (`top:5dvh; right:5vw;`). **Nur die Größe bleibt modusabhängig**
  kleiner im Erweitert-Modus (siehe Abschnitt 8). Diese drei Buttons sind die einzige Abweichung
  von „Erweitert-Modus bleibt unverändert" — alle anderen Inhalte (Kacheln, Texte, Kategorien-Kacheln
  auf der Startseite) bleiben wie ursprünglich beschrieben modusabhängig/zentriert.
- Betroffene Elemente (Rest, unverändert wie vorher): `.home` (Startseite, via `.home-col`-Wrapper in `index.html`),
  `.instr`/`.seq-list`/`.score-badge`/`.cam-label` (Übungs-Chrome), die Vollflächen-Overlays
  `.success`/`.erika-pause`/`.erika-info`/`.intro-overlay` (Backdrop bleibt ganzflächig, Inhalt
  rückt an die 40 %-Kante).
- **Ausgenommen (dürfen überall hin, auch in die Randzonen):** die **Übungsobjekte** selbst
  (`.center-zone`/Zielkreis, per-JS über `innerWidth/innerHeight` positionierte Käfer/Schnecke/
  Salate). Das ist gewollt — die Spielgeometrie bleibt bewusst px-basiert (siehe Abschnitt 9) und
  nicht Teil der Neglect-Zonen-Beschränkung.
- Die Kategorien-Kacheln (Tiere/Essen/Fotos) und die Übungs-Kacheln auf `tiere.html`/
  Stufenauswahl-Kacheln bleiben **zentriert mit fester `max-width` (560px)**, bewusst NICHT an die
  5 %-Buttons-Randposition angeglichen (das wurde einmal versucht und auf Nutzerwunsch wieder
  zurückgebaut — nur die drei o. g. Utility-Buttons sollen den festen Randabstand haben, nicht die
  Kacheln selbst).

---

## 6. Aussehen & Barrierefreiheit (alles in `app/`)

- **Schrift: Luciole** (barrierefrei, für Sehbeeinträchtigte). CC-BY 4.0, © Bourcellier & Perez. Dateien unter `app/assets/fonts/` (Regular+Bold, woff2/woff), `@font-face` in `common.css`, Attribution in `ueber.html`. `button`/`input` erben die Schrift explizit.
- **Hintergrund: blauer Verlauf** (global in `common.css`, `.cam-bg`) `linear-gradient(135deg, #196e91 hell oben-links, #0a5078 dunkel unten-rechts)`, gilt für alle Seiten mit Verlaufs-Hintergrund. Übungs-Screens haben eigene Foto-Hintergründe (`#screen-level .cam-bg` überschreibt → `Hintergrund.jpeg`, `hintergrund_lenken.jpeg`). Die Demo-Mini-Szenen (Tutorial-Animationen) nutzen weiterhin ihren eigenen, unveränderten Verlauf.
- **Primärfarbe Grün `#85d67d`:** ursprünglich nur „Spiel starten"/Erika-Pausemenü-„Weiterspielen" im Einfach-Modus. **Seit August 2026 ausgeweitet:** Alle Kacheln im Erweitert-Modus (Kategorien-Kacheln, Tiere-Seite, Stufenauswahl-Kacheln in Suchen/Verfolgen/Lenken via `.game-tile`/`.cards-row .card` in `common.css`) sind jetzt ebenfalls in diesem Grün, sowie der aktive Zustand der Segmented-Controls in den Einstellungen (`.segmented button.active`, vorher Lila `#a78bfa`). Mint `#34d399` bleibt für Toggle-„an"/Streak/Trainiert-Status. Lila `#a78bfa` ist dadurch bis auf den Tages-Balken-Farbverlauf (`.daily-bar`, lila→mint) kaum noch in Verwendung.
- **Einfach-Startseite — einheitliche Breite (`25rem`):** „Spiel starten", der Tages-Fortschrittsbalken und der Sensor-Button sind gleich breit. Balken höher (`16px`) und Text größer (`1.2rem`) als im Erweitert-Modus (dort Kategorien-Kacheln + Tages-Balken `max-width:560px`, zentriert, Original-Höhe des Balkens).
- **Erika-Pausemenü im Einfach-Modus ebenfalls auf `25rem` vergrößert** (Buttons + Tutorial-Demo-Bühne), Erweitert bleibt bei `300px`. **Wichtig für die Demo-Bühnen-Skalierung** (`.erika-pause-demo .demo-scene`): NICHT naiv proportional aus dem alten Wert hochrechnen — das führt zu Clipping. Richtig gemessen: alle 9 Übungs-Demos (Suchen/Verfolgen/Lenken × 3 Stufen) per Web-Animations-API (`element.getAnimations()`, `currentTime` durchfahren) Frame für Frame vermessen; Extremfall ist Suchen Stufe 3 mit ±198px/±117px um die Mitte, fast exakt symmetrisch → aktuell `transform:scale(0.9)` ohne Offset, lässt überall ≥ ~22px Rand.
- **rem-basiertes Größen-System + wirksame Schriftgröße-Einstellung:** Alle UI-`font-size`/`padding`/`gap` sind **rem**. Zentraler Hebel: Wurzel-Schriftgröße am `<html>` via `data-fontsize`: `klein`=14px, `mittel`=16px (Standard), `gross`=19px — früh im `<head>` auf allen Seiten gesetzt (kein Flackern), `settings_page.js` zieht es live mit.
  **Grenze:** Die **Spielgeometrie bleibt px** (Objektgrößen/Zielkreise/Positionen in `suchen/verfolgen/lenken.js`, berechnet über `window.innerWidth/innerHeight`). NICHT auf rem umstellen — sonst wandern Objekte aus dem Bild.
- **Hinweistext (`.instr`) sitzt oben** (`top:5%`). In Suchen Stufe 3 sitzen die 1-2-3-Pillen (`.seq-list`) direkt darunter (`top: calc(5% + 3.25rem)`), damit sie sich nicht überlappen.
- **⭐ NEU: Kachel-Größe zentralisiert.** `.game-tiles`/`.game-tile` (Icon+Name, für Kategorien/Tiere-Seite) UND `.cards-row`/`.cards-row .card` (Nummer+Titel+Untertitel, für die Stufenauswahl in Suchen/Verfolgen/Lenken) sind jetzt **gemeinsam in `common.css`** definiert (vorher pro Seite dupliziert) — feste `height:clamp(140px,28vh,252px)`, gemeinsames Padding/Gap, `max-width:560px` für die Reihe, damit **alle vier Kontexte exakt gleich groß sind**, unabhängig vom Karteninhalt. Verfolgen/Lenken wurden dafür von der alten vertikalen Listenansicht (`.card .txt .name/.desc`) auf dasselbe horizontale Kachel-Layout wie Suchen umgestellt.
  **Bug dabei gefunden+behoben:** Die Kachel-Reihe erreichte wegen eines Flexbox-Sizing-Effekts (`align-items:center` im umgebenden `.home`/`.home-col` ohne definierte Breite) nie ihre volle `max-width` — die Wrapper-Divs auf `index.html`/`tiere.html`/`suchen.html`/`verfolgen.html`/`lenken.html` brauchen zusätzlich `align-self:stretch` inline, sonst hängt die reale Breite vom Karteninhalt ab (siehe `align-self:stretch` in den jeweiligen `<div style="...">`-Wrappern).

---

## 7. Erika (Assistenzfigur) — komplettes System

Erika schwebt unten rechts (Randabstand jetzt IMMER 5 % rechts / 7 % unten, siehe Abschnitt 5), in mehreren Zuständen je nach Kontext:

| Zustand | Wo | Aussehen | Klick |
|---|---|---|---|
| **`collapsed`** | Startseite (`index.html`), **`tiere.html`**, **`settings.html`** (`Erika.startCollapsed()`, alle Modi) | „?"-Button (quadratisch) | öffnet Info-Overlay |
| **`compact`** | Während einer Übung, Pausemenü zu — **UND jetzt auch auf der Stufenauswahl** (`#screen-home`) von Suchen/Verfolgen/Lenken (ebenfalls `startCollapsed()`) | „?"-Button (**gleiches** Icon/Button wie collapsed) | öffnet Pausemenü |
| normal (keine Klasse) | Über/Datenschutz (`ueber.html`/`datenschutz.html`) | große Figur (`.erika-fig`) | öffnet Sprechblase (Tipp/Begrüßung) |
| Übung pausiert (`paused`, zusätzlich zu obigem) | Pausemenü offen | große Figur, **genauso groß wie im Info-Overlay** | — |

**⭐ Änderung August 2026:** Praktisch **alle** Hauptseiten zeigen jetzt den „?"-Button statt der
großen Figur (`Erika.startCollapsed()` ergänzt in `tiere.html`, `suchen.html`, `verfolgen.html`,
`lenken.html`, `settings.html`). Nur `ueber.html`/`datenschutz.html` zeigen noch die normale große
Figur (nicht angefragt, unverändert gelassen).

- **„?"-Button** (`.erika-help-btn`): quadratisch, `border-radius:14px`, Icon `circle-question-mark`,
  `font-size:3.2rem` im Einfach-Modus. **Im Erweitert-Modus 4.5rem/2.6rem (kleiner)** — das gilt
  jetzt konsequent auf JEDER Seite: `index.html`/`settings.html` per `html[data-mode="pflege"]`,
  `tiere.html` unconditional (nur dort erreichbar), `suchen/verfolgen/lenken.html` per
  `html.flow-mode` (dort ist die Standalone/Erweitert-Variante der DEFAULT, `.flow-mode` schaltet
  auf die größere Einfach-Variante um — umgekehrte Logik zu den anderen Seiten, weil diese Seiten
  kein `data-mode`-Attribut setzen, sondern nur `flow-mode` bei `?flow=n` in der URL).
  Ersetzt sowohl das alte kompakte Erika-Icon während der Übung als auch die direkte Figur.
- **Gemeinsamer Klick-Handler `onTrigger()`** in `erika.js` für `.erika-avatar` UND `.erika-help-btn`: Übung aktiv → Pausemenü **(nur solange das Menü NICHT schon offen ist — ein Klick auf die Figur/das Icon schließt das offene Pausemenü NICHT mehr, das geht nur noch über die drei Buttons „Weiterspielen"/„Neu starten"/„Zurück zur Übersicht")**; Startseite `collapsed` → Info-Overlay (`openInfo()`); sonst → Sprechblase (`toggleBubble()`).
- **Info-Overlay** (`.erika-info`): abgedunkelter Hintergrund, Figur an ihrem Platz unten rechts, weißes Textfeld, grüner „Zurück zur Startseite"-Button (`#4ade80`, modusunabhängig). Schließen räumt nur das Overlay weg.
- **Pausemenü** (`.erika-pause`): Tutorial-Demo-Bühne oben, darunter **Weiterspielen** (grün) / **Neu starten** / **Zurück zur Übersicht**.
- **Ton:** `SOUND_ON = false` weiterhin in `suchen.js`/`verfolgen.js` (Suchen 2 / Verfolgen 2).

---

## 8. Buttons & Farbkonsistenz — Übersicht der Konventionen

Im August 2026 wurden mehrere Button-Stile app-weit vereinheitlicht:

- **Weiß + Schatten** (`background:#fff; color:#1a1a2e; box-shadow:0 6px 14px rgba(0,0,0,0.45);`):
  „?"-Button, Einstellungen-Button, **alle** „Zurück"-Buttons
  (`.back-to-menu`, auf `tiere.html`/`suchen.html`/`verfolgen.html`/`lenken.html`/`settings.html`
  **per Seiten-Override** überschrieben — `common.css`s Standard-`.back-to-menu` bleibt
  halbtransparent/dunkel für `ueber.html`/`datenschutz.html`, die NICHT angepasst wurden).
- **„Fertig"-Button** (Einstellungen, `.done-btn`): grün `#85d67d`/`color:#111`, gleiche Farbe wie
  „Spiel starten" auf der Startseite (vorher weiß+Schatten wie die anderen Icon-Buttons oben —
  auf Nutzerwunsch im August 2026 geändert). Größe/Position/Schatten unverändert (siehe Abschnitt 5+9).
- **Erfolgs-Buttons** (`.next-btn`/`.menu-btn`, nach Abschluss einer Stufe): beide `min-width:13rem`,
  gleiche Schriftgröße (1.35rem), damit „Weiter"/„Nochmal" und „Beenden" (vorher „Menü") gleich groß
  sind unabhängig von der Textlänge. `.menu-btn` ist weiß+Schatten (wie oben), `.next-btn` bleibt
  grün `#4ade80`. Erfolgs-Overlay-Hintergrund zusätzlich mit `rgba(0,0,0,0.4)`-Schicht abgedunkelt
  (besserer Kontrast auf hellen Kamera-Fotos).
- **Reset-Buttons** (Einstellungen, „Fortschritt & Statistik zurücksetzen" / „Einstellungen
  zurücksetzen"): dunkle Chips (`rgba(0,0,0,0.6)`) direkt auf dem Verlauf, wie „Bewegungssensor
  aktivieren".
- **Segmented Controls** (Einstellungen): aktiver Zustand jetzt grün `#85d67d` (vorher lila).

---

## 9. Einstellungsseite (`settings.html`/`settings.css`) — komplett überarbeitet

Im August 2026 grundlegend redesignt, um zum restlichen App-Design zu passen:

- **Karten** (`.setting-row`, `.stat-card`, `.font-preview`): **weiß mit Schatten** statt der
  ursprünglichen durchsichtigen „Glas"-Optik (`rgba(255,255,255,0.07)`-Hintergrund). Text-Farben
  entsprechend auf Schwarz/dunkles Grau umgestellt.
- **„Fertig"-Button** (oben rechts, `.done-btn`): jetzt ein quadratischer **Häkchen-Icon-Button**
  (`check`-SVG statt Text „Fertig"), exakt gleich groß/positioniert wie der Einstellungen-Button auf
  der Startseite (siehe Abschnitt 5+8), inkl. kleinerer Erweitert-Modus-Variante.
- **Erika:** zeigt nur noch den „?"-Button (`Erika.startCollapsed()`), nicht mehr die große Figur.
- **Neuer Schalter „Farbenblind-Modus"** unter „Darstellung" (siehe Abschnitt 4).
- **⚠️ Kontrast-Audit durchgeführt (WCAG-Formel real durchgerechnet, nicht nur nach Auge geschätzt):**
  Zwei echte Bugs gefunden (Zahnrad-Icon oben + Stift-Icon neben dem Namen hatten **kein** `color`
  gesetzt → randerten schwarz auf dem blauen Verlauf, kaum sichtbar → jetzt `color:#fff`). Mehrere
  zu schwache Textfarben angehoben (u. a. Wochentage, Chevron-Pfeile bei „Über die App"/
  „Datenschutz" waren mit nur ~2,4:1 Kontrast am schwächsten), betroffene 0.825rem-Texte auf
  0.9–0.975rem vergrößert. **Falls weitere Textstellen in der App ergänzt werden: immer explizit
  `color` setzen, nie auf einen impliziten/geerbten Wert verlassen** — das war die Ursache beider
  gefundenen Bugs.
- `ueber.html`/`datenschutz.html` sind **bewusst NICHT** an das neue Karten-Design angepasst
  (nicht angefragt) — deren „Zurück"-Buttons nutzen weiterhin den alten `common.css`-Standard-Stil.

---

## 10. Icons: Lucide (statt Emojis)

Fast alle Emojis im UI wurden durch **Lucide-Icons** (lucide.dev, ISC-Lizenz) ersetzt.

- **Herkunft/Einbindung:** Einzelne SVGs von `raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg` heruntergeladen (kein CDN/Build-Tool). Lokale Kopien unter **`app/assets/icons/`** (19 SVGs + `LICENSE-lucide.txt`) — **eingebettet wird inline als `<svg>`**, damit die Farbe per `stroke="currentColor"` automatisch dem Text-/Button-Kontext folgt. Attribution in `ueber.html`.
- **Basis-Klasse `.lucide`** in `common.css`: `width:1em; height:1em;` — folgt der `font-size` des umgebenden Elements.
- **Icon-Größen:** Reine Icon-Buttons „?"/Einstellungen/„Fertig": eigene `font-size:3.2rem`
  (Einfach) / `2.6rem` (Erweitert). Icon+Text-Buttons: `.lucide` auf `1.3em` via zentrale Regel in
  `common.css`. Bewusst nicht vergrößert: Status-/Abschnittstitel-Icons.
- **Mapping** unverändert seit letztem Handoff (siehe Git-History für die volle Tabelle Kontext→Lucide-Name).
- **JS-generierte Stellen** nutzen `.innerHTML` statt `.textContent`, damit SVGs rendern (`showSuccess()`, `finish()`, `perm-status`, `stat-streak`, Badge-Häkchen, Wochentage-Häkchen in `settings_page.js`).
- **Bewusst ausgenommen:** 💎-Platzhalter in `verfolgen.html` (nie sichtbar, wird zur Laufzeit ersetzt).

---

## 11. Bewegungssensorik (in allen 3 Spielen) — Status & Tuning

Unverändert seit letztem Handoff. Touch bleibt überall Fallback.

- **Modul `orientation.js`**: `window.OrientationControl` (Suchen + Verfolgen), `window.TiltControl` (Lenken). Komplementär-Filter für Schwerkraft (`GRAV_TAU=0.5`), bewegungs-gated Kalibrierung.
- **Am Gerät bestätigte Vorzeichen — NICHT nochmal pauschal umdrehen:**
  - `suchen.js`: `SENSOR_GAIN=2.0`, `SIGN_YAW=+1`, `SIGN_PITCH=+1`
  - `verfolgen.js`: `SENSOR_GAIN=5.0`, `SIGN_YAW=+1`, `SIGN_PITCH=-1`
  - `lenken.js`: `TILT_GAIN=1.7`, `SIGN_TILT_X=-1`, `SIGN_TILT_Y=-1`
- **`DEBUG_SENSOR = true`** in allen drei JS → Live-Anzeige unten links. **Vor Release auf `false` setzen** (immer noch offen).
- Bugfix `render()`-Null-Guard in `app/` behoben; gleicher Latenz-Bug existiert noch in `test/` + Root (frozen, bewusst nicht übernommen).

---

## 12. Tutorial-Animationen: Hand-Grafiken (NEU, in Arbeit)

Der Nutzer zeichnet eigene Hand-SVGs für die Erklär-Animationen (Tablet-haltende Hände).

- **Muster (Pilot bei Suchen Stufe 1 fertig):** Eine Hand als `app/assets/Hand.svg` (Daumen +
  hintere Finger bewusst abgeschnitten, damit eine gerade Kante direkt an die Tablet-Kante gelegt
  werden kann). Wird **zweimal eingebunden**: rechts unverändert, links per CSS `transform:scaleX(-1)`
  gespiegelt — anatomisch korrekt, da linke/rechte Hand bei symmetrischem Griff Spiegelbilder sind.
  Beide `<img>` sind Kind-Elemente von `.demo-device` (in `js/suchen.js`, `DEMOS[1].scene`) und
  erben dadurch automatisch die Kipp-Animation.
- **Positionierung** (`css/intro.css`, `.demo-hand`/`.demo-hand-left`/`.demo-hand-right`): An den
  unteren Ecken des Tablet-Rahmens, `bottom:-8px; right/left:-46px;` (Werte nach zwei
  Feedback-Runden justiert — die Hände sollen am äußeren Rahmen greifen, nur die Fingerspitze
  minimal auf den Screen reichen, nicht die halbe Hand auf dem Bildschirm liegen). Beim Anpassen:
  **immer mit pausierter/entfernter `anim-tilt-left`-Klasse messen** (`element.classList.remove(...)`
  in der Konsole), sonst verfälscht die laufende Rotation die `getBoundingClientRect()`-Messung.
- **Getestet in beiden Kontexten**, in denen `DEMOS[1].scene` verwendet wird: Erst-Anzeige-Popup
  (`intro.js`) UND Erika-Pausemenü (`erika.js showDemo()`), jeweils Einfach- und Erweitert-Modus-Größe.
- **Offen:** Nur Suchen Stufe 1 hat Hände. Die anderen 8 Übungs-Demos (Suchen 2+3, Verfolgen 1-3,
  Lenken 1-3) haben noch keine — sobald weitere Hand-Grafiken vom Nutzer kommen, nach demselben
  Muster in die jeweiligen `DEMOS[n].scene`-Strings einbauen.
- **Wichtiger Fix nebenbei:** `Intro.replay()` in `intro.js` ist eine **fertige, aber nirgends
  aufgerufene** Funktion (totes Feature — sollte laut Code-Kommentar über einen „?"-Button erneut
  abspielbar sein, ist aber nicht verdrahtet). Stattdessen wurde `onResetProgress()` in
  `settings_page.js` so erweitert, dass es zusätzlich `localStorage.removeItem('neuroar_intros_seen')`
  aufruft — „Fortschritt & Statistik zurücksetzen" bringt die Tutorial-Animationen jetzt wieder
  automatisch beim nächsten Öffnen einer Stufe zurück (vorher wurde dieser Key nicht mitgelöscht).

---

## 13. Weitere Details

- **Profil entfernt / Medaillen weg:** `badges.js` behält nur Fortschritt (`recordCompletion`, `markStageCards`). Name + Trainingsübersicht sind in die Einstellungen gewandert. `profil.html/js/css` gelöscht.
- **Verfolgen Stufe 1** nutzt testweise neue PNGs (`schmetterling.png`/`Blume_2.png`), Objekte einheitlich 92px.

### Struktur `app/`
```
app/
  index.html      Startseite AURA (Einfach: Spielen-Knopf · Erweitert: Kategorien Tiere/Essen/Fotos)
  tiere.html      NEU — Kategorie-Unterseite "Tiere": die 3 Übungs-Kacheln (Suchen/Verfolgen/Lenken)
  suchen/verfolgen/lenken.html   die 3 Spiele (mit flow.js; ?flow=n = geführt, ohne = standalone)
  settings.html   Einstellungen (überarbeitetes Design, siehe Abschnitt 9)
  ueber.html / datenschutz.html  (Platzhalter-Inhalte, unverändertes altes Design)
  css/   common (inkl. .lucide, Neglect-Layout-Zonen, zentrale .game-tile/.cards-row-Kachelgröße,
         Farbenblind-Filter), erika, intro, settings + je Spiel
  js/    common, erika, intro, badges, session, settings, settings_page,
         orientation (OrientationControl + TiltControl), flow, suchen, verfolgen, lenken
  assets/  SVGs + PNGs + Hintergrund.jpeg/.avif + hintergrund_lenken.jpeg + fonts/ (Luciole)
           + icons/ (19 Lucide-SVGs + LICENSE-lucide.txt) + Hand.svg (NEU, Tutorial-Hände)
```
Kern-Globals via `window.X`: `Erika`, `Intro`, `OrientationControl`, `TiltControl`.
`settings.js` lädt VOR `flow.js` (flow.js liest `getSetting('audioExercises')`).

### localStorage-Keys & Konventionen
- `neuroar_settings` — Einstellungen. Felder: `mode` (`patient`/`pflege`), `audioExercises` (bool), `fontSize` (`klein`/`mittel`/`gross`), `colorblindMode` (bool, **NEU**, Standard `false`), `side`, `sessionDuration`, `soundOn`, `volume`, `erikaVoice`, `reminderEnabled`, `reminderTime`, `userName`.
- `neuroar_progress` — Übungs-Zähler (`{ "suchen_1": 3 }`) für die Häkchen auf den Auswahl-Karten.
- `neuroar_stats` — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, userName).
- `neuroar_intros_seen` — welche Erklär-Demos schon liefen. **Wird jetzt zusammen mit Fortschritt/Statistik zurückgesetzt** (siehe Abschnitt 12).
- **Stolperfallen:** „Lenken" heißt intern weiter `lenken`. Weißer-Rand-SVG-Filter `#whiteOutline` wird von `common.js` injiziert (`.outlined`); bewegte Objekte nutzen das günstige `.lite-outline`. Modus-/Fontsize-/Colorblind-Sichtbarkeit läuft über Attribute am `<html>` — Display bei Modus-Blöcken NIE inline setzen (schlägt die CSS-`display:none`-Regel).

---

## 14. OFFENE PUNKTE / nächste Schritte

1. **Geräte-Test des aktuellen `app/`-Stands:** Sensorik in allen 3 Spielen, Modus-Umschaltung, Schriftgröße, Farbenblind-Modus, Audio-Übungen-Filter, Neglect-Layout auf echtem Gerät (Querformat), Erika-Zustände.
2. **`DEBUG_SENSOR` → `false`** in suchen/verfolgen/lenken, wenn Steuerung passt.
3. **Restliche Einstellungen wirksam machen** (bisher nur gespeichert): betroffene Seite L/R, Ton/Lautstärke, Erika-Sprachausgabe. (Modus, Audio-Übungen, Schriftgröße, Farbenblind-Modus sind bereits wirksam.)
4. **`SOUND_ON` wieder aktivieren?** (aktuell in Suchen/Verfolgen aus) — je nach Wunsch.
5. **Impressum/Datenschutz** (`ueber.html`, `datenschutz.html`) mit echten Inhalten füllen — inkl. Platzhalter „[Name]"/„[E-Mail]" im Impressum.
6. **Namens-Konsistenz „AURA"** ggf. auf die übrigen `<title>`-Tags und den `ueber.html`-Text ausweiten.
7. **Hand-Grafiken für die restlichen 8 Tutorial-Animationen** (nur Suchen Stufe 1 hat aktuell Hände, siehe Abschnitt 12) — sobald der Nutzer weitere SVGs liefert, nach demselben Muster einbauen.
8. **„Essen" und „Fotos"-Kategorien:** aktuell reine Platzhalter (Toast „Bald verfügbar"). Falls/wenn Inhalt dafür feststeht, analog zu `tiere.html` neue Kategorie-Unterseiten anlegen und in `index.html`/`js` verlinken.
9. **Farbenblind-Modus ist aktuell nur ein generischer Kontrast-/Sättigungs-Filter** (`contrast(1.15) saturate(1.6)`), keine gezielte Korrektur für einen bestimmten Farbfehlsichtigkeits-Typ (z. B. Deuteranopie). Falls das genauer werden soll: Rückfrage an den Nutzer, welche Art Anpassung gewünscht ist.
10. **Kombination final machen:** wenn bestätigt, `app/` → Root, alte Ordner (`test/`, alte Root-Dateien) aufräumen; Latenz-Bug-Fix ggf. mitnehmen.
11. Optional: PNGs verkleinern (`schmetterling.png`/`Blume_2.png` ~600 KB–1,5 MB); Daten-Export für die Auswertung; die gleichen Fixes/Features nach `test/`/Root ziehen (aktuell bewusst nicht).
12. `Intro.replay()` in `intro.js` ist totes/unverdrahtetes Feature (siehe Abschnitt 12) — entweder an einen sichtbaren „Tutorial nochmal anzeigen"-Button anschließen oder als toten Code entfernen.
