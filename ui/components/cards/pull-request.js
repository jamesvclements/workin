import { element, sourceLink, icon } from "../dom.js";
import { linkCardSurface } from "../embed.js";
import { copyMarkdown } from "./markup.js";

export function renderPullRequestChip(pr) {
  const chip = sourceLink("", pr.url);
  chip.className = "pr-inline-chip";
  chip.setAttribute("aria-label", `${pr.state}: ${pr.title}`);
  const status = icon(pr.state);
  status.classList.add("pr-inline-status", pr.state);
  chip.append(status, element("span", "", pr.title));
  return chip;
}

export function renderPullRequest(pr, { identity = {} } = {}) {
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
