# Workin's UX contract

The supplied modules and stylesheet are the implementation to reuse. Build the private storage and connector adapters around them. Do not reconstruct the UI from a prose description or create a separate demo design.

Compare the supplied example with this [reference screenshot](appearance.png), captured at 1280 × 900 using fictional evidence. Use it to check scale, spacing, colors, and the absence of page chrome. The interaction checks below are still required.

## Preserve these decisions

| Area | Required behavior |
| --- | --- |
| Page | Start directly with timestamps and the timeline. No visible H1, product title, intro, tagline, attribution footer, demo disclaimer, or “ingredients” link. A document title and accessible landmark label are fine. |
| Agent control | Dates, grouping, omissions, and detail level come from saved agent-authored data. No mode switcher, date toolbar, or extra chat box. |
| Narrative | Short gray message bubbles, original tails and spacing. Earlier context uses the existing quote and connecting curve. Source text stays inside source cards. |
| Dates | Keep the original centered, small timestamps. Show the full date when it changes; later items that day show the time. |
| Threads | Reuse `thread.js`: existing timeline nodes move into focus with the original measured-position animation, then return. Keep the translucent backdrop, Escape/backdrop dismissal, scroll restoration, and reduced-motion behavior. No boxed modal, duplicate cards, title bar, or Done button. |
| Thread labels | The detailed view counts **later developments**: “1 update” or “2 updates” with the down icon. Never “3 moments in this thread ↗”. The last development has no later-update link. Highlights count the group's members. |
| Source identity | Preserve native brand colors, including the multicolor Slack mark and PR state colors. Keep authors, source times, reactions, and original links. |
| Attachments | Slack uses the original small attachment previews, with cached image/video opening behavior. Posts retain inline media. PR comparisons remain part of the original PR evidence. Do not turn an attachment array into a card deck. |
| Card composition | Cards follow normal document flow, with an optional side-by-side pair of two source cards. Never overlap cards or introduce decks, swipe stacks, carousels, paging arrows, dots, or position counters. |
| Cropped cards | Use the existing compact crop and expand/collapse button. Preserve original content and the height animation. |
| Persistence | Views read cached evidence. Keep full records, media bytes, collection progress, relationships, and user corrections. Changing presentation must not trigger a provider refetch. |

Put demo caveats in the README, not the journal. Fictional demo evidence is never mixed with the user's private history.

The demo uses only Slack, GitHub pull requests, X posts, and Calendar, verified in the original journal. Its loader enforces that allowlist. Fictional content must not introduce an invented provider or source-card design. Adding another demo source requires an explicit user request and an original example to match.

## Before handing over a host or demo

Manually check the rendered page; a successful load is insufficient. No test framework is required.

- Desktop and narrow screen: no extra chrome, no horizontal page overflow, original typography, spacing, colors, and attachment sizing.
- Open “2 updates”: the three existing developments animate into focus, without a new modal header. Close with Escape and by clicking the backdrop; the same nodes and scroll position return.
- Check the next development says “1 update” and the last has no update link.
- Open a cached attachment and expand a cropped card. Verify the original text and source links remain accessible.
- Every source card is directly readable in normal flow. A two-card pair uses the responsive split layout. No overlapping or swipeable cards.
- Have the agent change saved view data. The host reflects it, restores the normal view when filters clear, and makes no source-provider requests.
- Check keyboard focus, reduced motion, cleanup, and browser errors.

If an integration cannot preserve an interaction, report the specific gap. Do not silently substitute a different pattern. Visual changes require the user's explicit request.
