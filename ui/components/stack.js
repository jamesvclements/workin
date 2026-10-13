import { element } from "./dom.js";
export function createStacks({
  reducedMotion,
  listen,
  setTimeout,
  clearTimeout,
  requestAnimationFrame,
  cancelAnimationFrame,
  ResizeObserver,
}) {
  function createEmbedStack(nodes) {
    if (nodes.length === 2) {
      const split = element("div", "embed-split");
      split.append(...nodes);
      return split;
    }
    const stack = element("div", "embed-stack");
    const paired = nodes.length === 2;
    stack.classList.toggle("is-pair", paired);
    stack.tabIndex = 0;
    stack.setAttribute("role", "region");
    stack.setAttribute("aria-roledescription", "carousel");
    stack.setAttribute(
      "aria-label",
      "Related embeds. Swipe or use left and right arrow keys.",
    );
    const stage = element("div", "stack-stage");
    const position = element("span", "stack-position");
    position.setAttribute("role", "status");
    stack.append(stage, position);
    let current = 0,
      drag = null,
      frame = 0,
      suppressClick = false,
      animations = [];
    let wheelTotal = 0,
      wheelTimeout,
      wheelLocked = false;
    const wrap = (index) => (index + nodes.length) % nodes.length;
    let backPeek = 84;
    const backOffset = paired ? 48 : 34;
    const transform = (offset, vertical = 0, rotation = 0, scale = 1) =>
      "translate3d(" +
      offset +
      "px," +
      vertical +
      "px,0) rotate(" +
      (paired ? 0 : rotation) +
      "deg) scale(" +
      (paired ? 1 : scale) +
      ")";
    const resting = (depth) =>
      transform(
        depth * backOffset,
        depth * -(paired ? backPeek : 34),
        depth * -2.5,
        1 - depth * 0.02,
      );
    const dragOffset = (offset, width) =>
      Math.tanh(offset / (width * 0.35)) * Math.min(72, width * 0.18);
    function layout() {
      for (let index = 0; index < nodes.length; index++) {
        const depth = wrap(index - current);
        const node = nodes[index];
        node.style.transform = resting(Math.min(depth, 3));
        node.style.zIndex = String(nodes.length - depth);
        node.style.opacity = depth > 3 ? "0" : "1";
        node.classList.toggle("is-front", depth === 0);
        node.inert = depth !== 0;
        node.setAttribute("aria-hidden", String(depth !== 0));
      }
      position.textContent = current + 1 + " / " + nodes.length;
      stack.dataset.activeIndex = String(current);
    }
    function settle() {
      for (const animation of animations) animation.cancel();
      animations = [];
      layout();
    }
    function spring(node, start, end) {
      if (reducedMotion.matches) {
        node.style.transform = transform(...end);
        return;
      }
      const frames = [];
      for (let index = 0; index <= 30; index++) {
        const progress = index / 30;
        const amount =
          index === 30 ? 1 : 1 - (1 + 9 * progress) * Math.exp(-9 * progress);
        frames.push({
          transform: transform(
            ...start.map((value, axis) => value + (end[axis] - value) * amount),
          ),
        });
      }
      animations.push(
        node.animate(frames, { duration: 650, easing: "linear" }),
      );
    }
    function flip(direction, offset = 0, width = stage.clientWidth) {
      settle();
      const outgoing = nodes[current];
      const incoming = nodes[wrap(current + direction)];
      const initialDepth = Math.min(wrap(nodes.indexOf(incoming) - current), 3);
      const displacement = dragOffset(offset, width);
      const startRotation = (displacement / width) * 10;
      const reveal = Math.min(Math.abs(offset) / (width * 0.6), 1);
      current = wrap(current + direction);
      layout();
      if (reducedMotion.matches) return;
      const endDepth = Math.min(wrap(nodes.indexOf(outgoing) - current), 3);
      const side = -direction;
      const fly = outgoing.animate(
        [
          {
            transform: transform(displacement, 0, startRotation),
            zIndex: nodes.length + 1,
            offset: 0,
          },
          {
            transform: transform(
              side * Math.min(72, width * 0.18),
              -10,
              side * 3,
              0.98,
            ),
            zIndex: nodes.length + 1,
            offset: 0.48,
          },
          {
            transform: transform(
              side * Math.min(72, width * 0.18),
              -10,
              side * 3,
              0.98,
            ),
            zIndex: nodes.length - endDepth,
            offset: 0.49,
          },
          {
            transform: resting(endDepth),
            zIndex: nodes.length - endDepth,
            offset: 1,
          },
        ],
        { duration: 720, easing: "cubic-bezier(.4,0,.2,1)" },
      );
      animations.push(fly);
      spring(
        incoming,
        [
          initialDepth * backOffset * (1 - reveal),
          initialDepth * -(paired ? backPeek : 34) * (1 - reveal),
          initialDepth * -2.5 * (1 - reveal),
          1 - initialDepth * 0.02 * (1 - reveal),
        ],
        [0, 0, 0, 1],
      );
      fly.finished.then(
        () => {
          outgoing.style.zIndex = String(
            nodes.length - wrap(nodes.indexOf(outgoing) - current),
          );
        },
        () => {},
      );
    }
    function paintDrag() {
      frame = 0;
      if (!drag?.active) return;
      const offset = drag.offset;
      const displacement = dragOffset(offset, drag.width);
      nodes[current].style.transform = transform(
        displacement,
        0,
        reducedMotion.matches ? 0 : (displacement / drag.width) * 10,
      );
      const incoming = nodes[wrap(current + (offset < 0 ? 1 : -1))];
      const depth = Math.min(wrap(nodes.indexOf(incoming) - current), 3);
      const reveal = Math.min(Math.abs(offset) / (drag.width * 0.6), 1);
      incoming.style.transform = transform(
        depth * backOffset * (1 - reveal),
        depth * -(paired ? backPeek : 34) * (1 - reveal),
        depth * -2.5 * (1 - reveal),
        1 - depth * 0.02 * (1 - reveal),
      );
    }
    function release(cancelled = false) {
      if (!drag) return;
      const gesture = drag;
      drag = null;
      cancelAnimationFrame(frame);
      frame = 0;
      stack.classList.remove("is-dragging");
      if (stage.hasPointerCapture(gesture.id))
        stage.releasePointerCapture(gesture.id);
      if (!gesture.active) return;
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
      const velocity =
        performance.now() - gesture.time > 100 ? 0 : gesture.velocity;
      if (
        !cancelled &&
        (Math.abs(gesture.offset) > gesture.width * 0.18 ||
          (Math.abs(gesture.offset) > 20 && Math.abs(velocity) > 0.45))
      ) {
        flip(gesture.offset < 0 ? 1 : -1, gesture.offset, gesture.width);
      } else {
        layout();
        const displacement = dragOffset(gesture.offset, gesture.width);
        spring(
          nodes[current],
          [displacement, 0, (displacement / gesture.width) * 10, 1],
          [0, 0, 0, 1],
        );
      }
    }
    for (const [index, node] of nodes.entries()) {
      node.classList.add("stack-sheet");
      node.setAttribute("role", "group");
      node.setAttribute("aria-roledescription", "slide");
      node.setAttribute("aria-label", index + 1 + " of " + nodes.length);
      node.addEventListener("stack-reveal", () => {
        settle();
        current = index;
        layout();
      });
      stage.appendChild(node);
    }
    stage.addEventListener("pointerdown", (event) => {
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        event.target.closest("button, input, video, audio, select")
      )
        return;
      if (
        event.pointerType === "mouse" &&
        event.target.closest(
          ".pr-description, .source-body, .selected-reply, .pr-title",
        )
      )
        return;
      settle();
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offset: 0,
        lastX: event.clientX,
        time: performance.now(),
        velocity: 0,
        width: stage.clientWidth,
        active: false,
      };
    });
    stage.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const offset = event.clientX - drag.x,
        vertical = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(vertical) > 8 && Math.abs(vertical) > Math.abs(offset)) {
          drag = null;
          return;
        }
        if (Math.abs(offset) < 8) return;
        drag.active = true;
        stage.setPointerCapture(event.pointerId);
        stack.classList.add("is-dragging");
        getSelection().removeAllRanges();
      }
      event.preventDefault();
      const now = performance.now();
      drag.velocity =
        (event.clientX - drag.lastX) / Math.max(1, now - drag.time);
      drag.lastX = event.clientX;
      drag.time = now;
      drag.offset = offset;
      if (!frame) frame = requestAnimationFrame(paintDrag);
    });
    stage.addEventListener("pointerup", () => release());
    stage.addEventListener("pointercancel", () => release(true));
    stage.addEventListener("lostpointercapture", () => release(true));
    stage.addEventListener("dragstart", (event) => event.preventDefault());
    stage.addEventListener(
      "click",
      (event) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    stage.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY))
          return;
        event.preventDefault();
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          wheelTotal = 0;
          wheelLocked = false;
        }, 160);
        if (wheelLocked) return;
        wheelTotal += event.deltaX;
        if (Math.abs(wheelTotal) > 45) {
          wheelLocked = true;
          flip(wheelTotal > 0 ? 1 : -1);
        }
      },
      { passive: false },
    );
    stack.addEventListener("keydown", (event) => {
      if (
        !["ArrowLeft", "ArrowRight"].includes(event.key) ||
        event.target.closest("input, textarea, video, audio") ||
        getSelection().toString()
      )
        return;
      event.preventDefault();
      flip(event.key === "ArrowRight" ? 1 : -1);
    });
    listen(reducedMotion, "change", settle);
    listen(document, "visibilitychange", () => {
      if (document.hidden) {
        release(true);
        settle();
      }
    });
    let stageWidth = 0;
    if (paired) {
      const headerSizes = new Map();
      const headers = new ResizeObserver((entries) => {
        for (const entry of entries)
          headerSizes.set(entry.target, entry.borderBoxSize[0].blockSize);
        const peek = Math.max(...headerSizes.values()) - 20;
        if (peek === backPeek) return;
        backPeek = peek;
        stack.style.setProperty("--stack-peek", `${peek}px`);
        if (drag) release(true);
        settle();
      });
      for (const node of nodes) {
        const header = node.querySelector(".pr-header, .source-author");
        if (header) headers.observe(header);
      }
    }
    new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width === stageWidth) return;
      stageWidth = width;
      if (drag) release(true);
      settle();
    }).observe(stage);
    layout();
    return stack;
  }

  return createEmbedStack;
}
