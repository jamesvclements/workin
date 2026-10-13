import {
  element,
  sourceLink,
  safeUrl,
  icon,
  iconAssets,
  appendBody,
} from "./dom.js";
import { linkCardSurface } from "./embed.js";
export function createCards({
  day,
  presentation,
  identity = {},
  openAttachment,
  presentEmbed,
  media = {},
  emoji = {},
}) {
  function renderCalendar(event) {
    const card = element("article", "calendar-card");
    card.setAttribute("aria-label", event.candidate);
    const date = element("div", "calendar-date");
    const day = new Date(`${event.date}T12:00:00`);
    date.append(
      element(
        "span",
        "",
        day.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      ),
      element("strong", "", String(day.getDate())),
    );
    const content = element("div", "calendar-content");
    const label = element("div", "calendar-label", "Calendar");
    label.appendChild(element("span", "calendar-status", event.status));
    const heading = element("h3");
    heading.appendChild(
      event.relatedUrl
        ? sourceLink(event.candidate, event.relatedUrl)
        : document.createTextNode(event.candidate),
    );
    heading.title = `${event.role} · ${event.timeLabel} · ${event.format}`;
    content.append(
      label,
      heading,
      element("span", "calendar-status", event.status),
      element("p", "calendar-detail", event.title),
      element("p", "calendar-meta", event.role),
    );
    const time = element(
      "p",
      "calendar-detail",
      [event.timeLabel, event.format].filter(Boolean).join(" · "),
    );
    time.title = event.timePrecision;
    content.append(time, element("p", "calendar-provenance", event.provenance));
    if (event.relatedUrl) {
      const link = sourceLink(event.relatedLabel, event.relatedUrl);
      link.className = "calendar-link";
      content.appendChild(link);
    }
    card.append(date, content);
    return card;
  }

  function renderPullRequestChip(pr) {
    const chip = sourceLink("", pr.url);
    chip.className = "pr-inline-chip";
    chip.setAttribute("aria-label", `${pr.state}: ${pr.title}`);
    const status = icon(pr.state);
    status.classList.add("pr-inline-status", pr.state);
    chip.append(status, element("span", "", pr.title));
    return chip;
  }

  function renderPullRequest(pr) {
    const card = element("article", "pr-card");
    card.setAttribute("aria-label", `Pull request #${pr.number}: ${pr.title}`);
    const header = element("div", "pr-header");
    const repository = element("div", "pr-repository");
    repository.replaceChildren(
      icon("github"),
      document.createTextNode(`${pr.repository} #${pr.number}`),
    );
    const title = sourceLink(pr.title, pr.url);
    title.className = "pr-title";
    const metadata = element("div", "pr-metadata");
    const state = element("span", `pr-state ${pr.state}`);
    state.replaceChildren(
      icon(pr.state),
      document.createTextNode(pr.state[0].toUpperCase() + pr.state.slice(1)),
    );
    repository.appendChild(state);
    if (pr.author && pr.author !== identity.github)
      metadata.append(element("span", "", `by ${pr.author}`));
    const topRow = element("div", "pr-top-row");
    topRow.append(repository);
    const titleRow = element("div", "pr-title-row");
    titleRow.append(title);
    if (metadata.childNodes.length) titleRow.append(metadata);
    header.append(topRow, titleRow);
    card.appendChild(header);

    const description = element(
      "div",
      `pr-description${pr.previewKind === "comparison" ? " pr-comparison" : ""}`,
    );
    const parsed = new DOMParser().parseFromString(
      pr.descriptionHtml || "",
      "text/html",
    );
    const allowed = new Set([
      "P",
      "STRONG",
      "EM",
      "DEL",
      "CODE",
      "PRE",
      "UL",
      "OL",
      "LI",
      "BLOCKQUOTE",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "BR",
      "HR",
      "TABLE",
      "THEAD",
      "TBODY",
      "TR",
      "TH",
      "TD",
      "A",
    ]);
    function copyMarkdown(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(node.textContent));
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "VIDEO") {
        const url = safeUrl(node.getAttribute("src"));
        if (!url) return;
        const video = element("video");
        video.src = url;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-label", "PR before or after recording");
        parent.appendChild(video);
        return;
      }
      if (
        node.nodeType !== Node.ELEMENT_NODE ||
        [
          "SCRIPT",
          "STYLE",
          "IFRAME",
          "OBJECT",
          "SVG",
          "IMG",
          "VIDEO",
          "BUTTON",
          "INPUT",
        ].includes(node.tagName)
      )
        return;
      let target = parent;
      if (allowed.has(node.tagName)) {
        target =
          node.tagName === "A"
            ? sourceLink("", node.getAttribute("href"))
            : element(node.tagName.toLowerCase());
        parent.appendChild(target);
      }
      for (const child of node.childNodes) copyMarkdown(child, target);
    }
    let blocks = 0;
    for (const node of parsed.body.children) {
      if (!node.textContent.trim()) continue;
      if (blocks >= 2) break;
      copyMarkdown(node, description);
      if (!/^H[1-6]$/.test(node.tagName)) blocks++;
    }
    if (pr.previewCaption)
      description.appendChild(element("p", "", pr.previewCaption));
    if (!description.textContent.trim())
      description.textContent = "No description provided.";
    card.appendChild(description);
    const footer = element("div", "pr-footer");
    const additions = element(
      "strong",
      "pr-additions",
      Number.isFinite(pr.additions) ? `+${pr.additions.toLocaleString()}` : "",
    );
    additions.setAttribute("aria-label", `${pr.additions} lines added`);
    const deletions = element(
      "strong",
      "pr-deletions",
      Number.isFinite(pr.deletions) ? `−${pr.deletions.toLocaleString()}` : "",
    );
    deletions.setAttribute("aria-label", `${pr.deletions} lines deleted`);
    if (Number.isFinite(pr.additions)) footer.append(additions);
    if (Number.isFinite(pr.deletions)) footer.append(deletions);
    const total = pr.additions + pr.deletions;
    if (total) {
      const bars = element("span", "pr-diff-bars");
      bars.setAttribute("aria-hidden", "true");
      const greenCount = Math.round((pr.additions / total) * 5);
      for (let index = 0; index < 5; index++)
        bars.appendChild(element("i", index < greenCount ? "addition" : ""));
      footer.appendChild(bars);
    }
    if (Number.isFinite(pr.changedFiles))
      footer.title = `${pr.changedFiles} files changed`;
    titleRow.appendChild(footer);
    linkCardSurface(card);
    return card;
  }

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

  function renderSource(source) {
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
    brand.innerHTML = tweet
      ? '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9L1 2h6.5l4.4 6.7L18.9 2ZM17.8 20h1.7L6.6 3.9H4.8L17.8 20Z"/></svg>'
      : '<svg aria-hidden="true" viewBox="0 0 24 24"><g fill="#36c5f0"><rect x="1" y="7" width="10" height="4" rx="2"/><path d="M11 1H9a2 2 0 1 0 2 2Z"/></g><g fill="#2eb67d"><rect x="13" y="1" width="4" height="10" rx="2"/><path d="M23 11V9a2 2 0 1 0-2 2Z"/></g><g fill="#ecb22e"><rect x="13" y="13" width="10" height="4" rx="2"/><path d="M13 23h2a2 2 0 1 0-2-2Z"/></g><g fill="#e01e5a"><rect x="7" y="13" width="4" height="10" rx="2"/><path d="M1 13v2a2 2 0 1 0 2-2Z"/></g></svg>';
    if (!tweet) brand.replaceChildren(icon("slack"));
    if (tweet) brand.appendChild(document.createTextNode("Post"));
    const location = element(
      "span",
      "source-location",
      tweet ? "" : channel.replace(/\s*·\s*Thread reply/i, ""),
    );
    if (!tweet && /Thread reply/i.test(source.context || "")) {
      const reply = element("span", "source-thread-indicator");
      reply.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8H5a2 2 0 0 0-2 2v9l4-3h8a2 2 0 0 0 2-2v-1M10 3h9a2 2 0 0 1 2 2v8l-4-3h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></svg>';
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
    if (source.media?.length) {
      const gallery = element("div", "source-media");
      for (const media of source.media) {
        if (!safeUrl(media.url)) continue;
        const attachment = element(media.type === "video" ? "video" : "img");
        attachment.src = media.url;
        if (media.width && media.height) {
          attachment.width = media.width;
          attachment.height = media.height;
          attachment.style.height = "auto";
        }
        if (media.type === "video") {
          attachment.playsInline = true;
          if (safeUrl(media.poster)) attachment.poster = media.poster;
        }
        if (media.type === "video") {
          attachment.controls = true;
          attachment.preload = "metadata";
          attachment.setAttribute("aria-label", media.alt || "Attached video");
        } else {
          attachment.alt = media.alt || "Attached image";
          attachment.loading = "lazy";
        }
        gallery.appendChild(attachment);
      }
      content.appendChild(gallery);
    }
    if (source.attachments?.length) {
      const gallery = element("div", "attachment-grid");
      for (let attachment of source.attachments) {
        const link = sourceLink("", attachment.url);
        link.className = "attachment-card";
        link.title = `${attachment.name} · Open in Slack`;
        link.setAttribute("aria-label", `Open ${attachment.name} in Slack`);
        const preview = element("div", "attachment-preview");
        preview.dataset.attachmentId = attachment.id;
        preview.dataset.attachmentName = attachment.name;
        preview.dataset.attachmentType = attachment.type;
        const fallback = element(
          "span",
          "attachment-fallback",
          attachment.type === "document"
            ? "▤"
            : "Preview unavailable · Open in Slack",
        );
        preview.appendChild(fallback);
        const cachedAsset = media[attachment.id];
        attachment = {
          ...attachment,
          preview:
            cachedAsset?.poster ||
            (attachment.type === "image" ? cachedAsset?.src : null) ||
            attachment.preview,
        };
        if (
          safeUrl(attachment.preview) ||
          /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            attachment.preview || "",
          )
        ) {
          const image = element("img");
          image.alt = attachment.name;
          image.loading = "eager";
          image.hidden = true;
          image.addEventListener("load", () => {
            image.hidden = false;
            fallback.hidden = true;
          });
          image.addEventListener("error", () => {
            image.remove();
            fallback.textContent = "Preview unavailable · Open in Slack";
          });
          image.src = attachment.preview;
          preview.appendChild(image);
          if (attachment.type === "video") {
            const play = element("span", "attachment-play", "▶ Video");
            play.setAttribute("aria-hidden", "true");
            preview.appendChild(play);
          }
        }
        if (
          attachment.type === "video" &&
          safeUrl(cachedAsset?.src) &&
          !attachment.preview
        ) {
          const video = element("video");
          video.src = cachedAsset.src;
          video.controls = true;
          video.playsInline = true;
          video.preload = "metadata";
          video.setAttribute("aria-label", attachment.name);
          video.addEventListener("loadeddata", () => {
            fallback.hidden = true;
          });
          video.addEventListener("error", () => {
            video.remove();
            fallback.hidden = false;
          });
          video.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          preview.append(video);
        }
        link.append(preview);
        link.addEventListener("click", (event) => {
          const cached = media[attachment.id];
          if (cached?.src && ["image", "video"].includes(attachment.type)) {
            event.preventDefault();
            if (event.detail === 0)
              openAttachment(cached.src, attachment.type, attachment.name);
          }
        });
        link.addEventListener("dblclick", (event) => {
          const cached = media[attachment.id];
          if (!cached?.src || !["image", "video"].includes(attachment.type))
            return;
          event.preventDefault();
          openAttachment(cached.src, attachment.type, attachment.name);
        });
        gallery.appendChild(link);
      }
      content.appendChild(gallery);
    } else if (source.attachmentCount) {
      const attachments = sourceLink(
        `View ${source.attachmentCount} attachments in Slack ↗`,
        source.url,
      );
      attachments.className = "source-attachment-link";
      content.appendChild(attachments);
    }
    if (source.quote) {
      const quote = element("blockquote", "source-quote");
      quote.appendChild(
        presentEmbed(
          renderSource(source.quote),
          { id: `quote:${source.quote.url}` },
          { variant: "compact", collapsedHeight: 144 },
        ),
      );
      content.appendChild(quote);
    }
    if (tweet && timestamp)
      content.appendChild(element("p", "source-meta", timestamp));
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
    if (tweet && source.metrics) {
      const engagement = element("div", "tweet-engagement");
      for (const [label, count] of Object.entries(source.metrics)) {
        if (!Number.isFinite(count)) continue;
        const metric = element("span", "engagement-metric");
        if (iconAssets[label]) metric.appendChild(icon(label));
        metric.title = `${count.toLocaleString()} ${label}`;
        metric.setAttribute("aria-label", metric.title);
        metric.appendChild(
          document.createTextNode(
            iconAssets[label]
              ? count.toLocaleString()
              : `${count.toLocaleString()} ${label}`,
          ),
        );
        engagement.appendChild(metric);
      }
      content.appendChild(engagement);
    }
    if (footer.childNodes.length) content.appendChild(footer);
    if (!tweet && source.thread?.replyCount) {
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

  function renderRecord(record) {
    const source = record.value;
    if (record.kind === "message") return renderSource(source);
    if (record.kind === "pull-request") return renderPullRequest(source);
    if (record.kind === "event") return renderCalendar(source);
    if (record.kind === "document") {
      const card = element("article", "source-card rich-embed notion-card");
      const heading = sourceLink("", source.url);
      heading.className = "source-context";
      heading.append(
        element("span", "notion-mark", source.provider?.slice(0, 1) || "D"),
        document.createTextNode(source.provider || "Document"),
      );
      const content = element("div", "notion-document");
      const title = element("h3");
      title.appendChild(sourceLink(source.title, source.url));
      content.append(title, element("blockquote", "", source.excerpt));
      if (source.isExcerpt)
        content.appendChild(element("p", "source-meta", "Excerpt"));
      card.append(heading, content);
      linkCardSurface(card);
      return card;
    }
    const card = sourceLink(source.title || "Open source", source.url);
    card.className = "link-preview";
    if (source.text) card.append(element("span", "", source.text));
    return card;
  }

  return {
    renderCalendar,
    renderPullRequest,
    renderPullRequestChip,
    renderSource,
    personAvatar,
    renderRecord,
  };
}
