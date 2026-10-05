import { Card } from "@/components/ui/card";
import { SourceLabel } from "@/components/ui/source-label";
import type { ForumTopic } from "@/lib/forum/types";
import { pluralize } from "@/utils/format";
import { ForumPost } from "./forum-post";

/** Discussion preview: reply counts plus the latest replies. */
export function ForumSummary({ topic }: { topic: ForumTopic }) {
  const participants = topic.participantCount;
  return (
    <Card className="p-5 sm:p-7">
      <SourceLabel source="forum" />
      <h2 className="mt-3 text-xl font-semibold tracking-tight">Discussion</h2>
      <p className="mt-1 text-sm text-muted">
        {pluralize(topic.replyCount, "reply", "replies")}
        {participants !== undefined && ` · ${pluralize(participants, "participant")}`}
      </p>

      {topic.latestReplies.length > 0 ? (
        <div className="mt-2 divide-y divide-line">
          {topic.latestReplies.length < topic.replyCount && (
            <p className="pt-4 text-xs font-medium uppercase tracking-wider text-subtle">
              Latest {topic.latestReplies.length} replies
            </p>
          )}
          {topic.latestReplies.map((post) => (
            <ForumPost key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No replies yet.</p>
      )}

      <a
        href={topic.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-line-strong"
      >
        View full discussion on Marinade Forum ↗
      </a>
    </Card>
  );
}
