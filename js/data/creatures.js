// Creatures and finds. Depth ranges in metres.
// habitat: 'mid' = open water, 'floor' = on/just above the seafloor, 'seep' = at methane seeps.
// fact = short (all ages), more = extra detail (10+).

export const CREATURES = [
  // ---------------- REAL: sunlit + twilight zone (spawn around the ship) ----------------
  // spawn: 'drop' = placed close to where the sub dives in, so you meet them right away.
  {
    id: 'dolphin', kind: 'real', model: 'dolphin', spawn: 'drop',
    name: { en: 'Bottlenose dolphin', de: 'Großer Tümmler' }, sci: 'Tursiops truncatus',
    depth: [5, 120], habitat: 'mid', count: 2, group: 4,
    fact: {
      en: 'Dolphins "see" with sound: they send out fast clicks and listen to the echoes – just like our sonar.',
      de: 'Delfine „sehen“ mit Schall: Sie senden schnelle Klicklaute aus und hören auf das Echo – genau wie unser Sonar.',
    },
    more: {
      en: 'They also whistle. Each dolphin has its own signature whistle, a bit like a name, that tells the group who and where it is.',
      de: 'Außerdem pfeifen sie. Jeder Delfin hat seinen eigenen Erkennungspfiff – ein bisschen wie ein Name –, der der Gruppe sagt, wer und wo er ist.',
    },
    source: { label: 'DOSITS – Discovery of Sound in the Sea (URI)', url: 'https://dosits.org/?p=15905' },
  },
  {
    id: 'humpback', kind: 'real', model: 'humpback', spawn: 'drop',
    name: { en: 'Humpback whale', de: 'Buckelwal' }, sci: 'Megaptera novaeangliae',
    depth: [15, 120], habitat: 'mid', count: 1, group: 1,
    fact: {
      en: 'Only male humpback whales sing. Their songs can go on for hours – and all males in one area sing the same song.',
      de: 'Nur männliche Buckelwale singen. Ihre Gesänge können stundenlang dauern – und alle Männchen einer Region singen dasselbe Lied.',
    },
    more: {
      en: 'Song sessions last from a few minutes to over 24 hours. Scientists think the songs play a role in finding a mate, but nobody knows exactly.',
      de: 'Eine Gesangs-Session dauert von wenigen Minuten bis über 24 Stunden. Forschende vermuten, dass die Lieder bei der Partnersuche helfen – genau weiß es niemand.',
    },
    source: { label: 'NOAA National Marine Sanctuaries', url: 'https://sanctuaries.noaa.gov/news/sep22/mysteries-of-humpback-whale-song.html' },
  },
  {
    id: 'whaleshark', kind: 'real', model: 'whaleshark', spawn: 'drop',
    name: { en: 'Whale shark', de: 'Walhai' }, sci: 'Rhincodon typus',
    depth: [10, 160], habitat: 'mid', count: 1, group: 1,
    fact: {
      en: 'The whale shark is the biggest fish in the ocean – and it eats some of the smallest food: plankton.',
      de: 'Der Walhai ist der größte Fisch im Meer – und frisst mit das Kleinste: Plankton.',
    },
    more: {
      en: 'It can dive to about 1,900 metres. Every whale shark has its own spot pattern, which scientists use like a fingerprint.',
      de: 'Er kann rund 1.900 Meter tief tauchen. Jeder Walhai hat sein eigenes Punktemuster – Forschende nutzen es wie einen Fingerabdruck.',
    },
    source: { label: 'Save Our Seas Foundation', url: 'https://saveourseas.com/worldofsharks/species/whale-shark' },
  },
  // ---------------- REAL: sharks (many species, from the surface down to the deepest shark) ----------------
  {
    id: 'hammerhead', kind: 'real', model: 'hammerhead', spawn: 'drop',
    name: { en: 'Scalloped hammerhead', de: 'Bogenstirn-Hammerhai' }, sci: 'Sphyrna lewini',
    depth: [8, 270], habitat: 'mid', count: 2, group: 5,
    fact: {
      en: 'The flat "hammer" head carries the eyes far apart and is full of sensors that feel the tiny electric fields of prey.',
      de: 'Der flache „Hammer“-Kopf trägt die Augen weit auseinander und steckt voller Sensoren, die winzige elektrische Felder von Beutetieren spüren.',
    },
    more: {
      en: 'Hammerheads often swim alone, but scalloped hammerheads also gather in big schools. They are shy and rarely come close to divers. The species is threatened by fishing.',
      de: 'Hammerhaie schwimmen oft allein, Bogenstirn-Hammerhaie bilden aber auch große Schulen. Sie sind scheu und kommen Tauchern selten nahe. Die Art ist durch Fischerei bedroht.',
    },
    source: { label: 'Hawaiʻi Division of Aquatic Resources', url: 'https://dar.hawaii.gov/?p=7983' },
  },
  {
    id: 'whiteshark', kind: 'real', model: 'whiteshark', spawn: 'drop',
    name: { en: 'Great white shark', de: 'Weißer Hai' }, sci: 'Carcharodon carcharias',
    depth: [10, 250], habitat: 'mid', count: 1, group: 1,
    fact: {
      en: 'The great white shark is partly warm-blooded: it can keep its body warmer than the water around it.',
      de: 'Der Weiße Hai ist teilweise warmblütig: Er kann seinen Körper wärmer halten als das Wasser um ihn herum.',
    },
    more: {
      en: 'It lives in temperate and subtropical seas all over the world and often migrates with the seasons to stay in water of about 10 to 27 °C. In the USA it is fully protected.',
      de: 'Er lebt in gemäßigten und subtropischen Meeren auf der ganzen Welt und wandert oft mit den Jahreszeiten, um in Wasser von etwa 10 bis 27 °C zu bleiben. In den USA steht er unter vollem Schutz.',
    },
    source: { label: 'NOAA Fisheries', url: 'https://www.fisheries.noaa.gov/species/white-shark' },
  },
  {
    id: 'blueshark', kind: 'real', model: 'blueshark', spawn: 'drop',
    name: { en: 'Blue shark', de: 'Blauhai' }, sci: 'Prionace glauca',
    depth: [10, 400], habitat: 'mid', count: 3, group: 1,
    fact: {
      en: 'Blue sharks are long-distance swimmers: tagged blue sharks have crossed whole oceans.',
      de: 'Blauhaie sind Langstreckenschwimmer: Markierte Blauhaie haben schon ganze Ozeane durchquert.',
    },
    more: {
      en: 'One tagged blue shark swam all the way across the South Atlantic from South America towards Africa. Because they travel so far, countries on both sides of the ocean have to protect them together.',
      de: 'Ein markierter Blauhai schwamm quer durch den Südatlantik von Südamerika Richtung Afrika. Weil sie so weit reisen, müssen Länder auf beiden Seiten des Ozeans sie gemeinsam schützen.',
    },
    source: { label: 'Florida Museum of Natural History', url: 'https://www.floridamuseum.ufl.edu/science/researchers-track-ocean-crossing-migration-of-blue-shark' },
  },
  {
    id: 'cookiecutter', kind: 'real', model: 'cookiecutter',
    name: { en: 'Cookiecutter shark', de: 'Zigarrenhai' }, sci: 'Isistius brasiliensis',
    depth: [300, 3000], habitat: 'mid', count: 4, group: 3,
    fact: {
      en: 'This small shark bites round "cookies" out of whales and big fish – it has even bitten the rubber sonar domes of submarines!',
      de: 'Dieser kleine Hai beißt runde „Kekse“ aus Walen und großen Fischen – er hat sogar schon die Gummi-Sonarkuppeln von U-Booten angeknabbert!',
    },
    more: {
      en: 'It grows to only about 50 cm. Its belly glows green, except for a dark collar around the throat. It probably rises from 2,000–3,000 m to shallower water at night.',
      de: 'Er wird nur etwa 50 cm lang. Sein Bauch leuchtet grün – bis auf einen dunklen Kragen um die Kehle. Wahrscheinlich steigt er nachts aus 2.000–3.000 m Tiefe nach oben.',
    },
    source: { label: 'Shark Research Institute', url: 'https://www.sharks.org/cookiecutter-shark-isistius-brasiliensis' },
  },
  {
    id: 'goblin', kind: 'real', model: 'goblin',
    name: { en: 'Goblin shark', de: 'Koboldhai' }, sci: 'Mitsukurina owstoni',
    depth: [270, 1300], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'The goblin shark shoots its jaws forward like a slingshot to snap up prey – faster than any other fish we know.',
      de: 'Der Koboldhai schleudert seine Kiefer wie eine Steinschleuder nach vorn, um Beute zu schnappen – schneller als jeder andere bekannte Fisch.',
    },
    more: {
      en: 'Scientists filmed it for the first time in 2008 and 2011: the jaws shot out at up to 3.1 m per second, almost a tenth of the shark’s body length. It was discovered off Japan in 1898.',
      de: 'Forschende filmten das 2008 und 2011 zum ersten Mal: Die Kiefer schossen mit bis zu 3,1 m pro Sekunde fast ein Zehntel der Körperlänge nach vorn. Entdeckt wurde der Hai 1898 vor Japan.',
    },
    source: { label: 'Hokkaido University (Scientific Reports 2016)', url: 'https://www.global.hokudai.ac.jp/blog/unraveling-the-jaw-dropping-goblin-shark/' },
    source2: { label: 'Nakaya et al. 2016, Scientific Reports', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4901258' },
  },
  {
    id: 'frilled', kind: 'real', model: 'frilled',
    name: { en: 'Frilled shark', de: 'Krausenhai' }, sci: 'Chlamydoselachus anguineus',
    depth: [500, 1500], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'The frilled shark looks like a sea serpent: an eel-like body, six frilly gill slits and about 300 needle-sharp teeth.',
      de: 'Der Krausenhai sieht aus wie eine Seeschlange: aalartiger Körper, sechs gekräuselte Kiemenspalten und rund 300 nadelspitze Zähne.',
    },
    more: {
      en: 'It is called a "living fossil" because it has changed very little over millions of years. Its pregnancy can last up to 42 months – the longest known of any animal with a backbone.',
      de: 'Man nennt ihn ein „lebendes Fossil“, weil er sich über Millionen Jahre kaum verändert hat. Seine Tragzeit kann bis zu 42 Monate dauern – die längste bekannte bei einem Wirbeltier.',
    },
    source: { label: 'BBC Wildlife (Discover Wildlife)', url: 'https://www.discoverwildlife.com/animal-facts/marine-animals/frilled-shark' },
  },
  {
    id: 'ninjashark', kind: 'real', model: 'ninjashark',
    name: { en: 'Ninja lanternshark', de: 'Ninja-Laternenhai' }, sci: 'Etmopterus benchleyi',
    depth: [830, 1450], habitat: 'mid', count: 3, group: 2,
    fact: {
      en: 'A jet-black little shark that glows faintly in the dark. Kids helped to name it – because ninjas are awesome!',
      de: 'Ein pechschwarzer kleiner Hai, der im Dunkeln schwach leuchtet. Kinder haben ihm seinen Namen gegeben – weil Ninjas einfach cool sind!',
    },
    more: {
      en: 'It was only described in 2015, from sharks caught off Central America at 836–1,443 m. It is about half a metre long, and its glow probably works like camouflage seen from below.',
      de: 'Er wurde erst 2015 beschrieben – nach Haien, die vor Mittelamerika in 836–1.443 m Tiefe gefangen wurden. Er ist etwa einen halben Meter lang, sein Leuchten tarnt ihn vermutlich von unten gesehen.',
    },
    source: { label: 'Journal of the Ocean Science Foundation (2015)', url: 'http://www.oceansciencefoundation.org/josf/josf17d.pdf' },
    source2: { label: 'IBTimes UK (naming by young shark fans)', url: 'https://www.ibtimes.co.uk/ninja-lanternshark-glowing-shark-discovered-1km-deep-pacific-ocean-off-costa-rica-coast-1535422' },
  },
  {
    id: 'sixgill', kind: 'real', model: 'sixgill',
    name: { en: 'Bluntnose sixgill shark', de: 'Stumpfnasen-Sechskiemerhai' }, sci: 'Hexanchus griseus',
    depth: [300, 2490], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'Most sharks have five gill slits on each side – this big, ancient shark has six.',
      de: 'Die meisten Haie haben auf jeder Seite fünf Kiemenspalten – dieser große, urtümliche Hai hat sechs.',
    },
    more: {
      en: 'Sixgill sharks belong to the deepest sharks of all: in the Mediterranean Sea they were found as deep as 2,490 m.',
      de: 'Sechskiemerhaie gehören zu den am tiefsten lebenden Haien: Im Mittelmeer wurden sie noch in 2.490 m Tiefe gefunden.',
    },
    source: { label: 'CIESM News (Priede et al., Proc. R. Soc. B 2006)', url: 'https://ciesm.org/news/mscience/abyss.htm' },
  },
  {
    id: 'greenland', kind: 'real', model: 'greenland',
    name: { en: 'Greenland shark', de: 'Grönlandhai' }, sci: 'Somniosus microcephalus',
    depth: [200, 2200], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'The Greenland shark can live for at least 272 years – longer than any other animal with a backbone that we know.',
      de: 'Der Grönlandhai kann mindestens 272 Jahre alt werden – älter als jedes andere bekannte Wirbeltier.',
    },
    more: {
      en: 'Scientists dated the lenses of their eyes with radiocarbon. The largest shark, 5 m long, was about 392 years old (give or take 120 years). They only have young at around 150 years.',
      de: 'Forschende datierten die Augenlinsen mit Radiokarbon. Der größte Hai, 5 m lang, war etwa 392 Jahre alt (plus/minus 120 Jahre). Nachwuchs bekommen sie erst mit rund 150 Jahren.',
    },
    source: { label: 'Science 2016 (Nielsen et al.)', url: 'https://pubmed.ncbi.nlm.nih.gov/27516602/' },
  },
  {
    id: 'dogfish', kind: 'real', model: 'dogfish',
    name: { en: 'Portuguese dogfish', de: 'Portugiesenhai' }, sci: 'Centroscymnus coelolepis',
    depth: [700, 3700], habitat: 'mid', count: 4, group: 1,
    fact: {
      en: 'The deepest shark we know: the Portuguese dogfish lives as deep as 3,700 m. Deeper down, in the trenches, there are no sharks at all.',
      de: 'Der am tiefsten lebende bekannte Hai: Der Portugiesenhai kommt bis in 3.700 m Tiefe vor. Noch tiefer, in den Gräben, gibt es gar keine Haie mehr.',
    },
    more: {
      en: 'It lives on continental slopes and abyssal plains from Iceland to South Africa and from Japan to Tasmania. Scientists think sharks avoid the abyss because their oily livers, which keep them afloat, need more food than the deep sea offers.',
      de: 'Er lebt an Kontinentalhängen und Tiefseeebenen von Island bis Südafrika und von Japan bis Tasmanien. Forschende vermuten, dass Haie die Tiefsee meiden, weil ihre ölige Leber, die ihnen Auftrieb gibt, mehr Nahrung braucht, als es dort gibt.',
    },
    source: { label: 'NatureScot – Sharks and Skates of Scotland', url: 'https://www.nature.scot/doc/sharks-and-skates-scotland-report-portuguese-dogfish-centroscymnus-coelolepis' },
    source2: { label: 'Priede et al. 2006: The absence of sharks from abyssal regions', url: 'https://eprints.gla.ac.uk/4788' },
  },
  {
    id: 'turtle', kind: 'real', model: 'turtle', spawn: 'drop',
    name: { en: 'Green sea turtle', de: 'Grüne Meeresschildkröte' }, sci: 'Chelonia mydas',
    depth: [3, 60], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'Adult green sea turtles are vegetarians: they graze on seagrass and algae.',
      de: 'Erwachsene Grüne Meeresschildkröten sind Vegetarier: Sie weiden Seegras und Algen ab.',
    },
    more: {
      en: 'The name comes from the greenish colour of their fat, not their shell. Like all sea turtles they are reptiles and must come up to breathe.',
      de: 'Der Name kommt von ihrem grünlichen Fett, nicht vom Panzer. Wie alle Meeresschildkröten sind sie Reptilien und müssen zum Atmen auftauchen.',
    },
    source: { label: 'NOAA Fisheries', url: 'https://www.fisheries.noaa.gov/species/green-turtle' },
  },
  {
    id: 'manta', kind: 'real', model: 'manta', spawn: 'drop',
    name: { en: 'Giant manta ray', de: 'Riesenmanta' }, sci: 'Mobula birostris',
    depth: [10, 200], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'The giant manta is the largest ray: its "wings" can span almost 9 metres. It is harmless and filters tiny plankton from the water.',
      de: 'Der Riesenmanta ist der größte Rochen: Seine „Flügel“ messen bis fast 9 Meter. Er ist harmlos und filtert winziges Plankton aus dem Wasser.',
    },
    more: {
      en: 'Manta rays have the biggest brains of any fish. Their feeding dives link the surface with the deep sea.',
      de: 'Mantas haben das größte Gehirn aller Fische. Mit ihren Tauchgängen zur Nahrungssuche verbinden sie die Oberfläche mit der Tiefsee.',
    },
    source: { label: 'NOAA Fisheries', url: 'https://www.fisheries.noaa.gov/feature-story/new-study-reveals-more-about-where-giant-manta-rays-go-and-why-0' },
  },
  {
    id: 'tuna', kind: 'real', model: 'tuna', spawn: 'drop',
    name: { en: 'Yellowfin tuna', de: 'Gelbflossen-Thun' }, sci: 'Thunnus albacares',
    depth: [5, 200], habitat: 'mid', count: 2, group: 6,
    fact: {
      en: 'Yellowfin tuna are among the fastest swimmers in the ocean – around 70 km/h!',
      de: 'Gelbflossen-Thunfische gehören zu den schnellsten Schwimmern im Meer – rund 70 km/h!',
    },
    more: {
      en: 'Their torpedo-shaped body is built for speed. They are strong hunters with a big appetite.',
      de: 'Ihr torpedoförmiger Körper ist auf Tempo gebaut. Sie sind kräftige Jäger mit großem Appetit.',
    },
    source: { label: 'Smithsonian Ocean', url: 'https://ocean.si.edu/node/110937' },
  },
  {
    id: 'moonjelly', kind: 'real', model: 'moonjelly', spawn: 'drop',
    name: { en: 'Moon jellyfish', de: 'Ohrenqualle' }, sci: 'Aurelia aurita',
    depth: [3, 150], habitat: 'mid', count: 3, group: 5,
    fact: {
      en: 'Moon jellies have no brain, no heart and no eyes – and they are about 95% water.',
      de: 'Ohrenquallen haben kein Gehirn, kein Herz und keine Augen – und bestehen zu etwa 95 % aus Wasser.',
    },
    more: {
      en: 'Their English name comes from the round, see-through bell that looks like a moon. Their sting is very mild.',
      de: 'Ihren englischen Namen „Mondqualle“ verdanken sie dem runden, durchsichtigen Schirm. Ihr Nesseln ist sehr schwach.',
    },
    source: { label: 'Houston Zoo', url: 'https://www.houstonzoo.org/explore/animals/moon-jelly/' },
  },
  {
    id: 'sunfish', kind: 'real', model: 'sunfish', spawn: 'drop',
    name: { en: 'Ocean sunfish', de: 'Mondfisch' }, sci: 'Mola',
    depth: [10, 200], habitat: 'mid', count: 1, group: 1,
    fact: {
      en: 'Sunfish are the heaviest bony fish in the world. They look like a giant swimming head!',
      de: 'Mondfische sind die schwersten Knochenfische der Welt. Sie sehen aus wie ein riesiger schwimmender Kopf!',
    },
    more: {
      en: 'The record holder, a bump-head sunfish found near the Azores (Portugal) in 2021, weighed 2,744 kg – about as much as two cars.',
      de: 'Der Rekordhalter, ein Buckelkopf-Mondfisch, wurde 2021 bei den Azoren (Portugal) gefunden: 2.744 kg – etwa so viel wie zwei Autos.',
    },
    source: { label: 'Guinness World Records', url: 'https://www.guinnessworldrecords.com/world-records/heaviest-bony-fish' },
  },
  {
    id: 'spermwhale', kind: 'real', model: 'spermwhale', spawn: 'drop',
    name: { en: 'Sperm whale', de: 'Pottwal' }, sci: 'Physeter macrocephalus',
    depth: [350, 900], habitat: 'mid', count: 1, group: 1,
    fact: {
      en: 'Sperm whales dive deep to hunt squid. In the dark they find prey with clicks – the loudest animal sounds on Earth.',
      de: 'Pottwale tauchen tief, um Tintenfische zu jagen. Im Dunkeln finden sie die Beute mit Klicks – den lautesten Tierlauten der Erde.',
    },
    more: {
      en: 'Their deep dives last about 45 minutes on average. Rhythmic patterns of clicks, called codas, are used to talk to each other.',
      de: 'Ein tiefer Tauchgang dauert im Schnitt etwa 45 Minuten. Rhythmische Klickmuster, sogenannte Codas, dienen der Verständigung.',
    },
    source: { label: 'NOAA Fisheries', url: 'https://www.fisheries.noaa.gov/science-blog/diving-deep-sperm-whale-clicks' },
  },
  {
    id: 'hatchetfish', kind: 'real', model: 'hatchetfish', spawn: 'drop',
    name: { en: 'Deep-sea hatchetfish', de: 'Tiefsee-Beilfisch' }, sci: 'Sternoptychidae',
    depth: [250, 900], habitat: 'mid', count: 2, group: 6,
    fact: {
      en: 'Hatchetfish make light on their bellies that matches the faint light from above – so hunters below cannot see their shadow.',
      de: 'Beilfische erzeugen am Bauch Licht, das zum schwachen Licht von oben passt – so sehen Jäger von unten ihren Schatten nicht.',
    },
    more: {
      en: 'This trick is called counter-illumination. Their flat, silvery body is shaped like the blade of a hatchet.',
      de: 'Dieser Trick heißt Gegenbeleuchtung. Ihr flacher, silbriger Körper sieht aus wie die Klinge eines Beils.',
    },
    source: { label: 'Penn Today (University of Pennsylvania)', url: 'https://penntoday.upenn.edu/news/penn-physicists-investigate-how-hatchetfish-camouflage-deep-sea' },
  },
  {
    id: 'barreleye', kind: 'real', model: 'barreleye', spawn: 'drop',
    name: { en: 'Barreleye', de: 'Gespensterfisch' }, sci: 'Macropinna microstoma',
    depth: [600, 800], habitat: 'mid', count: 2, group: 1,
    fact: {
      en: 'The barreleye has a see-through head! Its green, tube-shaped eyes sit inside and can rotate.',
      de: 'Der Gespensterfisch hat einen durchsichtigen Kopf! Darin sitzen seine grünen, röhrenförmigen Augen – und sie können sich drehen.',
    },
    more: {
      en: 'The eyes look up to spot the shadows of prey, then turn forward when it eats. The two "eyes" on its face are really its nostrils.',
      de: 'Die Augen schauen nach oben, um Beute-Schatten zu entdecken, und drehen sich beim Fressen nach vorne. Die zwei „Augen“ vorne im Gesicht sind in Wahrheit Riechorgane.',
    },
    source: { label: 'MBARI', url: 'https://www.mbari.org/?p=86197' },
  },
  {
    id: 'bristlemouth', kind: 'real', model: 'bristlemouth', spawn: 'drop',
    name: { en: 'Bristlemouth', de: 'Borstenmaul' }, sci: 'Cyclothone',
    depth: [400, 1200], habitat: 'mid', count: 3, group: 10,
    fact: {
      en: 'This tiny fish is probably the most common animal with a backbone on Earth – there may be quadrillions of them!',
      de: 'Dieser winzige Fisch ist wahrscheinlich das häufigste Wirbeltier der Erde – es gibt vermutlich Billiarden davon!',
    },
    more: {
      en: 'Most are only 2–3 cm long. Glowing dots on the belly confuse hunters that attack from below.',
      de: 'Die meisten sind nur 2–3 cm lang. Leuchtpunkte am Bauch verwirren Jäger, die von unten angreifen.',
    },
    source: { label: 'Woods Hole Oceanographic Institution', url: 'https://twilightzone.whoi.edu/explore-the-otz/creature-features/bristlemouth' },
  },
  {
    id: 'seacucumber', kind: 'real', model: 'seacucumber',
    name: { en: 'Deep-sea sea cucumber', de: 'Tiefsee-Seegurke' }, sci: 'Holothuroidea (Elpidiidae)',
    depth: [4000, 10500], habitat: 'floor', count: 6, group: 3,
    fact: {
      en: 'Sea cucumbers are the most common large animals on the deep seafloor. Researchers even call the trenches the "kingdom of the holothurians".',
      de: 'Seegurken sind die häufigsten großen Tiere am Tiefseeboden. Forschende nennen die Gräben sogar das „Königreich der Holothurien“.',
    },
    more: {
      en: 'They swallow mud and digest the tiny bits of food in it. Different species prefer different food, so they hardly compete.',
      de: 'Sie schlucken Schlamm und verdauen die winzigen Nahrungsreste darin. Verschiedene Arten bevorzugen verschiedenes Futter – so kommen sie sich kaum in die Quere.',
    },
    source: { label: 'Jamieson et al. 2011, Marine Biology', url: 'https://eprints.soton.ac.uk/210855/1/jamieson_etal2011.pdf' },
  },
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
    id: 'sediment', kind: 'object', model: 'sediment', collect: true,
    name: { en: 'Sediment sample', de: 'Sedimentprobe' }, sci: 'Sediment core',
    depth: [0, 11000], habitat: 'floor', count: 0, group: 1,
    fact: {
      en: 'Researchers take cores of seafloor mud. X-ray images of cores from 7.5 km deep in the Japan Trench show burrows that sea cucumbers and other animals dug into the sediment.',
      de: 'Forschende stechen Kerne aus dem Schlamm des Meeresbodens. Röntgenbilder von Kernen aus 7,5 km Tiefe im Japangraben zeigen Gänge, die Seegurken und andere Tiere in das Sediment gegraben haben.',
    },
    more: {
      en: 'Fresh sediment keeps sliding down into the trench from its walls. Sea cucumbers are probably among the first animals to settle on it.',
      de: 'Von den Grabenwänden rutscht immer wieder frisches Sediment nach unten. Seegurken gehören vermutlich zu den ersten Tieren, die sich darauf ansiedeln.',
    },
    source: { label: 'Scimex / Nature Communications', url: 'https://www.scimex.org/newsfeed/deep-sea-creatures-are-architects-of-the-ocean-floor' },
  },
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
