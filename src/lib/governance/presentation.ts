import { DEFEATED_STATUSES, PASSED_STATUSES } from "./normalize";
import type { GovernanceProposal, GovernanceProposalStatus } from "./types";

/**
 * Display semantics derived from the domain model. Pure; no JSX.
 */

export type StatusTone = "active" | "positive" | "negative" | "warning" | "neutral";

const STATUS_LABEL: Record<GovernanceProposalStatus, string> = {
  draft: "Draft",
  signing_off: "Signing off",
  voting: "Voting",
  succeeded: "Succeeded",
  defeated: "Defeated",
  executing: "Executing",
  executing_with_errors: "Execution errors",
  completed: "Completed",
  cancelled: "Cancelled",
  vetoed: "Vetoed",
  unknown: "Unknown",
};

const STATUS_TONE: Record<GovernanceProposalStatus, StatusTone> = {
  draft: "neutral",
  signing_off: "neutral",
  voting: "active",
  succeeded: "positive",
  defeated: "negative",
  executing: "positive",
  executing_with_errors: "warning",
  completed: "positive",
  cancelled: "neutral",
  vetoed: "negative",
  unknown: "neutral",
};

export interface StatusDisplay {
  label: string;
  tone: StatusTone;
  /** Extra context, e.g. "Voting period ended — awaiting finalization". */
  hint?: string;
}

export function getStatusDisplay(p: GovernanceProposal): StatusDisplay {
  if (p.status === "voting" && p.awaitingFinalization) {
    return {
      label: "Finalizing",
      tone: "warning",
      hint: "Voting period ended. The vote has not been finalized on-chain yet.",
    };
  }
  if (p.status === "voting" && p.inCoolOff) {
    return {
      label: "Cool-off",
      tone: "active",
      hint: "Cool-off period: only Against and veto votes can still be cast.",
    };
  }
  if (p.status === "succeeded" && p.instructionsCount > p.instructionsExecutedCount) {
    return {
      label: "Succeeded",
      tone: "positive",
      hint: "Vote passed. Attached instructions have not all been executed.",
    };
  }
  return { label: STATUS_LABEL[p.status], tone: STATUS_TONE[p.status] };
}

export type StatusFilter = "all" | "active" | "passed" | "defeated";
export type BodyFilter = "all" | "community" | "council";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "defeated", label: "Defeated" },
];

export const BODY_FILTERS: { value: BodyFilter; label: string }[] = [
  { value: "all", label: "All voters" },
  { value: "community", label: "Community" },
  { value: "council", label: "Council" },
];

export function parseStatusFilter(value: unknown): StatusFilter {
  return STATUS_FILTERS.some((f) => f.value === value) ? (value as StatusFilter) : "all";
}

export function parseBodyFilter(value: unknown): BodyFilter {
  return BODY_FILTERS.some((f) => f.value === value) ? (value as BodyFilter) : "all";
}

export function matchesFilters(
  p: GovernanceProposal,
  status: StatusFilter,
  body: BodyFilter,
): boolean {
  if (body !== "all" && p.governingBody !== body) return false;
  switch (status) {
    case "active":
      return p.isActive;
    case "passed":
      return PASSED_STATUSES.includes(p.status);
    case "defeated":
      return DEFEATED_STATUSES.includes(p.status);
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle

export type LifecycleStepState = "done" | "current" | "upcoming" | "failed";

export interface LifecycleStep {
  key: string;
  label: string;
  state: LifecycleStepState;
  date?: Date;
  note?: string;
}

/**
 * Lifecycle steps supported by SPL Governance semantics. Execution steps are
 * only shown if the proposal has instructions or reached an execution state;
 * a successful vote never implies execution.
 */
export function getLifecycle(p: GovernanceProposal): LifecycleStep[] {
  const steps: LifecycleStep[] = [
    { key: "created", label: "Created", state: "done", date: p.createdAt },
  ];

  if (p.status === "draft" || p.status === "signing_off") {
    steps[0].state = "current";
    steps[0].note = p.status === "signing_off" ? "Awaiting signatories" : "Draft";
    steps.push({ key: "voting", label: "Voting", state: "upcoming" });
    steps.push({ key: "outcome", label: "Outcome", state: "upcoming" });
    return steps;
  }

  if (p.status === "cancelled") {
    if (p.votingStartedAt) {
      steps.push({ key: "voting", label: "Voting", state: "done", date: p.votingStartedAt });
    }
    steps.push({ key: "cancelled", label: "Cancelled", state: "failed", date: p.closedAt });
    return steps;
  }

  if (p.status === "voting") {
    steps.push({
      key: "voting",
      label: p.awaitingFinalization ? "Voting ended" : "Voting",
      state: "current",
      date: p.votingStartedAt,
      note: p.awaitingFinalization ? "Awaiting finalization" : undefined,
    });
    steps.push({ key: "outcome", label: "Outcome", state: "upcoming", date: p.votingEndsAt });
    if (p.instructionsCount > 0) {
      steps.push({ key: "executed", label: "Executed", state: "upcoming" });
    }
    return steps;
  }

  steps.push({ key: "voting", label: "Voting", state: "done", date: p.votingStartedAt });

  if (p.status === "defeated" || p.status === "vetoed") {
    steps.push({
      key: p.status,
      label: p.status === "vetoed" ? "Vetoed" : "Defeated",
      state: "failed",
      date: p.votingCompletedAt,
    });
    return steps;
  }

  if (p.status === "unknown") {
    steps.push({ key: "outcome", label: "Unknown state", state: "current" });
    return steps;
  }

  // succeeded | executing | executing_with_errors | completed
  steps.push({
    key: "succeeded",
    label: "Succeeded",
    state: p.status === "succeeded" ? "current" : "done",
    date: p.votingCompletedAt,
  });

  const hasExecution =
    p.instructionsCount > 0 || p.status === "executing" || p.status === "executing_with_errors";

  if (!hasExecution) {
    if (p.status === "completed") {
      steps.push({ key: "completed", label: "Completed", state: "done", date: p.closedAt });
    }
    return steps;
  }

  const executed = `${p.instructionsExecutedCount}/${p.instructionsCount} instructions`;
  switch (p.status) {
    case "succeeded":
      steps.push({ key: "executed", label: "Executed", state: "upcoming", note: `Not executed (${executed})` });
      break;
    case "executing":
      steps.push({ key: "executing", label: "Executing", state: "current", date: p.executingAt, note: executed });
      break;
    case "executing_with_errors":
      steps.push({ key: "executing", label: "Execution errors", state: "failed", date: p.executingAt, note: executed });
      break;
    case "completed":
      steps.push({ key: "executed", label: "Executed", state: "done", date: p.closedAt ?? p.executingAt, note: executed });
      break;
  }
  return steps;
}

/** Title without a leading "MIP-23:" prefix (the MIP is shown separately). */
export function getDisplayTitle(p: Pick<GovernanceProposal, "name" | "mip">): string {
  if (!p.mip) return p.name;
  const stripped = p.name
    .replace(/^\s*MIP[\s\-.]?\d+(?:\.\d+)?\s*(?:\([^)]*\))?\s*[:\-–—.]?\s*/i, "")
    .trim();
  return stripped || p.name;
}
