// Runs in the page's own JS world (loader.js adds it as a <script>) so it can drive Rezka's Playerjs via CDNPlayer.api.
// Design: canvas «Раунд 4» M-Player. Playerjs keeps the video, subtitles and its resize logic; the controls are ours.
(() => {
  const holder = document.getElementById('cdnplayer-container');
  if (!holder || holder.dataset.rzBar) return;
  holder.dataset.rzBar = '1';

  const api = (...a) => { try { return window.CDNPlayer && window.CDNPlayer.api(...a); } catch { return undefined; } };
  const $ = (s, r = document) => r.querySelector(s);
  const video = () => $('#cdnplayer video');
  const clean = (s) => String(s ?? '').replace(/<[^>]*>/g, '').trim();
  const fmt = (s) => {
    s = Math.max(0, Math.floor(+s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };
  const svg = (d, fill, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
  const I = {
    play: svg('<path d="M7 4.5v15l12.5-7.5z"/>', 1),
    pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>', 1),
    back: svg('<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="sans-serif">10</text>'),
    fwd: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="sans-serif">10</text>'),
    next: svg('<path d="M5 5v14l10-7z"/><rect x="16" y="5" width="3" height="14" rx="1"/>', 1),
    vol: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
    mute: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    cc: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M7 13.5h4M13 13.5h4M7 10h10"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    theater: svg('<rect x="2.5" y="6" width="19" height="12" rx="2"/>'),
    full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    warn: svg('<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>', 0, 40),
    retry: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/>', 0, 20),
  };

  // ---------- hide Playerjs's own UI, keep video + subtitles ----------
  const isSubs = (el) => { const st = el.getAttribute('style') || ''; return /padding-left:\s*10%/.test(st) && /text-align:\s*center/.test(st); };
  const hideNative = () => {
    const o = document.getElementById('oframecdnplayer');
    if (!o) return;
    for (const el of o.children) {
      const keep = el.tagName !== 'PJSDIV' || !!el.querySelector('video') || isSubs(el);
      el.toggleAttribute('data-rz-hidden', !keep);
      el.toggleAttribute('data-rz-subs', el.tagName === 'PJSDIV' && isSubs(el));
    }
  };
  let frameObs;
  const watchFrame = () => {
    const o = document.getElementById('oframecdnplayer');
    if (!o || o === watchFrame.o) return;
    watchFrame.o = o;
    frameObs?.disconnect();
    frameObs = new MutationObserver(hideNative);
    frameObs.observe(o, { childList: true });
    hideNative();
  };
  new MutationObserver(watchFrame).observe(holder, { childList: true, subtree: true });
  watchFrame();

  // ---------- our UI ----------
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const btn = (cls, label, icon, on) => {
    const b = el('button', 'rz-pb ' + cls, icon); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); on(e); }); return b;
  };

  const ui = el('div', 'rz-pui');
  const plate = el('div', 'rz-pplate');
  const big = btn('rz-pbig', 'Смотреть', svg('<path d="M7 4.5v15l12.5-7.5z"/>', 1, 40), () => toggle());
  const spin = el('div', 'rz-pspin'); spin.setAttribute('role', 'status'); spin.setAttribute('aria-label', 'Загрузка видео'); spin.hidden = true;
  const ctl = el('div', 'rz-pctl');
  const seek = el('div', 'rz-pseek');
  const line = el('div', 'rz-pline', '<span class="rz-pbuf"></span><span class="rz-pdone"></span><span class="rz-pknob"></span><span class="rz-phov"></span><span class="rz-ptip"><i class="rz-pthumb" hidden></i><b></b></span>');
  line.setAttribute('role', 'slider'); line.setAttribute('aria-label', 'Перемотка'); line.setAttribute('aria-valuemin', '0'); line.tabIndex = 0;
  seek.append(line);
  const bar = el('div', 'rz-pbar');
  const bPlay = btn('', 'Смотреть', I.play, () => toggle());
  const bBack = btn('', 'Назад на 10 секунд', I.back, () => skip(-10));
  const bFwd = btn('', 'Вперёд на 10 секунд', I.fwd, () => skip(10));
  const bNext = btn('', 'Следующая серия', I.next, () => goNext());
  const bVol = btn('', 'Звук', I.vol, () => api(api('muted') ? 'unmute' : 'mute'));
  const vol = el('input', 'rz-pvol'); vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.setAttribute('aria-label', 'Громкость');
  vol.addEventListener('input', () => { api('unmute'); api('volume', +vol.value); });
  vol.addEventListener('click', (e) => e.stopPropagation());
  const time = el('span', 'rz-ptime');
  const grow = el('span', 'rz-pgrow');
  const bCC = btn('rz-pcc', 'Субтитры', I.cc, () => { if (bCC.getAttribute('aria-disabled') === 'true') { flashTip(); return; } menu('cc'); });
  const ccTip = el('span', 'rz-ptipc', 'Для этой озвучки субтитров нет'); ccTip.hidden = true;
  const bGear = btn('', 'Качество, субтитры и скорость', I.gear, () => menu('all'));
  const bQual = btn('rz-pql', 'Качество', '', () => menu('q'));
  const bTheater = btn('', 'Кинотеатр (T)', I.theater, () => $('.rz-theater-btn')?.click());
  const bFull = btn('', 'Полный экран (F)', I.full, () => fullscreen());
  const pop = el('div', 'rz-pm'); pop.inert = true; pop.setAttribute('role', 'dialog');
  const osd = el('div', 'rz-posd'); osd.setAttribute('aria-hidden', 'true');
  const nextCard = el('div', 'rz-pnext'); nextCard.hidden = true; nextCard.setAttribute('role', 'dialog'); nextCard.setAttribute('aria-label', 'Следующая серия');
  const skipBtn = el('button', 'rz-pbtn rz-o rz-pskip'); skipBtn.type = 'button'; skipBtn.hidden = true;
  const msg = el('div', 'rz-pmsg'); msg.hidden = true; msg.setAttribute('role', 'alert');
  const fsx = el('span', 'rz-pfsx', 'Esc — выйти из полноэкранного режима'); fsx.hidden = true;
  bar.append(bPlay, bBack, bFwd, bNext, bVol, vol, time, grow, bCC, bGear, bQual, bTheater, bFull);
  ctl.append(seek, bar);
  ui.append(el('div', 'rz-pscrim'), el('div', 'rz-pscrim rz-ptop'), plate, big, spin, osd, ccTip, pop, skipBtn, nextCard, msg, fsx, ctl);
  holder.append(ui);

  const episodes = () => [...document.querySelectorAll('.b-simple_episode__item:not(.disabled)')];
  const nextEpisode = () => { const all = episodes(), cur = $('.b-simple_episode__item.active'); const i = all.indexOf(cur); return i >= 0 ? all[i + 1] : null; };
  const toggle = () => { closeMenu(); api(api('playing') ? 'pause' : 'play'); };
  const skip = (s) => api('seek', Math.max(0, Math.min((+api('duration') || 0) - 1, (+api('time') || 0) + s)));
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : holder.requestFullscreen?.());

  // next episode, also across seasons (Rezka's own tabs are clicked, so its handlers do the loading)
  let autoplay = 0;
  const goNext = () => {
    const nx = nextEpisode(), cur = $('.b-simple_episode__item.active');
    hideNext();
    if (!nx) return;
    if (cur && nx.dataset.season_id !== cur.dataset.season_id) $(`.b-simple_season__item[data-tab_id="${nx.dataset.season_id}"]`)?.click();
    nx.click();
    autoplay = Date.now();
  };

  // ---------- menus: quality (premium options left out), subtitles, speed ----------
  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const subs = () => (api('subtitles') || []).map(clean).filter(Boolean);
  const column = (title, items) => {
    const col = el('div', 'rz-pcol', `<h4>${title}</h4>`);
    for (const [label, on, act, dis] of items) {
      const b = el('button', on ? 'on' : '', label); b.type = 'button';
      if (on) b.setAttribute('aria-pressed', 'true');
      if (dis) { b.disabled = true; b.className = 'dis'; }
      // the subtitles menu stays open (track and look are picked together), the others close on a pick
      b.addEventListener('click', (e) => { e.stopPropagation(); act(); if (menuKind === 'cc') render(); else closeMenu(); });
      col.append(b);
    }
    return col;
  };

  // subtitles look: size and position follow the player's height; kept in the site's localStorage
  const LOOK = {
    size: [['Мелкий', 0.034], ['Средний', 0.043], ['Крупный', 0.054], ['Очень крупный', 0.068]],
    color: [['Белый', '#FFFFFF'], ['Жёлтый', '#FFE14D']],
    bg: [['Без фона', 'none'], ['Полупрозрачный', 'semi'], ['Сплошной', 'solid']],
    pos: [['Ниже', 0.045], ['Обычно', 0], ['Выше', -0.11]],
  };
  const look = { size: 1, color: 0, bg: 1, pos: 1 };
  try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem('rz-subs')) || {})) if (LOOK[k]?.[v]) look[k] = v; } catch {}
  const applyLook = () => {
    holder.style.setProperty('--rz-sc', LOOK.color[look.color][1]);
    holder.dataset.rzSbg = LOOK.bg[look.bg][1];
    lookKey = '';
  };
  let lookKey = '';
  const sizeLook = () => { // tick: font size and offset in px of the current player height
    const hgt = holder.clientHeight, key = hgt + '|' + look.size + '|' + look.pos;
    if (key === lookKey) return;
    lookKey = key;
    holder.style.setProperty('--rz-sfs', Math.max(16, Math.round(hgt * LOOK.size[look.size][1])) + 'px');
    holder.style.setProperty('--rz-sy', Math.round(hgt * LOOK.pos[look.pos][1]) + 'px');
  };
  const lookColumn = () => {
    const col = el('div', 'rz-pcol rz-plook', '<h4>Вид</h4>');
    for (const [key, title] of [['size', 'Размер'], ['color', 'Цвет'], ['bg', 'Фон'], ['pos', 'Положение']]) {
      const row = el('div', 'rz-plk', `<span>${title}</span>`), opts = el('div', 'rz-plk-o');
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', title);
      LOOK[key].forEach(([label, val], i) => {
        const b = el('button', 'rz-ps-' + key + (i === look[key] ? ' on' : ''), key === 'size' ? 'Аа' : key === 'color' ? `<i style="background:${val}"></i>${label}` : label);
        b.type = 'button'; b.setAttribute('aria-pressed', String(i === look[key]));
        if (key === 'size') { b.setAttribute('aria-label', label); b.title = label; b.style.fontSize = 12 + i * 3 + 'px'; }
        b.addEventListener('click', (e) => {
          e.stopPropagation(); look[key] = i;
          try { localStorage.setItem('rz-subs', JSON.stringify(look)); } catch {}
          applyLook(); sizeLook();
          for (const x of opts.children) { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }
        });
        opts.append(b);
      });
      row.append(opts); col.append(row);
    }
    return col;
  };
  applyLook();
  const cols = {
    q: () => {
      const cur = clean(api('quality'));
      return column('Качество', (api('qualities') || []).map((q, i) => [clean(q), clean(q) === cur, () => api('quality', i), false, q]).filter((x) => !/prem/i.test(x[4])));
    },
    cc: () => {
      const list = subs(), cur = clean(api('subtitle'));
      if (!list.length) return column('Субтитры', [['Нет субтитров', false, () => {}, true]]);
      return column('Субтитры', [['Выключены', !list.includes(cur), () => api('subtitle', -1)], ...list.map((s, i) => [s, s === cur, () => api('subtitle', i)])]);
    },
    sp: () => {
      const r = video()?.playbackRate || 1;
      return column('Скорость', RATES.map((x) => [String(x).replace('.', ',') + '×', x === r, () => { if (video()) video().playbackRate = x; }]));
    },
  };
  let menuKind = null;
  const closeMenu = () => {
    if (pop.contains(document.activeElement)) ({ all: bGear, q: bQual, cc: bCC })[menuKind]?.focus({ preventScroll: true });
    pop.classList.remove('rz-open'); pop.inert = true; menuKind = null;
    for (const b of [bCC, bGear, bQual]) b.classList.remove('on');
  };
  const render = () => {
    const kind = menuKind;
    pop.replaceChildren(...(kind === 'all' ? [cols.q(), cols.cc(), cols.sp()] : kind === 'cc' && subs().length ? [cols.cc(), lookColumn()] : [cols[kind]()]));
    pop.classList.toggle('rz-one', kind === 'q' || (kind === 'cc' && !subs().length));
    pop.classList.toggle('rz-two', kind === 'cc' && subs().length > 0);
  };
  const menu = (kind) => {
    if (menuKind === kind) { closeMenu(); return; }
    closeMenu();
    menuKind = kind;
    render();
    pop.setAttribute('aria-label', { all: 'Качество, субтитры и скорость', q: 'Качество', cc: 'Субтитры' }[kind]);
    pop.classList.add('rz-open'); pop.inert = false;
    ({ all: bGear, q: bQual, cc: bCC })[kind].classList.add('on');
    pop.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    wake();
  };
  let tipTimer;
  const flashTip = () => { ccTip.hidden = false; clearTimeout(tipTimer); tipTimer = setTimeout(() => { ccTip.hidden = true; }, 2500); };
  bCC.addEventListener('mouseenter', () => { if (bCC.getAttribute('aria-disabled') === 'true') ccTip.hidden = false; });
  bCC.addEventListener('mouseleave', () => { ccTip.hidden = true; });

  // ---------- seek bar: drag, hover time, keyboard ----------
  const seekAt = (x) => {
    const r = line.getBoundingClientRect(), d = +api('duration') || 0;
    const f = Math.min(1, Math.max(0, (x - r.left) / r.width));
    return [f, f * d];
  };
  let dragging = false;
  line.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!(+api('duration'))) return;
    line.setPointerCapture(e.pointerId);
    const move = (ev) => line.style.setProperty('--p', seekAt(ev.clientX)[0]);
    const up = (ev) => { line.removeEventListener('pointermove', move); line.removeEventListener('pointerup', up); api('seek', seekAt(ev.clientX)[1]); dragging = false; };
    dragging = true; move(e);
    line.addEventListener('pointermove', move); line.addEventListener('pointerup', up);
  });
  const tip = line.querySelector('.rz-ptip'), thumb = tip.querySelector('.rz-pthumb'), tipTime = tip.querySelector('b');
  line.addEventListener('pointerenter', () => { for (const u of new Set(thumbs.map((c) => c.url))) new Image().src = u; });
  line.addEventListener('pointermove', (e) => {
    const [f, s] = seekAt(e.clientX), d = +api('duration');
    line.style.setProperty('--h', f);
    tip.classList.toggle('rz-has', !!d);
    tipTime.textContent = d ? fmt(s) : '';
    const c = d ? thumbs.find((x) => s >= x.s && s < x.e) : null;
    thumb.hidden = !c;
    if (c) {
      const k = 224 / c.w, [sw, sh] = sheets.get(c.url);
      Object.assign(thumb.style, { width: c.w * k + 'px', height: c.h * k + 'px', backgroundImage: `url("${c.url}")`,
        backgroundSize: `${sw * k}px ${sh * k}px`, backgroundPosition: `${-c.x * k}px ${-c.y * k}px` });
    }
    const w = line.clientWidth, half = tip.offsetWidth / 2;
    tip.style.left = Math.min(w - half, Math.max(half, f * w)) + 'px';
  });
  line.addEventListener('click', (e) => e.stopPropagation());
  line.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); skip(e.key === 'ArrowLeft' ? -10 : 10); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); api('seek', e.key === 'Home' ? 0 : Math.max(0, (+api('duration') || 0) - 1)); }
  });

  // ---------- frame previews: Rezka's WebVTT of sprite tiles (time range → image#xywh) ----------
  let thumbs = [], thumbSrc = null;
  const sheets = new Map(); // sprite url → [width, height]
  const parseTiles = (text, base) => {
    const sec = (t) => t.split(':').reduce((a, x) => a * 60 + parseFloat(x), 0);
    const out = [];
    for (const m of text.matchAll(/([\d:.]+)\s*-->\s*([\d:.]+)[^\n]*\n\s*(\S+?)#xywh=(\d+),(\d+),(\d+),(\d+)/g)) {
      const c = { s: sec(m[1]), e: sec(m[2]), url: new URL(m[3], base).href, x: +m[4], y: +m[5], w: +m[6], h: +m[7] };
      const [sw, sh] = sheets.get(c.url) || [0, 0];
      sheets.set(c.url, [Math.max(sw, c.x + c.w), Math.max(sh, c.y + c.h)]);
      out.push(c);
    }
    return out;
  };
  const loadThumbs = async (src) => {
    if (src === thumbSrc) return;
    thumbSrc = src; thumbs = [];
    if (!src) return;
    try {
      const base = new URL(src, location.href), list = parseTiles(await (await fetch(base, { credentials: 'include' })).text(), base);
      if (thumbSrc === src) thumbs = list;
    } catch { /* no previews for this stream: the tip shows the time only */ }
  };
  {
    const init = [...document.scripts].map((x) => x.textContent).find((x) => /initCDN\w+Events\(/.test(x));
    const m = init && init.match(/"thumbnails":"((?:[^"\\]|\\.)*)"/);
    try { loadThumbs(m ? JSON.parse('"' + m[1] + '"') : ''); } catch { loadThumbs(''); }
    window.jQuery?.(document).ajaxSuccess((e, xhr, o) => {
      if (!/\/ajax\/get_cdn_series\//.test(o?.url || '')) return;
      let j = xhr.responseJSON;
      if (!j) try { j = JSON.parse(xhr.responseText); } catch { return; }
      if (j?.success && 'thumbnails' in j) loadThumbs(j.thumbnails || '');
    });
  }

  // click on the picture toggles (or closes an open menu), double click goes full screen
  ui.addEventListener('click', (e) => {
    if (e.target !== ui && !e.target.classList.contains('rz-pscrim')) return;
    if (menuKind) { closeMenu(); return; }
    toggle();
  });
  ui.addEventListener('dblclick', (e) => { if (e.target === ui || e.target.classList.contains('rz-pscrim')) fullscreen(); });

  // ---------- panel visibility; subtitles move up while the panel is shown ----------
  let idle;
  // a mouse click leaves focus on the button; only keyboard focus needs the panel to stay
  const hideLater = () => { clearTimeout(idle); idle = setTimeout(() => { if (api('playing') && !menuKind && !ui.querySelector(':focus-visible')) setAwake(false); }, 2600); };
  const setAwake = (on) => { ui.classList.toggle('rz-awake', on); };
  const wake = () => { setAwake(true); hideLater(); };
  // the left and right 15% of the picture (above the control bar) hide the panel at once instead of waking it
  holder.addEventListener('mousemove', (e) => {
    const r = holder.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    const edge = (x < 0.15 || x > 0.85) && e.clientY < r.bottom - ctl.offsetHeight; // the hidden bar takes no events, so test by position
    if (edge && api('playing') && !menuKind) { clearTimeout(idle); setAwake(false); } else wake();
  });
  holder.addEventListener('mouseleave', () => { if (api('playing') && !menuKind) setAwake(false); });
  ui.addEventListener('focusin', wake);

  // «Смотреть / Продолжить» on the page asks us to start playback
  document.addEventListener('rz-play', () => { if (!api('playing')) api('play'); wake(); });

  let osdTimer;
  const showVolume = () => {
    const v = api('muted') ? 0 : Math.round((+api('volume') || 0) * 100);
    osd.innerHTML = `${v ? I.vol : I.mute}<span class="rz-posd-l"><span style="width:${v}%"></span></span><b>${v}%</b>`;
    osd.classList.add('rz-show'); clearTimeout(osdTimer); osdTimer = setTimeout(() => osd.classList.remove('rz-show'), 900);
  };
  const nudgeVolume = (dv) => {
    const v = Math.round(Math.min(1, Math.max(0, (api('muted') ? 0 : +api('volume') || 0) + dv)) * 10) / 10;
    api('unmute'); api('volume', v); showVolume();
  };

  // ---------- hotkeys: Space, ← → ↑ ↓, F, M (not while typing; Space/arrows only when the player is on screen) ----------
  const onScreen = () => { const r = holder.getBoundingClientRect(); return r.bottom > innerHeight * 0.4 && r.top < innerHeight * 0.6; };
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""], #ps-overlay-wrap, .rz-modal')) return; // typing, Rezka's popups, our modals
    const k = e.code;
    if (k === 'Space') {
      if (e.target.closest?.('button, a, [role="button"], [role="slider"]') || !onScreen()) return;
      e.preventDefault(); toggle(); wake();
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      if (!onScreen()) return;
      e.preventDefault(); skip(k === 'ArrowLeft' ? -10 : 10); wake();
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      if (!onScreen()) return;
      e.preventDefault(); nudgeVolume(k === 'ArrowUp' ? 0.1 : -0.1); wake();
    } else if (k === 'KeyF') { e.preventDefault(); fullscreen(); }
    else if (k === 'KeyM') { e.preventDefault(); api(api('muted') ? 'unmute' : 'mute'); showVolume(); wake(); }
  });
  // Esc closes an open menu only (the page's own Esc would also leave the theater)
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuKind) { e.stopPropagation(); const b = ({ all: bGear, q: bQual, cc: bCC })[menuKind]; closeMenu(); b.focus({ preventScroll: true }); } }, true);
  document.addEventListener('fullscreenchange', () => {
    const on = document.fullscreenElement === holder;
    holder.classList.toggle('rz-fs', on);
    bFull.setAttribute('aria-label', on ? 'Выйти из полноэкранного режима (F)' : 'Полный экран (F)');
    fsx.hidden = !on;
    if (on) setTimeout(() => { fsx.hidden = true; }, 3000);
  });

  // ---------- end of an episode: «Следующая серия через 5 с» ----------
  let countdown, left = 0;
  const hideNext = () => { clearInterval(countdown); nextCard.hidden = true; };
  const showNext = (cancel = 'Отмена') => {
    const nx = nextEpisode();
    if (!nx || !nextCard.hidden) return;
    const name = nx.querySelector('.rz-et b')?.textContent || 'Серия ' + nx.dataset.episode_id;
    left = 5;
    nextCard.innerHTML = `<span class="rz-pcap">Следующая серия</span><div class="rz-pnx"><span class="rz-pring" style="--k:0"><b>5</b></span><span><span class="rz-pd">${nx.dataset.season_id}×${nx.dataset.episode_id} ${name.replace(/</g, '&lt;')}</span><small>начнётся через 5 с</small></span></div>`;
    const go = el('button', 'rz-pbtn rz-y', 'Смотреть'); go.type = 'button'; go.addEventListener('click', (e) => { e.stopPropagation(); goNext(); });
    const no = el('button', 'rz-pbtn rz-o', cancel); no.type = 'button'; no.addEventListener('click', (e) => { e.stopPropagation(); creditsOff = true; hideNext(); });
    const row = el('div', 'rz-pbtns'); row.append(go, no); nextCard.append(row);
    nextCard.hidden = false; setAwake(true);
    countdown = setInterval(() => {
      left -= 1;
      nextCard.querySelector('.rz-pring').style.setProperty('--k', (5 - left) / 5);
      nextCard.querySelector('.rz-pring b').textContent = String(Math.max(0, left));
      nextCard.querySelector('small').textContent = `начнётся через ${Math.max(0, left)} с`;
      if (left <= 0) goNext();
    }, 1000);
  };

  // ---------- end credits: a black picture with only light text, 3 s in a row within the last 4 minutes ----------
  const probe = Object.assign(document.createElement('canvas'), { width: 96, height: 54 }).getContext('2d', { willReadFrequently: true });
  const creditsFrame = () => {
    try {
      probe.drawImage(video(), 0, 0, 96, 54);
      const d = probe.getImageData(0, 0, 96, 54).data; let black = 0, mid = 0;
      for (let i = 0; i < d.length; i += 4) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; if (y < 20) black++; else if (y <= 140) mid++; }
      // measured on Supernatural S9: credits are 95–100% black with under 2% mid-tones, dark scenes keep 9–25% mid-tones
      return black > 0.93 * 5184 && mid < 0.04 * 5184;
    } catch { return false; } // a cross-origin stream taints the canvas: then only the end of the video brings the card
  };
  let darkFrom = -1, creditsAt = -1, creditsOff = false;

  // ---------- skip the recap or intro: community timestamps from TheIntroDB by IMDb id, season and episode ----------
  const imdbId = (() => {
    const b64 = ($('.b-post__info_rates.imdb a')?.getAttribute('href') || '').match(/\/help\/([^/]+)/)?.[1];
    try { return b64 && decodeURIComponent(atob(b64)).match(/tt\d+/)?.[0]; } catch { return null; }
  })();
  let segKey = '', segs = [], segNow = null;
  const loadSegs = async (ep) => {
    const key = imdbId && ep ? `${imdbId}&season=${ep.dataset.season_id}&episode=${ep.dataset.episode_id}` : '';
    if (key === segKey) return;
    segKey = key; segs = [];
    if (!key) return;
    try {
      const j = await (await fetch('https://api.theintrodb.org/v4/media?imdb_id=' + key)).json();
      if (segKey !== key) return;
      segs = [['recap', 'Пропустить пересказ'], ['intro', 'Пропустить заставку']].flatMap(([k, label]) => (j[k] || [])
        .map((x) => ({ s: (x.start_ms || 0) / 1000, e: x.end_ms / 1000, label }))
        .filter((x) => x.e - x.s >= 5 && x.e - x.s <= 300)); // drops empty (0–0) and runaway submissions
    } catch { /* no data for this episode: no button */ }
  };
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); if (segNow) api('seek', segNow.e); skipBtn.hidden = true; });

  // ---------- video error: retry, change voice, report ----------
  let errTimer;
  const showError = () => {
    msg.innerHTML = `<span class="rz-pic">${I.warn}</span><h3>Не удалось загрузить видео</h3><p>Попробуйте ещё раз или выберите другую озвучку. Если не помогло — сообщите нам.</p>`;
    const row = el('div', 'rz-pbtns');
    const mk = (cls, html, act) => { const b = el('button', 'rz-pbtn ' + cls, html); b.type = 'button'; b.addEventListener('click', (e) => { e.stopPropagation(); act(); }); row.append(b); };
    mk('rz-y', I.retry + 'Повторить', () => { msg.hidden = true; ($('.b-simple_episode__item.active') || $('.b-translator__item.active'))?.click(); api('play'); });
    if ($('#translators-list')) mk('rz-o', 'Сменить озвучку', () => { msg.hidden = true; $('#rz-watch')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    if ($('.b-post__support_holder')) mk('rz-o', 'Сообщить', () => $('.b-post__support_holder').click());
    msg.append(row);
    msg.hidden = false;
  };
  document.addEventListener('error', (e) => {
    if (e.target?.tagName !== 'VIDEO' || !holder.contains(e.target)) return;
    clearTimeout(errTimer);
    // Playerjs swaps sources and retries on its own: only a lasting error is shown
    errTimer = setTimeout(() => { const v = video(); if (v?.error && !api('playing')) showError(); }, 4000);
  }, true);
  document.addEventListener('ended', (e) => { if (e.target?.tagName === 'VIDEO' && holder.contains(e.target)) showNext(); }, true);

  // ---------- state, 4 times a second ----------
  const plateText = () => {
    const ep = $('.b-simple_episode__item.active'), vo = $('.b-translator__item.active');
    const voice = vo ? (vo.getAttribute('title') || vo.textContent).trim() : '';
    const head = ep ? [`${ep.dataset.season_id} сезон`, `${ep.dataset.episode_id} серия`, voice] : [voice];
    const sub = ep ? ep.querySelector('.rz-et b')?.textContent || '' : ($('.b-post__title h1')?.textContent || '').trim();
    return [head.filter(Boolean).join(' · '), sub];
  };
  let lastPlate = '';
  const tick = () => {
    const t = +api('time') || 0, d = +api('duration') || 0, b = +api('buffered') || 0, playing = !!api('playing'), muted = !!api('muted');
    if (!dragging) line.style.setProperty('--p', d ? Math.min(1, t / d) : 0);
    line.style.setProperty('--b', d ? Math.min(1, b / d) : 0);
    line.setAttribute('aria-valuemax', String(Math.round(d)));
    line.setAttribute('aria-valuenow', String(Math.round(t)));
    line.setAttribute('aria-valuetext', d ? fmt(t) + ' из ' + fmt(d) : 'длительность неизвестна');
    time.innerHTML = d ? `${fmt(t)} <span>/ ${fmt(d)}</span>` : '— <span>/ —</span>';
    bPlay.innerHTML = playing ? I.pause : I.play;
    bPlay.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть'); bPlay.title = playing ? 'Пауза (пробел)' : 'Смотреть (пробел)';
    bVol.innerHTML = muted ? I.mute : I.vol;
    bVol.setAttribute('aria-label', muted ? 'Включить звук (M)' : 'Выключить звук (M)');
    if (document.activeElement !== vol) vol.value = muted ? 0 : (+api('volume') || 0);
    bQual.textContent = clean(api('quality')).replace(/\s.*/, '') || '—';
    const hasSubs = subs().length > 0;
    bCC.setAttribute('aria-disabled', String(!hasSubs));
    bCC.classList.toggle('rz-off', !hasSubs);
    bCC.classList.toggle('rz-act', hasSubs && subs().includes(clean(api('subtitle'))));
    bNext.hidden = !nextEpisode();
    bTheater.classList.toggle('on', document.documentElement.classList.contains('rz-theater'));
    ui.classList.toggle('rz-playing', playing);
    ui.classList.toggle('rz-started', playing || t > 0);
    const v = video();
    spin.hidden = !(playing && v && v.readyState < 3 && !v.paused);
    if (creditsAt >= 0 && t < creditsAt - 3) { creditsAt = darkFrom = -1; creditsOff = false; } // sought back, or the next episode began
    if (creditsAt < 0 && playing && d && t > d - 240 && nextEpisode()) {
      if (t < darkFrom || !creditsFrame()) darkFrom = -1; else if (darkFrom < 0) darkFrom = t;
      if (darkFrom >= 0 && t - darkFrom >= 3) creditsAt = darkFrom;
    }
    if (creditsAt >= 0 && playing && !creditsOff) showNext('Смотреть титры');
    if (playing) { msg.hidden = true; if (t < d - 2 && creditsAt < 0) hideNext(); }
    loadSegs($('.b-simple_episode__item.active'));
    segNow = t > 0 ? segs.find((x) => t >= x.s - 1 && t < x.e - 1) : null;
    skipBtn.hidden = !segNow;
    if (segNow && skipBtn.textContent !== segNow.label) skipBtn.textContent = segNow.label;
    // after a switch Playerjs reports the old episode's time for a while, so only the clock and «playing» are trusted
    if (autoplay && Date.now() - autoplay < 15000) { if (playing) autoplay = 0; else if (d) api('play'); }
    holder.classList.toggle('rz-ui-on', !playing || ui.classList.contains('rz-awake'));
    const [head, sub] = plateText(), key = head + '|' + sub;
    if (key !== lastPlate) {
      lastPlate = key;
      plate.replaceChildren(...(head ? [el('span', 'rz-pd', ''), el('span', '', '')] : []));
      if (head) { plate.firstChild.textContent = head; plate.lastChild.textContent = sub; }
      plate.hidden = !head;
    }
    hideNative();
    sizeLook();
  };
  setInterval(tick, 250);
  tick(); wake();
})();
