const input = document.getElementById('key');
const status = document.getElementById('status');
chrome.storage.sync.get('omdbKey').then(({ omdbKey }) => { input.value = omdbKey || ''; });
input.addEventListener('change', async () => {
  await chrome.storage.sync.set({ omdbKey: input.value.trim() });
  status.textContent = 'Сохранено.';
});
