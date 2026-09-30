import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Site-manager console loading state: the three stat cards and the event list,
 * matching /admin's own layout so the numbers do not shift when they land.
 *
 * The `/admin/login` variant renders inside this same layout while signed out,
 * where it is ignored (the layout returns the children untouched).
 */
export default function AdminLoading() {
  return (
    <div className="p-6 md:p-10" aria-busy="true" aria-label="Loading admin console">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mb-10 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="mt-2 h-3.5 w-24" />
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
