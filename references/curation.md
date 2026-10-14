# Make the work easy to remember

The timeline should bring back the moment, not turn every source event into a generic accomplishment.

## Separate evidence, judgment, and the current view

**Evidence** is what the sources actually contain. Preserve it losslessly in local storage.

**Curation** is your interpretation: summaries, relationships, representative media, and lasting editorial omissions. Save the reasons and evidence IDs behind those decisions. Record user corrections so the same mistake does not recur.

**View** is a temporary lens: dates, detail level, or a particular topic. Do not delete evidence to filter a view. Clearing the view restores saved curation. The host application may offer persistent undo; this UI kit does not supply a storage or history layer.

## Write bubbles that identify a real moment

- Prefer “Lightened the glass rim after prototype feedback” to “Made significant progress on the design.”
- Describe the person's contribution, not everything their team shipped.
- Keep plans, in-progress work, reviews, and shipped outcomes distinct.
- Use the person's recap and announcement posts as importance signals. Reactions can help, but quiet finishing work can be important too.
- Approval-only reviews and acknowledgements usually stay in the evidence archive rather than becoming timeline moments. Substantive feedback deserves consideration.

Cards contain original source wording. Put your summary in the bubble above the card. If showing an excerpt, label it; retain the full original locally.

## Connect moments without inventing relationships

A shared PR link, explicit reply, or direct reference can support a thread. Similar titles alone may not. Save the relationship's basis; qualify uncertain connections in the narrative.

Use `parentId` for an earlier related moment. Use highlight groups for broader editorial groupings. A group is not a claim that its members were replies to one another.

The agent chooses the presentation in response to the user's request. A detailed timeline follows source time; a highlights request combines related work into short narratives with representative evidence. These are agent-authored presentations, not tabs or switches in the viewer. A prototype, feedback message, and shipped PR may become one highlight, while the thread still shows all three moments in order.

## Choose evidence the eye can recognize

Use the original Slack message, PR description, document excerpt, or public post when that is where the useful explanation lives. Prefer a clear demo image or recording over a wall of prose. Keep before/after media within its original source card. Show source cards in normal vertical flow, or use a side-by-side pair for exactly two adjacent, independent source cards. Never overlap cards or add swipe navigation. An attachment array is never a reason to invent a carousel. Retain other attachments locally even when only one is shown.

Choose representative source IDs for a highlight. Avoid duplicating every PR card when an inline PR chip is enough. Keep source links and original authors visible.

## Hand off a view

Read saved evidence and preferences, save the proposed curation, then derive the UI's `moments`, `groups`, `view`, and media map. The display shape is documented in [the UI guide](../ui/README.md).

Verify the timeframe in the user's timezone, the distinction between completed and planned work, and the actual text/media shown. Tell the user about meaningful coverage gaps. A good-looking timeline is not proof of complete collection.
