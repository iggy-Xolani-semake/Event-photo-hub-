import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Host event-detail loading state: breadcrumbs and title, the share card, the
 * QR/settings column and the stats strip, in the same three-column grid the
 * real page uses. Presigning the QR code and the guest links is the slow part
 * of this route, so the skeleton is worth having.
 */
export default function EventDetailLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading event">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Skeleton className="h-6 w-40" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Skeleton className="mx-auto h-40 w-40 rounded-2xl" />
            <Skeleton className="mx-auto mt-4 h-4 w-32" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-4 h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
