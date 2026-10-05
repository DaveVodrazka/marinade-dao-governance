import Link from "next/link";

import { getDisplayTitle } from "@/lib/governance/presentation";
import type { MarinadeProposalSummary } from "@/lib/proposals/service";
import { formatDate, formatRelativeTime } from "@/utils/dates";
import { pluralize } from "@/utils/format";
import { formatPublicKey } from "@/utils/public-key";
import { GoverningBodyLabel, ProposalStatus } from "./proposal-status";
import { VoteSummary } from "./voting-progress";

function proposalHref(address: string) {
  return `/governance/proposals/${address}`;
}

function TimingText({ item }: { item: MarinadeProposalSummary }) {
  const p = item.governance;
  if (p.isActive && p.votingEndsAt) {
    return <>Voting ends {formatRelativeTime(p.votingEndsAt)}</>;
  }
  if (p.awaitingFinalization) return <>Voting ended · awaiting finalization</>;
  if (p.votingCompletedAt) return <>Voting ended {formatDate(p.votingCompletedAt, { time: false })}</>;
  return <>Created {formatDate(p.createdAt, { time: false })}</>;
}

/** Prominent card for active proposals. */
export function ProposalCard({ item }: { item: MarinadeProposalSummary }) {
  const p = item.governance;
  return (
    <article className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ProposalStatus proposal={p} />
        <GoverningBodyLabel proposal={p} />
        {p.mip && <span className="text-sm font-semibold text-accent">{p.mip}</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
        <Link href={proposalHref(p.address)} className="after:absolute after:inset-0">
          {getDisplayTitle(p)}
        </Link>
      </h3>
      <p className="mt-1 font-mono text-xs text-subtle">{formatPublicKey(p.address)}</p>
      <div className="mt-5">
        <VoteSummary votes={p.votes} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm text-muted">
        <span>
          <TimingText item={item} />
        </span>
        {item.forumTopic && <span>{pluralize(item.forumTopic.replyCount, "forum reply", "forum replies")}</span>}
      </div>
      <span className="mt-4 text-sm font-medium text-accent group-hover:underline">View proposal →</span>
    </article>
  );
}

/** Dense row for the proposal history list. */
export function ProposalRow({ item }: { item: MarinadeProposalSummary }) {
  const p = item.governance;
  return (
    <li className="group relative grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5 md:grid-cols-[minmax(0,1fr)_200px_190px] md:items-center md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalStatus proposal={p} />
          <GoverningBodyLabel proposal={p} />
          {p.mip && <span className="text-xs font-semibold text-accent">{p.mip}</span>}
        </div>
        <Link
          href={proposalHref(p.address)}
          className="mt-1.5 block font-medium leading-snug after:absolute after:inset-0 group-hover:text-accent"
        >
          {getDisplayTitle(p)}
        </Link>
        <p className="mt-1 font-mono text-xs text-subtle">
          {formatPublicKey(p.address)}
          {item.forumTopic && (
            <span className="ml-2 font-sans">
              · {pluralize(item.forumTopic.replyCount, "forum reply", "forum replies")}
            </span>
          )}
        </p>
      </div>
      <div>
        <VoteSummary votes={p.votes} />
      </div>
      <p className="text-sm text-muted md:text-right">
        <TimingText item={item} />
      </p>
    </li>
  );
}
