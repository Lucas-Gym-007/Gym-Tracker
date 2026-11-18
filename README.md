# 🏋️ Gym Tracker

Deine komplette Fitness-Journey in einer App: **Ernährung, Gewicht, Training** mit **automatischer Progression**.
Installierbar als App auf dem Handy (PWA). Sie läuft offline und braucht keinen Account. Alle Daten bleiben auf deinem Gerät.

## Features

**🍽️ Ernährung**
- Kalorien, Protein, Kohlenhydrate und Fett pro Mahlzeit loggen
- Eingebaute Lebensmittel-Datenbank mit Portionsgrößen (Haferflocken, Skyr, Hähnchen …)
- Online-Suche und Barcode-Scanner über Open Food Facts (Kamera-Scan in Chrome/Android)
- Favoriten, „Zuletzt gegessen“ zum Loggen mit einem Tipp, Vortag kopieren
- Wasser-Tracker

**⚖️ Gewicht & Körper**
- Wöchentliche Wiege-Erinnerung: Banner in der App, Benachrichtigung und **Kalender-Termin (.ics)**, der jede Woche klingelt
- Gewichtsverlauf mit Diagramm, Zielgewicht, kg/Woche-Trend und Prognose, wann du dein Ziel erreichst
- Körpermaße (Bauch, Brust, Arm …, KFA)
- **Coach**: prüft dein Tempo beim Abnehmen oder Aufbauen und sagt dir, ob du mehr oder weniger essen solltest

**💪 Training**
- Fertige Pläne (Push/Pull/Beine), eigene Pläne und Übungen anlegbar
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
