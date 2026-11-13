export async function start() {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v != null) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  const txt = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim();
  const ICON = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bookmark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/></svg>',
    play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    theater: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/></svg>',
  };
  const root = document.documentElement;
  const isTitle = !!$('.b-post__title') && !!$('.b-post__info');

  // ---------- Header ----------
  // fixed list: Rezka's own menu differs between pages
  const navLinks = [['Фильмы', '/films/'], ['Сериалы', '/series/'], ['Мультфильмы', '/cartoons/'], ['Аниме', '/animation/'], ['Новинки', '/new/'], ['Анонсы', '/announce/'], ['Подборки', '/collections/']];
  const here = location.pathname;
  const loginLink = $('.b-tophead__login');
  const userLink = $('.b-tophead__user, .b-tophead-right .b-tophead__account');
  const search = h('form', { class: 'rz-search', action: '/search/', method: 'get', role: 'search' },
    h('input', { type: 'hidden', name: 'do', value: 'search' }),
    h('input', { type: 'hidden', name: 'subaction', value: 'search' }),
    h('span', { class: 'rz-ico', html: ICON.search, 'aria-hidden': 'true' }),
    h('input', { type: 'search', name: 'q', placeholder: 'Фильм, сериал, актёр', autocomplete: 'off', 'aria-label': 'Поиск' }),
    h('span', { class: 'rz-kbd', 'aria-hidden': 'true' }, '/'),
    h('div', { class: 'rz-live', role: 'listbox', hidden: '' }));
  const header = h('header', { id: 'rz-header' },
    h('a', { class: 'rz-logo', href: '/', 'aria-label': 'Rezka, на главную' }, 'Rezka'),
    h('nav', { class: 'rz-nav', 'aria-label': 'Разделы' },
      navLinks.map(([t, href]) => h('a', { href, 'aria-current': here.startsWith(href) ? 'page' : null }, t))),
    h('span', { class: 'rz-grow' }),
    search,
    h('a', { class: 'rz-ib', href: '/favorites/', 'aria-label': 'Закладки', html: ICON.bookmark }),
    h('a', { class: 'rz-ib', href: '/continue/', 'aria-label': 'История просмотра', html: ICON.clock }),
    h('button', { class: 'rz-ib rz-me', type: 'button', 'aria-label': userLink ? 'Профиль' : 'Войти', html: ICON.user,
      onclick: () => (userLink || loginLink)?.click() }));
  document.body.prepend(header);

  // live search: Rezka's own endpoint, 5 suggestions
  const q = $('input[name=q]', search), live = $('.rz-live', search);
  let liveTimer;
  q.addEventListener('input', () => {
    clearTimeout(liveTimer);
    const v = q.value.trim();
    if (v.length < 2) { live.hidden = true; return; }
    liveTimer = setTimeout(async () => {
      const res = await fetch('/engine/ajax/search.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: 'q=' + encodeURIComponent(v) });
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      live.replaceChildren(
        ...$$('.b-search__section_list li a', doc).map((a) => {
          const name = txt($('.enty', a)), rating = txt($('.rating', a));
          const sub = txt(a).replace(name, '').replace(rating, '').trim().replace(/^\(|\)$/g, '');
          return h('a', { class: 'rz-lrow', href: a.getAttribute('href'), role: 'option' },
            h('b', {}, name), h('span', { class: 'rz-lr' }, rating || 'скоро'),
            h('span', { class: 'rz-ls' }, sub), h('span', { class: 'rz-ls rz-lrl' }, rating ? 'Кинопоиск' : ''));
        }),
        ...$$('.b-search__live_all', doc).map((a) => h('a', { class: 'rz-lall', href: a.getAttribute('href') }, txt(a))));
      live.hidden = !live.children.length;
    }, 200);
  });
  document.addEventListener('click', (e) => { if (!search.contains(e.target)) live.hidden = true; });

  // ---------- Footer ----------
  const oldFooterLinks = $$('#footer a').filter((a) => txt(a) && !/hdrezka/i.test(txt(a)));
  document.body.append(h('footer', { id: 'rz-footer' },
    h('a', { class: 'rz-logo', href: '/' }, 'Rezka'),
    h('nav', { 'aria-label': 'Подвал' }, oldFooterLinks.map((a) => h('a', { href: a.getAttribute('href') }, txt(a))))));

  // ---------- Keys: "/" focuses search, T toggles theater ----------
  const toggleTheater = (on = !root.classList.contains('rz-theater')) => {
    root.classList.toggle('rz-theater', on);
    $$('.rz-theater-btn').forEach((b) => b.setAttribute('aria-pressed', on));
    // YouTube-style: the player fills the window but stays in the page, so you can scroll to episodes and comments
    $(on ? '#cdnplayer-container' : '#rz-watch')?.scrollIntoView({ block: 'start' });
  };
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); q.focus(); }
    else if (isTitle && 'tTеЕ'.includes(e.key)) toggleTheater();
    else if (e.key === 'Escape' && root.classList.contains('rz-theater')) toggleTheater(false);
  });

  // ---------- "Continue watching": Rezka's own /continue/ list (logged-in only), cached for 2 min per tab ----------
  const loggedIn = ($('#member_user_id')?.value || '0') !== '0';
  const loadContinue = async () => {
    if (!loggedIn) return [];
    try { const c = JSON.parse(sessionStorage.getItem('rz-continue') || 'null'); if (c && Date.now() - c.at < 120000) return c.rows; } catch {}
    const doc = new DOMParser().parseFromString(await (await fetch('/continue/', { credentials: 'include' })).text(), 'text/html');
    const rows = $$('.b-videosaves__list_item[id]', doc).map((r) => {
      const a = $('.title a', r), info = $('.info', r), more = txt($('.new-episode', info));
      return { href: a?.getAttribute('href'), title: txt(a), cover: a?.dataset.cover_url, date: txt($('.date', r)), last: txt(info).replace(more, '').trim(), more };
    }).filter((r) => r.href);
    try { sessionStorage.setItem('rz-continue', JSON.stringify({ at: Date.now(), rows })); } catch {}
    return rows;
  };
  const samePage = (href) => { try { return new URL(href, location.href).pathname === location.pathname; } catch { return false; } };

  // ---------- Hot series updates: one row per episode, all voices in it ----------
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
  const updates = $('.b-seriesupdate__block')?.parentElement;
  if (updates) {
    groupUpdates();
    new MutationObserver(groupUpdates).observe(updates, { childList: true, subtree: true });
  }

  // ---------- Card preview on hover (Rezka's quick_content endpoint) ----------
  const quick = new Map();
  const pop = h('div', { class: 'rz-pop', role: 'dialog', hidden: '' });
  document.body.append(pop);
  let hoverTimer, hoverCard;
  const hidePop = () => { pop.hidden = true; hoverCard = null; };
  const showPop = async (card) => {
    const id = card.dataset.id;
    if (!id) return;
    if (!quick.has(id)) quick.set(id, fetch('/engine/ajax/quick_content.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: `id=${id}&is_touch=1` })
      .then((r) => r.text()).then((t) => new DOMParser().parseFromString(t, 'text/html')).catch(() => null));
    const doc = await quick.get(id);
    if (!doc || hoverCard !== card) return;
    const link = $('a', card)?.getAttribute('href');
    const rating = $('.b-content__bubble_rating b', doc);
    const facts = h('dl', {});
    let desc = '';
    for (const b of $$('.b-content__bubble_text, .b-content__bubble_str', doc)) {
      const label = txt($('.label', b)).replace(/:$/, '');
      if (!label) { desc = txt(b); continue; }
      $('.label', b).remove();
      facts.append(h('dt', {}, label === 'Возрастное ограничение' ? 'Возраст' : label), h('dd', {}, txt(b)));
    }
    const trailerEl = $('.trailer', card);
    pop.replaceChildren(
      h('div', { class: 'rz-pop-top' }, h('span', { class: 'rz-muted' }, [txt($('.b-content__catlabel', doc)), txt($('.info', card))].filter(Boolean).join(' · ')),
        rating ? h('span', { class: 'rz-pop-r' }, '★ ' + txt(rating)) : null),
      h('b', { class: 'rz-pop-t' }, txt($('.b-content__bubble_title', doc))),
      desc ? h('p', {}, desc) : null,
      facts,
      h('div', { class: 'rz-pop-act' },
        h('a', { class: 'rz-cta rz-cta-sm', href: link }, 'Смотреть', h('span', { class: 'rz-nub', html: ICON.play })),
        trailerEl ? h('button', { class: 'rz-ghost', type: 'button', onclick: () => trailerEl.click() }, 'Трейлер') : null));
    const r = card.getBoundingClientRect(), w = 340;
    pop.hidden = false;
    const left = r.right + 14 + w < innerWidth ? r.right + 14 : r.left - 14 - w;
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = Math.max(88, Math.min(r.top, innerHeight - pop.offsetHeight - 16)) + 'px';
  };
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.rz-pop')) { clearTimeout(hoverTimer); return; }
    const card = e.target.closest('.b-content__inline_items .b-content__inline_item');
    if (card === hoverCard) return;
    clearTimeout(hoverTimer);
    if (!card) { hoverTimer = setTimeout(hidePop, 200); return; }
    hidePop(); hoverCard = card;
    hoverTimer = setTimeout(() => showPop(card), 450);
  });
  addEventListener('scroll', hidePop, { passive: true });

  root.classList.add('rz-on');
  if (!isTitle) {
    root.classList.add('rz-list');
    const main = $('.b-content__main') || $('#main');

    // home: "Continue watching" row on top
    if (here === '/' && loggedIn) {
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
    if (h1) h1.textContent = txt(h1).replace(/^Смотреть\s+/i, '').replace(/\s+в\s+HD\s+онлайн$/i, '').replace(/^./, (c) => c.toUpperCase());
    // genres live only in Rezka's dropdown menu: show them as chips under the sort tabs
    const section = navLinks.find(([, href]) => href.length > 1 && here.startsWith(href));
    const filters = $('.b-content__main_filters');
    if (section && filters) {
      const li = $$('#topnav-menu > li').find((l) => $('a', l)?.getAttribute('href') === section[1]);
      const seen = new Set([section[1]]);
      const genres = li ? $$('a', li).filter((a) => txt(a) && !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href'))) : [];
      if (genres.length) filters.after(h('nav', { class: 'rz-genres', 'aria-label': 'Жанры' },
        h('a', { class: 'rz-tag', href: section[1], 'aria-current': here === section[1] ? 'page' : null }, 'Все жанры'),
        genres.map((a) => h('a', { class: 'rz-tag', href: a.getAttribute('href'), 'aria-current': here.startsWith(a.getAttribute('href')) ? 'page' : null }, txt(a)))));
    }
    root.classList.add('rz-ready');
    return;
  }

  // ======================= TITLE PAGE (film / series) =======================
  root.classList.add('rz-title');
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
  root.classList.add('rz-ready');

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
