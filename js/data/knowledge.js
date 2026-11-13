// Dr. Echo's onboard knowledge base.
// Each answer is written so that the first sentence works for young children;
// older players get the full answer.
// kw: lower-case keyword fragments (matched as substrings).

export const KNOWLEDGE = [
  { id: 'pressure', dynamic: 'pressure',
    kw: { en: ['pressure', 'crush', 'squash', 'bar', 'heavy'], de: ['druck', 'zerquetsch', 'zerdrück', 'bar', 'schwer'] } },
  { id: 'depth', dynamic: 'depth',
    kw: { en: ['how deep are we', 'our depth', 'where are we', 'how deep is it here'], de: ['wie tief sind wir', 'unsere tiefe', 'wo sind wir', 'wie tief ist es hier'] } },
  { id: 'temp', dynamic: 'temp',
    kw: { en: ['cold', 'temperature', 'warm', 'freez'], de: ['kalt', 'temperatur', 'warm', 'gefrier', 'grad'] } },
  { id: 'dark',
    kw: { en: ['dark', 'light', 'sun', 'black', 'see'], de: ['dunkel', 'licht', 'sonne', 'schwarz', 'sehen'] },
    a: {
      en: 'Sunlight cannot reach this deep. Below about 200 m the light is only a faint twilight, and below about 1,000 m it is completely dark. The only light down here comes from animals that glow – and from our lamps.',
      de: 'Sonnenlicht kommt nicht so tief hinunter. Unter etwa 200 m gibt es nur noch schwaches Dämmerlicht, unter etwa 1.000 m ist es völlig dunkel. Das einzige Licht hier unten stammt von leuchtenden Tieren – und von unseren Scheinwerfern.',
    } },
  { id: 'trench',
    kw: { en: ['trench', 'form', 'plate', 'tectonic', 'made', 'created'], de: ['graben', 'entsteh', 'platte', 'tekton', 'gemacht'] },
    a: {
      en: 'Trenches form where one piece of the Earth’s crust slides beneath another. The sinking plate pulls the seafloor down into a long, narrow valley. Trenches between about 6,000 and 11,000 m deep make up the hadal zone.',
      de: 'Tiefseegräben entstehen, wo ein Stück Erdkruste unter ein anderes abtaucht. Die absinkende Platte zieht den Meeresboden zu einem langen, schmalen Tal hinunter. Gräben zwischen etwa 6.000 und 11.000 m Tiefe bilden die Hadalzone.',
    } },
  { id: 'hadal',
    kw: { en: ['hadal', 'hades', 'name of the game', 'zone'], de: ['hadal', 'hades', 'name des spiels', 'zone'] },
    a: {
      en: 'Hadal comes from Hades, the Greek god of the underworld. It is the deepest part of the ocean, from about 6,000 to 11,000 m. Above it lie the sunlight zone (0–200 m), twilight zone (200–1,000 m), midnight zone (1,000–4,000 m) and the abyss (4,000–6,000 m).',
      de: 'Hadal kommt von Hades, dem griechischen Gott der Unterwelt. Es ist der tiefste Teil des Meeres, von etwa 6.000 bis 11.000 m. Darüber liegen Sonnenlichtzone (0–200 m), Dämmerungszone (200–1.000 m), Mitternachtszone (1.000–4.000 m) und das Abyssal (4.000–6.000 m).',
    } },
  { id: 'deepest',
    kw: { en: ['deepest', 'challenger', 'mariana', 'bottom of the ocean'], de: ['tiefst', 'challenger', 'marianen', 'grund des meeres'] },
    a: {
      en: 'The deepest known place is the Challenger Deep in the Mariana Trench, about 10,900 m deep. Mount Everest would fit inside with about 2 km of water above its peak.',
      de: 'Der tiefste bekannte Ort ist das Challenger-Tief im Marianengraben, rund 10.900 m tief. Der Mount Everest hätte darin Platz – mit etwa 2 km Wasser über dem Gipfel.',
    } },
  { id: 'people',
    kw: { en: ['people', 'human', 'who has been', 'been there', 'visited', 'piccard', 'cameron', 'walsh', 'first'], de: ['menschen', 'mensch', 'wer war', 'dort gewesen', 'besucht', 'piccard', 'cameron', 'walsh', 'erste'] },
    a: {
      en: 'Only a few people have ever been to the deepest point – 27 by the year 2022. The first were Don Walsh and Jacques Piccard in the Trieste on 23 January 1960. James Cameron made the first solo dive in 2012.',
      de: 'Nur sehr wenige Menschen waren je am tiefsten Punkt – bis 2022 waren es 27. Die ersten waren Don Walsh und Jacques Piccard mit der Trieste am 23. Jänner 1960. James Cameron tauchte 2012 als Erster allein hinunter.',
    } },
  { id: 'explored',
    kw: { en: ['explored', 'unknown', 'how much', 'percent', 'mapped', 'discover'], de: ['erforscht', 'unbekannt', 'wie viel', 'prozent', 'kartiert', 'entdeck'] },
    a: {
      en: 'Hardly any of the deep sea has been seen. A 2025 study found that humans have looked at only about 0.001% of the deep seafloor with cameras. About 29% of the seafloor has been mapped with modern sonar (2026) – so every dive can find something new.',
      de: 'Von der Tiefsee hat man kaum etwas gesehen. Eine Studie von 2025 ergab, dass Menschen nur etwa 0,001 % des tiefen Meeresbodens mit Kameras angeschaut haben. Rund 29 % des Meeresbodens sind mit modernem Sonar kartiert (2026) – jeder Tauchgang kann also Neues entdecken.',
    } },
  { id: 'sonar',
    kw: { en: ['sonar', 'ping', 'echo', 'sound', 'map'], de: ['sonar', 'ping', 'echo', 'schall', 'karte'] },
    a: {
      en: 'Sonar sends out a sound and listens for the echo. From the time the echo takes to come back, we can work out how far away the seafloor is. That is how scientists map the ocean floor – and why our pings draw contour lines.',
      de: 'Sonar sendet einen Ton aus und horcht auf das Echo. Aus der Zeit, bis das Echo zurückkommt, berechnen wir, wie weit der Meeresboden entfernt ist. So kartieren Forschende den Meeresboden – und deshalb zeichnen unsere Pings Höhenlinien.',
    } },
  { id: 'glow',
    kw: { en: ['glow', 'shine', 'biolumin', 'light up', 'lights on their'], de: ['leucht', 'biolumin', 'glüh', 'schein'] },
    a: {
      en: 'Many deep-sea animals make their own light, like a glow stick. This is called bioluminescence. They use it to find food, to find partners or to confuse animals that want to eat them.',
      de: 'Viele Tiefseetiere erzeugen ihr eigenes Licht, wie ein Leuchtstab. Das nennt man Biolumineszenz. Sie nutzen es, um Futter oder Partner zu finden oder um Fressfeinde zu verwirren.',
    } },
  { id: 'food',
    kw: { en: ['eat', 'food', 'marine snow', 'snow', 'hungry', 'feed'], de: ['fress', 'essen', 'nahrung', 'futter', 'meeresschnee', 'schnee', 'hunger'] },
    a: {
      en: 'Most food falls from above like snow. This "marine snow" is made of tiny bits of dead plankton, poop and slime. Some animals, like the vampire squid, live entirely on it – others are scavengers or eat each other.',
      de: 'Das meiste Futter rieselt wie Schnee von oben herab. Dieser „Meeresschnee“ besteht aus winzigen Resten von Plankton, Kot und Schleim. Manche Tiere wie der Vampirtintenfisch leben nur davon – andere sind Aasfresser oder fressen einander.',
    } },
  { id: 'chemo',
    kw: { en: ['methane', 'seep', 'chemosynth', 'without sun', 'energy'], de: ['methan', 'quelle', 'chemosynth', 'ohne sonne', 'energie'] },
    a: {
      en: 'At methane seeps, life runs on chemicals instead of sunlight. Microbes use methane and other chemicals to make food – that is chemosynthesis. Tube worms and clams live off these microbes; in 2024 such communities were found down to 9,533 m.',
      de: 'An Methanquellen läuft das Leben mit Chemie statt mit Sonnenlicht. Mikroben machen aus Methan und anderen Stoffen Nahrung – das ist Chemosynthese. Röhrenwürmer und Muscheln leben von diesen Mikroben; 2024 wurden solche Gemeinschaften bis in 9.533 m Tiefe gefunden.',
    } },
  { id: 'survive',
    kw: { en: ['survive', 'not crushed', 'how do they live', 'how can', 'adapt'], de: ['überleb', 'nicht zerdrückt', 'wie leben', 'wie können', 'anpass'] },
    a: {
      en: 'Deep-sea animals have no air spaces in their bodies, so the pressure cannot squash them. Many have soft, jelly-like bodies. Molecules such as TMAO help their proteins keep working under huge pressure.',
      de: 'Tiefseetiere haben keine Lufträume im Körper, deshalb kann der Druck sie nicht zerquetschen. Viele haben weiche, gallertartige Körper. Moleküle wie TMAO helfen ihren Eiweißen, auch unter riesigem Druck zu funktionieren.',
    } },
  { id: 'sub',
    kw: { en: ['submarine', 'submersible', 'sub ', 'ballast', 'how do we dive', 'float', 'hull'], de: ['u-boot', 'tauchboot', 'ballast', 'wie tauchen', 'schwimm', 'rumpf'] },
    a: {
      en: 'Our submersible sinks thanks to heavy weights and comes back up by dropping them. The crew sits inside a thick pressure sphere. Special buoyant foam helps the whole vehicle float back to the surface.',
      de: 'Unser Tauchboot sinkt dank schwerer Gewichte und steigt wieder auf, wenn es sie abwirft. Die Crew sitzt in einer dicken Druckkugel. Spezieller Auftriebsschaum lässt das ganze Boot wieder an die Oberfläche steigen.',
    } },
  { id: 'everest',
    kw: { en: ['everest', 'mountain'], de: ['everest', 'berg'] },
    a: {
      en: 'Mount Everest is 8,849 m high. If you put it into the Challenger Deep, its peak would still be about 2 km under water.',
      de: 'Der Mount Everest ist 8.849 m hoch. Würde man ihn ins Challenger-Tief stellen, läge sein Gipfel immer noch etwa 2 km unter Wasser.',
    } },
  { id: 'plastic',
    kw: { en: ['plastic', 'waste', 'litter', 'trash', 'pollut', 'rubbish'], de: ['plastik', 'müll', 'abfall', 'verschmutz'] },
    a: {
      en: 'Sadly, plastic has reached even the deepest place on Earth. Victor Vescovo saw plastic waste at the bottom of the Challenger Deep in 2019. In this game you can collect litter – in the real ocean the best help is to keep plastic out of it.',
      de: 'Leider ist Plastik sogar bis zur tiefsten Stelle der Erde gelangt. Victor Vescovo sah 2019 Plastikmüll am Grund des Challenger-Tiefs. Im Spiel kannst du Müll einsammeln – im echten Meer hilft es am meisten, Plastik gar nicht erst hineinkommen zu lassen.',
    } },
  { id: 'fantasy',
    kw: { en: ['fantasy', 'real', 'fake', 'made up', 'invented', 'true', 'exist'], de: ['fantasie', 'echt', 'erfunden', 'wirklich', 'ausgedacht', 'gibt es', 'existier'] },
    a: {
      en: 'Animals with the rainbow FANTASY badge are invented for fun – they do not exist. Everything with the blue REAL badge is a real animal or find, and its facts come from scientific sources. Each fantasy card also hides one real fact.',
      de: 'Tiere mit dem bunten FANTASIE-Abzeichen sind zum Spaß erfunden – es gibt sie nicht. Alles mit dem blauen ECHT-Abzeichen ist ein echtes Tier oder ein echter Fund, und die Fakten stammen aus wissenschaftlichen Quellen. Jede Fantasie-Karte verrät außerdem einen echten Fakt.',
    } },
  { id: 'echo',
    kw: { en: ['who are you', 'your name', 'are you a robot', 'are you an ai', 'dr. echo', 'dr echo'], de: ['wer bist du', 'dein name', 'bist du ein roboter', 'bist du eine ki', 'dr. echo', 'dr echo'] },
    a: {
      en: 'I am Dr. Echo, the AI scientist on board. I watch the sensors, explain what we find and ask you a few questions after each dive. Ask me anything about the deep sea!',
      de: 'Ich bin Dr. Echo, die KI-Wissenschaftlerin an Bord. Ich beobachte die Sensoren, erkläre unsere Funde und stelle dir nach jedem Tauchgang ein paar Fragen. Frag mich alles über die Tiefsee!',
    } },
  { id: 'quake',
    kw: { en: ['earthquake', 'quake', 'shake', 'tsunami'], de: ['erdbeben', 'beben', 'wackel', 'tsunami'] },
    a: {
      en: 'Trenches lie where tectonic plates push against each other, so earthquakes are common there. The Tonga Trench is especially active. Quakes can also set off underwater landslides.',
      de: 'Gräben liegen dort, wo Erdplatten gegeneinander drücken, deshalb bebt die Erde dort oft. Der Tonga-Graben ist besonders aktiv. Beben können auch Unterwasser-Lawinen auslösen.',
    } },
  { id: 'nodule',
    kw: { en: ['nodule', 'metal', 'mining', 'manganese', 'battery'], de: ['knolle', 'metall', 'bergbau', 'abbau', 'mangan', 'batterie'] },
    a: {
      en: 'Manganese nodules are lumps of rock full of metals. They grow extremely slowly – often just millimetres per million years. Companies want to mine them for batteries, but many animals live on them, so scientists are worried about the damage.',
      de: 'Manganknollen sind Gesteinsklumpen voller Metalle. Sie wachsen extrem langsam – oft nur Millimeter pro Million Jahre. Firmen wollen sie für Batterien abbauen, doch viele Tiere leben darauf, deshalb sorgen sich Forschende um die Schäden.',
    } },
  { id: 'whale',
    kw: { en: ['whale', 'carcass', 'skeleton'], de: ['wal', 'kadaver', 'skelett'] },
    a: {
      en: 'When a whale dies and sinks, it becomes a giant meal for deep-sea animals. The skeleton can feed whole communities for years or even decades.',
      de: 'Wenn ein Wal stirbt und sinkt, wird er zum Riesenfestmahl für Tiefseetiere. Das Skelett kann ganze Lebensgemeinschaften über Jahre oder sogar Jahrzehnte ernähren.',
    } },
  { id: 'danger',
    kw: { en: ['danger', 'scary', 'monster', 'afraid', 'bite', 'shark'], de: ['gefähr', 'gruselig', 'monster', 'angst', 'beißen', 'hai'] },
    a: {
      en: 'Most deep-sea animals are small and harmless to us. They look strange because they are adapted to darkness, cold and pressure – not because they are monsters.',
      de: 'Die meisten Tiefseetiere sind klein und für uns harmlos. Sie sehen seltsam aus, weil sie an Dunkelheit, Kälte und Druck angepasst sind – nicht, weil sie Monster wären.',
    } },
  { id: 'controls',
    kw: { en: ['how to play', 'controls', 'steer', 'help', 'what do i do', 'mission'], de: ['wie spielt', 'steuer', 'hilfe', 'was soll ich', 'was muss ich', 'mission'] },
    a: {
      en: 'Steer with W A S D or the joystick, go up with Space and down with Shift. F sends a sonar ping, L switches the lights and C takes a photo when an animal is in the frame. Your missions are listed on the left – and press B to surface when you are done.',
      de: 'Lenke mit W A S D oder dem Joystick, mit der Leertaste geht es nach oben, mit Shift nach unten. F sendet einen Sonar-Ping, L schaltet das Licht, C macht ein Foto, wenn ein Tier im Rahmen ist. Deine Missionen stehen links – und mit B tauchst du auf, wenn du fertig bist.',
    } },
];

