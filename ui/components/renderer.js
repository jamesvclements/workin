import { element, icon } from "./dom.js";
import { createCards } from "./cards.js";
import { createEmbeds, createPair } from "./embed.js";
import { createMedia } from "./media.js";
import { installItemNavigation } from "./item-navigation.js";
import { createThreadFocus } from "./thread.js";
import { createLifetime } from "./lifetime.js";
export function mount(root, snapshot) {
  const scope = createLifetime();
  const { lifetime, ResizeObserver } = scope;
  const day = structuredClone(snapshot.native.day);
  const presentation = structuredClone(snapshot.native.presentation);
  const timeline = root.querySelector(".timeline");
  const { openAttachment } = createMedia({ root, lifetime });
  let embedContext = "detailed";
  const presentEmbed = createEmbeds({
    presentation,
    ResizeObserver,
    getContext: () => embedContext,
    idPrefix: snapshot.instanceId,
  });
  const { renderRecord } = createCards({
    day,
    presentation,
    identity: snapshot.config.identity || {},
    openAttachment,
    presentEmbed,
    media: snapshot.media,
    emoji: snapshot.emoji,
  });
  let moments = day.moments.map((moment) => ({ ...moment }));
  if (snapshot.view.active)
    moments = moments.filter((moment) => {
      const date = moment.date || day.date;
      return (
        date >= snapshot.view.dateScope.from &&
        date <= snapshot.view.dateScope.to
      );
    });
  moments = moments.filter((moment) => !presentation.omissions?.[moment.id]);
  const byId = new Map(moments.map((moment) => [moment.id, moment]));
  const sortKey = (moment) => new Date(moment.at).toISOString();
  for (const relation of presentation.relations) {
    const child = byId.get(relation.childId);
    const parent = byId.get(relation.parentId);
    if (child && parent && sortKey(parent) < sortKey(child))
      child.parentId = parent.id;
  }
  moments.sort((first, second) =>
    sortKey(first).localeCompare(sortKey(second)),
  );
  const children = new Map();
  for (const moment of moments) {
    if (!byId.has(moment.parentId)) continue;
    if (!children.has(moment.parentId)) children.set(moment.parentId, []);
    children.get(moment.parentId).push(moment);
  }
  const anchorId = (id) =>
    `${snapshot.instanceId}-moment-${btoa(encodeURIComponent(id)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;
  function threadMoments(id) {
    const connected = new Set();
    const pending = [id];
    while (pending.length) {
      const current = pending.pop();
      if (connected.has(current)) continue;
      connected.add(current);
      const parentId = byId.get(current)?.parentId;
      if (byId.has(parentId)) pending.push(parentId);
      for (const child of children.get(current) || []) pending.push(child.id);
    }
    return moments.filter((moment) => connected.has(moment.id));
  }

  function timestampContents(moment, previousDate) {
    const content = document.createElement("span");
    const date = moment.date || day.date;
    if (date !== previousDate) {
      const label = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      content.append(
        element("strong", "", label),
        document.createTextNode(` at ${moment.time}`),
      );
    } else {
      content.textContent = moment.time;
    }
    return content.innerHTML;
  }

  const thread = createThreadFocus({
    root,
    getNode: (id) => root.querySelector(`#${anchorId(id)}`),
    connected: threadMoments,
    timestampContents,
  });
  const openThread = thread.open;

  function jumpLink(text, id, className) {
    const link = element("a", className, text);
    link.href = `#${anchorId(id)}`;
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      const target = root.querySelector(`#${anchorId(id)}`);
      if (!target) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      openThread(id, link);
    });
    return link;
  }

  let previousDate;
  moments.forEach((moment) => {
    const section = document.createElement("section");
    section.className = "moment";
    section.id = anchorId(moment.id);
    section.tabIndex = -1;

    const timestamp = document.createElement("h2");
    timestamp.className = "timestamp";
    const momentDate = moment.date || day.date;
    timestamp.innerHTML = timestampContents(moment, previousDate);
    previousDate = momentDate;
    section.appendChild(timestamp);

    const messages = document.createElement("div");
    messages.className = "messages";

    function bubble(text) {
      const wrap = element("div", "message-wrap");
      const message = element("div", "message tail");
      message.innerHTML = `<p>${text}</p>`;
      wrap.appendChild(message);
      return wrap;
    }

    const parent = byId.get(moment.parentId);
    if (parent) {
      const context = element("div", "resurfaced-context");
      const quote = jumpLink("", parent.id, "context-quote");
      const plain = new DOMParser().parseFromString(parent.summary, "text/html")
        .body.textContent;
      quote.title = `Open thread from ${parent.date || day.date}, ${parent.time}: ${plain}`;
      quote.setAttribute("aria-label", quote.title);
      quote.appendChild(element("span", "", plain));
      context.appendChild(quote);
      messages.appendChild(context);
    }
    const mainBubble = bubble(moment.summary);
    if (parent || children.has(moment.id)) {
      mainBubble.style.cursor = "pointer";
      mainBubble.addEventListener("click", (event) => {
        if (event.target.closest("a, button") || getSelection().toString())
          return;
        openThread(
          moment.id,
          section.querySelector(".context-quote, .story-updates a"),
        );
      });
    }
    if (parent) {
      const curve = element("span", "context-curve");
      curve.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 20 46" fill="none"><path d="M3 3V27Q3 40 12 40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
      mainBubble.prepend(curve);
    }
    messages.appendChild(mainBubble);
    for (const record of moment.records) {
      const key = { id: `${moment.id}:${record.id}` };
      messages.appendChild(
        presentEmbed(renderRecord(record), key, presentation.embeds[moment.id]),
      );
    }

    const connectedMoments = threadMoments(moment.id);
    const subsequentMoments = connectedMoments.slice(
      connectedMoments.findIndex((entry) => entry.id === moment.id) + 1,
    );
    const updateCount = subsequentMoments.length;
    if (updateCount) {
      const navigation = element("div", "story-updates");
      const updateLink = jumpLink(
        `${updateCount} ${updateCount === 1 ? "update" : "updates"}`,
        moment.id,
        "",
      );
      updateLink.appendChild(icon("down"));
      navigation.appendChild(updateLink);
      messages.appendChild(navigation);
    }

    section.appendChild(messages);
    timeline.appendChild(section);
  });

  const groupedIds = new Set();
  for (const group of snapshot.view.mode === "detailed"
    ? presentation.detailedGroups
    : []) {
    const members = group.momentIds.map((id) => byId.get(id));
    if (
      members.length < 2 ||
      members.some(
        (member) =>
          !member ||
          groupedIds.has(member.id) ||
          member.parentId ||
          children.has(member.id),
      )
    )
      continue;
    const nodes = members.map((member) =>
      root.querySelector(`#${anchorId(member.id)}`),
    );
    if (
      nodes.some(
        (node, index) =>
          !node || (index && nodes[index - 1].nextElementSibling !== node),
      )
    )
      continue;
    const wrapper = element("section", "detailed-group");
    wrapper.id = `${snapshot.instanceId}-group-${group.id}`;
    wrapper.dataset.reason = group.reason;
    const first = members[0];
    const last = members.at(-1);
    const range =
      first.date === last.date
        ? `${first.time} – ${last.time}`
        : `${first.date} ${first.time} – ${last.date} ${last.time}`;
    wrapper.appendChild(element("h2", "timestamp", range));
    const messageWrap = element("div", "message-wrap");
    const message = element("div", "message tail");
    message.appendChild(element("p", "", group.summary));
    messageWrap.appendChild(message);
    wrapper.appendChild(messageWrap);
    nodes[0].before(wrapper);
    for (const [index, node] of nodes.entries()) {
      node.querySelector(":scope > .timestamp").hidden = true;
      node.querySelector(":scope > .messages > .message-wrap").hidden = true;
      node.style.marginBottom = "12px";
      node.style.marginTop = "12px";
      wrapper.appendChild(node);
      groupedIds.add(members[index].id);
    }
    wrapper.style.marginBottom = "var(--time-block-gap)";
    if (group.layout === "pair" && nodes.length === 2)
      wrapper.appendChild(createPair(nodes));
  }

  const compactTimeline = root.querySelector(".compact-timeline");
  const compactPlan = structuredClone(
    presentation.compact || { stories: [], omitted: [] },
  );
  compactPlan.stories = compactPlan.stories.filter((story) =>
    story.momentIds.every((id) => byId.has(id)),
  );
  const covered = new Set(
    [...compactPlan.stories, ...compactPlan.omitted].flatMap(
      (story) => story.momentIds,
    ),
  );
  const compactStories = compactPlan.stories.map((story) => ({ ...story }));
  for (const moment of moments) {
    if (covered.has(moment.id)) continue;
    compactStories.push({
      id: `unreviewed:${moment.id}`,
      summary: new DOMParser().parseFromString(moment.summary, "text/html").body
        .textContent,
      momentIds: [moment.id],
      unreviewed: true,
      embeds: [],
    });
  }
  const resolvedStories = compactStories
    .map((story) => ({
      ...story,
      evidence: story.momentIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .sort((first, second) => sortKey(first).localeCompare(sortKey(second))),
    }))
    .filter((story) => story.evidence.length);
  resolvedStories.sort((first, second) =>
    sortKey(first.evidence.at(-1)).localeCompare(
      sortKey(second.evidence.at(-1)),
    ),
  );
  let activeView = "detailed";
  const viewScroll = { detailed: 0, compact: 0 };
  function setView(view) {
    if (view === activeView) return;
    viewScroll[activeView] = scrollY;
    activeView = view;
    timeline.hidden = view !== "detailed";
    compactTimeline.hidden = view !== "compact";
    scrollTo({ top: viewScroll[view], behavior: "instant" });
  }
  const compactDate = (moment) =>
    new Date(`${moment.date || day.date}T12:00:00`).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );
  embedContext = "compact";
  for (const story of resolvedStories) {
    const section = element("section", "compact-story");
    const first = story.evidence[0];
    const latest = story.evidence.at(-1);
    const range =
      compactDate(first) === compactDate(latest)
        ? compactDate(latest)
        : `${compactDate(first)} – ${compactDate(latest)}`;
    section.appendChild(
      element(
        "h2",
        "timestamp",
        `${range}${story.unreviewed ? " · New update" : ""}`,
      ),
    );
    const bubble = element("div", "message tail");
    bubble.appendChild(element("p", "", story.summary));
    const details = element("button", "", `${story.evidence.length} updates`);
    details.appendChild(icon("down"));
    details.type = "button";
    details.addEventListener("click", () => {
      openThread(first.id, details, story.evidence, `compact:${story.id}`);
    });
    section.appendChild(bubble);
    for (const selection of story.embeds || []) {
      if (!story.momentIds.includes(selection.momentId)) continue;
      const moment = byId.get(selection.momentId);
      if (!moment) continue;
      const record = selection.sourceId
        ? moment.records.find((record) => record.id === selection.sourceId)
        : moment.records[0];
      const card = record ? renderRecord(record) : null;
      if (card)
        section.appendChild(
          presentEmbed(card, { id: `${moment.id}:${record.id}` }, selection),
        );
    }
    if (story.evidence.length > 1) section.appendChild(details);
    compactTimeline.appendChild(section);
  }

  setView(snapshot.view.mode);
  if (!moments.length) {
    const empty = element(
      "p",
      "compact-intro",
      day.moments.length
        ? "No moments in this time range."
        : "No moments yet. Ask your agent to gather your recent work.",
    );
    (snapshot.view.mode === "compact" ? compactTimeline : timeline).appendChild(
      empty,
    );
  }
  installItemNavigation(lifetime.signal, root);
  return {
    getThreadId: thread.getId,
    openThread: (id) => {
      const story = resolvedStories.find(
        (story) => `compact:${story.id}` === id,
      );
      if (story) openThread(story.evidence[0].id, null, story.evidence, id);
      else if (byId.has(id)) openThread(id);
    },
    dispose: () => {
      thread.destroy();
      for (const animation of root.getAnimations({ subtree: true }))
        animation.cancel();
      scope.destroy();
      for (const node of root.querySelectorAll("dialog.attachment-viewer")) {
        for (const media of node.querySelectorAll("video, audio"))
          media.pause();
        node.close();
        node.remove();
      }
    },
  };
}
