import { el, button, stopMedia } from './dom.js';

/** A reusable, keyboard-accessible deck. Nodes remain mounted while cycling. */
export function createStack(nodes, { label = 'Attachments' } = {}) {
  const root = el('section', 'wk-stack');
  root.setAttribute('aria-label', label);
  const deck = el('div', 'wk-stack-deck');
  const items = nodes.map(node => {
    const item = el('div', 'wk-stack-item');
    item.append(node);
    deck.append(item);
    return item;
  });
  root.append(deck);
  if (items.length < 2) return root;
  let active = 0;
  const controls = el('div', 'wk-stack-controls');
  const count = el('span');
  count.setAttribute('aria-live', 'polite');
  const previous = button('←', '', () => show(active - 1));
  const next = button('→', '', () => show(active + 1));
  previous.setAttribute('aria-label', `Previous ${label.toLowerCase()}`);
  next.setAttribute('aria-label', `Next ${label.toLowerCase()}`);
  controls.append(previous, count, next);
  root.append(controls);
  function show(index) {
    active = (index + items.length) % items.length;
    items.forEach((item, i) => {
      const depth = (i - active + items.length) % items.length;
      item.style.setProperty('--depth', Math.min(depth, 2));
      item.hidden = depth > 2;
      item.inert = depth !== 0;
      item.setAttribute('aria-hidden', String(depth !== 0));
      item.classList.toggle('is-front', depth === 0);
      if (depth) stopMedia(item);
    });
    count.textContent = `${active + 1} of ${items.length}`;
  }
  show(0);
  return root;
}
