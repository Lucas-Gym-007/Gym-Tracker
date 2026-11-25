# Duty First veröffentlichen: Google Play & Apple App Store

Komplette Schritt-für-Schritt-Anleitung, inklusive Rechtlichem. Stand: November 2026.
Abhaken: `[ ]` → `[x]`. **(Claude)** = übernimmt Claude, sobald du Bescheid gibst.

> Kein Rechtsrat: Diese Anleitung ist eine sorgfältige Checkliste. Für die Rechtstexte empfehle ich eine kurze Prüfung (Schritt R7).

---

## 0. Überblick

### Zwei Wege, ein Code
| | Google Play | Apple App Store |
|---|---|---|
| Technik | „Trusted Web Activity“: echte Android-App, die Duty First von deiner Domain öffnet | „Capacitor“: Duty First wird in eine iOS-App verpackt, alle Dateien liegen in der App |
| Updates | **automatisch** über die Webseite (Netlify), kein neuer Upload nötig | **jedes Update** = neuer Build + kurze Prüfung durch Apple (meist 1–2 Tage) |
| Konto | einmalig **25 $** | **99 € pro Jahr** |
| Was du brauchst | Android-Handy (nur kurz, zur Konto-Bestätigung), **12 Tester mit Android** | **Mac mit Xcode** oder Cloud-Dienst (siehe A2) |
| Pflicht-Testphase | **14 Tage** geschlossener Test | keine (TestFlight freiwillig, empfohlen) |
| Dauer bis live | ca. 3–4 Wochen | ca. 1–2 Wochen |

### Laufende Kosten
- Domain: ca. 5–15 € pro Jahr
- Netlify (Hosting): 0 €
- Google Play: 25 $ einmalig
- Apple: 99 € pro Jahr (nur wenn du in den App Store willst)
- Optional: Impressum-Service (c/o-Adresse) ein paar Euro im Monat; Marke beim DPMA ab ca. 290 € (nicht nötig, siehe R6)

### Reihenfolge
1. **Rechtliches & Vorbereitung** (beide Stores): Teil R und V
2. **Google Play** (Teil G), parallel dazu
3. **Apple** (Teil A)

---

## R. Rechtliches (gilt für beide Stores)

### R1. Impressum: Pflicht nach § 5 Digitale-Dienste-Gesetz
- [ ] Angaben: **Vor- und Nachname**, **ladungsfähige Anschrift** (kein Postfach), **E-Mail**, **zweiter schneller Kontaktweg** (Telefon)
- [ ] Erreichbar **in der App** (Mehr → Rechtliches → Impressum, ist fertig), **auf der Webseite** (`impressum.html`) und **im Store-Eintrag** (Website-Link)
- Deine Adresse wird öffentlich. Wenn du das nicht willst: **Impressum-Service mit c/o-Adresse**. Das ist rechtlich nicht ganz unumstritten, aber weit verbreitet.
- Gilt auch für kostenlose Apps, weil sie öffentlich angeboten werden. Ein fehlendes Impressum ist der häufigste Abmahngrund.

### R2. Datenschutzerklärung (DSGVO)
- [ ] `datenschutz.html` ist fertig, es fehlen nur die Platzhalter: Name, Anschrift, E-Mail, **Datenschutzbehörde deines Bundeslandes**
- [ ] In der App erreichbar (fertig) und als **öffentlicher Link** in beiden Stores
- [ ] **Netlify-Auftragsverarbeitungsvertrag (AVV/DPA)**: Netlify verarbeitet beim Laden der Webseite IP-Adressen. Den DPA findest du unter netlify.com/legal (Data Processing Agreement). Lesen, akzeptieren bzw. herunterladen und **für deine Unterlagen speichern**.
- Cookie-Banner: **nicht nötig**. Die App speichert nur, was für die Funktion zwingend erforderlich ist (§ 25 Abs. 2 TDDDG), kein Tracking.
- Bei Apple wird die App aus den Dateien in der App geladen. Für die iOS-App gilt der Hosting-Teil also nur für die Webseite mit den Rechtstexten.
- **Merke:** Kommt später irgendetwas dazu, das Daten nach außen schickt (Login, Cloud-Sync, Analyse, Werbung), muss die Datenschutzerklärung **vorher** angepasst werden.

