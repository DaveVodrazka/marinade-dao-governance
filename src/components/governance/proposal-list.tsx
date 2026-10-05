import Link from "next/link";

import {
  BODY_FILTERS,
  STATUS_FILTERS,
  type BodyFilter,
  type StatusFilter,
} from "@/lib/governance/presentation";
import type { MarinadeProposalSummary } from "@/lib/proposals/service";
import { ProposalRow } from "./proposal-card";

function filterHref(status: StatusFilter, body: BodyFilter) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (body !== "all") params.set("body", body);
  const qs = params.toString();
  return `/governance${qs ? `?${qs}` : ""}#proposals`;
}

function FilterTabs<T extends string>({
  options,
  active,
  href,
  label,
}: {
  options: { value: T; label: string }[];
  active: T;
  href: (value: T) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-current={o.value === active ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            o.value === active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function ProposalFilters({ status, body }: { status: StatusFilter; body: BodyFilter }) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterTabs label="Filter by status" options={STATUS_FILTERS} active={status} href={(s) => filterHref(s, body)} />
      <FilterTabs label="Filter by voter type" options={BODY_FILTERS} active={body} href={(b) => filterHref(status, b)} />
    </div>
  );
}

export function ProposalList({ items }: { items: MarinadeProposalSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
        No proposals match this filter.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <ProposalRow key={item.governance.address} item={item} />
      ))}
    </ul>
  );
}
