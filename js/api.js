// Address of the game's own Netlify functions (online rooms, cloud profiles, returning visitors).
// On the Netlify site itself they are same-origin; on GitHub Pages the game calls the Netlify site.
// The site was renamed from iamsubpilot to iamisi: both names are tried (the one that answered last first),
// so the game keeps working before, during and after the rename. ?mpapi=… overrides it for tests.
import { MP_SITES } from './config.js';

const q = new URLSearchParams(location.search).get('mpapi');
const BASES = q
  ? [q.replace(/\/$/, '')]
  : /\.netlify\.app$/.test(location.hostname)
    ? [location.origin + '/api']
    : MP_SITES.map((s) => s.replace(/\/$/, '') + '/api');
let good = 0;
try {
  const i = +localStorage.getItem('hadal.api');
  if (i > 0 && i < BASES.length) good = i;
} catch (e) { /* no storage */ }

export const hasApi = BASES.length > 0;

// fetch with a timeout per attempt; a failing address (offline site, wrong name) falls over to the next one
export async function apiFetch(path, opts = {}, ms = 7000) {
  if (!hasApi) throw new Error('no-api');
  let err;
  for (let k = 0; k < BASES.length; k++) {
    const i = (good + k) % BASES.length;
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(BASES[i] + path, { ...opts, signal: ctl.signal });
      if (i !== good) {
        good = i;
        try { localStorage.setItem('hadal.api', String(i)); } catch (e) { /* no storage */ }
      }
      return r;
    } catch (e) {
      err = e;
    } finally {
      clearTimeout(tm);
    }
  }
  throw err;
}
