import type { LifecycleStep } from "@/lib/governance/presentation";
import { formatDate } from "@/utils/dates";

const DOT: Record<LifecycleStep["state"], string> = {
  done: "bg-accent border-accent",
  current: "bg-surface border-accent ring-4 ring-accent-soft",
  upcoming: "bg-surface border-line-strong",
  failed: "bg-against border-against",
};

export function ProposalTimeline({ steps }: { steps: LifecycleStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[7px] top-5 h-[calc(100%-12px)] w-px ${
                step.state === "done" ? "bg-accent" : "bg-line"
              }`}
              aria-hidden
            />
          )}
          <span className={`relative mt-1 size-[15px] shrink-0 rounded-full border-2 ${DOT[step.state]}`} aria-hidden />
          <div className="min-w-0">
            <p
              className={`font-medium ${
                step.state === "upcoming" ? "text-subtle" : step.state === "failed" ? "text-against" : "text-fg"
              }`}
            >
              {step.label}
              {step.state === "current" && <span className="sr-only"> (current)</span>}
            </p>
            {step.date && (
              <p className="text-sm text-muted">
                {step.state === "upcoming" ? "By " : ""}
                {formatDate(step.date)}
              </p>
            )}
            {step.note && <p className="text-sm text-muted">{step.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
