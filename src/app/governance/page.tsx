import type { Metadata } from "next";
import Link from "next/link";

import { GovernanceStats } from "@/components/governance/governance-stats";
import { ProposalCard } from "@/components/governance/proposal-card";
import { ProposalFilters, ProposalList } from "@/components/governance/proposal-list";
import { Notice } from "@/components/ui/notice";
import { computeStats } from "@/lib/governance/normalize";
import { matchesFilters, parseBodyFilter, parseStatusFilter } from "@/lib/governance/presentation";
import { getMarinadeProposalList } from "@/lib/proposals/service";

export const metadata: Metadata = { title: "Proposals" };

const PAGE_SIZE = 40;

function showAllHref(status: string, body: string) {
  const params = new URLSearchParams({ show: "all" });
  if (status !== "all") params.set("status", status);
  if (body !== "all") params.set("body", body);
  return `/governance?${params}#proposals`;
}

export default async function GovernancePage({ searchParams }: PageProps<"/governance">) {
  const params = await searchParams;
  const status = parseStatusFilter(params.status);
  const body = parseBodyFilter(params.body);
  const showAll = params.show === "all";

  // Throws on RPC failure → governance/error.tsx
  const list = await getMarinadeProposalList();
  const stats = computeStats(list.proposals.map((p) => p.governance));
  const active = list.proposals.filter((p) => p.governance.isActive);
  const filtered = list.proposals.filter(
    (p) => matchesFilters(p.governance, status, body) && (status === "active" || !p.governance.isActive),
  );

  return (
    <div className="space-y-12">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Marinade Governance</h1>
        <p className="mt-3 text-lg text-muted">
          Explore proposals, discussions and on-chain actions governing Marinade.
        </p>
      </header>

      <GovernanceStats stats={stats} />

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Active proposals</h2>
        {active.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((item) => (
              <ProposalCard key={item.governance.address} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
            <p className="font-medium">No proposals are open for voting right now.</p>
            <p className="mt-1 text-sm text-muted">Previous proposals are listed below.</p>
          </div>
        )}
      </section>

      <section id="proposals" className="scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {status === "active" ? "Active proposals" : "Previous proposals"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {showAll || filtered.length <= PAGE_SIZE
                ? `${filtered.length} proposals`
                : `Latest ${PAGE_SIZE} of ${filtered.length}`}
            </p>
          </div>
          <ProposalFilters status={status} body={body} />
        </div>
        {!list.forumAvailable && (
          <div className="mb-4">
            <Notice tone="warning" title="Forum temporarily unavailable.">
              Reply counts are hidden. On-chain governance data is shown below.
            </Notice>
          </div>
        )}
        <ProposalList items={showAll ? filtered : filtered.slice(0, PAGE_SIZE)} />
        {!showAll && filtered.length > PAGE_SIZE && (
          <div className="mt-4 text-center">
            <Link
              href={showAllHref(status, body)}
              scroll={false}
              className="inline-flex rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-line-strong"
            >
              Show all {filtered.length} proposals
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
