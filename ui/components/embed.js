import { element, sourceLink, icon } from "./dom.js";
export function linkCardSurface(card) {
  if (card.querySelector(".card-surface-link")) return;
  const source = card.querySelector(
    ".source-context, .pr-title, .calendar-link, a",
  );
  if (!source?.href) return;
  const link = sourceLink("", source.href);
  link.className = "card-surface-link";
  link.setAttribute(
    "aria-label",
    source.getAttribute("aria-label") || "Open original source",
  );
  link.addEventListener("click", (event) => {
    if (getSelection().toString()) event.preventDefault();
  });
  card.appendChild(link);
}
export function createEmbeds({
  presentation,
  ResizeObserver,
  getContext,
  idPrefix = "embed",
}) {
  let embedSequence = 0;
  function presentEmbed(
    card,
    moment,
    choice = presentation.embeds?.[moment.id],
  ) {
    let compact = choice?.variant === "compact" || choice?.variant === "inline";
    card.classList.add("rich-embed");
    if (choice?.variant === "none") card.hidden = true;
    card.dataset.agentVariant = compact ? "compact" : "full";
    if (choice?.reason) card.dataset.variantReason = choice.reason;
    card.id = `${idPrefix}-${++embedSequence}`;
    card.dataset.evidenceKey = JSON.stringify([moment.id, getContext()]);
    linkCardSurface(card);
    if (card.matches(".calendar-card")) return card;
    const selectedReply = presentation.replyPreviews?.[moment.id];
    if (selectedReply && card.matches(".slack-card")) {
      const excerpt = sourceLink("", selectedReply.url);
      excerpt.className = "selected-reply";
      excerpt.append(
        element("span", "", selectedReply.author),
        element("p", "", selectedReply.text),
      );
      const thread = card.querySelector(".slack-thread-link");
      if (thread) {
        thread.before(excerpt);
      }
    }
    if (!compact) return card;
    const contents = element("div", "embed-crop-content");
    contents.id = `${card.id}-content`;
    contents.append(...card.childNodes);
    const viewport = element("div", "embed-crop-viewport");
    viewport.appendChild(contents);
    card.appendChild(viewport);
    card.classList.add("crop-embed");
    const collapsedHeight = choice?.collapsedHeight || 208;
    card.style.setProperty("--embed-collapsed-height", `${collapsedHeight}px`);
    const hit = element("div");
    hit.className = "embed-crop-hit";
    hit.setAttribute("aria-hidden", "true");
    const toggle = element("button", "embed-crop-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", contents.id);
    let heightAnimation = null;
    let needsCrop = true;
    const update = () => {
      card.classList.toggle("is-short", !needsCrop);
      card.classList.toggle("is-cropped", compact && needsCrop);
      hit.hidden = !compact || !needsCrop;
      toggle.hidden = !needsCrop;
      toggle.replaceChildren(icon(compact ? "down" : "up"));
      toggle.setAttribute(
        "aria-label",
        compact ? "Expand preview" : "Collapse preview",
      );
      toggle.setAttribute("aria-expanded", String(!compact));
    };
    toggle.addEventListener("click", () => {
      const startHeight = card.getBoundingClientRect().height;
      heightAnimation?.cancel();
      compact = !compact;
      update();
      const endHeight = card.getBoundingClientRect().height;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      heightAnimation = card.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 240, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
      );
    });
    card.append(hit, toggle);
    update();
    new ResizeObserver((entries) => {
      const size = entries[0].borderBoxSize?.[0];
      if (!size?.inlineSize) return;
      const overflowing = size.blockSize > collapsedHeight - 2;
      if (overflowing === needsCrop) return;
      heightAnimation?.cancel();
      needsCrop = overflowing;
      update();
    }).observe(contents);
    return card;
  }

  return presentEmbed;
}

/** Two source cards beside each other, with normal vertical flow on narrow screens. */
export function createPair(nodes) {
  if (nodes.length !== 2)
    throw Error("A source-card pair needs exactly two cards.");
  const pair = element("div", "embed-split");
  pair.append(...nodes);
  return pair;
}
