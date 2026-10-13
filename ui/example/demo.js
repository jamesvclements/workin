import { createTimeline } from '../index.js';

const container = document.querySelector('#journal');
const status = document.querySelector('#status');
try {
  const response = await fetch(new URL('./journal.json', import.meta.url));
  if (!response.ok) throw new Error(`Could not load the example (${response.status}).`);
  const journal = await response.json();
  // Resolve relative demo assets explicitly, independent of the host page URL.
  for (const asset of Object.values(journal.media)) {
    asset.src = new URL(asset.src, import.meta.url).href;
  }
  const timeline = createTimeline(container, journal);
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => {
      timeline.update({ view: { mode: button.dataset.mode } });
      for (const other of document.querySelectorAll('[data-mode]')) other.setAttribute('aria-pressed', String(other === button));
      status.textContent = `${button.textContent} view`;
    });
  }
} catch (error) {
  status.classList.add('has-error');
  status.textContent = error.message;
} finally {
  container.setAttribute('aria-busy', 'false');
}
