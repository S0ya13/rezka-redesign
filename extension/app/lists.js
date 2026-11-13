// lists.js — catalogues, genres, «Новинки», «Лучшие», search, announce, collections and person pages.
// Design: canvas «Раунд 4» (L-Catalog, L-Search, L-Collections, L-Collection, L-Announce, P-Person).
// Rezka's own grids, sort tabs, pagination and widgets stay in place (their handlers keep working); we add a
// glass page head, genre chips, the «Найти лучшие» finder, type filters and restyle the rest in css/lists.css.
import { $, $$, h, txt, here, shortTitle, pageHead } from './core.js';

const SECTIONS = { '/films/': 'фильмы', '/series/': 'сериалы', '/cartoons/': 'мультфильмы', '/animation/': 'аниме' };
const COUNTRY = /^(Русские|Украинские|Зарубежные)$/;
const KIND = { films: 'Фильм', series: 'Сериал', cartoons: 'Мультфильм', animation: 'Аниме' };
// 1 тайтл, 2 тайтла, 5 тайтлов
const plural = (n, [one, few, many]) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

const container = () => $('.b-container.b-content') || $('#main > .b-container') || $('.b-content__columns');
const putHead = (opts) => { const box = container(); if (box) box.before(pageHead(opts)); return box; };
// Rezka's breadcrumbs: «HDREZKA.ME » Сериалы » Драмы» → [['Главная','/'], ['Сериалы','/series/'], ['Драмы']]
const rezkaCrumbs = () => {
  const spans = $$('.b-content__crumbs .speedbar > span');
  return spans.map((s, i) => [i ? txt(s) : 'Главная', i < spans.length - 1 ? $('a', s)?.getAttribute('href') : null]);
};

// Rezka's clickable <i>/<span> controls: focusable, Enter/Space click them (Rezka's own handlers do the rest)
const asButton = (el, ...cls) => {
  el.classList.add('rz-btn', ...cls);
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
};

// Rezka's section copy above the tabs (/new/, /collections/): into the footer «О разделе» when core built it, else below the list
const stashSeo = () => {
  const seo = $('.b-content__section_description');
  if (!seo || seo.closest('.rz-about')) return;
  const about = $('#rz-about');
  if (about) about.append(seo); else { seo.classList.add('rz-seo'); container()?.append(seo); }
};

