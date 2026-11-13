// account.js — history (/continue/), bookmarks (/favorites/) and profile settings (/settings/).
// Design: canvas «Раунд 4» (U-Library, U-Settings).
import { $, $$, h, here } from './core.js';

export async function run() {
  document.documentElement.classList.add('rz-list');
  const main = $('.b-content__main') || $('#main');
  // bookmarks + history: one switcher on both pages; history rows get covers
  if (/^\/(favorites|continue)\//.test(here)) {
    const isHist = here.startsWith('/continue/');
    const hTitle = $('.b-content__htitle h1') || $('h1', main);
    if (hTitle) {
      hTitle.textContent = isHist ? 'История' : 'Закладки';
      hTitle.closest('.b-content__htitle')?.after(h('nav', { class: 'rz-switch', 'aria-label': 'Раздел' },
        h('a', { href: '/favorites/', 'aria-current': isHist ? null : 'page' }, 'Закладки'),
        h('a', { href: '/continue/', 'aria-current': isHist ? 'page' : null }, 'История просмотра')));
    }
    for (const a of $$('.b-videosaves__list_item .title a[data-cover_url]')) a.closest('.title').prepend(h('img', { class: 'rz-hcover', src: a.dataset.cover_url, alt: '' }));
  }
}
