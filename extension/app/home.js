// home.js — the home page (/ and /page/N/). Design: canvas «Темы · Главная» (T-Home).
import { $, $$, h, txt, loggedIn, loadContinue } from './core.js';

// Hot series updates: one row per episode, all voices in it
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
      i.textContent = '(' + first.voices.join(', ') + ')';
      li.style.display = 'none';
    }
  }
};

export async function run() {
  document.documentElement.classList.add('rz-list');
  const updates = $('.b-seriesupdate__block')?.parentElement;
  if (updates) {
    groupUpdates();
    new MutationObserver(groupUpdates).observe(updates, { childList: true, subtree: true });
  }
  if (loggedIn) {
    loadContinue().then((rows) => {
      if (!rows.length) return;
      const anchor = $('.b-newest_slider_wrapper') || $('.b-container.b-content');
      anchor?.before(h('section', { class: 'rz-wrap rz-cont' },
        h('div', { class: 'rz-sechead' }, h('h2', { class: 'rz-h2' }, 'Продолжить просмотр'), h('a', { class: 'rz-link', href: '/continue/' }, 'Вся история')),
        h('div', { class: 'rz-contgrid' }, rows.slice(0, 6).map((r) => h('a', { class: 'rz-contcard', href: r.href },
          r.cover ? h('img', { src: r.cover, alt: '' }) : null,
          h('span', { class: 'rz-contbody' }, h('b', {}, r.title), h('span', {}, r.last || r.date),
            r.more ? h('span', { class: 'rz-contmore' }, r.more.replace(/^смотреть /, '')) : h('span', { class: 'rz-muted' }, r.date)))))));
    }).catch((e) => console.warn('[rezka-redesign]', e));
  }
}
