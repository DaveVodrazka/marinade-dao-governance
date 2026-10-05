import { Card } from "@/components/ui/card";
import { SourceLabel } from "@/components/ui/source-label";
import type { ForumTopic as Topic } from "@/lib/forum/types";
import { pluralize } from "@/utils/format";
import { ForumAuthorLine } from "./forum-post";

/** The opening forum post — the human description of the proposal. */
export function ForumTopic({ topic }: { topic: Topic }) {
  const first = topic.posts.find((p) => p.number === 1);
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SourceLabel source="forum" />
        <a
          href={topic.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-info hover:underline"
        >
          Open on Marinade Forum ↗
        </a>
      </div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{topic.title}</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <ForumAuthorLine author={first?.author ?? topic.author} date={first?.createdAt ?? topic.createdAt} />
        <p className="text-sm text-muted">
          {pluralize(topic.replyCount, "reply", "replies")}
          {topic.views !== undefined && ` · ${pluralize(topic.views, "view")}`}
        </p>
      </div>
      {first ? (
        // Sanitized in lib/forum/normalize.ts via sanitizeForumHtml.
        <div className="prose-forum mt-5" dangerouslySetInnerHTML={{ __html: first.html }} />
      ) : (
        <p className="mt-5 text-sm text-muted">The opening post is not available.</p>
      )}
    </Card>
  );
}