// ---------- catalogues, genres, «Новинки», «Лучшие», single collections ----------
const catalogue = () => {
  const section = Object.keys(SECTIONS).find((s) => here.startsWith(s));
  const raw = txt($('.b-content__htitle h1'));
  let title, sub;
  const best = raw.match(/^(Лучшие\s+\S+)\s*(.*)$/);
  if (best) [title, sub] = [best[1], best[2] || 'за всё время'];
  else if (here.startsWith('/collections/')) [title, sub] = [shortTitle(raw), 'подборка'];
  else {
    const [first, ...rest] = shortTitle(raw).split(' ');
    title = first;
    sub = [rest.join(' '), /в HD онлайн/i.test(raw) ? 'в HD онлайн' : ''].filter(Boolean).join(' ');
  }
  const crumbs = here.startsWith('/collections/') ? [['Главная', '/'], ['Подборки', '/collections/'], [title]]
    : best && section ? [['Главная', '/'], [SECTIONS[section][0].toUpperCase() + SECTIONS[section].slice(1), section], ['Лучшие']] // Rezka shows none here
    : rezkaCrumbs();
  putHead({ crumbs: crumbs.length > 1 ? crumbs : [], title, sub });

  // «Новинки»: Rezka's type links inside the sort tabs become chips on their own row
  const types = $('.b-content__filters_types');
  if (types) {
    const links = $$('a', types);
    for (const a of links) { a.classList.add('rz-chip'); if (a.classList.contains('active')) a.setAttribute('aria-current', 'true'); }
    types.append(...links.reverse()); // Rezka lists them right-to-left: «Все» last
    $('.filter-text', types)?.replaceChildren('Показывать');
  }
  stashSeo();

  if (!section) return;
  const li = $$('#topnav-menu > li').find((l) => $('a', l)?.getAttribute('href') === section);
  if (!li) return;
  // genre chips: every named link of the section's menu except «Лучшие новинки»
  const seen = new Set([section]);
  const genres = $$('a[href]', li).filter((a) => txt(a) && !/лучшие новинки/i.test(txt(a)) && !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href')));
  const slug = here.slice(section.length).split('/')[0];
  const isGenre = (href) => href === section + slug + '/';
  const chips = h('nav', { class: 'rz-chips rz-genres', 'aria-label': 'Жанры' },
    h('a', { class: 'rz-chip', href: section, 'aria-current': here === section || /^page\//.test(here.slice(section.length)) ? 'page' : null }, 'Все'),
    genres.filter((a) => !COUNTRY.test(txt(a))).map((a) => h('a', { class: 'rz-chip', href: a.getAttribute('href'), 'aria-current': isGenre(a.getAttribute('href')) ? 'page' : null }, txt(a))),
    genres.filter((a) => COUNTRY.test(txt(a))).map((a) => h('a', { class: 'rz-chip rz-chip-c', href: a.getAttribute('href'), 'aria-current': isGenre(a.getAttribute('href')) ? 'page' : null }, txt(a))));

  // «Найти лучшие …»: Rezka's own genre/year options, current genre and year preselected
  const [selG, selY] = [$('select.select-category', li), $('select.select-year', li)];
  let finder = null;
  if (selG && selY) {
    const bestPath = here.match(/\/best\/(?:([a-z-]+)\/)?(?:(\d{4})\/)?/);
    const genreSlug = bestPath ? bestPath[1] : (slug && slug !== 'best' && !/^page$/.test(slug) ? slug : '');
    const g = h('select', { 'aria-label': 'Жанр' }, [...selG.options].map((o) => h('option', { value: o.value, selected: !!genreSlug && o.value === `${section}best/${genreSlug}/` }, o.textContent.trim())));
    const y = h('select', { 'aria-label': 'Год' }, [...selY.options].map((o) => h('option', { value: o.value, selected: bestPath?.[2] === o.value }, o.textContent.trim())));
    finder = h('form', { class: 'rz-finder rz-glass', onsubmit: (e) => { e.preventDefault(); location.href = g.value + (y.value !== '0' ? y.value + '/' : ''); } },
      h('b', {}, 'Найти лучшие ' + SECTIONS[section]), g, y, h('button', { class: 'rz-btn rz-y rz-sm', type: 'submit' }, 'Найти'));
  }
  const anchor = $('.b-content__main_filters') || $('.b-content__inline');
  if (anchor?.classList.contains('b-content__main_filters')) anchor.after(chips, finder || '');
  else anchor?.before(chips, finder || '');
};

// ---------- search ----------
const search = () => {
  const q = new URLSearchParams(location.search).get('q') || txt($('.b-content__htitle h1')).match(/«(.*)»/)?.[1] || '';
  const items = $$('.b-content__inline_items .b-content__inline_item');
  const n = items.length, paged = !!$('.b-navigation');
  putHead({ title: 'Поиск', sub: q ? `по запросу «${q}»` + (n ? ` · ${n} ${plural(n, ['результат', 'результата', 'результатов'])}${paged ? ' на странице' : ''}` : '') : '' });
  if (!n) {
    const info = $('.b-info__page');
    const empty = h('section', { class: 'rz-empty rz-glass' },
      h('h2', { class: 'rz-d' }, 'Ничего не нашлось'),
      h('p', {}, q ? `По запросу «${q}» на Rezka ничего нет.` : 'Введите название фильма, сериала или имя актёра.'),
      h('ul', {}, h('li', {}, 'Проверьте раскладку и опечатки.'), h('li', {}, 'Попробуйте оригинальное название или часть слова.'), h('li', {}, 'Ищите по имени актёра или режиссёра.')),
      h('div', { class: 'rz-chips' }, h('a', { class: 'rz-btn rz-y rz-sm', href: '/new/' }, 'Новинки'), h('a', { class: 'rz-btn rz-o rz-sm', href: '/collections/' }, 'Подборки')));
    if (info) info.replaceWith(empty); else $('.b-content__inline')?.prepend(empty);
    return;
  }
  // filter by type, counts from the page; empty types stay visible but disabled
  const kindOf = (it) => $('.cat', it)?.classList[1];
  const kinds = [['Все', null], ['Фильмы', 'films'], ['Сериалы', 'series'], ['Мультфильмы', 'cartoons'], ['Аниме', 'animation']];
  const nav = h('nav', { class: 'rz-chips rz-kinds', 'aria-label': 'Тип' });
  const pick = (k) => {
    for (const it of items) it.hidden = !!k && kindOf(it) !== k;
    for (const b of $$('button', nav)) b.setAttribute('aria-pressed', String(b.dataset.k === String(k)));
  };
  for (const [name, k] of kinds) {
    const c = items.filter((it) => !k || kindOf(it) === k).length;
    nav.append(h('button', { class: 'rz-chip', type: 'button', 'data-k': String(k), 'aria-disabled': c ? null : 'true', disabled: !c, onclick: () => pick(k) }, name, h('span', { class: 'rz-n' }, String(c))));
  }
  $('.b-content__inline')?.before(nav);
  pick(null);
};

// ---------- collections list ----------
const collections = () => {
  putHead({ title: 'Подборки', sub: 'фильмов, сериалов и мультфильмов' });
  stashSeo();
  for (const it of $$('.b-content__collections_item')) {
    const num = $('.num', it), n = parseInt(txt(num), 10);
    if (num && n) num.textContent = `${n} ${plural(n, ['тайтл', 'тайтла', 'тайтлов'])}`;
    $('.title-layer', it)?.append(num || '');
    // a clipping frame, so the cover can zoom on hover without spilling over its neighbours
    const img = $('img.cover', it);
    if (img && !img.parentElement.classList.contains('rz-cv')) { const cv = h('span', { class: 'rz-cv' }); img.before(cv); cv.append(img); }
  }
};

// ---------- announce: the trailer is the main action of every card ----------
const announce = () => {
  const box = putHead({ title: 'Анонсы', sub: txt($('.b-content__htitle h1')) });
  const desc = $('.b-content__section_description');
  if (desc && box) $('.rz-phead .rz-sub')?.after(desc);
  for (const it of $$('.b-content__inline_items .b-content__inline_item')) {
    const tr = $('.trailer', it), link = $('.b-content__inline_item-link', it);
    if (!link) continue;
    if (tr) { asButton(tr, 'rz-y', 'rz-sm', 'rz-trbtn'); $('b', tr)?.replaceChildren('Трейлер'); link.after(tr); }
    else link.after(h('span', { class: 'rz-notr' }, 'Трейлера пока нет'));
  }
};

// ---------- person ----------
const person = () => {
  const name = txt($('.b-post__title .t1')) || txt($('.b-post__title h1')), orig = txt($('.b-post__title .t2'));
  const career = $$('.b-post__info tr').find((tr) => /Карьера/.test(txt(tr)));
  const cover = $('.b-sidecover');
  putHead({ crumbs: [['Главная', '/'], [name]], title: name, sub: [orig, txt(career?.children[1])].filter(Boolean).join(' · '), aside: cover });
  // facts stay Rezka's table; «Смотреть все N фото» goes under the portrait (thumbnails stay in the DOM for Rezka's lightbox)
  const gallery = $('.b-person__gallery_holder');
  if (gallery) { gallery.closest('tr')?.setAttribute('hidden', ''); if (cover) cover.append(gallery); else $('.b-post__infotable')?.after(gallery); }
  const show = $('.b-person__gallery_show', gallery || document);
  if (show) asButton(show, 'rz-o', 'rz-sm');
  // cards: Rezka puts the Кинопоиск rating in the type chip; the chip gets the type back, the rating goes under the title
  for (const r of $$('.b-person__career .b-category-bestrating')) {
    const v = txt(r).replace(/[()]/g, ''), item = r.closest('.b-content__inline_item'), cat = r.closest('.cat');
    if (!v || !item) continue;
    $('.b-content__inline_item-link', item)?.append(h('span', { class: 'rz-kp' }, h('b', {}, v), h('small', {}, 'Кинопоиск')));
    r.closest('.entity')?.replaceChildren(KIND[cat?.classList[1]] || '');
  }
  // filmography: one tab per career section, Rezka's lists and «Показать все» stay as they are
  const parts = $$('.b-person__career');
  if (!parts.length) return;
  const tabs = h('nav', { class: 'rz-tabs rz-ptabs', role: 'tablist', 'aria-label': 'Фильмография' });
  const open = (i) => parts.forEach((p, j) => { p.hidden = i !== j; tabs.children[j].setAttribute('aria-selected', String(i === j)); });
  parts.forEach((p, i) => {
    const h2 = $('h2', p), n = $$('.b-content__inline_item', p).length;
    p.id = p.id || 'rz-career-' + i;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-label', txt(h2));
    tabs.append(h('button', { class: 'rz-tab', type: 'button', role: 'tab', 'aria-controls': p.id, onclick: () => open(i) }, txt(h2), h('span', { class: 'rz-tab-n' }, String(n))));
    const more = $('.b-person__career_more', p);
    if (more) asButton(more, 'rz-o', 'rz-sm');
  });
  parts[0].before(h('h2', { class: 'rz-ftitle rz-d' }, 'Фильмография'), tabs);
  const fromHash = parts.findIndex((p) => location.hash && $(location.hash.replace(/[^#\w-]/g, ''), p));
  open(Math.max(0, fromHash));
};

export async function run() {
  document.documentElement.classList.add('rz-list');
  // Rezka's pagination arrows are empty sprites: name them
  for (const [sel, label] of [['.b-navigation__prev', 'Предыдущая страница'], ['.b-navigation__next', 'Следующая страница']])
    for (const s of $$(sel)) (s.closest('a') || s.parentElement).setAttribute('aria-label', label);
  if (here.startsWith('/person/')) person();
  else if (here.startsWith('/search/')) search();
  else if (/^\/collections\/(page\/\d+\/)?$/.test(here)) collections();
  else if (here.startsWith('/announce/')) announce();
  else catalogue();
}
