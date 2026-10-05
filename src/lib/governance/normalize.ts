import {
  OptionVoteResult,
  ProposalState,
  type Governance,
  type Proposal,
  type ProgramAccount,
} from "@solana/spl-governance";

import { GOVERNING_MINTS, MARINADE_FORUM_URL } from "@/config/marinade";
import { sanitizeForumHtml } from "@/lib/forum/sanitize";
import type {
  GovernanceProposal,
  GovernanceProposalStatus,
  GovernanceProposalVotes,
  GovernanceStats,
  ProposalDescription,
  VoteOption,
} from "./types";

/**
 * Pure functions mapping decoded SPL Governance accounts into the Marinade
 * domain model. No I/O here — everything is unit-testable.
 */

const STATUS_BY_STATE: Record<ProposalState, GovernanceProposalStatus> = {
  [ProposalState.Draft]: "draft",
  [ProposalState.SigningOff]: "signing_off",
  [ProposalState.Voting]: "voting",
  [ProposalState.Succeeded]: "succeeded",
  [ProposalState.Executing]: "executing",
  [ProposalState.Completed]: "completed",
  [ProposalState.Cancelled]: "cancelled",
  [ProposalState.Defeated]: "defeated",
  [ProposalState.ExecutingWithErrors]: "executing_with_errors",
  [ProposalState.Vetoed]: "vetoed",
};

export function normalizeStatus(state: number): GovernanceProposalStatus {
  return STATUS_BY_STATE[state as ProposalState] ?? "unknown";
}

/** Structural stand-in for bn.js (whose types are not a direct dependency). */
type BN = { toString(base?: number): string };

export function bnToBigInt(value: BN | null | undefined): bigint | undefined {
  if (value === null || value === undefined) return undefined;
  return BigInt(value.toString());
}

function bnToDate(value: BN | null | undefined): Date | undefined {
  if (value === null || value === undefined) return undefined;
  const seconds = Number(value.toString());
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
}

const MIP_PATTERN = /\bMIP[\s\-.]?(\d+(?:\.\d+)?)/i;

/** "MIP.8.1: Sunset…" → "MIP-8.1"; "MIP15: …" → "MIP-15". */
export function parseMipIdentifier(name: string): string | undefined {
  const match = MIP_PATTERN.exec(name);
  return match ? `MIP-${match[1]}` : undefined;
}

const FORUM_TOPIC_PATTERN = new RegExp(
  `${MARINADE_FORUM_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/t/(?:[^/\\s"'<>]+/)?(\\d+)`,
  "i",
);

/**
 * Extract a Discourse topic id from a forum URL embedded in text.
 * Only URLs that include the numeric topic id are matched; slug-only URLs are
 * ambiguous and are ignored.
 */
