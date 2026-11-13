// Entry point, imported by loader.js. core.js builds what every page shares; one page module
// rebuilds the content for the kind of page we are on; modals.js restyles Rezka's popups.
import { init, here, isTitle, root } from './core.js';

const pageModule = () => {
  if (isTitle) return 'title';
  if (here === '/' || /^\/page\/\d+\/?$/.test(here)) return 'home';
  if (/^\/(continue|favorites|settings|user)\//.test(here)) return 'account'; // /settings/ redirects to /user/<id>/…
  return 'lists'; // catalogues, genres, «Новинки», search, announce, collections, person pages
};

export async function start() {
  await init();
  const name = pageModule();
  root.classList.add('rz-' + name);
  try { await (await import(`./${name}.js`)).run(); } catch (e) { console.error('[rezka-redesign]', name, e); }
  try { (await import('./modals.js')).run(); } catch (e) { console.error('[rezka-redesign] modals', e); }
  root.classList.add('rz-ready');
}