### R3. Gesundheit: kein Medizinprodukt, keine Heilversprechen
- [ ] Gesundheitshinweise sind in der App (Mehr → Rechtliches) und beim ersten Start (fertig)
- [ ] **In Store-Texten und Screenshots keine Heilversprechen**: nicht „garantiert 10 kg abnehmen“, „heilt Rückenschmerzen“, „medizinisch geprüft“, „Therapie“. Sonst drohen Probleme nach dem Heilmittelwerbegesetz und die Einstufung als Medizinprodukt (MDR). Die fertigen Texte in `store-eintrag.md` sind entsprechend formuliert.
- Bei den Gesundheits-Angaben in beiden Stores: **keine medizinischen Funktionen** angeben (siehe G7, A7).

### R4. EU-Händlerstatus (Digital Services Act)
- Beide Stores fragen, ob du **„Händler“ (Trader)** bist. Apple verlangt die Angabe **auch von Privatpersonen**.
- Solange die App **kostenlos ist, ohne Werbung und ohne In-App-Käufe**, und du sie privat anbietest: **„Kein Händler“** angeben. Dann werden Adresse und Telefon im Store **nicht** angezeigt.
- Verdienst du später Geld mit der App, wirst du Händler. Dann werden Adresse, Telefon und E-Mail im Store öffentlich, und du musst das in beiden Stores ändern.

### R5. Steuern & Gewerbe
- **Kostenlos und ohne Einnahmen:** kein Gewerbe, keine Steuern, nichts zu tun.
- **Später mit Einnahmen:** Gewerbe anmelden (ca. 20–60 €, je nach Gemeinde); Kleinunternehmer-Regelung prüfen; Einnahmen in der Steuererklärung. Apple und Google führen die Umsatzsteuer beim Verkauf ab. In-App-Käufe müssen über Apple bzw. Google laufen.

### R6. Name, Marke, Urheberrecht
- [ ] **„Duty First“ prüfen**: DPMA-Register (dpma.de → DPMAregister, Marken) und EUIPO (euipo.europa.eu → eSearch) nach „Duty First“ in den Klassen 9 (Software) und 41/44 (Fitness/Gesundheit) durchsuchen. Außerdem in beiden Stores suchen. Claude hat in einer Websuche keine App und nur eine australische Marke für Steuerberatung gefunden; die Register selbst konnte Claude nicht prüfen.
- Eine eigene Markenanmeldung ist **nicht nötig** für die Veröffentlichung, schützt aber den Namen (DPMA ab ca. 290 € für 3 Klassen).
- Urheberrecht: Icon, Grafiken, Texte, Lebensmittel-Datenbank und Übungen sind selbst erstellt. Fremde Software (Texterkennung, Symbole) steht unter freien Lizenzen, die Hinweise sind in der App (Mehr → Rechtliches → Lizenzen).

### R7. Prüfung der Texte (empfohlen)
- [ ] Datenschutz und Impressum einmal gegenprüfen: z. B. mit dem Datenschutz-Generator von Dr. Schwenke (für Privatpersonen kostenlos) oder durch einen Anwalt für IT-Recht (einmaliger Check, bei so einer schlanken App schnell erledigt)

### R8. Was **nicht** nötig ist
- Keine AGB (kostenlos, kein Konto). Apple nutzt automatisch seine Standard-Nutzungsbedingungen (EULA).
- Keine Cookie-Einwilligung, keine Datenschutz-Folgenabschätzung (es werden keine Daten an dich übertragen).
- Barrierefreiheitsstärkungsgesetz: betrifft u. a. Online-Shops und Bezahl-Dienste, nicht eine kostenlose App ohne Verkauf.
- Keine EU-Streitschlichtungs-Plattform (die gibt es seit Juli 2025 nicht mehr).

---

## V. Vorbereitung (für beide Stores)

### V1. Domain kaufen
- [ ] Bei einem Anbieter deiner Wahl (z. B. INWX, IONOS, Strato) prüfen, ob **dutyfirst.de** frei ist (Alternativen: dutyfirst.app, duty-first.de), und **nur die Domain** kaufen (kein Webspace)
- [ ] **E-Mail-Weiterleitung** einrichten, z. B. `kontakt@dutyfirst.de` → deine private Adresse. Das bieten die meisten Anbieter kostenlos zur Domain an. Diese Adresse nutzt du für Impressum, Stores und Support, deine private Adresse bleibt verborgen.
- [ ] Claude die Domain sagen

