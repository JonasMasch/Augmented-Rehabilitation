# Handoff — AURA (Repo/Codename weiterhin „Augmented-Rehabilitation" / „NeuroAR Reha")

Übergabe-Dokument zur Weiterarbeit in einer neuen Session.

> **Zuerst lesen: Abschnitt 14 und 15.** Abschnitt 14 listet, was zuletzt dazugekommen ist,
> inklusive dreier Fallen, die schon Zeit gekostet haben. Abschnitt 15 enthält die nächsten
> Schritte — die Kamera-Entscheidungen sind dort bereits getroffen und müssen nicht neu
> erfragt werden. Die Abschnitte 1–13 beschreiben den gewachsenen Stand und sind an den
> markierten Stellen von Abschnitt 14 überholt.
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

**⭐ Namens-Änderung August 2026:** Was oben (und in Code-Kommentaren) noch „Stufe 1/2/3" heißt, ist
im **sichtbaren UI überall in „Übung 1/2/3" umbenannt** — Auswahl-Kacheln (`card-title` in
`suchen/verfolgen/lenken.html`) und die Titel/Texte der Erkläranimations-Popups (`DEMOS[n].title` in
`suchen/verfolgen/lenken.js`, jetzt Format **„Suchen – Übung 1"** statt „Stufe 1 — Visuell", also
Spielname zuerst, keine Kurzbeschreibung mehr im Titel). Interne Bezeichnung „Stufe" in Code-
Kommentaren, Funktionsnamen (`beginStage`, `markStageCards`) und den `data-stage`-Attributen bewusst
NICHT umbenannt (gleiche Konvention wie `patient`/`pflege` und `Erika`/AURA).

---

## 2. ⚠️ GitHub / Deployment — ZUERST LESEN

- **Repo:** `JonasMasch/Augmented-Rehabilitation` (public), Branch `main`. `gh` CLI ist als User **JonasMasch** eingeloggt → committen & pushen möglich.
- **Live-URL:** https://jonasmasch.github.io/Augmented-Rehabilitation/ — aktive Version unter `.../app/`.
- **Routine-Update:** `git add -A && git commit -m "..." && git push origin main`, dann ~1 Min auf Pages-Build warten.
- **⚠️ HTTPS ist Pflicht:** DeviceMotion/DeviceOrientation liefern nur über die Pages-HTTPS-URL Events, nicht über `file://` oder LAN-`http://`. Deshalb wird jeder Stand zum Testen gepusht.
- **⚠️ Browser-Cache:** Pages setzt `max-age=600` (10 Min) auf HTML/CSS/JS. Zuverlässig frisch: **privates Safari-Tab** oder iOS → Safari → „Verlauf und Websitedaten löschen", oder ~10 Min warten.
- **⚠️ Cache-Busting in `app/`:** Alle `css/`- und `js/`-Einbindungen in den `app/*.html` haben `?v=N` (aktuell **`?v=102`** — vor jedem neuen Bump kurz mit `grep -o '?v=[0-9]*' app/index.html` den echten aktuellen Stand prüfen, diese Zahl hier im Dokument veraltet erfahrungsgemäß schnell). **Bei jeder Änderung an app/ CSS/JS die Nummer hochzählen**, sonst greift der Cache weiter: `perl -pi -e 's/\?v=102"/?v=103"/g' app/*.html`. (Reine HTML-Textänderungen oder Änderungen an einem `<style>`-Block *innerhalb* einer HTML-Datei selbst brauchen keinen Bump, nur externe `css/`/`js/`-Dateien — `assets/Hand.svg` wird z. B. OHNE `?v=` eingebunden und braucht bis zu 10 Min./privates Tab.)
- **Pages-Build hängt manchmal:** leeren Commit pushen (`git commit --allow-empty -m "rebuild" && git push`) stößt frischen Build an.
- **⚠️ NEU — `.nojekyll`:** Im Repo-Root liegt jetzt eine leere Datei `.nojekyll`. **Ohne sie schlägt der Pages-Build fehl** (GitHub versucht sonst, mit Jekyll zu bauen, was bei purem HTML/CSS/JS mit generischer Fehlermeldung „Page build failed." crashen kann — ist im August 2026 real passiert, mehrere Commits in Folge). Falls der Live-Stand mal wieder nicht aktuell wird:
  1. `gh api repos/JonasMasch/Augmented-Rehabilitation/pages/builds/latest` prüfen (`status`: `built`/`building`/`errored`).
  2. `gh api repos/JonasMasch/Augmented-Rehabilitation/pages` prüfen — Feld `status`.
  3. Prüfen ob `.nojekyll` noch im Root liegt (`git ls-tree -r HEAD --name-only | grep nojekyll`).
  4. Hängt ein Build seit vielen Minuten auf `"building"` fest (Karteileiche) → einfach nochmal pushen (leerer Commit reicht), das erzeugt einen neuen Build-Job, der meist normal durchläuft.
- `.gitignore` schließt `.DS_Store`, `.claude/` und `assets/Hintergrund.jpg` (1,7-MB-Altbild, nur lokal) aus.
- Im Root-`assets/`-Ordner liegt zusätzlich eine `Hand.svg` (vom Nutzer dort hochgeladen, nicht von mir committed) — Duplikat der `app/assets/Hand.svg`, gehört nicht zur aktiven Version, wurde aber nicht entfernt (Root bleibt unverändert, siehe Abschnitt 3).
- **⚠️ Trick für sofortiges Frisch-Testen am Gerät (Cache umgehen):** Einen beliebigen, noch nie
  benutzten Query-Parameter anhängen, z. B. `.../app/suchen.html?frisch=7` (Zahl bei jedem Test
  hochzählen) — dafür kann unmöglich eine alte gecachte Antwort existieren, garantiert immer die
  aktuell gepushte Version, ganz ohne 10 Minuten zu warten oder privates Tab zu öffnen. Sehr nützlich
  in dieser Fern-Debugging-Situation (Nutzer testet am eigenen Tablet, ich sehe den Code, aber nicht
  den Bildschirm) — beim Diagnostizieren von Steuerungsproblemen IMMER zuerst sicherstellen, dass
  wirklich frisch geladen wurde, bevor man den gemeldeten Bug weiter analysiert (hat in dieser
  Session mehrfach zu falschen Fährten geführt, weil eine alte Version getestet wurde).
- **Installierte PWA testen:** Seit dem Web App Manifest (siehe Abschnitt 14, Punkt 2a) startet die
  App über „Zum Startbildschirm hinzufügen" im Vollbild ohne Adressleiste. Sie teilt sich aber den
  ganz normalen 10-Minuten-HTTP-Cache mit regulären Browser-Tabs (kein Service Worker, kein
  separater Offline-Cache) — der obige `?frisch=N`-Trick funktioniert dort NICHT direkt (kein
  Adressfeld zum Eintippen). Zum sofortigen Frisch-Testen nach einem Push: entweder ~10 Min. warten,
  dann übers Icon öffnen: oder kurz in einem normalen (ggf. privaten) Chrome-Tab mit `?frisch=N`
  gegenprüfen, dass die Änderung angekommen ist, und dem installierten Icon dann einfach etwas mehr
  Zeit geben.

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

- **`patient` = „Einfach"**: Startseite zeigt einen „▶ Spiel starten"-Knopf → geführter linearer Flow durch alle Übungen (`flow.js`), **Reihenfolge seit August 2026 zufällig — siehe Abschnitt 17**. Erfolgs-Button „Weiter".
- **`pflege` = „Erweitert"**: Startseite zeigt jetzt eine **Kategorienauswahl** (3 Kacheln: **Tiere / Essen / Fotos**, ohne Bilder, `index.html`). Nur **„Tiere" ist aktiv** und verlinkt auf die neue Seite **`tiere.html`**, die die bisherigen 3 Übungs-Kacheln (Suchen/Verfolgen/Lenken, mit Icons) zeigt. **„Essen" und „Fotos" sind Platzhalter** — Klick zeigt nur eine kurze Toast-Meldung „Bald verfügbar" (`showComingSoon()` in `index.html`), sonst passiert nichts. Übungen standalone, Erfolgs-Button „Nochmal".
- Umschaltung über `data-mode` am `<html>` (früh per Inline-Script im `<head>` gesetzt → kein Flackern; Sichtbarkeit über **CSS-Klasse**, NICHT inline-style — Inline schlägt sonst `display:none`).
- **Modus-abhängige Einstellungen:** Im **Einfach-Modus** zeigt die Einstellungsseite nur **Modus, Trainingsübersicht, App** (Überschrift „Version" wurde zu „Modus" umbenannt, siehe Abschnitt 9). Der Rest (Mein Training, Ton, Darstellung, Reset-Buttons) ist `.pflege-only` und nur im Erweitert-Modus sichtbar.
- **Schalter „Audio-Übungen"** (Setting `audioExercises`, Standard an, in „Mein Training", pflege-only): AUS → die Uhu-/Audio-Stufen (**Suchen 2** + **Verfolgen 2**) werden aus dem Einfach-Flow gefiltert (7 statt 9 Übungen). `flow.js` baut `FLOW` dynamisch aus `FULL_FLOW` (Einträge mit `audio:true`).
- **NEU: Schalter „Farbenblind-Modus"** (Setting `colorblindMode`, Standard **aus**, in „Darstellung", pflege-only): AN → `data-colorblind="true"` am `<html>` (live + früh beim Seitenladen aus allen `*.html`-Head-Skripten gesetzt, analog zu `data-fontsize`) → `html[data-colorblind="true"] body { filter: contrast(1.15) saturate(1.6); }` in `common.css`. Kräftigerer Kontrast/Sättigung, damit sich farbcodierte Elemente (Modul-Akzente, Erfolg/Fehler) leichter unterscheiden lassen. Kein echtes Daltonize/spezifischer Farbfehlsichtigkeits-Filter — falls das gewünscht wird, müsste das gezielt nachgebessert werden.

