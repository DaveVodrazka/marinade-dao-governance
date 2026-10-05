/**
 * Marks where a piece of information comes from, so on-chain data and forum
 * content are never confused.
 */
export function SourceLabel({ source }: { source: "onchain" | "forum" }) {
  if (source === "onchain") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden />
        On-chain · Solana
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-info">
      <span className="size-1.5 rounded-sm bg-info" aria-hidden />
      Source: Marinade Forum
    </span>
  );
}