### V2. Netlify (Hosting der Webseite/App)
- [ ] app.netlify.com → **„Sign up with GitHub“**
- [ ] **Add new site → Import an existing project → GitHub** → Repository **Gym-Tracker**
- [ ] Branch **claude/fitness-tracking-app-dmu5gz**, Build command **leer**, Publish directory **.** → **Deploy** (Einstellungen stehen schon in `netlify.toml`)
- [ ] **Domain management → Add a domain** → deine Domain → DNS beim Domain-Anbieter wie angezeigt einstellen
- [ ] Warten, bis **HTTPS** aktiv ist → Test: `https://deine-domain` auf dem Handy öffnen, Duty First lädt
- [ ] DPA speichern (siehe R2)

### V3. Rechtstexte fertigstellen
- [ ] Claude deine Daten schicken: Name, Anschrift (oder c/o-Adresse), E-Mail (z. B. kontakt@…), Telefon, Bundesland **(Claude trägt sie ein)**
- [ ] Danach prüfen: `https://deine-domain/impressum.html` und `/datenschutz.html` zeigen keine [eckigen Klammern] mehr

### V4. Testpersonen sammeln
- [ ] **Mindestens 12 Personen mit Android-Handy** für Google (mit der Gmail-/Google-Adresse, die auf ihrem Handy angemeldet ist), besser 15 als Puffer
- [ ] Für Apple optional ein paar iPhone-Tester (TestFlight)

---

## G. Google Play Store

### G1. Konto anlegen (dauert ein paar Tage, darum früh starten)
- [ ] play.google.com/console/signup → mit Google-Konto anmelden → **„Für mich selbst“** (privates Konto)
- [ ] **25 $** bezahlen
- [ ] **Identität bestätigen** (Ausweis), Adresse und Telefonnummer bestätigen
- [ ] **Android-Gerät bestätigen**: Google verlangt den Nachweis über die App „Google Play Console“ auf einem echten Android-Handy. Mit iPhone → kurz ein Android-Handy leihen.
- [ ] **Entwicklername** wählen, z. B. „Duty First“. Öffentlich sichtbar ist außerdem die Kontakt-E-Mail, deshalb die kontakt@-Adresse nutzen.
- [ ] Händlerstatus: **Kein Händler** (siehe R4)

### G2. Android-App bauen **(Claude)**
- [ ] Sobald die Domain mit HTTPS läuft, baut Claude die App als **Trusted Web Activity**. Dafür braucht Claude einmalig deine Freigabe, um Googles Android-Bauwerkzeuge herunterzuladen.
- [ ] Paket-ID: **de.dutyfirst.app**. Nach dem ersten Upload **für immer fest**, bis dahin noch änderbar.
- [ ] Du bekommst den **Upload-Schlüssel** (Datei + Passwort) → **sicher aufbewahren** (Passwort-Manager + Kopie auf USB-Stick)

### G3. App in der Play Console anlegen
- [ ] **App erstellen** → Name **Duty First: Gym & Ernährung** · Sprache **Deutsch (de-DE)** · **App** · **Kostenlos** → Erklärungen bestätigen

### G4. Geschlossener Test (Pflicht, 14 Tage)
- [ ] **Testen → Geschlossene Tests → Track erstellen** → Tester-Liste mit den E-Mails aus V4
- [ ] **Neuer Release** → App-Datei (AAB) von Claude hochladen → **Play App Signing** aktivieren
- [ ] **Test und Release → App-Integrität → App-Signatur** → **SHA-256-Fingerabdruck des App-Signaturschlüssels** kopieren und Claude schicken. **(Claude** trägt ihn in `.well-known/assetlinks.json` ein, sonst zeigt die App oben eine Browser-Leiste**)**
- [ ] Release zur Prüfung senden → nach Freigabe den **Opt-in-Link** an die Tester schicken
- [ ] Tester: Link öffnen → „Tester werden“ → App installieren → **14 Tage am Stück installiert lassen** und ab und zu benutzen
- [ ] Feedback sammeln, brauchst du für G9

### G5. Store-Eintrag (Wachstum → Store-Präsenz → Hauptversion)
- [ ] Texte aus `store/store-eintrag.md` (Name, Kurzbeschreibung, Beschreibung)
- [ ] Grafiken: `store/icon-512.png`, `store/feature-graphic-1024x500.png`, `store/screenshots/*.png`
- [ ] Kategorie **Gesundheit & Fitness**, E-Mail (kontakt@…), Website `https://deine-domain`

