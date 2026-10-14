# workin'

A skill and composed UI for a personal work journal. Your agent supplies connections, private storage, and curation. Workin supplies the timeline.

> Read SKILL.md and build me a local work journal using these components and my existing connections. Start with one day. Keep the full evidence and media so we can revisit it without fetching again.

## What's here

- [SKILL.md](SKILL.md): gathering, persistence, curation, and UX rules.
- [ui/index.js](ui/index.js): `createTimeline`, `createCard`, `createPair`, and `createPullRequestChip`.
- [ui/index.d.ts](ui/index.d.ts): the display contract and API options.
- [ui/components/cards/](ui/components/cards/): individual source cards and shared parts. Timeline, threads, media, and lifecycle live beside them.
- [ui/example/](ui/example/): a three-moment journal from James's public before-and-after and agent-browser work.

No dependencies or build step. Serve this directory on localhost with a static server that supports byte-range requests for video, then open `/ui/example/`.

## Mount

```js
import { createTimeline } from './ui/index.js';
// Load ui/styles.css in the page. Resolve cached media URLs in your host.
const timeline = createTimeline(document.querySelector('main'), savedDisplayData);
timeline.update({ view: { from: '2026-09-03', to: '2026-09-03' } });
// Call timeline.destroy() when removing the screen.
```

`update()` replaces supplied top-level fields. Standalone cards need a `.workin` ancestor and `dispose()` on removal. Use a current browser for native CSS nesting. Keep personal data outside this package.

## Example sources

The PR cards use labeled description excerpts from [before-and-after #5](https://github.com/vercel-labs/before-and-after/pull/5) and [agent-browser #1763](https://github.com/vercel-labs/agent-browser/pull/1763). The [public announcement](https://x.com/jamesvclements/status/2095570044214260128) retains its original text and recording, cached under `ui/example/assets/`. No private Slack messages, colleague identities, or engagement snapshots are included. Example data is display data, not a lossless archive.

[Icon attribution](ui/ICON-LICENSES.txt).
