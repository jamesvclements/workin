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
  // The agent supplies the presentation in journal.json. The page displays it.
  createTimeline(container, journal);
} catch (error) {
  status.classList.add('has-error');
  status.textContent = error.message;
} finally {
  container.setAttribute('aria-busy', 'false');
}