// Dynamic answer templates (filled with live sensor values).
export const DYNAMIC = {
  pressure: {
    en: 'Right now we are at {depth} m, so the water presses with about {bar} bar – roughly {times} times the air pressure at the surface. That is about {kg} kg on every square centimetre! Every 10 m of water adds about 1 bar.',
    de: 'Wir sind gerade auf {depth} m, das Wasser drückt also mit etwa {bar} bar – rund {times}-mal so stark wie die Luft an der Oberfläche. Das sind etwa {kg} kg auf jedem Quadratzentimeter! Alle 10 m Wasser kommt etwa 1 bar dazu.',
  },
  depth: {
    en: 'We are {depth} m below the surface, in the {zone}. The deepest point of this trench is about {max} m.',
    de: 'Wir sind {depth} m unter der Oberfläche, in der {zone}. Der tiefste Punkt dieses Grabens liegt bei etwa {max} m.',
  },
  temp: {
    en: 'The water around us is about {temp} °C. Deep water is cold everywhere – in the trenches it is only about 1 to 4 °C, close to freezing.',
    de: 'Das Wasser um uns hat etwa {temp} °C. Tiefes Wasser ist überall kalt – in den Gräben nur etwa 1 bis 4 °C, knapp über dem Gefrierpunkt.',
  },
};

export const FALLBACK = {
  en: 'Hmm, that is not in my onboard database yet. Try asking about the pressure, the darkness, trenches, sonar or one of the animals we have found!',
  de: 'Hm, das steht noch nicht in meiner Bord-Datenbank. Frag mich nach dem Druck, der Dunkelheit, den Gräben, dem Sonar oder einem Tier, das wir gefunden haben!',
};
