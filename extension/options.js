// Same settings as the in-page «Настройки расширения» dialog (app/core.js), stored in chrome.storage.sync.
const $ = (id) => document.getElementById(id);
const status = $('status');
chrome.storage.sync.get({ omdbKey: '', theaterDefault: false, preview: true }).then((s) => {
  $('key').value = s.omdbKey; $('theater').checked = s.theaterDefault; $('preview').checked = s.preview;
});
const check = async () => {
  const v = $('key').value.trim();
  await chrome.storage.sync.set({ omdbKey: v });
  if (!v) { status.textContent = 'Ключ не указан.'; return; }
  status.textContent = 'Проверяем…';
  try {
    const r = await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(v)}&i=tt0903747`)).json();
    if (r.Response === 'True') chrome.storage.local.remove('omdbBad'); // forget an earlier rejection of this key
    status.textContent = r.Response === 'True' ? 'Ключ работает.' : 'Ключ не принят: ' + (r.Error || 'ошибка OMDb') + '.';
  } catch { status.textContent = 'OMDb не отвечает.'; }
};
$('key').addEventListener('change', check);
$('check').addEventListener('click', check);
$('theater').addEventListener('change', (e) => chrome.storage.sync.set({ theaterDefault: e.target.checked }));
$('preview').addEventListener('change', (e) => chrome.storage.sync.set({ preview: e.target.checked }));
