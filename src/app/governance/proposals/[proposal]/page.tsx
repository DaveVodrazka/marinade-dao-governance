import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ForumSummary } from "@/components/forum/forum-summary";
import { ForumTopic } from "@/components/forum/forum-topic";
import { ProposalInstructions } from "@/components/governance/proposal-instructions";
import { GoverningBodyLabel, ProposalStatus } from "@/components/governance/proposal-status";
import { ProposalTimeline } from "@/components/governance/proposal-timeline";
import { VotingProgress } from "@/components/governance/voting-progress";
import { Address } from "@/components/ui/address";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceLabel } from "@/components/ui/source-label";
import { GOVERNING_MINTS } from "@/config/marinade";
import { getMarinadeProposal } from "@/lib/governance/proposals";
import { getDisplayTitle, getLifecycle, getStatusDisplay } from "@/lib/governance/presentation";
import type { GovernanceProposal } from "@/lib/governance/types";
import { getProposalForumState } from "@/lib/proposals/service";
import { formatDate, formatRelativeTime } from "@/utils/dates";
import { pluralize } from "@/utils/format";

type Props = PageProps<"/governance/proposals/[proposal]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { proposal: address } = await params;
  const proposal = await getMarinadeProposal(address).catch(() => null);
  return { title: proposal ? getDisplayTitle(proposal) : "Proposal" };
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function votingEndLabel(p: GovernanceProposal) {
  if (!p.votingEndsAt) return null;
  if (p.isActive) return { label: "Voting ends", value: `${formatDate(p.votingEndsAt)} (${formatRelativeTime(p.votingEndsAt)})` };
  if (p.votingCompletedAt) return { label: "Voting ended", value: formatDate(p.votingCompletedAt) };
  if (p.awaitingFinalization) return { label: "Voting period ended", value: formatDate(p.votingEndsAt) };
  return null;
}

// ---- Forum sections (streamed; failures never affect on-chain content) ----

async function ForumDescription({ proposal }: { proposal: GovernanceProposal }) {
  const forum = await getProposalForumState(proposal);
  switch (forum.status) {
    case "linked":
      return <ForumTopic topic={forum.topic} />;
    case "not_linked":
      return <Notice title="No linked forum discussion found.">The on-chain description is shown below.</Notice>;
    case "not_found":
      return (
        <Notice tone="warning" title={`Linked forum topic #${forum.link.topicId} was not found.`}>
          It may have been removed or made private.
        </Notice>
      );
    case "unavailable":
      return (
        <Notice tone="warning" title="Forum discussion temporarily unavailable.">
          On-chain governance data is still shown below.
        </Notice>
      );
  }
}

async function ForumDiscussion({ proposal }: { proposal: GovernanceProposal }) {
  const forum = await getProposalForumState(proposal);
  return forum.status === "linked" ? <ForumSummary topic={forum.topic} /> : null;
}

function OnChainDescription({ proposal }: { proposal: GovernanceProposal }) {
  const d = proposal.description;
  return (
    <Card className="p-5 sm:p-6">
      <SourceLabel source="onchain" />
      <h2 className="mt-2 font-semibold">On-chain description</h2>
      <div className="mt-2 text-sm text-muted">
        {d.kind === "empty" && <p>No description was stored on-chain.</p>}
        {d.kind === "text" && <p className="whitespace-pre-wrap break-words">{d.text}</p>}
        {d.kind === "link" && (
          <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent hover:underline">
            {d.url}
          </a>
        )}
        {/* Sanitized in normalizeProposal → classifyDescription. */}
        {d.kind === "html" && <div className="prose-forum !text-sm" dangerouslySetInnerHTML={{ __html: d.html }} />}
      </div>
    </Card>
  );
}

// ---- Page ----------------------------------------------------------------

