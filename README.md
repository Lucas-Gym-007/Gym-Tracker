# Duty First

Deine All-in-One-Fitness-App: **Essen, Training, Progress & PRs** in einer App, mit **automatischer Progression**.

Design: tiefschwarz und clean, die Akzentfarbe ist wählbar (Gold, Platin, Roségold, Smaragd, Saphir, Amethyst, Onyx). **Heute** zeigt die Gesamtübersicht: Kalorien- und Makro-Ring, Schnellaktionen, Wochenleiste, Training, Gewicht, Wasser, Muskeln, Rekorde, Fotos, Maße, Streak und Coach.

Tabs: **Heute** · **Essen** · **Training** · **Progress** (Körper / Muskeln / Fotos / PRs) · **Mehr**
Installierbar als App auf dem Handy (PWA). Sie läuft offline und braucht keinen Account. Alle Daten bleiben auf deinem Gerät.

## Features

**🍽️ Ernährung**
- Kalorien, Protein, Kohlenhydrate und Fett pro Mahlzeit loggen. Ganz oben gibt es „+ Essen eintragen“, beim Scrollen einen schwebenden Plus-Knopf. Die Mahlzeit wählst du direkt im Dialog, vorausgewählt passend zur Uhrzeit.
- **Ernährungs-Verlauf** im Essen-Tab: Kalorien, Protein, Kohlenhydrate, Fett oder Wasser pro Tag. Für 7 Tage als Balken, für 4 Wochen oder 3 Monate als Kurve mit 7-Tage-Durchschnitt, jeweils mit Ziellinie. Dazu Ø pro Tag, Tage im Ziel und der Trend der letzten 7 Tage.
- **Regelmäßige Mahlzeiten nach Wochentagen:** z. B. jeden Morgen Kaffee oder mittwochs mittags Döner. Anlegen geht beim Hinzufügen („Regelmäßig einplanen“, Wochentage antippen oder Täglich / Mo–Fr / Wochenende), durch Antippen eines Eintrags oder unter „Planen & Ideen → Regelmäßige Mahlzeiten“. An den passenden Tagen erscheinen sie automatisch, wahlweise als geplant zum Abhaken oder direkt als gegessen. Pausieren, ändern und löschen ist jederzeit möglich. Ein gelöschter Eintrag kommt an dem Tag nicht wieder, und rückwirkend wird nichts eingetragen.
- Einträge antippen, um sie in eine andere Mahlzeit zu verschieben oder regelmäßig einzuplanen.
- **Vorplanen & abhaken:** Mit „Morgen planen“ legst du fest, was du an den nächsten Tagen isst (bis 7 Tage voraus). Geplantes zählt erst, wenn du es abhakst: einzeln, pro Mahlzeit oder alles auf einmal, auch direkt auf der Startseite. Auch heute kannst du Einträge erst „nur planen“. Die Vorschläge unter „Was passt noch?“ rechnen den Plan schon mit ein.
- **Mahlzeiten frei einteilen:** Vorlagen für 3–6 Mahlzeiten, dazu umbenennen, hinzufügen, löschen und umsortieren (bis 8 pro Tag)
- Eingebaute Lebensmittel-Datenbank mit 895 Lebensmitteln, Gerichten und Getränken in 18 Kategorien, mit Portionsgrößen. Sie läuft komplett offline und ohne externe Quellen; die App baut keinerlei Verbindungen nach außen auf. Kategorien kannst du durchstöbern. Die Suche ist tolerant: Umlaute sind egal, „chicken“ findet Hähnchen, „pasta“ findet Nudeln.
- **Nährwerttabelle scannen** (Tab „Etikett“ im Essen-Dialog oder bei „Eigenes Lebensmittel“): Foto vom Etikett machen, die App liest Kalorien, Fett, Kohlenhydrate, Eiweiß und die Portionsgröße automatisch aus. Die Texterkennung (tesseract.js, Apache 2.0, in `vendor/ocr`) läuft komplett auf dem Handy, es wird nichts hochgeladen; nach dem ersten Scan funktioniert sie auch offline. Eine Plausibilitätsprüfung (kcal ≈ 4·KH + 4·Eiweiß + 9·Fett) korrigiert typische Lesefehler, etwa „g“ als „9“ gelesen. Alternativ lässt sich der Text einfügen (am iPhone z. B. per Live Text).
- Favoriten, „Zuletzt gegessen“ zum Loggen mit einem Tipp, Vortag kopieren
- Wasser-Tracker

