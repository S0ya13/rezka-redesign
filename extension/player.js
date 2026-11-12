// Runs in the page's own JS world (manifest "world": "MAIN") so it can drive Rezka's Playerjs via CDNPlayer.api.
// Replaces Playerjs's controls with our own bar; video, subtitles and the player's resize logic stay Playerjs's.
(() => {
  const holder = document.getElementById('cdnplayer-container');
  if (!holder || holder.dataset.rzBar) return;
  holder.dataset.rzBar = '1';

  const api = (...a) => { try { return window.CDNPlayer && window.CDNPlayer.api(...a); } catch { return undefined; } };
  const video = () => document.querySelector('#cdnplayer video');
  const clean = (s) => String(s ?? '').replace(/<[^>]*>/g, '').trim();
  const fmt = (s) => {
    s = Math.max(0, Math.floor(+s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };
  const svg = (d, fill) => `<svg width="20" height="20" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
  const I = {
    play: svg('<path d="M8 5v14l11-7z"/>', 1),
    pause: svg('<rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/>', 1),
    back: svg('<path d="M11 7 6 12l5 5M18 7l-5 5 5 5"/>'),
    fwd: svg('<path d="m13 7 5 5-5 5M6 7l5 5-5 5"/>'),
    next: svg('<path d="M5 5.5v13l10-6.5z"/><rect x="16.5" y="5.5" width="2.6" height="13" rx="1"/>', 1),
    vol: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
    mute: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    cc: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M7 13.5h4M13 13.5h4M7 10h10"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    theater: svg('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/>'),
    full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  };

  // ---------- hide Playerjs's own UI, keep video + subtitles ----------
  const isKept = (el) => {
    if (el.tagName !== 'PJSDIV') return true; // style, resize iframe
    if (el.querySelector('video')) return true;
    const st = el.getAttribute('style') || '';
    return /padding-left:\s*10%/.test(st) && /text-align:\s*center/.test(st); // subtitles layer
  };
  const hideNative = () => {
    const o = document.getElementById('oframecdnplayer');
    if (!o) return;
    for (const el of o.children) el.toggleAttribute('data-rz-hidden', !isKept(el));
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
  const btn = (cls, label, icon, on) => { const b = el('button', 'rz-pc ' + cls, icon); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.addEventListener('click', (e) => { e.stopPropagation(); on(e); }); return b; };

  const ui = el('div', 'rz-pui');
  const plate = el('div', 'rz-pplate');
  const big = btn('rz-pbig', 'Смотреть', I.play, () => toggle());
  const bar = el('div', 'rz-pbar');
  const line = el('div', 'rz-pline', '<span class="rz-pbuf"></span><span class="rz-pdone"></span><span class="rz-pknob"></span><span class="rz-ptip"></span>');
  line.setAttribute('role', 'slider'); line.setAttribute('aria-label', 'Перемотка'); line.tabIndex = 0;
  const row = el('div', 'rz-prow');
  const bPlay = btn('', 'Пауза', I.play, () => toggle());
  const bBack = btn('', 'Назад 10 секунд', I.back, () => api('seek', Math.max(0, (+api('time') || 0) - 10)));
  const bFwd = btn('', 'Вперёд 10 секунд', I.fwd, () => api('seek', (+api('time') || 0) + 10));
  const bNext = btn('', 'Следующая серия', I.next, () => document.querySelector('.b-simple_episode__item.active')?.nextElementSibling?.click());
  const bVol = btn('', 'Звук', I.vol, () => api(api('muted') ? 'unmute' : 'mute'));
  const vol = el('input', 'rz-pvol'); vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.setAttribute('aria-label', 'Громкость');
  vol.addEventListener('input', () => { api('unmute'); api('volume', +vol.value); });
  vol.addEventListener('click', (e) => e.stopPropagation());
  const time = el('span', 'rz-ptime');
  const grow = el('span', 'rz-pgrow');
  const bQual = btn('rz-pq', 'Качество', '', () => menu('q'));
  const bCC = btn('', 'Субтитры', I.cc, () => menu('cc'));
  const bSpeed = btn('', 'Скорость', I.gear, () => menu('sp'));
  const bTheater = btn('', 'Кинотеатр (T)', I.theater, () => document.querySelector('.rz-theater-btn')?.click());
  const bFull = btn('', 'Полный экран', I.full, () => (document.fullscreenElement ? document.exitFullscreen() : holder.requestFullscreen()));
  const pop = el('div', 'rz-pmenu'); pop.hidden = true;
  row.append(bPlay, bBack, bFwd, bNext, bVol, vol, time, grow, bQual, bCC, bSpeed, bTheater, bFull);
  bar.append(line, row);
  ui.append(plate, big, bar, pop);
  holder.append(ui);
  if (!document.querySelector('.b-simple_episode__item')) bNext.hidden = true;

  const toggle = () => api(api('playing') ? 'pause' : 'play');

  // menus: quality (premium options are left out), subtitles, speed
  const menu = (kind) => {
    if (!pop.hidden && pop.dataset.kind === kind) { pop.hidden = true; return; }
    pop.dataset.kind = kind;
    pop.replaceChildren();
    const add = (label, active, on) => { const b = el('button', 'rz-pmi' + (active ? ' on' : ''), label); b.type = 'button'; b.addEventListener('click', (e) => { e.stopPropagation(); on(); pop.hidden = true; }); pop.append(b); };
    if (kind === 'q') {
      const list = api('qualities') || [], cur = clean(api('quality'));
      list.forEach((q, i) => { if (!/prem/.test(q)) add(clean(q), clean(q) === cur, () => api('quality', i)); });
    } else if (kind === 'cc') {
      const list = api('subtitles') || [], cur = clean(api('subtitle'));
      add('Выключены', !list.includes(cur), () => api('subtitle', -1));
      list.forEach((s, i) => add(clean(s), clean(s) === cur, () => api('subtitle', i)));
    } else {
      const v = video(), cur = v ? v.playbackRate : 1;
      for (const r of [0.5, 0.75, 1, 1.25, 1.5, 2]) add(r === 1 ? 'Обычная' : r + '×', r === cur, () => { if (video()) video().playbackRate = r; });
    }
    pop.hidden = !pop.children.length;
  };

  // seeking on the timeline
  const seekAt = (x) => {
    const r = line.getBoundingClientRect(), d = +api('duration') || 0;
    const f = Math.min(1, Math.max(0, (x - r.left) / r.width));
    return [f, f * d];
  };
  line.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    line.setPointerCapture(e.pointerId);
    const move = (ev) => { const [f] = seekAt(ev.clientX); line.style.setProperty('--p', f); };
    const up = (ev) => { line.removeEventListener('pointermove', move); line.removeEventListener('pointerup', up); api('seek', seekAt(ev.clientX)[1]); dragging = false; };
    dragging = true; move(e);
    line.addEventListener('pointermove', move); line.addEventListener('pointerup', up);
  });
  line.addEventListener('mousemove', (e) => { const [f, s] = seekAt(e.clientX); const tip = line.querySelector('.rz-ptip'); tip.textContent = fmt(s); tip.style.left = f * 100 + '%'; });
  line.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); api('seek', Math.max(0, (+api('time') || 0) + (e.key === 'ArrowLeft' ? -10 : 10))); } });

  // click on the picture toggles, double click goes full screen
  ui.addEventListener('click', (e) => { if (e.target === ui) { pop.hidden = true; toggle(); } });
  ui.addEventListener('dblclick', (e) => { if (e.target === ui) bFull.click(); });

  // auto-hide while playing
  let idle;
  const wake = () => { ui.classList.add('rz-awake'); clearTimeout(idle); idle = setTimeout(() => { if (api('playing') && pop.hidden) ui.classList.remove('rz-awake'); }, 2600); };
  holder.addEventListener('mousemove', wake);
  holder.addEventListener('mouseleave', () => { if (api('playing')) ui.classList.remove('rz-awake'); });

  // the extension's "Смотреть / Продолжить" button asks us to start playback
  document.addEventListener('rz-play', () => { if (!api('playing')) api('play'); });

  let dragging = false;
  const tick = () => {
    const t = +api('time') || 0, d = +api('duration') || 0, b = +api('buffered') || 0, playing = !!api('playing'), muted = !!api('muted');
    if (!dragging) line.style.setProperty('--p', d ? t / d : 0);
    line.style.setProperty('--b', d ? Math.min(1, b / d) : 0);
    line.setAttribute('aria-valuetext', fmt(t) + ' из ' + fmt(d));
    time.innerHTML = d ? `<b>${fmt(t)}</b> / ${fmt(d)}` : '';
    bPlay.innerHTML = playing ? I.pause : I.play; bPlay.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть');
    bVol.innerHTML = muted ? I.mute : I.vol;
    if (document.activeElement !== vol) vol.value = muted ? 0 : (+api('volume') || 0);
    bQual.textContent = clean(api('quality')).replace(/\s.*/, '') || 'HD';
    ui.classList.toggle('rz-playing', playing);
    ui.classList.toggle('rz-started', playing || t > 0);
    const ep = document.querySelector('.b-simple_episode__item.active'), se = document.querySelector('.b-simple_season__item.active'), vo = document.querySelector('.b-translator__item.active');
    plate.innerHTML = (ep ? `<span class="rz-pse">${se ? 'Сезон ' + se.dataset.tab_id + ' · ' : ''}Серия ${ep.dataset.episode_id}</span>` : '') + (vo ? `<span>${vo.textContent.trim()}</span>` : '');
    plate.hidden = !plate.innerHTML;
    hideNative();
  };
  setInterval(tick, 250);
  tick(); wake();
})();
