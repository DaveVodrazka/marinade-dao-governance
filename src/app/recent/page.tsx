import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { ProposalCard, ProposalRow } from "@/components/governance/proposal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/components/ui/notice";
import { computeStats } from "@/lib/governance/normalize";
import { getMarinadeProposalList } from "@/lib/proposals/service";
import { pluralize } from "@/utils/format";

export const metadata: Metadata = { title: "Recent" };

async function RecentActivity() {
  await connection();
  let list;
  try {
    list = await getMarinadeProposalList();
  } catch {
    return (
      <Notice tone="error" title="Could not load governance data from Solana.">
        The RPC endpoint may be unavailable or rate-limiting. <Link href="/recent" className="underline">Retry</Link>
      </Notice>
    );
  }
  const stats = computeStats(list.proposals.map((p) => p.governance));
  const active = list.proposals.filter((p) => p.governance.isActive);
  const recent = list.proposals.filter((p) => !p.governance.isActive).slice(0, 6);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-semibold tabular-nums tracking-tight">{stats.active}</p>
          <p className="mt-1 text-muted">
            {stats.active === 1 ? "proposal is" : "proposals are"} open for voting right now
          </p>
        </div>
        <Link
          href="/governance"
          className="rounded-xl bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          All {pluralize(stats.total, "proposal")} →
        </Link>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Active now</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((item) => (
              <ProposalCard key={item.governance.address} item={item} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Recent proposals</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {recent.map((item) => (
            <ProposalRow key={item.governance.address} item={item} />
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function RecentPage() {
  return (
    <div className="space-y-12">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Recent</h1>
        <p className="mt-3 text-lg text-muted">What the Marinade DAO is voting on now and decided lately.</p>
      </section>
      <Suspense
        fallback={
          <div className="space-y-6" role="status" aria-label="Loading proposals">
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        }
      >
        <RecentActivity />
      </Suspense>
    </div>
  );
}
