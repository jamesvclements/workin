import { element, sourceLink } from "../dom.js";

export function renderCalendar(event) {
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
