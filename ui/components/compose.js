import { createCards } from "./cards.js";
import { createEmbeds } from "./embed.js";
import { createStacks } from "./stack.js";
import { createLifetime } from "./lifetime.js";
import { createMedia } from "./media.js";
import { sourceRecord } from "./evidence.js";
let sequence = 0;

/** Standalone original card. Call element.dispose() before removing it. */
export function createCard(source, options = {}) {
  const scope = createLifetime();
  let card;
  const assets = createMedia({
    root: () => card.closest(".workin") || card,
    lifetime: scope.lifetime,
  });
  const presentEmbed = createEmbeds({
    presentation: {},
    ResizeObserver: scope.ResizeObserver,
    getContext: () => "standalone",
    idPrefix: `source-${++sequence}`,
  });
  const cards = createCards({
    day: { moments: [], timezone: options.timeZone || "UTC" },
    presentation: {},
    identity: {},
    openAttachment: assets.openAttachment,
    presentEmbed,
    media: options.media,
    emoji: options.emoji,
  });
  card = presentEmbed(
    cards.renderRecord(sourceRecord(source, options)),
    { id: source.id },
    { variant: options.compact ? "compact" : "full" },
  );
  card.dispose = () => {
    for (const animation of card.getAnimations({ subtree: true }))
      animation.cancel();
    for (const media of card.querySelectorAll("video, audio")) media.pause();
    scope.destroy();
  };
  return card;
}

/** The original split pair / three-card gesture stack. No paging buttons. */
export function createStack(nodes) {
  if (![2, 3].includes(nodes.length))
    throw Error(
      "Use two source cards for a split pair, or three for a gesture stack.",
    );
  if (nodes.some((node) => !node.matches(".rich-embed")))
    throw Error(
      "Compose source cards from createCard(), not an attachment carousel.",
    );
  const scope = createLifetime();
  const stack = createStacks({
    ...scope,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
  })(nodes);
  stack.dispose = () => {
    for (const animation of stack.getAnimations({ subtree: true }))
      animation.cancel();
    for (const node of nodes) node.dispose?.();
    scope.destroy();
  };
  return stack;
}

export function createPullRequestChip(source) {
  return createCards({
    day: { moments: [] },
    presentation: {},
  }).renderPullRequestChip(sourceRecord(source).value);
}
