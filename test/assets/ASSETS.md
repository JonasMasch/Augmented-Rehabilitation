# Asset-Liste für NeuroAR Reha

Exportiere die Design-Dateien mit **genau diesen Namen** in den `assets/`-Ordner.
- Format **SVG**, wo möglich (transparent, Artboard quadratisch).
- Bei sehr komplexen Illustrationen alternativ **PNG @3x, transparent** (gleicher Name, `.png`).
- Dunkler App-Hintergrund: `#1a1a2e` → Motive müssen darauf lesbar sein.

---

## 1. Spielobjekte — EINFARBIG (werden im Code umgefärbt/geglowt)
Eine flache Farbe (z. B. Weiß), **keine** eingebauten Verläufe. Ich ersetze die Füllung
beim Einbauen durch `currentColor`, damit CSS Farbe/Glow steuern kann.
Artboard: **64×64 px**

| Datei | bisheriges Platzhalter-Emoji | Verwendung |
|-------|------------------------------|------------|
| `obj-stern.svg`   | 🌟 | Suchen – Stufe 1 |
| `obj-glocke.svg`  | 🔔 | Suchen – Stufe 2 |
| `obj-diamant.svg` | 💎 | Verfolgen (alle Stufen) |
| `obj-kugel.svg`   | (CSS-Kugel) | Führen – die rollende Kugel (optional) |

> Suchen Stufe 3 nutzt die Ziffern 1/2/3 – bleiben vorerst als Text, kein Icon nötig
> (außer du möchtest gestaltete Ziffern liefern).

## 2. Kategorie-Icons — VOLLFARBIG erlaubt
Artboard: **96×96 px**

| Datei | Emoji | Verwendung |
|-------|-------|------------|
| `icon-suchen.svg`    | 🔍 | Startseite + Suchen-Home |
| `icon-verfolgen.svg` | 🎯 | Startseite + Verfolgen-Home |
| `icon-fuehren.svg`   | 🧭 | Startseite + Führen-Home |

## 3. Erika (Assistenzfigur) — VOLLFARBIG
Artboard: **240×240 px** (wird groß ~105 px und klein ~50 px angezeigt → ein File reicht).

| Datei | Verwendung |
|-------|------------|
| `erika.svg` (oder `erika.png`) | Figur unten rechts + kleines Icon in der Übung |

## 4. Medaillen — VOLLFARBIG
Artboard: **96×96 px**. Tipp: einheitlicher Look (z. B. runde Plakette + Motiv).

| Datei | Emoji | Medaille |
|-------|-------|----------|
| `medal-erster-ausflug.svg`      | 🐾 | Erster Ausflug |
| `medal-tagesziel.svg`           | 🎯 | Tagesziel erreicht |
| `medal-marienkaefer.svg`        | 🐞 | Marienkäfer |
| `medal-schmetterling.svg`       | 🦋 | Schmetterling |
| `medal-schnecke.svg`            | 🐌 | Schnecke |
| `medal-natur.svg`               | 🌳 | Natur |
| `medal-drei-tage.svg`           | 📅 | Drei Tage |
| `medal-eine-woche.svg`          | 🗓️ | Eine Woche |
| `medal-ausdauer.svg`            | 💪 | Ausdauer |
| `medal-zehn-einheiten.svg`      | 🔟 | Zehn Einheiten |
| `medal-fuenfzehn-einheiten.svg` | 🏅 | Fünfzehn Einheiten |
| `medal-goldene-woche.svg`       | 🥇 | Goldene Woche |

## 5. Optional
| Datei | Verwendung |
|-------|------------|
| `logo.svg`     | Logo/Symbol auf der Startseite (Platzhalter 🧠) |
| `icon-profil.svg` | Profil-Symbol (Platzhalter 👤) |
| `bg.png`       | Eigener Hintergrund statt Farbverlauf (PNG, bildschirmfüllend) |

---

### Illustrator-Exporteinstellungen (Kurzfassung)
Datei → **Exportieren für Bildschirme** (mehrere Artboards auf einmal):
- SVG · Styling: **Presentation Attributes** · Schrift: **in Pfade** · Minimieren: **an** · Responsive: **aus**
- transparenter Hintergrund · Artboard-Name = Dateiname