### Navigationsfluss Erweitert-Modus
```
index.html (Kategorien: Tiere / Essen / Fotos)
  └─ Tiere → tiere.html (Suchen / Verfolgen / Lenken, mit Icons)
       └─ je Übung → suchen.html / verfolgen.html / lenken.html (Stufenauswahl 1-3)
            "Zurück zur Tierauswahl" → tiere.html
            "Zurück zum Menü"       → index.html
  └─ Essen / Fotos → ausgegraut (.game-tile.soon), Toast "Bald verfügbar", keine Navigation
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
- **Erfolgs-Overlay (`.success`), August 2026:** Text, Unterzeile und die beiden Buttons stecken jetzt
  in einem gemeinsamen Wrapper **`.s-col`** (in allen drei Übungs-HTML ergänzt). Der Block ist nur so
  breit wie sein breitestes Kind und zentriert seine Kinder darin **zueinander**. Vorher waren im
  geführten Modus alle vier Elemente einzeln linksbündig an der 40-%-Kante — „Gefunden!" stand dadurch
  an der linken Buttonkante statt mittig darüber. Im Erweitert-Modus ändert sich nichts (dort ist
  ohnehin alles bildschirmmittig). **Die Buttons selbst saßen schon vorher an der 40-%-Kante**, das
  war nicht der Fehler.
- **⚠️ Und danach: `.success` wird als EINZIGES Overlay mittig in der freien Zone ausgerichtet**
  (`html.flow-mode .success { align-items:center; }`, auf ausdrücklichen Nutzerwunsch). Mitte liegt
  bei **67,5 %** der Bildschirmbreite, weil zwischen `--free-left` (40 %) und `--free-right` (5 %)
  zentriert wird — die rechte Randzone bleibt also frei.
  **Die anderen Overlays folgen dieser Regel NICHT**, sie bleiben linksbündig an der 40-%-Kante:
  Erklärkarte (`.intro-overlay`, `justify-content:flex-start` → Karte 40 %–74,4 %, Mitte 57,2 %) und
  Pausemenü (`.erika-pause`, `align-items:flex-start`). Der Nutzer nahm die Erklärkarte als „mittig
  in den rechten 60 %" wahr — **gemessen ist sie das nicht**, sie wirkt nur ausgewogen, weil sie mit
  440 px breit genug ist, um die Zone zu füllen. Der Erfolgsblock ist mit ~208 px schmal und klebte
  dadurch sichtbar an der Kante. Sollen alle drei auf dieselbe Regel: bei `.intro-overlay`
  `justify-content:center` und bei `.erika-pause` `align-items:center` — bewusst NICHT gemacht,
  war nicht angefragt.
- Betroffene Elemente (Rest, unverändert wie vorher): `.home` (Startseite, via `.home-col`-Wrapper in `index.html`),
  `.instr`/`.seq-list` (Übungs-Chrome; `.score-badge` und `.cam-label` sind im August 2026
  entfallen, siehe Abschnitt 15), die Vollflächen-Overlays
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
- **Primärfarbe Grün `#85d67d`:** ursprünglich nur „Spiel starten"/Erika-Pausemenü-„Weiterspielen" im Einfach-Modus. **Seit August 2026 ausgeweitet:** Alle Kacheln im Erweitert-Modus (Kategorien-Kacheln, Tiere-Seite, Stufenauswahl-Kacheln in Suchen/Verfolgen/Lenken via `.game-tile`/`.cards-row .card` in `common.css`) sind jetzt ebenfalls in diesem Grün, sowie der aktive Zustand der Segmented-Controls in den Einstellungen (`.segmented button.active`, vorher Lila `#a78bfa`). **Zusätzlich seit der Einstellungs-Überarbeitung:** Auch Toggle-„an", Tagesübersicht-„trainiert"-Kreis und der Lautstärke-Regler (`accent-color`) in `settings.css` sind auf `#85d67d` umgestellt (vorher Mint `#34d399`, auf Nutzerwunsch vereinheitlicht — „alles Grün soll dasselbe Grün sein wie der Start-Button"). Mint `#34d399` bleibt aber weiterhin an anderen Stellen der App in Verwendung (Audio-Balken/-Label in `common.css`, Intro-/Berechtigungs-Buttons, Lenken-Zielglühen, Suchen/Verfolgen-Objektfarben) — dort NICHT angefragt, bewusst unverändert gelassen. Lila `#a78bfa` ist praktisch nur noch in den 9 Tutorial-Demo-Animationen und dem Stufe-1-Objekt-Tint übrig.
- **Einfach-Startseite — einheitliche Breite (`25rem`):** „Spiel starten", der Tages-Fortschrittsbalken und der Sensor-Button sind gleich breit. Balken höher (`16px`) und Text größer (`1.2rem`) als im Erweitert-Modus (dort Kategorien-Kacheln + Tages-Balken `max-width:560px`, zentriert, Original-Höhe des Balkens).
- **Erika-Pausemenü im Einfach-Modus ebenfalls auf `25rem` vergrößert** (Buttons + Tutorial-Demo-Bühne), Erweitert bleibt bei `300px`. **Wichtig für die Demo-Bühnen-Skalierung** (`.erika-pause-demo .demo-scene`): NICHT naiv proportional aus dem alten Wert hochrechnen — das führt zu Clipping. Richtig gemessen: alle 9 Übungs-Demos (Suchen/Verfolgen/Lenken × 3 Stufen) per Web-Animations-API (`element.getAnimations()`, `currentTime` durchfahren) Frame für Frame vermessen; Extremfall ist Suchen Stufe 3 mit ±198px/±117px um die Mitte, fast exakt symmetrisch → aktuell `transform:scale(0.9)` ohne Offset, lässt überall ≥ ~22px Rand.
- **rem-basiertes Größen-System + wirksame Schriftgröße-Einstellung:** Alle UI-`font-size`/`padding`/`gap` sind **rem**. Zentraler Hebel: Wurzel-Schriftgröße am `<html>` via `data-fontsize`: `klein`=14px, `mittel`=16px (Standard), `gross`=19px — früh im `<head>` auf allen Seiten gesetzt (kein Flackern), `settings_page.js` zieht es live mit.
  **Grenze:** Die **Spielgeometrie bleibt px** (Objektgrößen/Zielkreise/Positionen in `suchen/verfolgen/lenken.js`, berechnet über `window.innerWidth/innerHeight`). NICHT auf rem umstellen — sonst wandern Objekte aus dem Bild.
- **Hinweistext (`.instr`) sitzt oben** (`top:5%`). In Suchen Stufe 3 sitzen die 1-2-3-Pillen (`.seq-list`) direkt darunter (`top: calc(5% + 3.25rem)`), damit sie sich nicht überlappen.
- **⭐ NEU: Kachel-Größe zentralisiert.** `.game-tiles`/`.game-tile` (Icon+Name, für Kategorien/Tiere-Seite) UND `.cards-row`/`.cards-row .card` (Nummer+Titel+Untertitel, für die Stufenauswahl in Suchen/Verfolgen/Lenken) sind jetzt **gemeinsam in `common.css`** definiert (vorher pro Seite dupliziert) — feste `height:clamp(140px,28vh,252px)`, gemeinsames Padding/Gap, `max-width:560px` für die Reihe, damit **alle vier Kontexte exakt gleich groß sind**, unabhängig vom Karteninhalt. Verfolgen/Lenken wurden dafür von der alten vertikalen Listenansicht (`.card .txt .name/.desc`) auf dasselbe horizontale Kachel-Layout wie Suchen umgestellt.
  **Bug dabei gefunden+behoben:** Die Kachel-Reihe erreichte wegen eines Flexbox-Sizing-Effekts (`align-items:center` im umgebenden `.home`/`.home-col` ohne definierte Breite) nie ihre volle `max-width` — die Wrapper-Divs auf `index.html`/`tiere.html`/`suchen.html`/`verfolgen.html`/`lenken.html` brauchen zusätzlich `align-self:stretch` inline, sonst hängt die reale Breite vom Karteninhalt ab (siehe `align-self:stretch` in den jeweiligen `<div style="...">`-Wrappern).
  **⚠️ Zweiter Bug am Android-Tablet gefunden+behoben (August 2026):** Icon (`.ic`), Titel
  (`.card-title`/`.tname`) und Untertitel (`.card-sub`) waren über `vw` (Bildschirmbreite) skaliert,
  die Kachel-Höhe selbst aber über `vh` (Bildschirmhöhe, `clamp(140px,28vh,252px)`) — auf einem
  breiten, aber nicht sehr hohen Tablet-Querformat-Bildschirm liefen Icon/Text dadurch über den
  Kachelrand hinaus. Fix: NICHT die Kacheln vergrößert, sondern die `clamp()`-Obergrenzen für Icon
  (`56–122px` → `44–76px`), Titel/Untertitel-Schrift und Innenabstände enger gedeckelt (siehe
  `common.css`, `.game-tile`/`.cards-row .card`-Block, ausführlich kommentiert). In mehreren Breite/
  Höhe-Kombinationen per `resize_window`/`getBoundingClientRect()` verifiziert, u. a. extremes
  1400×480px.

