import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-12" role="status" aria-label="Loading proposals from Solana">
      <div className="space-y-3">
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-6 w-[32rem] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <p className="text-sm text-muted">Reading governance accounts from Solana mainnet…</p>
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
