import { el, link, body, dateLabel, button } from './dom.js';
import { icon } from './icons.js';
import { createSourceCard } from './source-card.js';
import { createMedia } from './media.js';
import { createStack } from './stack.js';

export function createPullRequestChip(source) {
  const chip = link('', source.url, 'wk-pr-chip');
  chip.append(icon(source.state), document.createTextNode(source.title));
  return chip;
}

function pullRequest(source, options) {
  const card = el('article', 'wk-card wk-pr');
  const header = el('div', 'wk-card-content wk-pr-header');
  const repository = el('div', 'wk-repository');
  repository.append(icon('github'), el('span', '', `${source.repository} #${source.number}`));
  const state = el('span', `wk-pr-state is-${source.state}`, source.state);
  state.prepend(icon(source.state));
  repository.append(state);
  header.append(repository, link(source.title, source.url, 'wk-card-title'));
  if (source.author) header.append(el('div', 'wk-muted', `by ${source.author.name}`));
  const changes = el('div', 'wk-diff');
  if (Number.isFinite(source.additions)) changes.append(el('span', 'wk-additions', `+${source.additions}`));
  if (Number.isFinite(source.deletions)) changes.append(el('span', 'wk-deletions', `−${source.deletions}`));
  if (changes.childNodes.length) header.append(changes);
  const content = el('div', 'wk-card-content');
  content.append(body(source, options.emoji));
  card.append(header, content);
  return card;
}

function documentCard(source, options) {
  const card = el('article', 'wk-card wk-document');
  card.append(link(source.provider || 'Document', source.url, 'wk-card-context'));
  const content = el('div', 'wk-card-content');
  content.append(link(source.title, source.url, 'wk-card-title'), body(source, options.emoji));
  if (source.excerpt) content.append(el('p', 'wk-muted', 'Excerpt from original'));
  card.append(content);
  return card;
}

function eventCard(source, { timeZone = 'UTC' }) {
  const card = el('article', 'wk-card wk-event');
  const date = el('div', 'wk-event-date');
  const instant = new Date(source.start);
  date.append(
    el('span', '', instant.toLocaleDateString(undefined, { timeZone, month: 'short' })),
    el('strong', '', instant.toLocaleDateString(undefined, { timeZone, day: 'numeric' })),
  );
  const content = el('div');
  content.append(link(source.title, source.url, 'wk-card-title'), el('p', 'wk-muted', dateLabel(source.start, timeZone)));
  if (source.end) content.append(el('p', 'wk-muted', `Ends ${dateLabel(source.end, timeZone)}`));
  if (source.status) content.append(el('span', 'wk-status', source.status));
  if (source.text) content.append(body(source));
  card.append(date, content);
  return card;
}

/** Standalone source card, with optional media and an expandable compact view. */
export function createCard(source, options = {}) {
  let card;
  switch (source.type) {
    case 'slack': case 'post': card = createSourceCard(source, options); break;
    case 'pull-request': card = pullRequest(source, options); break;
    case 'document': card = documentCard(source, options); break;
    case 'event': card = eventCard(source, options); break;
    default:
      card = el('article', 'wk-card wk-card-content');
      card.append(link(source.title || 'Open source', source.url, 'wk-card-title'), body(source, options.emoji));
  }
  card.dataset.sourceId = source.id;
  if (source.attachments?.length) {
    const gallery = el('div', 'wk-attachments');
    const media = source.attachments.map(attachment => createMedia(attachment, options));
    if (source.layout === 'stack') gallery.append(createStack(media));
    else { gallery.classList.toggle('is-pair', source.layout === 'pair'); gallery.append(...media); }
    card.append(gallery);
  }
  if (options.compact) {
    const wrapper = el('div', 'wk-embed is-collapsed');
    const viewport = el('div', 'wk-embed-viewport');
    viewport.append(card);
    // A collapsed visual preview is inert; expand exposes all of its controls.
    viewport.inert = true;
    const toggle = button('Show original', 'wk-expand', () => {
      const expanded = wrapper.classList.toggle('is-expanded');
      wrapper.classList.toggle('is-collapsed', !expanded);
      viewport.inert = !expanded;
      toggle.textContent = expanded ? 'Show less' : 'Show original';
      toggle.setAttribute('aria-expanded', String(expanded));
    });
    toggle.setAttribute('aria-expanded', 'false');
    wrapper.append(viewport, toggle);
    return wrapper;
  }
  return card;
}
