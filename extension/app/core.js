// core.js — shared by every page: helpers, themes, the light layer, header (nav, mega menu, search,
// theme picker, profile menu), footer, hotkeys, card hover preview and our own settings dialog.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
};
export const txt = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim();
export const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
export const post = (url, body) => fetch(url, { method: 'POST', credentials: 'include', body,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' } });
export const root = document.documentElement;
export const here = location.pathname;
export const loggedIn = ($('#member_user_id')?.value || '0') !== '0';
export const isTitle = !!$('.b-post__title') && !!$('.b-post__info') && !here.startsWith('/person/'); // person pages reuse Rezka's post markup
export const samePage = (href) => { try { return new URL(href, location.href).pathname === location.pathname; } catch { return false; } };

const svg = (d, w = 22, extra = '') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 18),
  bookmark: svg('<path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  user: svg('<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/>', 20),
  chev: svg('<path d="m6 9 6 6 6-6"/>', 16),
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 20),
  theater: svg('<rect x="2.5" y="6" width="19" height="12" rx="1.5"/>', 20),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>', 20),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2-.4-1.2.2-2.3 1.5-2.3H17a4 4 0 0 0 4-4C21 7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.3" r="1"/><circle cx="14.5" cy="7.3" r="1"/>', 20),
  logout: svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>', 20),
  list: svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', 20),
  keyboard: svg('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>', 20),
  home: svg('<path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>', 20),
};

// ===================== Themes =====================
// [id, name, group, swatch] — the colours themselves live in css/theme.css
export const PALETTES = [
  ['sumerki', 'Сумерки', 'one', '#3A4A8A'], ['kobalt', 'Кобальт', 'one', '#2B4AE0'], ['nefrit', 'Нефрит', 'one', '#0B7A62'],
  ['iris', 'Ирис', 'one', '#6A45F0'], ['barhat', 'Бархат', 'one', '#7A2434'], ['ohra', 'Охра', 'one', '#C8923A'],
  ['zakat', 'Закат', 'two', 'linear-gradient(135deg,#4F46E5,#C93A4F)'], ['laguna', 'Лагуна', 'two', 'linear-gradient(135deg,#0F766E,#2563EB)'],
  ['sorbet', 'Сорбет', 'two', 'linear-gradient(135deg,#C2410C,#BE185D)'],
  ['avrora', 'Аврора', 'many', 'linear-gradient(135deg,#0F766E,#2563EB,#7C3AED,#BE185D)'], ['rassvet', 'Рассвет', 'many', 'linear-gradient(135deg,#C2410C,#BE185D,#6D28D9)'],
  ['prizma', 'Призма', 'many', 'linear-gradient(135deg,#B91C1C,#B45309,#15803D,#1D4ED8,#6D28D9)'],
];
const GROUPS = [['one', 'Один цвет'], ['two', 'Два цвета'], ['many', 'Много цветов']];
const MODES = [['dark', 'Тёмная'], ['light', 'Светлая'], ['sys', 'Системная']];
const sysLight = matchMedia('(prefers-color-scheme: light)');
export const theme = { mode: 'dark', palette: 'sumerki' };
const applyTheme = () => {
  const dark = theme.mode === 'sys' ? !sysLight.matches : theme.mode !== 'light';
  root.classList.remove('t-dark', 't-light', ...PALETTES.map(([id]) => 'p-' + id));
  root.classList.add(dark ? 't-dark' : 't-light', 'p-' + theme.palette);
  document.dispatchEvent(new CustomEvent('rz-theme', { detail: { ...theme } }));
};
export const setTheme = (patch) => { Object.assign(theme, patch); applyTheme(); chrome.storage.sync.set({ mode: theme.mode, palette: theme.palette }); };
sysLight.addEventListener('change', () => theme.mode === 'sys' && applyTheme());

// ===================== Small shared pieces =====================
const shared = {};
export const settings = async () => (shared.settings ||= chrome.storage.sync.get({ omdbKey: '', theaterDefault: false, preview: true }));

