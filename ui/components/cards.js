import { element, sourceLink } from "./dom.js";
import { createAvatar } from "./cards/message.js";
import { renderSlack } from "./cards/slack.js";
import { renderPost } from "./cards/post.js";
import { renderPullRequest, renderPullRequestChip } from "./cards/pull-request.js";
import { renderCalendar } from "./cards/calendar.js";
import { renderDocument } from "./cards/document.js";

export function createCards(options) {
  const context = { presentation: {}, media: {}, emoji: {}, ...options };
  context.personAvatar = createAvatar(context.day);
  const renderers = {
    message: (source) => source.type === "tweet"
      ? renderPost(source, context) : renderSlack(source, context),
    "pull-request": (source) => renderPullRequest(source, context),
    event: renderCalendar,
    document: renderDocument,
  };
  return {
    renderPullRequestChip,
    renderRecord({ kind, value }) {
      if (renderers[kind]) return renderers[kind](value);
      const card = sourceLink(value.title || "Open source", value.url);
      card.className = "link-preview";
      if (value.text) card.append(element("span", "", value.text));
      return card;
    },
  };
}