**📈 Progress: Körper & Fotos**
- Wöchentliche Wiege-Erinnerung: Banner in der App, Benachrichtigung und **Kalender-Termin (.ics)**, der jede Woche klingelt
- Gewichtsverlauf mit Diagramm, Zielgewicht, kg/Woche-Trend und Prognose, wann du dein Ziel erreichst
- Körpermaße (Bauch, Brust, Arm …, KFA)
- **Fortschrittsfotos** mit Vorher/Nachher-Vergleich (Abstand in Wochen und Gewichtsdifferenz). Sie werden verkleinert und nur auf dem Gerät gespeichert.
- **Fotos löschen:** einzeln in der Foto-Ansicht oder mehrere auf einmal über „Auswählen“ in der Galerie (inkl. „Alle auswählen“). Gelöschte Fotos werden sofort vom Gerät entfernt.
- **Coach**: prüft dein Tempo beim Abnehmen oder Aufbauen und sagt dir, ob du mehr oder weniger essen solltest

**💪 Progress: Muskeln (Wochenvolumen)**
- Harte Sätze pro Woche für 15 Muskeln (Hauptmuskel = 1 Satz, Hilfsmuskel = ½ Satz)
- **Anatomische Körperkarte** vorne/hinten, eingefärbt nach Ziel (unter / im / über Ziel)
- **Die Figur passt sich deinem Körper an**: automatisch aus Größe, Gewicht, Geschlecht und Körpermaßen (fehlende Maße werden geschätzt), oder per Körpertyp (Schlank / Athletisch / Muskulös / Kräftig), plus Regler für Schultern, Brust, Taille, Hüfte, Arme, Beine, Waden und Definition
- **Körperform-Entwicklung**: Start ↔ Jetzt als Figuren nebeneinander
- **Zielbereich pro Muskel frei einstellbar**, **Fokus-Muskeln** (Ziel +30 %)
- **Schwachstellen-Analyse** (Ø der letzten 4 Trainingswochen) mit konkretem Vorschlag, z.B. „+6 Sätze/Woche, z.B. Seitheben“
- Mit einem Tipp mehr Volumen in den Plan aufnehmen: Übung, Tag und Sätze wählen
- Verlauf pro Muskel über 8 Wochen, dazu welche Übungen wie viel beitragen

**🏆 Progress: PRs**
- Kraft-PRs werden **automatisch** aus deinen Trainings erkannt (bester Satz und geschätztes 1RM pro Übung)
- **Eigene PRs eintragen**: Gewicht × Wdh (z.B. 1RM-Test), Wiederholungen (max. Klimmzüge), Zeit (5 km Lauf, Plank), Distanz oder freier Text (erster Muscle-Up)
- Die App erkennt, ob der Eintrag ein neuer Bestwert ist, und zeigt den Verlauf pro Rekord als Diagramm
- PR-Timeline, „PRs diesen Monat“ und der letzte PR auf der Startseite

