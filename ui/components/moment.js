import { el, button, dateLabel } from './dom.js';
import { createCard } from './card.js';

/** One timestamp, a short narrative, and the original evidence underneath. */
export function createMoment(moment, options = {}) {
  const section = el('article', 'wk-moment');
  section.dataset.momentId = moment.id;
  section.tabIndex = -1;
  const time = el('time', 'wk-timestamp', dateLabel(moment.at, options.timeZone));
  time.dateTime = moment.at;
  const messages = el('div', 'wk-messages');
  if (options.parent) {
    const quote = button(options.parent.summary, 'wk-context', event => options.onThread?.(options.parent.id, event.currentTarget));
    quote.setAttribute('aria-label', `Earlier in this thread: ${options.parent.summary}`);
    quote.setAttribute('aria-haspopup', 'dialog');
    messages.append(quote);
    messages.classList.add('has-context');
  }
  const bubble = el('div', 'wk-bubble');
  bubble.append(el('p', '', moment.summary));
  messages.append(bubble);
  for (const source of moment.sources || []) messages.append(createCard(source, options));
  if (options.threadSize > 1 && options.onThread) {
    const open = button(`${options.threadSize} moments in this thread ↗`, 'wk-thread-link', event => options.onThread(moment.id, event.currentTarget));
    open.setAttribute('aria-haspopup', 'dialog');
    messages.append(open);
  }
  section.append(time, messages);
  return section;
}
