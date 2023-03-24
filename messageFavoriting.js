function waitForElement(selector, callback) {
  if (document.querySelector(selector)) {
    callback();
  } else {
    setTimeout(function () {
      waitForElement(selector, callback);
    }, 100);
  }
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

function createStarButton(logId) {
  const button = document.createElement('button');
  button.className = 'p-1 hover:text-white star-button';
  button.style.fill = 'none';
  button.appendChild(createStarSvg());
  button.dataset.logId = logId;

  // Check if the log has been favorited and update the star color accordingly
  if (localStorage.getItem(`log-favorited-${logId}`) === 'true') {
    button.querySelector('svg').classList.add('text-yellow-400');
  }

  button.addEventListener('click', function () {
    const svg = this.querySelector('svg');
    svg.classList.toggle('text-yellow-400');
    // Store the favorited status in localStorage
    localStorage.setItem(`log-favorited-${logId}`, svg.classList.contains('text-yellow-400'));
  });
  return button;
}

function addStarButton() {
  // Use the selector '.whitespace-pre-wrap' to target the message elements
  const messageElements = document.querySelectorAll('.whitespace-pre-wrap');
  messageElements.forEach(function (messageElement, index) {
    // Check if the message element already has a star button
    if (!messageElement.parentElement.querySelector('.star-button')) {
      // Insert the star button before the message element
      messageElement.parentElement.insertBefore(createStarButton(index), messageElement);
    }
  });
}

// Use the selector '.whitespace-pre-wrap' in waitForElement to wait for the presence of message elements
waitForElement('.whitespace-pre-wrap', function () {
  addStarButton();
  const observer = new MutationObserver(addStarButton);
  observer.observe(document.body, { childList: true, subtree: true });
});



