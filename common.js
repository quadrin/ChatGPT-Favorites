// Shared helpers for the content scripts. Loaded first (see manifest.json).

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to a 32-bit integer
  }
  return hash;
}

function createStarSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'h-4 w-4');
  svg.setAttribute('height', '1em');
  svg.setAttribute('width', '1em');
  svg.innerHTML = '<polygon points="12 1 15.09 8.26 23 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 1 9.27 8.91 8.26 12 1"></polygon>';
  return svg;
}

// Offline copies of favorites live in chrome.storage.local so the extension's
// own page (offline.html) can show them without a network connection.
// Keys look like `fav:message:<id>` and `fav:chat:<id>`.
const OfflineStore = {
  key(type, id) {
    return `fav:${type}:${id}`;
  },

  async get(type, id) {
    const key = this.key(type, id);
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async save(record) {
    const key = this.key(record.type, record.id);
    const existing = (await chrome.storage.local.get(key))[key] || {};
    await chrome.storage.local.set({ [key]: { ...existing, ...record, savedAt: Date.now() } });
  },

  async saveIfMissing(record) {
    if (!(await this.get(record.type, record.id))) {
      await this.save(record);
    }
  },

  async remove(type, id) {
    await chrome.storage.local.remove(this.key(type, id));
  },

  async all(type) {
    const items = await chrome.storage.local.get(null);
    const prefix = type ? `fav:${type}:` : 'fav:';
    return Object.keys(items)
      .filter((key) => key.startsWith(prefix))
      .map((key) => items[key]);
  },
};
