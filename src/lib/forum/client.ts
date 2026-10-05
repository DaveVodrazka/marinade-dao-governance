import "server-only";

import {
  MARINADE_FORUM_GOVERNANCE_CATEGORY,
  MARINADE_FORUM_URL,
  REVALIDATE,
} from "@/config/marinade";
import { devLog } from "@/lib/log";
import {
  isProposalTopic,
  isVisiblePost,
  normalizeForumTopic,
  normalizeTopicListItem,
} from "./normalize";
import type {
  DiscourseCategoryResponse,
  DiscoursePost,
  DiscourseTopic,
  DiscourseTopicListItem,
  ForumTopic,
  ForumTopicSummary,
} from "./types";

/**
 * Server-side Discourse client. Uses only structured JSON endpoints:
 *   GET /t/{id}.json                         topic + first ~20 posts
 *   GET /t/{id}/posts.json?post_ids[]=…      specific posts (latest replies)
 *   GET /c/{slug}/{id}.json?page=N           governance category listing
 *   GET /search.json?q=MIP in:title          MIP topics in any category
 */

export class ForumError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ForumError";
  }
}

const REPLY_PREVIEW_LIMIT = 5;
const MAX_CATEGORY_PAGES = 6;

async function forumGet<T>(path: string, revalidate: number): Promise<T | null> {
  const url = `${MARINADE_FORUM_URL}${path}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate, tags: ["forum"] },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new ForumError(`Forum unreachable: ${(error as Error).message}`);
  }
  devLog("forum", `GET ${path} ${res.status} ${Date.now() - started}ms`);
  if (res.status === 404) return null;
  if (!res.ok) throw new ForumError(`Forum responded ${res.status}`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ForumError("Forum returned malformed JSON");
  }
}

function isValidTopicId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

/** Topic with sanitized posts and the latest replies. Null when not found. */
export async function getForumTopic(id: number): Promise<ForumTopic | null> {
  if (!isValidTopicId(id)) return null;
  const topic = await forumGet<DiscourseTopic>(`/t/${id}.json`, REVALIDATE.forumTopic);
  if (!topic || typeof topic.id !== "number") return null;

  // The topic payload only includes the first ~20 posts; fetch the tail of
  // the stream so the preview shows the most recent replies.
  const stream = topic.post_stream?.stream ?? [];
  const loaded = new Set((topic.post_stream?.posts ?? []).map((p) => p.id));
  const tailIds = stream.slice(-REPLY_PREVIEW_LIMIT).filter((pid) => !loaded.has(pid));
  let extra: DiscoursePost[] = [];
  if (tailIds.length > 0) {
    const query = tailIds.map((pid) => `post_ids[]=${pid}`).join("&");
    try {
      const res = await forumGet<{ post_stream?: { posts: DiscoursePost[] } }>(
        `/t/${id}/posts.json?${query}`,
        REVALIDATE.forumTopic,
      );
      extra = (res?.post_stream?.posts ?? []).filter(isVisiblePost);
    } catch {
      // Latest replies are a nice-to-have; the loaded posts still render.
    }
  }
  return normalizeForumTopic(topic, extra, REPLY_PREVIEW_LIMIT);
}

/** All topics in the Governance category (paginated). */
export async function getGovernanceCategoryTopics(): Promise<ForumTopicSummary[]> {
  const { slug, id } = MARINADE_FORUM_GOVERNANCE_CATEGORY;
  const topics: ForumTopicSummary[] = [];
  for (let page = 0; page < MAX_CATEGORY_PAGES; page++) {
    const res = await forumGet<DiscourseCategoryResponse>(
      `/c/${slug}/${id}.json?page=${page}`,
      REVALIDATE.forumList,
    );
    const items = res?.topic_list?.topics ?? [];
    topics.push(...items.map(normalizeTopicListItem));
    if (!res?.topic_list?.more_topics_url || items.length === 0) break;
  }
  return topics;
}

interface DiscourseSearchResponse {
  topics?: DiscourseTopicListItem[];
  grouped_search_result?: { more_full_page_results?: boolean | null };
}

/**
 * MIP topics are not confined to the Governance category (several live in
 * General, Tokenomics, Grants or Uncategorized), so title search is needed.
 */
export async function searchMipTopics(): Promise<ForumTopicSummary[]> {
  const topics: ForumTopicSummary[] = [];
  for (let page = 1; page <= 3; page++) {
    const q = encodeURIComponent("MIP in:title order:latest");
    const res = await forumGet<DiscourseSearchResponse>(
      `/search.json?q=${q}&page=${page}`,
      REVALIDATE.forumList,
    );
    const items = res?.topics ?? [];
    topics.push(...items.map(normalizeTopicListItem));
    if (!res?.grouped_search_result?.more_full_page_results || items.length === 0) {
      break;
    }
  }
  return topics;
}

/**
 * Marinade proposal topics: union of MIP title search and proposal topics in
 * the Governance category, de-duplicated, newest first. Category lookup is
 * best-effort if search succeeds, and vice versa.
 */
export async function getMarinadeForumProposals(): Promise<ForumTopicSummary[]> {
  const [search, category] = await Promise.allSettled([
    searchMipTopics(),
    getGovernanceCategoryTopics(),
  ]);
  if (search.status === "rejected" && category.status === "rejected") {
    throw search.reason;
  }
  const byId = new Map<number, ForumTopicSummary>();
  for (const result of [search, category]) {
    if (result.status !== "fulfilled") continue;
    for (const topic of result.value) {
      if (isProposalTopic(topic)) byId.set(topic.id, topic);
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