export function extractForumTopicId(text: string): number | undefined {
  const match = FORUM_TOPIC_PATTERN.exec(text);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function classifyDescription(raw: string): ProposalDescription {
  const value = raw.trim();
  if (!value) return { kind: "empty" };
  if (/^https?:\/\/\S+$/i.test(value)) return { kind: "link", url: value };
  if (/<\/?[a-z][^>]*>/i.test(value)) {
    // On-chain HTML is untrusted, exactly like forum HTML.
    return { kind: "html", html: sanitizeForumHtml(value) };
  }
  return { kind: "text", text: value };
}

const YES_LABEL = /^(yes|for|approve)$/i;
const NO_LABEL = /^(no|against|deny|reject)$/i;

const OPTION_RESULT: Record<number, VoteOption["result"]> = {
  [OptionVoteResult.None]: "none",
  [OptionVoteResult.Succeeded]: "succeeded",
  [OptionVoteResult.Defeated]: "defeated",
};

export function normalizeVotes(proposal: Proposal): GovernanceProposalVotes {
  const mint = GOVERNING_MINTS[proposal.governingTokenMint.toBase58()];
  const options: VoteOption[] = proposal.options.map((o) => ({
    label: o.label,
    votes: bnToBigInt(o.voteWeight) ?? 0n,
    result: OPTION_RESULT[o.voteResult] ?? "none",
    instructionsCount: o.instructionsCount,
    instructionsExecutedCount: o.instructionsExecutedCount,
  }));
  const deny = bnToBigInt(proposal.denyVoteWeight);

  let kind: GovernanceProposalVotes["kind"] = "multiple_choice";
  let yes = 0n;
  let no = 0n;
  if (options.length === 1 && deny !== undefined) {
    kind = "yes_no";
    yes = options[0].votes;
    no = deny;
  } else if (
    options.length === 2 &&
    YES_LABEL.test(options[0].label.trim()) &&
    NO_LABEL.test(options[1].label.trim())
  ) {
    kind = "binary_options";
    yes = options[0].votes;
    no = options[1].votes;
  }

  const veto = bnToBigInt(proposal.vetoVoteWeight);
  return {
    decimals: mint?.decimals ?? 0,
    unit: mint?.voteUnit ?? "votes",
    kind,
    yes,
    no,
    abstain: bnToBigInt(proposal.abstainVoteWeight),
    veto: veto && veto > 0n ? veto : undefined,
    options,
    maxVoteWeight: bnToBigInt(proposal.maxVoteWeight),
  };
}

/**
 * Share of For / Against among cast For+Against votes. Returns null when no
 * votes were cast. Uses bigint math (basis points) to avoid precision loss.
 * Deliberately NOT relative to quorum or supply.
 */
export function calculateVoteShare(
  yes: bigint,
  no: bigint,
): { yes: number; no: number } | null {
  const total = yes + no;
  if (total <= 0n) return null;
  const yesBps = (yes * 1_000_000n) / total;
  return {
    yes: Number(yesBps) / 1_000_000,
    no: Number(1_000_000n - yesBps) / 1_000_000,
  };
}

export interface NormalizeContext {
  governance?: Governance;
  now?: Date;
}

export function normalizeProposal(
  account: ProgramAccount<Proposal>,
  { governance, now = new Date() }: NormalizeContext = {},
): GovernanceProposal {
  const p = account.account;
  const mintAddress = p.governingTokenMint.toBase58();
  const status = normalizeStatus(p.state);
  const votingStartedAt = bnToDate(p.votingAt);

  // V1/V2 proposals carry maxVotingTime; V3 uses the governance config.
  const baseVotingSeconds =
    p.maxVotingTime ?? governance?.config.baseVotingTime ?? undefined;
  const coolOffSeconds = governance?.config.votingCoolOffTime ?? 0;
  const votingBaseEndsAt =
    votingStartedAt && baseVotingSeconds !== undefined
      ? new Date(votingStartedAt.getTime() + baseVotingSeconds * 1000)
      : undefined;
  const votingEndsAt = votingBaseEndsAt
    ? new Date(votingBaseEndsAt.getTime() + coolOffSeconds * 1000)
    : undefined;

  const isVoting = status === "voting";
  const timeLeft = votingEndsAt ? votingEndsAt.getTime() - now.getTime() : 1;
  const awaitingFinalization = isVoting && timeLeft <= 0;
  const isActive = isVoting && !awaitingFinalization;
  const inCoolOff =
    isActive &&
    votingBaseEndsAt !== undefined &&
    now.getTime() >= votingBaseEndsAt.getTime();

  const descriptionLink = p.descriptionLink ?? "";
  const options = p.options ?? [];

  return {
    address: account.pubkey.toBase58(),
    name: p.name.trim() || "Untitled proposal",
    mip: parseMipIdentifier(p.name),
    description: classifyDescription(descriptionLink),
    descriptionForumTopicId: extractForumTopicId(descriptionLink),
    governanceAddress: p.governance.toBase58(),
    governingTokenMint: mintAddress,
    governingBody: GOVERNING_MINTS[mintAddress]?.body ?? "unknown",
    tokenOwnerRecord: p.tokenOwnerRecord.toBase58(),
    status,
    awaitingFinalization,
    isActive,
    inCoolOff,
    createdAt: bnToDate(p.draftAt) ?? new Date(0),
    signingOffAt: bnToDate(p.signingOffAt),
    votingStartedAt,
    votingBaseEndsAt,
    votingEndsAt,
    votingCompletedAt: bnToDate(p.votingCompletedAt),
    executingAt: bnToDate(p.executingAt),
    closedAt: bnToDate(p.closedAt),
    votes: normalizeVotes(p),
    instructionsCount: options.reduce((n, o) => n + o.instructionsCount, 0),
    instructionsExecutedCount: options.reduce(
      (n, o) => n + o.instructionsExecutedCount,
      0,
    ),
  };
}

/** Most relevant date for sorting: latest lifecycle event. */
export function proposalSortDate(p: GovernanceProposal): number {
  return (p.votingStartedAt ?? p.signingOffAt ?? p.createdAt).getTime();
}

export function sortProposals(
  proposals: GovernanceProposal[],
): GovernanceProposal[] {
  return [...proposals].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return proposalSortDate(b) - proposalSortDate(a);
  });
}

export const PASSED_STATUSES: GovernanceProposalStatus[] = [
  "succeeded",
  "executing",
  "executing_with_errors",
  "completed",
];

export const DEFEATED_STATUSES: GovernanceProposalStatus[] = [
  "defeated",
  "vetoed",
];

export function computeStats(proposals: GovernanceProposal[]): GovernanceStats {
  const count = (pred: (p: GovernanceProposal) => boolean) =>
    proposals.filter(pred).length;
  return {
    total: proposals.length,
    active: count((p) => p.isActive),
    completed: count((p) => p.status === "completed"),
    passed: count((p) => PASSED_STATUSES.includes(p.status)),
    defeated: count((p) => DEFEATED_STATUSES.includes(p.status)),
    cancelled: count((p) => p.status === "cancelled"),
    community: count((p) => p.governingBody === "community"),
    council: count((p) => p.governingBody === "council"),
  };
}
