import { el, button, stopMedia } from './dom.js';

/** Native dialog owns focus trapping and Escape. Its lifecycle belongs to its host. */
export function createThread(host, render) {
  const dialog = el('dialog', 'wk-thread');
  const header = el('div', 'wk-thread-header');
  const title = el('strong', '', 'Thread');
  const content = el('div', 'wk-thread-content');
  header.append(title, button('Done', 'wk-thread-done', () => dialog.close()));
  dialog.append(header, content);
  host.append(dialog);
  let trigger;
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    stopMedia(content);
    content.replaceChildren();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  });
  return {
    open(moments, { label = 'Thread', from } = {}) {
      stopMedia(host);
      stopMedia(content);
      title.textContent = label;
      dialog.setAttribute('aria-label', label);
      content.replaceChildren(...moments.map(render));
      trigger = from;
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
    },
    close() { if (dialog.open) dialog.close(); },
    destroy() { stopMedia(content); if (dialog.open) dialog.close(); dialog.remove(); },
  };
}
