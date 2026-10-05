export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden />;
}

export function LoadingLabel({ children }: { children: string }) {
  return (
    <p className="text-sm text-muted" role="status">
      {children}
    </p>
  );
}
