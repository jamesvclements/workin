/** Small DOM helpers. Evidence is always text, never executable HTML. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function url(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value, document.baseURI);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}

export function link(text, href, className = '') {
  const safe = url(href);
  const node = el(safe ? 'a' : 'span', className, text);
  if (safe) {
    node.href = safe;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
  return node;
}

export function button(text, className, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function dateLabel(at, timeZone = 'UTC', dateOnly = false) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone, month: 'short', day: 'numeric', year: 'numeric',
    ...(dateOnly ? {} : { hour: 'numeric', minute: '2-digit' }),
  }).format(new Date(at));
}

export function avatar(person) {
  const name = person?.name || 'Unknown author';
  const fallback = el('span', 'wk-avatar', name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join(''));
  fallback.setAttribute('aria-label', name);
  fallback.setAttribute('role', 'img');
  const src = url(person?.avatar);
  if (!src) return fallback;
  const image = el('img', 'wk-avatar');
  image.src = src;
  image.alt = name;
  image.loading = 'lazy';
  image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
  return image;
}

export function body(source, emoji = {}) {
  const node = el('div', 'wk-body');
  for (const part of source.parts || [{ text: source.text || '' }]) {
    const tag = { bold: 'strong', italic: 'em', code: 'code', codeblock: 'pre' }[part.style] || 'span';
    const span = part.url ? link('', part.url) : el(tag);
    const text = part.text || '';
    let offset = 0;
    for (const match of text.matchAll(/:([\w+-]+):/g)) {
      span.append(document.createTextNode(text.slice(offset, match.index)));
      const src = !['code', 'pre'].includes(tag) && url(emoji[match[1]]);
      if (src) {
        const image = el('img', 'wk-emoji');
        image.alt = match[0];
        image.src = src;
        image.addEventListener('error', () => image.replaceWith(document.createTextNode(match[0])), { once: true });
        span.append(image);
      } else span.append(document.createTextNode(match[0]));
      offset = match.index + match[0].length;
    }
    span.append(document.createTextNode(text.slice(offset)));
    node.append(span);
  }
  return node;
}

export function stopMedia(root) {
  for (const media of root.querySelectorAll('video, audio')) media.pause();
}
