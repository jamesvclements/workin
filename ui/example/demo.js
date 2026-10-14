import { createTimeline } from "../index.js";

const container = document.querySelector("#journal");
const status = document.querySelector("#status");
try {
  const response = await fetch(new URL("./journal.json", import.meta.url));
  if (!response.ok) throw Error(`Could not load journal (${response.status}).`);
  const data = await response.json();
  for (const asset of Object.values(data.media || {})) {
    for (const key of ["src", "poster"]) {
      if (asset[key]) asset[key] = new URL(asset[key], import.meta.url).href;
    }
  }
  createTimeline(container, data);
} catch (error) {
  status.classList.add("has-error");
  status.textContent = error.message;
} finally {
  container.setAttribute("aria-busy", "false");
}
