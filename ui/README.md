# UI ingredients

Plain browser modules. No build step, framework, provider SDK, storage, or background fetching. Use the complete timeline or the smaller pieces. The components preserve Workin's bubbles, original-source cards, earlier-context quotes, threads, cropped embeds, and media pairs/stacks.

## Mount a timeline

```html
<link rel="stylesheet" href="./ui/styles.css">
<div id="journal"></div>
<script type="module">
  import { createTimeline } from './ui/index.js';

  const timeline = createTimeline(document.querySelector('#journal'), {
    timeZone: 'UTC',
    moments: [{
      id: 'prototype-shared',
      at: '2026-01-12T10:00:00Z',
      summary: 'Shared the first onboarding prototype.',
      sources: [{
        id: 'slack:example:message-1',
        type: 'slack',
        url: 'https://example.invalid/messages/1',
        author: { name: 'Alex Morgan' },
        context: '#design',
        text: 'First pass at onboarding. Feedback on the account step?',
      }],
    }],
  });

  // The host applies presentation data saved by the agent. No gathering needed.
  timeline.update({ view: { mode: 'detailed', from: '2026-01-12', to: '2026-01-12' } });
  // When your application removes this screen: timeline.destroy();
</script>
```

Serve modules over HTTP, not `file://`. Paths in this snippet assume the page sits next to `ui/`.

## Compose smaller pieces

```js
import { createCard, createMedia, createStack } from './ui/index.js';

container.classList.add('wk');
container.append(createCard(source, { timeZone, media, emoji }));
container.append(createStack(attachments.map(item => createMedia(item, { media }))));
```

| Export | Returns |
| --- | --- |
| `createTimeline(container, options)` | `{ update(patch), destroy() }` |
| `createMoment(moment, options)` | A timestamp, bubble, and source cards |
| `createCard(source, options)` | A source card; `compact: true` makes it expandable |
| `createPullRequestChip(source)` | A small linked PR label |
| `createMedia(attachment, { media })` | An image, video, file link, or honest placeholder |
| `createStack(nodes, { label })` | A deck with previous/next controls |

All smaller components return ordinary DOM elements. Wrap them in `.wk` for styling. The timeline creates its own `.wk` wrapper and removes only that wrapper on destruction. The host owns the lifecycle of standalone nodes; pause playing media before removing them.

## Supply a display projection

The exact shapes are in [index.d.ts](index.d.ts); a complete fictional dataset is in [example/journal.json](example/journal.json).

- **Moments:** stable `id`, source-time `at`, a plain-text `summary`, and `sources`. Optional `parentId` connects an earlier moment.
- **Sources:** `slack`, `post`, `pull-request`, `document`, `event`, or `link`. Use original text. Optional `parts` retains links, bold, italic, and code without raw HTML.
- **Groups:** disjoint `momentIds`, a summary, and optional representative `sourceIds`. Groups appear when the agent supplies `mode: 'highlights'`. Ungrouped moments remain visible. Empty `sourceIds` shows only the summary.
- **View:** agent-authored rendering options: `mode` (`detailed` or `highlights`), inclusive `from`/`to` dates, and optional omitted moment IDs. These are data fields, not viewer controls. Dates use `timeZone`, which defaults to UTC.
- **Media:** a map from attachment IDs to cached `{ src, poster? }` URLs served by the host. A missing asset shows a source-link fallback. Nothing is downloaded implicitly.
- **Emoji:** a map from exact shortcodes to cached image URLs. Unknown shortcodes remain readable.

For example, after your agent caches an attachment:

```js
const media = {
  'slack:example:file-1': { src: '/private-media/prototype.mp4', poster: '/private-media/prototype.jpg' },
};
```

These are browser URLs into your local application's private media service, not filesystem paths. Prefer same-origin cached URLs for media, avatars, and emoji. The UI will load the asset URLs you supply. Source links open only when clicked. Store source URLs and actual file paths in the private journal, then resolve them into this display map.

## Updates, filtering, and threads

Call `update()` after reading changed local data. Supplied top-level fields replace previous fields; a new `view` replaces the whole view. Updating rebuilds the timeline, closes an open thread, resets card expansion, and pauses discarded media. No page reload or provider access is involved.

Threads show connected stored moments, including context outside the current date filter. Highlight groups open their original members. A group with filtered-out members falls back to the remaining individual moments, avoiding a summary that claims hidden work. Closing a thread preserves the underlying view and returns focus to its trigger.

The user talks to their agent to change the presentation. The host application watches the agent's saved local data and calls `update()` when it changes. It supplies persistence and refresh wiring, not a second set of presentation controls. Keep the viewer focused on reading, threads, source expansion, and media.

The example reads one static `journal.json` fixture at load time. To explore another presentation, have your agent edit that data and reload. Automatic refresh, durable history, local evidence storage, media serving, and connector access belong to the application your agent builds.

## Style and extend

CSS selectors are scoped to `.wk` and `wk-` classes; importing the stylesheet does not reset the host page. Override `--wk-accent`, `--wk-ink`, `--wk-muted`, `--wk-paper`, `--wk-bubble`, `--wk-line`, or `--wk-width` on `.wk`. The included palette is light; a complete dark theme needs additional card/media colors.

To add a source, extend `Source` in `index.d.ts` and the dispatcher in `components/card.js`. Keep provider access outside rendering. Prefer one component for a real reusable behavior, not a framework of abstractions. Maintain keyboard access, source provenance, and truthful missing-media states.