---

## 7. Erika (Assistenzfigur, angezeigter Name jetzt „AURA") — komplettes System

**⭐ Änderung August 2026:** Die Figur heißt für den Nutzer jetzt **„AURA"** (vorher „Erika").
Umbenannt sind nur die sichtbaren Texte — Begrüßung/Tipps in `js/erika.js`, `aria-label`/`alt`-
Attribute, das Setting-Label „Sprachausgabe AURA" in `settings.html`. **Intern bleibt alles bei
„Erika"** (Variable `Erika`/`window.Erika`, Klassen `.erika-*`, Dateien `erika.js`/`erika.css`,
Setting-Key `erikaVoice`) — bewusst nicht umbenannt, analog zur `patient`/`pflege`-Konvention aus
Abschnitt 4. **Namens-Personalisierung (NEU):** Ist in den Einstellungen ein Name hinterlegt
(„Name ändern", Stift-Icon), spricht AURA ihn in der Begrüßung UND in allen Tipps mit an
(`pickText()` in `erika.js`, liest `getUserName()` aus `session.js`). Dafür lädt jetzt auch
`tiere.html`/`ueber.html`/`datenschutz.html` `session.js` (vorher nicht eingebunden) — der Zugriff
ist über `typeof getUserName === 'function'` abgesichert, fällt ohne Namen auf die generische
Begrüßung zurück statt zu crashen.

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
- **Pausemenü** (`.erika-pause`): Tutorial-Demo-Bühne oben, darunter **Weiterspielen** (grün, fett) / **Neu starten** / **Zurück zur Übersicht**.
- **✅ Bugfix: AURA wurde im Pausemenü nie groß angezeigt.** Die beim Seitenladen gesetzte Klasse
  `collapsed` (von `startCollapsed()`, jetzt auf praktisch jeder Seite aktiv) wurde beim Öffnen des
  Pausemenüs nie entfernt — die CSS-Regel `.erika.collapsed .erika-help-btn { display:flex }` /
  `.erika.collapsed .erika-avatar { display:none }` erzwang deshalb weiterhin den kleinen „?"-Button
  statt der großen Figur, obwohl `.paused` auch gesetzt war. Fix: `openPause()` entfernt `collapsed`
  jetzt zusätzlich zu `compact`; `resume()` und `hidePause()` setzen `collapsed` beim Schließen wieder
  (damit Stufenauswahl/Startseite danach wieder korrekt den kleinen Button zeigen).
- **✅ Bugfix: „Weiterspielen" trotz `font-weight:700` nicht fett.** CSS-Spezifitäts-Falle: die
  allgemeine Regel `.erika-pause button` (Klasse+Element = Spezifität 0,1,1) gewann gegen die
  spezifischere Absicht `.ep-resume` (nur Klasse = 0,1,0), OBWOHL letztere weiter unten im Code
  stand — Reihenfolge im Stylesheet entscheidet nur bei GLEICHER Spezifität. Fix: `.erika-pause
  .ep-resume { font-weight:700; }` (zwei Klassen = 0,2,0, schlägt die Element-Selektor-Regel).
  **Lehre für ähnliche Fälle:** bei „Style X betrifft trotz expliziter Regel nicht" immer zuerst
  Spezifität der konkurrierenden Selektoren vergleichen, nicht nur die Position im Stylesheet.
- **Ton:** `SOUND_ON`-Konstante entfernt — `setupAudio()` in `suchen.js`/`verfolgen.js` (Suchen 2 /
  Verfolgen 2) fragt jetzt live `soundEnabled()` ab, die `getSetting('soundOn')` liest. Der Schalter
  „Ton" in den Einstellungen schaltet den Audio-Ton dieser beiden Audio-Stufen damit wirklich an/aus
  (Standard: an).
- **Lautstärke:** seit August 2026 wirksam (vorher nur gespeichert). Neuer Helfer `volumeFactor()`
  in `suchen.js`/`verfolgen.js` skaliert die Grundlautstärke (`proximity*0.12*volumeFactor()`).
  Wird bei jedem Ton-Update frisch gelesen, damit ein Umschalten sofort greift — gleiche Bauart wie
  `soundEnabled()`. AURAs Sprachausgabe nutzt denselben Wert.
- **Sprachausgabe AURA:** ebenfalls seit August 2026 wirksam. `erika.js` spricht Sprechblase und
  Info-Overlay über die Web Speech API (`de-DE`). Verlangt bewusst BEIDE Schalter — wer „Ton"
  ausschaltet, erwartet auch von AURA Stille. Bricht beim Schließen und beim Seitenwechsel ab
  (`pagehide`), sonst redet die Stimme in die nächste Seite hinein.
  Dafür lädt jetzt auch `tiere.html`/`ueber.html`/`datenschutz.html` `settings.js` — dort war es
  nicht eingebunden, AURA hätte die Einstellung also gar nicht lesen können.

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

Im August 2026 grundlegend redesignt, um zum restlichen App-Design zu passen. **Zweite, größere
Überarbeitungsrunde** (ebenfalls August, nach dem ursprünglichen Redesign unten) hat Struktur und
Feinheiten nochmal deutlich verändert — siehe „Zweite Runde" unten, die ist maßgeblich für den
aktuellen Stand.

**Ursprüngliches Redesign:**
- **Karten** (`.setting-row`, `.stat-card`): **weiß mit Schatten** statt der
  ursprünglichen durchsichtigen „Glas"-Optik (`rgba(255,255,255,0.07)`-Hintergrund). Text-Farben
  entsprechend auf Schwarz/dunkles Grau umgestellt.
- **„Fertig"-Button** (oben rechts, `.done-btn`): quadratischer Icon-Button, exakt gleich groß/
  positioniert wie der Einstellungen-Button auf der Startseite (siehe Abschnitt 5+8), inkl. kleinerer
  Erweitert-Modus-Variante.
- **Erika:** zeigt nur noch den „?"-Button (`Erika.startCollapsed()`), nicht mehr die große Figur.
- **Neuer Schalter „Farbenblind-Modus"** unter „Darstellung" (siehe Abschnitt 4).
- **⚠️ Kontrast-Audit durchgeführt (WCAG-Formel real durchgerechnet, nicht nur nach Auge geschätzt):**
  Zwei echte Bugs gefunden (Zahnrad-Icon oben + Stift-Icon neben dem Namen hatten **kein** `color`
  gesetzt → randerten schwarz auf dem blauen Verlauf, kaum sichtbar → jetzt `color:#fff`). Mehrere
  zu schwache Textfarben angehoben, betroffene 0.825rem-Texte auf 0.9–0.975rem vergrößert. **Falls
  weitere Textstellen in der App ergänzt werden: immer explizit `color` setzen, nie auf einen
  impliziten/geerbten Wert verlassen** — das war die Ursache beider gefundenen Bugs.
- `ueber.html`/`datenschutz.html` sind **bewusst NICHT** an das neue Karten-Design angepasst
  (nicht angefragt) — deren „Zurück"-Buttons nutzen weiterhin den alten `common.css`-Standard-Stil.

**Zweite Überarbeitungsrunde (aktueller Stand):**
- **„Version" → „Modus" umbenannt** (Überschrift). Die Karte zeigt jetzt NUR noch den Umschalter
  Einfach/Erweitert, kein Erklärtext mehr daneben — dafür deutlich größer (`.segmented-lg`, eigene
  `padding`/`font-size`) und mittig (`.mode-row { justify-content:center; }`) statt neben einem
  Textblock.
- **„Fertig"-Button** ist jetzt **grün `#85d67d`** (wie „Spiel starten", vorher weiß+Schatten) und
  nutzt das **`circle-check`-Icon** (Kreis mit Häkchen, neu von Lucide nachgeladen unter
  `app/assets/icons/circle-check.svg`) statt des einfachen Häkchens ohne Kreis.
