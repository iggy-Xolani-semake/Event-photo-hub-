import clsx from "clsx";

/**
 * Loading State (2 of 4): pulse skeletons that mirror the shape of the card
 * they stand in for, so nothing jumps when real data lands.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-slate-800/50", className)} aria-hidden="true" />;
}

/** Skeleton shaped like a standard content card. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={clsx("h-3", index % 2 === 0 ? "w-full" : "w-2/3")} />
        ))}
      </div>
    </div>
  );
}

/** Grid of card skeletons for list pages. */
export function SkeletonGrid({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} lines={lines} />
      ))}
    </div>
  );
}
