# HADAL – notes for working on this repo

Browser game (three.js, plain ES modules, no build step), hosted on GitHub Pages from `main`.
Owner: Andreas Schmölzer (pilotFilm). Must stay completely separate from his other games (own repo, own Firebase project).

## Structure
- `index.html`, `style.css` – shell, HUD markup, styles (mobile + desktop)
- `js/main.js` – menu, profile, `Dive` class (game loop per dive), results, quiz, multiplayer lobby
- `js/world.js` – trench terrain (heightfield), light/fog by depth, sonar mapping shader, marine snow
- `js/sub.js` – submersible model and movement; `RemoteSub` for teammates
- `js/creatures.js` – creature models (built from primitives), spawning, behaviour, photo/grab targeting
- `js/scientist.js` + `js/data/knowledge.js` – Dr. Echo (local knowledge base, optional `AI_ENDPOINT`)
- `js/data/*.js` – levels, creatures (facts EN/DE + sources), quiz (age tiers kid/junior/adult)
- `js/net.js` – Firebase (Firestore leaderboard, RTDB rooms) or local fallback (`?local=1` = BroadcastChannel)
- `js/config.js` – `FIREBASE_CONFIG`, `AI_ENDPOINT` (never put secrets here – public repo)
- `js/vendor/` – bundled three.js and Firebase (built with esbuild from npm)

## Rules
- Every real fact needs a source (`source` on creatures). Fantasy creatures must stay clearly marked (`kind: 'fantasy'`).
- All UI text in both languages (`js/i18n.js`, `{en, de}` objects in data files).
- Units: 1 world unit = 10 m. Depth in metres = `-y * 10`.
- Keep creature ids deterministic (seeded RNG) – multiplayer relies on identical spawns.

## Testing
`python3 -m http.server 8080`, then `?autostart=<levelId>&mode=expedition|race&age=12&lang=de`. `window.HADAL` exposes `game`, `profile`, `net`, `input` for debugging.
