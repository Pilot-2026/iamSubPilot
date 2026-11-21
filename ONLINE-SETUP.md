# Online-Räume einrichten (LiveKit + Netlify) – wie bei iamPilot, aber komplett getrennt

Damit Mehrspieler in **jedem** Netz klappt (auch iPhone und Tesla im Mobilfunk), laufen die Räume über LiveKit – genau wie beim Segelflugspiel iamPilot. iamisi bekommt dafür ein **eigenes LiveKit-Projekt** und eine **eigene Netlify-Seite**. Nichts wird mit iamPilot geteilt.

Ohne diese Einrichtung läuft das Spiel trotzdem: Die Räume verbinden sich dann direkt von Browser zu Browser (im selben WLAN klappt das, zwischen Mobilfunknetzen oft nicht).

Dauer: etwa 10 Minuten. Kosten: Der kostenlose „Build“-Tarif von LiveKit und der kostenlose Netlify-Tarif reichen.

## 1. Eigenes LiveKit-Projekt

1. <https://cloud.livekit.io> öffnen und anmelden (gleiches Konto wie bei iamPilot ist in Ordnung).
2. Oben links das Projekt-Menü → **New project** → Name: `iamsubpilot` → Tarif **Build (free)**.
3. Im neuen Projekt: **Settings → API keys → Create key** (Name z. B. `netlify`).
4. Drei Werte notieren:
   - **URL** – sieht aus wie `wss://iamsubpilot-xxxxxxxx.livekit.cloud`
   - **API Key**
   - **API Secret** (wird nur einmal angezeigt)

Das Secret gehört **nie** ins GitHub-Repo – nur in Netlify (Schritt 3).

## 2. Eigene Netlify-Seite für iamisi

1. <https://app.netlify.com> → **Add new site → Import an existing project → GitHub**.
2. Repository **Pilot-2026/iamSubPilot** wählen.
3. Die Einstellungen kommen aus der Datei `netlify.toml` – einfach **Deploy** klicken.
4. **Site configuration → Change site name** → `iamsubpilot` (dann heißt die Adresse `https://iamsubpilot.netlify.app`). Ist der Name schon vergeben, einen anderen wählen und Claude sagen.

## 3. Schlüssel eintragen

1. In der neuen Netlify-Seite: **Site configuration → Environment variables → Add a variable**.
2. Drei Variablen anlegen:
   - `LIVEKIT_URL` = die URL aus Schritt 1 (`wss://…livekit.cloud`)
   - `LIVEKIT_API_KEY` = der API Key
   - `LIVEKIT_API_SECRET` = das API Secret
3. **Deploys → Trigger deploy → Deploy site**, damit die Funktionen die Schlüssel bekommen.

## 4. Prüfen

- <https://iamsubpilot.netlify.app/api/rooms> zeigt `{"rooms":[],…}` → alles bereit.
- Zeigt die Seite `"error":"not-configured"`, fehlt eine der drei Variablen (oder es wurde nach dem Eintragen nicht neu veröffentlicht).

Danach nutzt das Spiel die LiveKit-Räume automatisch – auf GitHub Pages (<https://pilot-2026.github.io/iamSubPilot/>) und unter der Netlify-Adresse. Im Mehrspieler-Fenster verschwindet dann die Zeile „Verbindung“, weil sie nur für den Ersatzweg gebraucht wird.

## Technik (für später)

- `netlify/functions/join.mjs` – Raum eröffnen/betreten, gibt den LiveKit-Zugangsschlüssel aus (6 Stunden gültig)
- `netlify/functions/rooms.mjs` – Liste der offenen Räume
- `netlify/functions/meta.mjs` – der Gastgeber aktualisiert Modus, Graben und Status für die Raumliste
- `js/config.js` → `MP_SITE` – Adresse der Netlify-Seite (für die Version auf GitHub Pages)
