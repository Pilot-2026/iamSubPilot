# HADAL – Expedition into the deep-sea trenches

A 3D browser game about the deepest places on Earth. Pick one of six crazy subs (bumblebee HUMMEL-1, pufferfish ball, narwhal with drill horn, octopus, retro rocket or deep-sea UFO). It is lowered from the research ship on chains, splashes into the sea and dives into seven real ocean trenches. Meet dolphins, whales, turtles and huge fish schools near the surface, photograph real deep-sea animals (and a few clearly marked, completely crazy fantasy creatures), ask the onboard AI scientist Dr. Echo anything, and answer age-adapted questions after each dive. Alone or with up to four friends.

**A game by Andreas Schmölzer · [www.pilotFilm.at](https://www.pilotfilm.at)**

▶ Play: <https://pilot-2026.github.io/hadal/>

## How to play

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | W A S D / arrow keys | Joystick (left) |
| Up / down | Space / Shift (hold Shift to dive fast) | ▲ / ▼ |
| Sonar ping | F | Sonar |
| Lights on/off | L | Light |
| Photo | C or Enter | Photo |
| Collect | G | Grab |
| Ask Dr. Echo | H | Ask |
| Surface (end dive) | B | Surface |
| Look around the sub | drag with the mouse, wheel = zoom | drag on the screen |
| Skip the launch | Space / click | tap |
| Sound (Music + FX / FX only / Music only / Silent) | M | sound button |
| Pause | Esc | ❚❚ |

- **Expedition:** explore, photograph, complete the missions (the first one is done within seconds), at the end choose whether to do the debrief quiz or skip it, map the trench with sonar and surface before energy, hull or oxygen run out.
- **Abyss Race:** fly through 14 rings down to the deepest point as fast as you can.
- **Multiplayer:** dive together (discoveries count for everyone) or race each other. All rooms are public – no codes, no private rooms: “Play now” jumps into an open room or opens a new one. A new room waits about 40 seconds for other divers (the host can start earlier or add time), and anyone who comes later simply joins the running dive (in a race, latecomers get their own start clock). Works without any setup: browsers connect directly (peer-to-peer via WebRTC/PeerJS), the host's browser keeps the room open.

Real animals carry a blue **REAL** badge and a source. Fantasy creatures carry a rainbow **FANTASY** badge – each fantasy card also hides one real fact.

## Tech

- Plain HTML/CSS/JavaScript modules, no build step. 3D with [three.js](https://threejs.org) (bundled in `js/vendor/`).
- Hosted on GitHub Pages straight from the `main` branch.
- Multiplayer rooms: peer-to-peer with [PeerJS](https://peerjs.com) (bundled in `js/vendor/`, uses the free public PeerJS signalling server). Optional: with a dedicated Firebase project, rooms run over the Realtime Database instead and the leaderboard goes online (Firestore). Setup: [FIREBASE-SETUP.md](FIREBASE-SETUP.md). Without Firebase the leaderboard is local.
- Dr. Echo answers from a built-in knowledge base. A real AI model can be connected later through a small server function (`AI_ENDPOINT` in `js/config.js`); API keys never go into this public repository.
- Sounds and music are synthesised with the Web Audio API (music: whale-song glides, dolphin whistles and clicks, echo-sounder pings, soft pads).

## Local development

```sh
python3 -m http.server 8080
# open http://localhost:8080
# test rooms between two tabs without Firebase: http://localhost:8080/?local=1
# jump straight into a dive: http://localhost:8080/?autostart=mariana&mode=expedition
# skip the title screen: http://localhost:8080/?nointro=1
```

## Sources for the science

Depths: Five Deeps Expedition via British Geological Survey (2021), World Book (Tonga), University of Western Australia (Izu-Ogasawara). Deep-sea exploration: Science Advances study via Live Science (2025), Seabed 2030 via IHO (2026). Each animal card in the game names its own source.
