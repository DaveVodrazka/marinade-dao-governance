import { Address } from "@/components/ui/address";
import type { GovernanceInstruction } from "@/lib/governance/types";
import { formatDate, formatDuration } from "@/utils/dates";

const STATUS_TEXT: Record<GovernanceInstruction["executionStatus"], { label: string; className: string }> = {
  not_executed: { label: "Not executed", className: "bg-surface-2 text-muted" },
  success: { label: "Executed", className: "bg-for-soft text-for" },
  error: { label: "Execution error", className: "bg-against-soft text-against" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="mt-1 min-w-0">{children}</dd>
    </div>
  );
}

function InstructionCard({ ix, showOption }: { ix: GovernanceInstruction; showOption: boolean }) {
  const status = STATUS_TEXT[ix.executionStatus];
  return (
    <article className="rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h3 className="font-semibold">
          Action {ix.index + 1}
          {showOption && <span className="ml-2 text-sm font-normal text-muted">Option {ix.optionIndex + 1}</span>}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${status.className}`}>
          {status.label}
        </span>
      </header>

      <div className="space-y-5 px-5 py-4">
        {ix.decoded ? (
          <div className="rounded-xl bg-accent-soft/60 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-accent">Decoded action</p>
            <p className="mt-1 font-mono text-sm font-semibold">{ix.decoded.type}</p>
            {ix.decoded.summary && <p className="mt-1 text-sm text-muted">{ix.decoded.summary}</p>}
            {ix.decoded.fields && (
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {Object.entries(ix.decoded.fields).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="min-w-0 break-all font-mono tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {ix.decoded.fields && Object.keys(ix.decoded.fields).some((k) => k === "amount") && (
              <p className="mt-2 text-xs text-subtle">Amounts are raw base units (not adjusted for token decimals).</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-4 py-3">
            <p className="text-sm font-medium">Unknown instruction</p>
            <p className="mt-0.5 break-all font-mono text-xs text-muted">Program: {ix.programId}</p>
          </div>
        )}

        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Program">
            <Address address={ix.programId} label={ix.programName ?? "Unknown program"} />
          </Field>
          <Field label="Accounts">
            <span className="text-sm tabular-nums">{ix.accounts.length}</span>
          </Field>
          <Field label="Execution">
            <span className="text-sm">
              {ix.executedAt ? formatDate(ix.executedAt) : status.label}
              {ix.holdUpTimeSeconds > 0 && (
                <span className="block text-xs text-muted">Hold-up {formatDuration(ix.holdUpTimeSeconds * 1000)}</span>
              )}
            </span>
          </Field>
        </dl>

        <details className="group rounded-xl border border-line">
          <summary className="cursor-pointer select-none list-none px-4 py-2.5 text-sm font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> Accounts & raw data
          </summary>
          <div className="space-y-5 border-t border-line px-4 py-4">
            <ol className="space-y-3">
              {ix.accounts.map((a, i) => (
                <li key={`${a.address}-${i}`} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-subtle">{i + 1}.</span>
                  <Address address={a.address} label={a.label} className="min-w-0 flex-1" />
                  <span className="flex gap-1.5">
                    {a.writable && (
                      <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">writable</span>
                    )}
                    {a.signer && (
                      <span className="rounded bg-info-soft px-1.5 py-0.5 text-[11px] font-medium text-info">signer</span>
                    )}
                    {!a.writable && !a.signer && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-subtle">read-only</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Raw instruction data · {ix.dataHex.length / 2} bytes
              </p>
              <p className="mt-2 text-xs text-muted">Hex</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 font-mono text-xs">
                {ix.dataHex || "(empty)"}
              </pre>
              <p className="mt-3 text-xs text-muted">Base64</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 font-mono text-xs">
                {ix.data || "(empty)"}
              </pre>
            </div>
            <p className="text-xs text-muted">
              Proposal transaction: <Address address={ix.transactionAddress} />
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}

export function ProposalInstructions({ instructions }: { instructions: GovernanceInstruction[] | undefined }) {
  if (instructions === undefined) {
    return (
      <div role="alert" className="rounded-2xl border border-warn/30 bg-warn-soft px-5 py-4 text-sm">
        On-chain instructions could not be loaded from the Solana RPC. Try again shortly.
      </div>
    );
  }
  if (instructions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
        This proposal has no attached on-chain instructions. It is a signalling vote only.
      </div>
    );
  }
  const showOption = new Set(instructions.map((i) => i.optionIndex)).size > 1;
  return (
    <div className="space-y-4">
      {instructions.map((ix) => (
        <InstructionCard key={`${ix.transactionAddress}-${ix.instructionIndex}`} ix={ix} showOption={showOption} />
      ))}
    </div>
  );
}
