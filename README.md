# HADAL – Expedition into the deep-sea trenches

A 3D browser game about the deepest places on Earth. Steer a research submersible into seven real ocean trenches, photograph real deep-sea animals (and a few clearly marked, completely crazy fantasy creatures), ask the onboard AI scientist Dr. Echo anything, and answer age-adapted questions after each dive. Alone or with up to four friends.

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
| Pause | Esc | ❚❚ |

- **Expedition:** explore, photograph, complete three missions, map the trench with sonar and surface before energy, hull or oxygen run out.
- **Abyss Race:** fly through 14 rings down to the deepest point as fast as you can.
- **Multiplayer:** dive together (discoveries count for everyone) or race each other. Create a room and share the link.

Real animals carry a blue **REAL** badge and a source. Fantasy creatures carry a rainbow **FANTASY** badge – each fantasy card also hides one real fact.

## Tech

- Plain HTML/CSS/JavaScript modules, no build step. 3D with [three.js](https://threejs.org) (bundled in `js/vendor/`).
- Hosted on GitHub Pages straight from the `main` branch.
- Online leaderboard (Firestore) and realtime multiplayer (Realtime Database) use a dedicated Firebase project. Setup: [FIREBASE-SETUP.md](FIREBASE-SETUP.md). Without it the game runs offline with a local leaderboard.
- Dr. Echo answers from a built-in knowledge base. A real AI model can be connected later through a small server function (`AI_ENDPOINT` in `js/config.js`); API keys never go into this public repository.
- Sounds are synthesised with the Web Audio API.

## Local development

```sh
python3 -m http.server 8080
# open http://localhost:8080
# test rooms between two tabs without Firebase: http://localhost:8080/?local=1
# jump straight into a dive: http://localhost:8080/?autostart=mariana&mode=expedition
```

## Sources for the science

Depths: Five Deeps Expedition via British Geological Survey (2021), World Book (Tonga), University of Western Australia (Izu-Ogasawara). Deep-sea exploration: Science Advances study via Live Science (2025), Seabed 2030 via IHO (2026). Each animal card in the game names its own source.
