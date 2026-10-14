# UI ingredients

The Workin renderer, extracted into plain browser modules. Use it directly: it is the reference implementation, not a design brief. No dependencies, build step, provider SDK, background fetching, or storage layer.

Read the [UX contract](../references/ux.md) before integration. The page contains the timeline. There is no visible title, introduction, footer, mode switcher, or date toolbar.

## Mount

```html
<link rel="stylesheet" href="./ui/styles.css">
<main id="journal" aria-label="Work timeline"></main>
<script type="module">
  import { createTimeline } from './ui/index.js';

  const timeline = createTimeline(document.querySelector('#journal'), {
    timeZone: 'UTC',
    moments: [{
      id: 'prototype-shared',
      at: '2026-01-12T10:00:00Z',
      summary: 'Shared the first glass interaction study.',
      sources: [{
        id: 'slack:example:message-1',
        type: 'slack',
        url: 'https://example.invalid/messages/1',
        author: { name: 'Alex Morgan' },
        at: '2026-01-12T10:00:00Z',
        context: '#design',
        text: 'First pass at the glass hero. The rim feels a little heavy.',
      }],
    }],
  });

  // Apply presentation saved by the agent. No gathering or page controls.
  timeline.update({ view: { from: '2026-01-12', to: '2026-01-12' } });
  // Call timeline.destroy() when removing the screen.
</script>
```

Serve modules over HTTP, not `file://`. Paths above assume the page sits beside `ui/`. The example adds only a loader for a local JSON fixture and relative cached assets. A real host watches saved local data and calls `update()`.

The demo is limited to verified Slack, GitHub PR, X, and Calendar source types. Its loader rejects other types. The component API below is broader; that is not permission to add source integrations to the demo.

The fictional glass study keeps its monochrome media in `example/assets/`: two editable SVG stills and an eight-second local MP4. Slack shows the iterations; X shows the motion with the finished still as its poster. These are authored sample assets, not screenshots or recordings of private work.

## Display data

[index.d.ts](index.d.ts) defines the contract; [example/journal.json](example/journal.json) demonstrates it. This is a projection, **not a lossless storage schema**.

| Field | Meaning |
| --- | --- |
| `moments` | Stable IDs, source-time `at`, plain-text summaries, original sources, optional earlier `parentId` |
| `groups` | Disjoint editorial groups with representative `sourceIds`; used for highlights |
| `view` | Agent-authored `mode` (`detailed` or `highlights`), inclusive `from`/`to`, and `omitted` IDs |
| `embeds` | Moment ID → `{ variant: 'full' \| 'compact' \| 'none', collapsedHeight?, reason? }` |
| `media` | Attachment ID → cached `{ src, poster? }` browser URLs |
| `emoji` | Shortcode → cached image URL |
| `timeZone` | IANA timezone, default UTC |

Source types are Slack messages, posts, PRs, documents, calendar events, and links. Preserve the original text, author, time, status, and provenance. `parts` preserves formatted text without executable HTML. PR `descriptionHtml` is copied through an allowlist; resolve any embedded media to your local cache first.

Source cards follow normal document flow. For a side-by-side pair, set a group's `layout` to `pair`; this requires exactly two adjacent independent moments, each with one source. Use `parentId` and threads for developments over time. Do not set a source or attachment `layout`: attachment arrays keep their provider-native treatment. Overlapping decks, swipe stacks, and carousels are not supported.

Groups with filtered-out members fall back to the remaining individual moments. Threads focus connected developments within the supplied view. Highlight groups open their member moments. Grouping does not imply a literal provider thread.

## Cached assets

```js
const media = {
  'slack:example:file-1': {
    src: '/private-media/prototype.mp4',
    poster: '/private-media/prototype.jpg',
  },
};
```

These are browser URLs served from the host's private cache, not filesystem paths or expiring provider links. Cache avatars and custom emoji too. Missing media retains the source link and an honest fallback. Rendering and changing the view must not call a source provider. The components load only the asset URLs supplied to them.

## Smaller pieces

Prefer `createTimeline()` for a journal. Compose individual pieces only when integrating into an existing host; retain their styles and behavior.

```js
import { createCard, createPair } from './ui/index.js';

container.classList.add('workin');
const cards = sources.map(source => createCard(source, { media, emoji }));
const pair = createPair(cards); // Exactly two source cards.
container.append(pair);
// Before removing it: pair.dispose();
```

| Export | Responsibility |
| --- | --- |
| `createTimeline(container, options)` | Timeline, bubbles, dates, relationships, original animated thread focus; returns `update` and `destroy` |
| `createCard(source, options)` | Original source card; `compact: true` uses the expand/collapse crop |
| `createPullRequestChip(source)` | Linked PR title with its colored lifecycle icon |
| `createPair(cards)` | Two source cards side by side; vertical on narrow screens |

Cards and pairs return DOM elements with `dispose()`. The timeline owns its own `.workin` wrapper and cleans up its listeners, observers, animations, dialogs, and media. Standalone components require a `.workin` ancestor and explicit disposal. CSS is scoped with native nesting; use a current browser.

`update()` replaces supplied top-level fields. Supply a full `view` or media map. It preserves expanded cards and the visible scroll anchor; an open thread is reopened when its view is unchanged. A changed view closes the thread. Updates rebuild cards, so playing media is paused. Storage, history, and refresh wiring belong to the host.

## Internal composition

`evidence.js` adapts the display data. `renderer.js` composes the timeline. `cards.js` renders source evidence. `embed.js`, `thread.js`, and `media.js` each own one reading interaction. `lifetime.js` handles cleanup. `styles.css` preserves the original appearance, including brand colors, spacing, and motion.

Extend a source type in `index.d.ts`, `evidence.js`, and `cards.js` when needed. Keep gathering outside rendering. Do not replace the renderer or restyle the journal unless the user explicitly requests a visual change.
