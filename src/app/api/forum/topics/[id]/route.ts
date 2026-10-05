import { NextResponse } from "next/server";

import { ForumError, getForumTopic } from "@/lib/forum/client";

/**
 * GET /api/forum/topics/{id} — normalized, sanitized Marinade forum topic.
 * Server-side proxy so clients never talk to Discourse directly.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/forum/topics/[id]">) {
  const { id } = await ctx.params;
  const topicId = Number(id);
  if (!Number.isSafeInteger(topicId) || topicId <= 0) {
    return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
  }
  try {
    const topic = await getForumTopic(topicId);
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json(topic, {
      headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    const status = error instanceof ForumError ? 502 : 500;
    return NextResponse.json({ error: "Forum unavailable" }, { status });
  }
}
