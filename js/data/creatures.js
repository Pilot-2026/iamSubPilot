// Creatures and finds. Depth ranges in metres.
// habitat: 'mid' = open water, 'floor' = on/just above the seafloor, 'seep' = at methane seeps.
// fact = short (all ages), more = extra detail (10+).

export const CREATURES = [
  // ---------------- REAL: open water ----------------
  {
    id: 'lanternfish', kind: 'real', model: 'lanternfish',
    name: { en: 'Lanternfish', de: 'Laternenfisch' }, sci: 'Myctophidae',
    depth: [250, 1200], habitat: 'mid', count: 5, group: 8,
    fact: {
      en: 'Lanternfish carry rows of tiny lights on their bodies. They are among the most common fish in the ocean.',
      de: 'Laternenfische tragen Reihen winziger Lichter am Körper. Sie gehören zu den häufigsten Fischen im Meer.',
    },
    more: {
      en: 'Most of them migrate every day: deep and dark by day, up near the surface at night to feed – part of the largest animal migration on Earth.',
      de: 'Die meisten wandern jeden Tag: tagsüber tief im Dunkeln, nachts nach oben zum Fressen – Teil der größten Tierwanderung der Erde.',
    },
    source: { label: 'National Marine Sanctuary Foundation', url: 'https://marinesanctuary.org/blog/sea-wonder-lanternfish/' },
  },
  {
    id: 'combjelly', kind: 'real', model: 'combjelly',
    name: { en: 'Comb jelly', de: 'Rippenqualle' }, sci: 'Ctenophora',
    depth: [150, 3000], habitat: 'mid', count: 8, group: 1,
    fact: {
      en: 'Comb jellies shimmer in rainbow colours in our lamps. That is not their own light: their beating rows of tiny hairs scatter the light.',
      de: 'Rippenquallen schimmern im Scheinwerferlicht in Regenbogenfarben. Das ist nicht ihr eigenes Licht: Ihre schlagenden Wimpernreihen streuen das Licht.',
    },
    more: {
      en: 'Despite the name they are not related to jellyfish and do not sting. Many species can also make real light in the dark.',
      de: 'Trotz des Namens sind sie nicht mit Quallen verwandt und nesseln nicht. Viele Arten können im Dunkeln auch echtes Licht erzeugen.',
    },
    source: { label: 'Woods Hole Oceanographic Institution', url: 'https://www.whoi.edu/?p=606907' },
  },
  {
    id: 'vampire', kind: 'real', model: 'vampire',
    name: { en: 'Vampire squid', de: 'Vampirtintenfisch' }, sci: 'Vampyroteuthis infernalis',
    depth: [600, 1500], habitat: 'mid', count: 3, group: 1,
    fact: {
      en: 'The vampire squid is neither a vampire nor a squid. It eats "marine snow" – tiny bits of dead plankton and poop sinking from above.',
      de: 'Der Vampirtintenfisch ist weder Vampir noch Tintenfisch. Er frisst „Meeresschnee“ – winzige Reste von Plankton und Kot, die von oben herabsinken.',
    },
    more: {
      en: 'It collects the snow with two long sticky filaments. It is the last survivor of an ancient group of cephalopods and lives where the water holds very little oxygen.',
      de: 'Er sammelt den Schnee mit zwei langen, klebrigen Fäden. Er ist der letzte Überlebende einer uralten Kopffüßer-Gruppe und lebt dort, wo das Wasser kaum Sauerstoff enthält.',
    },
    source: { label: 'MBARI', url: 'https://www.mbari.org/?p=83322' },
  },
  {
    id: 'gulper', kind: 'real', model: 'gulper',
    name: { en: 'Gulper eel', de: 'Pelikanaal' }, sci: 'Eurypharynx pelecanoides',
    depth: [600, 3000], habitat: 'mid', count: 3, group: 1,
    fact: {
      en: 'The gulper eel can open its mouth like a huge balloon. That is why it is also called the pelican eel.',
      de: 'Der Pelikanaal kann sein Maul aufblähen wie einen riesigen Ballon. Daher hat er seinen Namen.',
    },
    more: {
      en: 'Its eyes are tiny, so it probably cannot rely on sight. A pink or red light on its tail tip may help lure prey.',
      de: 'Seine Augen sind winzig, auf das Sehen kann er sich kaum verlassen. Ein rosa oder rotes Licht an der Schwanzspitze lockt vermutlich Beute an.',
    },
    source: { label: 'Woods Hole Oceanographic Institution', url: 'https://www.whoi.edu/ocean-learning-hub/ocean-facts/pelican-eel/' },
  },
  {
    id: 'angler', kind: 'real', model: 'angler',
    name: { en: 'Deep-sea anglerfish', de: 'Tiefsee-Anglerfisch' }, sci: 'Ceratioidei',
    depth: [1000, 4000], habitat: 'mid', count: 4, group: 1,
    fact: {
      en: 'The female anglerfish dangles a glowing lure in front of her mouth. The light comes from bacteria living inside it.',
      de: 'Das Anglerfisch-Weibchen lässt einen leuchtenden Köder vor dem Maul baumeln. Das Licht stammt von Bakterien, die darin leben.',
    },
    more: {
      en: 'Males are tiny. In some species a male bites onto a female, and their bodies fuse for the rest of his life.',
      de: 'Die Männchen sind winzig. Bei manchen Arten beißt sich ein Männchen am Weibchen fest, und ihre Körper verwachsen für den Rest seines Lebens.',
    },
    source: { label: 'University of Washington', url: 'https://www.washington.edu/news/2018/03/22/a-blind-date-in-the-deep-sea-first-ever-observations-of-a-living-anglerfish-a-female-with-her-tiny-mate-coupled-for-life/' },
  },

  // ---------------- REAL: seafloor ----------------
  {
    id: 'seapig', kind: 'real', model: 'seapig',
    name: { en: 'Sea pig', de: 'Seeschwein' }, sci: 'Scotoplanes',
    depth: [1000, 6000], habitat: 'floor', count: 4, group: 5,
    fact: {
      en: 'Sea pigs are sea cucumbers. They walk across the mud on little tube feet and munch on bits of food in the sediment.',
      de: 'Seeschweine sind Seegurken. Sie laufen auf kleinen Füßchen über den Schlamm und fressen Nahrungsreste aus dem Sediment.',
    },
    more: {
      en: 'They can gather in herds of hundreds. Young king crabs sometimes ride underneath them for protection.',
      de: 'Sie treten in Herden von Hunderten auf. Junge Königskrabben reiten manchmal zum Schutz unter ihnen mit.',
    },
    source: { label: 'MBARI', url: 'https://www.mbari.org/animal/sea-pig/' },
  },
  {
    id: 'grenadier', kind: 'real', model: 'grenadier',
    name: { en: 'Abyssal grenadier', de: 'Tiefsee-Grenadier' }, sci: 'Coryphaenoides armatus',
    depth: [2000, 5200], habitat: 'floor', count: 5, group: 1,
    fact: {
      en: 'Grenadiers, also called rattails, are among the most common fish near the deep seafloor. They have big heads and long, thin tails.',
      de: 'Grenadierfische, auch Rattenschwänze genannt, gehören zu den häufigsten Fischen am tiefen Meeresboden. Sie haben große Köpfe und lange, dünne Schwänze.',
    },
    more: {
      en: 'They are scavengers. When scientists lower baited cameras, grenadiers are often among the first visitors.',
      de: 'Sie sind Aasfresser. Wenn Forschende Kameras mit Köder absenken, gehören Grenadiere oft zu den ersten Besuchern.',
    },
    source: { label: 'American Fisheries Society', url: 'https://fisheries.org/?p=64241' },
  },
  {
    id: 'dumbo', kind: 'real', model: 'dumbo',
    name: { en: 'Dumbo octopus', de: 'Dumbo-Oktopus' }, sci: 'Grimpoteuthis',
    depth: [1500, 7000], habitat: 'floor', count: 3, group: 1,
    fact: {
      en: 'The dumbo octopus flaps two ear-like fins on its head. In 2019 one was filmed at 6,957 m in the Java Trench – the deepest octopus ever seen.',
      de: 'Der Dumbo-Oktopus schlägt mit zwei ohrenartigen Flossen am Kopf. 2019 wurde einer auf 6.957 m im Java-Graben gefilmt – der tiefste Oktopus, der je gesehen wurde.',
    },
    more: {
      en: 'Its soft, jelly-like body is about 20 cm long and copes with crushing pressure. The sighting proved that octopuses live in the hadal zone.',
      de: 'Sein weicher, gallertartiger Körper ist etwa 20 cm lang und hält enormen Druck aus. Die Sichtung bewies, dass Oktopusse in der Hadalzone leben.',
    },
    source: { label: 'Guinness World Records', url: 'https://www.guinnessworldrecords.com/world-records/83167-deepest-octopus' },
  },
  {
    id: 'supergiant', kind: 'real', model: 'supergiant',
    name: { en: 'Supergiant amphipod', de: 'Riesen-Flohkrebs' }, sci: 'Alicella gigantea',
    depth: [3900, 8900], habitat: 'floor', count: 3, group: 3,
    fact: {
      en: 'The supergiant amphipod grows up to 34 cm long – most of its relatives are smaller than a fingertip.',
      de: 'Der Riesen-Flohkrebs wird bis zu 34 cm lang – die meisten seiner Verwandten sind kleiner als eine Fingerspitze.',
    },
    more: {
      en: 'It lives between about 3,900 and 8,900 m and may inhabit more than half of the world’s oceans.',
      de: 'Er lebt zwischen etwa 3.900 und 8.900 m und könnte in mehr als der Hälfte der Weltmeere vorkommen.',
    },
    source: { label: 'University of Western Australia', url: 'https://www.uwa.edu.au/news/article/2025/may/study-finds-deep-sea-giant-may-inhabit-more-than-half-the-worlds-oceans' },
  },
  {
    id: 'snailfish', kind: 'real', model: 'snailfish',
    name: { en: 'Hadal snailfish', de: 'Hadal-Schneckenfisch' }, sci: 'Pseudoliparis',
    depth: [6000, 8336], habitat: 'floor', count: 5, group: 2,
    fact: {
      en: 'Hadal snailfish are pale, soft-bodied fish. One was filmed at 8,336 m – the deepest fish ever recorded.',
      de: 'Hadal-Schneckenfische sind blasse Fische mit weichem Körper. Einer wurde auf 8.336 m gefilmt – der tiefste Fisch, der je beobachtet wurde.',
    },
    more: {
      en: 'They have no swim bladder. Their jelly-like bodies and special molecules such as TMAO help them cope with the pressure.',
      de: 'Sie haben keine Schwimmblase. Ihr gallertartiger Körper und besondere Moleküle wie TMAO helfen ihnen, den Druck auszuhalten.',
    },
    source: { label: 'University of Western Australia', url: 'https://uwa.edu.au/news/Article/2023/April/Scientists-break-new-record-after-finding-worlds-deepest-fish' },
  },
  {
    id: 'amphipod', kind: 'real', model: 'amphipod',
    name: { en: 'Hadal amphipods', de: 'Hadal-Flohkrebse' }, sci: 'Amphipoda',
    depth: [6000, 11000], habitat: 'floor', count: 4, group: 14,
    fact: {
      en: 'Small amphipods – shrimp-like scavengers – live even in the deepest trenches. They swarm to anything edible that sinks down.',
      de: 'Kleine Flohkrebse – garnelenähnliche Aasfresser – leben selbst in den tiefsten Gräben. Sie schwärmen zu allem Essbaren, das herabsinkt.',
    },
    more: {
      en: 'Hadal amphipods build up molecules such as TMAO that help their proteins work under extreme pressure.',
      de: 'Hadal-Flohkrebse reichern Moleküle wie TMAO an, damit ihre Eiweiße auch unter extremem Druck funktionieren.',
    },
    source: { label: 'Frontiers in Marine Science', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2021.743663/pdf' },
  },
  {
    id: 'xeno', kind: 'real', model: 'xeno',
    name: { en: 'Xenophyophore', de: 'Xenophyophore' }, sci: 'Xenophyophorea',
    depth: [4000, 11000], habitat: 'floor', count: 8, group: 1,
    fact: {
      en: 'Xenophyophores look like crumbly sponges, but each one is a single giant cell – up to 25 cm across!',
      de: 'Xenophyophoren sehen aus wie bröselige Schwämme, doch jede ist eine einzige Riesenzelle – bis zu 25 cm groß!',
    },
    more: {
      en: 'They are the largest single-celled organisms on Earth and have been filmed more than 10,600 m deep in the Mariana Trench.',
      de: 'Sie sind die größten Einzeller der Erde und wurden in über 10.600 m Tiefe im Marianengraben gefilmt.',
    },
    source: { label: 'Royal Museums Greenwich', url: 'https://www.rmg.co.uk/stories/ocean/challenger-deep-deepest-point-ocean' },
  },
  {
    id: 'tubeworm', kind: 'real', model: 'tubeworm',
    name: { en: 'Seep tube worms', de: 'Röhrenwürmer an Methanquellen' }, sci: 'Siboglinidae',
    depth: [5800, 9533], habitat: 'seep', count: 0, group: 1,
    fact: {
      en: 'These tube worms live where methane seeps out of the seafloor. They get their energy from chemicals instead of sunlight.',
      de: 'Diese Röhrenwürmer leben dort, wo Methan aus dem Meeresboden sickert. Ihre Energie stammt aus Chemikalien statt aus Sonnenlicht.',
    },
    more: {
      en: 'In 2024 the Chinese submersible Fendouzhe found such colonies down to 9,533 m in the Kuril-Kamchatka and Aleutian trenches – the deepest known.',
      de: '2024 fand das chinesische Tauchboot Fendouzhe solche Kolonien bis auf 9.533 m im Kurilen-Kamtschatka- und Alëuten-Graben – die tiefsten bekannten.',
    },
    source: { label: 'Chinese Academy of Sciences', url: 'https://lssf.cas.cn/en/news/rh/202508/t20250808_5079331.html' },
  },
  {
    id: 'clam', kind: 'real', model: 'clam',
    name: { en: 'Seep clams', de: 'Muscheln an Methanquellen' }, sci: 'Bivalvia',
    depth: [5800, 9533], habitat: 'seep', count: 0, group: 1,
    fact: {
      en: 'Clams at methane seeps live on chemical energy, with the help of microbes.',
      de: 'Muscheln an Methanquellen leben von chemischer Energie – mit Hilfe von Mikroben.',
    },
    more: {
      en: 'The seep communities found by Fendouzhe stretch over more than 2,500 km of trench floor.',
      de: 'Die von Fendouzhe gefundenen Lebensgemeinschaften erstrecken sich über mehr als 2.500 km Grabenboden.',
    },
    source: { label: 'Chinese Academy of Sciences', url: 'https://lssf.cas.cn/en/news/rh/202508/t20250808_5079331.html' },
  },

  // ---------------- FINDS (objects) ----------------
  {
    id: 'nodule', kind: 'object', model: 'nodule', collect: true,
    name: { en: 'Manganese nodule', de: 'Manganknolle' }, sci: 'Polymetallic nodule',
    depth: [4000, 6500], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'Manganese nodules are lumps of metal-rich rock. They grow extremely slowly – often just millimetres per million years.',
      de: 'Manganknollen sind Klumpen aus metallreichem Gestein. Sie wachsen extrem langsam – oft nur Millimeter pro Million Jahre.',
    },
    more: {
      en: 'They contain manganese, iron, nickel, copper and cobalt, so companies want to mine them for batteries. Many animals depend on the nodules to live.',
      de: 'Sie enthalten Mangan, Eisen, Nickel, Kupfer und Kobalt, deshalb wollen Firmen sie für Batterien abbauen. Viele Tiere sind auf die Knollen als Lebensraum angewiesen.',
    },
    source: { label: 'Smithsonian Ocean', url: 'https://www.ocean.si.edu/node/111035' },
  },
  {
    id: 'litter', kind: 'object', model: 'litter', collect: true,
    name: { en: 'Plastic litter', de: 'Plastikmüll' }, sci: '',
    depth: [0, 11000], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'Plastic waste has reached even the deepest place on Earth.',
      de: 'Plastikmüll ist sogar bis zur tiefsten Stelle der Erde gelangt.',
    },
    more: {
      en: 'Victor Vescovo saw plastic on the seafloor during his record dive to the Challenger Deep in 2019.',
      de: 'Victor Vescovo sah bei seinem Rekordtauchgang ins Challenger-Tief 2019 Plastik am Meeresboden.',
    },
    source: { label: 'Royal Museums Greenwich', url: 'https://www.rmg.co.uk/stories/ocean/challenger-deep-deepest-point-ocean' },
  },
  {
    id: 'whale', kind: 'object', model: 'whale',
    name: { en: 'Whale fall', de: 'Walkadaver' }, sci: '',
    depth: [1000, 7000], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'When a whale dies and sinks to the seafloor, it becomes a huge feast for deep-sea life.',
      de: 'Wenn ein Wal stirbt und zum Meeresboden sinkt, wird er zu einem riesigen Festmahl für das Leben der Tiefsee.',
    },
    more: {
      en: 'The skeleton can support rich communities for years to decades.',
      de: 'Das Skelett kann über Jahre bis Jahrzehnte reiche Lebensgemeinschaften ernähren.',
    },
    source: { label: 'NOAA Ocean Service', url: 'https://oceanservice.noaa.gov/facts/whale-fall.html' },
  },
  {
    id: 'seep', kind: 'object', model: 'seep',
    name: { en: 'Methane seep', de: 'Methanquelle' }, sci: '',
    depth: [3000, 11000], habitat: 'seep', count: 0, group: 1,
    fact: {
      en: 'At a methane seep, gas-rich fluids leak out of the seafloor. Microbes turn the chemicals into food for a whole community.',
      de: 'An einer Methanquelle tritt gasreiche Flüssigkeit aus dem Meeresboden. Mikroben machen daraus Nahrung für eine ganze Lebensgemeinschaft.',
    },
    more: {
      en: 'Such chemosynthetic communities in the Kuril-Kamchatka and Aleutian trenches were reported in the journal Nature in 2025.',
      de: 'Solche chemosynthetischen Gemeinschaften im Kurilen-Kamtschatka- und Alëuten-Graben wurden 2025 in der Zeitschrift Nature beschrieben.',
    },
    source: { label: 'Chinese Academy of Sciences', url: 'https://lssf.cas.cn/en/news/rh/202508/t20250808_5079331.html' },
  },
  {
    id: 'trieste', kind: 'object', model: 'trieste',
    name: { en: 'Trieste landing site', de: 'Landeplatz der Trieste' }, sci: '',
    depth: [10000, 11000], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'Here, at the bottom of the Challenger Deep, Don Walsh and Jacques Piccard landed in the bathyscaphe Trieste on 23 January 1960.',
      de: 'Hier, am Grund des Challenger-Tiefs, landeten Don Walsh und Jacques Piccard am 23. Jänner 1960 mit dem Tauchboot Trieste.',
    },
    more: {
      en: 'They were the first humans to reach the deepest point on Earth. By 2022, only 27 people had been there.',
      de: 'Sie waren die ersten Menschen am tiefsten Punkt der Erde. Bis 2022 waren erst 27 Menschen dort unten.',
    },
    source: { label: 'Royal Museums Greenwich', url: 'https://www.rmg.co.uk/stories/ocean/challenger-deep-deepest-point-ocean' },
  },
  {
    id: 'lander', kind: 'object', model: 'lander', collect: true, mission: true,
    name: { en: 'Lost research lander', de: 'Verlorener Forschungs-Lander' }, sci: '',
    depth: [0, 11000], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'Landers are robots that sink to the seafloor with cameras and bait, film for hours and then float back up.',
      de: 'Lander sind Roboter, die mit Kamera und Köder zum Meeresboden sinken, stundenlang filmen und dann wieder aufsteigen.',
    },
    more: {
      en: 'The record-breaking snailfish and the deepest octopus were both filmed by landers.',
      de: 'Der Rekord-Schneckenfisch und der tiefste Oktopus wurden beide von Landern gefilmt.',
    },
    source: { label: 'University of Western Australia', url: 'https://uwa.edu.au/news/Article/2023/April/Scientists-break-new-record-after-finding-worlds-deepest-fish' },
  },

  // ---------------- FANTASY ----------------
  {
    id: 'jellyphant', kind: 'fantasy', model: 'jellyphant',
    name: { en: 'Disco Jellyphant', de: 'Disco-Quallefant' },
    depth: [300, 4000], habitat: 'mid', count: 1, group: 1, sound: 'trumpet',
    fact: {
      en: 'The Disco Jellyphant trumpets a beat with its trunk and changes colour every second. It has never missed a party.',
      de: 'Der Disco-Quallefant trötet mit seinem Rüssel einen Beat und wechselt jede Sekunde die Farbe. Er hat noch keine Party verpasst.',
    },
    twist: {
      en: 'Many real deep-sea animals make their own light – that is called bioluminescence.',
      de: 'Viele echte Tiefseetiere erzeugen ihr eigenes Licht – das nennt man Biolumineszenz.',
    },
  },
  {
    id: 'sockopus', kind: 'fantasy', model: 'sockopus',
    name: { en: 'Sockopus', de: 'Sockentopus' },
    depth: [1000, 9000], habitat: 'floor', count: 1, group: 1, sound: 'boing',
    fact: {
      en: 'Every sock that ever vanished from a washing machine ends up down here. The Sockopus wears eight of them – never two the same.',
      de: 'Jede Socke, die je aus einer Waschmaschine verschwunden ist, landet hier unten. Der Sockentopus trägt acht davon – nie zwei gleiche.',
    },
    twist: {
      en: 'Real octopuses have eight arms – and the dumbo octopus lives deeper than any other known octopus.',
      de: 'Echte Oktopusse haben acht Arme – und der Dumbo-Oktopus lebt tiefer als jeder andere bekannte Oktopus.',
    },
  },
  {
    id: 'toaster', kind: 'fantasy', model: 'toaster',
    name: { en: 'Toaster Ray', de: 'Toaster-Rochen' },
    depth: [500, 6000], habitat: 'mid', count: 1, group: 1, sound: 'pop',
    fact: {
      en: 'Every few seconds the Toaster Ray pops out two slices of bubble toast. Nobody knows who eats them.',
      de: 'Alle paar Sekunden springen aus dem Toaster-Rochen zwei Scheiben Blasen-Toast. Niemand weiß, wer sie isst.',
    },
    twist: {
      en: 'Real rays and skates live in the deep sea too. Skates lay egg cases often called “mermaid’s purses”.',
      de: 'Echte Rochen leben auch in der Tiefsee. Manche legen Eikapseln, die man „Nixentäschchen“ nennt.',
    },
  },
  {
    id: 'grumpus', kind: 'fantasy', model: 'grumpus',
    name: { en: 'Grumpus Maximus', de: 'Grummelus Maximus' },
    depth: [2000, 11000], habitat: 'mid', count: 1, group: 1, sound: 'grumble',
    fact: {
      en: 'The grumpiest fish in the abyss. It hates headlights, sonar pings and Mondays. “Turn off that light!”',
      de: 'Der mürrischste Fisch der Tiefsee. Er hasst Scheinwerfer, Sonar-Pings und Montage. „Mach das Licht aus!“',
    },
    twist: {
      en: 'Many deep-sea animals cannot see red light, so some research cameras use red lamps to disturb them less.',
      de: 'Viele Tiefseetiere sehen kein rotes Licht. Manche Forschungskameras nutzen deshalb rote Lampen, um sie weniger zu stören.',
    },
  },
  {
    id: 'duckangler', kind: 'fantasy', model: 'duckangler',
    name: { en: 'Rubber Duck Angler', de: 'Quietscheentchen-Angler' },
    depth: [1000, 8000], habitat: 'mid', count: 1, group: 1, sound: 'squeak',
    fact: {
      en: 'Instead of a glowing lure, it dangles a squeaky rubber duck. Surprisingly, it works.',
      de: 'Statt eines Leuchtköders lässt er ein Quietscheentchen baumeln. Erstaunlicherweise funktioniert das.',
    },
    twist: {
      en: 'Real anglerfish lures glow thanks to bacteria that live inside them.',
      de: 'Echte Anglerfisch-Köder leuchten dank Bakterien, die darin leben.',
    },
  },
  {
    id: 'spaghetti', kind: 'fantasy', model: 'spaghetti',
    name: { en: 'Spaghetti Kraken', de: 'Spaghetti-Krake' },
    depth: [3000, 11000], habitat: 'floor', count: 1, group: 1, sound: 'slurp',
    fact: {
      en: 'Made of a thousand glowing noodles and one meatball eye. Perfectly al dente since the age of the dinosaurs.',
      de: 'Aus tausend leuchtenden Nudeln und einem Fleischbällchen-Auge. Perfekt al dente seit der Zeit der Dinosaurier.',
    },
    twist: {
      en: 'Real siphonophores are colonies of many connected animals – some form chains many metres long.',
      de: 'Echte Staatsquallen sind Kolonien aus vielen verbundenen Tieren – manche bilden meterlange Ketten.',
    },
  },
  {
    id: 'sheep', kind: 'fantasy', model: 'sheep',
    name: { en: 'Abyss Sheep', de: 'Tiefseeschaf' },
    depth: [4000, 11000], habitat: 'floor', count: 1, group: 1, sound: 'baa',
    fact: {
      en: 'Its glowing wool keeps it cosy in the icy deep. Counting them makes submarine pilots sleepy – careful!',
      de: 'Seine leuchtende Wolle hält es in der eisigen Tiefe warm. Wer sie zählt, wird müde – Vorsicht beim Steuern!',
    },
    twist: {
      en: 'The water in the trenches really is only about 1 to 4 °C.',
      de: 'Das Wasser in den Gräben hat wirklich nur etwa 1 bis 4 °C.',
    },
  },
  {
    id: 'pancake', kind: 'fantasy', model: 'pancake',
    name: { en: 'Pressure Pancake', de: 'Druck-Pfannkuchen' },
    depth: [6000, 11000], habitat: 'floor', count: 1, group: 1, sound: 'puff',
    fact: {
      en: 'Flat as a pancake at the bottom of the trench – and it puffs up like a soufflé when you come close.',
      de: 'Platt wie ein Pfannkuchen am Grabenboden – und wenn du näher kommst, bläht er sich auf wie ein Soufflé.',
    },
    twist: {
      en: 'Real deep-sea animals have no air spaces in their bodies, so the pressure cannot squash them.',
      de: 'Echte Tiefseetiere haben keine Lufträume im Körper, deshalb kann der Druck sie nicht zerquetschen.',
    },
  },
];

export function creatureById(id) {
  return CREATURES.find((c) => c.id === id);
}
