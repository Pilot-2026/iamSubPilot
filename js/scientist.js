// Dr. Echo – the onboard AI scientist.
// Answers questions from the local knowledge base (or an optional AI endpoint)
// and comments on what happens during the dive.

import { KNOWLEDGE, DYNAMIC, FALLBACK } from './data/knowledge.js';
import { CREATURES } from './data/creatures.js';
import { AI_ENDPOINT } from './config.js';
import { getLang, L, t, fmtNum, fmtDec } from './i18n.js';

const LINES = {
  diveStart: {
    en: 'All systems green. Let’s see what’s down there! When it gets dark, press F for a sonar ping.',
    de: 'Alle Systeme grün. Mal sehen, was da unten ist! Wenn es dunkel wird, drück F für einen Sonar-Ping.',
  },
  diveStartTouch: {
    en: 'All systems green. Let’s see what’s down there! Hold ▼ to dive – and when it gets dark, tap Sonar.',
    de: 'Alle Systeme grün. Mal sehen, was da unten ist! Halte ▼ zum Abtauchen – und wenn es dunkel wird, tipp auf Sonar.',
  },
  raceStart: {
    en: 'Race mode! Follow the glowing rings down to the deepest point – as fast as you can.',
    de: 'Rennmodus! Folge den leuchtenden Ringen bis zum tiefsten Punkt – so schnell du kannst.',
  },
  zone_twilight: {
    en: '200 m – the twilight zone. The sunlight is fading fast.',
    de: '200 m – die Dämmerungszone. Das Sonnenlicht verschwindet schnell.',
  },
  zone_midnight: {
    en: '1,000 m – the midnight zone. From here on it is completely dark, except for animals that glow.',
    de: '1.000 m – die Mitternachtszone. Ab hier ist es stockdunkel, außer dort, wo Tiere leuchten.',
  },
  zone_abyss: {
    en: '4,000 m – welcome to the abyss. Cold, dark and about 400 times the pressure at the surface.',
    de: '4.000 m – willkommen im Abyssal. Kalt, dunkel und etwa 400-mal so viel Druck wie an der Oberfläche.',
  },
  zone_hadal: {
    en: '6,000 m! We are entering the hadal zone – the realm of the trenches.',
    de: '6.000 m! Wir tauchen in die Hadalzone ein – das Reich der Tiefseegräben.',
  },
  everest: {
    en: '8,849 m: we are now deeper than Mount Everest is tall!',
    de: '8.849 m: Wir sind jetzt tiefer, als der Mount Everest hoch ist!',
  },
  deep10k: {
    en: '10,000 m! Only a handful of people have ever been this deep.',
    de: '10.000 m! Nur eine Handvoll Menschen war je so tief.',
  },
  lowEnergy: {
    en: 'Battery below 20%. Better start heading back soon – press B to surface.',
    de: 'Batterie unter 20 %. Wir sollten bald zurück – mit B tauchst du auf.',
  },
  lowLife: {
    en: 'Oxygen at 20%. Time to think about surfacing – press B.',
    de: 'Sauerstoff bei 20 %. Zeit, ans Auftauchen zu denken – drück B.',
  },
  hullStress: {
    en: 'The hull is creaking – we are deeper than its rating! Go up or upgrade the hull in the hangar.',
    de: 'Der Rumpf knarrt – wir sind tiefer als seine Freigabe! Steig auf oder rüste den Rumpf im Hangar auf.',
  },
  collision: {
    en: 'Ouch! Careful with the hull.',
    de: 'Autsch! Vorsicht mit dem Rumpf.',
  },
  fantasyNear: {
    en: 'Wait… what is THAT? Those colours are not in any textbook. Quick, take a photo!',
    de: 'Moment… was ist DAS? Diese Farben stehen in keinem Lehrbuch. Schnell, mach ein Foto!',
  },
  deepest: {
    en: 'We made it: this is the deepest point of the trench!',
    de: 'Geschafft: Das ist der tiefste Punkt des Grabens!',
  },
  quake: {
    en: 'Earthquake! The plates are moving – hold on, it will pass.',
    de: 'Erdbeben! Die Platten bewegen sich – festhalten, das geht vorbei.',
  },
  surfacing: {
    en: 'Ballast released, we are going up. Great dive!',
    de: 'Ballast abgeworfen, es geht nach oben. Toller Tauchgang!',
  },
  lightOff: {
    en: 'Lights off. Look closely – some animals glow on their own.',
    de: 'Licht aus. Schau genau – manche Tiere leuchten von selbst.',
  },
};