// Rezka's own /continue/ list (logged-in only), cached for 2 min per tab
export const loadContinue = async () => {
  if (!loggedIn) return [];
  try { const c = JSON.parse(sessionStorage.getItem('rz-continue') || 'null'); if (c && Date.now() - c.at < 120000) return c.rows; } catch {}
  const doc = parse(await (await fetch('/continue/', { credentials: 'include' })).text());
  const rows = $$('.b-videosaves__list_item[id]', doc).map((r) => {
    const a = $('.title a', r), info = $('.info', r), more = txt($('.new-episode', info));
    return { href: a?.getAttribute('href'), title: txt(a), year: txt($('.title small', r)), cover: a?.dataset.cover_url, date: txt($('.date', r)), last: txt(info).replace(more, '').trim(), more };
  }).filter((r) => r.href);
  try { sessionStorage.setItem('rz-continue', JSON.stringify({ at: Date.now(), rows })); } catch {}
  return rows;
};

// page head: a glass colour field with crumbs, a big condensed title and a short subtitle
export const pageHead = ({ crumbs = [], title, sub, aside } = {}) => h('section', { class: 'rz-field rz-phead' },
  h('div', { class: 'rz-wrap' },
    crumbs.length ? h('nav', { class: 'rz-crumbs', 'aria-label': 'Хлебные крошки' },
      crumbs.flatMap(([t, href], i) => [i ? h('span', { 'aria-hidden': 'true' }, '›') : null, href ? h('a', { href }, t) : h('span', { 'aria-current': 'page' }, t)])) : null,
    h('div', { style: 'display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px' },
      h('div', {}, h('h1', { class: 'rz-h1' }, title), sub ? h('p', { class: 'rz-sub' }, sub) : null),
      aside || null)));

// "Смотреть фильмы онлайн в HD" → "Фильмы" + "в HD онлайн"
export const shortTitle = (s) => {
  const t = (s || '').replace(/^Смотреть\s+/i, '').replace(/\s+в\s+HD\s+онлайн$/i, '').replace(/\s+онлайн$/i, '');
  return t.replace(/^./, (c) => c.toUpperCase());
};

