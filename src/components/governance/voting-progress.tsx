import { calculateVoteShare } from "@/lib/governance/normalize";
import type { GovernanceProposalVotes } from "@/lib/governance/types";
import { formatPercentage, formatTokenAmount } from "@/utils/format";

/**
 * For / Against bar. Percentages are shares of For+Against votes cast — not
 * of quorum or supply.
 */
export function VoteBar({ votes, compact = false }: { votes: GovernanceProposalVotes; compact?: boolean }) {
  const share = calculateVoteShare(votes.yes, votes.no);
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-surface-2 ${compact ? "h-1.5" : "h-2.5"}`}
      role="img"
      aria-label={
        share
          ? `${formatPercentage(share.yes)} for, ${formatPercentage(share.no)} against`
          : "No votes cast"
      }
    >
      {share && (
        <>
          <div className="h-full bg-for" style={{ width: `${share.yes * 100}%` }} />
          <div className="h-full bg-against" style={{ width: `${share.no * 100}%` }} />
        </>
      )}
    </div>
  );
}

/** Compact For/Against summary for cards and rows. */
export function VoteSummary({ votes }: { votes: GovernanceProposalVotes }) {
  if (votes.kind === "multiple_choice") {
    return <p className="text-sm text-muted">{votes.options.length} options</p>;
  }
  const share = calculateVoteShare(votes.yes, votes.no);
  if (!share) return <p className="text-sm text-muted">No votes cast</p>;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm tabular-nums">
        <span className="font-medium text-for">{formatPercentage(share.yes)} For</span>
        <span className="font-medium text-against">{formatPercentage(share.no)} Against</span>
      </div>
      <VoteBar votes={votes} compact />
    </div>
  );
}

function Tally({
  label,
  amount,
  share,
  votes,
  tone,
}: {
  label: string;
  amount: bigint;
  share?: number;
  votes: GovernanceProposalVotes;
  tone: "for" | "against" | "neutral";
}) {
  const color = tone === "for" ? "text-for" : tone === "against" ? "text-against" : "text-fg";
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {share !== undefined ? formatPercentage(share) : "–"}
      </p>
      <p
        className="text-sm tabular-nums text-muted"
        title={`${formatTokenAmount(amount, votes.decimals, { compact: false })} ${votes.unit}`}
      >
        {formatTokenAmount(amount, votes.decimals)} {votes.unit}
      </p>
    </div>
  );
}

/** Full vote panel for the proposal page. */
export function VotingProgress({ votes }: { votes: GovernanceProposalVotes }) {
  if (votes.kind === "multiple_choice") {
    const total = votes.options.reduce((n, o) => n + o.votes, 0n);
    return (
      <div className="space-y-3">
        {votes.options.map((o) => {
          const share = total > 0n ? Number((o.votes * 10_000n) / total) / 10_000 : undefined;
          return (
            <div key={o.label}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-medium">{o.label}</span>
                <span className="tabular-nums text-muted">
                  {formatTokenAmount(o.votes, votes.decimals)} {votes.unit}
                  {share !== undefined && ` · ${formatPercentage(share)}`}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-accent" style={{ width: `${(share ?? 0) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const share = calculateVoteShare(votes.yes, votes.no);
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Tally label="For" amount={votes.yes} share={share?.yes} votes={votes} tone="for" />
        <div className="text-right">
          <Tally label="Against" amount={votes.no} share={share?.no} votes={votes} tone="against" />
        </div>
      </div>
      <div className="mt-4">
        <VoteBar votes={votes} />
      </div>
      {!share && <p className="mt-3 text-sm text-muted">No votes have been cast.</p>}
      <p className="mt-3 text-xs text-subtle">
        Percentages are shares of For + Against votes cast, not of quorum or total supply.
      </p>
      {votes.veto !== undefined && (
        <p className="mt-3 rounded-lg bg-against-soft px-3 py-2 text-sm text-against">
          Veto: {formatTokenAmount(votes.veto, 0)} council vote{votes.veto === 1n ? "" : "s"}
        </p>
      )}
    </div>
  );
}
