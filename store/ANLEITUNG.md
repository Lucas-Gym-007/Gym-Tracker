# Duty First in den Google Play Store bringen

**Kosten:** Domain ca. 5–15 € pro Jahr · Google Play einmalig 25 $ · Netlify-Hosting 0 €
**Dauer:** ca. 1–2 Tage Arbeit, dann 14 Tage Pflicht-Test, dann Prüfung durch Google (meist wenige Tage)

Abhaken: `[ ]` → `[x]`. Was mit **(ich)** markiert ist, übernimmt Claude, sobald du Bescheid gibst.

---

## Phase 1: Vorbereitung (du, am besten heute starten)

### 1. Google Play Console Konto anlegen (dauert ein paar Tage, darum zuerst)
- [ ] https://play.google.com/console/signup öffnen und mit deinem Google-Konto anmelden
- [ ] **„Für mich selbst“** wählen (privates Konto, keine Organisation)
- [ ] Einmalig **25 $** bezahlen
- [ ] **Identität bestätigen** (Ausweis) und Telefonnummer bestätigen
- [ ] ⚠️ Google verlangt bei neuen Konten den Nachweis, dass du Zugriff auf ein **echtes Android-Gerät** hast (über die App „Google Play Console“). Du hast ein iPhone → leih dir dafür kurz ein Android-Handy (Familie, Freunde).
- [ ] Bei **„Händlerstatus“** (EU-Gesetz DSA): **„Ich bin kein Händler“**, solange die App kostenlos ist, keine Werbung und keine In-App-Käufe hat. Dann wird deine Adresse im Store nicht angezeigt.

### 2. Domain kaufen
- [ ] Bei einem Anbieter deiner Wahl (z. B. INWX, IONOS, Strato) prüfen, ob **dutyfirst.de** frei ist, und kaufen. Alternative: dutyfirst.app oder duty-first.de.
- [ ] Nur die Domain kaufen, **kein Webspace, kein E-Mail-Paket** (das Hosting macht Netlify kostenlos).
- [ ] Claude Bescheid sagen, welche Domain es geworden ist.

### 3. Netlify einrichten (Hosting)
- [ ] https://app.netlify.com/signup → **„Sign up with GitHub“**
- [ ] **Add new site → Import an existing project → GitHub** → Repository **Gym-Tracker** auswählen (Netlify fragt nach Zugriff, das Repo bleibt privat)
- [ ] Branch: **claude/fitness-tracking-app-dmu5gz** · Build command: *leer lassen* · Publish directory: **.** (Punkt) → **Deploy**
  (Die Einstellungen stehen schon in `netlify.toml`, Netlify übernimmt sie automatisch.)