export function line(key) {
  return L(LINES[key]);
}

// Shorten an answer for the player's age tier.
function forTier(text, tier) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const n = tier === 'kid' ? 1 : tier === 'junior' ? 2 : sentences.length;
  return sentences.slice(0, n).join('').trim();
}

function norm(s) {
  return ` ${s.toLowerCase().replace(/[?!.,;:"„“()]/g, ' ').replace(/\s+/g, ' ')} `;
}

export function zoneKey(depth) {
  if (depth < 200) return 'zone_sun';
  if (depth < 1000) return 'zone_twilight';
  if (depth < 4000) return 'zone_midnight';
  if (depth < 6000) return 'zone_abyss';
  return 'zone_hadal';
}

function dynamicAnswer(kind, ctx) {
  const lang = getLang();
  const tpl = DYNAMIC[kind][lang] || DYNAMIC[kind].en;
  const bar = ctx.depth / 10 + 1;
  const vars = {
    depth: fmtNum(ctx.depth),
    bar: fmtNum(bar),
    times: fmtNum(bar),
    kg: fmtDec(bar * 1.02, bar < 100 ? 1 : 0),
    temp: fmtDec(ctx.temp, 1),
    zone: t(zoneKey(ctx.depth)),
    max: fmtNum(ctx.maxDepth),
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Local answer from the knowledge base.
export function localAnswer(question, ctx) {
  const lang = getLang();
  const q = norm(question);

  // Creature names first
  const STOP = new Set(['deep', 'deep-sea', 'tiefsee', 'hadal', 'abyssal', 'seep', 'seeps', 'methane', 'methan',
    'methanquellen', 'research', 'forschungs', 'lost', 'verlorener', 'landing', 'site', 'landeplatz', 'giant',
    'riesen', 'plastic', 'plastik', 'litter', 'whale', 'fall']);
  for (const c of CREATURES) {
    const names = [c.name.en, c.name.de, c.sci || ''].filter(Boolean).map((n) => n.toLowerCase());
    const hit = names.some((n) => {
      const short = n.split(/[\s-]/).filter((w) => w.length > 3 && !STOP.has(w));
      return q.includes(n) || short.some((w) => q.includes(` ${w}`));
    });
    if (hit) {
      if (c.kind === 'fantasy') {
        const txt = `${L(c.fact)} ${t('fantasyNote')} ${t('realTwist')}: ${L(c.twist)}`;
        return ctx.tier === 'kid' ? `${L(c.fact)} ${t('fantasyNote')}` : txt;
      }
      return forTier(`${L(c.fact)} ${L(c.more)}`, ctx.tier === 'kid' ? 'kid' : 'adult');
    }
  }

  let best = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    const kws = entry.kw[lang] || entry.kw.en;
    let score = 0;
    for (const k of kws) if (q.includes(k)) score += k.length > 6 ? 2 : 1;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (!best) return L(FALLBACK);
  if (best.dynamic) return dynamicAnswer(best.dynamic, ctx);
  return forTier(L(best.a), ctx.tier);
}

// Ask: uses the AI endpoint if configured, otherwise (or on failure) the local base.
export async function ask(question, ctx) {
  if (AI_ENDPOINT) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          lang: getLang(),
          ageTier: ctx.tier,
          context: {
            trench: ctx.levelName,
            depth: Math.round(ctx.depth),
            temperature: Math.round(ctx.temp * 10) / 10,
            discoveries: ctx.discoveries,
          },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.answer === 'string' && data.answer.trim()) return data.answer.trim();
      }
    } catch (e) {
      // fall through to the local knowledge base
    }
  }
  return localAnswer(question, ctx);
}
