import { createTimeline } from "../index.js";

const container = document.querySelector("#journal");
const status = document.querySelector("#status");
// This demo only uses source integrations verified in the original journal.
// Fictional content must not introduce fictional providers.
const demoSources = new Set(["slack", "pull-request", "post", "event"]);
try {
  const response = await fetch(new URL("./journal.json", import.meta.url));
  if (!response.ok)
    throw new Error(`Could not load the example (${response.status}).`);
  const journal = await response.json();
  for (const moment of journal.moments) {
    for (const source of moment.sources) {
      if (!demoSources.has(source.type))
        throw new Error(`Unsupported demo source: ${source.type}.`);
    }
  }
  // Resolve relative demo assets explicitly, independent of the host page URL.
  for (const asset of Object.values(journal.media)) {
    asset.src = new URL(asset.src, import.meta.url).href;
    if (asset.poster) asset.poster = new URL(asset.poster, import.meta.url).href;
  }
  // The agent supplies the presentation in journal.json. The page displays it.
  createTimeline(container, journal);
} catch (error) {
  status.classList.add("has-error");
  status.textContent = error.message;
} finally {
  container.setAttribute("aria-busy", "false");
}
