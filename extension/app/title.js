// title.js — film and series pages. Design: canvas «Темы · Сериал» (T-Series) and «Раунд 4» (P-Film, M-Player).
// #player is never moved (moving it reloads Playerjs's resize watcher): our blocks go before and after Rezka's container,
// a few small rows go inside #player next to Rezka's own seasons/episodes. Rezka widgets are moved, not cloned.
import { $, $$, h, txt, ICON, root, loadContinue, samePage, toggleTheater, settings, openSettings } from './core.js';

const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
const groups = (n) => (n || '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const SECTIONS = { films: 'Фильмы', series: 'Сериалы', cartoons: 'Мультфильмы', animation: 'Аниме' };
const SE =/(\d+)\s*сезон\s*(\d+)\s*сери/;
const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

export async function run() {
  const rows = {};
  for (const tr of $$('.b-post__info tr')) { const l = txt($('td.l', tr)).replace(/:$/, ''); if (l) rows[l] = tr.children[1]; }
  const castCell = $$('.b-post__info td').find((td) => /В ролях/.test(txt(td)));
  const rate = (cls) => { const s = $('.b-post__info_rates.' + cls); return s && { v: txt($('.bold', s)), n: txt($('i', s)), href: $('a', s)?.getAttribute('href') }; };
  const imdb = rate('imdb'), kp = rate('kp');
  const viewers = $('.b-post__rating .num') && { v: txt($('.b-post__rating .num')), n: txt($('.b-post__rating .votes')) };
  const title = txt($('.b-post__title h1')), orig = txt($('.b-post__origtitle')), status = txt($('.b-post__infolast'));
  const poster = $('.b-sidecover a')?.href || $('.b-sidecover img')?.src;
  const isSeries = !!$('#simple-episodes-tabs, .b-simple_episode__item, .b-post__schedule');

  // years: start from «Дата выхода», end from the last aired episode in Rezka's schedule
  const start = txt(rows['Дата выхода']).match(/\d{4}/)?.[0] || '';
  const lastYear = Math.max(0, ...$$('.b-post__schedule_table td.td-4').map((td) => +(txt(td).match(/\d{4}/)?.[0] || 0)));
  const years = !isSeries ? start : /Завершен/.test(status) ? (lastYear && lastYear !== +start ? `${start}–${lastYear}` : start) : start && `${start}–…`;
  const age = txt(rows['Возраст']).match(/\d+\+/)?.[0];
  const meta = [orig, years, txt(rows['Страна']), age, !isSeries && txt(rows['Время'])].filter(Boolean).join(' · ');

  // ---------- head: glass field, huge title, poster overlapping into the page ----------
  // Rezka's crumbs here are only «HDREZKA.ME » title»: section and genre come from the URL (/series/thriller/…)
  const [sec, slug] = location.pathname.split('/').filter(Boolean);
  const genre = rows['Жанр'] && $$('a', rows['Жанр']).find((a) => a.pathname === `/${sec}/${slug}/`);
  const crumbs = [SECTIONS[sec] && [SECTIONS[sec], `/${sec}/`], genre && [txt(genre), `/${sec}/${slug}/`]].filter(Boolean);
  const field = h('section', { class: 'rz-field rz-th' },
    h('div', { class: 'rz-wrap' },
      h('nav', { class: 'rz-crumbs', 'aria-label': 'Хлебные крошки' },
        crumbs.flatMap(([name, href]) => [h('a', { href }, name), h('span', { 'aria-hidden': 'true' }, '›')]), h('span', { 'aria-current': 'page' }, title)),
      h('h1', { class: 'rz-h1 rz-th-t' }, title),
      h('div', { class: 'rz-th-meta' },
        meta ? h('span', { class: 'rz-d8' }, meta) : null,
        status ? h('span', { class: 'rz-th-st' }, /Завершен/.test(status) ? 'Завершён · все серии' : status) : null)));

  const ratingNum = (label, r) => r && h(r.href ? 'a' : 'div', { class: 'rz-rnum', href: r.href || null, target: r.href ? '_blank' : null, rel: r.href ? 'noopener' : null },
    h('b', {}, r.v), h('span', {}, label), r.n ? h('small', {}, groups(r.n) + ' ' + plural(+r.n.replace(/\D/g, '') % 100, 'голос', 'голоса', 'голосов')) : null);

  // Rezka widgets, moved as-is so their handlers keep working
  const rateWidget = $('.b-post__rating_table');
  const trailer = $('.b-sidelinks__link.show-trailer');
  const fav = $('.b-sideactions__fav');
  if (trailer) { trailer.classList.add('rz-btn', 'rz-o'); trailer.innerHTML = '<span aria-hidden="true" style="display:grid">' + ICON.play + '</span>Трейлер'; }
  if (fav) { // Rezka rewrites this button when the state changes: keep our short label
    const label = () => { const b = $('.btn', fav); if (!b || b.dataset.rz === b.textContent) return; const inFav = !/добав/i.test(b.textContent); b.textContent = inFav ? 'В закладках' : 'В закладки'; b.dataset.rz = b.textContent; b.classList.toggle('rz-in', inFav); };
    label(); new MutationObserver(label).observe(fav, { childList: true, subtree: true, characterData: true });
  }

  // «Смотреть» scrolls to the player and starts it (player.js listens for rz-play); «Продолжить · S×E» when it's in the history
  const ctaLabel = h('span', {}, 'Смотреть');
  const cta = h('a', { class: 'rz-btn rz-y', href: '#rz-watch', onclick: (e) => {
    e.preventDefault();
    $('#cdnplayer-container')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    document.dispatchEvent(new CustomEvent('rz-play'));
  } }, h('span', { html: ICON.play, style: 'display:grid' }), ctaLabel);
  loadContinue().then((list) => {
    const r = list.find((x) => samePage(x.href));
    if (!r) return;
    const m = (r.last || '').match(SE);
    ctaLabel.textContent = m ? `Продолжить · ${m[1]}×${m[2]}` : 'Продолжить';
  }).catch(() => {});

  const theaterBtn = h('button', { class: 'rz-btn rz-o rz-theater-btn', type: 'button', 'aria-pressed': 'false', onclick: () => toggleTheater() },
    h('span', { html: ICON.theater, style: 'display:grid' }), 'Кинотеатр', h('span', { class: 'rz-kbd' }, 'T'));

  const listsCell = rows['Входит в списки'];
  const lists = listsCell ? $$('a', listsCell).map((a) => {
    const place = a.nextSibling?.textContent?.match(/\((\d+)\s*место\)/)?.[1];
    return h('a', { class: 'rz-listrow', href: a.getAttribute('href') }, h('b', { class: 'rz-d' }, place ? '№' + place : '·'), h('span', { class: 'rz-d8' }, txt(a)));
  }) : [];

  const posterImg = poster ? h('img', { class: 'rz-tposter', src: poster, alt: 'Постер: ' + title }) : null;
  const main = h('section', { class: 'rz-wrap rz-tmain' },
    h('div', { class: 'rz-tl' },
      h('div', { class: 'rz-rates' }, ratingNum('IMDb', imdb), ratingNum('Кинопоиск', kp), ratingNum('Зрители Rezka', viewers)),
      rateWidget ? h('div', { class: 'rz-myrate' }, h('span', { class: 'rz-lbl' }, 'Ваша оценка'), rateWidget) : null,
      h('div', { class: 'rz-tact' }, cta, trailer, fav, theaterBtn)),
    h('aside', { class: 'rz-tr' }, posterImg, lists.length ? [h('span', { class: 'rz-lbl' }, 'Входит в списки'), h('div', {}, lists)] : null));

  // ---------- billing block: slogan, cast, directors as poster credits; names stay Rezka links ----------
  const names = (cell) => cell ? $$('a', cell).map((a) => a.cloneNode(true)) : [];
  const join = (els) => els.flatMap((a, i) => [i ? [' ', h('span', { class: 'rz-dot', 'aria-hidden': 'true' }, '·'), ' '] : ' ', a]); // spaces: lines may break between names only
  const cast = names(castCell), dirs = names(rows['Режиссер']);
  const slogan = txt(rows['Слоган']);
  const billing = (slogan || cast.length || dirs.length) ? h('section', { class: 'rz-wrap' }, h('p', { class: 'rz-billing' },
    slogan && slogan !== '-' ? [h('span', { class: 'rz-role' }, 'Слоган'), h('span', { class: 'rz-slogan' }, slogan), h('br')] : null,
    cast.length ? [h('span', { class: 'rz-role' }, 'В ролях'), join(cast), /и другие/.test(txt(castCell)) ? h('span', { class: 'rz-role' }, 'и другие') : null, h('br')] : null,
    dirs.length ? [h('span', { class: 'rz-role' }, dirs.length > 1 ? 'Режиссёры' : 'Режиссёр'), join(dirs)] : null)) : null;

  // ---------- about: description + every Rezka fact ----------
  const facts = h('dl', { class: 'rz-facts' });
  const fact = (label, node) => facts.append(h('dt', {}, label), node);
  if (orig) fact('Оригинал', h('dd', {}, orig));
  const LABEL = { 'Режиссер': 'Режиссёр', 'В качестве': 'Качество' };
  for (const [k, cell] of Object.entries(rows)) if (!['Рейтинги', 'Входит в списки', 'Из серии', 'Слоган'].includes(k)) fact(LABEL[k] || k, h('dd', { html: cell.innerHTML.trim() }));
  if (status) fact('Статус', h('dd', {}, status));
  const series = rows['Из серии'] ? $$('a', rows['Из серии']).map((a) => h('a', { class: 'rz-chip', href: a.getAttribute('href') }, txt(a))) : [];
  const about = h('section', { class: 'rz-wrap rz-tabout' },
    h('div', {},
      h('h2', { class: 'rz-d rz-h2' }, isSeries ? 'О сериале' : 'О фильме'),
      h('p', { class: 'rz-desc' }, txt($('.b-post__description_text'))),
      series.length ? [h('span', { class: 'rz-lbl' }, 'Из серии'), h('div', { class: 'rz-chips' }, series)] : null),
    facts);

  // ---------- voices ----------
  const voices = $('.b-translators__block');
  if (voices) {
    const t = $('.b-translators__title', voices);
    const n = $$('#translators-list .b-translator__item', voices).length;
    for (const node of [...(t?.childNodes || [])]) if (node.nodeType === 3) node.remove();
    t?.prepend(h('span', { class: 'rz-lbl' }, 'Озвучка' + (n ? ' · ' + n : '')));
  }
  const watch = h('section', { id: 'rz-watch', class: 'rz-wrap rz-watch' }, voices);

  // ---------- inside #player: hints + «Сообщи нам» under the video, a heading over the seasons ----------
  const support = $('.b-post__support_holder');
  const hints = h('div', { class: 'rz-pmeta' },
    h('span', { class: 'rz-hints' }, h('span', { class: 'rz-kbd' }, 'T'), 'кинотеатр', h('span', { class: 'rz-kbd' }, '← →'), '±10 секунд', h('span', { class: 'rz-kbd' }, 'Esc'), 'выход'),
    support);
  $('#cdnplayer-container')?.after(hints);
  const omdbNote = h('span', { class: 'rz-omdb', hidden: true });
  const seasonsTabs = $('#simple-seasons-tabs') || $('#simple-episodes-tabs');
  seasonsTabs?.before(h('div', { class: 'rz-seh' }, h('h2', { class: 'rz-d rz-h2' }, 'Сезоны и серии'), omdbNote));

  // ---------- after the player: schedule + franchise, «Смотреть ещё», reviews ----------
  const schedule = $('.b-post__schedule');
  const franchise = $$('.b-post__partcontent_item').map((it) => {
    const a = $('.title a', it) || $('a', it), cur = it.classList.contains('current'), r = txt($('.rating', it));
    return h(cur ? 'div' : 'a', { class: 'rz-fr' + (cur ? ' rz-cur' : ''), href: cur ? null : (a?.getAttribute('href') || it.dataset.url), 'aria-current': cur ? 'page' : null },
      h('b', { class: 'rz-d' }, txt($('.num', it))),
      h('span', {}, h('b', {}, txt($('.title', it)) || txt(a)), h('small', {}, txt($('.year', it)) + (cur ? ' · вы здесь' : ''))),
      /\d/.test(r) ? h('b', { class: 'rz-d rz-frr' }, r) : h('small', { class: 'rz-frr' }, 'нет оценки'));
  });
  const shelf = h('div', { class: 'b-content__inline_items rz-shelf' }, $$('.b-sidelist .b-content__inline_item'));
  const count = txt($('#comments-list-button em'));
  const lower = h('div', { class: 'rz-wrap rz-lower' },
    (schedule || franchise.length) ? h('div', { class: 'rz-low2' + (schedule && franchise.length ? '' : ' rz-one') },
      schedule ? h('section', { class: 'rz-sched' }, h('h2', { class: 'rz-d rz-h2' }, 'График выхода серий'), schedule) : null,
      franchise.length ? h('section', {}, h('h2', { class: 'rz-d rz-h2' }, 'Франшиза'), h('p', { class: 'rz-muted rz-small' }, 'Все части · оценка Кинопоиска'), h('div', { class: 'rz-frlist' }, franchise)) : null) : null,
    shelf.children.length ? h('section', {}, h('div', { class: 'rz-sec-h' }, h('h2', {}, 'Смотреть ещё')), shelf) : null,
    h('section', { class: 'rz-reviews' },
      h('div', { class: 'rz-sec-h' }, h('h2', {}, 'Отзывы', count ? h('span', { class: 'rz-cnt' }, ' ' + groups(count)) : null)),
      h('div', { class: 'rz-rev' },
        h('div', { class: 'rz-rev-list' }, $('#hd-comments-list'), $('#hd-comments-navigation')),
        h('aside', { class: 'rz-rev-form' }, h('h3', { class: 'rz-d' }, 'Ваш отзыв'), $('#comments-form')))));

  const content = $('.b-container.b-content') || $('#player').closest('.b-content__columns');
  content.before(h('div', { id: 'rz-title' }, field, main, billing, about, watch));
  content.after(lower);

  // the poster starts inside the colour field: pull it up by the field's height
  if (posterImg) new ResizeObserver(() => { posterImg.style.marginTop = -(field.offsetHeight - 36) + 'px'; }).observe(field);

  if ((await settings()).theaterDefault && $('#cdnplayer-container')) { root.classList.add('rz-theater'); theaterBtn.setAttribute('aria-pressed', 'true'); }

  // ---------- schedule: short season titles, «5×16» codes ----------
  const tidySchedule = () => {
    for (const t of $$('.b-post__schedule_block_title .title:not([data-rz])')) { t.dataset.rz = '1'; t.textContent = txt(t).replace(/^.*?(\d+)\s*сезона?$/, '$1 сезон'); }
    for (const td of $$('.b-post__schedule_table td.td-1:not([data-rz])')) { const m = txt(td).match(SE); td.dataset.rz = '1'; if (m) td.textContent = `${m[1]}×${m[2]}`; }
  };
  if (schedule) { tidySchedule(); new MutationObserver(tidySchedule).observe(schedule, { childList: true, subtree: true }); }

  if (isSeries) seriesBoard(omdbNote);
}

// ======================= seasons and the episode board (+ IMDb per episode from OMDb) =======================
function seriesBoard(note) {
  // names, dates and watched marks come from Rezka's schedule table
  const sched = () => {
    const map = {};
    for (const tr of $$('.b-post__schedule_table tr')) {
      const td1 = $('td.td-1', tr); if (!td1) continue;
      const id = td1.dataset.id, code = txt(td1).match(SE) || txt(td1).match(/(\d+)×(\d+)/);
      if (!code) continue;
      map[code[1] + ':' + code[2]] = { name: txt($('td.td-2 b', tr)), orig: txt($('td.td-2 span', tr)), date: txt($('td.td-4', tr)), watched: !!$('.watch-episode-action.watched', tr), id };
    }
    return map;
  };
  const imdbId = (() => {
    const b64 = ($('.b-post__info_rates.imdb a')?.getAttribute('href') || '').match(/\/help\/([^/]+)/)?.[1];
    try { return b64 && decodeURIComponent(atob(b64)).match(/tt\d+/)?.[0]; } catch { return null; }
  })();
  const TTL = 7 * 24 * 3600 * 1000;
  const pending = new Map();
  let failed = null; // one OMDb failure (bad key, daily limit) stops all further requests on this page
  const season = async (n, apiKey) => {
    const key = `omdb:${imdbId}:${n}`;
    const hit = (await chrome.storage.local.get(key))[key];
    if (hit && Date.now() - hit.at < TTL) return hit.map;
    if (failed) return {};
    const data = await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${imdbId}&Season=${n}`)).json();
    if (data.Response !== 'True') {
      if (/key|limit/i.test(data.Error || '')) failed = /limit/i.test(data.Error) ? 'limit' : 'key';
      if (failed === 'key') chrome.storage.local.set({ omdbBad: apiKey }); // don't ask again with this key on every page
      return {};
    }
    const map = {};
    for (const ep of data.Episodes) if (ep.imdbRating !== 'N/A') map[ep.Episode] = ep.imdbRating;
    await chrome.storage.local.set({ [key]: { at: Date.now(), map } });
    return map;
  };
  const say = (text, action) => {
    note.hidden = false;
    note.replaceChildren(text, action ? h('button', { class: 'rz-link', type: 'button', onclick: openSettings }, action) : null);
  };

  const paint = async () => {
    for (const s of $$('.b-simple_season__item:not([data-rz])')) {
      const n = $$(`#simple-episodes-list-${s.dataset.tab_id} .b-simple_episode__item`).length;
      s.dataset.rz = '1';
      s.innerHTML = `<b>${s.dataset.tab_id}</b><span>${n ? n + ' ' + plural(n, 'серия', 'серии', 'серий') : ''}</span>`;
      s.setAttribute('aria-label', `Сезон ${s.dataset.tab_id}`);
    }
    const items = $$('.b-simple_episode__item:not([data-rz])');
    if (!items.length) return;
    const info = sched();
    for (const it of items) {
      const k = it.dataset.season_id + ':' + it.dataset.episode_id, e = info[k] || {};
      it.dataset.rz = '1';
      it.replaceChildren(
        h('span', { class: 'rz-en rz-d' }, it.dataset.episode_id),
        h('span', { class: 'rz-et' }, h('b', {}, e.name || 'Серия ' + it.dataset.episode_id), e.orig ? h('small', {}, e.orig) : null),
        h('span', { class: 'rz-edate' }, e.date || ''),
        h('span', { class: 'rz-ei' }),
        h('span', { class: 'rz-em' }, it.classList.contains('disabled') ? 'нет в этой озвучке' : e.watched ? [h('span', { html: CHECK, style: 'display:grid' }), 'просмотрено'] : null));
      it.title = `${it.dataset.season_id} сезон, ${it.dataset.episode_id} серия` + (e.name ? ' — ' + e.name : '');
    }
    const { omdbKey } = await settings();
    if (!imdbId) return;
    if (!omdbKey) { say('Оценки IMDb по сериям появятся с ключом OMDb.', 'Добавить ключ'); return; }
    if (!failed && (await chrome.storage.local.get('omdbBad')).omdbBad === omdbKey) failed = 'key';
    for (const s of new Set(items.map((it) => it.dataset.season_id))) {
      if (!pending.has(s)) pending.set(s, season(s, omdbKey).catch(() => { pending.delete(s); return {}; }));
      const map = await pending.get(s);
      for (const it of items.filter((x) => x.dataset.season_id === s)) {
        const r = parseFloat(map[it.dataset.episode_id]);
        if (r) $('.rz-ei', it).replaceChildren(r.toFixed(1), h('small', {}, 'IMDb'));
      }
    }
    if (failed === 'key') say('Ключ OMDb не принят, оценок IMDb у серий нет —', 'открыть настройки');
    else if (failed === 'limit') say('Лимит OMDb на сегодня исчерпан (1000 запросов). Новые оценки появятся завтра.', null);
  };
  paint();
  let timer;
  // Rezka re-renders seasons/episodes on a voice change; our player bar inside #cdnplayer-container changes 4×/s and is ignored
  new MutationObserver((recs) => { if (recs.some((r) => !r.target.closest?.('#cdnplayer-container'))) { clearTimeout(timer); timer = setTimeout(paint, 120); } })
    .observe($('#player') || document.body, { childList: true, subtree: true });
}
