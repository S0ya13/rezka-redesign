// account.js — history (/continue/), bookmarks (/favorites/) and profile settings (/settings/ → /user/<id>/…).
// Design: canvas «Раунд 4» (U-Library, U-Settings). Rezka's rows, controls and forms stay where its handlers expect them:
// we add covers, month headers and labels, rewrite plain-text nodes and restyle the rest in css/account.css.
import { $, $$, h, txt, here, loggedIn, pageHead, openSettings, ICON } from './core.js';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
const titles = (n) => `${n} ${plural(n, 'тайтл', 'тайтла', 'тайтлов')}`;

// Rezka writes «Сегодня», «Вчера» or «20-10-2026»
const rowDate = (s) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (/сегодня/i.test(s)) return now;
  if (/вчера/i.test(s)) return new Date(now - 864e5);
  const m = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  return m ? new Date(+m[3], m[2] - 1, +m[1]) : null;
};

// «История · 28 / Закладки» on the colour field, links between the two pages
const switcher = (isHist, n) => h('nav', { class: 'rz-ftabs', 'aria-label': 'Раздел' },
  h('a', { class: 'rz-ftab', href: '/continue/', 'aria-current': isHist ? 'page' : null }, 'История', n ? h('small', {}, String(n)) : null),
  h('a', { class: 'rz-ftab', href: '/favorites/', 'aria-current': isHist ? null : 'page' }, 'Закладки'));

const head = (box, isHist, sub, n) => box.before(pageHead({ title: isHist ? 'История' : 'Закладки', sub, aside: switcher(isHist, n) }));

// ---------- guest: Rezka's «only for registered users» message inside an invite to log in ----------
const guest = (box, isHist) => {
  head(box, isHist);
  const msg = $('.b-info__message', box);
  box.classList.add('rz-guest');
  box.prepend(h('section', { class: 'rz-invite rz-glass' },
    msg ? h('p', { class: 'rz-invite-k' }, txt(msg)) : null,
    h('h2', { class: 'rz-d' }, isHist ? 'Войдите, чтобы видеть историю' : 'Войдите, чтобы видеть закладки'),
    h('p', {}, isHist ? 'Rezka запоминает, на какой серии и в какой озвучке вы остановились, только для вошедших. После входа здесь появится «Продолжить просмотр».'
      : 'Закладки и разделы для них хранятся в аккаунте Rezka. Войдите или зарегистрируйтесь — это займёт минуту.'),
    h('div', { class: 'rz-row' },
      h('a', { class: 'rz-btn rz-y', href: $('.b-tophead__login')?.getAttribute('href') || '/login/' }, 'Войти'),
      h('a', { class: 'rz-btn rz-o', href: '/registration/' }, 'Регистрация'))));
};