- **Name-Option verschoben:** Liegt jetzt als eigene weiße Kachel **unter „Mein Training"** (nur
  Erweitert-Modus) statt fest im Kopfbereich der Seite (dort war sie vorher in BEIDEN Modi sichtbar).
  Kein Stift-Icon-Button mit `prompt()`-Dialog mehr — stattdessen ein **direkt beschreibbares
  Texteingabefeld** (`<input class="name-input">`, `id="profil-name"`) im selben weiß+Schatten-Stil
  wie die Segmented-Controls, speichert per `change`-Event.
- **Streak-Anzeige** („Tage in Folge"): Flammen-Icon entfernt, zeigt nur noch die Zahl.
- **Tagesübersicht (Wochen-Kreise):** Nicht trainierte Tage sind jetzt **dunkelgraue Kreise**
  (`#6b7280`, vorher fast unsichtbar transparent), trainierte Tage **grün `#85d67d`** (vorher Mint)
  mit dem **`circle-check`-Icon** (dasselbe wie der „Fertig"-Button) in **Schwarz**, extra vergrößert
  (`.day-cell.trained .day-dot .lucide { width:1.6em; height:1.6em; }`) auf Nutzerwunsch nach
  mehreren Iterationsrunden.
- **Überschriften-Abstände vereinheitlicht:** `.settings-group-title` hat jetzt `margin-top:1.25rem`
  (deutlich größerer, einheitlicher Abstand zum VORHERIGEN Bereich) mit `margin-top:0` nur beim
  allerersten Element (`.settings-list > .settings-group-title:first-child`) — vorher gab es
  uneinheitliche Extra-Abstände (u. a. doppelte `margin-top` bei `.stat-cards`/`.week-row`, die
  entfernt wurden), sodass der Abstand zum eigenen Bereich darunter und zum Bereich davor gleich
  aussahen. Fett + zentriert statt links, ohne Icon (vorher hatte jede Überschrift ein Lucide-Icon
  davor, das wurde ersatzlos entfernt).
- **Segmented-Controls (Betroffene Seite/Sitzungsdauer/Schriftgröße)** im selben Stil wie der
  Modus-Umschalter angeglichen: **weißer Track statt hellgrauem**, mit **Schatten auf dem GANZEN
  Umschalter** (`.segmented { box-shadow:0 4px 22px rgba(0,0,0,0.3); }`), nicht nur auf dem aktiven
  grünen Segment — sonst wirkte nur die grüne Seite klickbar.
- **⚠️ Schatten-Konvention neu eingeführt: nur tatsächlich klickbare Elemente bekommen einen
  Schatten.** `.setting-row` (reiner Container um Toggle/Segmented/Slider) hat **keinen** Schatten
  mehr, außer `.setting-row.link-row` (die echten `<a>`-Links „Über die App"/„Datenschutz"). Ebenso
  `.stat-card`/`.week-row` (reine Anzeige) ohne Schatten. Der Modus-Umschalter selbst
  behält seinen Schatten, weil er wirklich anklickbar ist (Schatten sitzt jetzt direkt auf
  `.segmented-lg`, nicht mehr redundant zusätzlich auf der umgebenden `.setting-row`).
- **Grün-Vereinheitlichung:** Toggle-„an", Segmented-„aktiv", Tagesübersicht-„trainiert" und der
  Lautstärke-Regler (`accent-color`) sind alle auf dasselbe `#85d67d` wie „Spiel starten" (vorher
  Mint `#34d399`) — **ein kurzer Zwischenversuch, das stattdessen auf das helle Verlaufsblau
  `#196e91` umzustellen, wurde auf Nutzerwunsch wieder verworfen** ("grün war besser").
- `ueber.html`/`datenschutz.html` weiterhin bewusst NICHT angepasst (siehe oben).

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

**⭐ GELÖST im August 2026 — der wochenlange Steuerungs-Bug war eine falsche Achsen-Zuordnung.**

`orientation.js` las `rotationRate.alpha/beta/gamma` als Drehung um **z/x/y**. Das ist die Konvention
von `deviceorientation`. Für **`devicemotion` gilt alpha/beta/gamma = Drehung um x/y/z** — belegt
durch die W3C-Spezifikation (`DeviceMotionEventRotationRate`: "rotation rate about the X axis" für
alpha) und durch Chromium (`device_motion_event_pump.cc`: `Create(gyro.x, gyro.y, gyro.z)`). Die
Spezifikation wurde 2019 an die Implementierungen angepasst; ältere Quellen im Netz nennen noch z/x/y.

**Warum das so schwer zu finden war:** `yawRate = ω·ĝ` projizierte ein *vertauschtes* ω. Eine
mathematisch reine Drehung ergab dadurch Gier ≈ 0 (gemessen 1.8e-15). Was am Gerät als Links/Rechts
wirkte, war nur der unbeabsichtigt mitgekippte Anteil — daher gleichzeitig **schwaches Schwenken**
(SENSOR_GAIN wurde deshalb mehrfach erhöht, ein reines Symptom-Pflaster) und **starkes Übersprechen
beim Kippen**. Kipp blieb heil, weil es allein aus dem Schwerkraftvektor kommt und `|ω|` gegen eine
Achsenvertauschung unempfindlich ist (die Ruhe-Erkennung funktionierte deshalb weiter).

**⚠️ Zwei Annahmen aus früheren Sessions waren FALSCH und stehen hier nur noch als Warnung:**
1. „Die Vorzeichen sind geräteabhängig." — Nein. Das war ein Trugschluss aus genau diesem Bug.
   Die Vorzeichen ergeben sich aus der Sensor-Semantik und der Anzeige-Formel und sind in den
   drei Spiel-Dateien jeweils oben hergeleitet dokumentiert.
2. Die beiden `YAW_PITCH_COUPLING`-Ansätze (Rate-Verhältnis-Filter, Kipp-Raten-Korrektur) setzten
   am Symptom an und mussten scheitern. Nicht wieder aufgreifen.

**Lehre für ähnliche Fälle:** Bei „Vorzeichen/Verstärkung passen am Gerät nicht" zuerst die
**Achsen-Semantik gegen Spezifikation und Engine-Quelltext prüfen**, statt Konstanten zu variieren.

Touch bleibt überall Fallback.

- **Modul `orientation.js`**: `window.OrientationControl` (Suchen + Verfolgen), `window.TiltControl` (Lenken). Komplementär-Filter für Schwerkraft (`GRAV_TAU=0.5`), bewegungs-gated Kalibrierung.
- **✅ Bugfix (behoben): Touch/Maus-Steuerung blieb im geführten Einfach-Modus dauerhaft blockiert.**
  `flow.js` startet den Sensor automatisch beim Laden; sobald irgendwann ein Sensor-Event ankam,
  setzte `onOrientUpdate`/`onTiltUpdate` einen Merker (`orientationActive`/`sensorActive`) dauerhaft
  auf „aktiv" — Touch/Maus-Fallback ging danach für den Rest der Seite nicht mehr, egal was passierte
  (auch bei nur schwachen/keinen echten Bewegungen, z. B. am Laptop). Fix in
  `suchen.js`/`verfolgen.js`/`lenken.js`: `onpointerdown` setzt den Merker jetzt auf `false` zurück
  statt nur `return` bei aktivem Sensor — ein Klick/Touch reklamiert die Steuerung sofort zurück,
  echte Sensordaten übernehmen aber beim nächsten Tick genauso sofort wieder.
- **✅ Neu: Sensor startet im Erweitert-Modus jetzt automatisch, ohne Button-Klick.** Vorher musste
  auf den Standalone-Seiten (Suchen/Verfolgen/Lenken ohne `?flow=`) immer erst „Bewegungssensor
  aktivieren" angetippt werden. `requestSensorPermission(silent)` (neuer optionaler Parameter) wird
  jetzt beim Laden automatisch mit `silent=true` aufgerufen (`initSensorButton()` am Dateiende) — auf
  Android/den meisten Browsern gibt es keine `requestPermission()`-API, das klappt ohne Nutzer-Geste
  sofort (kein Dialog), der Button blendet sich danach selbst aus. Auf iOS schlägt der stille Versuch
  ohne echten Tipp fehl (Browser-Einschränkung) — dort bleibt der Button als Fallback sichtbar, und
  `silent=true` unterdrückt dabei bewusst die „Zugriff verweigert"-Meldung, die sonst wie ein echter
  Fehler wirken würde, bevor der Mensch überhaupt etwas getan hat.
- **Aktuelle Vorzeichen (hergeleitet, am Android-Tablet bestätigt):**
  - `suchen.js`: `SENSOR_GAIN=3.2`, `SIGN_YAW=-1`, `SIGN_PITCH=+1`
  - `verfolgen.js`: `SENSOR_GAIN=5.0`, `SIGN_YAW=-1`, `SIGN_PITCH=-1`
  - `lenken.js`: `TILT_GAIN=1.7`, `SIGN_TILT_X=-1`, `SIGN_TILT_Y=-1`
    (`TiltControl` liefert die *Rollrichtung*, die Physik nutzt die *Hangrichtung* — daher die
    Umkehr. Korrektur sitzt bewusst in `lenken.js`, nicht in `TiltControl`, damit dessen
    dokumentierte und per Testsuite abgesicherte Bedeutung unangetastet bleibt.)
- **`SensorConvention` (neu in `orientation.js`):** Das Vorzeichen von
  `accelerationIncludingGravity` wird gegen `deviceorientation` **gemessen** statt pro Gerät geraten.
  Laut Spezifikation zeigt der Vektor nach oben (flaches Gerät = `{0,0,+9.81}`); Android hält sich
  daran, iOS invertiert.
- **Fehlendes Gyroskop** wird über den neuen `onUnavailable`-Rückruf gemeldet, statt still nichts zu
  tun, während die Oberfläche „Sensor aktiviert" anzeigt (kommt auf günstigen Tablets vor).
- **Testsuite `test-sensorik/`** (Node, keine Dependencies): liegt als Geschwister von `app/` und
  prüft dadurch direkt den Auslieferungsstand. **Auf diesem Rechner ist kein Node installiert** —
  ausgeführt wurde sie über eine CommonJS-Nachbildung im Browser. Neuer Stand 21/21, alter 6/21.
  Nicht mit der eingefrorenen alten `test/`-Version verwechseln.
- **`DEBUG_SENSOR = false`** in allen drei JS (im August 2026 abgeschaltet). Auf `true` setzen, wenn
  wieder fern-diagnostiziert werden muss — dann erscheint unten links eine Live-Anzeige.
- **Diagnosewerkzeuge:** `labor/` (Sensor-Labor: Achsen isoliert testen, Vorzeichen/Verstärkung live
  umschalten, Übersprechen messen, Achsen-Diagnose mit Rohwerten) und `labor/vibration.html`.
  Dazu `app/sensor-check.html`. Das alte `sensor-test.html` im Root ist **entfernt** (arbeitete noch
  mit dem überholten `deviceorientation`-Euler-Ansatz).
- Bugfix `render()`-Null-Guard in `app/` behoben; gleicher Latenz-Bug existiert noch in `test/` + Root (frozen, bewusst nicht übernommen).

---

## 12. Tutorial-Animationen: Hand-Grafiken

**⭐ Seit August 2026 bei allen 9 Übungs-Demos** (Suchen 1-3, Verfolgen 1-3, Lenken 1-3), nicht mehr
nur beim Suchen-1-Pilot.

- **Muster:** Eine Hand als `app/assets/Hand.svg` (Daumen + hintere Finger bewusst abgeschnitten,
  damit eine gerade Kante direkt an die Tablet-Kante gelegt werden kann; Ärmel-Füllfarbe `.cls-4`
  in der SVG, aktuell `#410f59` dunkelviolett). Wird **zweimal eingebunden**: rechts unverändert,
  links per CSS `transform:scaleX(-1)` gespiegelt — anatomisch korrekt, da linke/rechte Hand bei
  symmetrischem Griff Spiegelbilder sind. Beide `<img>` sind Kind-Elemente des jeweiligen
  Tablet-Containers (in `js/suchen.js`/`verfolgen.js`/`lenken.js`, `DEMOS[n].scene`) und erben
  dadurch automatisch dessen Kipp-/Bewegungs-Animation. `Hand.svg` wird ohne `?v=`-Cache-Busting
  eingebunden — Änderungen daran können bis zu 10 Min. brauchen bzw. privates Tab nutzen.
- **Positionierung** (`css/intro.css`, `.demo-hand`/`.demo-hand-left`/`.demo-hand-right`): An den
  unteren Ecken des Tablet-Rahmens, Basiswerte `bottom:-8px; right/left:-46px;` für den
  Standard-`.demo-device` (232×158px, Suchen 1+2, Verfolgen 1-3 via `anim-tilt-left`/`anim-keep`).
  **Zwei Größen-Varianten für abweichende Container:** `.demo-hand-sm` (Suchen 3,
  `.demo-device.anim-seek`, kleinerer Container 190×128px, kleinere/nähere Werte) und
  `.demo-hand-flat` (Lenken 1-3, `.demo-flat`, 300×160px mit `rotateX`-Perspektive statt seitlichem
  Kippen, breitere/andere Werte). Die Hände sollen am äußeren Rahmen greifen, nur die Fingerspitze
  minimal auf den Screen reichen. Beim Anpassen: **immer mit pausierter/entfernter
  Animations-Klasse ODER `element.style.animation = 'none'` messen** (Konsole), sonst verfälscht
  die laufende Bewegung die `getBoundingClientRect()`-Messung — `style.animation='none'` behält
  dabei anders als Klassen-Entfernen die Container-Größe (z. B. bei `.anim-seek`), da die Maße an
  der Klasse hängen, nicht am Animationsnamen.
- **Getestet in beiden Kontexten**, in denen `DEMOS[n].scene` verwendet wird: Erst-Anzeige-Popup
  (`intro.js`) UND Erika-Pausemenü (`erika.js showDemo()`), jeweils Einfach- und Erweitert-Modus-Größe.
- **⭐ Erst-Anzeige-Popup (`.intro-card`, `css/intro.css`) im August 2026 überarbeitet:** Karte von
  dunkelgrün (`#13301f`) auf **weiß** (mit dunklem Text) umgestellt (nur die Karte — der abgedunkelte
  Hintergrund `.intro-overlay` bleibt unverändert dunkel). Button-Text „Los geht's" → **„Los
  spielen"** (in `intro.js`, zwei Stellen: statisches Markup + `maybeShow()`-Aufruf). Button
  `.intro-btn` jetzt **grün `#85d67d`** (war kurz testweise Mint, dann auf das App-Grün korrigiert)
  mit **demselben Schatten wie „Spiel starten"** und etwas **breiter/größer** (`padding` erhöht).
- **`Intro.replay()` ist im August 2026 ENTFERNT worden** (war nie verdrahtet). Kein
  Funktionsverlust: „Fortschritt & Statistik zurücksetzen" räumt `neuroar_intros_seen` mit ab,
  die Tutorials kommen dadurch wieder. Soll es einen eigenen „Tutorial erneut ansehen"-Knopf
  geben, genügt `present(def, 'Weiter', onClose)` in `intro.js`.
- **Der Knopf im Erst-Anzeige-Popup heißt jetzt „Spiel starten"** (vorher „Los spielen").

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
Kern-Globals via `window.X`: `Erika`, `Intro`, `OrientationControl`, `TiltControl`, `SensorConvention`.
Zusätzlich `app/sensor-check.html` (Diagnoseseite).