- [ ] **Domain management → Add a domain** → deine Domain eintragen → den DNS-Anweisungen folgen (entweder die Netlify-Nameserver beim Domain-Anbieter eintragen oder die angezeigten DNS-Einträge setzen)
- [ ] Warten, bis **HTTPS** aktiv ist (Let's Encrypt, automatisch, kann bis zu ein paar Stunden dauern)
- [ ] Test: `https://DEINE-DOMAIN` auf dem iPhone öffnen → Duty First muss laden
- [ ] Netlify-**Auftragsverarbeitungsvertrag (DPA)** unter netlify.com/legal ansehen bzw. akzeptieren und für deine Unterlagen speichern (wird in der Datenschutzerklärung erwähnt)

### 4. Rechtstexte vervollständigen
- [ ] Platzhalter in `impressum.html` und `datenschutz.html` füllen: Name, ladungsfähige Anschrift (kein Postfach; alternativ c/o-Adresse eines Impressum-Service), E-Mail, Telefon, zuständige Datenschutzbehörde deines Bundeslandes
  → einfach Claude die Daten schicken, dann trägt er sie ein **(ich)**
- [ ] Empfohlen: Texte einmal gegenprüfen lassen (z. B. Datenschutz-Generator von Dr. Schwenke, für Privatpersonen kostenlos, oder ein Anwalt für IT-Recht)

---

## Phase 2: Android-App bauen (ich)

### 5. App-Paket (AAB) erstellen **(ich)**
Sobald die Domain mit HTTPS läuft:
- [ ] Claude baut die Android-App als „Trusted Web Activity“: eine echte Play-Store-App, die Duty First im Vollbild öffnet. **Updates kommen weiter automatisch über die Webseite**, ohne neuen Upload.
- [ ] Paket-ID: **de.dutyfirst.app**. Sie ist nach dem ersten Upload **für immer fest**. Bis dahin kann sie noch geändert werden.
- [ ] Dabei entsteht ein **Upload-Schlüssel** (Datei + Passwort). → **Sicher aufbewahren** (Passwort-Manager und Kopie z. B. auf USB-Stick). Geht er verloren, kann man ihn über den Google-Support zurücksetzen lassen, das kostet aber Zeit.
- Hinweis: Claude braucht dafür einmalig eine Freigabe, um die Android-Bauwerkzeuge von Google herunterzuladen (du bekommst eine Bestätigungsanfrage).

---

## Phase 3: In der Play Console

### 6. App anlegen
- [ ] **Alle Apps → App erstellen**
  - App-Name: **Duty First: Gym & Ernährung** · Standardsprache: **Deutsch – de-DE** · **App** · **Kostenlos**
  - Erklärungen (Richtlinien, US-Exportgesetze) bestätigen

### 7. App-Inhalte (Menü „Richtlinien → App-Inhalte“), so beantworten:
| Formular | Antwort |
|---|---|
| Datenschutzerklärung | `https://DEINE-DOMAIN/datenschutz.html` |
| App-Zugriff | **Alle Funktionen sind ohne besonderen Zugriff verfügbar** (kein Login) |
| Anzeigen | **Nein**, die App enthält keine Werbung |
| Einstufung des Inhalts | Fragebogen ausfüllen, Kategorie „Alle anderen App-Typen“. Keine Gewalt, Sexualität oder Glücksspiel, keine Nutzerinteraktion oder Chats. Frage nach **Alkohol**: Die Lebensmittel-Datenbank enthält Bier, Wein und Cocktails als Nährwert-Einträge (ohne Verherrlichung). Ehrlich mit „Ja, Verweise“ antworten; eine etwas höhere Altersstufe ist egal, weil die Zielgruppe ohnehin 18+ ist. |
| Zielgruppe | **18 und älter** (nur diese Altersgruppe), App spricht keine Kinder an |
| Nachrichten-App | Nein |
| Gesundheits-Apps | Funktionen: **Aktivität & Fitness**, **Ernährung & Gewichtsmanagement**, **Schlaf**, **Stressbewältigung/Entspannung**. **Keine** medizinischen Funktionen (keine Diagnose, Behandlung, Medizinprodukt) |
| Datensicherheit | **Erhebt die App Nutzerdaten? → Nein.** Begründung: Alle Daten werden nur auf dem Gerät verarbeitet und nie an dich oder Dritte übertragen. Google zählt Daten, die das Gerät nicht verlassen, nicht als „erhoben“. Keine Weitergabe, keine Werbe-ID. |
| Werbe-ID | Nein, wird nicht verwendet |
| Behörden-App / Finanzfunktionen | Nein / Keine |

### 8. Store-Eintrag
- [ ] **Wachstum → Store-Präsenz → Hauptversion des Store-Eintrags**: Texte aus `store/store-eintrag.md` kopieren
- [ ] Grafiken hochladen: `store/icon-512.png`, `store/feature-graphic-1024x500.png`, `store/screenshots/*.png`
- [ ] Kategorie **Gesundheit & Fitness**, Kontakt-E-Mail, Website

### 9. Geschlossener Test (Pflicht für neue private Konten)
- [ ] **Testen → Geschlossene Tests → Track erstellen**
- [ ] **Tester**: E-Mail-Liste mit **mindestens 12 Personen mit Android-Handy** (Google-Konto-E-Mails), z. B. Leute aus dem Gym
- [ ] **Neuer Release** → AAB von Claude hochladen → **Play App Signing** aktivieren (Google verwaltet den App-Signaturschlüssel)
- [ ] Danach: **Test und Release → App-Integrität → App-Signatur** → den **SHA-256-Fingerabdruck des App-Signaturschlüssels** kopieren und Claude schicken **(ich trage ihn in `.well-known/assetlinks.json` ein)**. Ohne diesen Schritt zeigt die App oben eine Browser-Leiste.
- [ ] Release zur Prüfung senden → nach Freigabe den **Opt-in-Link** an die Tester schicken
- [ ] Tester: Link öffnen → „Tester werden“ → App aus dem Play Store installieren → **14 Tage am Stück** installiert lassen und ab und zu nutzen
- [ ] Feedback sammeln (hilft auch beim Antrag in Schritt 10)

### 10. Produktion beantragen
- [ ] Nach 14 Tagen: **Dashboard → Zugriff auf Produktion beantragen** → Fragen zum Test beantworten (wie viele Tester, welches Feedback, was verbessert wurde)
- [ ] Nach der Freigabe: **Produktion → Neuer Release** (gleiches AAB) → Länder auswählen (z. B. Deutschland, Österreich, Schweiz) → zur Prüfung senden
- [ ] 🎉 **Live!**

---

## Danach
- **Neue Funktionen** gehen automatisch an alle Nutzer, sobald sie im Repo sind (Netlify veröffentlicht sie, die App lädt sie beim nächsten Start).
- **Neues AAB** ist nur selten nötig, z. B. wenn Google ein neues Android-Zielniveau verlangt (ca. einmal im Jahr). Das macht Claude.
- **E-Mails** an die Kontaktadresse beantworten; vor jeder Funktion, die Daten nach außen schickt, die Datenschutzerklärung anpassen.
