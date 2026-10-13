# Gather once. Keep the evidence.

The host agent owns source access. Use available authorized connectors or CLIs; do not bake provider credentials or host-specific tool names into the application. Limit collection to the requested sources and scope.

## Keep a durable local journal

Choose a private application-data directory outside the public package. Use the user's timezone. A simple layout is enough; SQLite is also fine if the user's application already uses it.

```text
<private journal>/
├── preferences.json       Sources, timezone, and enduring user feedback
├── raw/                   Full authorized source records and prior versions
├── evidence.json          Indexed records with stable IDs and provenance
├── curation.json          Lasting summaries, relationships, and omissions
├── view.json              Temporary timeframe and level of detail
├── collection.json        Coverage, cursors, checkpoints, and pending work
└── media/                 Cached originals, previews, and an asset manifest
```

This is a storage suggestion, not a required runtime. The UI consumes a small display projection; it must never become the only copy of the evidence.

For each source object, retain:

- A stable provider-qualified ID, source URL, author identity, and source timestamps.
- The full original text and available structured content: thread messages, reviews, descriptions, reactions, and attachment metadata. Keep raw response bodies or a lossless representation, with a pointer from the index.
- Collection time, source version or content hash, and explicit completeness for text, thread detail, media, and optional metadata.
- Prior versions when content changes. Never invent a source edit timestamp from the time of collection.

Retain all relevant fields from authorized source responses. Do not store access tokens, auth headers, cookies, or unrelated account data. A request log needs parameters and provenance, not authentication material.

## Read before requesting

Inspect the evidence index and collection state first. An existing complete record should be reused. Summarizing, filtering, or regrouping saved work requires no provider calls.

On an authorized refresh:

1. Resume pending pages or missing details before restarting a search.
2. Search only uncovered intervals and a small overlap around the last successful checkpoint, using the provider's actual pagination semantics. Discover changes by updated time when supported.
3. Persist every page and its next cursor before proceeding. Deduplicate by stable ID, never title. Reuse unchanged versions; compare content hashes when reliable provider versions are unavailable.
4. Hydrate new, changed, or incomplete objects. Search snippets are not full source evidence. Refresh still-active threads or PRs selectively; do not rescan the full archive just to update reaction counts.
5. Advance a discovery checkpoint only after confirmed pagination exhaustion. Track detail/media completion separately. A successful search with pending attachments is partial coverage.
6. Save changes atomically. If multiple agents can write, use a lock or expected revision and preserve prior good state on conflict.

Keep missing windows and failed detail/media requests in a durable pending queue with a retry time and last error. A failed fetch is not an empty result. Record inaccessible or unsupported sources as gaps.

Example: Monday's complete records are already saved. “Show Monday” reads those records. “Refresh through Tuesday” resumes Tuesday's missing window and checks relevant active Monday objects for changes. If one video failed, retry that attachment rather than repeating the entire Slack search.

## Cache the actual media

Save attachment metadata and original bytes, plus previews when possible. Use stable attachment IDs and preferably content-addressed filenames. Maintain a manifest mapping attachment IDs to private local paths, content hashes, source versions, media types, and preview status.

- Download through the host's authorized tools. Do not extract browser credentials or introduce a new sign-in.
- Keep original source URLs for provenance, but serve cached assets through the local application. Signed or expiring URLs are not a storage strategy.
- Cache needed avatars and emoji when available. Preserve unresolved shortcode names rather than substituting a different custom emoji.
- Keep an acquired original even if preview generation fails. Record unavailable downloads and previews separately.
- Verify playback, not just file existence. The host application needs appropriate content types and byte-range responses for video seeking.

If the host cannot download a file, show a truthful placeholder and source link. Do not claim the attachment is cached. The supplied media component only displays assets passed to it; it never downloads from providers on the agent's behalf.

## Source-specific judgment

- **Slack:** fetch complete messages and relevant threads, including available attachments and reactions. Distinguish authorship, mentions, and replies. Broad DM collection requires an explicit request.
- **GitHub:** involvement is not authorship. Preserve PR state, descriptions, meaningful comments, and reviews. Check inline comments before treating an approval as empty.
- **Documents:** retain the actual attributed edit or excerpt when available. Page metadata alone may not establish a contribution.
- **Calendar:** scheduling and RSVP do not prove attendance or outcomes.
- **Social posts:** retain original wording and capture time for metrics. A cached count is not live engagement.

Missing evidence should narrow the claim, not invite invention.
