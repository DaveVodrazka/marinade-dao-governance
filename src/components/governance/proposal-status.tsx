import { getStatusDisplay, type StatusTone } from "@/lib/governance/presentation";
import type { GovernanceProposal } from "@/lib/governance/types";

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-accent-soft text-accent",
  positive: "bg-for-soft text-for",
  negative: "bg-against-soft text-against",
  warning: "bg-warn-soft text-warn",
  neutral: "bg-surface-2 text-muted",
};

export function ProposalStatus({
  proposal,
  size = "sm",
}: {
  proposal: GovernanceProposal;
  size?: "sm" | "md";
}) {
  const { label, tone, hint } = getStatusDisplay(proposal);
  return <StatusChip label={label} tone={tone} hint={hint} size={size} />;
}

export function StatusChip({
  label,
  tone,
  hint,
  size = "sm",
}: {
  label: string;
  tone: StatusTone;
  hint?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${TONE_CLASS[tone]} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      {tone === "active" && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>
      )}
      {label}
    </span>
  );
}

export function GoverningBodyLabel({ proposal }: { proposal: GovernanceProposal }) {
  if (proposal.governingBody === "unknown") return null;
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
      {proposal.governingBody === "community" ? "Community" : "Council"}
    </span>
  );
}
