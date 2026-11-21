# iamisi – Expedition into the deep-sea trenches

A 3D browser game about the deepest places on Earth – a game for Isabella, inspired by Wolfgang Hummelberger. The name: **isi** stands for Isabella and sounds like the English word *easy* – light and carefree, the way discovering should feel (formerly iamSubPilot). Pick one of eight crazy subs (the mermaid sub ISABELLA, bumblebee HUMMEL-1, shark-shaped WOLFSHARK, pufferfish ball, narwhal with drill horn, octopus, retro rocket or deep-sea UFO). It is lowered from the research ship HMS Andrew on chains, splashes into the sea and dives into seven real ocean trenches. Meet dolphins, whales, turtles, ten kinds of sharks (hammerheads, great white, blue shark, goblin, frilled, cookiecutter, ninja lanternshark, sixgill, Greenland shark and the deepest one, the Portuguese dogfish) and huge fish schools, photograph real deep-sea animals (and a few clearly marked, completely crazy fantasy creatures), ask the onboard AI scientist Dr. Echo anything, and answer age-adapted questions after each dive. Alone or with up to four friends.

**A game by Andreas Schmölzer · [www.pilotFilm.at](https://www.pilotfilm.at)**

▶ Play: <https://pilot-2026.github.io/iamSubPilot/>

## How to play

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | W A S D / arrow keys | yellow joystick (right) |
| Up / down | Space / Shift (hold Shift to dive fast) | ▲ / ▼ (next to the joystick) |
| Sonar ping | F | Sonar (buttons on the left) |
| Lights on/off | L | Light |
| Photo | C or Enter | Photo |
| Grab with the arm (nodules, litter, sediment samples, lost lander) | G | Grab |
| Ask Dr. Echo | I | Ask |
| Boost (stays on until switched off: dive and climb much faster, uses more energy) | X | 🚀 |
| List of all keys | H | – |
| Surface (end dive) | B | Surface |
| Look around the sub | drag with the mouse, wheel = zoom | drag on the screen |
| Skip the launch / the recovery | Space / click | tap |
| Back to the view from behind | V | double-tap the sub |
| Radio: talk (online, 14+) | hold R (3× tap = keep open) | hold 🎙 |
| Quick radio calls (online) | T, then 1–8 | 📻 |
| Map of the explored area | K | 🗺 |
| Sound (Music + FX / FX only / Music only / Silent) | M | sound button |
| Pause | Esc | ❚❚ |

- **Photos in 3D:** every new find opens large, and the camera circles around the animal until you click it away (drag to turn it yourself; a solo dive pauses meanwhile). The results screen shows all photographed animals as small rotating 3D tiles – tap one to see it big. In the sub picker, the sub under the mouse grows and turns around.
- **Deepest point:** a golden column of light marks it, a small guide under the missions shows direction and distance, and the map shows it too. The whole flat deepest basin counts. The results show how deep you got compared with the deepest point.
- **Atlantis (secret):** finish every mission of a dive and a short text explains the legend of Atlantis (Plato) – then an underwater city of glass domes, Gothic towers, glass tube walkways and glowing gardens rises from the seafloor – a different one in every trench (Coral Palace, Crystal Citadel, Golden Spiral, Ice Crystal City, Jade Gardens, Amber Forge, Pearl Lagoon). Explore it as long as you like (nothing runs out there), and keep your eyes open – somewhere in the big building in the middle there is a small glowing gate …
- **The hidden hall:** first the legend of the fable creature appears beside it, then it tells you its secret. A light show of rays, beams and glowing orbs fills the dome; swim through the floating treasures to collect them, and use the sonar to find the hall's hidden secret. In Captain Bushybeard's hall you can collect his hundred Gigglings – each one jumps for joy and turns a double somersault.
- **Your progress everywhere:** enter the same diver name on another device and your research points, hangar upgrades, sub and logbook are back (saved through the game's own Netlify site). The leaderboard has a list of all divers.
- **Debrief:** many more questions, each with its scientific source – and a bonus question about the legend of the fable creature you met.
- **Wrecks:** near the deep end of every trench lie a sunken warship and a crashed plane from the Second World War – swim inside and collect the treasures.
- **Team challenges (co-op):** ten tasks that only two divers can solve together – each swims into one of two glowing ✋ rings: free a dolphin from a fishing net, open a giant clam, lift a treasure chest, open a temple door and more.
- **Rugged trenches:** the walls have ledges, ridges and rocks sticking out.
- **Christmas special:** from one week before to one week after Christmas (17 December – 2 January) Santa Claus swims through every dive in his sleigh, pulled by four seahorses with bells and little Santa hats, and calls “Ho ho ho, merry Christmas” to you by name. In the season he also passes through the title-screen aquarium.
- **Back aboard:** when you surface, the chains come down and the crane of the HMS Andrew lifts the sub out of the water and sets it back on deck (skippable).
- **Expedition:** explore, photograph, complete the missions (the first one is done within seconds), at the end choose whether to do the debrief quiz or skip it, map the trench with sonar and surface before energy, hull or oxygen run out.
- **Grabbing:** the big telescopic arm reaches out several metres, closes its claw and pulls the find into the sample basket – manganese nodules, litter, sediment samples (yellow flags) and the lost lander count for missions and points.
- **Solid bodies:** subs, animals, the lost lander, sediment markers and the ship's hull can't be passed through. Two subs that collide bounce off each other with a clang.
- **Abyss Race:** fly through 14 rings down to the deepest point as fast as you can.
- **Multiplayer:** dive together (discoveries count for everyone) or race each other. All rooms are public – no codes, no private rooms: “Play now” jumps into an open room or opens a new one. A new room waits about 40 seconds for other divers (the host can start earlier or add time), and anyone who comes later simply joins the running dive (in a race, latecomers get their own start clock). With a built-in **radio**: push-to-talk voice for players aged 14+ (direct browser-to-browser audio, nothing is recorded, mute any diver) and quick radio calls with fixed phrases for everyone. A **radar** shows where the other subs are (heading-up, 1.2 km range, ▲/▼ when someone is far above or below). Rooms run over LiveKit – the game's own LiveKit project, opened by small functions on the game's own Netlify site (setup: [ONLINE-SETUP.md](ONLINE-SETUP.md)) – so they work on every network, also phone to phone on mobile data. Without that, browsers connect directly (peer-to-peer via WebRTC/PeerJS); the host's browser keeps the room open (the game keeps the host's screen on). Rooms are found through the signalling server, so they show up even where a direct connection is blocked; the multiplayer window shows a connection check (server / direct / relay) and says clearly when two networks can't reach each other. Two divers who open a room at the same moment are merged into one room.

Real animals carry a blue **REAL** badge and a source. Fantasy creatures carry a rainbow **FANTASY** badge – each fantasy card also hides one real fact.

## Tech

- Plain HTML/CSS/JavaScript modules, no build step. 3D with [three.js](https://threejs.org) (bundled in `js/vendor/`).
- Hosted on GitHub Pages straight from the `main` branch.
- Multiplayer rooms: peer-to-peer with [PeerJS](https://peerjs.com) (bundled in `js/vendor/`, uses the free public PeerJS signalling server). Optional: with a dedicated Firebase project, rooms run over the Realtime Database instead and the leaderboard goes online (Firestore). Setup: [FIREBASE-SETUP.md](FIREBASE-SETUP.md). Without Firebase the leaderboard is local.
- Visitor statistics (press 9 five times, or tap the version number five times): visits, new vs returning, countries (estimated from the time zone, no IP), time of day, weekdays, devices, languages, trenches, subs, modes, last visits. Anonymous counters in Firestore (`js/stats.js`, pages in `js/statsview.js`); without Firebase only this device is shown.
- Dr. Echo answers from a built-in knowledge base. A real AI model can be connected later through a small server function (`AI_ENDPOINT` in `js/config.js`); API keys never go into this public repository.
- Wordmark font: Source Sans 3 (SIL Open Font License, self-hosted in `fonts/`). Footer bar with logos and social links is the same as in iamPilot (`assets/`).
- Privacy policy: [privacy.html](privacy.html) · Imprint: <https://www.pilotfilm.at/impressum>
- Sounds and music are synthesised with the Web Audio API: five cheerful pieces (kalimba arpeggios, pads, bass, little tunes, bells) that take turns – every start begins with a different one – always with whale song, dolphin whistles and echo-sounder pings. Sound modes (Music + FX / FX only / Music only / Silent) in the menu, in the pause menu and with the 🔊 button during the dive (key M).

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
