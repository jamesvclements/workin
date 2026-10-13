import { element, safeUrl } from "./dom.js";

/** Original attachment viewer, with cached URLs supplied by the host. No fetches. */
export function createMedia({ root, lifetime }) {
  function openAttachment(path, type, name) {
    if (!safeUrl(path)) return;
    const viewer = element("dialog", "attachment-viewer");
    viewer.setAttribute("aria-label", name);
    const close = element("button", "", "Close");
    close.type = "button";
    close.addEventListener("click", () => viewer.close());
    const media = element(type === "video" ? "video" : "img");
    media.src = path;
    if (type === "video") {
      media.controls = true;
      media.playsInline = true;
    } else media.alt = name;
    viewer.append(close, media);
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) viewer.close();
    });
    const dispose = () => {
      if (type === "video") media.pause();
      viewer.remove();
      lifetime.signal.removeEventListener("abort", dispose);
    };
    viewer.addEventListener("close", dispose, { once: true });
    lifetime.signal.addEventListener("abort", dispose, { once: true });
    (typeof root === "function" ? root() : root).append(viewer);
    viewer.showModal();
  }
  return { openAttachment };
}
