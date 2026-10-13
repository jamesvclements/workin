import { el, link, avatar, body, dateLabel, url } from './dom.js';
import { icon } from './icons.js';

/** Slack and social posts keep the author's words, identity, and reactions. */
export function createSourceCard(source, { timeZone = 'UTC', emoji = {} } = {}) {
  const card = el('article', `wk-card wk-source wk-${source.type}`);
  card.setAttribute('aria-label', `${source.type === 'slack' ? 'Slack message' : 'Post'} by ${source.author?.name || 'Unknown author'}`);
  const context = link('', source.url, 'wk-card-context');
  context.append(source.type === 'slack' ? icon('slack') : el('span', 'wk-post-mark', '𝕏'), document.createTextNode(source.context || (source.type === 'slack' ? 'Slack' : 'Post')));
  const content = el('div', 'wk-card-content');
  const author = el('div', 'wk-author');
  const identity = el('div');
  identity.append(el('strong', '', source.author?.name || 'Unknown author'));
  if (source.at) identity.append(el('div', 'wk-muted', dateLabel(source.at, timeZone)));
  author.append(avatar(source.author), identity);
  content.append(author, body(source, emoji));
  if (source.reactions?.length) {
    const reactions = el('div', 'wk-reactions');
    const unicode = { thumbsup: '👍', '+1': '👍', heart: '❤️', eyes: '👀', fire: '🔥', tada: '🎉', clap: '👏' };
    for (const reaction of source.reactions) {
      const badge = el('span', 'wk-reaction');
      const label = reaction.label.replace(/^:|:$/g, '');
      const fallback = unicode[label] || `:${label}:`;
      const src = url(emoji[label]);
      if (src) {
        const image = el('img', 'wk-emoji');
        image.alt = fallback;
        image.src = src;
        image.addEventListener('error', () => image.replaceWith(document.createTextNode(fallback)), { once: true });
        badge.append(image);
      } else badge.append(document.createTextNode(fallback));
      badge.append(document.createTextNode(` ${reaction.count}`));
      badge.setAttribute('aria-label', `${label}: ${reaction.count} reactions at collection time`);
      reactions.append(badge);
    }
    content.append(reactions);
  }
  card.append(context, content);
  return card;
}
