// title.js — film and series pages. Design: canvas «Темы · Сериал» (T-Series) and «Раунд 4» (P-Film, M-Player).
// #player is never moved (moving it reloads Playerjs's resize watcher); our blocks go before and after Rezka's container.
import { $, $$, h, txt, ICON, loadContinue, samePage, toggleTheater } from './core.js';

export async function run() {
  // ======================= TITLE PAGE (film / series) =======================
  const rows = Object.fromEntries($$('.b-post__info tr').map((tr) => [txt($('td.l', tr)).replace(/:$/, ''), tr.children[1]]));
  const rowHTML = (k) => rows[k]?.innerHTML.trim();
  const rate = (cls) => { const s = $('.b-post__info_rates.' + cls); return s && { v: txt($('.bold', s)), n: txt($('i', s)).replace(/[()]/g, '') }; };
  const imdb = rate('imdb'), kp = rate('kp');
  const viewers = $('.b-post__rating .num') && { v: txt($('.b-post__rating .num')), n: txt($('.b-post__rating .votes')).replace(/[()]/g, '') };
  const title = txt($('.b-post__title h1')), orig = txt($('.b-post__origtitle')), status = txt($('.b-post__infolast'));
  const poster = $('.b-sidecover a')?.href || $('.b-sidecover img')?.src;
  const isSeries = !!$('#simple-episodes-tabs, .b-simple_episode__item');
  const year = (rowHTML('Дата выхода') || '').match(/\d{4}/)?.[0] || '';

  const groups = (n) => n.replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ratingBlock = (label, r, accent) => r && h('div', { class: 'rz-rate' },
    h('span', { class: 'rz-muted' }, label), h('b', { class: accent ? 'rz-acc' : '' }, r.v), h('span', { class: 'rz-muted' }, groups(r.n)));

  const facts = h('dl', { class: 'rz-facts' });
  for (const k of ['Слоган', 'Дата выхода', 'Страна', 'Режиссер', 'Жанр', 'В качестве', 'В переводе', 'Возраст', 'Время']) {
    if (rows[k]) facts.append(h('dt', {}, { 'Режиссер': 'Режиссёр', 'В качестве': 'Качество' }[k] || k), h('dd', { html: rowHTML(k) }));
  }
  const castCell = $$('.b-post__info td').find((td) => /В ролях/.test(txt(td)));
  if (castCell) facts.append(h('dt', {}, 'В ролях'), h('dd', { html: castCell.innerHTML.replace(/<span class="l inline">.*?<\/span>/s, '').replace(/^.*?В ролях актеры:?\s*/s, '') }));

  const tagRow = (k, label) => {
    const cell = rows[k]; if (!cell) return null;
    const tags = $$('a', cell).map((a) => {
      const place = a.nextSibling?.textContent?.match(/\((\d+)\s*место\)/)?.[1];
      return h('a', { class: 'rz-tag', href: a.getAttribute('href') }, place ? h('b', {}, '№' + place) : null, txt(a));
    });
    return [h('span', { class: 'rz-muted' }, label), h('div', { class: 'rz-tags' }, tags)];
  };

  // Rezka widgets moved as-is so their own handlers keep working
  const favWidget = $('.b-sideactions__fav');
  const trailer = $('.b-sidelinks__link.show-trailer');
  const rateWidget = $('.b-post__rating_table');
  const voices = $('.b-translators__block');
  const schedule = $('.b-post__schedule');
  const comments = ['#addcomment-title', '#comments-form', '#hd-comments-list', '#hd-comments-navigation'].map((s) => $(s));
  const commentsCount = txt($('#comments-list-button em'));

  // "Смотреть" scrolls to the player and starts it (player.js listens for rz-play); becomes "Продолжить" if it's in history
  const ctaLabel = h('span', {}, 'Смотреть');
  const cta = h('a', { class: 'rz-cta', href: '#rz-watch', onclick: (e) => {
    e.preventDefault();
    $('#cdnplayer-container')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    document.dispatchEvent(new CustomEvent('rz-play'));
  } }, ctaLabel, h('span', { class: 'rz-nub', html: ICON.play }));
  loadContinue().then((rows) => {
    const r = rows.find((x) => samePage(x.href));
    if (r) ctaLabel.replaceChildren('Продолжить', r.last ? h('small', {}, r.last.replace(/\s*\(.*\)$/, '')) : null);
  }).catch(() => {});

  const hero = h('section', { class: 'rz-wrap rz-hero' },
    poster && h('img', { class: 'rz-poster', src: poster, alt: 'Постер: ' + title }),
    h('div', { class: 'rz-head' },
      h('span', { class: 'rz-status' + (/Завершен/.test(status) ? ' rz-ok' : '') }, isSeries ? (status || 'Сериал').replace('Завершен (все серии)', 'Завершён, все серии') : 'Фильм'),
      h('h1', { class: 'rz-h1' }, title),
      h('p', { class: 'rz-sub' }, [orig, year].filter(Boolean).join(' · ')),
      h('div', { class: 'rz-rates' }, ratingBlock('IMDb', imdb, true), ratingBlock('Кинопоиск', kp), ratingBlock('Зрители Rezka', viewers)),
      h('p', { class: 'rz-desc' }, txt($('.b-post__description_text'))),
      h('div', { class: 'rz-actions' },
        cta,
        trailer, favWidget),
      rateWidget && h('div', { class: 'rz-myrate' }, h('span', { class: 'rz-muted' }, 'Ваша оценка'), rateWidget)),
    h('aside', { class: 'rz-card' }, facts));

  const tagsBand = h('section', { class: 'rz-wrap rz-band' }, tagRow('Входит в списки', 'Входит в списки'), tagRow('Из серии', 'Из серии'));

  const theaterBtn = h('button', { class: 'rz-ghost rz-theater-btn', type: 'button', 'aria-pressed': 'false', onclick: () => toggleTheater() });
  theaterBtn.innerHTML = ICON.theater + 'Кинотеатр<span class="rz-kbd">T</span>';
  const watch = h('section', { id: 'rz-watch', class: 'rz-watch' },
    h('div', { class: 'rz-wrap rz-watchbar' }, h('h2', { class: 'rz-h2' }, 'Смотреть'), voices, theaterBtn));

  const franchise = $$('.b-post__partcontent_item').map((it) => {
    const a = $('a', it), cur = it.classList.contains('current');
    return h(cur ? 'span' : 'a', { class: 'rz-fr' + (cur ? ' rz-cur' : ''), href: cur ? null : (a?.getAttribute('href') || it.dataset.url) },
      h('span', { class: 'rz-frt' }, txt($('.title', it)) || txt(a)), h('span', { class: 'rz-muted' }, txt($('.year', it))), h('b', {}, txt($('.rating', it)) || '—'));
  });
  const similar = $$('.b-sidelist .b-content__inline_item').map((it) => h('a', { class: 'rz-sim', href: $('a', it)?.getAttribute('href') },
    h('img', { src: $('img', it)?.src, alt: '' }), h('b', {}, txt($('.b-content__inline_item-link a', it))), h('span', { class: 'rz-muted' }, txt($('.b-content__inline_item-link div', it)))));

  const lower = h('div', { class: 'rz-wrap rz-lower' },
    h('main', {},
      schedule && h('section', { class: 'rz-sec' }, schedule),
      h('section', { class: 'rz-sec rz-comments' }, h('h2', { class: 'rz-h2' }, 'Отзывы ', h('span', { class: 'rz-muted' }, commentsCount)), comments)),
    h('aside', {},
      franchise.length ? h('section', { class: 'rz-sec' }, h('h2', { class: 'rz-h2' }, 'Вся франшиза'), h('div', { class: 'rz-card rz-frlist' }, franchise)) : null,
      similar.length ? h('section', { class: 'rz-sec' }, h('h2', { class: 'rz-h2' }, 'Смотреть ещё'), h('div', { class: 'rz-simgrid' }, similar)) : null));

  // #player is never moved: moving it reloads Playerjs's resize-watcher iframe and the player stops adapting to its size.
  // Our blocks go around Rezka's own container, which shows nothing but the player.
  const content = $('.b-container.b-content') || $('#player').closest('.b-content__columns');
  content.before(h('div', { id: 'rz-title' }, hero, tagsBand, watch));
  content.after(lower);

  // ---------- IMDb rating per episode (OMDb) ----------
  const imdbId = (() => {
    const b64 = ($('.b-post__info_rates.imdb a')?.getAttribute('href') || '').match(/\/help\/([^/]+)/)?.[1];
    try { return b64 && decodeURIComponent(atob(b64)).match(/tt\d+/)?.[0]; } catch { return null; }
  })();
  const TTL = 7 * 24 * 3600 * 1000;
  const pending = new Map();
  const season = async (n, apiKey) => {
    const key = `omdb:${imdbId}:${n}`;
    const hit = (await chrome.storage.local.get(key))[key];
    if (hit && Date.now() - hit.at < TTL) return hit.map;
    const data = await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${imdbId}&Season=${n}`)).json();
    if (data.Response !== 'True') throw new Error(data.Error || 'OMDb error');
    const map = {};
    for (const ep of data.Episodes) if (ep.imdbRating !== 'N/A') map[ep.Episode] = ep.imdbRating;
    await chrome.storage.local.set({ [key]: { at: Date.now(), map } });
    return map;
  };
  // Episode buttons become bars: rating on top, bar height = rating (8 → 10), number below
  const paint = async () => {
    const items = $$('.b-simple_episode__item:not([data-rz])');
    if (!items.length) return;
    for (const it of items) {
      it.dataset.rz = '1';
      it.innerHTML = `<span class="rz-r"></span><span class="rz-bar"></span><span class="rz-n">${it.dataset.episode_id}</span>`;
    }
    const { omdbKey } = await chrome.storage.sync.get('omdbKey');
    if (!omdbKey || !imdbId) return;
    for (const s of new Set(items.map((it) => it.dataset.season_id))) {
      if (!pending.has(s)) pending.set(s, season(s, omdbKey).catch((e) => { pending.delete(s); console.warn('[rezka-redesign]', e); return {}; }));
      const map = await pending.get(s);
      for (const it of items.filter((x) => x.dataset.season_id === s)) {
        const r = parseFloat(map[it.dataset.episode_id]);
        if (!r) continue;
        $('.rz-r', it).textContent = r.toFixed(1);
        it.style.setProperty('--h', Math.max(10, Math.round((Math.min(r, 10) - 6) / 4 * 160)) + 'px');
        it.classList.add(r >= 9 ? 'rz-top' : 'rz-mid');
      }
      if (Object.keys(map).length) $('#simple-episodes-tabs')?.classList.add('rz-hist');
    }
  };
  if (isSeries) {
    paint();
    let timer;
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(paint, 120); })
      .observe($('#simple-episodes-tabs') || $('#player') || document.body, { childList: true, subtree: true });
  }
}
