import type { GoverningBody } from "@/config/marinade";

/**
 * Marinade-oriented domain model for on-chain governance.
 *
 * Components consume these types only — never raw SPL Governance accounts.
 * All vote weights are kept as `bigint` in base units (mint decimals are
 * carried alongside) and formatted at the UI boundary.
 */

export type GovernanceProposalStatus =
  | "draft"
  | "signing_off"
  | "voting"
  | "succeeded"
  | "defeated"
  | "executing"
  | "executing_with_errors"
  | "completed"
  | "cancelled"
  | "vetoed"
  | "unknown";

export interface VoteOption {
  label: string;
  votes: bigint;
  /** On-chain option result; "none" while voting. */
  result: "none" | "succeeded" | "defeated";
  instructionsCount: number;
  instructionsExecutedCount: number;
}

export interface GovernanceProposalVotes {
  /** Decimals of the governing mint, for formatting. */
  decimals: number;
  unit: string;
  /**
   * "yes_no": single option + deny (classic Approve/Deny).
   * "binary_options": two options labelled Yes/No, no deny vote.
   * "multiple_choice": anything else; only per-option totals are meaningful.
   */
  kind: "yes_no" | "binary_options" | "multiple_choice";
  /** For / Against when `kind` is not "multiple_choice". */
  yes: bigint;
  no: bigint;
  abstain?: bigint;
  /** Council veto weight (in the veto mint's units). */
  veto?: bigint;
  options: VoteOption[];
  /** Snapshot of max vote weight recorded when voting finished, if any. */
  maxVoteWeight?: bigint;
}

export interface GovernanceInstructionAccount {
  address: string;
  writable: boolean;
  signer: boolean;
  /** Label for well-known accounts, if any. */
  label?: string;
}

export interface DecodedInstruction {
  type: string;
  programName?: string;
  summary?: string;
  fields?: Record<string, string>;
}

export type InstructionExecutionStatus = "not_executed" | "success" | "error";

export interface GovernanceInstruction {
  /** Position within the proposal (0-based, across all transactions). */
  index: number;
  /** Address of the ProposalTransaction account holding this instruction. */
  transactionAddress: string;
  optionIndex: number;
  transactionIndex: number;
  /** Position inside its ProposalTransaction. */
  instructionIndex: number;
  programId: string;
  programName?: string;
  accounts: GovernanceInstructionAccount[];
  /** Raw instruction data, base64. */
  data: string;
  /** Raw instruction data, hex. */
  dataHex: string;
  decoded?: DecodedInstruction;
  executionStatus: InstructionExecutionStatus;
  executedAt?: Date;
  /** Seconds the transaction must wait after voting succeeds. */
  holdUpTimeSeconds: number;
}

export type ProposalDescription =
  | { kind: "empty" }
  | { kind: "link"; url: string }
  | { kind: "html"; html: string }
  | { kind: "text"; text: string };

export interface GovernanceProposal {
  address: string;
  name: string;
  /** MIP identifier parsed from the name, e.g. "MIP-23". */
  mip?: string;
  /** On-chain `descriptionLink` field, classified. */
  description: ProposalDescription;
  /** Forum topic referenced from the on-chain description, if any. */
  descriptionForumTopicId?: number;
  governanceAddress: string;
  governingTokenMint: string;
  governingBody: GoverningBody | "unknown";
  /** Token owner record (proposal owner) account. */
  tokenOwnerRecord: string;
  /** Wallet that owns the proposal's token owner record. Detail view only. */
  creatorWallet?: string;

  status: GovernanceProposalStatus;
  /** Status is "voting" on-chain but the voting window has passed. */
  awaitingFinalization: boolean;
  /** Status is "voting" and the base voting window has not ended. */
  isActive: boolean;
  /** True when in the cool-off phase (only deny/veto votes allowed). */
  inCoolOff: boolean;

  createdAt: Date;
  signingOffAt?: Date;
  votingStartedAt?: Date;
  /** Base voting time end (yes votes allowed until here). */
  votingBaseEndsAt?: Date;
  /** Base voting time + cool-off: max time for the vote to be finalized. */
  votingEndsAt?: Date;
  votingCompletedAt?: Date;
  executingAt?: Date;
  closedAt?: Date;

  votes: GovernanceProposalVotes;
  instructionsCount: number;
  instructionsExecutedCount: number;
  /** Populated in detail views only. */
  instructions?: GovernanceInstruction[];
}

export interface GovernanceStats {
  total: number;
  active: number;
  completed: number;
  passed: number;
  defeated: number;
  cancelled: number;
  community: number;
  council: number;
}
