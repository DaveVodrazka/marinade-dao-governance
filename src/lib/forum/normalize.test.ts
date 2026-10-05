import { describe, expect, it } from "vitest";

import { isProposalTopic, normalizeForumTopic, normalizeTopicListItem } from "./normalize";
import type { DiscourseTopic } from "./types";

const topic: DiscourseTopic = {
  id: 1998,
  slug: "mip-23-full-validator-coverage-of-psr-downtime",
  title: "MIP-23: Full Validator Coverage of PSR Downtime",
  created_at: "2026-08-14T13:20:20.912Z",
  last_posted_at: "2026-08-15T10:00:00.000Z",
  posts_count: 3,
  reply_count: 0,
  views: 72,
  participant_count: 2,
  tags: [{ id: 7, name: "proposal", slug: "proposal" } as never],
  details: { created_by: { username: "chalda", name: "chalda", avatar_template: "/user_avatar/forum.marinade.finance/chalda/{size}/400_2.png" } },
  post_stream: {
    stream: [1, 2, 3],
    posts: [
      { id: 1, post_number: 1, username: "chalda", created_at: "2026-08-14T13:20:20.987Z", cooked: '<p>Hello <a href="/t/x/1">link</a></p><script>alert(1)</script><img src="x" onerror="alert(1)">' },
      { id: 2, post_number: 2, username: "bob", created_at: "2026-08-15T09:00:00.000Z", cooked: '<p><a href="javascript:alert(1)">bad</a></p>' },
      { id: 3, post_number: 3, username: "system", created_at: "2026-08-15T10:00:00.000Z", cooked: "<p>closed</p>", post_type: 3 },
    ],
  },
};

describe("normalizeForumTopic", () => {
  const t = normalizeForumTopic(topic);

  it("maps topic metadata", () => {
    expect(t).toMatchObject({
      id: 1998,
      url: "https://forum.marinade.finance/t/mip-23-full-validator-coverage-of-psr-downtime/1998",
      replyCount: 2,
      views: 72,
      tags: ["proposal"],
    });
    expect(t.createdAt.toISOString()).toBe("2026-08-14T13:20:20.912Z");
    expect(t.author?.avatarUrl).toBe("https://forum.marinade.finance/user_avatar/forum.marinade.finance/chalda/96/400_2.png");
  });

  it("drops non-regular posts (moderator actions)", () => {
    expect(t.posts.map((p) => p.number)).toEqual([1, 2]);
    expect(t.latestReplies.map((p) => p.number)).toEqual([2]);
  });

  it("sanitizes cooked HTML", () => {
    const first = t.posts[0].html;
    expect(first).not.toContain("<script");
    expect(first).not.toContain("onerror");
    expect(first).toContain('href="https://forum.marinade.finance/t/x/1"');
    expect(first).toContain('target="_blank"');
    expect(first).toContain('rel="noopener noreferrer nofollow ugc"');
    expect(t.posts[1].html).not.toContain("javascript:");
  });
});

describe("proposal topic detection", () => {
  it("accepts MIP titles or the proposal tag", () => {
    const base = { id: 1, slug: "s", created_at: "2026-01-01T00:00:00Z", posts_count: 1 };
    expect(isProposalTopic(normalizeTopicListItem({ ...base, title: "MIP-21 - Exchange mSOL", tags: [] }))).toBe(true);
    expect(isProposalTopic(normalizeTopicListItem({ ...base, title: "Delegation", tags: ["proposal"] }))).toBe(true);
    expect(isProposalTopic(normalizeTopicListItem({ ...base, title: "Welcome", tags: [] }))).toBe(false);
  });
});
