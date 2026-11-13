// document_start: put the saved theme on <html> before the first paint (classes t-dark|t-light and p-<palette>).
chrome.storage.sync.get(['mode', 'palette']).then(({ mode = 'dark', palette = 'sumerki' }) => {
  const dark = mode === 'sys' ? !matchMedia('(prefers-color-scheme: light)').matches : mode !== 'light';
  document.documentElement.classList.add(dark ? 't-dark' : 't-light', 'p-' + palette);
});
