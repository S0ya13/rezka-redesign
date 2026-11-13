// document_end: loads the app from the extension folder on every page load, so the code and styles
// live in app/ (web-accessible) instead of being baked into the manifest's cached content scripts.
(async () => {
  const url = (p) => chrome.runtime.getURL(p);
  const link = (href) => Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  // last in <head>, so equal-specificity !important rules beat Rezka's own sheets
  document.head.append(
    link('https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@800;900&family=Sofia+Sans:wght@400;500;600;700&display=swap'),
    link(url('app/app.css')));
  // our player controls run in the page's own JS world, next to Rezka's Playerjs
  document.documentElement.append(Object.assign(document.createElement('script'), { src: url('app/player.js') }));
  try {
    await (await import(url('app/main.js'))).start();
  } catch (e) {
    console.error('[rezka-redesign]', e);
    document.documentElement.classList.add('rz-ready', 'rz-failed');
  }
})();
