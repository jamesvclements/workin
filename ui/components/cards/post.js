import { element, safeUrl, icon, iconAssets } from "../dom.js";
import { messageFrame, appendReactions } from "./message.js";
import { appendAttachments } from "./attachments.js";

export function renderPost(source, options) {
  const { presentEmbed, emoji } = options;
  const { card, content, timestamp } = messageFrame(source, options);
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

  appendAttachments(content, source, options);
  if (source.quote) {
    const quote = element("blockquote", "source-quote");
    quote.appendChild(
      presentEmbed(
        renderPost(source.quote, options),
        { id: `quote:${source.quote.url}` },
        { variant: "compact", collapsedHeight: 144 },
      ),
    );
    content.appendChild(quote);
  }
  if (timestamp)
    content.appendChild(element("p", "source-meta", timestamp));
  if (source.metrics) {
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

  appendReactions(content, source, emoji);
  card.appendChild(content);
  return card;
}
