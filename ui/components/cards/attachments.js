import { element, sourceLink, safeUrl } from "../dom.js";

export function appendAttachments(content, source, { media, openAttachment }) {
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
}