**Weitere Ordner im Repo-Root (NEU, gehören nicht zur App):**
- `labor/` — Sensor-Labor + Vibrations-Diagnose. Lädt die ECHTE `app/js/orientation.js`.
- `test-sensorik/` — Node-Testsuite, prüft `app/js/orientation.js` direkt.
- ENTFERNT: `loesung/` (in `app/` aufgegangen), `sensor-test.html`, `app/assets/blume.png`.
`settings.js` lädt VOR `flow.js` (flow.js liest `getSetting('audioExercises')`).

### localStorage-Keys & Konventionen
- `neuroar_settings` — Einstellungen. Felder: `mode` (`patient`/`pflege`), `audioExercises` (bool), `fontSize` (`klein`/`mittel`/`gross`), `colorblindMode` (bool, Standard `false`), `alwaysShowIntro` (bool, Standard `false`, NEU), `vibration` (bool, Standard `true`, NEU), `side`, `sessionDuration`, `soundOn`, `volume`, `erikaVoice`, `reminderEnabled`, `reminderTime`. (`userName` liegt NICHT hier, sondern in `neuroar_stats` — siehe unten.)
- `neuroar_progress` — Übungs-Zähler (`{ "suchen_1": 3 }`) für die Häkchen auf den Auswahl-Karten.
- `neuroar_stats` — Trainingsstatistik (firstDate, totalSeconds, days{}, goalDays{}, **userName**).
- `neuroar_flow_order` — die gewürfelte Reihenfolge des geführten Ablaufs (Abschnitt 17). Wird bei
  jedem „Spiel starten" überschrieben; **absichtlich nicht** von den Reset-Knöpfen mit abgeräumt, sie
  ist kein Fortschritt, sondern Zustand der laufenden Sitzung.
- `neuroar_intros_seen` — welche Erklär-Demos schon liefen. **Wird jetzt zusammen mit Fortschritt/Statistik zurückgesetzt** (siehe Abschnitt 12).
- **Stolperfallen:** „Lenken" heißt intern weiter `lenken`. Weißer-Rand-SVG-Filter `#whiteOutline` wird von `common.js` injiziert (`.outlined`); bewegte Objekte nutzen das günstige `.lite-outline`. Modus-/Fontsize-/Colorblind-Sichtbarkeit läuft über Attribute am `<html>` — Display bei Modus-Blöcken NIE inline setzen (schlägt die CSS-`display:none`-Regel).

