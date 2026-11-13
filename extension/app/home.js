// home.js — the home page (/ and /page/N/). Design: canvas «Темы · Главная» (T-Home).
// Order: masthead «Сегодня» → «Новинки» wall → «Продолжить» → Rezka's tabs + grid → «Горячие обновления» board.
import { $, $$, h, txt, parse, loggedIn, loadContinue, ICON } from './core.js';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
const epCode = (s, e) => `S${s} E${String(e).padStart(2, '0')}`;
const arrow = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="${d}"/></svg>`;
const visible = (block) => block ? $$('.b-seriesupdate__block_list_item', block).filter((li) => li.style.display !== 'none') : [];

// ---------- Hot series updates: one row per episode, all voices in it; each row gets a big «S4 E02» code ----------
const groupUpdates = () => {
  for (const list of $$('.b-seriesupdate__block_list:not([data-rzg])')) {
    list.dataset.rzg = '1';
    const seen = new Map();
    for (const li of $$('.b-seriesupdate__block_list_item', list)) {
      const cell = $('.cell-2', li), voice = txt($('i', cell)).replace(/^\(|\)$/g, '');
      const key = [$('.b-seriesupdate__block_list_link', li)?.getAttribute('href'), txt($('.season', li)), txt(cell?.firstChild)].join('|');
      const first = seen.get(key);
      if (!first) { seen.set(key, { cell, voices: voice ? [voice] : [] }); continue; }
      if (voice && !first.voices.includes(voice)) first.voices.push(voice);
      let i = $('i', first.cell); if (!i) { i = h('i'); first.cell.append(' ', i); }
      i.textContent = first.voices.join(', ');
      li.style.display = 'none';
    }
  }
  for (const li of $$('.b-seriesupdate__block_list_item')) {
    // once per row: the sidebar observer re-runs this, and rewriting text would re-trigger it forever
    if (li.dataset.rzc) continue;
    li.dataset.rzc = '1';
    const i = $('.cell-2 i', li);
    if (i && /^\(.*\)$/.test(i.textContent)) i.textContent = i.textContent.slice(1, -1);
    const cell = $('.cell-2', li), node = cell?.firstChild;
    const s = txt($('.season', li)).match(/\d+/)?.[0], e = (node?.textContent || '').match(/\d+/)?.[0];
    if (node?.nodeType === 3) node.replaceWith(h('span', { class: 'rz-ep' }, node.textContent.trim()));
    $('.b-seriesupdate__block_list_item_inner', li)?.prepend(h('span', { class: 'rz-code', 'aria-hidden': 'true' }, s && e ? epCode(s, e) : txt($('.rz-ep', li))));
  }
};
const rowData = (li) => {
  const a = $('.b-seriesupdate__block_list_link', li);
  return { href: a?.getAttribute('href'), title: txt(a), code: txt($('.rz-code', li)), voices: txt($('.cell-2 i', li)) };
};

// ---------- «Продолжить»: Rezka's history rows → episode code + translator ----------
const contData = (r) => {
  const m = (r.last || '').match(/(\d+)\s*сезон\s*(\d+)\s*серия\s*(?:\((.+)\))?/);
  return { ...r, code: m ? epCode(m[1], m[2]).replace(' ', ' · ') : 'Фильм', tr: m ? m[3] || '' : r.last, left: (r.more || '').replace(/^смотреть\s*/i, '') };
};

const masthead = (today, yest, first) => {
  const d = new Date();
  const todayRows = visible(today), yestN = visible(yest).length;
  const cont = first && contData(first);
  return h('section', { class: 'rz-field rz-mast' },
    h('div', { class: 'rz-wrap rz-mast-in' },
      h('div', { class: 'rz-mast-l' },
        h('h1', { class: 'rz-d' }, 'Сегодня', h('br'), `${d.getDate()} ${MONTHS[d.getMonth()]}`),
        today || yest ? h('p', {},
          today ? h('span', {}, `${todayRows.length} ${plural(todayRows.length, 'новая серия', 'новые серии', 'новых серий')} сегодня`) : null,
          yest ? h('span', { class: 'rz-dim' }, `${yestN} вчера`) : null,
          h('a', { href: '#rz-upd' }, 'Все обновления')) : null),
      h('div', { class: 'rz-mast-r' },
        cont ? h('a', { class: 'rz-mcont', href: cont.href },
          cont.cover ? h('img', { src: cont.cover, alt: '' }) : null,
          h('span', { class: 'rz-mcont-b' },
            h('span', { class: 'rz-d8 rz-acc' }, 'Продолжить'),
            h('span', { class: 'rz-d rz-mcode' }, cont.code),
            h('b', {}, cont.title),
            h('span', { class: 'rz-dim2' }, [cont.tr, cont.left].filter(Boolean).join(' · '))),
          h('span', { class: 'rz-btn rz-y' }, h('span', { html: ICON.play, style: 'display:grid' }), 'Смотреть')) : null,
        todayRows.length ? h('div', { class: 'rz-mtoday' },
          h('span', { class: 'rz-d8' }, 'Вышло сегодня'),
          todayRows.slice(0, cont ? 3 : 6).map(rowData).map((r) => h('a', { href: r.href },
            h('span', { class: 'rz-d' }, r.code), h('b', {}, r.title), h('span', {}, r.voices)))) : null)));
};

// ---------- «Новинки»: Rezka's slider items as a poster wall with a big first tile ----------
const bigInfo = new Map();
const loadBig = (url) => {
  if (!bigInfo.has(url)) bigInfo.set(url, (async () => {
    try { const c = JSON.parse(sessionStorage.getItem('rz-big:' + url) || 'null'); if (c) return c; } catch {}
    const doc = parse(await (await fetch(url, { credentials: 'include' })).text());
    const info = { img: $('.b-sidecover a', doc)?.getAttribute('href') || $('.b-sidecover img', doc)?.getAttribute('src'),
      imdb: txt($('.b-post__info_rates.imdb .bold', doc)), kp: txt($('.b-post__info_rates.kp .bold', doc)) };
    try { sessionStorage.setItem('rz-big:' + url, JSON.stringify(info)); } catch {}
    return info;
  })().catch(() => ({})));
  return bigInfo.get(url);
};

const newestWall = () => {
  // Rezka replaces #newest-slider itself when the type changes: watch its wrapper, look it up on every draw
  const box = $('.b-newest_slider_wrapper');
  if (!box || !$('#newest-slider', box)) return null;
  const wall = h('div', { class: 'b-content__inline_items rz-wall' });
  const pos = h('span', { class: 'rz-d8 rz-pos', 'aria-live': 'polite' });
  const prev = h('button', { class: 'rz-arrow', type: 'button', 'aria-label': 'Предыдущие новинки', html: arrow('M15 5l-7 7 7 7') });
  const next = h('button', { class: 'rz-arrow', type: 'button', 'aria-label': 'Следующие новинки', html: arrow('M9 5l7 7-7 7') });
  const chips = h('div', { class: 'rz-chips', role: 'group', 'aria-label': 'Тип новинок' });
  let page = 0;
  const perPage = () => { const cols = Math.max(4, Math.floor((wall.clientWidth + 16) / 164)); return cols * 2 - 3; }; // 2 rows, the big tile takes 4 cells
  // Tiles are built once and reused, so a page seen before (or warmed up as a neighbour) shows with its posters already loaded
  const clones = new WeakMap(), bigs = new Map();
  const clone = (it) => { if (!clones.has(it)) clones.set(it, it.cloneNode(true)); return clones.get(it); };
  const bigTile = (first) => {
    const href = first.dataset.url || $('a', first)?.getAttribute('href');
    if (bigs.has(href)) return bigs.get(href);
    const kind = [txt($('.cat .entity', first)), txt($('.info', first))].filter(Boolean).join(' · ');
    const img = h('img', { src: $('img', first)?.getAttribute('src'), alt: '', decoding: 'async' });
    const rates = h('span', { class: 'rz-big-r' });
    const big = h('a', { class: 'rz-big', href },
      h('span', { class: 'rz-big-img' }, img),
      h('span', { class: 'rz-big-b' }, h('span', { class: 'rz-d8 rz-dim' }, kind), h('span', { class: 'rz-d rz-big-t' }, txt($('.b-content__inline_item-link a', first))),
        h('span', { class: 'rz-dim' }, txt($('.b-content__inline_item-link div', first))), rates));
    loadBig(href).then((i) => {
      // swap to the big cover only once it is decoded, so it never paints half-loaded
      if (i.img) { const pre = new Image(); pre.src = i.img; pre.decode().then(() => { img.src = i.img; }, () => {}); }
      rates.replaceChildren(...[i.imdb && h('span', {}, h('b', { class: 'rz-d' }, i.imdb), ' IMDb'), i.kp && h('span', {}, h('b', { class: 'rz-d' }, i.kp), ' Кинопоиск')].filter(Boolean));
    });
    bigs.set(href, big);
    return big;
  };
  const tiles = (items, per, p) => {
    if (p < 0) return [];
    const [first, ...rest] = items.slice(p * per, p * per + per);
    return first ? [bigTile(first), ...rest.map(clone)] : [];
  };
  const draw = () => {
    const items = $$('#newest-slider .b-content__inline_item', box);
    const per = perPage(), pages = Math.max(1, Math.ceil(items.length / per));
    page = Math.min(page, pages - 1);
    wall.replaceChildren(...tiles(items, per, page));
    tiles(items, per, page + 1); tiles(items, per, page - 1); // warm up the neighbours
    pos.textContent = `${page + 1} / ${pages}`;
    prev.disabled = page === 0; next.disabled = page >= pages - 1;
    const spans = $$('.b-newest_slider__title span[data-id]');
    const active = spans.find((s) => s.classList.contains('active'))?.dataset.id || '0';
    chips.replaceChildren(...[['0', 'Все'], ['1', 'Фильмы'], ['2', 'Сериалы'], ['3', 'Мультфильмы'], ['82', 'Аниме']]
      .filter(([id]) => spans.some((s) => s.dataset.id === id))
      .map(([id, label]) => h('button', { class: 'rz-chip', type: 'button', 'aria-pressed': String(id === active),
        onclick: () => { page = 0; spans.find((s) => s.dataset.id === id)?.click(); } }, label)));
  };
  prev.onclick = () => { page--; draw(); };
  next.onclick = () => { page++; draw(); };
  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(draw, 80); }).observe(box, { childList: true, subtree: true });
  let w = 0;
  new ResizeObserver(() => { if (wall.clientWidth !== w) { w = wall.clientWidth; draw(); } }).observe(wall);
  return h('section', { class: 'rz-wrap rz-hsec', 'aria-label': 'Новинки' },
    h('div', { class: 'rz-sec-h' }, h('h2', {}, 'Новинки'),
      h('div', { class: 'rz-hctl' }, chips, h('a', { class: 'rz-more', href: '/new/' }, 'Все новинки'), pos, prev, next)),
    wall);
};

const contStrip = (rows) => h('section', { class: 'rz-wrap rz-hsec', 'aria-label': 'Продолжить просмотр' },
  h('div', { class: 'rz-sec-h' }, h('h2', {}, 'Продолжить'),
    h('a', { class: 'rz-more', href: '/continue/' }, 'Вся история', h('span', { html: arrow('M5 12h14M13 6l6 6-6 6'), style: 'display:grid' }))),
  h('div', { class: 'rz-hcont' }, rows.slice(0, 4).map(contData).map((r) => h('a', { class: 'rz-ci', href: r.href },
    r.cover ? h('img', { src: r.cover, alt: '' }) : null,
    h('span', { class: 'rz-ci-b' },
      h('span', { class: 'rz-d rz-ci-code' }, r.code), h('b', {}, r.title),
      r.tr ? h('span', { class: 'rz-ci-tr' }, r.tr) : null,
      h('span', { class: 'rz-ci-left' }, r.left || r.date))))));

export async function run() {
  const updates = $('.b-content__inline_sidebar');
  if (updates) {
    groupUpdates();
    new MutationObserver(groupUpdates).observe(updates, { childList: true, subtree: true });
  }
  const blocks = $$('.b-seriesupdate__block');
  const isDay = (b, re) => b && re.test(txt($('.b-seriesupdate__block_date', b)));
  const today = blocks.find((b) => isDay(b, /^Сегодня/)), yest = blocks.find((b) => isDay(b, /^Вчера/));

  // the counts per open day go into its header bar
  for (const b of blocks) {
    const date = $('.b-seriesupdate__block_date', b);
    if (!date || date.classList.contains('collapsible') || $('.rz-cnt', date)) continue;
    const n = visible(b).length;
    date.append(h('span', { class: 'rz-cnt' }, `${n} ${plural(n, 'серия', 'серии', 'серий')}`));
  }

  const rows = loggedIn ? await loadContinue().catch((e) => { console.warn('[rezka-redesign]', e); return []; }) : [];
  const main = $('#main');
  const sliderWrap = $('.b-newest_slider_wrapper');
  const wall = newestWall();
  main?.prepend(masthead(today, yest, rows[0]));
  (sliderWrap || $('.b-container.b-content'))?.before(...[wall, rows.length ? contStrip(rows) : null].filter(Boolean));

  // «Горячие обновления» leave the right column and become a full-width board under the grid
  const inline = $('.b-content__inline');
  if (updates && inline) {
    inline.after(h('section', { class: 'rz-hsec rz-board', id: 'rz-upd', 'aria-label': 'Горячие обновления' },
      h('div', { class: 'rz-sec-h' }, h('h2', {}, 'Горячие обновления'), h('p', {}, 'Одна строка на серию, озвучки через запятую.')),
      updates));
  }
}
