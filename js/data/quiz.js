// Debrief questions, grouped by age tier. c = index of the correct answer.
// topic links a question to a creature id (asked preferably after finding it) or 'general'.

export const QUESTIONS = [
  // ---------- kid (up to 9) ----------
  { tier: 'kid', topic: 'general',
    en: { q: 'Is it light or dark at the bottom of a deep-sea trench?', a: ['Dark', 'Light', 'Rainbow-coloured', 'Green'], c: 0 },
    de: { q: 'Ist es am Grund eines Tiefseegrabens hell oder dunkel?', a: ['Dunkel', 'Hell', 'Regenbogenbunt', 'Grün'], c: 0 } },
  { tier: 'kid', topic: 'general',
    en: { q: 'How does the water feel at the bottom of the trench?', a: ['Very cold', 'Hot like a bath', 'Warm like summer', 'Boiling'], c: 0 },
    de: { q: 'Wie fühlt sich das Wasser am Grund des Grabens an?', a: ['Sehr kalt', 'Heiß wie ein Bad', 'Warm wie im Sommer', 'Kochend'], c: 0 } },
  { tier: 'kid', topic: 'dumbo',
    en: { q: 'What does the dumbo octopus have on its head?', a: ['Ear-like fins', 'A hat', 'Horns', 'Wheels'], c: 0 },
    de: { q: 'Was hat der Dumbo-Oktopus am Kopf?', a: ['Flossen wie Ohren', 'Einen Hut', 'Hörner', 'Räder'], c: 0 } },
  { tier: 'kid', topic: 'angler',
    en: { q: 'What does the anglerfish use to catch food?', a: ['A glowing lure', 'A net', 'A fishing boat', 'A magnet'], c: 0 },
    de: { q: 'Womit fängt der Anglerfisch sein Futter?', a: ['Mit einem Leuchtköder', 'Mit einem Netz', 'Mit einem Fischerboot', 'Mit einem Magnet'], c: 0 } },
  { tier: 'kid', topic: 'seapig',
    en: { q: 'What is a sea pig?', a: ['A sea cucumber', 'A pig that can swim', 'A small whale', 'A plant'], c: 0 },
    de: { q: 'Was ist ein Seeschwein?', a: ['Eine Seegurke', 'Ein Schwein, das schwimmen kann', 'Ein kleiner Wal', 'Eine Pflanze'], c: 0 } },
  { tier: 'kid', topic: 'fantasy',
    en: { q: 'Which of these animals is made up (fantasy)?', a: ['Sockopus', 'Snailfish', 'Sea pig', 'Lanternfish'], c: 0 },
    de: { q: 'Welches dieser Tiere ist erfunden (Fantasie)?', a: ['Sockentopus', 'Schneckenfisch', 'Seeschwein', 'Laternenfisch'], c: 0 } },
  { tier: 'kid', topic: 'lanternfish',
    en: { q: 'What do lanternfish have on their bodies?', a: ['Tiny lights', 'Feathers', 'Fur', 'Painted stripes'], c: 0 },
    de: { q: 'Was haben Laternenfische am Körper?', a: ['Winzige Lichter', 'Federn', 'Fell', 'Aufgemalte Streifen'], c: 0 } },
  { tier: 'kid', topic: 'vampire',
    en: { q: 'What does the vampire squid eat?', a: ['"Marine snow" – tiny bits falling from above', 'Blood', 'Sharks', 'Seaweed'], c: 0 },
    de: { q: 'Was frisst der Vampirtintenfisch?', a: ['„Meeresschnee“ – winzige Reste, die herabfallen', 'Blut', 'Haie', 'Seetang'], c: 0 } },
  { tier: 'kid', topic: 'general',
    en: { q: 'How does our submarine find its way in the dark?', a: ['With lamps and sonar', 'With sunglasses', 'With a candle', 'It follows a fish'], c: 0 },
    de: { q: 'Wie findet unser U-Boot im Dunkeln den Weg?', a: ['Mit Scheinwerfern und Sonar', 'Mit Sonnenbrille', 'Mit einer Kerze', 'Es folgt einem Fisch'], c: 0 } },
  { tier: 'kid', topic: 'litter',
    en: { q: 'What did explorers sadly find even at the deepest point?', a: ['Plastic waste', 'A pirate ship', 'A city', 'Gold coins'], c: 0 },
    de: { q: 'Was haben Forscher leider sogar am tiefsten Punkt gefunden?', a: ['Plastikmüll', 'Ein Piratenschiff', 'Eine Stadt', 'Goldmünzen'], c: 0 } },
  { tier: 'kid', topic: 'gulper',
    en: { q: 'Why is the gulper eel also called the pelican eel?', a: ['Its huge mouth', 'It can fly', 'It has feathers', 'It eats pelicans'], c: 0 },
    de: { q: 'Warum heißt der Pelikanaal so?', a: ['Wegen seines riesigen Mauls', 'Er kann fliegen', 'Er hat Federn', 'Er frisst Pelikane'], c: 0 } },
  { tier: 'kid', topic: 'xeno',
    en: { q: 'A xenophyophore can be as big as a plate. What is special about it?', a: ['It is just one single cell', 'It is a robot', 'It is made of glass', 'It can talk'], c: 0 },
    de: { q: 'Eine Xenophyophore kann so groß wie ein Teller sein. Was ist das Besondere?', a: ['Sie ist eine einzige Zelle', 'Sie ist ein Roboter', 'Sie ist aus Glas', 'Sie kann sprechen'], c: 0 } },
  { tier: 'kid', topic: 'combjelly',
    en: { q: 'Do comb jellies sting like jellyfish?', a: ['No, they do not sting', 'Yes, very badly', 'Only on Sundays', 'Only in summer'], c: 0 },
    de: { q: 'Nesseln Rippenquallen wie Quallen?', a: ['Nein, sie nesseln nicht', 'Ja, sehr stark', 'Nur sonntags', 'Nur im Sommer'], c: 0 } },

  // ---------- junior (10–13) ----------
  { tier: 'junior', topic: 'general',
    en: { q: 'From about what depth does the hadal zone begin?', a: ['About 6,000 m', 'About 200 m', 'About 1,000 m', 'About 11,000 m'], c: 0 },
    de: { q: 'Ab welcher Tiefe beginnt ungefähr die Hadalzone?', a: ['Etwa 6.000 m', 'Etwa 200 m', 'Etwa 1.000 m', 'Etwa 11.000 m'], c: 0 } },
  { tier: 'junior', topic: 'general',
    en: { q: 'What is the deepest point on Earth called?', a: ['Challenger Deep', 'Horizon Deep', 'Brownson Deep', 'Molloy Deep'], c: 0 },
    de: { q: 'Wie heißt der tiefste Punkt der Erde?', a: ['Challenger-Tief', 'Horizon Deep', 'Brownson Deep', 'Molloy-Tief'], c: 0 } },
  { tier: 'junior', topic: 'trieste',
    en: { q: 'About how many people had been to the bottom of the Challenger Deep by 2022?', a: ['27', 'About 3,000', 'None', 'About 500'], c: 0 },
    de: { q: 'Wie viele Menschen waren bis 2022 etwa am Grund des Challenger-Tiefs?', a: ['27', 'Etwa 3.000', 'Niemand', 'Etwa 500'], c: 0 } },
  { tier: 'junior', topic: 'trieste',
    en: { q: 'Which vessel first reached the Challenger Deep in 1960?', a: ['Trieste', 'Titanic', 'Nautilus', 'Limiting Factor'], c: 0 },
    de: { q: 'Welches Tauchboot erreichte 1960 als erstes das Challenger-Tief?', a: ['Trieste', 'Titanic', 'Nautilus', 'Limiting Factor'], c: 0 } },
  { tier: 'junior', topic: 'snailfish',
    en: { q: 'Which kind of fish is the deepest fish ever filmed?', a: ['A snailfish', 'A shark', 'A tuna', 'A goldfish'], c: 0 },
    de: { q: 'Welcher Fisch ist der tiefste, der je gefilmt wurde?', a: ['Ein Schneckenfisch', 'Ein Hai', 'Ein Thunfisch', 'Ein Goldfisch'], c: 0 } },
  { tier: 'junior', topic: 'combjelly',
    en: { q: 'Why do comb jellies shimmer in rainbow colours in our lights?', a: ['Their beating rows of hairs scatter the light', 'They are covered in paint', 'They are electric', 'They reflect the moon'], c: 0 },
    de: { q: 'Warum schimmern Rippenquallen in unserem Licht regenbogenbunt?', a: ['Ihre schlagenden Wimpernreihen streuen das Licht', 'Sie sind bemalt', 'Sie sind elektrisch', 'Sie spiegeln den Mond'], c: 0 } },
  { tier: 'junior', topic: 'tubeworm',
    en: { q: 'Where do the tube worms at methane seeps get their energy?', a: ['From chemicals like methane', 'From sunlight', 'From hunting fish', 'From electricity'], c: 0 },
    de: { q: 'Woher bekommen die Röhrenwürmer an Methanquellen ihre Energie?', a: ['Aus Chemikalien wie Methan', 'Aus Sonnenlicht', 'Von gejagten Fischen', 'Aus Strom'], c: 0 } },
  { tier: 'junior', topic: 'general',
    en: { q: 'Roughly how much does the water pressure increase every 10 metres?', a: ['About 1 bar', 'About 100 bar', 'It stays the same', 'It decreases'], c: 0 },
    de: { q: 'Um wie viel steigt der Wasserdruck etwa alle 10 Meter?', a: ['Um etwa 1 bar', 'Um etwa 100 bar', 'Er bleibt gleich', 'Er sinkt'], c: 0 } },
  { tier: 'junior', topic: 'general',
    en: { q: 'How does sonar work?', a: ['It sends out sound and listens for the echo', 'It uses X-rays', 'It takes photos', 'It uses magnets'], c: 0 },
    de: { q: 'Wie funktioniert Sonar?', a: ['Es sendet Schall aus und horcht auf das Echo', 'Mit Röntgenstrahlen', 'Es macht Fotos', 'Mit Magneten'], c: 0 } },
  { tier: 'junior', topic: 'general',
    en: { q: 'How much of the deep seafloor have humans actually seen with cameras?', a: ['Only about 0.001%', 'About 50%', 'About 10%', 'All of it'], c: 0 },
    de: { q: 'Wie viel vom tiefen Meeresboden haben Menschen wirklich mit Kameras gesehen?', a: ['Nur etwa 0,001 %', 'Etwa 50 %', 'Etwa 10 %', 'Alles'], c: 0 } },
  { tier: 'junior', topic: 'general',
    en: { q: 'Would Mount Everest (8,849 m) fit into the Challenger Deep?', a: ['Yes – with about 2 km of water above its peak', 'No, it would stick out', 'Exactly to the top', 'Only half of it'], c: 0 },
    de: { q: 'Würde der Mount Everest (8.849 m) ins Challenger-Tief passen?', a: ['Ja – mit etwa 2 km Wasser über dem Gipfel', 'Nein, er würde herausragen', 'Genau bis zur Oberfläche', 'Nur zur Hälfte'], c: 0 } },
  { tier: 'junior', topic: 'supergiant',
    en: { q: 'How long can a supergiant amphipod grow?', a: ['Up to 34 cm', 'Up to 2 m', 'Only 1 mm', 'Up to 10 m'], c: 0 },
    de: { q: 'Wie lang kann ein Riesen-Flohkrebs werden?', a: ['Bis zu 34 cm', 'Bis zu 2 m', 'Nur 1 mm', 'Bis zu 10 m'], c: 0 } },
  { tier: 'junior', topic: 'whale',
    en: { q: 'What happens when a dead whale sinks to the deep seafloor?', a: ['It feeds deep-sea life for years', 'It turns into rock', 'It floats back up the next day', 'Nothing eats it'], c: 0 },
    de: { q: 'Was passiert, wenn ein toter Wal zum Meeresboden sinkt?', a: ['Er ernährt jahrelang Tiefseetiere', 'Er wird zu Stein', 'Er treibt am nächsten Tag wieder hoch', 'Niemand frisst ihn'], c: 0 } },
  { tier: 'junior', topic: 'dumbo',
    en: { q: 'Where was the deepest octopus ever filmed?', a: ['In the Java Trench', 'In a swimming pool', 'In the Mediterranean', 'In a river'], c: 0 },
    de: { q: 'Wo wurde der tiefste Oktopus aller Zeiten gefilmt?', a: ['Im Java-Graben', 'In einem Schwimmbad', 'Im Mittelmeer', 'In einem Fluss'], c: 0 } },

  // ---------- adult (14+) ----------
  { tier: 'adult', topic: 'general',
    en: { q: 'A 2025 study estimated how much of the deep seafloor has ever been visually observed. Roughly how much?', a: ['0.001%', '1%', '5%', '25%'], c: 0 },
    de: { q: 'Eine Studie von 2025 schätzte, wie viel vom tiefen Meeresboden je mit Kameras beobachtet wurde. Wie viel ungefähr?', a: ['0,001 %', '1 %', '5 %', '25 %'], c: 0 } },
  { tier: 'adult', topic: 'general',
    en: { q: 'In 2026 the Seabed 2030 project reported roughly what share of the seafloor mapped to modern standards?', a: ['About 29%', 'About 3%', 'About 70%', 'About 95%'], c: 0 },
    de: { q: 'Welchen Anteil des Meeresbodens meldete das Projekt Seabed 2030 im Jahr 2026 als modern kartiert?', a: ['Etwa 29 %', 'Etwa 3 %', 'Etwa 70 %', 'Etwa 95 %'], c: 0 } },
  { tier: 'adult', topic: 'general',
    en: { q: 'Where do hadal trenches form?', a: ['Where one tectonic plate slides beneath another', 'At mid-ocean ridges', 'Where rivers enter the sea', 'Around coral reefs'], c: 0 },
    de: { q: 'Wo entstehen Tiefseegräben?', a: ['Wo eine Erdplatte unter eine andere abtaucht', 'An mittelozeanischen Rücken', 'Wo Flüsse ins Meer münden', 'Rund um Korallenriffe'], c: 0 } },
  { tier: 'adult', topic: 'snailfish',
    en: { q: 'Which molecule helps hadal fish and amphipods keep their proteins working under pressure?', a: ['TMAO', 'Chlorophyll', 'Caffeine', 'Ozone'], c: 0 },
    de: { q: 'Welches Molekül hilft Hadal-Fischen und Flohkrebsen, ihre Eiweiße unter Druck funktionsfähig zu halten?', a: ['TMAO', 'Chlorophyll', 'Koffein', 'Ozon'], c: 0 } },
  { tier: 'adult', topic: 'tubeworm',
    en: { q: 'The deepest known chemosynthetic animal communities (reported 2025) reach down to about…', a: ['9,533 m', '2,500 m', '4,000 m', '11,000 m'], c: 0 },
    de: { q: 'Die tiefsten bekannten chemosynthetischen Tiergemeinschaften (berichtet 2025) reichen bis etwa…', a: ['9.533 m', '2.500 m', '4.000 m', '11.000 m'], c: 0 } },
  { tier: 'adult', topic: 'dumbo',
    en: { q: 'The deepest octopus ever filmed (Java Trench, 2019) was at about…', a: ['6,957 m', '1,200 m', '3,500 m', '10,900 m'], c: 0 },
    de: { q: 'Der tiefste je gefilmte Oktopus (Java-Graben, 2019) war in etwa…', a: ['6.957 m', '1.200 m', '3.500 m', '10.900 m'], c: 0 } },
  { tier: 'adult', topic: 'nodule',
    en: { q: 'How fast do many manganese nodules grow?', a: ['Just millimetres per million years', 'A few centimetres per year', 'A metre per century', 'They do not grow'], c: 0 },
    de: { q: 'Wie schnell wachsen viele Manganknollen?', a: ['Nur Millimeter pro Million Jahre', 'Ein paar Zentimeter pro Jahr', 'Einen Meter pro Jahrhundert', 'Gar nicht'], c: 0 } },
  { tier: 'adult', topic: 'general',
    en: { q: 'About 65% of deep-sea visual observations were made near which countries?', a: ['USA, Japan and New Zealand', 'China, India and Brazil', 'Germany, France and Italy', 'Chile, Peru and Mexico'], c: 0 },
    de: { q: 'Rund 65 % der Tiefsee-Beobachtungen fanden vor welchen Ländern statt?', a: ['USA, Japan und Neuseeland', 'China, Indien und Brasilien', 'Deutschland, Frankreich und Italien', 'Chile, Peru und Mexiko'], c: 0 } },
  { tier: 'adult', topic: 'vampire',
    en: { q: 'The vampire squid lives mainly in which layer?', a: ['The oxygen minimum zone', 'The sunlit surface layer', 'Hydrothermal vents', 'Under sea ice'], c: 0 },
    de: { q: 'In welcher Schicht lebt der Vampirtintenfisch hauptsächlich?', a: ['In der Sauerstoffminimumzone', 'In der sonnigen Oberflächenschicht', 'An heißen Quellen', 'Unter dem Meereis'], c: 0 } },
  { tier: 'adult', topic: 'angler',
    en: { q: 'What do males of some deep-sea anglerfish species do?', a: ['Fuse permanently with a female', 'Build nests', 'Carry the eggs in their mouths', 'Migrate into rivers'], c: 0 },
    de: { q: 'Was tun die Männchen mancher Tiefsee-Anglerfische?', a: ['Sie verwachsen dauerhaft mit einem Weibchen', 'Sie bauen Nester', 'Sie tragen die Eier im Maul', 'Sie wandern in Flüsse'], c: 0 } },
  { tier: 'adult', topic: 'general',
    en: { q: 'At the bottom of the Challenger Deep the pressure is roughly…', a: ['More than 1,000 times that at the surface', '10 times', '100 times', 'The same as on land'], c: 0 },
    de: { q: 'Am Grund des Challenger-Tiefs ist der Druck ungefähr…', a: ['Mehr als 1.000-mal so hoch wie an der Oberfläche', '10-mal so hoch', '100-mal so hoch', 'Gleich wie an Land'], c: 0 } },
  { tier: 'adult', topic: 'xeno',
    en: { q: 'What makes xenophyophores remarkable?', a: ['They are the largest single-celled organisms', 'They are the fastest swimmers', 'They are the oldest fish', 'They glow green'], c: 0 },
    de: { q: 'Was ist an Xenophyophoren bemerkenswert?', a: ['Sie sind die größten Einzeller', 'Sie sind die schnellsten Schwimmer', 'Sie sind die ältesten Fische', 'Sie leuchten grün'], c: 0 } },
  { tier: 'adult', topic: 'lanternfish',
    en: { q: 'Lanternfish take part in the "diel vertical migration". What is that?', a: ['A daily up-and-down movement between the deep and the surface', 'A yearly journey between the poles', 'Swimming along the coast', 'Migrating into rivers'], c: 0 },
    de: { q: 'Laternenfische nehmen an der „täglichen Vertikalwanderung“ teil. Was ist das?', a: ['Ein tägliches Auf und Ab zwischen Tiefe und Oberfläche', 'Eine jährliche Reise zwischen den Polen', 'Schwimmen entlang der Küste', 'Wanderung in Flüsse'], c: 0 } },
];

export function tierForAge(age) {
  if (age <= 9) return 'kid';
  if (age <= 13) return 'junior';
  return 'adult';
}

function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick n questions for a tier, preferring topics the player met during the dive.
export function pickQuestions(tier, topics, n = 3, lang = 'en', avoid = []) {
  const order = tier === 'kid' ? ['kid', 'junior'] : tier === 'junior' ? ['junior', 'kid', 'adult'] : ['adult', 'junior'];
  let pool = [];
  for (const t of order) {
    const qs = QUESTIONS.filter((q) => q.tier === t && !avoid.includes(q.en.q));
    const preferred = shuffle(qs.filter((q) => topics.includes(q.topic)));
    const rest = shuffle(qs.filter((q) => !topics.includes(q.topic)));
    pool = pool.concat(preferred, rest);
    if (pool.length >= n * 2) break;
  }
  return pool.slice(0, n).map((q) => {
    const loc = q[lang] || q.en;
    // shuffle answers but remember the correct one
    const idx = shuffle([0, 1, 2, 3]);
    return {
      key: q.en.q,
      q: loc.q,
      a: idx.map((i) => loc.a[i]),
      c: idx.indexOf(loc.c),
    };
  });
}
