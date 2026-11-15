// Statistics pages (opened with 5 × "9", or 5 taps on the version number).
// Charts are plain SVG/HTML: one hue per single series, hover/tap tooltips, a table for the last visits.

import { t, getLang } from './i18n.js';
import { loadStats, myVisitorId } from './stats.js';

const C1 = '#2639c9'; // main series
const C2 = '#c2410c'; // second series (returning visitors)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => Number(n || 0).toLocaleString(getLang() === 'de' ? 'de-AT' : 'en-GB');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + ' %';
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);

function flag(cc) {
  if (!cc || cc.length !== 2 || cc === 'XX') return '🏳';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
let regionNames = null, langNames = null;
function countryName(cc) {
  if (!cc || cc === 'XX') return getLang() === 'de' ? 'Unbekannt' : 'Unknown';
  try {
    regionNames = regionNames && regionNames.lang === getLang() ? regionNames : Object.assign(new Intl.DisplayNames([getLang()], { type: 'region' }), { lang: getLang() });
    return regionNames.of(cc.toUpperCase()) || cc;
  } catch (e) {
    return cc;
  }
}
function langName(code) {
  try {
    langNames = langNames && langNames.lang === getLang() ? langNames : Object.assign(new Intl.DisplayNames([getLang()], { type: 'language' }), { lang: getLang() });
    return langNames.of(code) || code;
  } catch (e) {
    return code;
  }
}

// nice upper bound for an axis
function niceMax(v) {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// vertical bars (one series); labels: array of x labels, showEvery: label every n-th
function columns(values, labels, { tip, showEvery = 1, h = 170 } = {}) {
  const n = values.length;
  const max = niceMax(Math.max(0, ...values));
  const W = 640, H = h, padL = 34, padB = 24, padT = 8;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const bw = plotW / n;
  const gap = Math.min(4, bw * 0.25);
  let g = '';
  for (const f of (max / 2) % 1 === 0 ? [0, 0.5, 1] : [0, 1]) {
    const y = padT + plotH - f * plotH;
    g += `<line x1="${padL}" x2="${W - 6}" y1="${y}" y2="${y}" stroke="rgba(0,0,0,${f ? 0.14 : 0.45})" stroke-width="1"/>`;
    g += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="ax">${fmt(max * f)}</text>`;
  }
  values.forEach((v, i) => {
    const x = padL + i * bw + gap / 2;
    const bh = max ? (v / max) * plotH : 0;
    const y = padT + plotH - bh;
    const r = Math.min(4, (bw - gap) / 2, bh);
    if (bh > 0) g += `<path d="M${x},${padT + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - gap - r} Q${x + bw - gap},${y} ${x + bw - gap},${y + r} V${padT + plotH} Z" fill="${C1}"/>`;
    g += `<rect x="${padL + i * bw}" y="${padT}" width="${bw}" height="${plotH}" fill="transparent" class="hit" data-tip="${esc(tip ? tip(i, v) : `${labels[i]}: ${fmt(v)}`)}"/>`;
    if (i % showEvery === 0) g += `<text x="${padL + i * bw + bw / 2}" y="${H - 7}" text-anchor="middle" class="ax">${esc(labels[i])}</text>`;
  });
  return `<svg class="st-chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
}

// horizontal bars: rows [{label, value, icon}]
function hbars(rows, total, { limit = 20 } = {}) {
  if (!rows.length) return `<p class="st-empty">${t('statsNoData')}</p>`;
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  return `<div class="st-hbars">${rows.slice(0, limit).map((r) => `<div class="st-row" data-tip="${esc(`${r.label}: ${fmt(r.value)} (${pct(r.value, total)})`)}">
      <span class="st-lab">${r.icon ? `<span class="st-ic">${r.icon}</span>` : ''}${esc(r.label)}</span>
      <span class="st-track"><span class="st-bar" style="width:${Math.max(1.5, (r.value / max) * 100)}%"></span></span>
      <span class="st-val">${fmt(r.value)} <small>${pct(r.value, total)}</small></span></div>`).join('')}</div>`;
}
const entries = (o) => Object.entries(o || {}).map(([k, v]) => [k, Number(v) || 0]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

function tile(label, value, sub = '') {
  return `<div class="st-tile"><div class="st-k">${esc(label)}</div><div class="st-v">${value}</div>${sub ? `<div class="st-s">${sub}</div>` : ''}</div>`;
}

function shortDay(day) {
  const [, m, d] = day.split('-');
  return `${Number(d)}.${Number(m)}.`;
}

// ---------- pages ----------
function pageOverview(S) {
  const a = S.all || {};
  const days = S.days;
  const vis = days.map((d) => Number(d.visits) || 0);
  const today = vis[vis.length - 1] || 0;
  const last7 = vis.slice(-7).reduce((x, y) => x + y, 0);
  const last30 = vis.reduce((x, y) => x + y, 0);
  const total = Number(a.visits) || 0;
  const nw = Number(a.newVisitors) || 0, ret = Number(a.returning) || 0;
  const both = nw + ret;
  const split = both
    ? `<div class="st-split" data-tip="${esc(`${t('statsNew')}: ${fmt(nw)} · ${t('statsReturning')}: ${fmt(ret)}`)}"><span style="flex:${nw};background:${C1}"></span><span style="flex:${ret};background:${C2}"></span></div>
      <div class="st-legend"><span><i style="background:${C1}"></i>${t('statsNew')} ${fmt(nw)} (${pct(nw, both)})</span><span><i style="background:${C2}"></i>${t('statsReturning')} ${fmt(ret)} (${pct(ret, both)})</span></div>`
    : '';
  return `<div class="st-tiles">
      ${tile(t('statsVisits'), fmt(total))}
      ${tile(t('statsToday'), fmt(today))}
      ${tile(t('stats7'), fmt(last7))}
      ${tile(t('stats30'), fmt(last30))}
      ${tile(t('statsNew'), fmt(nw), pct(nw, both))}
      ${tile(t('statsReturning'), fmt(ret), pct(ret, both))}
      ${tile(t('statsDives'), fmt(a.dives))}
      ${tile(t('statsMulti'), fmt(a.multiplayer))}
      ${S.online ? tile(t('statsOwn'), fmt(a.ownerVisits)) : ''}
    </div>
    ${split}
    <h3>${t('statsPerDay')}</h3>
    ${columns(vis, days.map((d) => shortDay(d.day)), { showEvery: 5, tip: (i, v) => `${shortDay(days[i].day)}: ${fmt(v)} ${t('statsVisits')}${days[i].returning ? ` (${t('statsReturning')} ${fmt(days[i].returning)})` : ''}` })}`;
}

function pageCountries(S) {
  const rows = entries(S.all.countries).map(([cc, v]) => ({ label: countryName(cc), value: v, icon: flag(cc) }));
  return `<h3>${t('statsCountry')}</h3>${hbars(rows, sum(S.all.countries), { limit: 40 })}<p class="st-note">${t('statsCountryNote')}</p>`;
}

function pageTimes(S) {
  const hrs = Array.from({ length: 24 }, (_, h) => Number((S.all.hours || {})['h' + String(h).padStart(2, '0')]) || 0);
  const wdN = t('weekdays');
  const wds = wdN.map((_, i) => Number((S.all.weekdays || {})['d' + i]) || 0);
  return `<h3>${t('statsHours')}</h3>
    ${columns(hrs, hrs.map((_, h) => String(h)), { showEvery: 3, tip: (h, v) => `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59 · ${fmt(v)} ${t('statsVisits')}` })}
    <h3>${t('statsWeekdays')}</h3>
    ${columns(wds, wdN, { h: 150, tip: (i, v) => `${wdN[i]}: ${fmt(v)} ${t('statsVisits')}` })}`;
}

function pageDevices(S) {
  const dev = entries(S.all.devices).map(([k, v]) => ({ label: t('dev_' + k) || k, value: v, icon: { phone: '📱', tablet: '📲', desktop: '💻' }[k] || '' }));
  const lg = entries(S.all.langs).map(([k, v]) => ({ label: langName(k), value: v }));
  return `<h3>${t('statsDevices')}</h3>${hbars(dev, sum(S.all.devices))}<h3>${t('statsLangs')}</h3>${hbars(lg, sum(S.all.langs))}`;
}

function pageGame(S, ctx) {
  const lv = entries(S.all.levels).map(([k, v]) => ({ label: ctx.levelName(k), value: v }));
  const sb = entries(S.all.subs).map(([k, v]) => ({ label: ctx.subName(k), value: v }));
  const md = entries(S.all.modes).map(([k, v]) => ({ label: k === 'race' ? t('modeRace') : t('modeExpedition'), value: v, icon: k === 'race' ? '🏁' : '🔦' }));
  const dv = S.days.map((d) => Number(d.dives) || 0);
  return `<div class="st-tiles">${tile(t('statsDives'), fmt(S.all.dives))}${tile(t('statsMulti'), fmt(S.all.multiplayer), pct(S.all.multiplayer || 0, S.all.dives || 0))}</div>
    <h3>${t('statsDivesPerDay')}</h3>
    ${columns(dv, S.days.map((d) => shortDay(d.day)), { showEvery: 5, h: 150, tip: (i, v) => `${shortDay(S.days[i].day)}: ${fmt(v)} ${t('statsDives')}` })}
    <h3>${t('statsTrenches')}</h3>${hbars(lv, sum(S.all.levels))}
    <h3>${t('statsSubs')}</h3>${hbars(sb, sum(S.all.subs))}
    <h3>${t('statsModes')}</h3>${hbars(md, sum(S.all.modes))}`;
}

function pageRecent(S) {
  if (!S.recent || !S.recent.length) return `<p class="st-empty">${t('statsNoData')}</p>`;
  const df = new Intl.DateTimeFormat(getLang() === 'de' ? 'de-AT' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Vienna' });
  return `<div class="st-tablewrap"><table class="st-table"><thead><tr><th>${t('statsWhen')}</th><th>${t('statsCountry')}</th><th>${t('statsDevice')}</th><th>${t('statsLang')}</th><th>${t('statsType')}</th></tr></thead><tbody>
    ${S.recent.map((r) => `<tr class="${r.own ? 'own' : ''}"><td>${r.t ? esc(df.format(new Date(r.t))) : '–'}</td><td>${flag(r.cc)} ${esc(countryName(r.cc))}</td><td>${esc(t('dev_' + r.dev) || r.dev || '')}</td><td>${esc(r.lang || '')}</td><td>${r.ret ? t('statsReturning') : t('statsNew')}</td></tr>`).join('')}
    </tbody></table></div><p class="st-note">${t('statsRecentOwnNote')}</p>`;
}

// returning visitors: every device has an anonymous random number; own devices are marked
function pageVisitors(S) {
  const V = S.visitors;
  if (!V) return `<p class="st-empty">${t('statsVisitorsOffline')}</p>`;
  if (!V.length) return `<p class="st-empty">${t('statsVisitorsNone')}</p>`;
  const me = myVisitorId();
  const ret = V.filter((v) => v.n >= 2), reg = V.filter((v) => v.n >= 5), own = V.filter((v) => v.own);
  const dfm = new Intl.DateTimeFormat(getLang() === 'de' ? 'de-AT' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Vienna' });
  const rows = [...V].sort((a, b) => b.n - a.n || b.last - a.last).filter((v) => v.n >= 2 || v.own).slice(0, 150);
  return `<div class="st-tiles">
      ${tile(t('statsDevicesTotal'), fmt(S.visitorsTotal || V.length))}
      ${tile(t('statsRet2'), fmt(ret.length), pct(ret.length, V.length))}
      ${tile(t('statsRet5'), fmt(reg.length))}
      ${tile(t('statsOwnDevices'), fmt(own.length))}
    </div>
    <div class="st-tablewrap st-vis"><table class="st-table"><thead><tr><th></th><th>${t('statsNVisits')}</th><th>${t('statsFirst')}</th><th>${t('statsLast')}</th><th>${t('statsCountry')}</th><th>${t('statsDevice')}</th><th>${t('statsLang')}</th></tr></thead><tbody>
    ${rows.length ? rows.map((v) => `<tr class="${v.own ? 'own' : ''}"><td>${v.own ? `<b class="st-me">🏠 ${t('statsMe')}</b>` : `#${esc(v.id)}`}${v.id === me ? ` <small>(${t('statsThisDevice')})</small>` : ''}</td><td><b>${fmt(v.n)}</b></td><td>${esc(dfm.format(new Date(v.first)))}</td><td>${esc(dfm.format(new Date(v.last)))}</td><td>${flag(v.cc)} ${esc(countryName(v.cc))}</td><td>${esc(t('dev_' + v.dev) || v.dev)}</td><td>${esc(v.lang || '')}</td></tr>`).join('') : `<tr><td colspan="7" class="st-empty">${t('statsRetNone')}</td></tr>`}
    </tbody></table></div>
    <p class="st-note">${t('statsVisitorsNote')}</p>`;
}

const PAGES = [pageOverview, pageVisitors, pageRecent, pageCountries, pageTimes, pageDevices, pageGame];

export async function openStats(ctx) {
  const { net, showModal, closeModal, ownerNote } = ctx;
  showModal(`<div data-wide></div><h1>📊 ${t('statsTitle')}</h1><p>${t('statsLoading')}</p>`, null, 'stats');
  const S = await loadStats(net, 30);
  S.all = S.all || {};
  const render = () => {
    const status = S.online
      ? `<span class="st-badge on">● ${t('statsOnline')}</span>`
      : `<span class="st-badge">● ${t('statsLocal')}</span>`;
    const notes = [
      !S.online ? `<p class="st-note">${S.error ? t('statsError') : t('statsLocalHint')}</p>` : '',
      ownerNote ? `<p class="st-note">${t('statsOwnerNote')}</p>` : '',
    ].join('');
    showModal(`<div data-wide></div>
      <div class="st-head"><h1>📊 ${t('statsTitle')}</h1>${status}<button class="x st-x" aria-label="${t('close')}">×</button></div>
      <div class="st-tabs" role="navigation">${t('statsSections').map((n, i) => `<button data-sec="${i}">${esc(n)}</button>`).join('')}</div>
      <div class="st-scroll">
        ${PAGES.map((pg, i) => `<section class="st-page" id="st-sec${i}"><h2>${esc(t('statsSections')[i])}</h2>${pg(S, ctx)}</section>`).join('')}
        ${notes}
        <div class="st-tip hidden"></div>
      </div>`, (root) => {
      root.querySelector('.st-x').onclick = closeModal;
      const sc = root.querySelector('.st-scroll');
      root.querySelectorAll('.st-tabs button').forEach((b) => {
        b.onclick = () => sc.scrollTo({ top: root.querySelector('#st-sec' + b.dataset.sec).offsetTop - 4, behavior: 'smooth' }); // .st-scroll is the offset parent
      });
      // the section you are looking at is highlighted in the menu
      const mark = () => {
        let cur = 0;
        PAGES.forEach((_, i) => {
          if (root.querySelector('#st-sec' + i).offsetTop - 30 <= sc.scrollTop) cur = i;
        });
        root.querySelectorAll('.st-tabs button').forEach((b, i) => b.classList.toggle('on', i === cur));
      };
      sc.addEventListener('scroll', mark, { passive: true });
      mark();
      bindTips(sc);
    }, 'stats');
  };
  render();
}

// tooltips on hover (mouse) or tap (touch)
function bindTips(root) {
  const tip = root.querySelector('.st-tip');
  const showAt = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.classList.remove('hidden');
    const r = root.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(4, Math.min(r.width - tw - 4, x - r.left - tw / 2)) + 'px';
    tip.style.top = y - r.top + root.scrollTop - 38 + 'px';
  };
  root.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('pointermove', (e) => showAt(el, e.clientX, e.clientY));
    el.addEventListener('pointerdown', (e) => showAt(el, e.clientX, e.clientY));
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') tip.classList.add('hidden');
    });
  });
}
