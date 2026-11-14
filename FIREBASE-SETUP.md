# Firebase einrichten (Bestenliste online + Mehrspieler)

Ohne Firebase läuft iamSubPilot komplett offline: Die Bestenliste wird nur auf dem eigenen Gerät gespeichert, und der Mehrspieler-Modus ist ausgeschaltet. Mit diesen Schritten bekommt das Spiel ein **eigenes, neues Firebase-Projekt** – getrennt vom Segelflugspiel.

Dauer: etwa 10 Minuten. Kosten: Der kostenlose Spark-Tarif reicht für den Start.

## 1. Projekt anlegen

1. Öffne <https://console.firebase.google.com> und melde dich mit deinem Google-Konto an.
2. **Projekt hinzufügen** → Name: `iamsubpilot` → Google Analytics kannst du ausschalten → **Projekt erstellen**.

## 2. Anonyme Anmeldung einschalten

1. Links **Build → Authentication** → **Jetzt starten**.
2. Reiter **Sign-in method** → **Anonym** → aktivieren → **Speichern**.
3. Reiter **Settings → Autorisierte Domains** → **Domain hinzufügen** → `pilot-2026.github.io`.

Die Spieler melden sich damit nur mit ihrem Spitznamen an – ohne E-Mail oder Passwort.

## 3. Firestore (Bestenliste)

1. Links **Build → Firestore Database** → **Datenbank erstellen**.
2. Standort: **europe-west3 (Frankfurt)** → **Im Produktionsmodus starten**.
3. Reiter **Regeln**: Den gesamten Inhalt ersetzen durch die Datei [`firestore.rules`](firestore.rules) aus diesem Repository → **Veröffentlichen**.

## 4. Realtime Database (Mehrspieler)

1. Links **Build → Realtime Database** → **Datenbank erstellen**.
2. Standort: **Belgien (europe-west1)** → **Im gesperrten Modus starten**.
3. Reiter **Regeln**: Den Inhalt ersetzen durch die Datei [`database.rules.json`](database.rules.json) → **Veröffentlichen**.

## 5. Web-App registrieren und Konfiguration kopieren

1. Oben links auf das Zahnrad → **Projekteinstellungen**.
2. Unten bei **Meine Apps** auf das Symbol **`</>`** (Web) klicken → Name: `iamsubpilot-web` → Firebase Hosting **nicht** anhaken → **App registrieren**.
3. Es erscheint ein Code-Block mit `const firebaseConfig = { ... }`. Diesen Block kopieren.
4. Prüfen, dass darin eine Zeile `databaseURL: "https://...firebasedatabase.app"` steht. Falls nicht: Seite neu laden, nachdem die Realtime Database (Schritt 4) angelegt ist.

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

Danach ist die Online-Bestenliste aktiv, und unter **Mehrspieler** lassen sich Räume erstellen und per Link teilen.
