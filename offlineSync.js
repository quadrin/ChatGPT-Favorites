// Downloads the full text of favorited chats into chrome.storage.local so they
// can be read offline, and reports progress on the page and to offline.html.
// Runs in the ChatGPT tab because the download needs the user's session.
const OfflineSync = (function () {
  const STATUS_KEY = 'offlineSync';
  let running = false;
  let timer = null;
  let panel = null;

  async function setStatus(status) {
    const full = { ...status, updatedAt: Date.now() };
    await chrome.storage.local.set({ [STATUS_KEY]: full });
    renderPanel(full);
  }

  function renderPanel(status) {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'chatgpt-favorites-sync';
      panel.style.cssText = [
        'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
        'width:260px', 'padding:10px 12px', 'border-radius:8px',
        'background:#202123', 'color:#ececf1', 'font:13px/1.4 system-ui,sans-serif',
        'box-shadow:0 4px 16px rgba(0,0,0,.35)',
      ].join(';');
      panel.innerHTML = '<div class="cf-text"></div>' +
        '<progress class="cf-bar" style="width:100%;height:8px;margin-top:6px"></progress>';
      document.body.appendChild(panel);
    }
    const text = panel.querySelector('.cf-text');
    const bar = panel.querySelector('.cf-bar');
    bar.max = Math.max(status.total, 1);
    bar.value = status.done;

    if (status.state === 'running') {
      text.textContent = `Saving favorites for offline: ${status.done} of ${status.total}` +
        (status.current ? ` — ${status.current}` : '');
    } else if (status.state === 'done') {
      text.textContent = status.failed
        ? `Saved ${status.done - status.failed} of ${status.total} chats for offline. ${status.failed} failed.`
        : `Saved ${status.total} chat${status.total === 1 ? '' : 's'} for offline.`;
    } else {
      text.textContent = status.error || 'Offline save failed.';
    }
    panel.style.display = 'block';

    clearTimeout(panel.hideTimer);
    if (status.state !== 'running') {
      panel.hideTimer = setTimeout(() => { panel.style.display = 'none'; }, 4000);
    }
  }

  async function getAccessToken() {
    const response = await fetch(`${location.origin}/api/auth/session`, { credentials: 'include' });
    if (!response.ok) throw new Error(`Session request failed (${response.status})`);
    const session = await response.json();
    if (!session.accessToken) throw new Error('Not logged in to ChatGPT');
    return session.accessToken;
  }

  // Follow the active branch of the conversation from its last message back to the start.
  function extractMessages(conversation) {
    const mapping = conversation.mapping || {};
    const messages = [];
    let nodeId = conversation.current_node;
    while (nodeId && mapping[nodeId]) {
      const message = mapping[nodeId].message;
      const role = message && message.author && message.author.role;
      const parts = message && message.content && message.content.parts;
      if ((role === 'user' || role === 'assistant') && Array.isArray(parts)) {
        const text = parts.filter((part) => typeof part === 'string').join('\n').trim();
        if (text) messages.push({ role, text });
      }
      nodeId = mapping[nodeId].parent;
    }
    return messages.reverse();
  }

  async function downloadChat(chat, token) {
    const response = await fetch(`${location.origin}/backend-api/conversation/${chat.conversationId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const conversation = await response.json();
    // Only store it if the chat is still a favorite
    if (await OfflineStore.get('chat', chat.id)) {
      await OfflineStore.save({
        ...chat,
        title: conversation.title || chat.title,
        messages: extractMessages(conversation),
        downloadedAt: Date.now(),
      });
    }
  }

  // Download favorited chats. With `all` false, only chats without a saved copy.
  async function run(all) {
    if (running) return;
    running = true;
    try {
      const chats = (await OfflineStore.all('chat'))
        .filter((chat) => chat.conversationId && (all || !chat.messages));
      if (chats.length === 0) {
        if (all) await setStatus({ state: 'done', total: 0, done: 0, failed: 0 });
        return;
      }

      const status = { state: 'running', total: chats.length, done: 0, failed: 0, current: '' };
      await setStatus(status);

      let token;
      try {
        token = await getAccessToken();
      } catch (error) {
        await setStatus({ ...status, state: 'error', error: error.message });
        return;
      }

      for (const chat of chats) {
        status.current = chat.title;
        await setStatus(status);
        try {
          await downloadChat(chat, token);
        } catch (error) {
          status.failed++;
        }
        status.done++;
        await setStatus(status);
      }
      await setStatus({ ...status, state: 'done', current: '' });
    } finally {
      running = false;
    }
  }

  // Wait for a burst of new favorites to settle before downloading.
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => run(false), 1500);
  }

  // offline.html asks the open ChatGPT tab to re-download every favorited chat.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'chatgpt-favorites:sync') {
      run(true);
      sendResponse({ started: true });
    }
  });

  return { schedule, run };
})();