### G6. Richtlinien → App-Inhalte (so beantworten)
| Formular | Antwort |
|---|---|
| Datenschutzerklärung | `https://deine-domain/datenschutz.html` |
| App-Zugriff | Alle Funktionen ohne besonderen Zugriff verfügbar (kein Login) |
| Anzeigen | **Nein** |
| Einstufung des Inhalts | Fragebogen, Kategorie „Alle anderen App-Typen“. Keine Gewalt, Sexualität, Glücksspiel, keine Nutzer-Kommunikation. **Alkohol:** Die Lebensmittel-Datenbank enthält Bier, Wein und Cocktails als Nährwerte → ehrlich „Ja, Verweise“. Eine höhere Altersstufe ist egal. |
| Zielgruppe | **18 und älter**, spricht keine Kinder an |
| Nachrichten-App / Behörden / Finanzen | Nein / Nein / Keine |
| Datensicherheit | **Erhebt die App Nutzerdaten? → Nein.** Alles bleibt auf dem Gerät, nichts wird an dich oder Dritte übertragen. Keine Weitergabe, keine Werbe-ID. |
| Werbe-ID | Nein |

### G7. Gesundheits-Apps-Erklärung
- [ ] Funktionen: **Aktivität & Fitness**, **Ernährung & Gewichtsmanagement**, **Schlaf**, **Stress/Entspannung**
- [ ] **Keine** medizinischen Funktionen (keine Diagnose, Behandlung, kein Medizinprodukt)

### G8. Länder & Preis
- [ ] Länder, z. B. **Deutschland, Österreich, Schweiz** (die App ist auf Deutsch) · Preis **kostenlos** (kann später nicht auf kostenpflichtig umgestellt werden)

### G9. Produktion beantragen
- [ ] Nach 14 Tagen: **Dashboard → Zugriff auf Produktion beantragen** → Fragen beantworten (Anzahl Tester, Feedback, was verbessert wurde)
- [ ] Nach der Freigabe: **Produktion → Neuer Release** (gleiche App-Datei) → zur Prüfung senden → nach der Prüfung (meist wenige Tage) **live** 🎉

---

## A. Apple App Store

### A1. Vorab-Entscheidung
- Die iOS-App enthält alle Dateien selbst (Apple erlaubt nicht, dass eine App ihre Funktionen später aus dem Netz nachlädt). **Jedes Update braucht deshalb einen neuen Build und eine Apple-Prüfung**, meist 1–2 Tage.
- Apple lehnt Apps ab, die „nur eine Webseite“ sind (Richtlinie 4.2). Duty First ist umfangreich und offline nutzbar, das spricht dafür. Claude baut zusätzlich echte iOS-Funktionen ein: **Benachrichtigungen** (Wiege-Erinnerung, Pausentimer), **Teilen-Menü**, **Haptik**. Später optional **Apple Health**.

### A2. Mac oder Cloud
Zum Bauen und Hochladen braucht man Xcode, das nur auf dem Mac läuft. Möglichkeiten:
- [ ] **Eigener oder geliehener Mac** mit aktuellem macOS und Xcode (kostenlos im Mac App Store), **oder**
- [ ] **Cloud-Build-Dienst** (z. B. Codemagic, hat ein kostenloses Kontingent): baut und lädt die App ohne eigenen Mac hoch. Claude richtet das ein.

### A3. Apple Developer Program
- [ ] developer.apple.com/programs/enroll → mit deiner **Apple-ID** (Zwei-Faktor-Authentifizierung muss an sein)
- [ ] Als **Einzelperson** anmelden → **99 € pro Jahr**
- [ ] ⚠️ Bei Einzelpersonen steht dein **vollständiger Name als Anbieter** im App Store (bei Organisationen der Firmenname)
- [ ] Freischaltung dauert meist 1–2 Tage
- [ ] In **App Store Connect → Business**: Verträge akzeptieren (für kostenlose Apps reicht die Standard-Vereinbarung), **Händlerstatus: Kein Händler** (R4)

### A4. iOS-App bauen **(Claude)**
- [ ] Capacitor-Projekt mit Bundle-ID **de.dutyfirst.app**
- [ ] Offline-Mechanismus der Web-Version (Service Worker) für iOS abgeschaltet, alles in der App
- [ ] Native Benachrichtigungen, Teilen, Haptik
- [ ] **Datenschutz-Manifest** (PrivacyInfo.xcprivacy) mit den Pflichtangaben
- [ ] App-Icon 1024 × 1024 ohne Transparenz, Startbildschirm
- [ ] Angabe „keine nicht-exempte Verschlüsselung“ (spart die Exportkontroll-Frage bei jedem Upload)
- [ ] iPhone-Screenshots im Format 6,9" (1320 × 2868)

