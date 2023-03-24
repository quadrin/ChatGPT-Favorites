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

function createStarButton(id, type) {
  const button = document.createElement('button');
  button.className = 'p-1 hover:text-white star-button';
  button.style.fill = 'none';
  button.appendChild(createStarSvg());
  button.dataset.id = id;
  button.dataset.type = type;

  // Check if the item has been favorited and update the star color accordingly
  if (localStorage.getItem(`favorited-${type}-${id}`) === 'true') {
    button.querySelector('svg').classList.add('text-yellow-400');
  }

  button.addEventListener('click', function () {
    const svg = this.querySelector('svg');
    svg.classList.toggle('text-yellow-400');
    // Store the favorited status in localStorage
    localStorage.setItem(`favorited-${type}-${id}`, svg.classList.contains('text-yellow-400'));
  });
  return button;
}

function addStarButton() {
  // Add star button to chat titles
  const chatTitles = document.querySelectorAll('.flex.py-3.px-3.items-center.gap-3.relative');
  chatTitles.forEach(function (chatTitle, index) {
    if (!chatTitle.querySelector('.star-button')) {
      const svgIcon = chatTitle.querySelector('svg');
      chatTitle.insertBefore(createStarButton(index, 'log'), svgIcon);
    }
  });
}

// Wait for elements to load and then add star buttons
const observer = new MutationObserver(addStarButton);
observer.observe(document.body, { childList: true, subtree: true });

// Initial run to add star buttons to existing elements
addStarButton();