**🆕 Weitere Funktionen**
- **Cardio-Log:** Laufen, Rad, Rudern, Schwimmen … mit Dauer, Distanz, Pace, Puls und kcal-Schätzung (MET). Cardio-Tage sind in der Wochenleiste markiert.
- **Mini-Notizen** pro Übung direkt im Workout, z.B. „Sitz Stufe 4“
- **Mahlzeit-Vorlagen:** eine Mahlzeit speichern und mit einem Tipp erneut eintragen
- **Eigene Rezepte:** Zutaten mit Grammzahl, Nährwerte pro Portion werden berechnet
- **Rückblick** für Woche, Monat und Jahr: Highlight, Training, Cardio, Ernährung, Körper, Muskeln, Rekorde, neue Abzeichen
- **Kraft-Standards:** Level von Anfänger bis Elite für Bankdrücken, Kniebeugen, Kreuzheben, Schulterdrücken und Rudern, relativ zum Körpergewicht
- **Abzeichen:** 30 Erfolge für Training, Streaks, Rekorde, Volumen, 100/140/180-kg-Club, Ernährung, Cardio und Fotos
- **PR-Ziele mit Deadline:** Fortschrittsbalken, Restzeit und Prognose, ob du es rechtzeitig schaffst
- **Foto mit Overlay:** Die Kamera blendet das letzte Foto halbtransparent ein, für exakt gleiche Posen, inklusive Selbstauslöser (3 s / 10 s)
- **Live-Vergleich im Workout:** pro Satz ▲/▼ gegenüber dem letzten Mal, dazu das Übungsvolumen heute im Vergleich
- **Supplements & Gewohnheiten:** tägliche Häkchen mit Streaks auf Home, z.B. Kreatin, Vitamin D, Schritte, Schlaf
- **Meal-Prep:** Rezepte für die Woche einplanen, als gekocht markieren, dann aus dem Vorrat portionsweise essen und eintragen
- **Einkaufsliste:** Zutaten aus Meal-Prep und Rezepten zusammengerechnet, abhaken, teilen
- **Wöchentlicher Check-in:** Gewicht, Energie, Schlaf, Hunger, Stress, Training und Plantreue, mit Coach-Auswertung und Verlauf
- **Teilbare Karten:** Workout, Rückblick und Vorher/Nachher als edles Bild (1080 × 1350) zum Teilen oder Speichern
- **Tipp des Tages** auf Home: über 30 Tipps zu Training, Ernährung, Regeneration und Fortschritt

- **Übungsbibliothek mit 100 Übungen**, nach Muskeln gruppiert, mit Filtern nach Körperregion, Muskel und Gerät sowie einer Suche. Dieselbe Bibliothek gilt im Workout, im Plan-Editor und in der Verwaltung.
- **Gym-Modus:** Vollbild-Fokus auf einen Satz mit großen ± für Gewicht und Wiederholungen, Live-Vergleich, riesigem Pausen-Countdown und Vorschau auf den nächsten Satz. Dazu Sprachansagen auf Deutsch, und der Bildschirm bleibt an.
- **Adaptiver Kalorienbedarf:** echter Verbrauch aus Ø Kalorien und Gewichtstrend der letzten 28 Tage (1 kg ≈ 7.700 kcal), mit wählbarem Tempo, empfohlenem Ziel, Verlauf und optionaler automatischer Anpassung jeden Montag

- **Eigene Lebensmittel anlegen:** Nährwerte pro 100 g oder pro Portion (wird umgerechnet), mit Kategorie und Portionsgröße. Findet die Suche nichts, kannst du den Suchbegriff direkt als neues Lebensmittel anlegen.
- **Rezeptideen:** 24 eiweißreiche Rezepte für Cut, Maintain und Bulk (Frühstück, Hauptgerichte, Snacks), mit Zutaten, Zubereitung und Nährwerten pro Portion, die aus der Datenbank berechnet werden. Eintragen, in „Meine Rezepte“ übernehmen oder auf die Einkaufsliste setzen.
- **Fertige Tagespläne:** je zwei Varianten pro Ziel. Sie werden automatisch auf 1.600–3.500 kcal oder dein eigenes Ziel skaliert (ca. ±50 kcal). Mit einem Tipp heute eintragen oder die Zutaten für 1–7 Tage auf die Einkaufsliste setzen.

- **„Was passt noch?“:** zeigt, was heute an Kalorien und Makros offen ist, und schlägt passende Rezeptideen (in der richtigen Portionsgröße) und eiweißreiche Lebensmittel vor, abhängig von der Tageszeit. Ein Tipp trägt den Vorschlag ein.
- **Wochen-Mealplan:** 7 abwechslungsreiche Tage aus den Rezeptideen, passend zu Ziel und Kalorien. Meal-Prep-Gerichte laufen zwei Tage am Stück. Mahlzeiten lassen sich tauschen, dazu gibt es eine Wocheneinkaufsliste, „In Meal-Prep übernehmen“ und „Heute laut Plan“ auf Home.
- **Satz-Typen:** Arbeitssatz, **W** Aufwärmen, **D** Drop-Satz, **F** bis Versagen. Aufwärmsätze zählen nicht für Volumen, Rekorde und Progression. Die Aufwärm-Rampe wird automatisch berechnet und kann pro Übung im Trainingstag fest eingeplant werden.

