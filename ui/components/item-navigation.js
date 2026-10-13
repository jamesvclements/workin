export function nextItemOffset(offsets, position, direction) {
  return direction > 0
    ? offsets.find((offset) => offset > position + 2)
    : offsets.findLast((offset) => offset < position - 2);
}

export function installItemNavigation(signal, root) {
  let frame = 0;
  let destination = null;
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    destination = null;
  };
  for (const name of ["wheel", "touchstart", "pointerdown"])
    window.addEventListener(name, cancel, { passive: true, signal });
  signal.addEventListener("abort", cancel, { once: true });
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        document.querySelectorAll(".workin .timeline").length > 1 &&
        !root.contains(document.activeElement)
      )
        return;
      if (
        event.defaultPrevented ||
        !["ArrowUp", "ArrowDown"].includes(event.key) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      if (
        document.querySelector("dialog[open]") ||
        event.target.closest?.(
          'input, textarea, select, button, video, audio, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="listbox"], [role="menu"], [role="tablist"]',
        )
      )
        return;
      const timeline = root.querySelector(
        ".compact-timeline:not([hidden]), .timeline:not([hidden])",
      );
      if (!timeline) return;
      const offsets = [...timeline.querySelectorAll(":scope > section")]
        .filter((item) => item.getClientRects().length)
        .map((item) =>
          Math.max(0, item.getBoundingClientRect().top + scrollY - 28),
        );
      if (!offsets.length) return;
      const target = nextItemOffset(
        offsets,
        destination ?? scrollY,
        event.key === "ArrowDown" ? 1 : -1,
      );
      event.preventDefault();
      if (target === undefined) return;
      cancel();
      const start = scrollY;
      destination = Math.min(
        target,
        document.documentElement.scrollHeight - innerHeight,
      );
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        scrollTo({ top: destination, behavior: "instant" });
        destination = null;
        return;
      }
      const distance = destination - start;
      const duration = Math.min(680, 420 + Math.abs(distance) * 0.18);
      const started = performance.now();
      const options = { top: start, behavior: "instant" };
      const tick = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        options.top =
          start + distance * (progress * progress * (3 - 2 * progress));
        scrollTo(options);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else {
          frame = 0;
          destination = null;
        }
      };
      frame = requestAnimationFrame(tick);
    },
    { signal },
  );
}
