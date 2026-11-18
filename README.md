# 🏋️ Gym Tracker

Deine All-in-One-Fitness-App: **Essen, Training, Progress & PRs** in einer App, mit **automatischer Progression**.

Tabs: **Heute** · **Essen** · **Training** · **Progress** (Körper / Muskeln / Fotos / PRs) · **Mehr**
Installierbar als App auf dem Handy (PWA). Sie läuft offline und braucht keinen Account. Alle Daten bleiben auf deinem Gerät.

## Features

**🍽️ Ernährung**
- Kalorien, Protein, Kohlenhydrate und Fett pro Mahlzeit loggen
- Eingebaute Lebensmittel-Datenbank mit ~110 Lebensmitteln und Portionsgrößen (Grundnahrungsmittel, Obst, Gemüse, Fast Food, Getränke …)
- Online-Suche und Barcode-Scanner über Open Food Facts (Kamera-Scan in Chrome/Android)
- Favoriten, „Zuletzt gegessen“ zum Loggen mit einem Tipp, Vortag kopieren
- Wasser-Tracker

**📈 Progress: Körper & Fotos**
- Wöchentliche Wiege-Erinnerung: Banner in der App, Benachrichtigung und **Kalender-Termin (.ics)**, der jede Woche klingelt
- Gewichtsverlauf mit Diagramm, Zielgewicht, kg/Woche-Trend und Prognose, wann du dein Ziel erreichst
- Körpermaße (Bauch, Brust, Arm …, KFA)
- **Fortschrittsfotos** mit Vorher/Nachher-Vergleich (Abstand in Wochen und Gewichtsdifferenz). Sie werden verkleinert und nur auf dem Gerät gespeichert.
- **Coach**: prüft dein Tempo beim Abnehmen oder Aufbauen und sagt dir, ob du mehr oder weniger essen solltest

**💪 Progress: Muskeln (Wochenvolumen)**
- Harte Sätze pro Woche für 15 Muskeln (Hauptmuskel = 1 Satz, Hilfsmuskel = ½ Satz)
- **Körperkarte** vorne/hinten, eingefärbt nach Ziel (unter / im / über Ziel)
- **Zielbereich pro Muskel frei einstellbar**, **Fokus-Muskeln** (Ziel +30 %)
- **Schwachstellen-Analyse** (Ø der letzten 4 Trainingswochen) mit konkretem Vorschlag, z.B. „+6 Sätze/Woche, z.B. Seitheben“
- Mit einem Tipp mehr Volumen in den Plan aufnehmen: Übung, Tag und Sätze wählen
- Verlauf pro Muskel über 8 Wochen, dazu welche Übungen wie viel beitragen

**🏆 Progress: PRs**
- Kraft-PRs werden **automatisch** aus deinen Trainings erkannt (bester Satz und geschätztes 1RM pro Übung)
- **Eigene PRs eintragen**: Gewicht × Wdh (z.B. 1RM-Test), Wiederholungen (max. Klimmzüge), Zeit (5 km Lauf, Plank), Distanz oder freier Text (erster Muscle-Up)
- Die App erkennt, ob der Eintrag ein neuer Bestwert ist, und zeigt den Verlauf pro Rekord als Diagramm
- PR-Timeline, „PRs diesen Monat“ und der letzte PR auf der Startseite

**💪 Training**
- **Plan-Baukasten**: Trainingsplan aus Trainingstagen zusammenstellen, Sätze pro Übung festlegen, als Rotation (x× pro Woche) oder mit festen Wochentagen. Das geplante Volumen pro Muskel siehst du live beim Bauen.
- Vorlagen: Push/Pull/Beine, Oberkörper/Unterkörper, Ganzkörper A/B, Zuhause mit Kurzhanteln
- Ein aktiver Plan: Die App schlägt automatisch den nächsten Tag vor, bei festen Wochentagen den heutigen
- Eigene Übungen mit Haupt- und Hilfsmuskeln
- Sätze mit Gewicht und Wiederholungen loggen, die Werte vom letzten Mal stehen daneben
- **Automatische Progression (Double Progression):**
  - Jede Übung hat einen Wdh-Bereich (z.B. 6–10) und eine Steigerung (z.B. +2,5 kg)
  - Schaffst du in *allen* Sätzen das obere Ende → **automatisch hochgestuft** aufs nächste Gewicht
  - Sonst: Gewicht halten, pro Satz +1 Wdh anpeilen (mit Fortschrittsanzeige bis zum Level-up)
  - 2× in Folge unter dem unteren Ende → Deload −10 %
- Pausentimer mit Ton und Vibration, Scheibenrechner für die Langhantel
- Bestleistungen (PRs), geschätztes 1RM pro Übung mit Diagramm, Wochen-Streak

**🧮 Ziele berechnen:** Kalorien und Makros automatisch aus Profil, Gewicht, Aktivität und Ziel (Mifflin-St Jeor).

**💾 Backup:** Export/Import als JSON-Datei unter *Mehr*.

## Auf dem Handy nutzen

Die App ist eine statische Webseite und braucht keinen Build-Schritt. Am einfachsten über **GitHub Pages**:

1. Im Repo auf GitHub: **Settings → Pages**
2. *Source*: „Deploy from a branch“, Branch auswählen (z.B. `main`), Ordner `/ (root)`, speichern
3. Nach ca. 1 Minute läuft sie unter `https://<dein-name>.github.io/Gym-Tracker/`
4. Auf dem Handy öffnen:
   - **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
   - **Android (Chrome):** Menü ⋮ → „App installieren“

Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | App-Gerüst und Navigation |
| `app.js` | gesamte Logik (Ernährung, Gewicht, Training, Progression) |
| `styles.css` | Design (Dark Mode) |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `manifest.webmanifest`, `icons/` | App-Installation und Icons |
