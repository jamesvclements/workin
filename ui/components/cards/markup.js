import { element, sourceLink, safeUrl } from "../dom.js";
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

export function copyMarkdown(node, parent) {
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
