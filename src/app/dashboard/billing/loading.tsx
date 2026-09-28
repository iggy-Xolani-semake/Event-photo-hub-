import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the billing page shape: header, pass tier cards, event pass list. */
export default function BillingLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading billing">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <section className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <Skeleton className="mt-6 h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/50 p-5"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
