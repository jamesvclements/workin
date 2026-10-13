import { element } from "./dom.js";

// Ported from Workin: reparent the live cards and animate their measured positions.
export function createThreadFocus({
  root,
  getNode,
  connected,
  timestampContents,
}) {
  const threadDialog = element("dialog", "thread-focus");
  threadDialog.setAttribute("aria-label", "Thread");
  threadDialog.tabIndex = -1;
  const threadContent = element("div", "thread-focus-content");
  threadDialog.append(threadContent);
  root.appendChild(threadDialog);
  let disposed = false;
  let focusedThread = null;
  let threadClosing = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function moveLiveNode(parent, node, before = null) {
    if (parent.moveBefore && node.isConnected) parent.moveBefore(node, before);
    else parent.insertBefore(node, before);
  }

  function openThread(id, trigger, selectedMoments, threadKey = id) {
    if (focusedThread) return;
    const entries = (selectedMoments || connected(id)).map((moment) => {
      const node = getNode(moment.id);
      const visuals = [
        ...node.querySelectorAll(":scope > .timestamp, :scope > .messages > *"),
      ].map((child) => ({
        node: child,
        before: child.getBoundingClientRect(),
        width: child.style.width,
        maxWidth: child.style.maxWidth,
      }));
      const decorations = [
        ...node.querySelectorAll(".resurfaced-context, .context-curve"),
      ].map((decoration) => ({
        node: decoration,
        parent: decoration.parentNode,
        next: decoration.nextSibling,
        rect: decoration.getBoundingClientRect(),
        style: decoration.style.cssText,
      }));
      return {
        moment,
        node,
        visuals,
        decorations,
        before: node.getBoundingClientRect(),
        margin: getComputedStyle(node).marginBottom,
        timestamp: node.querySelector(".timestamp").innerHTML,
      };
    });
    const state = {
      entries,
      trigger,
      threadKey,
      scroll: scrollY,
      overflow: document.body.style.overflow,
      animations: [],
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
    focusedThread = state;
    let previousThreadDate;
    for (const entry of entries) {
      const placeholder = element("div");
      placeholder.style.height = `${entry.before.height}px`;
      placeholder.style.marginBottom = entry.margin;
      placeholder.style.position = "relative";
      placeholder.setAttribute("aria-hidden", "true");
      entry.placeholder = placeholder;
      entry.node.before(placeholder);
      for (const visual of entry.visuals) {
        if (visual.before.width > 0) {
          visual.node.style.width = `${visual.before.width}px`;
          visual.node.style.maxWidth = "100%";
        }
      }
      for (const decoration of entry.decorations) {
        placeholder.appendChild(decoration.node);
        Object.assign(decoration.node.style, {
          position: "absolute",
          margin: "0",
          left: `${decoration.rect.left - entry.before.left}px`,
          top: `${decoration.rect.top - entry.before.top}px`,
          width: `${decoration.rect.width}px`,
          height: `${decoration.rect.height}px`,
        });
      }
      const timestamp = entry.node.querySelector(".timestamp");
      entry.threadTimestamp = timestampContents(
        entry.moment,
        previousThreadDate,
      );
      previousThreadDate = entry.moment.date;
      timestamp.innerHTML = entry.threadTimestamp;
      if (!reducedMotion.matches && entry.timestamp !== entry.threadTimestamp) {
        const previous = element("span", "timestamp-previous");
        previous.innerHTML = entry.timestamp;
        previous.setAttribute("aria-hidden", "true");
        const current = element("span", "timestamp-current");
        current.innerHTML = entry.threadTimestamp;
        timestamp.replaceChildren(previous, current);
        entry.timestampLayers = { previous, current };
      }
      moveLiveNode(threadContent, entry.node);
    }
    threadDialog.setAttribute(
      "aria-label",
      `Thread, ${entries.length} updates. Press Escape to close.`,
    );
    threadContent.style.paddingBlock = `${innerHeight / 2}px`;
    document.body.style.overflow = "hidden";
    threadDialog.classList.remove("is-closing");
    threadDialog.showModal();
    threadDialog.scrollTop = 0;
    const origin = trigger?.closest(".moment");
    const anchor =
      entries.find((entry) => entry.node === origin) ||
      entries.find((entry) => entry.moment.id === id);
    const anchorVisual = anchor?.visuals.find((visual) =>
      visual.node.matches(".message-wrap"),
    );
    if (anchorVisual) {
      const position = anchorVisual.node.getBoundingClientRect();
      const dateHeight = anchor.node
        .querySelector(".timestamp")
        .getBoundingClientRect().height;
      const desiredTop = Math.max(
        24,
        (innerHeight - position.height) / 2 - dateHeight - 24,
      );
      const preferredScroll = Math.max(0, position.top - desiredTop);
      const firstTop = entries[0].node.getBoundingClientRect().top;
      const lastBottom = entries.at(-1).node.getBoundingClientRect().bottom;
      const topSpace = Math.max(0, firstTop - preferredScroll - 24);
      const bottomOverflow = Math.max(
        0,
        lastBottom - preferredScroll - (innerHeight - 24),
      );
      threadDialog.scrollTop =
        preferredScroll + Math.min(topSpace, bottomOverflow);
    }
    threadDialog.focus({ preventScroll: true });
    const visuals = entries
      .flatMap((entry) => entry.visuals)
      .filter(
        (visual) =>
          threadDialog.contains(visual.node) &&
          visual.node.getClientRects().length,
      );
    const destinations = visuals.map((visual) =>
      visual.node.getBoundingClientRect(),
    );
    if (!reducedMotion.matches) {
      threadDialog.classList.add("is-transitioning");
      for (const entry of entries) {
        if (!entry.timestampLayers) continue;
        const { previous, current } = entry.timestampLayers;
        const options = { duration: 220, easing: "ease-out", fill: "both" };
        state.animations.push(
          previous.animate({ opacity: [1, 0] }, options),
          current.animate({ opacity: [0, 1] }, options),
        );
      }
      for (const [index, visual] of visuals.entries()) {
        const before = visual.before;
        const after = destinations[index];
        const visible = before.bottom > 0 && before.top < innerHeight;
        const arrives = after.bottom > 0 && after.top < innerHeight;
        if (!visible && !arrives) continue;
        const deltaX = visible ? before.left - after.left : 0;
        const deltaY = visible
          ? before.top - after.top
          : before.bottom <= 0
            ? -32
            : 32;
        const destinationX = visible && !arrives ? deltaX : 0;
        const destinationY =
          visible && !arrives ? deltaY + (after.bottom <= 0 ? -32 : 32) : 0;
        visual.node.style.willChange = "transform, opacity";
        state.animations.push(
          visual.node.animate(
            [
              {
                transform: `translate(${deltaX}px, ${deltaY}px)`,
                opacity: visible ? 1 : 0,
              },
              {
                transform: `translate(${destinationX}px, ${destinationY}px)`,
                opacity: arrives ? 1 : 0,
              },
            ],
            {
              duration: 280,
              easing: "cubic-bezier(.25,.1,.25,1)",
              fill: "both",
            },
          ),
        );
      }
      Promise.allSettled(
        state.animations.map((animation) => animation.finished),
      ).then(() => {
        if (disposed || focusedThread !== state || threadClosing) return;
        threadDialog.classList.remove("is-transitioning");
        for (const animation of state.animations) animation.cancel();
        for (const entry of entries)
          entry.node.querySelector(".timestamp").innerHTML =
            entry.threadTimestamp;
        for (const visual of visuals) visual.node.style.willChange = "";
      });
    }
  }

  async function dismissThread() {
    if (!focusedThread || threadClosing) return;
    threadClosing = true;
    const state = focusedThread;
    const visuals = state.entries
      .flatMap((entry) => entry.visuals)
      .filter(
        (visual) =>
          threadDialog.contains(visual.node) &&
          visual.node.getClientRects().length,
      );
    const positions = visuals.map((visual) =>
      visual.node.getBoundingClientRect(),
    );
    const opacities = visuals.map((visual) =>
      Number(getComputedStyle(visual.node).opacity),
    );
    for (const animation of state.animations) animation.cancel();
    for (const entry of state.entries)
      entry.node.querySelector(".timestamp").innerHTML = entry.threadTimestamp;
    const bases = visuals.map((visual) => visual.node.getBoundingClientRect());
    threadDialog.classList.add("is-closing", "is-transitioning");
    if (
      !reducedMotion.matches &&
      state.viewportWidth === innerWidth &&
      state.viewportHeight === innerHeight
    ) {
      const animations = [];
      for (const [index, visual] of visuals.entries()) {
        const current = positions[index];
        const base = bases[index];
        const original = visual.before;
        const visible = current.bottom > 0 && current.top < innerHeight;
        const returns = original.bottom > 0 && original.top < innerHeight;
        if (!visible && !returns) continue;
        const startX = visible
          ? current.left - base.left
          : original.left - base.left;
        const startY = visible
          ? current.top - base.top
          : original.top - base.top + (current.bottom <= 0 ? -32 : 32);
        const endX = returns ? original.left - base.left : startX;
        const endY = returns
          ? original.top - base.top
          : startY + (original.bottom <= 0 ? -32 : 32);
        visual.node.style.willChange = "transform, opacity";
        animations.push(
          visual.node.animate(
            [
              {
                transform: `translate(${startX}px, ${startY}px)`,
                opacity: visible ? opacities[index] : 0,
              },
              {
                transform: `translate(${endX}px, ${endY}px)`,
                opacity: returns ? 1 : 0,
              },
            ],
            {
              duration: 240,
              easing: "cubic-bezier(.4,0,.2,1)",
              fill: "forwards",
            },
          ),
        );
      }
      state.animations = animations;
      await Promise.allSettled(
        animations.map((animation) => animation.finished),
      );
      if (disposed) return;
    }
    restoreThread();
    threadDialog.close();
  }
  function restoreThread() {
    if (!focusedThread) return;
    const previous = focusedThread;
    for (const animation of previous.animations) animation.cancel();
    for (const entry of previous.entries) {
      entry.node.querySelector(".timestamp").innerHTML = entry.timestamp;
      for (const visual of entry.visuals) {
        visual.node.style.width = visual.width;
        visual.node.style.maxWidth = visual.maxWidth;
        visual.node.style.willChange = "";
      }
      for (const decoration of entry.decorations) {
        decoration.node.style.cssText = decoration.style;
        decoration.parent.insertBefore(decoration.node, decoration.next);
      }
      moveLiveNode(entry.placeholder.parentNode, entry.node, entry.placeholder);
      entry.placeholder.remove();
    }
    threadDialog.classList.remove("is-closing", "is-transitioning");
    document.body.style.overflow = previous.overflow;
    scrollTo({ top: previous.scroll, behavior: "instant" });
    previous.trigger?.focus({ preventScroll: true });
    focusedThread = null;
    threadClosing = false;
  }
  threadDialog.addEventListener("close", restoreThread);
  threadDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissThread();
  });
  threadDialog.addEventListener("click", (event) => {
    if (event.target === threadDialog || event.target === threadContent)
      dismissThread();
  });

  return {
    open: openThread,
    getId: () => focusedThread?.threadKey,
    destroy() {
      disposed = true;
      restoreThread();
      if (threadDialog.open) threadDialog.close();
      threadDialog.remove();
    },
  };
}