---

## 14. Was seit dem letzten Handoff dazugekommen ist (August 2026, 25 Commits)

Kurzliste, damit nichts doppelt gebaut wird. Details in den jeweiligen Abschnitten.

- **Sensorik gelöst** (Abschnitt 11) — Achsen-Bug, plus `SensorConvention`, Gyroskop-Erkennung,
  Testsuite, `DEBUG_SENSOR` aus.
- **Vibration** als Rückmeldung. Vokabular `VIBRATION` in `common.js` (`tipp` 35 ms, `treffer` 45 ms,
  `abschluss` [45,90,45]), Schalter unter „Ton", wirkt in den Einstellungen und in allen drei Spielen.
  **Falle:** `navigator.vibrate()` verlangt eine gültige Nutzer-Geste. `pointerdown` ist laut
  HTML-Spezifikation NUR mit Maus eine solche — bei Berührung zählen `click`, `pointerup`, `touchend`.
  Eine erste Fassung hörte auf `pointerdown` und war deshalb am Tablet komplett wirkungslos, während
  sie am Rechner mit Maus einwandfrei lief. **Derselbe Fehler steckte in der Ton-Entsperrung**
  (`createTone` in `common.js`) und ist dort mitbehoben.
- **Optische Textzentrierung** — CSS-Variable `--optische-mitte: 0.14em` in `common.css`.
  Luciole hat eine asymmetrische Metrik (Ascent 12 : Descent 3), Text saß in allen Feldern rund
  2–3 px zu hoch. Ausgeglichen über asymmetrischen Innenabstand, Boxhöhen bleiben gleich.
  **Zwei Fallen, beide im CSS kommentiert:** (1) Bei Buttons mit Icon UND Text verschiebt der
  Ausgleich auch das Icon — die Icons werden dort per `position:relative` zurückgeschoben. (2) Buttons
  mit `display:block` und Inline-Icon (Pausemenü) brauchen den Ausgleich NICHT, dort sitzt der Text
  schon mittig. Gemessen wird auf das VERSALBAND mit fester Referenz („H"), nicht auf die volle
  Tintenausdehnung — sonst verfälschen Umlaute und Unterlängen das Ergebnis.
- **Einstellungen:** neue Schalter „Erklärung immer zeigen" (`alwaysShowIntro`) und „Vibration".
  Lautstärke und AURA-Sprachausgabe sind jetzt **wirksam** (vorher nur gespeichert). Zahnrad-Icon und
  Schriftgrößen-Vorschau entfernt. Lautstärke-Anzeige feste Breite (sprang bei 100 %). Schriftgrößen-
  Umschalter zieht die Scrollposition nach (sprang vorher weg). Schalter und Uhrzeit-Feld haben jetzt
  denselben Schatten wie die übrigen Bedienelemente.
- **Übungen:** Zähler und „AR Kamera"-Schriftzug oben rechts **entfernt** (samt der zehn
  `$('score')`-Zugriffe). Suchen 1/2 starten weiter außen (`SEEK_ANGLE_MIN/MAX` = 45/75 Grad, ~65 Grad
  entspricht dem Bildschirmrand). Alle Hinweistexte neu formuliert.
- **Erkläranimationen:** alle neun Texte neu, Button heißt „Spiel starten", Überschrift mittig
  zwischen Kartenrand und blauer Fläche (`margin:-6px 0 18px`, negativ ist Absicht), Karte hat
  `max-height` + Scroll als Sicherheitsnetz, Salatblätter in Lenken 2 blenden beim Einsammeln aus.
- **Startseite:** Knopf „Bewegungssteuerung aktivieren" entfernt — die Freigabe holt jetzt „Spiel
  starten" selbst, was zugleich die von iOS verlangte Nutzer-Geste ist. Essen/Fotos ausgegraut
  (`.game-tile.soon`).
- **Rechtstexte:** Impressum und Datenschutz mit echten Inhalten (Jonas Masch, jomasch8@gmail.com,
  Bachelorarbeit). Der Datenschutztext benennt jetzt auch die IP-Weitergabe an GitHub Pages und dass
  die Sprachausgabe je nach Gerät online erzeugt wird. **Muss erweitert werden, sobald die Kamera
  kommt.**
- **AURA:** Sprachausgabe verdrahtet (Web Speech API, verlangt „Ton" UND „Sprachausgabe" an).
  Ihre Tipps nannten Medaillen und ein Profil — beides gibt es nicht mehr, korrigiert.
- Titel aller Seiten auf AURA vereinheitlicht. `Intro.replay()` (toter Code) entfernt.

---

## 15. OFFENE PUNKTE / nächste Schritte

Empfohlene Reihenfolge. Begründung: Offline muss zuletzt (der Service Worker friert Dateiliste und
URLs ein), die finalen Bilder davor (der Kamera-Hintergrund bestimmt, wie kontrastreich die Motive
sein müssen), die Kamera davor.

### 1. ✅ Kamera — UMGESETZT (August 2026), siehe Abschnitt 16

Die vier Entscheidungen des Nutzers sind alle umgesetzt: alle drei Übungen, Schalter in den
Einstellungen, Rückkamera, bei Verweigerung kurzer Hinweis + Foto. Der Datenschutztext ist
ergänzt. **Offen bleibt nur die Kalibrierung am Gerät** — Helligkeit/Kontrast des Live-Bildes
gegen die Objekte, dafür gibt es einen einzelnen Stellwert (`.cam-live::after` in `common.css`).

### 2. Finale Bilder (wartet auf den Nutzer)

Echte Zeichnungen, fotografiert und in Photoshop freigestellt, also **PNG mit Alphakanal**.
Spezifikation ist mit dem Nutzer abgestimmt:
- **Bewegte Objekte** (Käfer, Uhu, Schmetterling, Schnecke, Salate) werden mit **92 px** angezeigt
  → lange Kante **~280 px** liefern (dreifach, deckt hochauflösende Tablets).
- **Zielobjekte** (Blatt, Blume, Astkreis) werden mit **120 px** angezeigt → **~360 px** liefern.
- Die vorhandenen Platzhalter sind 950–1200 px und damit rund zehnmal zu groß pro Kante
  (`Blume_2.png` 1,4 MB, `schmetterling.png` 1,1 MB). Beim Ersetzen fällt das Gewicht der App
  deutlich — relevant für den Offline-Schritt.
- **Keinen weißen Rand einzeichnen** — die App legt ihn selbst per SVG-Filter darüber.
- Quadratisch freistellen, Motiv zentriert (Anzeige ist quadratisch mit `object-fit:contain`).

### 3. App-Icon (wartet auf den Nutzer)

Quadratisches PNG, mindestens 512 × 512. Daraus entstehen die 192er-Variante und eine
maskable-Fassung mit Sicherheitsrand. `manifest.json` verweist derzeit nur auf
`assets/erika_icon.svg`.

### 4. `app/` → Root verschieben, alte Versionen aufräumen

Muss **vor** dem Offline-Schritt passieren, weil sich URLs und Scope des Service Workers ändern.
Betrifft die eingefrorene Root-Version und `test/`.

### 5. Offline (Service Worker)

Zuletzt. **Gute Nachricht:** Die App hat null externe Netzwerkabrufe zur Laufzeit (Schriften, Icons,
Bilder alle lokal, kein CDN) — es geht also nur darum, die Dateien zu cachen. Der `?v=N`-Zirkus aus
Abschnitt 2 fällt damit weg. Ein Umstieg auf Capacitor wurde geprüft und **verworfen**: dessen
Motion-Plugin nutzt dieselben Web-APIs, bringt also für die Sensorik nichts.

### Kleinere offene Punkte

- **Tägliche Erinnerung** (`reminderEnabled`/`reminderTime`) wird gespeichert, tut aber nichts.
  In einer reinen Web-App ohne Service Worker auch nur eingeschränkt machbar — vor dem Bauen
  Umfang klären.
- **Betroffene Seite links/rechts** ist bewusst Platzhalter ohne Funktion (Nutzer-Entscheidung).
  Der Links-Bias steckt fest verdrahtet in `randSide()` (suchen.js, 78 %), `verfolgen.js` (75 %)
  und den `--free-*`-Zonen in `common.css`.
- **Essen/Fotos** sind ausgegraute Platzhalter mit Toast.
- **Farbenblind-Modus** ist ein generischer Kontrast-/Sättigungsfilter, keine gezielte Korrektur.
- **Kein Datenexport.** Nach Nutzer-Aussage ist vorerst keine Evaluation mit echten Testpersonen
  geplant. Falls doch: **vorher** klären, was aufgezeichnet werden soll — nicht mitgeschriebene
  Daten sind hinterher unwiederbringlich weg.
- Optional: dieselben Fixes nach `test/`/Root ziehen (aktuell bewusst nicht).

---

## 16. Kamera-Hintergrund (August 2026, umgesetzt)