// ===================== Modal shell =====================
const motion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
export const modal = (title, body, { field = true } = {}) => {
  const close = () => { if (m.classList.contains('rz-out')) return; m.classList.add('rz-out'); setTimeout(() => m.remove(), motion() ? 180 : 0); prev?.focus?.(); };
  const prev = document.activeElement;
  const m = h('div', { class: 'rz-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: (e) => { if (e.target === m) close(); } },
    h('div', { class: 'rz-dlg' },
      h('div', { class: 'rz-dlg-h' + (field ? ' rz-field' : '') }, h('h2', {}, title), h('button', { class: 'rz-ib', type: 'button', 'aria-label': 'Закрыть', html: ICON.close, onclick: close })),
      h('div', { class: 'rz-dlg-b' }, body)));
  m.close = close;
  document.body.append(m);
  // first control of the body; a read-only dialog (hotkeys) takes focus itself instead of ringing its close button
  const first = $('button, input, a', $('.rz-dlg-b', m)), dlg = $('.rz-dlg', m);
  if (first) first.focus(); else { dlg.tabIndex = -1; dlg.focus(); }
  return m;
};

const showKeys = () => modal('Горячие клавиши', h('div', { class: 'rz-keys' },
  [['/', 'Поиск', 'везде'], ['T', 'Кинотеатр: плеер на всю вкладку', 'страница тайтла'], ['Esc', 'Закрыть меню и окна, выйти из кинотеатра', 'везде'],
    ['← →', '±10 секунд', 'плеер'], ['↑ ↓', 'Громкость ±10%', 'плеер'], ['Пробел', 'Пауза и продолжение', 'плеер'], ['F', 'Полный экран', 'плеер'], ['M', 'Звук вкл/выкл', 'плеер'], ['?', 'Эта подсказка', 'везде']]
    .map(([k, d, w]) => [h('span', { class: 'rz-kbd' }, k), h('span', {}, d), h('small', {}, w)])));

export const openSettings = async () => {
  const s = await settings();
  const key = h('input', { class: 'rz-input', type: 'password', autocomplete: 'off', spellcheck: 'false', value: s.omdbKey, 'aria-describedby': 'rz-omdb-note' });
  const note = h('p', { class: 'rz-note', id: 'rz-omdb-note', hidden: true });
  const say = (ok, t) => { note.hidden = false; note.className = 'rz-note ' + (ok ? 'rz-good' : 'rz-bad'); note.textContent = t; };
  const check = async () => {
    const v = key.value.trim();
    await chrome.storage.sync.set({ omdbKey: v }); s.omdbKey = v;
    if (!v) { say(false, 'Ключ не указан — оценки IMDb по сериям не показываются.'); return; }
    say(true, 'Проверяем…');
    try {
      const r = await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(v)}&i=tt0903747`)).json();
      if (r.Response === 'True') say(true, 'Ключ работает. Оценки IMDb появятся у серий.');
      else say(false, 'Ключ не принят: ' + (r.Error || 'ошибка OMDb') + '. Возьмите бесплатный ключ на omdbapi.com.');
    } catch { say(false, 'OMDb не отвечает. Проверьте интернет и попробуйте ещё раз.'); }
  };
  const theater = h('input', { type: 'checkbox', checked: s.theaterDefault, onchange: () => { s.theaterDefault = theater.checked; chrome.storage.sync.set({ theaterDefault: theater.checked }); } });
  const preview = h('input', { type: 'checkbox', checked: s.preview, onchange: () => { s.preview = preview.checked; chrome.storage.sync.set({ preview: preview.checked }); } });
  modal('Расширение', [
    h('label', { class: 'rz-field-l' }, 'Ключ OMDb для оценок IMDb по сериям', h('div', { style: 'display:flex;gap:8px' }, key, h('button', { class: 'rz-btn rz-y rz-sm', type: 'button', onclick: check }, 'Проверить'))),
    note,
    h('p', { class: 'rz-muted', style: 'margin:0;font-size:14px' }, 'Бесплатный ключ даёт 1000 запросов в сутки, оценки кешируются на неделю.'),
    h('label', { class: 'rz-switch-row' }, 'Включать кинотеатр по умолчанию', theater),
    h('label', { class: 'rz-switch-row' }, 'Превью карточки при наведении', preview),
  ]);
  if (s.omdbKey) check();
};

// ===================== Header =====================
const NAV = [['Фильмы', '/films/', 'фильмы'], ['Сериалы', '/series/', 'сериалы'], ['Мультфильмы', '/cartoons/', 'мультфильмы'], ['Аниме', '/animation/', 'аниме'],
  ['Новинки', '/new/'], ['Анонсы', '/announce/'], ['Подборки', '/collections/']];
const STUDIO = { netflix: 'Netflix', hbo: 'HBO', amazon: 'Amazon', disney: 'Disney', 'apple-tv': 'Apple TV', hulu: 'Hulu', epix: 'Epix' };
const COUNTRY = /^(Русские|Украинские|Зарубежные)$/;

// title URLs carry their section too (/series/thriller/…); Rezka's crumbs link only «Главная»
const currentSection = () => NAV.find(([, href]) => here.startsWith(href))?.[1];

const megaFor = ([name, href, plural]) => {
  const li = $$('#topnav-menu > li').find((l) => $('a', l)?.getAttribute('href') === href);
  if (!li) return null;
  const links = $$('a[href]', li).filter((a) => a.getAttribute('href') !== href);
  const best = links.find((a) => /лучшие новинки/i.test(txt(a)));
  const studios = links.filter((a) => !txt(a) && /\/collections\//.test(a.getAttribute('href')))
    .map((a) => { const slug = a.getAttribute('href').match(/\d+-[a-z]+-(.+?)\/?$/)?.[1] || ''; return [STUDIO[slug] || slug.replace(/-/g, ' '), a.getAttribute('href')]; });
  const seen = new Set();
  const named = links.filter((a) => txt(a) && a !== best && !$('select', a) && !seen.has(txt(a)) && seen.add(txt(a)));
  const genres = named.filter((a) => !COUNTRY.test(txt(a)));
  const countries = named.filter((a) => COUNTRY.test(txt(a)));
  const [selG, selY] = [$('select.select-category', li), $('select.select-year', li)];
  const opts = (sel) => sel ? [...sel.options].map((o) => h('option', { value: o.value }, o.textContent.trim())) : [];
  const g = h('select', { 'aria-label': 'Жанр' }, opts(selG)), y = h('select', { 'aria-label': 'Год' }, opts(selY));
  return h('div', { class: 'rz-mega', hidden: true, id: 'rz-mega-' + href.replace(/\W/g, '') },
    h('div', { class: 'rz-wrap rz-mega-in' },
      h('div', {},
        h('h3', {}, name), h('div', { class: 'rz-mega-big' }, h('a', { href }, 'Все ' + plural), best ? h('a', { href: best.getAttribute('href') }, 'Лучшие новинки') : null),
        studios.length ? [h('h3', { style: 'margin-top:26px' }, 'Студии'), h('div', {}, studios.map(([t, u]) => h('a', { href: u }, t)))] : null),
      h('div', {}, h('h3', {}, 'Жанры'), h('div', { class: 'rz-mega-genres' }, genres.map((a) => h('a', { href: a.getAttribute('href') }, txt(a))))),
      h('div', {}, countries.length ? [h('h3', {}, 'Страна'), h('div', {}, countries.map((a) => h('a', { href: a.getAttribute('href') }, txt(a))))] : null),
      selG && selY ? h('form', { class: 'rz-mega-find', onsubmit: (e) => { e.preventDefault(); location.href = g.value + (y.value !== '0' ? y.value + '/' : ''); } },
        h('b', {}, 'Найти лучшие ' + plural), g, y, h('button', { type: 'submit' }, 'Найти')) : null));
};

const searchBox = () => {
  const input = h('input', { type: 'search', name: 'q', placeholder: 'Фильм, сериал, актёр', autocomplete: 'off', 'aria-label': 'Поиск',
    role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'rz-sugs', 'aria-autocomplete': 'list' });
  const sugs = h('div', { class: 'rz-panel rz-sugs', id: 'rz-sugs', role: 'listbox', hidden: true });
  const form = h('form', { class: 'rz-srch', action: '/search/', method: 'get', role: 'search' },
    h('input', { type: 'hidden', name: 'do', value: 'search' }), h('input', { type: 'hidden', name: 'subaction', value: 'search' }),
    h('span', { html: ICON.search, style: 'display:grid' }), input, h('span', { class: 'rz-kbd', 'aria-hidden': 'true' }, '/'), sugs);
  const q0 = new URLSearchParams(location.search).get('q');
  if (here.startsWith('/search/') && q0) input.value = q0;
  const recent = () => { try { return JSON.parse(localStorage.getItem('rz-recent') || '[]'); } catch { return []; } };
  const remember = (q) => { try { localStorage.setItem('rz-recent', JSON.stringify([q, ...recent().filter((x) => x !== q)].slice(0, 5))); } catch {} };
  form.addEventListener('submit', () => input.value.trim() && remember(input.value.trim()));
  const show = (kids) => { sugs.replaceChildren(...kids); sugs.hidden = !kids.length; input.setAttribute('aria-expanded', String(!sugs.hidden)); };
  let timer, seq = 0;
  const run = () => {
    clearTimeout(timer);
    const v = input.value.trim();
    if (v.length < 2) {
      const r = recent();
      show(r.length ? [h('div', { class: 'rz-pal-l', style: 'padding:8px 12px 4px;font:800 14px/1 var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)' }, 'Недавние запросы'),
        ...r.map((q) => h('a', { class: 'rz-sug', role: 'option', href: '/search/?do=search&subaction=search&q=' + encodeURIComponent(q) }, h('b', {}, q)))] : []);
      return;
    }
    show([h('div', { class: 'rz-sug-skel' }), h('div', { class: 'rz-sug-skel', style: 'width:60%' }), h('div', { class: 'rz-sug-skel', style: 'width:75%' })]);
    const my = ++seq;
    timer = setTimeout(async () => {
      const doc = parse(await (await post('/engine/ajax/search.php', 'q=' + encodeURIComponent(v))).text());
      if (my !== seq) return;
      const rows = $$('.b-search__section_list li a', doc).map((a) => {
        const name = txt($('.enty', a)), rating = txt($('.rating', a));
        const sub = txt(a).replace(name, '').replace(rating, '').trim().replace(/^\(|\)$/g, '');
        return h('a', { class: 'rz-sug', href: a.getAttribute('href'), role: 'option', onclick: () => remember(v) },
          h('b', {}, name), h('small', {}, sub),
          h('span', { class: 'rz-sug-r' }, rating || h('small', {}, 'скоро'), rating ? h('small', {}, 'Кинопоиск') : null));
      });
      const all = $('.b-search__live_all', doc);
      show(rows.length ? [...rows, all ? h('a', { class: 'rz-sug-all', href: all.getAttribute('href'), onclick: () => remember(v) }, txt(all)) : null].filter(Boolean)
        : [h('div', { class: 'rz-sug-empty' }, h('b', {}, `По запросу «${v}» ничего не найдено. `), 'Проверьте раскладку или попробуйте оригинальное название.')]);
    }, 200);
  };
  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('keydown', (e) => {
    const opts = $$('.rz-sug', sugs);
    if (!opts.length || sugs.hidden) return;
    let i = opts.findIndex((o) => o.classList.contains('rz-sel'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      opts[i]?.classList.remove('rz-sel');
      i = e.key === 'ArrowDown' ? (i + 1) % opts.length : (i <= 0 ? opts.length - 1 : i - 1);
      opts[i].classList.add('rz-sel'); opts[i].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); opts[i].click(); location.href = opts[i].href; }
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) { sugs.hidden = true; input.setAttribute('aria-expanded', 'false'); } });
  return { form, input, sugs };
};

const picker = () => {
  const panel = h('div', { class: 'rz-panel rz-pal', role: 'dialog', 'aria-label': 'Тема и цвет', hidden: true });
  const draw = () => panel.replaceChildren(...[
    h('span', { class: 'rz-pal-t' }, 'Тема'),
    h('span', { class: 'rz-pal-l' }, 'Режим'),
    h('div', { class: 'rz-pseg', role: 'radiogroup', 'aria-label': 'Режим' },
      MODES.map(([id, label]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(theme.mode === id), onclick: () => { setTheme({ mode: id }); draw(); } }, label))),
    GROUPS.map(([g, label]) => [h('span', { class: 'rz-pal-l' }, label),
      h('div', { class: 'rz-pgrid', role: 'radiogroup', 'aria-label': label },
        PALETTES.filter((p) => p[2] === g).map(([id, name, , sw]) => h('button', { class: 'rz-popt', type: 'button', role: 'radio', 'aria-checked': String(theme.palette === id),
          onclick: () => { setTheme({ palette: id }); draw(); } }, h('i', { style: 'background:' + sw }), name)))]),
  ].flat(Infinity));
  draw();
  return panel;
};

const avatar = () => { const src = $('.b-tophead__ava img')?.getAttribute('src'); return h('span', { class: 'rz-ava' }, src ? h('img', { src, alt: '' }) : h('span', { html: ICON.user, style: 'display:grid' })); };
const profileMenu = () => {
  const panel = h('div', { class: 'rz-panel rz-menu', role: 'menu', hidden: true });
  const link = (sel) => $(sel)?.getAttribute('href');
  if (loggedIn) {
    const histN = txt($('.b-tophead__contwatch .count')) || (txt($('.b-tophead__contwatch')).match(/\d+/) || [''])[0];
    panel.append(
      h('div', { class: 'rz-menu-who' }, avatar(), h('span', {}, h('b', {}, 'Профиль'), h('small', {}, 'аккаунт Rezka'))),
      h('a', { href: '/continue/', role: 'menuitem', html: ICON.clock }, 'История просмотра', histN ? h('span', { class: 'rz-mi-n' }, histN) : null),
      h('a', { href: link('.b-tophead__favs') || '/favorites/', role: 'menuitem', html: ICON.bookmark }, 'Закладки'),
      h('a', { href: link('.b-tophead-settings') || '/settings/', role: 'menuitem', html: ICON.user }, 'Настройки профиля'),
      h('hr'),
      h('button', { type: 'button', role: 'menuitem', html: ICON.palette, onclick: () => { panel.hidden = true; shared.openPicker(); } }, 'Тема и цвет'),
      h('button', { type: 'button', role: 'menuitem', html: ICON.gear, onclick: () => { panel.hidden = true; openSettings(); } }, 'Настройки расширения'),
      h('button', { type: 'button', role: 'menuitem', html: ICON.keyboard, onclick: () => { panel.hidden = true; showKeys(); } }, 'Горячие клавиши'),
      h('hr'),
      h('a', { href: link('.b-tophead-logout') || '/logout/', role: 'menuitem', html: ICON.logout }, 'Выйти'));
  } else {
    panel.append(
      h('div', { class: 'rz-menu-guest' }, h('b', {}, 'Вы не вошли'), 'История, закладки, оценки и отзывы — после входа в аккаунт Rezka.',
        h('div', { class: 'rz-row' },
          h('button', { class: 'rz-btn rz-y rz-sm', type: 'button', onclick: () => { panel.hidden = true; $('.b-tophead__login')?.click(); } }, 'Войти'),
          h('a', { class: 'rz-btn rz-o rz-sm', href: '/registration/' }, 'Регистрация'))),
      h('hr'),
      h('button', { type: 'button', role: 'menuitem', html: ICON.palette, onclick: () => { panel.hidden = true; shared.openPicker(); } }, 'Тема и цвет'),
      h('button', { type: 'button', role: 'menuitem', html: ICON.gear, onclick: () => { panel.hidden = true; openSettings(); } }, 'Настройки расширения'));
  }
  return panel;
};

// one open popup at a time; Esc and outside clicks close it
const popups = new Set();
const toggler = (btn, panel, { hover = false } = {}) => {
  popups.add([btn, panel]);
  const set = (open) => {
    for (const [b, p] of popups) if (p === panel || open) { const me = p === panel && open; p.hidden = !me; b.setAttribute('aria-expanded', String(me)); }
  };
  let byHover = false, t;
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (byHover && !panel.hidden) { byHover = false; return; } byHover = false; set(panel.hidden); });
  if (hover) {
    // hover intent: open after a short pause, close after a grace period so the pointer can travel into the panel
    const enter = (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(t); if (panel.hidden) t = setTimeout(() => { byHover = true; set(true); }, 120); };
    const leave = (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(t); t = setTimeout(() => set(false), 200); };
    for (const el of [btn, panel]) { el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave); }
  }
  return () => set(true);
};
const closePopups = () => { for (const [b, p] of popups) { p.hidden = true; b.setAttribute('aria-expanded', 'false'); } };

const buildHeader = () => {
  const cur = currentSection();
  const search = searchBox();
  const nav = h('nav', { class: 'rz-nav', 'aria-label': 'Разделы' });
  const megas = [];
  for (const item of NAV) {
    const [name, href] = item;
    const mega = item[2] && megaFor(item);
    if (mega) {
      const b = h('button', { type: 'button', class: href === cur ? 'rz-cur' : null, 'aria-expanded': 'false', 'aria-controls': mega.id }, name, h('span', { html: ICON.chev, style: 'display:grid' }));
      nav.append(b); megas.push(mega); toggler(b, mega, { hover: true });
    } else nav.append(h('a', { href, class: href === cur ? 'rz-cur' : null, 'aria-current': href === cur ? 'page' : null }, name));
  }
  const pal = picker(), menu = profileMenu();
  const palBtn = h('button', { class: 'rz-ib', type: 'button', 'aria-label': 'Тема и цвет', 'aria-expanded': 'false' }, h('span', { class: 'rz-pdot' }));
  const meBtn = h('button', { class: 'rz-ib', type: 'button', 'aria-label': loggedIn ? 'Меню профиля' : 'Войти или зарегистрироваться', 'aria-expanded': 'false', 'aria-haspopup': 'menu' },
    avatar());
  shared.openPicker = toggler(palBtn, pal);
  toggler(meBtn, menu);
  for (const p of [pal, menu, ...megas]) p.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closePopups);
  const header = h('header', { id: 'rz-header' },
    h('div', { class: 'rz-wrap rz-hd-in' },
      h('a', { class: 'rz-ib rz-home', href: '/', 'aria-label': 'Главная', 'aria-current': here === '/' ? 'page' : null, html: ICON.home }),
      nav, h('span', { class: 'rz-grow' }), search.form,
      h('div', { class: 'rz-hd-right' },
        h('a', { class: 'rz-ib', href: '/favorites/', 'aria-label': 'Закладки', html: ICON.bookmark }),
        h('a', { class: 'rz-ib', href: '/continue/', 'aria-label': 'История просмотра', html: ICON.clock }),
        palBtn, meBtn, pal, menu)),
    megas);
  document.body.prepend(header);
  return { header, search };
};

const buildFooter = () => {
  const links = $$('#footer a').filter((a) => txt(a) && !/hdrezka|rezka\./i.test(txt(a)));
  const seo = $('.b-content__description') || $('.b-content__section_description');
  const about = seo ? h('div', { class: 'rz-about', id: 'rz-about', hidden: true }, seo) : null;
  const aboutBtn = about && h('button', { class: 'rz-ftb', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'rz-about',
    onclick: () => { about.hidden = !about.hidden; aboutBtn.setAttribute('aria-expanded', String(!about.hidden)); } }, 'О разделе', h('span', { html: ICON.chev, style: 'display:grid' }));
  document.body.append(h('footer', { id: 'rz-footer' },
    h('div', { class: 'rz-wrap' },
      h('div', { class: 'rz-ft-in' },
        h('nav', { 'aria-label': 'Подвал' }, links.map((a) => h('a', { href: a.getAttribute('href') }, txt(a))))),
      h('div', { class: 'rz-ft-in', style: 'margin-top:24px;justify-content:flex-start' },
        aboutBtn, h('button', { class: 'rz-ftb', type: 'button', onclick: showKeys }, 'Горячие клавиши', h('span', { class: 'rz-kbd' }, '?'))),
      about)));
};

// ===================== Theater (title page) =====================
export const toggleTheater = (on = !root.classList.contains('rz-theater')) => {
  root.classList.toggle('rz-theater', on);
  $$('.rz-theater-btn').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  // YouTube-style: the player fills the window but stays in the page, so you can scroll to episodes and comments
  $(on ? '#cdnplayer-container' : '#rz-watch')?.scrollIntoView({ block: 'start' });
};

// ===================== Card preview on hover (Rezka's quick_content endpoint) =====================
const hoverPreview = () => {
  const quick = new Map();
  const pop = h('div', { class: 'rz-pop', role: 'dialog', hidden: true });
  document.body.append(pop);
  let timer, card = null;
  const hide = () => { pop.hidden = true; card = null; };
  const show = async (c) => {
    const id = c.dataset.id;
    if (!id || !(await settings()).preview) return;
    if (!quick.has(id)) quick.set(id, post('/engine/ajax/quick_content.php', `id=${id}&is_touch=1`).then((r) => r.text()).then(parse).catch(() => null));
    const doc = await quick.get(id);
    if (!doc || card !== c) return;
    const facts = h('dl', {});
    let desc = '';
    for (const b of $$('.b-content__bubble_text, .b-content__bubble_str', doc)) {
      const label = txt($('.label', b)).replace(/:$/, '');
      if (!label) { desc = txt(b); continue; }
      $('.label', b).remove();
      facts.append(h('dt', {}, label === 'Возрастное ограничение' ? 'Возраст' : label), h('dd', {}, txt(b)));
    }
    const rating = txt($('.b-content__bubble_rating b', doc)), votes = txt($('.b-content__bubble_rating', doc)).match(/\(([\d\s]+)\)/)?.[1];
    const trailer = $('.trailer', c);
    pop.replaceChildren(
      h('span', { class: 'rz-pop-k' }, [txt($('.b-content__catlabel', doc)), txt($('.info', c))].filter(Boolean).join(' · ')),
      h('b', { class: 'rz-pop-t' }, txt($('.b-content__bubble_title', doc))),
      rating ? h('div', { class: 'rz-pop-r' }, h('span', {}, h('b', {}, rating), 'зрители Rezka' + (votes ? ' · ' + votes.trim() : ''))) : null,
      desc ? h('p', {}, desc) : null, facts,
      h('div', { class: 'rz-pop-act' },
        h('a', { class: 'rz-btn rz-y rz-sm', href: $('a', c)?.getAttribute('href') }, h('span', { html: ICON.play, style: 'display:grid' }), 'Смотреть'),
        trailer ? h('button', { class: 'rz-btn rz-o rz-sm', type: 'button', onclick: () => trailer.click() }, 'Трейлер') : null));
    const r = c.getBoundingClientRect(), w = 360;
    pop.hidden = false;
    pop.style.left = Math.max(8, r.right + 14 + w < innerWidth ? r.right + 14 : r.left - 14 - w) + 'px';
    pop.style.top = Math.max(76, Math.min(r.top, innerHeight - pop.offsetHeight - 16)) + 'px';
  };
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.rz-pop')) { clearTimeout(timer); return; }
    const c = e.target.closest('.b-content__inline_items .b-content__inline_item');
    if (c === card) return;
    clearTimeout(timer);
    if (!c) { timer = setTimeout(hide, 200); return; }
    hide(); card = c;
    timer = setTimeout(() => show(c), 450);
  });
  addEventListener('scroll', hide, { passive: true });
};

// ===================== Boot =====================
export async function init() {
  Object.assign(theme, await chrome.storage.sync.get({ mode: 'dark', palette: 'sumerki' }));
  applyTheme();
  root.classList.add('rz-on');
  const amb = h('div', { class: 'rz-amb', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
  document.body.prepend(amb);
  // the light holds still while the page scrolls, so the GPU paints the content coming into view instead
  let still;
  addEventListener('scroll', () => { amb.classList.add('rz-still'); clearTimeout(still); still = setTimeout(() => amb.classList.remove('rz-still'), 300); }, { passive: true });
  const { search } = buildHeader();
  buildFooter();
  hoverPreview();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePopups(); $('.rz-modal')?.close?.(); if (root.classList.contains('rz-theater')) toggleTheater(false); return; }
    if (e.target.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); search.input.focus(); }
    else if (e.key === '?') { e.preventDefault(); showKeys(); }
    else if (isTitle && 'tTеЕ'.includes(e.key)) toggleTheater();
  });
}