### A5. App in App Store Connect anlegen
- [ ] **Apps → + → Neue App** → Plattform iOS · Name **Duty First** (max. 30 Zeichen) · Sprache Deutsch · Bundle-ID **de.dutyfirst.app** · SKU z. B. `dutyfirst-ios`
- [ ] **Untertitel** (max. 30): `Training, Ernährung & Health`
- [ ] **Kategorie**: Gesundheit & Fitness (zweite: Lifestyle)
- [ ] **Datenschutz-URL**: `https://deine-domain/datenschutz.html` · **Support-URL**: `https://deine-domain/impressum.html`

### A6. App-Datenschutz („Datenschutz-Etikett“)
- [ ] **„Erfassen Sie Daten von dieser App?“ → Nein** → Ergebnis: **„Keine Daten erfasst“**
- Begründung: Apple zählt nur Daten, die das Gerät verlassen und von dir oder Partnern genutzt werden. Bei Duty First bleibt alles lokal.

### A7. Altersfreigabe (neuer Fragebogen)
- [ ] Ehrlich beantworten:
  - Alkohol: Verweise (Getränke in der Datenbank)
  - **Medizinische/Wellness-Themen: Ja, allgemeine Fitness- und Ernährungs-Infos**, aber keine medizinische Behandlung
  - Keine Gewalt, kein Glücksspiel, keine Chats, keine Standortfreigabe
- [ ] Ergebnis vermutlich **13+ oder 16+**. Das passt. Bei Bedarf kannst du manuell **18+** setzen.
- Apple führt gerade zusätzliche Pflichtangaben ein (u. a. „Shared Location“: bei uns **Nein**). Die müssen **bis 12. Januar 2027** ausgefüllt sein.

### A8. Store-Eintrag
- [ ] Beschreibung: aus `store/store-eintrag.md` (gleicher Text)
- [ ] **Werbetext** (max. 170, jederzeit änderbar): `Training mit automatischer Progression, Ernährung, Schlaf und Erholung – komplett offline. Deine Daten bleiben auf deinem iPhone.`
- [ ] **Keywords** (max. 100 Zeichen, mit Komma, ohne Leerzeichen): `fitness,krafttraining,kalorien,ernährung,makros,gym,training,abnehmen,muskelaufbau,schlaf,tracker`
- [ ] Screenshots 6,9" **(Claude)**, App-Icon kommt mit dem Build

### A9. Testen mit TestFlight (empfohlen)
- [ ] Build hochladen **(Claude** bzw. du per Xcode: Product → Archive → Distribute**)**
- [ ] Unter **TestFlight** dich und ein paar Freunde als Tester einladen, App über die TestFlight-App installieren und durchklicken

### A10. Zur Prüfung einreichen
- [ ] Build in der Version auswählen → **Hinweise für die Prüfung**:
  `Keine Anmeldung nötig. Alle Daten werden nur lokal gespeichert, die App funktioniert offline. Zum Testen: Profil unter „Mehr“ ausfüllen, dann Training starten oder Essen eintragen.`
- [ ] **Zur Prüfung senden** → meist 24–48 h → **live** 🎉
- Bei einer Ablehnung schreibt Apple den genauen Grund. Einfach Claude schicken, dann wird es angepasst.

---

## N. Nach der Veröffentlichung

- **Google Play:** Neue Funktionen kommen automatisch über die Webseite. Eine neue App-Datei ist nur selten nötig (z. B. einmal im Jahr, wenn Google ein neues Android-Zielniveau verlangt) **(Claude)**.
- **Apple:** Jedes Update = neuer Build und Prüfung **(Claude** baut, du oder der Cloud-Dienst lädt hoch**)**.
- **Bestehende Daten:** Wer Duty First bisher als Web-App nutzt, nimmt die Daten so mit: **Mehr → Backup exportieren**, in der Store-App **Backup laden**. Die Daten wandern nicht automatisch.
- **Pflichten:** E-Mails an die Kontaktadresse beantworten; die Apple-Mitgliedschaft jährlich verlängern (sonst verschwindet die App aus dem App Store); vor neuen Funktionen mit Datenübertragung die Datenschutzerklärung anpassen.
- **Bewertungen** in beiden Stores ab und zu beantworten, das wirkt seriös.

---

## Was Claude als Nächstes braucht
1. **Deine Domain**, sobald gekauft und mit Netlify verbunden
2. **Impressum-Daten** (Name, Anschrift oder c/o, E-Mail, Telefon, Bundesland)
3. Für Apple: **Hast du einen Mac**, oder soll Claude den Cloud-Build einrichten?
4. Später: den **SHA-256-Fingerabdruck** aus der Play Console (G4)