**💪 Training**
- **Plan-Baukasten**: beliebig viele Trainingspläne speichern und mit einem Tipp wechseln. Zwei Arten:
  - **Nach Wochentagen:** Mo–So bekommt je einen Trainingstag oder ist Ruhetag.
  - **Als Reihenfolge (Zyklus):** Tag 1, Tag 2, … mit optionalen Ruhetagen, unabhängig vom Wochentag, z. B. Push → Pull → Ruhe → Beine → Ruhe. Die App merkt sich, wo du im Zyklus stehst, und zeigt, wann der nächste Tag fällig ist („Heute“, „Morgen“, „in 2 Tagen“).
  - Tage und Übungen lassen sich **per Ziehen am Griff ⠿** oder mit ▲▼ verschieben, auch im laufenden Training mit ↑↓.
  - **Duplizieren** legt eine unabhängige Kopie samt Trainingstagen an, gut für Plan-Varianten.
  - Sätze pro Übung festlegen; das geplante Volumen pro Muskel siehst du live beim Bauen.
- Vorlagen: Push/Pull/Beine, Oberkörper/Unterkörper, Ganzkörper A/B, Zuhause mit Kurzhanteln
- Ein aktiver Plan: Die App schlägt automatisch den nächsten Tag vor, bei festen Wochentagen den heutigen
- Eigene Übungen mit Haupt- und Hilfsmuskeln
- Sätze mit Gewicht und Wiederholungen loggen, die Werte vom letzten Mal stehen daneben
- **Progressions-Diagramme:**
  - In den Übungsdetails: wählbare Kennzahl (geschätztes 1RM, Top-Gewicht, Volumen, Wiederholungen) und Zeitraum (4 Wochen, 3 Monate, 6 Monate, alles). Neue Rekorde sind markiert, dazu Start, letzter Wert und Veränderung in kg und %.
  - Im Training-Tab unter „Fortschritt“: Kraft-Index des aktiven Plans (Ø Veränderung des 1RM aller Plan-Übungen), Volumen pro Woche mit Trend und jede Plan-Übung mit Mini-Kurve und Veränderung in %.
- **Automatische Progression, es geht immer vorwärts (kein Deload):**
  - In den Einstellungen (Mehr → Progression) legst du den Wdh-Bereich fest (z.B. 8–12) und ab wie vielen Wdh. das Gewicht steigt (z.B. 12). Einzelne Übungen können optional einen eigenen Bereich haben.
  - **Satzpause** in den Einstellungen (Mehr → Satzpause): Standard 2:30, Schnellwahl 1:00–4:00 oder eigene Zeit („2:30“, „2,5“ oder Sekunden). Gilt für alle Übungen, optional eigene Pause pro Übung. Aufwärmsätze haben 45 s.
  - Schaffst du in *allen* Sätzen die Steiger-Wdh. → nächstes Mal **+Steigerung** (z.B. +2,5 kg), Wdh. wieder ab dem Bereichsanfang
  - Sonst: gleiches Gewicht, **+1 Wdh. pro Satz**
  - Bei jeder Übung steht **„Letztes Mal → Heute“** mit der Vorgabe, z.B. `60 kg · 3×12 → 62,5 kg · 3×8`. Die Vorgabe steht auch im Gym-Modus und nach dem Training unter „Nächstes Mal“.
- Pausentimer mit Ton und Vibration, Scheibenrechner für die Langhantel
- Bestleistungen (PRs), geschätztes 1RM pro Übung mit Diagramm, Wochen-Streak

**🧮 Ziele berechnen:** Kalorien und Makros automatisch aus Profil, Gewicht, Aktivität und Ziel (Mifflin-St Jeor).

**💾 Backup:** Export/Import als JSON-Datei unter *Mehr*.

