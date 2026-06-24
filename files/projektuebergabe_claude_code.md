# NeuroAR Reha — Projektübergabe für Claude Code

## Kontext
Bachelorarbeit: prototypische AR-App zur Rehabilitation von neurologischen Einschränkungen,
insbesondere **Neglect** (einseitige Aufmerksamkeitsstörung, meist nach Schlaganfall).
Patient:innen ignorieren typischerweise eine Raumseite — die App trainiert gezielt die
Aufmerksamkeitslenkung über leichte Kopf-/Geräte-Bewegungen.

Zielplattform: webbasiert (HTML/CSS/JS), lauffähig im Browser auf Smartphone/Tablet,
kein App-Store-Deploy nötig. Aktuell gehostet über GitHub Pages (kostenlos, statisch).

## Konzept: 3 Hauptkategorien × je 3 Schwierigkeitsstufen

**1. Suchen** (Tablet/Smartphone wird aufrecht vor dem Körper gehalten, Bildschirm zum Nutzer)
- Stufe 1: Ein Objekt erscheint seitlich (meist links, Neglect-Training). Pfeil von der Bildschirmmitte
  zeigt die Richtung. Durch Drehen/Bewegen des Geräts muss das Objekt in einen Zielkreis in der
  Bildschirmmitte gebracht werden.
- Stufe 2: Wie Stufe 1, zusätzlich Audio-Feedback — ein Ton wird lauter, je näher man dem Objekt kommt.
- Stufe 3: Drei nummerierte Objekte (1, 2, 3) erscheinen verteilt. Müssen in exakter Reihenfolge
  gefunden werden; erst wenn Objekt 1 im Zielkreis war, wird Objekt 2 aktiv usw. Die anderen beiden
  sind während des Wartens visuell "gesperrt" (transparent) und reagieren nicht.

**2. Verfolgen** (gleiche Haltung wie Suchen)
- Stufe 1: Ein Objekt befindet sich in der Mitte und driftet kontinuierlich langsam weg (mit
  gelegentlichen Richtungswechseln). Durch Gegenbewegung muss es im Zielkreis gehalten werden.
  Auswertung: Prozentsatz der Zeit, die das Objekt im Ziel war, über einen Durchgang (aktuell 30s).
- Stufe 2: Wie Stufe 1, zusätzlich Audio das leiser wird, je weiter das Objekt vom Zentrum entfernt ist.
- Stufe 3: Wie Stufe 1, aber das Objekt verschwindet alle paar Sekunden für ca. 0,5s und taucht an der
  durch die Drift erwarteten Position wieder auf — Patient muss die Bewegung antizipieren.

**3. Führen** (Tablet wird flach mit Bildschirm nach oben auf einer Oberfläche bewegt — NOCH NICHT GEBAUT)
- Stufe 1: Eine Kugel/Murmel in der Mitte soll durch Neigen des Geräts (wie eine Kugel rollen) ohne
  Hindernisse zu einem Ziel (z.B. links) geführt werden.
- Stufe 2: Wie Stufe 1, aber mit einem kurvigen Weg/Pfad, durch den die Kugel geführt werden muss.
- Stufe 3: Wie Stufe 1/2, aber durch ein kleines Labyrinth mit mehreren Hindernissen.

## Aktueller technischer Stand

Zwei eigenständige HTML-Dateien (kein Build-System, reines Vanilla JS/CSS, keine Dependencies),
im Anhang verfügbar:
- `suchen_modul.html` — Kategorie "Suchen", alle 3 Stufen funktionsfähig
- `verfolgen_modul.html` — Kategorie "Verfolgen", alle 3 Stufen funktionsfähig
- "Führen" (Murmel-Labyrinth-Kategorie) ist NOCH NICHT umgesetzt für das neue 3×3-Konzept.
  (Hinweis: es gab einen frühen Einzel-Prototyp mit Canvas-Physik-Murmellabyrinth in einer früheren
  Konzeptversion — siehe ggf. Konversationsverlauf — der als Ausgangspunkt dienen könnte, aber an
  das neue Stufen-Konzept (gerade Bahn / kurvig / Labyrinth) angepasst werden müsste.)

Beide Dateien sind nach demselben Muster aufgebaut: ein Home-Screen mit 3 Karten (Stufenauswahl),
ein Level-Screen mit Zielkreis in der Mitte, Touch/Pointer-Events für die Steuerung, Web Audio API
für die Audio-Feedback-Stufen.

## UNGELÖSTES Hauptproblem: Bewegungssensor-Steuerung

**Ursprünglicher Wunsch:** Steuerung durch tatsächliche Bewegung/Drehung des Smartphones/Tablets
(wie bei echtem AR), nicht durch Wischen mit dem Finger.

