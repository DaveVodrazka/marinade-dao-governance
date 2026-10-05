import "server-only";

import { cache } from "react";

import { getForumTopic, getMarinadeForumProposals } from "@/lib/forum/client";
import type { ForumTopic, ForumTopicSummary } from "@/lib/forum/types";
import {
  getMarinadeProposal,
  getMarinadeProposals,
} from "@/lib/governance/proposals";
import type { GovernanceProposal } from "@/lib/governance/types";
import { devWarn } from "@/lib/log";
import { resolveForumLink, type ForumLink } from "./mapping";

/**
 * Combines on-chain governance (source of truth for state and votes) with
 * Marinade forum discussions. Forum failures never fail the combined result.
 */

export type ForumState =
  | { status: "linked"; link: ForumLink; topic: ForumTopic }
  | { status: "not_linked" }
  | { status: "not_found"; link: ForumLink }
  | { status: "unavailable"; link: ForumLink };

export interface MarinadeProposal {
  governance: GovernanceProposal;
  forum: ForumState;
}

export interface MarinadeProposalSummary {
  governance: GovernanceProposal;
  forumLink?: ForumLink;
  /** Present when the linked topic appeared in the forum proposal listing. */
  forumTopic?: ForumTopicSummary;
}

export interface MarinadeProposalList {
  proposals: MarinadeProposalSummary[];
  /** False when forum listing could not be loaded (counts are then omitted). */
  forumAvailable: boolean;
}

const loadForumTopicState = cache(
  async (topicId: number, source: ForumLink["source"]): Promise<ForumState> => {
    const link: ForumLink = { topicId, source };
    try {
      const topic = await getForumTopic(topicId);
      return topic ? { status: "linked", link, topic } : { status: "not_found", link };
    } catch (error) {
      devWarn("forum", `topic ${topicId} unavailable`, error);
      return { status: "unavailable", link };
    }
  },
);

async function loadForumState(link: ForumLink | undefined): Promise<ForumState> {
  if (!link) return { status: "not_linked" };
  return loadForumTopicState(link.topicId, link.source);
}

/** Forum side of a proposal; deduplicated per request. Never throws. */
export function getProposalForumState(proposal: GovernanceProposal): Promise<ForumState> {
  return loadForumState(resolveForumLink(proposal));
}

export async function getMarinadeProposalDetails(
  proposalAddress: string,
): Promise<MarinadeProposal | null> {
  const governance = await getMarinadeProposal(proposalAddress);
  if (!governance) return null;
  const forum = await loadForumState(resolveForumLink(governance));
  return { governance, forum };
}

export async function getMarinadeProposalList(): Promise<MarinadeProposalList> {
  const [proposals, forumTopics] = await Promise.all([
    getMarinadeProposals(),
    getMarinadeForumProposals().catch((error) => {
      devWarn("forum", "forum proposal listing unavailable", error);
      return null;
    }),
  ]);
  const topicsById = new Map((forumTopics ?? []).map((t) => [t.id, t]));
  return {
    forumAvailable: forumTopics !== null,
    proposals: proposals.map((governance) => {
      const forumLink = resolveForumLink(governance);
      return {
        governance,
        forumLink,
        forumTopic: forumLink ? topicsById.get(forumLink.topicId) : undefined,
      };
    }),
  };
}
