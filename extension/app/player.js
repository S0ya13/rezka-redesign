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
  const line = el('div', 'rz-pline', '<span class="rz-pbuf"></span><span class="rz-pdone"></span><span class="rz-pknob"></span><span class="rz-phov"></span><span class="rz-ptip"></span>');
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
  const pop = el('div', 'rz-pm'); pop.hidden = true; pop.setAttribute('role', 'dialog');
  const nextCard = el('div', 'rz-pnext'); nextCard.hidden = true; nextCard.setAttribute('role', 'dialog'); nextCard.setAttribute('aria-label', 'Следующая серия');
  const msg = el('div', 'rz-pmsg'); msg.hidden = true; msg.setAttribute('role', 'alert');
  const fsx = el('span', 'rz-pfsx', 'Esc — выйти из полноэкранного режима'); fsx.hidden = true;
  bar.append(bPlay, bBack, bFwd, bNext, bVol, vol, time, grow, bCC, bGear, bQual, bTheater, bFull);
  ctl.append(seek, bar);
  ui.append(el('div', 'rz-pscrim'), plate, big, spin, ccTip, pop, nextCard, msg, fsx, ctl);
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
      b.addEventListener('click', (e) => { e.stopPropagation(); act(); closeMenu(); });
      col.append(b);
    }
    return col;
  };
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
  const closeMenu = () => { pop.hidden = true; menuKind = null; for (const b of [bCC, bGear, bQual]) b.classList.remove('on'); };
  const menu = (kind) => {
    if (menuKind === kind) { closeMenu(); return; }
    closeMenu();
    menuKind = kind;
    pop.replaceChildren(...(kind === 'all' ? [cols.q(), cols.cc(), cols.sp()] : [cols[kind]()]));
    pop.classList.toggle('rz-one', kind !== 'all');
    pop.setAttribute('aria-label', { all: 'Качество, субтитры и скорость', q: 'Качество', cc: 'Субтитры' }[kind]);
    pop.hidden = false;
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
  line.addEventListener('pointermove', (e) => {
    const [f, s] = seekAt(e.clientX);
    line.style.setProperty('--h', f);
    line.querySelector('.rz-ptip').textContent = +api('duration') ? fmt(s) : '';
  });
  line.addEventListener('click', (e) => e.stopPropagation());
  line.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); skip(e.key === 'ArrowLeft' ? -10 : 10); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); api('seek', e.key === 'Home' ? 0 : Math.max(0, (+api('duration') || 0) - 1)); }
  });

  // click on the picture toggles (or closes an open menu), double click goes full screen
  ui.addEventListener('click', (e) => {
    if (e.target !== ui && !e.target.classList.contains('rz-pscrim')) return;
    if (!pop.hidden) { closeMenu(); return; }
    toggle();
  });
  ui.addEventListener('dblclick', (e) => { if (e.target === ui || e.target.classList.contains('rz-pscrim')) fullscreen(); });

  // ---------- panel visibility; subtitles move up while the panel is shown ----------
  let idle;
  const hideLater = () => { clearTimeout(idle); idle = setTimeout(() => { if (api('playing') && pop.hidden && !ui.contains(document.activeElement)) setAwake(false); }, 2600); };
  const setAwake = (on) => { ui.classList.toggle('rz-awake', on); };
  const wake = () => { setAwake(true); hideLater(); };
  holder.addEventListener('mousemove', wake);
  holder.addEventListener('mouseleave', () => { if (api('playing') && pop.hidden) setAwake(false); });
  ui.addEventListener('focusin', wake);

  // «Смотреть / Продолжить» on the page asks us to start playback
  document.addEventListener('rz-play', () => { if (!api('playing')) api('play'); wake(); });

  // ---------- hotkeys: Space, ← →, F, M (not while typing; Space/arrows only when the player is on screen) ----------
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
    } else if (k === 'KeyF') { e.preventDefault(); fullscreen(); }
    else if (k === 'KeyM') { e.preventDefault(); api(api('muted') ? 'unmute' : 'mute'); wake(); }
  });
  // Esc closes an open menu only (the page's own Esc would also leave the theater)
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); closeMenu(); bGear.focus({ preventScroll: true }); } }, true);
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
  const showNext = () => {
    const nx = nextEpisode();
    if (!nx || !nextCard.hidden) return;
    const name = nx.querySelector('.rz-et b')?.textContent || 'Серия ' + nx.dataset.episode_id;
    left = 5;
    nextCard.innerHTML = `<span class="rz-pcap">Следующая серия</span><div class="rz-pnx"><span class="rz-pring" style="--k:0"><b>5</b></span><span><span class="rz-pd">${nx.dataset.season_id}×${nx.dataset.episode_id} ${name.replace(/</g, '&lt;')}</span><small>начнётся через 5 с</small></span></div>`;
    const go = el('button', 'rz-pbtn rz-y', 'Смотреть'); go.type = 'button'; go.addEventListener('click', (e) => { e.stopPropagation(); goNext(); });
    const no = el('button', 'rz-pbtn rz-o', 'Отмена'); no.type = 'button'; no.addEventListener('click', (e) => { e.stopPropagation(); hideNext(); });
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
    if (playing) { msg.hidden = true; if (t < d - 2) hideNext(); }
    if (autoplay && d && !playing && Date.now() - autoplay < 15000 && t < 2) { api('play'); autoplay = 0; }
    holder.classList.toggle('rz-ui-on', !playing || ui.classList.contains('rz-awake'));
    const [head, sub] = plateText(), key = head + '|' + sub;
    if (key !== lastPlate) {
      lastPlate = key;
      plate.replaceChildren(...(head ? [el('span', 'rz-pd', ''), el('span', '', '')] : []));
      if (head) { plate.firstChild.textContent = head; plate.lastChild.textContent = sub; }
      plate.hidden = !head;
    }
    hideNative();
  };
  setInterval(tick, 250);
  tick(); wake();
})();
