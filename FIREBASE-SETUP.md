# Firebase einrichten (Besucherstatistik + Bestenliste online)

Ohne Firebase läuft iamSubPilot trotzdem: Mehrspieler geht direkt von Browser zu Browser (PeerJS), die Bestenliste und die Statistik (5 × die Taste 9 drücken oder 5 × auf die Versionsnummer tippen) zeigen dann aber nur das eigene Gerät. Mit diesen Schritten bekommt das Spiel ein **eigenes, neues Firebase-Projekt** – getrennt vom Segelflugspiel.

Für die **Statistik** reichen die Schritte 1, 3, 5 und 6. Schritt 2 (anonyme Anmeldung) braucht nur die Online-Bestenliste. Schritt 4 ist optional.

Dauer: etwa 10 Minuten. Kosten: Der kostenlose Spark-Tarif reicht für den Start.

## 1. Projekt anlegen

1. Öffne <https://console.firebase.google.com> und melde dich mit deinem Google-Konto an.
2. **Projekt hinzufügen** → Name: `iamsubpilot` → Google Analytics kannst du ausschalten → **Projekt erstellen**.

## 2. Anonyme Anmeldung einschalten

1. Links **Build → Authentication** → **Jetzt starten**.
2. Reiter **Sign-in method** → **Anonym** → aktivieren → **Speichern**.
3. Reiter **Settings → Autorisierte Domains** → **Domain hinzufügen** → `pilot-2026.github.io`.

Die Spieler melden sich damit nur mit ihrem Spitznamen an – ohne E-Mail oder Passwort.

## 3. Firestore (Statistik und Bestenliste)

1. Links **Build → Firestore Database** → **Datenbank erstellen**.
2. Standort: **europe-west3 (Frankfurt)** → **Im Produktionsmodus starten**.
3. Reiter **Regeln**: Den gesamten Inhalt ersetzen durch die Datei [`firestore.rules`](firestore.rules) aus diesem Repository → **Veröffentlichen**.

Die Statistik legt dort selbst an:
- `stats/all` – Summen (Aufrufe, neu/wiederkehrend, Länder, Geräte, Sprachen, Stunden, Wochentage, Tauchgänge, Gräben, U-Boote, Modi)
- `stats/d_JJJJ-MM-TT` – ein Dokument pro Tag
- `visits` – die letzten Aufrufe (Land, Gerät, Sprache, neu/wiederkehrend, Stunde – keine Namen, keine IP-Adressen)

Dein eigenes Gerät wird beim ersten Öffnen der Statistik als „eigenes Gerät“ markiert und danach nur noch unter „Eigene Aufrufe“ gezählt.

## 4. Realtime Database (optional, Mehrspieler über Firebase)

Nur nötig, wenn die Mehrspieler-Räume über Firebase statt direkt (PeerJS) laufen sollen. Ohne `databaseURL` in der Konfiguration bleibt der direkte Mehrspieler-Modus aktiv.

1. Links **Build → Realtime Database** → **Datenbank erstellen**.
2. Standort: **Belgien (europe-west1)** → **Im gesperrten Modus starten**.
3. Reiter **Regeln**: Den Inhalt ersetzen durch die Datei [`database.rules.json`](database.rules.json) → **Veröffentlichen**.

## 5. Web-App registrieren und Konfiguration kopieren

1. Oben links auf das Zahnrad → **Projekteinstellungen**.
2. Unten bei **Meine Apps** auf das Symbol **`</>`** (Web) klicken → Name: `iamsubpilot-web` → Firebase Hosting **nicht** anhaken → **App registrieren**.
3. Es erscheint ein Code-Block mit `const firebaseConfig = { ... }`. Diesen Block kopieren.
4. Nur wenn du Schritt 4 gemacht hast: Prüfen, dass darin eine Zeile `databaseURL: "https://...firebasedatabase.app"` steht. Falls nicht: Seite neu laden, nachdem die Realtime Database angelegt ist.

Diese Werte sind **nicht geheim** – sie dürfen im öffentlichen Repository stehen. Geschützt werden die Daten durch die Regeln aus Schritt 3 und 4.

## 6. Eintragen

Den kopierten Block an Claude schicken – oder selbst in [`js/config.js`](js/config.js) eintragen:

```js
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "iamsubpilot-xxxx.firebaseapp.com",
  databaseURL: "https://iamsubpilot-xxxx-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "iamsubpilot-xxxx",
  storageBucket: "iamsubpilot-xxxx.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

Danach zählt die Statistik alle Besucher, und (mit Schritt 2) ist die Online-Bestenliste aktiv.
