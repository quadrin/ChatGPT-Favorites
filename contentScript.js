// Star buttons for chat titles in the sidebar.
(function () {
  // Older versions stored chat-title stars under either of these keys.
  function isFavorited(id) {
    return localStorage.getItem(`favorited-log-${id}`) === 'true' ||
      localStorage.getItem(`log-favorited-${id}`) === 'true';
  }

  function setFavorited(id, value) {
    localStorage.setItem(`favorited-log-${id}`, value);
    localStorage.setItem(`log-favorited-${id}`, value);
  }

  function chatRecord(chatTitle, id) {
    const link = chatTitle.closest('a') || chatTitle.querySelector('a');
    const href = link ? link.getAttribute('href') || '' : '';
    const match = href.match(/\/c\/([\w-]+)/);
    return {
      type: 'chat',
      id: id,
      title: chatTitle.textContent.trim(),
      conversationId: match ? match[1] : null,
      url: href ? new URL(href, location.origin).href : null,
    };
  }

  function createStarButton(chatTitle, id) {
    const button = document.createElement('button');
    button.className = 'p-1 hover:text-white star-button';
    button.style.fill = 'none';
    button.appendChild(createStarSvg());
    button.dataset.id = id;
    button.dataset.type = 'log';

    // Check if the chat has been favorited and update the star color accordingly
    if (isFavorited(id)) {
      button.querySelector('svg').classList.add('text-yellow-400');
      // Favorites from before offline support have no saved copy yet
      OfflineStore.saveIfMissing(chatRecord(chatTitle, id)).then(() => OfflineSync.schedule());
    }

    button.addEventListener('click', function () {
      const svg = this.querySelector('svg');
      svg.classList.toggle('text-yellow-400');
      const favorited = svg.classList.contains('text-yellow-400');
      // Store the favorited status in localStorage
      setFavorited(id, favorited);
      if (favorited) {
        OfflineStore.save(chatRecord(chatTitle, id)).then(() => OfflineSync.schedule());
      } else {
        OfflineStore.remove('chat', id);
      }
    });
    return button;
  }

  function addStarButton() {
    // Add star button to chat titles
    const chatTitles = document.querySelectorAll('.flex.py-3.px-3.items-center.gap-3.relative');
    chatTitles.forEach(function (chatTitle) {
      const chatId = hashCode(chatTitle.textContent);
      if (!chatTitle.querySelector('.star-button')) {
        const svgIcon = chatTitle.querySelector('svg');
        chatTitle.insertBefore(createStarButton(chatTitle, chatId), svgIcon);
      }
    });
  }

  // Wait for elements to load and then add star buttons
  const observer = new MutationObserver(addStarButton);
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run to add star buttons to existing elements
  addStarButton();
})();