### Health (eigener Tab)
- **Recovery:** Score von 0 bis 100 aus Schlaf (Dauer und Qualität), Trainingsbelastung der letzten 48 h und einem 10-Sekunden-**Tages-Check** (Energie, Muskelkater, Stress). Dazu gibt es Vorschläge: kurze Nacht, Muskeln noch in Erholung (mit Warnung, wenn das heutige Training sie trifft), Muskelkater, Stress, zu wenig Protein, Kalorien oder Wasser am Vortag, plus eine passende Mobility-Routine.
- **Muskel-Erholung:** Das Körpermodell färbt jeden Muskel nach Erholung (erholt sich, fast erholt, erholt). Je nach Satzzahl braucht ein Muskel 24–72 h, die App zeigt die verbleibenden Stunden.
- **Ernährungs-Bewertung pro Tag:** Note A–E (0–100 Punkte) aus Kalorien, Protein, Obst & Gemüse (Ziel 400 g, auch aus Rezepten über deren Zutaten berechnet), Anteil Süßes & Alkohol und Wasser. Dazu konkrete Tipps, Kalorien nach Kategorie, Top-Kalorien- und Top-Proteinquellen und eine Wochenleiste mit den Noten.
- **Schlaf:** Einschlaf- und Aufwachzeit sowie Qualität eintragen. Die App zeigt Ø 7 Nächte, Schlafdefizit, Regelmäßigkeit der Einschlafzeit, ein 14-Nächte-Diagramm und Tipps. Das Schlafziel ist einstellbar. Morgens erinnert die Startseite ans Eintragen.
- **Mobility (Dehnen & Physio):** 37 Übungen mit Anleitung (Nacken, Schultern, Rücken, Hüfte, Beine, Knie, Atmung) und 9 Routinen, z. B. Morgen-Mobility, Büro-Reset, Hüfte öffnen, Schulter-Gesundheit, Unterer Rücken, Knie-Stabilität, Cool-downs und Abend-Entspannung. Ein geführter Timer mit Seitenwechsel, Pause und Vibration läuft durch die Routine, der Bildschirm bleibt dabei an. Erledigte Einheiten werden gezählt.
- Alle Hinweise sind allgemein und keine medizinische Beratung.

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
| `impressum.html`, `datenschutz.html`, `hinweise.html`, `lizenzen.html` | Rechtstexte (auch in der App unter Mehr → Rechtliches); Platzhalter in [eckigen Klammern] vor der Veröffentlichung füllen |
| `netlify.toml`, `.well-known/assetlinks.json` | Hosting-Einstellungen (Sicherheits-Header) und die Verknüpfung von App und Webseite für Google Play |
| `store/` | Play-Store-Eintrag: Texte, Icon, Titelgrafik, Screenshots und die Schritt-für-Schritt-Anleitung `store/ANLEITUNG.md` |
| `health.js` | Health-Tab: Recovery, Ernährungs-Bewertung, Schlaf, Mobility |
| `foods.js` | Lebensmittel-Datenbank (offline) |
| `vendor/ocr/` | Texterkennung für Nährwerttabellen (offline) |
| `styles.css` | Design (Dark Mode) |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `manifest.webmanifest`, `icons/` | App-Installation und Icons |

## Datenschutz: alles lokal

- Alle Daten (Essen, Gewicht, Maße, Fotos, Trainings) liegen nur auf dem Gerät: im Browser-Speicher (localStorage, IndexedDB). Es gibt keinen Server, kein Konto, kein Tracking und keine Werbung.
- Die App ruft keine externen Dienste auf. Lebensmittel-Datenbank, Texterkennung und Schriften sind in der App enthalten. Geladen wird nur die App selbst, von ihrer eigenen Adresse.
- Die Sprachansage im Gym-Modus nutzt nur Stimmen, die auf dem Gerät laufen. Gibt es keine deutsche Offline-Stimme, bleibt die Ansage stumm.
- Erinnerungen sind lokale Benachrichtigungen, ohne Push-Server.
- Daten verlassen das Gerät nur, wenn du es selbst auslöst: Backup exportieren, Karte oder Einkaufsliste teilen.
