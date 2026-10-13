import { element } from "./dom.js";
import { mount } from "./renderer.js";
import { snapshotFrom } from "./evidence.js";
let sequence = 0;

/** Mount the original Workin UI with agent-supplied, locally stored evidence. */
export function createTimeline(container, initial) {
  const instanceId = `workin-${++sequence}`;
  let options = initial,
    snapshot = snapshotFrom(options, instanceId),
    rendered,
    destroyed = false;
  const root = element("div", "workin");
  const content = element("div", "workin-content");
  root.append(content);
  container.append(root);
  function reset() {
    const detailed = element("div", "timeline");
    const compact = element("div", "compact-timeline");
    compact.hidden = true;
    content.replaceChildren(detailed, compact);
  }
  reset();
  rendered = mount(root, snapshot);
  return {
    update(patch) {
      if (destroyed) throw Error("This timeline has been destroyed.");
      const nextOptions = { ...options, ...patch };
      const next = snapshotFrom(nextOptions, instanceId);
      const sameContext =
        JSON.stringify(next.view) === JSON.stringify(snapshot.view);
      const anchor = [
        ...content.querySelectorAll(".timeline > *, .compact-timeline > *"),
      ].find(
        (node) =>
          node.getClientRects().length &&
          node.getBoundingClientRect().bottom > 0,
      );
      const anchorId = anchor?.id,
        offset = anchor?.getBoundingClientRect().top,
        previousScroll = scrollY;
      const threadId = sameContext ? rendered.getThreadId() : null;
      const expanded = new Set(
        [...root.querySelectorAll(".crop-embed:not(.is-cropped)")].map(
          (node) => node.dataset.evidenceKey,
        ),
      );
      rendered.dispose();
      for (const media of content.querySelectorAll("video, audio"))
        media.pause();
      reset();
      options = nextOptions;
      snapshot = next;
      rendered = mount(root, snapshot);
      for (const card of root.querySelectorAll("[data-evidence-key]")) {
        if (expanded.has(card.dataset.evidenceKey))
          card
            .querySelector('.embed-crop-toggle[aria-expanded="false"]')
            ?.click();
      }
      const target = anchorId
        ? root.querySelector(`#${CSS.escape(anchorId)}`)
        : null;
      scrollTo({
        top:
          sameContext && target?.getClientRects().length
            ? scrollY + target.getBoundingClientRect().top - offset
            : previousScroll,
        behavior: "instant",
      });
      if (threadId) rendered.openThread(threadId);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      rendered.dispose();
      for (const media of root.querySelectorAll("video, audio")) media.pause();
      root.remove();
    },
  };
}
