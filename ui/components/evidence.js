import { element, appendBody } from "./dom.js";

export const escapeText = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function dateParts(at, timeZone) {
  const date = new Date(at);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((value) => value.type === type).value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: date.toLocaleTimeString("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

/** Translate the public data contract into the original card inputs. */
export function sourceRecord(source, options = {}) {
  if ("layout" in source)
    throw Error(
      "Attachment layouts are source-native. Use group.layout only for a source-card pair.",
    );
  const media = options.media || {},
    timeZone = options.timeZone || "UTC";
  switch (source.type) {
    case "slack":
    case "post": {
      const value = {
        ...source,
        type: source.type === "post" ? "tweet" : "slack",
        timestamp: source.at,
      };
      value.attachments = (source.attachments || []).map((item) => ({
        ...item,
        type: item.kind,
        preview:
          media[item.id]?.poster ||
          (item.kind === "image" ? media[item.id]?.src : null),
      }));
      // Posts use original inline media; Slack keeps its attachment thumbnails.
      if (source.type === "post") {
        value.media = (source.attachments || [])
          .filter(
            (item) =>
              ["image", "video"].includes(item.kind) && media[item.id]?.src,
          )
          .map((item) => ({
            type: item.kind,
            url: media[item.id].src,
            poster: media[item.id].poster,
            alt: item.alt || item.name,
          }));
        value.attachments = value.attachments.filter(
          (item) =>
            !value.media.some((asset) => asset.url === media[item.id]?.src),
        );
      }
      return { kind: "message", value };
    }
    case "pull-request": {
      const content = element("div");
      appendBody(content, { ...source, type: "slack" }, options.emoji || {});
      return {
        kind: "pull-request",
        value: {
          ...source,
          author: source.author?.name,
          descriptionHtml:
            source.descriptionHtml || content.firstChild.innerHTML,
        },
      };
    }
    case "document":
      return {
        kind: "document",
        value: {
          ...source,
          excerpt: source.text || "",
          isExcerpt: Boolean(source.excerpt),
        },
      };
    case "event": {
      const start = dateParts(source.start, timeZone);
      const end = source.end ? dateParts(source.end, timeZone) : null;
      return {
        kind: "event",
        value: {
          date: start.date,
          candidate: source.title,
          title: source.text || "",
          role: "",
          timeLabel: end ? `${start.time} – ${end.time}` : start.time,
          format: "",
          status: source.status || "",
          provenance: "",
          relatedUrl: source.url,
          relatedLabel: source.title,
        },
      };
    }
    default:
      return { kind: "link", value: source };
  }
}

/** Rendering state only. Lossless storage and collection remain with the host. */
export function snapshotFrom(options, instanceId) {
  const {
    moments,
    timeZone = "UTC",
    groups = [],
    view = {},
    media = {},
    emoji = {},
  } = options;
  new Intl.DateTimeFormat("en-US", { timeZone });
  const byId = new Map();
  for (const moment of moments) {
    if (!moment.id || byId.has(moment.id))
      throw Error("Each moment needs a unique ID.");
    if (
      !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(moment.at) ||
      !Number.isFinite(Date.parse(moment.at))
    )
      throw Error(`Invalid timestamp: ${moment.id}`);
    if (typeof moment.summary !== "string" || !Array.isArray(moment.sources))
      throw Error(`A summary and sources are required: ${moment.id}`);
    byId.set(moment.id, moment);
  }
  for (const moment of moments) {
    if (
      moment.parentId &&
      (!byId.has(moment.parentId) ||
        Date.parse(byId.get(moment.parentId).at) >= Date.parse(moment.at))
    )
      throw Error(`A parent must identify an earlier moment: ${moment.id}`);
  }
  if (view.mode && !["detailed", "highlights"].includes(view.mode))
    throw Error("Unknown rendering mode.");
  for (const key of ["from", "to"]) {
    const date = view[key];
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw Error(`Invalid view ${key}.`);
  }
  if (view.from && view.to && view.from > view.to)
    throw Error("View dates are reversed.");
  const day = { timezone: timeZone, moments: [], pullRequests: {} };
  const presentation = {
    updates: [],
    relations: [],
    summaries: {},
    embeds: options.embeds || {},
    omissions: Object.fromEntries((view.omitted || []).map((id) => [id, true])),
    documents: {},
    detailedGroups: [],
    compact: { stories: [], omitted: [] },
  };
  for (const moment of moments) {
    const native = {
      id: moment.id,
      at: moment.at,
      ...dateParts(moment.at, timeZone),
      summary: escapeText(moment.summary),
      replies: [],
      records: moment.sources.map((source) => ({
        ...sourceRecord(source, options),
        id: source.id,
      })),
    };
    const first = native.records[0];
    if (first?.kind === "message") native.source = first.value;
    if (first?.kind === "event") native.calendar = first.value;
    if (first?.kind === "document")
      presentation.documents[moment.id] = first.value;
    if (first?.kind === "link" || first?.kind === "pull-request")
      native.preview = { url: first.value.url, label: first.value.title };
    for (const record of native.records)
      if (record.kind === "pull-request")
        day.pullRequests[record.value.url] = record.value;
    if (moment.parentId)
      presentation.relations.push({
        parentId: moment.parentId,
        childId: moment.id,
      });
    day.moments.push(native);
  }
  day.moments.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  day.date = day.moments[0]?.date || "1970-01-01";
  const used = new Set(),
    groupIds = new Set();
  for (const group of groups) {
    if (
      !group.id ||
      groupIds.has(group.id) ||
      !group.momentIds?.length ||
      typeof group.summary !== "string"
    )
      throw Error("Each group needs a unique ID, members, and summary.");
    groupIds.add(group.id);
    for (const id of group.momentIds) {
      if (!byId.has(id) || used.has(id))
        throw Error(`Unknown or overlapping group member: ${id}`);
      used.add(id);
    }
    if (group.layout && group.layout !== "pair")
      throw Error("Unknown card group layout.");
    const members = day.moments.filter((moment) =>
      group.momentIds.includes(moment.id),
    );
    const sources = members.flatMap((moment) =>
      moment.records.map((record) => ({ record, momentId: moment.id })),
    );
    const selected =
      group.sourceIds === undefined
        ? sources.slice(0, 1)
        : group.sourceIds.map((id) => {
            const source = sources.find((source) => source.record.id === id);
            if (!source)
              throw Error(`Unknown source in group ${group.id}: ${id}`);
            return source;
          });
    const visible = members.every(
      (moment) =>
        !presentation.omissions[moment.id] &&
        (!view.from || moment.date >= view.from) &&
        (!view.to || moment.date <= view.to),
    );
    if (!visible) continue;
    presentation.compact.stories.push({
      ...group,
      embeds: selected.map((source) => ({
        momentId: source.momentId,
        sourceId: source.record.id,
        variant: "compact",
      })),
    });
    if (group.layout === "pair") {
      if (members.length !== 2) throw Error("Pairs need two cards.");
      if (members.some((moment) => moment.records.length !== 1))
        throw Error("Each paired moment must have exactly one source card.");
      const indices = members.map((moment) => day.moments.indexOf(moment));
      if (
        indices.some(
          (index, position) => position && index !== indices[position - 1] + 1,
        )
      )
        throw Error("Only adjacent moments can form a card pair.");
      if (
        members.some(
          (moment) =>
            moments.some((item) => item.parentId === moment.id) ||
            byId.get(moment.id).parentId,
        )
      )
        throw Error("Use threads for connected developments, not card pairs.");
      presentation.detailedGroups.push({
        ...group,
        momentIds: members.map((moment) => moment.id),
        reason: group.reason || "",
      });
    }
  }
  return {
    instanceId,
    media,
    emoji,
    config: { identity: options.identity || {} },
    native: { day, presentation },
    view: {
      active: true,
      mode: view.mode === "highlights" ? "compact" : "detailed",
      dateScope: {
        from: view.from || "0001-01-01",
        to: view.to || "9999-12-31",
      },
    },
  };
}
