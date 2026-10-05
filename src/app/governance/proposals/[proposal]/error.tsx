"use client";

export default function GovernanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-against/30 bg-against-soft p-6">
      <h1 className="text-lg font-semibold">Could not load governance data</h1>
      <p className="mt-2 text-sm text-muted">
        The Solana RPC endpoint is unavailable, rate-limiting, or returned an unexpected response. Governance data is
        read live from mainnet, so nothing can be shown until it responds.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">{error.message}</pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
