# HADAL – notes for working on this repo

Browser game (three.js, plain ES modules, no build step), hosted on GitHub Pages from `main`.
Owner: Andreas Schmölzer (pilotFilm). Must stay completely separate from his other games (own repo, own Firebase project).

## Structure
- `index.html`, `style.css` – shell, HUD markup, styles (mobile + desktop)
- `js/main.js` – menu, profile, `Dive` class (game loop per dive), results, quiz, multiplayer lobby
- `js/world.js` – trench terrain (heightfield), light/fog by depth, sonar mapping shader, marine snow
- `js/sub.js` – six original sub designs (`SUB_MODELS`: hummel, puffer, narwhal, octopus, rocket, ufo; merged parts via `js/parts.js`), movement; `RemoteSub` for teammates (model sent as player field `sub`)
- `js/launch.js` – launch from the ship: A-frame, chains, splash, underwater transition (skippable)
- `js/schools.js` – instanced fish schools (decorative, upper ocean + twilight glow shoals)
- `js/intro.js` – title screen / menu background aquarium (HADAL with water shader, animals, sub)
- `js/creatures.js` – creature models (built from primitives), spawning, behaviour, photo/grab targeting
- `js/scientist.js` + `js/data/knowledge.js` – Dr. Echo (local knowledge base, optional `AI_ENDPOINT`)
- `js/data/*.js` – levels, creatures (facts EN/DE + sources), quiz (age tiers kid/junior/adult)
- `js/net.js` – rooms: Firebase RTDB if configured, else peer-to-peer (PeerJS, host relays, all rooms public: codes from `PUBLIC_CODES`, `listRooms()` asks every code, `window.__FAKE_PEER__` hook for tests); `?local=1` = BroadcastChannel between tabs; Firestore leaderboard or local
- `js/config.js` – `FIREBASE_CONFIG`, `AI_ENDPOINT` (never put secrets here – public repo)
- `js/radio.js` – push-to-talk voice (PeerJS media calls between the room's peers, own channel – unrelated to the glider game's LiveKit radio) + quick radio calls; voice only for age 14+
- `js/audio.js` – synthesised FX + generative music (whale song, dolphins, echo sounder); sound modes all/fx/music/off
- `js/vendor/` – bundled three.js, Firebase and PeerJS (built with esbuild from npm)

## Rules
- Every real fact needs a source (`source` on creatures). Fantasy creatures must stay clearly marked (`kind: 'fantasy'`).
- All UI text in both languages (`js/i18n.js`, `{en, de}` objects in data files).
- Units: 1 world unit = 10 m. Depth in metres = `-y * 10`.
- Keep creature ids deterministic (seeded RNG) – multiplayer relies on identical spawns.
- Never copy protected designs or characters (e.g. the Beatles' Yellow Submarine): the sub is an original bumblebee design.

## Testing
`python3 -m http.server 8080`, then (real P2P/voice tests: run a local PeerJS server on 127.0.0.1:9000 path /hadal and add `&peer=127.0.0.1:9000`) `?autostart=<levelId>&mode=expedition|race&age=12&lang=de` (`?nointro=1` skips the title screen). `window.HADAL` exposes `game`, `profile`, `net`, `input` for debugging.
