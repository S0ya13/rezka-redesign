// lists.js — catalogues, genres, «Новинки», search, announce, collections and person pages.
// Design: canvas «Раунд 4» (L-Catalog, L-Search, L-Collections, L-Collection, L-Announce, P-Person).
import { $, $$, h, txt, here, shortTitle } from './core.js';

const NAV = [['/films/'], ['/series/'], ['/cartoons/'], ['/animation/']];

export async function run() {
  document.documentElement.classList.add('rz-list');
  const main = $('.b-content__main') || $('#main');

  // search: filter results by type
  if (here.startsWith('/search/')) {
    const items = $$('.b-content__inline_items .b-content__inline_item');
    const kinds = [['Все', null], ['Фильмы', 'films'], ['Сериалы', 'series'], ['Мультфильмы', 'cartoons'], ['Аниме', 'animation']];
    const kindOf = (it) => $('.cat', it)?.classList[1];
    const chips = kinds.map(([name, k]) => [name, k, items.filter((it) => !k || kindOf(it) === k).length]).filter(([, k, n]) => !k || n);
    if (chips.length > 2) {
      const nav = h('nav', { class: 'rz-genres rz-kinds', 'aria-label': 'Тип' });
      const pick = (k) => { for (const it of items) it.style.display = !k || kindOf(it) === k ? '' : 'none'; $$('a', nav).forEach((a) => a.toggleAttribute('aria-current', a.dataset.k === String(k))); };
      nav.append(...chips.map(([name, k, n]) => h('a', { class: 'rz-tag', href: '#', 'data-k': String(k), onclick: (e) => { e.preventDefault(); pick(k); } }, name, h('span', { class: 'rz-muted' }, ' ' + n))));
      $('.b-content__inline_items')?.before(nav);
      pick(null);
    }
  }

  // "Смотреть сериалы в HD онлайн" -> "Сериалы"
  const h1 = $('.b-content__htitle h1');
  if (h1) h1.textContent = shortTitle(txt(h1));
  // genres live only in Rezka's dropdown menu: show them as chips under the sort tabs
  const section = NAV.find(([href]) => here.startsWith(href));
  const filters = $('.b-content__main_filters');
  if (section && filters) {
    const li = $$('#topnav-menu > li').find((l) => $('a', l)?.getAttribute('href') === section[0]);
    const seen = new Set([section[0]]);
    const genres = li ? $$('a', li).filter((a) => txt(a) && !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href'))) : [];
    if (genres.length) filters.after(h('nav', { class: 'rz-genres', 'aria-label': 'Жанры' },
      h('a', { class: 'rz-tag', href: section[0], 'aria-current': here === section[0] ? 'page' : null }, 'Все жанры'),
      genres.map((a) => h('a', { class: 'rz-tag', href: a.getAttribute('href'), 'aria-current': here.startsWith(a.getAttribute('href')) ? 'page' : null }, txt(a)))));
  }
  void main;
}
