import { el, link, url } from './dom.js';

/** Resolve only supplied assets. This component never contacts a provider API. */
export function createMedia(attachment, { media = {} } = {}) {
  const figure = el('figure', 'wk-media');
  const cached = media[attachment.id];
  const src = url(cached?.src);
  if (src && ['image', 'video'].includes(attachment.kind)) {
    const node = el(attachment.kind === 'video' ? 'video' : 'img');
    if (attachment.kind === 'video') {
      node.controls = true;
      node.playsInline = true;
      node.preload = 'metadata';
      node.setAttribute('aria-label', attachment.alt || attachment.name);
      if (url(cached.poster)) node.poster = url(cached.poster);
    } else {
      node.alt = attachment.alt || attachment.name;
      node.loading = 'lazy';
    }
    node.addEventListener('error', () => {
      node.replaceWith(link('Preview unavailable · Open original', attachment.url, 'wk-media-missing'));
    }, { once: true });
    node.src = src;
    figure.append(node);
  } else {
    figure.append(link(src ? 'Open file' : 'Preview unavailable · Open original', src || attachment.url, 'wk-media-missing'));
  }
  figure.append(el('figcaption', '', attachment.name));
  return figure;
}