Modul **`app/js/kamera.js`**, global `window.Kamera` mit `start()` / `stop()` / `aktiviert()`.
Eingebunden in `suchen.html`/`verfolgen.html`/`lenken.html` (direkt nach `orientation.js`).

- **Einstellung `cameraBg`** (bool, **Standard aus**), Schalter „Kamera-Hintergrund" unter
  *Darstellung*, also `.pflege-only`. Standard bewusst aus: sonst fragt die App schon beim ersten
  Start nach der Kamera, bevor klar ist wofür. Wird bei jedem Aufruf frisch gelesen (gleiche Bauart
  wie `soundEnabled()`/`vibrate()`).
- **Lebenszyklus:** `Kamera.start()` steht an **drei** Stellen — beim Laden der Übungsseite (am Ende
  von `kamera.js` selbst, nur wo es ein `#screen-level` gibt), in `beginStage()` vor der
  Erkläranimation und in `startLevel()` direkt nach `showScreen('screen-level')`.
  `Kamera.stop()` in `goHome()`; zusätzlich hängt sich das Modul selbst an `pagehide`.
  **⚠️ NICHT in `cleanup()` stoppen** — `cleanup()` läuft auch am Anfang von `startLevel()`, die
  Kamera würde zwischen zwei Übungen neu starten und sichtbar nachbelichten.
- **⚠️ Vorwärmen — warum start() mehrfach aufgerufen wird (Nutzer-Rückmeldung, August 2026):**
  `getUserMedia` braucht je nach Gerät eine halbe bis anderthalb Sekunden bis zum ersten Bild. Wurde
  erst beim Übungsstart gefragt, sah man genau so lange das Foto und erst danach die Kamera — das ist
  aufgefallen und war der Auslöser für diesen Umbau. Jetzt wird so früh wie möglich gefragt: beim
  Seitenaufbau und beim Antippen der Kachel (die Erkläranimation deckt die Startzeit ab). Doppelte
  Aufrufe kosten nichts, `start()` steigt bei laufendem oder gerade laufendem Versuch sofort aus.
  Preis: auf der Stufenauswahl läuft die Kamera schon, bevor eine Übung gewählt ist.
  **Nebenwirkung des Vorwärmens:** das Zeitfenster „Versuch läuft noch, Nutzer verlässt die Übung
  schon" ist dadurch real erreichbar geworden. `stop()` setzt deshalb einen Merker `gestoppt`, den
  der Erfolgs-Rückruf prüft — sonst hinge ein Strom ohne Anzeige weiter, die Kamera bliebe an.
- **⚠️ Kein Foto-Aufblitzen:** solange ein Versuch läuft, bekommt `#screen-level` die Klasse
  `kamera-statt-foto` und das Foto wird ausgeblendet (`opacity:0`, Regel in `common.css`,
  Spezifität (1,1,1) schlägt die (1,0,1) der Foto-Regeln in den drei Modul-CSS). Man sieht das
  App-Blau des `<body>` und darauf blendet das Videobild auf. **Scheitert der Zugriff, nimmt
  `abbauen()` die Klasse wieder weg** — auch auf dem Pfad, der nur nachfassen will, sonst liefe die
  Übung bis zur nächsten Berührung vor leerem Blau.
  **Und umgekehrt:** ~350 ms nach dem Einblenden (Überblendung ist 0,3 s) wird das Foto wieder
  zugeschaltet. Es liegt dann unsichtbar hinter einem deckenden Video und ist reines Sicherheitsnetz:
  malt der Browser das Video wider Erwarten nicht (Treiber, Energiesparen, Hardware-Overlay), sieht
  man das Foto statt einer schwarzen Fläche. Aus demselben Grund hat `.cam-live` **bewusst keine**
  eigene Hintergrundfarbe. Das Foto erst nach der Überblendung zuschalten, nicht sofort — während das
  Video halb durchsichtig ist, würde es sonst durchscheinen.
- **Stirbt der Strom mitten in der Übung** (andere App greift auf die Kamera zu, Betriebssystem
  entzieht sie), fällt es über `track.addEventListener('ended', stop)` still aufs Foto zurück.
- **DOM/CSS:** zur Laufzeit wird `<div class="cam-live"><video class="cam-video"></video></div>` in
  `#screen-level` eingehängt — also **nach** dem vorhandenen `.cam-bg` mit dem Foto. Beide liegen auf
  `z-index:0`; bei gleichem z-index entscheidet die DOM-Reihenfolge, das Videobild deckt das Foto
  damit ab. Fällt der Zugriff aus, wird die Hülle wieder entfernt und das Foto liegt unverändert da.
  Die 90°-Drehung des Lenken-Fotos (`#screen-level .cam-bg` in `lenken.css`) betrifft das Video
  nicht, es ist ein Geschwister-Element — am Gerät in allen drei Übungen geprüft.
- **`.an`-Klasse** wird erst gesetzt, wenn wirklich ein Bild kommt (`opacity:0` → `1`), sonst blitzt
  kurz Schwarz auf, wo eben noch das Foto war.
- **Abdunklung:** `.cam-live::after` legt `rgba(0,0,0,0.28)` über das Video, damit sich die weiß
  umrandeten Objekte vor dem helleren, unruhigeren Live-Bild abheben. **Das ist der einzige
  Stellwert für die Kalibrierung am Gerät** (0 = aus).
- **⚠️ Nutzer-Geste — der wichtigste Punkt.** `getUserMedia` braucht HTTPS (über Pages gegeben) und
  wird ohne Bedienung nicht immer erlaubt; im geführten Ablauf startet die Übung direkt beim Laden,
  dort gibt es keine Geste. Deshalb **dieselbe Bauart wie beim Bewegungssensor**: erster Versuch
  läuft **still**, scheitert er an der Freigabe (`NotAllowedError`), wird **genau einmal** bei der
  nächsten Berührung nachgefasst (`click`/`pointerup`/`touchend` — **nicht `pointerdown`**, das zählt
  bei Berührung nicht als Geste, siehe Abschnitt 14). Erst wenn auch das scheitert, kommt der
  Hinweis. Genau einmal deshalb, weil der Browser eine echte Verweigerung merkt und sofort wieder
  ablehnt — sonst würde bei jeder Berührung neu gefragt.
- **`facingMode: { ideal: 'environment' }`, nicht `exact`** — mit `exact` scheitert der Zugriff auf
  Geräten mit nur einer Kamera (Laptop zum Entwickeln) komplett, statt einfach die vorhandene zu
  nehmen.
- **Hinweistexte** je nach Fehler: „Keine Kamera gefunden" / „Kein Zugriff auf die Kamera" /
  „Kamera nicht verfügbar", jeweils + „ — es bleibt beim Foto-Hintergrund".
- **`zeigeToast(text, dauer)` neu in `common.js`** (legt das Element bei Bedarf selbst an), `.toast`
  ist von `index.html` nach `common.css` gewandert. `index.html` behält bewusst seine eigene kleine
  `showComingSoon()`-Fassung — **die Seite bindet `common.js` gar nicht ein**, `zeigeToast` wäre dort
  undefiniert. Beim Ergänzen weiterer Toasts also vorher prüfen, ob die Seite `common.js` lädt.
- **Datenschutz:** Abschnitt „Kamera" in `datenschutz.html` ergänzt (nur Anzeige während der Übung,
  keine Aufzeichnung/Speicherung/Übertragung, Freigabe im Browser widerrufbar).

**Lokal geprüft** (Scratchpad-Server, Port 8101): Schalter speichert in beide Richtungen; bei
verweigertem Zugriff läuft die Übung normal vor dem Foto weiter und der Hinweis erscheint erst nach
dem zweiten Versuch; mit untergeschobenem Ersatz-Videostrom (`canvas.captureStream`, weil der
Vorschau-Browser keine Kamera hat) deckt das Video in allen drei Übungen bildschirmfüllend
(`object-fit:cover`) das Foto ab, Objekte und Overlays liegen darüber; `goHome()` beendet die Spuren
(`readyState: "ended"`) und räumt die Hülle ab, ein erneuter Start funktioniert; bei
`cameraBg:false` wird `getUserMedia` gar nicht erst aufgerufen. Vorwärmen mit künstlich verzögertem
Strom (700 ms) geprüft: Kamera ist bereits an, während `#screen-level` noch versteckt ist, und beim
Übungsstart liegt sofort das Videobild an; die Klassen-Abfolge (versteckt → versteckt während der
Überblendung → wieder sichtbar) stimmt. Abbruch mitten im Versuch gibt den Strom frei. Keine
Konsolenfehler.

**⚠️ Falle beim Prüfen im Vorschau-Browser:** Screenshots zeigen laufende `<video>`-Inhalte
manchmal als schwarze Fläche, obwohl alles korrekt läuft — das ist ein Artefakt der
Bildschirmaufnahme, kein Fehler der App. Verlässlich ist stattdessen eine Pixelprobe:
`ctx.drawImage(video,0,0)` auf ein kleines Canvas und `getImageData` auslesen. Das hat hier einmal
zu einer falschen Fährte geführt.

