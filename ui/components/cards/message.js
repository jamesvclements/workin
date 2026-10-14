import { element, sourceLink, safeUrl, icon, appendBody } from "../dom.js";

export function messageFrame(source, { day, presentation, personAvatar, emoji }) {
  const tweet = source.type === "tweet";
  const card = element(
    "article",
    `source-card ${tweet ? "tweet-card" : "slack-card"}`,
  );
  card.setAttribute(
    "aria-label",
    tweet ? "Tweet" : `Slack message by ${source.author.name}`,
  );
  const context = sourceLink("", source.url);
  context.className = "source-context";
  const channel =
    source.context ||
    presentation.slackChannels?.[
      source.url?.match(/\/archives\/([^/]+)/)?.[1]
    ] ||
    "";
  context.setAttribute(
    "aria-label",
    tweet ? "Open post on X" : `Open message in Slack: ${channel}`,
  );
  const brand = element("span", "source-brand");
  if (tweet) brand.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9L1 2h6.5l4.4 6.7L18.9 2ZM17.8 20h1.7L6.6 3.9H4.8L17.8 20Z"/></svg>';
  else brand.appendChild(icon("slack"));
  if (tweet) brand.appendChild(document.createTextNode("Post"));
  const location = element(
    "span",
    "source-location",
    tweet ? "" : channel.replace(/\s*·\s*Thread reply/i, ""),
  );
  if (!tweet && /Thread reply/i.test(source.context || "")) {
    const reply = element("span", "source-thread-indicator");
    reply.replaceChildren(
      icon("thread"),
      document.createTextNode("In thread"),
    );
    location.appendChild(reply);
  }
  brand.appendChild(location);
  context.append(brand);
  card.appendChild(context);
  const content = element("div", "source-content");
  const header = element("div", "source-author");
  const avatar = personAvatar(source.author, "source-avatar");
  header.appendChild(avatar);
  const identity = element("div");
  identity.appendChild(element("div", "source-name", source.author.name));
  if (source.author.verified && !tweet) {
    const verified = element("span", "verified", "✓");
    verified.setAttribute("aria-label", "Verified account");
    identity.firstChild.appendChild(verified);
  }
  const timestamp = source.timestamp
    ? new Date(source.timestamp).toLocaleString("en-US", {
        timeZone: day.timezone,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  identity.appendChild(
    element(
      "div",
      "source-meta",
      tweet ? source.author.handle || "" : timestamp,
    ),
  );
  header.appendChild(identity);
  content.appendChild(header);
  appendBody(content, source, emoji);

  return { card, content, timestamp };
}

export function createAvatar(day) {
  const knownAvatars = new Map();
  for (const moment of day.moments) {
    if (moment.source?.type !== "slack") continue;
    for (const person of [
      moment.source.author,
      ...(moment.source.thread?.participants || []),
    ]) {
      if (person?.id && safeUrl(person.avatar))
        knownAvatars.set(person.id, person.avatar);
    }
  }
  function personAvatar(person, className) {
    const fallback = element("span", `${className} avatar-fallback`);
    const seed = [...(person.id || person.name || "")].reduce(
      (total, letter) => total + letter.charCodeAt(0),
      0,
    );
    const hue = seed % 360;
    fallback.style.background = `hsl(${hue} 35% 91%)`;
    fallback.style.color = `hsl(${hue} 25% 47%)`;
    fallback.title = person.name;
    const initials = (person.name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    fallback.textContent = initials;
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", person.name || "Unknown participant");
    const avatarUrl = safeUrl(person.avatar) || knownAvatars.get(person.id);
    if (!avatarUrl) return fallback;
    const avatar = element("img", className);
    avatar.alt = "";
    avatar.title = person.name;
    avatar.loading = "lazy";
    avatar.addEventListener("error", () => avatar.replaceWith(fallback), {
      once: true,
    });
    avatar.src = avatarUrl;
    return avatar;
  }

  return personAvatar;
}

export function appendReactions(content, source, emoji) {
  const footer = element("div", "source-footer");
  for (const reaction of source.reactions || []) {
    const badge = element("span", "source-reaction");
    badge.title = `:${reaction.label}: · ${reaction.count} ${reaction.count === 1 ? "reaction" : "reactions"}`;
    badge.setAttribute("aria-label", badge.title);
    const cachedEmoji = emoji?.[reaction.label.replace(/^:|:$/g, "")];
    const reactionImage = cachedEmoji || reaction.image;
    if (safeUrl(reactionImage)) {
      const emoji = element("img");
      emoji.src = reactionImage;
      emoji.alt = reaction.label;
      badge.appendChild(emoji);
      emoji.addEventListener(
        "error",
        () =>
          emoji.replaceWith(document.createTextNode(`:${reaction.label}:`)),
        { once: true },
      );
    } else {
      const unicode = {
        "+1": "👍",
        thumbsup: "👍",
        heart: "❤️",
        black_heart: "🖤",
        eyes: "👀",
        fire: "🔥",
        tada: "🎉",
        clap: "👏",
        white_check_mark: "✅",
        hourglass_flowing_sand: "⏳",
        tm: "™️",
        moneybag: "💰",
      };
      const label = reaction.label.replace(/^:|:$/g, "");
      badge.appendChild(
        document.createTextNode(
          unicode[label] || (/^[\w+-]+$/.test(label) ? `:${label}:` : label),
        ),
      );
    }
    badge.appendChild(
      element("span", "reaction-count", String(reaction.count)),
    );
    footer.appendChild(badge);
  }

  if (footer.childNodes.length) content.appendChild(footer);
}
