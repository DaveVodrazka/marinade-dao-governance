/* eslint-disable @next/next/no-img-element */
import type { ForumAuthor, ForumPost as Post } from "@/lib/forum/types";
import { formatDate, formatRelativeTime } from "@/utils/dates";

export function ForumAuthorLine({ author, date }: { author?: ForumAuthor; date: Date }) {
  return (
    <div className="flex items-center gap-3">
      {author?.avatarUrl ? (
        <img
          src={author.avatarUrl}
          alt=""
          width={36}
          height={36}
          referrerPolicy="no-referrer"
          className="size-9 rounded-full bg-surface-2"
        />
      ) : (
        <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
          {author?.username.slice(0, 1).toUpperCase() ?? "?"}
        </span>
      )}
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">
          {author?.name ?? author?.username ?? "Unknown author"}
          {author?.name && author.name !== author.username && (
            <span className="ml-1.5 font-normal text-muted">@{author.username}</span>
          )}
        </p>
        <p className="text-muted" title={formatDate(date)}>
          {formatDate(date, { time: false })} · {formatRelativeTime(date)}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders a forum post. `post.html` was sanitized server-side by
 * sanitizeForumHtml (allow-list) during normalization.
 */
export function ForumPost({ post }: { post: Post }) {
  return (
    <article className="py-5">
      <ForumAuthorLine author={post.author} date={post.createdAt} />
      <div className="prose-forum mt-3" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
