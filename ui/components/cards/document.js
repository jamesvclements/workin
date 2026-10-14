import { element, sourceLink } from "../dom.js";
import { linkCardSurface } from "../embed.js";

export function renderDocument(source) {
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
