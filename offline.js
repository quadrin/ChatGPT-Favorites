// Offline viewer for saved favorites. This page ships with the extension, so it
// opens and shows saved copies with no network connection.

const CHATGPT_URLS = ['https://chatgpt.com/*', 'https://chat.openai.com/*'];
// A sync with no update for this long was cut off (for example, the tab closed).
const STALE_SYNC_MS = 60 * 1000;

const isTab = new URLSearchParams(location.search).has('tab');
let favorites = [];
let syncStatus = null;
// Chats the reader has expanded, kept open when the list re-renders.
const openChats = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(time) {
  return time ? new Date(time).toLocaleString() : '';
}

function matches(record, query) {
  if (!query) return true;
  const haystack = [
    record.title, record.chatTitle, record.text,
    ...(record.messages || []).map((message) => message.text),
  ].join('\n').toLowerCase();
  return haystack.includes(query);
}

function renderChats(chats) {
  const container = document.getElementById('chats');
  container.replaceChildren();
  document.getElementById('chat-count').textContent = chats.length ? `(${chats.length})` : '';
  if (chats.length === 0) {
    container.append(el('div', 'empty', 'No favorited chats saved.'));
    return;
  }
  for (const chat of chats) {
    const card = el('details', 'card');
    card.open = openChats.has(chat.id);
    card.addEventListener('toggle', () => {
      if (card.open) openChats.add(chat.id); else openChats.delete(chat.id);
    });
    const summary = el('summary', null, chat.title || 'Untitled chat');
    card.append(summary);
    if (chat.messages) {
      card.append(el('div', 'meta', `${chat.messages.length} messages · saved ${formatDate(chat.downloadedAt)}`));
      for (const message of chat.messages) {
        const turn = el('div', 'turn');
        turn.append(el('div', 'role', message.role === 'user' ? 'You' : 'ChatGPT'));
        turn.append(el('div', 'text', message.text));
        card.append(turn);
      }
    } else {
      card.append(el('div', 'meta', chat.conversationId
        ? 'Not downloaded yet. Open ChatGPT while online to save this chat.'
        : 'Only the title was saved. This chat could not be downloaded.'));
    }
    container.append(card);
  }
}

function renderMessages(messages) {
  const container = document.getElementById('messages');
  container.replaceChildren();
  document.getElementById('message-count').textContent = messages.length ? `(${messages.length})` : '';
  if (messages.length === 0) {
    container.append(el('div', 'empty', 'No favorited messages saved.'));
    return;
  }
  for (const message of messages) {
    const card = el('div', 'card');
    const meta = [message.role === 'user' ? 'You' : message.role ? 'ChatGPT' : '', message.chatTitle, formatDate(message.savedAt)]
      .filter(Boolean).join(' · ');
    card.append(el('div', 'meta', meta));
    card.append(el('div', 'text', message.text));
    container.append(card);
  }
}

function render() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const visible = favorites
    .filter((record) => matches(record, query))
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  renderChats(visible.filter((record) => record.type === 'chat'));
  renderMessages(visible.filter((record) => record.type === 'message'));
}

function renderNetwork() {
  const badge = document.getElementById('network');
  badge.textContent = navigator.onLine ? 'Online' : 'Offline';
  badge.classList.toggle('offline', !navigator.onLine);
  document.getElementById('sync-button').disabled = !navigator.onLine || isSyncRunning();
}

function isSyncRunning() {
  return syncStatus && syncStatus.state === 'running' &&
    Date.now() - syncStatus.updatedAt < STALE_SYNC_MS;
}

function renderSync(message) {
  const text = document.getElementById('sync-text');
  const bar = document.getElementById('sync-bar');
  const status = syncStatus;

  if (message) {
    text.textContent = message;
  } else if (!status) {
    text.textContent = 'Favorited chats are saved here so you can read them without Wi-Fi.';
  } else if (isSyncRunning()) {
    text.textContent = `Downloading ${status.done} of ${status.total}` +
      (status.current ? ` — ${status.current}` : '');
  } else if (status.state === 'running') {
    text.textContent = `Download stopped at ${status.done} of ${status.total}. Open ChatGPT and try again.`;
  } else if (status.state === 'done') {
    text.textContent = `Last download: ${status.done - status.failed} of ${status.total} chats saved` +
      (status.failed ? `, ${status.failed} failed` : '') + ` (${formatDate(status.updatedAt)}).`;
  } else {
    text.textContent = status.error || 'The last download failed.';
  }

  bar.hidden = !status || status.total === 0;
  if (status) {
    bar.max = Math.max(status.total, 1);
    bar.value = status.done;
  }
  renderNetwork();
}

async function load() {
  const items = await chrome.storage.local.get(null);
  favorites = Object.keys(items)
    .filter((key) => key.startsWith('fav:'))
    .map((key) => items[key]);
  syncStatus = items.offlineSync || null;
  render();
  renderSync();
}

// The download runs in a ChatGPT tab, because it needs the user's session there.
async function startSync() {
  const tabs = await chrome.tabs.query({ url: CHATGPT_URLS });
  if (tabs.length === 0) {
    renderSync('Open ChatGPT in a tab, then try again.');
    return;
  }
  const tab = tabs.find((t) => t.active) || tabs[0];
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'chatgpt-favorites:sync' });
    renderSync('Starting download…');
  } catch (error) {
    renderSync('Reload your ChatGPT tab, then try again.');
  }
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('sync-button').addEventListener('click', startSync);
document.getElementById('open-tab').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('offline.html?tab') });
  window.close();
});
window.addEventListener('online', renderNetwork);
window.addEventListener('offline', renderNetwork);

// Update the list and the progress bar live while a download runs.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});

if (isTab) {
  document.body.classList.add('tab');
  document.getElementById('open-tab').hidden = true;
}

load();
