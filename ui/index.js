export { createTimeline } from "./components/timeline.js";

import { createCards } from "./components/cards.js";
import { createEmbeds, createPair as createSplitPair } from "./components/embed.js";
import { createLifetime } from "./components/lifetime.js";
import { createMedia } from "./components/media.js";
import { sourceRecord } from "./components/evidence.js";
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

/** Compose two original source cards without navigation or overlapping layers. */
export function createPair(nodes) {
  if (nodes.some((node) => !node.matches(".rich-embed")))
    throw Error("Compose source cards from createCard().");
  const pair = createSplitPair(nodes);
  pair.dispose = () => {
    for (const node of nodes) node.dispose?.();
  };
  return pair;
}

export function createPullRequestChip(source) {
  return createCards({
    day: { moments: [] },
    presentation: {},
  }).renderPullRequestChip(sourceRecord(source).value);
}