export default async function ProposalPage({ params }: Props) {
  const { proposal: address } = await params;
  // Throws on RPC failure → error.tsx; null → 404.
  const proposal = await getMarinadeProposal(address);
  if (!proposal) notFound();

  const status = getStatusDisplay(proposal);
  const end = votingEndLabel(proposal);
  const mint = GOVERNING_MINTS[proposal.governingTokenMint];

  return (
    <div className="space-y-8">
      <Link href="/governance" className="text-sm text-muted hover:text-fg">
        ← All proposals
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <ProposalStatus proposal={proposal} size="md" />
          <GoverningBodyLabel proposal={proposal} />
          {proposal.mip && <span className="text-sm font-semibold text-accent">{proposal.mip}</span>}
        </div>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {getDisplayTitle(proposal)}
        </h1>
        {status.hint && <p className="mt-3 text-muted">{status.hint}</p>}
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Proposal">
            <Address address={proposal.address} />
          </Meta>
          <Meta label="Created">{formatDate(proposal.createdAt)}</Meta>
          {end ? (
            <Meta label={end.label}>{end.value}</Meta>
          ) : (
            <Meta label="Voting">Not started</Meta>
          )}
          <Meta label="Created by">
            {proposal.creatorWallet ? <Address address={proposal.creatorWallet} /> : <span className="text-muted">Unknown</span>}
          </Meta>
        </dl>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="discussion-heading" className="space-y-4">
            <h2 id="discussion-heading" className="text-xl font-semibold tracking-tight">
              Proposal discussion
            </h2>
            <Suspense
              fallback={
                <Card className="space-y-3 p-6" as="div">
                  <p className="text-sm text-muted" role="status">Loading forum discussion…</p>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-40 w-full" />
                </Card>
              }
            >
              <ForumDescription proposal={proposal} />
            </Suspense>
            <OnChainDescription proposal={proposal} />
          </section>

          <section aria-labelledby="actions-heading">
            <div className="mb-4">
              <SourceLabel source="onchain" />
              <h2 id="actions-heading" className="mt-1 text-xl font-semibold tracking-tight">
                On-chain actions
              </h2>
              <p className="mt-1 text-sm text-muted">
                {pluralize(proposal.instructionsCount, "instruction")} attached ·{" "}
                {proposal.instructionsExecutedCount} executed. Read from the proposal&apos;s ProposalTransaction accounts.
              </p>
            </div>
            <ProposalInstructions instructions={proposal.instructions} />
          </section>

          <Suspense fallback={null}>
            <ForumDiscussion proposal={proposal} />
          </Suspense>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <SourceLabel source="onchain" />
            <h2 className="mt-2 font-semibold">Current vote</h2>
            <div className="mt-4">
              <VotingProgress votes={proposal.votes} />
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-4">
              <Meta label="Proposal state">{status.label}</Meta>
              <Meta label="Voting started">{formatDate(proposal.votingStartedAt)}</Meta>
              {proposal.votingBaseEndsAt && proposal.votingEndsAt &&
                proposal.votingBaseEndsAt.getTime() !== proposal.votingEndsAt.getTime() && (
                  <Meta label="Base voting ends">{formatDate(proposal.votingBaseEndsAt)}</Meta>
                )}
              <Meta label={proposal.votingCompletedAt ? "Voting window closed" : "Voting ends"}>
                {formatDate(proposal.votingEndsAt)}
                {proposal.isActive && proposal.votingEndsAt && (
                  <span className="block text-muted">{formatRelativeTime(proposal.votingEndsAt)}</span>
                )}
              </Meta>
              {mint && <Meta label="Voters">{mint.description}</Meta>}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Lifecycle</h2>
            <ProposalTimeline steps={getLifecycle(proposal)} />
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Governance accounts</h2>
            <dl className="mt-4 space-y-3">
              <Meta label="Governance">
                <Address address={proposal.governanceAddress} />
              </Meta>
              <Meta label="Governing token mint">
                <Address address={proposal.governingTokenMint} />
              </Meta>
              <Meta label="Token owner record">
                <Address address={proposal.tokenOwnerRecord} />
              </Meta>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
