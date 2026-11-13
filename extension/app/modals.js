// modals.js — Rezka's popups on every page: its .b-popup windows (info, login, trailer), the full-screen #ps-overlay-wrap
// (trailer, «Сообщи нам», bookmark folders) and the title page's bookmarks popover. Rezka builds and opens them itself;
// we only name the controls and make its click-only items reachable from the keyboard. Look: css/modals.css.
import { $, $$, txt } from './core.js';

const press = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } };
const button = (el, label) => {
  if (!el || el.dataset.rzBtn) return;
  el.dataset.rzBtn = '1';
  if (!/^(A|BUTTON)$/.test(el.tagName)) { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('keydown', press); }
  if (label) el.setAttribute('aria-label', label);
};

// popups appear later (Rezka appends #info-popup, fills #ps-content): label them as they come
const label = () => {
  for (const p of $$('.b-popup')) {
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', txt($('.b-popup__title', p)) || 'Окно');
    button($('.b-popup__close', p), 'Закрыть');
  }
  for (const li of $$('#ps-content li.report-item')) button(li);
  const ps = $('#ps-overlay-wrap');
  const t = ps && $('#ps-content [id$="-title"]', ps); // its first text, without the <small> context line
  if (ps) ps.setAttribute('aria-label', (t?.firstChild?.textContent || '').trim() || 'Окно');
};

export function run() {
  const ps = $('#ps-overlay-wrap');
  if (ps) { ps.setAttribute('role', 'dialog'); ps.setAttribute('aria-modal', 'true'); button($('#ps-close', ps), 'Закрыть'); }
  label();
  new MutationObserver(label).observe(document.body, { childList: true });
  // Rezka closes its .b-popup on Esc only while the popup itself has focus
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('.b-popup__opened .b-popup__close')?.click(); });
  if ($('#ps-content')) new MutationObserver(label).observe($('#ps-content'), { childList: true, subtree: true });

  // «Есть ошибки или проблемы? Сообщи нам!»: Rezka opens its report form from #send-video-issue, which sits in the
  // hidden social block; the visible line under the player triggers it instead
  const support = $('.b-post__support_holder'), report = $('#send-video-issue');
  if (support && report) { button(support); support.addEventListener('click', () => report.click()); }
  // Rezka's «new bookmark folder» field (title page popover, /favorites/) has only a placeholder
  $('#addcat-fav-name')?.setAttribute('aria-label', 'Название нового раздела');
}
