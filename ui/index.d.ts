/** Display data, not your storage schema. Keep original evidence separately. */
export interface Person {
  name: string;
  avatar?: string;
  id?: string;
  handle?: string;
  verified?: boolean;
}
export interface TextPart {
  text: string;
  style?: "bold" | "italic" | "code" | "codeblock";
  url?: string;
}
export interface Attachment {
  id: string;
  kind: "image" | "video" | "file";
  name: string;
  alt?: string;
  /** Original source link; cached bytes are supplied through the media map. */
  url?: string;
}
interface SourceBase {
  /** Stable, provider-qualified ID. */
  id: string;
  url: string;
  text?: string;
  /** Formatted original text. When supplied, replaces text in the display. */
  parts?: TextPart[];
  attachments?: Attachment[];
}
export interface MessageSource extends SourceBase {
  type: "slack" | "post";
  author: Person;
  at?: string;
  context?: string;
  reactions?: { label: string; count: number; image?: string }[];
  thread?: { replyCount: number; participants?: Person[] };
  metrics?: Partial<
    Record<"likes" | "reposts" | "replies" | "views" | "bookmarks", number>
  >;
}
export interface PullRequestSource extends SourceBase {
  type: "pull-request";
  title: string;
  repository: string;
  number: number;
  state: "open" | "merged" | "closed" | "draft";
  author?: Person;
  /** Original HTML, rendered through an allowlist. Resolve media to cached URLs. */
  descriptionHtml?: string;
  changedFiles?: number;
  additions?: number;
  deletions?: number;
}
export interface DocumentSource extends SourceBase {
  type: "document";
  title: string;
  provider?: string;
  excerpt?: boolean;
}
export interface EventSource extends SourceBase {
  type: "event";
  title: string;
  start: string;
  end?: string;
  /** A factual scheduling/RSVP label, not inferred attendance. */
  status?: string;
}
export interface LinkSource extends SourceBase {
  type: "link";
  title: string;
}
export type Source =
  | MessageSource
  | PullRequestSource
  | DocumentSource
  | EventSource
  | LinkSource;
export interface Moment {
  id: string;
  /** ISO timestamp with Z or a numeric offset. */
  at: string;
  /** Plain-text editorial summary; never executable HTML. */
  summary: string;
  sources: Source[];
  /** An evidence-backed connection to an earlier moment. */
  parentId?: string;
}
export interface Group {
  id: string;
  summary: string;
  /** Disjoint group membership. Unknown/overlapping IDs are rejected. */
  momentIds: string[];
  /** Representative sources from these moments. Omit to use the first, [] for none. */
  sourceIds?: string[];
  /** Detailed view only: two or three adjacent independent moments, one source each. */
  layout?: "pair" | "stack";
  reason?: string;
}
/** Agent-authored rendering state. The viewer does not render mode/date controls. */
export interface View {
  mode?: "detailed" | "highlights";
  /** Inclusive YYYY-MM-DD bounds, interpreted in timeZone. */
  from?: string;
  to?: string;
  omitted?: string[];
}
export interface CardOptions {
  timeZone?: string;
  media?: Record<string, { src: string; poster?: string }>;
  emoji?: Record<string, string>;
  compact?: boolean;
}
export interface TimelineOptions extends Omit<CardOptions, "compact"> {
  moments: Moment[];
  groups?: Group[];
  view?: View;
  embeds?: Record<
    string,
    {
      variant: "full" | "compact" | "none";
      collapsedHeight?: number;
      reason?: string;
    }
  >;
  /** Optional account identity used to avoid repeating your name on PR cards. */
  identity?: { github?: string };
}
export interface Timeline {
  /** Replaces supplied top-level fields; pass a full view or media map. */
  update(patch: Partial<TimelineOptions>): void;
  destroy(): void;
}
export function createTimeline(
  container: HTMLElement,
  options: TimelineOptions,
): Timeline;
export type DisposableElement = HTMLElement & { dispose(): void };
export function createCard(
  source: Source,
  options?: CardOptions,
): DisposableElement;
export function createPullRequestChip(source: PullRequestSource): HTMLElement;
/** Original split pair (two cards) or gesture stack (three cards). */
export function createStack(nodes: HTMLElement[]): DisposableElement;
