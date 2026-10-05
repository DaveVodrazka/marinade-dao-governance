/**
 * Raw Discourse JSON shapes (only fields we use) and normalized forum domain
 * types. Components consume ForumTopic / ForumPost only.
 */

// ---- Raw Discourse --------------------------------------------------------

export interface DiscourseUser {
  id?: number;
  username: string;
  name?: string | null;
  avatar_template?: string;
}

export interface DiscoursePost {
  id: number;
  post_number: number;
  username: string;
  name?: string | null;
  avatar_template?: string;
  created_at: string;
  cooked: string;
  post_type?: number;
  hidden?: boolean;
  user_deleted?: boolean;
  deleted_at?: string | null;
}

export interface DiscourseTag {
  name?: string;
  slug?: string;
}

export interface DiscourseTopic {
  id: number;
  slug: string;
  title: string;
  fancy_title?: string;
  created_at: string;
  last_posted_at?: string | null;
  posts_count: number;
  reply_count?: number;
  views?: number;
  participant_count?: number;
  category_id?: number;
  /** Strings on older Discourse, objects on newer. */
  tags?: (string | DiscourseTag)[];
  post_stream?: { posts: DiscoursePost[]; stream?: number[] };
  details?: {
    created_by?: DiscourseUser;
    participants?: DiscourseUser[];
  };
}

/** Item of /c/{slug}/{id}.json topic_list.topics */
export interface DiscourseTopicListItem {
  id: number;
  slug: string;
  title: string;
  created_at: string;
  last_posted_at?: string | null;
  posts_count: number;
  views?: number;
  category_id?: number;
  tags?: (string | DiscourseTag)[];
  pinned?: boolean;
}

export interface DiscourseCategoryResponse {
  topic_list: {
    topics: DiscourseTopicListItem[];
    more_topics_url?: string;
  };
}

// ---- Domain ---------------------------------------------------------------

export interface ForumAuthor {
  username: string;
  name?: string;
  avatarUrl?: string;
}

export interface ForumPost {
  id: number;
  number: number;
  author: ForumAuthor;
  createdAt: Date;
  /** Sanitized HTML, safe to render. */
  html: string;
}

export interface ForumTopic {
  id: number;
  slug: string;
  title: string;
  url: string;
  createdAt: Date;
  lastPostedAt?: Date;
  author?: ForumAuthor;
  /** Posts after the first one. */
  replyCount: number;
  participantCount?: number;
  views?: number;
  tags: string[];
  /** The opening post plus loaded replies (sanitized). */
  posts: ForumPost[];
  /** Most recent replies (sanitized), newest last. */
  latestReplies: ForumPost[];
}

/** Lightweight topic info from category listings (no post bodies). */
export interface ForumTopicSummary {
  id: number;
  slug: string;
  title: string;
  url: string;
  createdAt: Date;
  lastPostedAt?: Date;
  replyCount: number;
  views?: number;
  tags: string[];
  mip?: string;
}
