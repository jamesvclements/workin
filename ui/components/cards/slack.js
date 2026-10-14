import { element } from "../dom.js";
import { messageFrame, appendReactions } from "./message.js";
import { appendAttachments } from "./attachments.js";

export function renderSlack(source, options) {
  const { personAvatar, emoji } = options;
  const { card, content } = messageFrame(source, options);
  appendAttachments(content, source, options);
  appendReactions(content, source, emoji);
  if (source.thread?.replyCount) {
    const thread = element("div");
    thread.className = "slack-thread-link";
    const participants = source.thread.participants || [];
    const people = element("span", "thread-people");
    people.setAttribute("aria-hidden", "true");
    for (const person of participants.slice(0, 3)) {
      const badge = personAvatar(person, "thread-person");
      badge.title = person.name;
      people.appendChild(badge);
    }
    const description = element("span", "thread-description");
    description.appendChild(
      element(
        "strong",
        "",
        `${source.thread.replyCount} ${source.thread.replyCount === 1 ? "reply" : "replies"}`,
      ),
    );
    thread.setAttribute(
      "aria-label",
      `${source.thread.replyCount} replies in Slack. Also replied: ${participants.map((person) => person.name).join(", ")}`,
    );
    thread.title = thread.getAttribute("aria-label");
    thread.append(people, description);
    content.appendChild(thread);
  }

  card.appendChild(content);
  return card;
}