**Was versucht wurde (alles in `suchen_modul.html`, dort aktuell wieder DEAKTIVIERT):**
1. `DeviceOrientationEvent` (alpha/beta/gamma) mit festem Kalibrierungs-Offset bei Levelstart
   → Problem: Sprünge der Objektposition, vor allem bei Auf/Ab-Neigung.
2. Vorzeichen-Korrekturen der Achsen (Nutzer berichtete erst falsche Bewegungsrichtung,
   dann fehlende sichtbare Bewegung trotz korrekter Logik-Richtung).
3. Smoothing/Max-Step-Begrenzung pro Frame für `beta` → reduzierte das Problem nicht ausreichend.
4. Umstieg von absoluten Orientierungswerten auf `DeviceMotionEvent.rotationRate` (Gyroskop-
   Integration: kontinuierliches Aufaddieren der Drehrate statt absoluter Winkel) → sollte das
   Gimbal-Lock-Problem bei senkrechter Haltung (Bildschirm zum Nutzer, beta ≈ 90°) vermeiden.
   Wurde nicht mehr ausreichend getestet, da die Sensorwerte beim letzten Test laut Nutzer
   komplett ausfielen ("egal wie sehr ich mein Handy bewege, passiert nichts").

**Vermutete Ursachen / zu prüfen:**
- iOS Safari verlangt `DeviceOrientationEvent.requestPermission()` UND ggf. separat
  `DeviceMotionEvent.requestPermission()` (beide als User-Gesture-getriggerter Button-Click,
  nicht automatisch). Die letzte Version fragte beide an, aber es ist nicht verifiziert, ob auf
  dem Test-iPhone tatsächlich beide Permissions granted wurden bzw. ob `devicemotion`-Events
  überhaupt ankamen.
- Getestet wurde u.a. in Chrome auf iOS (das technisch auf WebKit/Safari aufsetzt, aber abweichendes
  Berechtigungsverhalten haben kann) und in Safari direkt. Ergebnis war in beiden Fällen verbuggt
  bzw. zuletzt komplett ohne Reaktion.
- Es wurde nie zweifelsfrei isoliert, ob a) die Rohdaten vom Sensor selbst sprunghaft/instabil
  waren, oder b) die Transformation der Sensordaten in Bildschirmkoordinaten den Fehler verursacht
  hat. Ein Debug-Overlay mit Live-Anzeige von alpha/beta wurde zwischenzeitlich eingebaut und
  später wieder entfernt.
- Getestet wird über GitHub Pages (https), Permission-Dialog erscheint also grundsätzlich
  (Secure-Context ist gegeben).

**Empfehlung für Claude Code:** Bei Wiederaufnahme der Sensor-Steuerung am besten komplett neu
und isoliert aufsetzen: zunächst eine minimale Test-Seite NUR mit Live-Anzeige der Rohwerte von
`deviceorientation` UND `devicemotion` (beide gleichzeitig, ungefiltert, ungekalibriert) bauen
und auf dem Zielgerät verifizieren, welche Events überhaupt zuverlässig und mit welchen Werten
ankommen, bevor die Spiellogik wieder angeschlossen wird.

## Aktuelle Steuerung (Übergangslösung)
Touch/Pointer-Events (`pointerdown`/`pointermove`/`pointerup`): Finger-Ziehen auf dem Bildschirm
simuliert die Geräte-Bewegung. Funktioniert zuverlässig auf allen getesteten Geräten/Browsern.
Dies ist die aktuelle Basis, auf der weitergebaut wird; Sensor-Steuerung ist ein Punkt, der laut
Absprache mit dem Nutzer SPÄTER (nach Fertigstellung aller Spiel-Inhalte) erneut angegangen wird.

## Offene nächste Schritte
1. Kategorie "Führen" (Murmel-Labyrinth, 3 Stufen: gerade Bahn / kurvig / Labyrinth) bauen,
   gleiches Touch-Steuerungsprinzip (Pointer-Drag simuliert Neigen) oder ggf. via Touch-Tilt-Idee
   neu überlegen, da "Führen" konzeptionell mit flacher Geräte-Haltung gedacht ist.
2. Eigenes visuelles Design (Nutzer möchte später eigene Grafiken/Icons statt Emoji-Platzhalter
   einbinden).
3. Persistenter Fortschritt/Score über Sitzungen hinweg (bisher nicht implementiert, jede Stufe
   startet bei 0).
4. Eventuell ein gemeinsames Hauptmenü, das alle 3 Kategorien (Suchen/Verfolgen/Führen) bündelt
   (aktuell zwei komplett getrennte HTML-Dateien ohne gemeinsame Navigation).
5. Sensor-/Bewegungssteuerung erneut versuchen (siehe oben), sobald Spielinhalte vollständig sind.

## Hosting
Deployed über GitHub Pages (Nutzer hat bereits ein Repository eingerichtet und Erfahrung mit
Upload/Commit über die GitHub-Weboberfläche). Kein lokales Node/Build-Tooling im Einsatz.
