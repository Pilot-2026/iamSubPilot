// Mission generation and progress tracking for expedition dives.

import { CREATURES } from './data/creatures.js';
import { t, L, fmtNum } from './i18n.js';

export function makeMissions(level, cm, rng) {
  const list = [];
  const used = new Set();
  const add = (m) => {
    if (used.has(m.type + (m.arg || ''))) return;
    used.add(m.type + (m.arg || ''));
    list.push({ ...m, done: false, progress: 0 });
  };
  // a quick first success right after diving in
  add({ type: 'first' });
  // level-specific mission
  const [type, arg] = level.special.split(':');
  if (type === 'm_photo') add({ type: 'photo', arg });
  else if (type === 'm_deepest') add({ type: 'deepest' });
  else if (type === 'm_nodule') add({ type: 'nodule', n: Number(arg) || 3 });
  else if (type === 'm_seep') add({ type: 'seep' });
  else if (type === 'm_trieste') add({ type: 'trieste' });

  const pool = [];
  pool.push({ type: 'fantasy' });
  pool.push({ type: 'photoAny', n: 5 });
  pool.push({ type: 'map', p: 6 });
  pool.push({ type: 'depth', d: Math.floor((level.maxDepth * 0.82) / 500) * 500 });
  if (cm.lander) pool.push({ type: 'lander' });
  if (cm.whale) pool.push({ type: 'whale' });
  if (cm.items.filter((i) => i.def.id === 'litter').length >= 2) pool.push({ type: 'litter', n: 2 });
  if (cm.items.filter((i) => i.def.id === 'nodule').length >= 3) pool.push({ type: 'nodule', n: 3 });
  pool.push({ type: 'deepest' });
  // random order
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const m of pool) {
    if (list.length >= 4) break;
    add(m);
  }
  return list;
}

export function missionText(m) {
  switch (m.type) {
    case 'photo': {
      const c = CREATURES.find((x) => x.id === m.arg);
      return t('m_photo', { name: c ? L(c.name) : m.arg });
    }
    case 'first':
      return t('m_first');
    case 'photoAny':
      return t('m_photoAny', { n: m.n }) + ` (${Math.min(m.progress, m.n)}/${m.n})`;
    case 'fantasy':
      return t('m_fantasy');
    case 'deepest':
      return t('m_deepest');
    case 'depth':
      return t('m_depth', { d: fmtNum(m.d) });
    case 'map':
      return t('m_map', { p: m.p }) + ` (${Math.floor(m.progress)}%)`;
    case 'nodule':
      return t('m_nodule', { n: m.n }) + ` (${Math.min(m.progress, m.n)}/${m.n})`;
    case 'litter':
      return t('m_litter', { n: m.n }) + ` (${Math.min(m.progress, m.n)}/${m.n})`;
    case 'lander':
      return t('m_lander');
    case 'seep':
      return t('m_seep');
    case 'trieste':
      return t('m_trieste');
    case 'whale':
      return t('m_whale');
    default:
      return m.type;
  }
}

// state: { photographed:Set(ids), realCount, fantasyCount, maxDepth, mapped, nodules, litter, lander, atDeepest }
export function updateMissions(missions, s) {
  const newlyDone = [];
  for (const m of missions) {
    if (m.done) continue;
    let done = false;
    switch (m.type) {
      case 'photo':
        done = s.photographed.has(m.arg);
        break;
      case 'first':
        done = s.realCount >= 1;
        break;
      case 'photoAny':
        m.progress = s.realCount;
        done = s.realCount >= m.n;
        break;
      case 'fantasy':
        done = s.fantasyCount > 0;
        break;
      case 'deepest':
        done = s.atDeepest;
        break;
      case 'depth':
        done = s.maxDepth >= m.d;
        break;
      case 'map':
        m.progress = s.mapped;
        done = s.mapped >= m.p;
        break;
      case 'nodule':
        m.progress = s.nodules;
        done = s.nodules >= m.n;
        break;
      case 'litter':
        m.progress = s.litter;
        done = s.litter >= m.n;
        break;
      case 'lander':
        done = s.lander;
        break;
      case 'seep':
        done = s.photographed.has('seep') || s.photographed.has('tubeworm') || s.photographed.has('clam');
        break;
      case 'trieste':
        done = s.photographed.has('trieste');
        break;
      case 'whale':
        done = s.photographed.has('whale');
        break;
    }
    if (done) {
      m.done = true;
      newlyDone.push(m);
    }
  }
  return newlyDone;
}