// ---------- history ----------
const history = (box) => {
  const rows = $$('#videosaves-list .b-videosaves__list_item[id]');
  head(box, true, `Продолжить просмотр · ${titles(rows.length)}`, rows.length);
  const today = rowDate('сегодня');
  let group = null, groupHead = null, groupN = 0;
  const closeGroup = () => { if (groupHead) $('span', groupHead).textContent = titles(groupN); };
  for (const row of rows) {
    const dateCell = $('.date', row), d = rowDate(txt(dateCell));
    // a header before each month; Rezka puts watched titles last, they get their own group
    const watched = row.classList.contains('watched-row');
    const key = watched ? 'w' : d ? d.getFullYear() * 12 + d.getMonth() : 'other';
    if (key !== group) {
      closeGroup();
      group = key; groupN = 0;
      groupHead = h('div', { class: 'rz-month', role: 'heading', 'aria-level': '2' },
        h('b', { class: 'rz-d' }, watched ? 'Просмотрено' : d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : 'Раньше'), h('span'));
      row.before(groupHead);
    }
    groupN++;
    if (d && dateCell) dateCell.textContent = +d === +today ? 'Сегодня' : +d === +today - 864e5 ? 'Вчера' : `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;

    // cover, then «(2005-2020, проект завершен)» as years + a chip
    const title = $('.title', row), a = $('a', title), small = $('small', title);
    if (a?.dataset.cover_url) row.insertBefore(h('img', { class: 'rz-hcov', src: a.dataset.cover_url, alt: '', loading: 'lazy' }), title);
    else row.insertBefore(h('span', { class: 'rz-hcov rz-hcov-none', 'aria-hidden': 'true' }, txt(a).slice(0, 2)), title);
    if (small) {
      const done = /проект заверш/i.test(txt(small));
      const years = txt(small).replace(/^\(|\)$/g, '').replace(/,?\s*проект завершен/i, '').replace(/-/g, '–').replace('...', '…').trim();
      small.replaceWith(h('div', { class: 'rz-hy' }, years ? h('span', {}, years) : null, done ? h('span', { class: 'rz-done' }, 'проект завершён') : null));
    }

    // «9 сезон 3 серия (Субтитры)» → big «9 сезон · 3 серия» + translator; films: «Фильм» + translator
    const info = $('.info', row), node = info && [...info.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    const ep = node?.textContent.trim().match(/^(\d+)\s*сезон\s*(\d+)\s*серия\s*(?:\((.+)\))?$/);
    if (node) node.replaceWith(h('b', { class: 'rz-hep' }, ep ? `${ep[1]} сезон · ${ep[2]} серия` : 'Фильм'), h('span', { class: 'rz-htr' }, ep ? ep[3] || '' : node.textContent.trim()));
    $$('br', info).forEach((br) => br.remove());

    // a visible «Продолжить/Смотреть» first, then Rezka's own «Отметить как просмотренный» and «Удалить» (named by their title)
    const href = $('a.new-episode', row)?.getAttribute('href') || a?.getAttribute('href');
    if (href) $('.controls', row)?.prepend(h('a', { class: 'rz-btn rz-y rz-sm rz-hgo', href }, h('span', { html: ICON.play, style: 'display:grid' }), ep ? 'Продолжить' : 'Смотреть'));
    for (const c of $$('.controls-holder a', row)) c.setAttribute('role', 'button');
  }
  closeGroup();
};

// ---------- bookmarks: Rezka's sort/type links, folder rail and grid ----------
const favorites = (box) => {
  const empty = !!$('.b-favorites_content__cats_nolist', box);
  const cats = $$('.b-favorites_content__cats_list_item', box).length;
  head(box, false, empty ? 'Мои закладки · пока пусто' : `Мои закладки · ${cats} ${plural(cats, 'раздел', 'раздела', 'разделов')}`);
  const filters = $('.b-content__main_filters', box), inner = $('.b-content__inline_inner', box);
  for (const a of $$('a', filters || box)) {
    if (!a.matches('.b-content__main_filters_link, .filter-link')) continue;
    a.classList.add('rz-chip');
    if (a.classList.contains('active')) a.setAttribute('aria-current', 'true');
  }
  $('.filter-text', filters || box)?.replaceChildren('Показывать');
  // filters sit above the grid, next to the folder rail
  if (filters && inner) $('.b-favorites_content__holder', inner)?.before(filters);
  inner?.classList.toggle('rz-fav-empty', empty);
  $('#addcat-fav-name')?.setAttribute('placeholder', 'Название нового раздела');
};

// ---------- settings: Rezka's profile form + our «Расширение» card ----------
const settingsPage = (box, form) => {
  box.before(pageHead({ title: 'Настройки', sub: 'профиль Rezka и расширение' }));
  box.classList.add('rz-settings');
  for (const a of $$('.b-tabs__main_link', form)) {
    if (/promotion|payments/.test(a.getAttribute('href') || '')) a.closest('li').hidden = true; // no premium
    else { a.classList.add('rz-chip'); if (a.classList.contains('active')) a.setAttribute('aria-current', 'page'); }
  }
  form.prepend(h('div', { class: 'rz-card-h' }, h('h2', { class: 'rz-d' }, 'Профиль Rezka'), h('span', { class: 'rz-hint' }, 'хранится на Rezka')));
  // the avatar is a file picker over the picture: say so
  const pick = $('#choose-avatar', form);
  if (pick) { pick.setAttribute('aria-label', 'Загрузить фото'); pick.closest('.b-userprofile__avatar_wrapper')?.append(h('span', { class: 'rz-hint' }, 'Нажмите на аватар, чтобы загрузить фото')); }
  const keys = [['/', 'фокус в поиск', 'везде'], ['T', 'кинотеатр вкл/выкл', 'страница тайтла'], ['Esc', 'выйти из кинотеатра, закрыть меню', 'везде'],
    ['← →', '±10 секунд', 'плеер'], ['↑ ↓', 'громкость ±10%', 'плеер'], ['Пробел', 'пауза и продолжение', 'плеер'], ['F', 'полный экран', 'плеер'], ['M', 'звук вкл/выкл', 'плеер'], ['?', 'подсказка с клавишами', 'везде']];
  form.after(h('section', { class: 'rz-extcard rz-glass', 'aria-labelledby': 'rz-h-ext' },
    h('div', { class: 'rz-card-h' }, h('h2', { class: 'rz-d', id: 'rz-h-ext' }, 'Расширение'), h('span', { class: 'rz-hint' }, 'хранится в браузере')),
    h('p', {}, 'Ключ OMDb для оценок IMDb по сериям, кинотеатр по умолчанию и превью карточек при наведении. Тема и цвет — в шапке.'),
    h('div', {}, h('button', { class: 'rz-btn rz-y', type: 'button', onclick: openSettings }, h('span', { html: ICON.gear, style: 'display:grid' }), 'Настройки расширения')),
    h('h3', { class: 'rz-lbl2' }, 'Горячие клавиши'),
    h('div', { class: 'rz-keys' }, keys.map(([k, d, w]) => [h('span', { class: 'rz-kbd' }, k), h('span', {}, d), h('small', {}, w)]))));
};

export async function run() {
  const box = $('.b-container.b-content') || $('#main');
  if (!box) return;
  const form = $('form#userinfo');
  if (form) return settingsPage(box, form);
  if (!/^\/(continue|favorites)\//.test(here)) return;
  const isHist = here.startsWith('/continue/');
  if (!loggedIn) return guest(box, isHist);
  (isHist ? history : favorites)(box);
}
