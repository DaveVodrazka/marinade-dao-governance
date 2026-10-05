import { MARINADE_FORUM_PROPOSAL_TAG, MARINADE_FORUM_URL } from "@/config/marinade";
import { parseMipIdentifier } from "@/lib/governance/normalize";
import { sanitizeForumHtml } from "./sanitize";
import type {
  DiscoursePost,
  DiscourseTag,
  DiscourseTopic,
  DiscourseTopicListItem,
  DiscourseUser,
  ForumAuthor,
  ForumPost,
  ForumTopic,
  ForumTopicSummary,
} from "./types";

/** Pure mapping from Discourse JSON into forum domain types. */

export function avatarUrl(template: string | undefined, size = 96): string | undefined {
  if (!template) return undefined;
  const url = template.replace("{size}", String(size));
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${MARINADE_FORUM_URL}${url}`;
  return url.startsWith("https://") ? url : undefined;
}

export function topicUrl(slug: string, id: number): string {
  return `${MARINADE_FORUM_URL}/t/${encodeURIComponent(slug)}/${id}`;
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeAuthor(user: DiscourseUser): ForumAuthor {
  return {
    username: user.username,
    name: user.name?.trim() || undefined,
    avatarUrl: avatarUrl(user.avatar_template),
  };
}

function normalizeTags(tags: (string | DiscourseTag)[] | undefined): string[] {
  return (tags ?? [])
    .map((t) => (typeof t === "string" ? t : (t.name ?? t.slug ?? "")))
    .filter(Boolean);
}

/** Regular, visible posts only (excludes moderator actions / whispers / deleted). */
export function isVisiblePost(post: DiscoursePost): boolean {
  return (post.post_type ?? 1) === 1 && !post.hidden && !post.deleted_at && !post.user_deleted;
}

export function normalizeForumPost(post: DiscoursePost): ForumPost {
  return {
    id: post.id,
    number: post.post_number,
    author: normalizeAuthor(post),
    createdAt: parseDate(post.created_at) ?? new Date(0),
    html: sanitizeForumHtml(post.cooked),
  };
}

export function normalizeForumTopic(
  topic: DiscourseTopic,
  extraReplies: DiscoursePost[] = [],
  latestReplyLimit = 5,
): ForumTopic {
  const loaded = topic.post_stream?.posts ?? [];
  const byId = new Map<number, DiscoursePost>();
  for (const p of [...loaded, ...extraReplies]) byId.set(p.id, p);
  const allPosts = [...byId.values()]
    .filter(isVisiblePost)
    .sort((a, b) => a.post_number - b.post_number);

  const posts = allPosts.map(normalizeForumPost);
  const first = posts.find((p) => p.number === 1);
  const replies = posts.filter((p) => p.number !== 1);

  const createdBy = topic.details?.created_by;
  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    url: topicUrl(topic.slug, topic.id),
    createdAt: parseDate(topic.created_at) ?? new Date(0),
    lastPostedAt: parseDate(topic.last_posted_at),
    author: createdBy ? normalizeAuthor(createdBy) : first?.author,
    // Discourse's reply_count counts only direct replies; posts_count - 1 is
    // the number of posts after the opening post.
    replyCount: Math.max(0, (topic.posts_count ?? 1) - 1),
    participantCount: topic.participant_count,
    views: topic.views,
    tags: normalizeTags(topic.tags),
    posts,
    latestReplies: replies.slice(-latestReplyLimit),
  };
}

export function normalizeTopicListItem(item: DiscourseTopicListItem): ForumTopicSummary {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    url: topicUrl(item.slug, item.id),
    createdAt: parseDate(item.created_at) ?? new Date(0),
    lastPostedAt: parseDate(item.last_posted_at),
    replyCount: Math.max(0, (item.posts_count ?? 1) - 1),
    views: item.views,
    tags: normalizeTags(item.tags),
    mip: parseMipIdentifier(item.title),
  };
}

/**
 * A governance-category topic counts as a proposal if it carries the
 * "proposal" tag or its title has a MIP identifier. The tag alone is not
 * applied consistently (e.g. MIP-21 has no "proposal" tag).
 */
export function isProposalTopic(topic: ForumTopicSummary): boolean {
  return Boolean(topic.mip) || topic.tags.includes(MARINADE_FORUM_PROPOSAL_TAG);
}