**Noch offen:** echte Prüfung am Tablet (Freigabedialog, Bildqualität, Abdunklungswert, Wärme/Akku
bei längerer Sitzung, und ob durch das Vorwärmen wirklich kein Foto mehr aufblitzt).

---

## 17. Zufällige Reihenfolge im geführten Ablauf (August 2026)

Auf Nutzerwunsch: der Einfach-Modus lief fest Suchen 1-3 → Verfolgen 1-3 → Lenken 1-3, jetzt ist die
Reihenfolge gewürfelt. Alles in **`app/js/flow.js`**.

**Was gemischt wird: die SPIELE, nicht die Übungen.** Innerhalb eines Spiels bleibt es bei 1 → 2 → 3,
damit nie die schwerste Stufe vor der leichtesten kommt (vom Nutzer so entschieden, Alternativen
„nur die Blöcke mischen" und „komplett zufällig" wurden verworfen). Ergebnis ist eine Verschränkung
wie „Verfolgen 1 · Suchen 1 · Lenken 1 · Suchen 2 · …".

**`mischen()`** gruppiert nach Spiel (Gruppe behält ihre Reihenfolge), lost dann Schritt für Schritt
ein Spiel aus und nimmt dessen **nächste** Übung. Zwei Einschränkungen bei der Auslosung:
1. nicht zweimal dasselbe Spiel hintereinander;
2. nur Spiele, die noch **fast am meisten** übrig haben (höchstens eins weniger als der größte Rest).

**Punkt 2 war nicht offensichtlich und ist der wichtigere.** Ohne ihn wurde in rund 6 % der Fälle ein
Spiel gar nicht angefasst, bis die anderen aufgebraucht waren — dann standen dessen drei Übungen
zwangsläufig am Stück am Ende, also genau der Dreierblock, der verschwinden sollte. Mit Punkt 2:
über je 20.000 Durchläufe (mit und ohne Audio-Übungen) **null Dreierblöcke**, längste Serie 2,
Startspiel gleichverteilt, keine Vollständigkeits- oder Reihenfolgefehler. Testskript-Muster: die
Funktion per `readFile`/`new Function` aus `flow.js` herausschneiden und in `jsc` laufen lassen
(**auf diesem Rechner ist kein Node installiert**, `jsc` liegt unter
`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`).

**⚠️ Die Reihenfolge MUSS gespeichert werden** (`localStorage`, `neuroar_flow_order`). Jede Übung ist
eine eigene Seite und `?flow=n` ist nur ein Index — würde bei jedem Seitenaufbau neu gewürfelt, zeigte
derselbe Index auf jeder Seite etwas anderes und der Ablauf liefe völlig durcheinander. Gewürfelt
wird genau einmal, in `Flow.starten()`.

**Struktur von `flow.js` geändert:** Die Datei stellt jetzt **immer** `window.Flow = { starten }`
bereit und macht die Übungs-Verdrahtung (`onNext`/`goHome`/`beginStage`) weiterhin nur bei `?flow=n`.
**`index.html` bindet `flow.js` neu ein** (nach `settings.js`, wegen `audioExercises`) und der
„Spiel starten"-Knopf ruft `Flow.starten()` statt fest `suchen.html?flow=0` — auf welcher Seite der
Ablauf beginnt, steht erst zur Laufzeit fest.

**Wiederherstellung bei unpassender Reihenfolge:** Passt `FLOW[step].page` nicht zur aufgerufenen
Seite (Speicher mitten im Ablauf geleert, von Hand eingetippte `?flow=`-URL, Lesezeichen aus der Zeit
der festen Reihenfolge), wird **nicht** weiter dem Index vertraut — `beginStage()` bekommt nur die
Nummer und würde sonst stillschweigend die falsche Stufe des aktuellen Spiels starten (etwa Übung 3
statt 2). Stattdessen frisch würfeln, speichern und auf der tatsächlich aufgerufenen Seite
einsteigen; deren erster Eintrag ist immer Übung 1, weil die Stufen aufsteigen. Die URL wird per
`history.replaceState` mitgezogen, damit der Rest des Ablaufs stimmt.

**Nicht angefasst:** Der Erweitert-Modus (Standalone-Aufruf ohne `?flow=`) ist unverändert — dort
wählt man Spiel und Übung ohnehin selbst. Der `audioExercises`-Filter wirkt weiterhin, er läuft
jetzt vor dem Mischen (7 statt 9 Einträge, geprüft). Wird die Einstellung mitten in einem laufenden
Ablauf umgeschaltet, behält die schon gewürfelte Reihenfolge ihre Gültigkeit — bewusst so, eine
laufende Sitzung soll sich nicht unter dem Menschen verändern.

**Lokal geprüft:** „Spiel starten" landet auf der gewürfelten ersten Übung (nicht mehr immer Suchen);
`onNext()` folgt über Seitengrenzen hinweg der gespeicherten Reihenfolge; widersprüchliche
Reihenfolge führt zur Neuwürfelung mit korrigierter URL und Einstieg bei Übung 1; ohne Audio-Übungen
sieben Einträge ohne die Uhu-Stufen; Erweitert-Modus unverändert. Keine Konsolenfehler.

---

## 18. Kopfblock `.hud` und Zeitbalken bei Verfolgen (August 2026)

Zwei Nutzerwünsche, beide gelöst über **dieselbe Umstrukturierung**.

**Vorher** war jedes Element am oberen Rand einzeln absolut positioniert: `.instr` (`top:5%`,
mittig bzw. an der 40-%-Kante), `.seq-list` (die 1-2-3-Punkte in Suchen 3) mit einem
handgerechneten `top: calc(5% + 3.25rem)`, und der Zeitbalken von Verfolgen als 5 px dünner Streifen
ganz oben am Bildschirmrand. „Mittig unter dem Hinweistext" ließ sich so nicht ausdrücken — die
Breite des Hinweis-Pills ist inhaltsabhängig, und zwei absolut positionierte Geschwister kennen die
Breite des anderen nicht.

**Jetzt: `.hud`** in `common.css` — ein Flex-Spalten-Block (`position:absolute; top:5%`), der
`.instr` und was direkt darunter gehört zusammenfasst. Nur so breit wie sein breitestes Kind,
Kinder darin zueinander zentriert. **Gleiche Bauart wie `.s-col`** im Erfolgs-Overlay (Abschnitt 5).
`.instr` hat dadurch **keine eigene Positionierung mehr**, nur noch das Aussehen des Pills; die
Modus-Umschaltung sitzt jetzt an `.hud` (`html.flow-mode .hud`). In allen drei Übungs-HTML ergänzt,
auch in `lenken.html`, wo nur `.instr` drinsteht — damit die Regeln überall gleich greifen.

Der Abstand kommt aus `gap:0.5rem`, nicht mehr aus gerechneten `top`-Werten. Ein ausgeblendetes
Kind (`.seq-list` in Suchen 1/2) erzeugt keinen Gap — geprüft, der Block ist dort exakt so hoch wie
das Pill.

**Zeitbalken Verfolgen:** `.timer-bar-bg` liegt jetzt im `.hud` direkt unter dem Hinweistext
(`align-self:stretch` → genauso breit wie das Pill), weiße Spur mit Schatten, grüne Füllung `#85d67d`,
`height:10px` bzw. **16 px im geführten Modus** — dieselben Maße wie der Tagesbalken auf der
Startseite. **Er füllt sich, statt sich zu leeren:** `verfolgen.js` rechnet jetzt mit der
ABGELAUFENEN Zeit (`(1 - timeLeft/DURATION) * 100`, Start `0%` statt `100%`), gleiche Leserichtung
wie der Tagesbalken. Der alte Streifen am oberen Bildschirmrand ist weg — er lag im Neglect-Layout
ausgerechnet in der Zone, die frei bleiben soll.

**Geprüft:** Suchen 3 im geführten Modus — Hinweis und Punkte teilen exakt dieselbe Mitte (55,5 %).
Verfolgen — Balken deckungsgleich mit dem Pill (40 %–67,1 %), 16 px im geführten, 10 px im
Erweitert-Modus, Füllung wächst von links. Formel gegen bekannte Restzeiten geprüft
(15 s → 0 %, 7,5 s → 50 %, 0 s → 100 %). Suchen 1 ohne Punkte: kein Leerraum. Lenken unverändert.
Keine Konsolenfehler.

**⚠️ Falle beim Prüfen im Vorschau-Browser:** `requestAnimationFrame` wird dort gedrosselt und
`innerWidth` meldet zeitweise `0` (dann liefert `getBoundingClientRect()` unbrauchbare Werte und
Prozentrechnungen ergeben `NaN`). Der Zeitbalken wuchs dadurch scheinbar viel zu langsam — das ist
KEIN Fehler der App. Verlässlich: gegen `document.documentElement.clientWidth` messen statt gegen
`innerWidth`, und Zeitverhalten über die Formel prüfen statt über die Uhr.
