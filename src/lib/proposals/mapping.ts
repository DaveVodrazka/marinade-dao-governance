import type { GovernanceProposal } from "@/lib/governance/types";

/**
 * On-chain proposal → Marinade forum topic mapping.
 *
 * TEMPORARY: there is no machine-readable link between SPL Governance
 * proposals and Discourse topics. Resolution order:
 *
 *   1. PROPOSAL_FORUM_MAPPING below (explicit, reviewed by hand)
 *   2. A forum URL containing a topic id in the proposal's on-chain
 *      `descriptionLink` (many MIPs link their forum thread)
 *
 * Fuzzy title matching is intentionally NOT used: e.g. the vetoed proposal
 * 7pYWFt…1Zj is titled "MIP-23: VSR program security…" but is unrelated to
 * the real MIP-23 forum topic (1998). A wrong link is worse than no link.
 *
 * To replace this later (metadata in the description, a registry account, an
 * API…), implement another ForumTopicResolver and add it to RESOLVERS.
 */

/** Key: on-chain proposal address. Value: Discourse topic id. */
export const PROPOSAL_FORUM_MAPPING: Record<string, number> = {
  // MIP-23: Full validator coverage of PSR downtime
  Gd5CfxVQ1UYm4wToL5SVb9QhmCtcBTHo73QDnGMAmu6S: 1998,
  // MIP-21 and MIP-21 (bis): Exchange mSOL from the DAO Treasury
  A3KUu6EyxhnKz2hB9HjPFUrGq799LzdRmzJ3J5ojyLnR: 1975,
  BcmsguyRHNmTQA3mft7zSTA5ZP8X1JsDq5E1CqYGUsWV: 1975,
  // MIP-19: Improving SAM
  "8qRGNyKdY9RbqtoHPRqdvg6tHLfYHu2PP2XJ7A1S2Zi6": 1969,
  // MIP-18: Marinade Fee Structure Revamp
  "5eKktJzpFV7kT6LBKVgoDzy7uRbfsnbzArT5VKNj87Q7": 1967,
  "4hxuCstGD4C6S5vtZPHykWon7htgRrWeN1TVMXbmxoqw": 1967,
  // MIP-17: Refocusing from Buybacks to Building Liquidity
  "6eWV5RivNvNsB6sCcZuRmySR6R9NM5Ua3mrcQsYioEzz": 1960,
  "78a7pr2XkrNqpa1f78xdHwSRFSCSSb7LCQLdUxtDCH3j": 1960,
  // MIP-16: Deploying DAO Assets into MNDE/mSOL Liquidity
  EpmG66TYFhSs9hBktoydK4w3L79i8oYVEUd28hPXLpoM: 1959,
  EuMsDJVhKnrdmpmnirT4uaWr3wJt69ecmcKnaNi9EZjK: 1959,
  "36HM4f9Hc818w7KPY5erTqdcjASeCEzk1pKdTwHgdL3e": 1959,
  // MIP-12: Migrate Campaign
  J13YPM2NQkrqCCrkg6WgQ4978Ln7YYusALAYb3B4bmx9: 1876,
  // MIP-8: Sunset of Delayed Unstake to Tickets
  Gz2MWMe3xsCEUZNSKMLezJvp7AsWJ3nzAVwYb8F4uUch: 1710,
  // MIP-7: Marinade Earn Season 4 (vote + transfer)
  Aov1f2YX2Trg2H41u3L1mqTy7N3ALDJXp3yLhWqSTCQd: 1709,
  "2ZUPFu3dBwhp8mcL6FC4YMcFRG2CUbiA4J4GNHJ2nEKQ": 1709,
  // MIP-6: Growth & Awareness budget (vote + transfer)
  "9csGBTU6YLgEbNMxv3Cb2FESjvd9JK9ssQTmhndg8gSZ": 1701,
  Dj48aUhQWNBoZtQb5iuUYLtZA7UZmKcQEQd5HyWpkiN9: 1701,
  // MIP-5: SAM Bid Routing To MNDE Stakers
  HSrDnCScugRYJ1cRLUa1rTxepeoNKDgdrduAsSYmrFhS: 1700,
  // MIP-4: Fund R&D (vote + transfer)
  AeszxcMW441Pc6ZS2T7VsXB81DLdrr7aUH3ErBjR52BF: 1696,
  AaLBrvLCCjN832ySn4FsN72vvFHyWvccf656u7qgCZ4c: 1696,
};

export type ForumLinkSource = "mapping" | "description";

export interface ForumLink {
  topicId: number;
  source: ForumLinkSource;
}

type ForumTopicResolver = (
  proposal: Pick<GovernanceProposal, "address" | "descriptionForumTopicId">,
) => ForumLink | undefined;

const explicitMappingResolver: ForumTopicResolver = (p) => {
  const topicId = PROPOSAL_FORUM_MAPPING[p.address];
  return topicId ? { topicId, source: "mapping" } : undefined;
};

const descriptionLinkResolver: ForumTopicResolver = (p) =>
  p.descriptionForumTopicId
    ? { topicId: p.descriptionForumTopicId, source: "description" }
    : undefined;

const RESOLVERS: ForumTopicResolver[] = [
  explicitMappingResolver,
  descriptionLinkResolver,
];

export function resolveForumLink(
  proposal: Pick<GovernanceProposal, "address" | "descriptionForumTopicId">,
): ForumLink | undefined {
  for (const resolve of RESOLVERS) {
    const link = resolve(proposal);
    if (link) return link;
  }
  return undefined;
}
