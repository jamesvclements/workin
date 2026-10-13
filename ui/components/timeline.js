import { el, button, dateLabel, stopMedia } from './dom.js';
import { createCard } from './card.js';
import { createMoment } from './moment.js';
import { createThread } from './thread.js';

function check(options) {
  new Intl.DateTimeFormat(undefined, { timeZone: options.timeZone });
  const ids = new Set();
  for (const moment of options.moments) {
    if (!moment.id || ids.has(moment.id)) throw new Error('Each moment needs a unique ID.');
    if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(moment.at) || !Number.isFinite(Date.parse(moment.at))) throw new Error(`Moment ${moment.id} needs a timestamp with timezone.`);
    if (typeof moment.summary !== 'string' || !Array.isArray(moment.sources)) throw new Error(`Moment ${moment.id} needs a summary and sources array.`);
    ids.add(moment.id);
  }
  for (const moment of options.moments) {
    if (moment.parentId && !ids.has(moment.parentId)) throw new Error(`Unknown parent for ${moment.id}: ${moment.parentId}`);
    if (moment.parentId) {
      const parent = options.moments.find(item => item.id === moment.parentId);
      if (Date.parse(parent.at) >= Date.parse(moment.at)) throw new Error(`The parent of ${moment.id} must be an earlier moment.`);
    }
  }
  if (!['detailed', 'highlights'].includes(options.view.mode || 'detailed')) throw new Error('View mode must be detailed or highlights.');
  for (const key of ['from', 'to']) {
    const value = options.view[key];
    if (value !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error(`View ${key} needs an ISO date.`);
  }
  if (options.view.from && options.view.to && options.view.from > options.view.to) throw new Error('View dates are reversed.');
  const grouped = new Set(), groupIds = new Set();
  for (const group of options.groups) {
    if (!group.id || groupIds.has(group.id) || typeof group.summary !== 'string' || !group.momentIds?.length) throw new Error('Each group needs a unique ID, summary, and moment IDs.');
    groupIds.add(group.id);
    for (const id of group.momentIds) {
      if (!ids.has(id) || grouped.has(id)) throw new Error(`Unknown or overlapping group member: ${id}`);
      grouped.add(id);
    }
    const sourceIds = new Set(options.moments.filter(moment => group.momentIds.includes(moment.id)).flatMap(moment => moment.sources.map(source => source.id)));
    if (group.sourceIds?.some(id => !sourceIds.has(id))) throw new Error(`Group ${group.id} selects a source outside its members.`);
  }
}

function localDate(at, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** @param {HTMLElement} container @param {import('../index').TimelineOptions} initial */
export function createTimeline(container, initial) {
  let options = { timeZone: 'UTC', groups: [], media: {}, emoji: {}, view: {}, ...initial };
  check(options);
  const root = el('div', 'wk');
  const list = el('div', 'wk-timeline');
  list.setAttribute('role', 'region');
  list.setAttribute('aria-label', 'Work timeline');
  root.append(list);
  container.append(root);
  const thread = createThread(root, moment => createMoment(moment, options));
  let destroyed = false;

  function render() {
    thread.close();
    stopMedia(list);
    const all = [...options.moments].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const byId = new Map(all.map(moment => [moment.id, moment]));
    const omitted = new Set(options.view.omitted || []);
    const visible = all.filter(moment => {
      const day = localDate(moment.at, options.timeZone);
      return !omitted.has(moment.id) && (!options.view.from || day >= options.view.from) && (!options.view.to || day <= options.view.to);
    });
    const neighbors = new Map(all.map(moment => [moment.id, new Set()]));
    for (const moment of all) {
      if (byId.has(moment.parentId)) {
        neighbors.get(moment.id).add(moment.parentId);
        neighbors.get(moment.parentId).add(moment.id);
      }
    }
    const connected = id => {
      const found = new Set(), pending = [id];
      while (pending.length) {
        const next = pending.pop();
        if (found.has(next)) continue;
        found.add(next);
        pending.push(...neighbors.get(next) || []);
      }
      return all.filter(moment => found.has(moment.id));
    };
    const onThread = (id, from) => thread.open(connected(id), { from });
    const momentNode = moment => createMoment(moment, {
      ...options, parent: byId.get(moment.parentId), threadSize: connected(moment.id).length, onThread,
    });
    const nodes = [];
    if (options.view.mode === 'highlights') {
      const visibleIds = new Set(visible.map(moment => moment.id));
      // A partial group cannot inherit a summary that claims excluded work.
      const groups = options.groups.filter(group => group.momentIds.every(id => visibleIds.has(id)));
      const covered = new Set(groups.flatMap(group => group.momentIds));
      const entries = groups.map(group => ({ group, at: Math.max(...group.momentIds.map(id => Date.parse(byId.get(id).at))) }));
      for (const moment of visible) if (!covered.has(moment.id)) entries.push({ moment, at: Date.parse(moment.at) });
      entries.sort((a, b) => a.at - b.at);
      for (const entry of entries) {
        if (entry.moment) { nodes.push(momentNode(entry.moment)); continue; }
        const group = entry.group;
        const members = all.filter(moment => group.momentIds.includes(moment.id));
        const section = el('article', 'wk-moment');
        section.tabIndex = -1;
        section.dataset.groupId = group.id;
        section.append(el('div', 'wk-timestamp', dateLabel(new Date(entry.at).toISOString(), options.timeZone, true)));
        const messages = el('div', 'wk-messages');
        const bubble = el('div', 'wk-bubble');
        bubble.append(el('p', '', group.summary));
        messages.append(bubble);
        const sources = members.flatMap(moment => moment.sources);
        const selections = group.sourceIds === undefined ? sources.slice(0, 1) : group.sourceIds.map(id => sources.find(source => source.id === id)).filter(Boolean);
        for (const source of selections) messages.append(createCard(source, { ...options, compact: true }));
        const open = button(`See ${members.length} moments ↗`, 'wk-thread-link', event => thread.open(members, { label: 'Related moments', from: event.currentTarget }));
        open.setAttribute('aria-haspopup', 'dialog');
        messages.append(open);
        section.append(messages);
        nodes.push(section);
      }
    } else nodes.push(...visible.map(momentNode));
    if (!nodes.length) nodes.push(el('p', 'wk-empty', options.moments.length ? 'No moments in this view.' : 'A little space for your work. Ask your agent to gather a day.'));
    list.replaceChildren(...nodes);
  }

  // Arrow navigation is local to this timeline; it never captures page-wide keys.
  list.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.target.closest('a, button, input, textarea, select, video, [contenteditable="true"]')) return;
    const items = [...list.children].filter(node => node.matches('.wk-moment'));
    const current = event.target.closest('.wk-moment');
    const next = items[items.indexOf(current) + (event.key === 'ArrowDown' ? 1 : -1)];
    if (next) { event.preventDefault(); next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'center', behavior: 'instant' }); }
  });
  list.tabIndex = 0;
  render();
  return {
    update(patch) {
      if (destroyed) throw new Error('This timeline has been destroyed.');
      const next = { ...options, ...patch };
      check(next);
      options = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      thread.destroy();
      stopMedia(root);
      root.remove();
    },
  };
}
