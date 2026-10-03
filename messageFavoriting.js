// Star buttons for individual messages in a chat.
(function () {
  function waitForElement(selector, callback) {
    if (document.querySelector(selector)) {
      callback();
    } else {
      setTimeout(function () {
        waitForElement(selector, callback);
      }, 100);
    }
  }

  function messageRecord(messageElement, logId) {
    const roleElement = messageElement.closest('[data-message-author-role]');
    return {
      type: 'message',
      id: logId,
      text: messageElement.innerText || messageElement.textContent,
      role: roleElement ? roleElement.getAttribute('data-message-author-role') : null,
      chatTitle: document.title,
      url: location.href,
    };
  }

  function createStarButton(messageElement, logId) {
    const button = document.createElement('button');
    button.className = 'p-1 hover:text-white star-button';
    button.style.fill = 'none';
    button.appendChild(createStarSvg());
    button.dataset.logId = logId;

    // Check if the log has been favorited and update the star color accordingly
    if (localStorage.getItem(`log-favorited-${logId}`) === 'true') {
      button.querySelector('svg').classList.add('text-yellow-400');
      // Favorites from before offline support have no saved copy yet
      OfflineStore.saveIfMissing(messageRecord(messageElement, logId));
    }

    button.addEventListener('click', function () {
      const svg = this.querySelector('svg');
      svg.classList.toggle('text-yellow-400');
      const favorited = svg.classList.contains('text-yellow-400');
      // Store the favorited status in localStorage
      localStorage.setItem(`log-favorited-${logId}`, favorited);
      // Keep a copy of the text so it can be read offline
      if (favorited) {
        OfflineStore.save(messageRecord(messageElement, logId));
      } else {
        OfflineStore.remove('message', logId);
      }
    });
    return button;
  }

  function addStarButton() {
    // Use the selector '.whitespace-pre-wrap' to target the message elements
    const messageElements = document.querySelectorAll('.whitespace-pre-wrap');
    messageElements.forEach(function (messageElement, index) {
      // Generate a unique identifier based on the message content and index
      const logId = `${hashCode(messageElement.textContent)}-${index}`;

      // Check if the message element already has a star button
      if (!messageElement.parentElement.querySelector('.star-button')) {
        // Insert the star button before the message element
        messageElement.parentElement.insertBefore(createStarButton(messageElement, logId), messageElement);
      }
    });
  }

  // Use the selector '.whitespace-pre-wrap' in waitForElement to wait for the presence of message elements
  waitForElement('.whitespace-pre-wrap', function () {
    addStarButton();
    const observer = new MutationObserver(addStarButton);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
